import React from "react";
import { Link } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useAdmin } from "../context/AdminContext";
import { cleanProductImage } from "../utils/productImage";
import { MinusIcon, PlusIcon } from "./ui/Icons";
import { discountPercent, realMrp } from "../utils/priceDisplay";

export default function ProductCard({ product, className = "" }) {
  const { items, addItem, updateQty, removeItem } = useCart();
  const { vendors = [] } = useAdmin() || {};

  if (!product) return null;

  // Pehle check kar rahe hain cart me yeh item kitna quantity me hai
  const cartItem = items.find((i) => i.id === product.id);
  const qty = cartItem ? cartItem.qty : 0;

  // Agar vendor suspended hai ya product inactive hai toh use block kar rahe hain
  const matchedVendor = vendors.find(
    (v) => v.id === product.vendorId || (v.shopName && product.vendorName && v.shopName.toLowerCase() === product.vendorName.toLowerCase())
  );
  const isVendorSuspended =
    product.isVendorSuspended === true ||
    product.vendor?.status === "SUSPENDED" ||
    product.vendorStatus === "SUSPENDED" ||
    (matchedVendor && matchedVendor.status === "SUSPENDED");

  const isUnavailable =
    isVendorSuspended ||
    product.isActive === false ||
    product.inStock === false ||
    (product.stockQty !== undefined && Number(product.stockQty) <= 0);

  // Price, discount aur bachat ka calculation
  const price = Number(product.price || product.suggestedPrice || 100);
  const rawMrp = Number(product.mrp || product.masterProduct?.mrp || 0);
  const mrp = realMrp(price, rawMrp);
  const discountPct = discountPercent(price, rawMrp);

  const handleAdd = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (isUnavailable) return;

    addItem(
      {
        id: product.id,
        name: product.name,
        price: price,
        mrp: mrp || undefined, // so the cart summary shows the same MRP discount as the item row
        brand: product.brand,
        img: cleanProductImage(product),
        vendorId: product.vendorId,
        vendorName: product.vendorName || "District Vendor",
        unit: product.unit,
        isVendorSuspended: isUnavailable,
      },
      1
    );
  };

  const handleIncrement = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (isUnavailable) return;
    updateQty(product.id, qty + 1);
  };

  const handleDecrement = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (qty <= 1) {
      removeItem(product.id);
    } else {
      updateQty(product.id, qty - 1);
    }
  };

  return (
    <div
      data-storefront
      className={`group relative flex flex-col overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200/80 transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_30px_-18px_rgba(15,23,42,0.35)] hover:ring-slate-300 ${className}`}
    >
      {/* Image + name: one link to the product page */}
      <Link to={`/product/${product.id}`} className="block rounded-t-2xl">
        <div className="relative flex aspect-square w-full items-center justify-center overflow-hidden border-b border-slate-100 bg-white p-3">
          {isUnavailable ? (
            <span className="absolute left-2 top-2 z-10 rounded-full bg-white/95 px-2 py-0.5 text-[11px] font-medium text-slate-600 ring-1 ring-slate-200">
              Unavailable
            </span>
          ) : discountPct > 0 ? (
            <span className="absolute left-2 top-2 z-10 rounded-full bg-emerald-600 px-2 py-0.5 text-[11px] font-semibold text-white tabular-nums">
              {discountPct}% off
            </span>
          ) : null}

          <img
            src={cleanProductImage(product)}
            alt={product.name}
            className={`h-full w-full object-contain transition-transform duration-300 ease-out group-hover:scale-[1.03] ${isUnavailable ? "opacity-60 grayscale" : ""}`}
            loading="lazy"
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = cleanProductImage(null, product.categoryName || product.category, product.name);
            }}
          />
        </div>

        <div className="px-3 pt-2.5">
          <p className="truncate text-xs text-slate-500">{product.brand || "Standard"}</p>
          <h4 className="mt-0.5 line-clamp-2 min-h-[2.5rem] text-[13px] font-medium leading-5 text-navy-950 sm:text-sm">
            {product.name}
          </h4>
        </div>
      </Link>

      {/* Price + add */}
      <div className="flex flex-1 flex-col justify-end gap-2.5 px-3 pb-3 pt-2">
        <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
          <span className="text-base font-semibold tracking-tight text-navy-950 tabular-nums">
            ₹{Number(price || 0).toLocaleString("en-IN")}
          </span>
          {product.unit && <span className="text-xs text-slate-500">/ {product.unit}</span>}
          {mrp > price && (
            <span className="w-full text-xs text-slate-400 line-through tabular-nums sm:w-auto" aria-label={`MRP ₹${mrp}`}>
              ₹{Number(mrp || 0).toLocaleString("en-IN")}
            </span>
          )}
        </div>

        {isUnavailable ? (
          <div
            className="flex h-9 w-full cursor-not-allowed select-none items-center justify-center rounded-xl bg-slate-100 text-[13px] font-medium text-slate-500"
            title="This product is currently unavailable"
          >
            Unavailable
          </div>
        ) : qty > 0 ? (
          <div className="flex h-9 select-none items-center justify-between rounded-xl bg-brand-600 p-0.5 text-white" aria-label={`${qty} in cart`}>
            <button
              type="button"
              onClick={handleDecrement}
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-[10px] transition-colors hover:bg-white/15 active:bg-white/25"
              aria-label="Decrease quantity"
              title="Decrease quantity"
            >
              <MinusIcon className="h-4 w-4" strokeWidth={2.2} />
            </button>
            <span className="min-w-8 text-center text-sm font-semibold tabular-nums">{qty}</span>
            <button
              type="button"
              onClick={handleIncrement}
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-[10px] transition-colors hover:bg-white/15 active:bg-white/25"
              aria-label="Increase quantity"
              title="Increase quantity"
            >
              <PlusIcon className="h-4 w-4" strokeWidth={2.2} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleAdd}
            aria-label={`Add ${product.name} to cart`}
            className="flex h-9 w-full cursor-pointer select-none items-center justify-center gap-1 rounded-xl border border-brand-600/80 bg-white text-[13px] font-semibold text-brand-700 transition-colors hover:bg-brand-50 active:scale-[0.98]"
          >
            <PlusIcon className="h-4 w-4" strokeWidth={2.2} />
            Add
          </button>
        )}
      </div>
    </div>
  );
}
