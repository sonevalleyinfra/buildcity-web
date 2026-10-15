import React from "react";
import { Link } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useAdmin } from "../context/AdminContext";
import { cleanProductImage } from "../utils/productImage";

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
  const hasDiscount = rawMrp > price;
  const mrp = hasDiscount ? rawMrp : 0;
  const discountPct = (hasDiscount && mrp > 0) ? Math.round(((mrp - price) / mrp) * 100) : 0;
  const savings = hasDiscount ? (mrp - price) : 0;

  const handleAdd = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (isUnavailable) return;

    addItem(
      {
        id: product.id,
        name: product.name,
        price: price,
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
      className={`bg-white rounded-2xl border border-slate-200/80 hover:border-brand-400 overflow-hidden flex flex-col justify-between shadow-[0_2px_8px_-2px_rgba(15,23,42,0.05)] hover:shadow-[0_8px_24px_-4px_rgba(234,88,12,0.12)] active:scale-[0.98] transition-all duration-300 group relative ${className}`}
    >
      {/* Product image aur link (pura edge to edge cover layout) */}
      <Link to={`/product/${product.id}`} className="block">
        <div className="relative aspect-square w-full overflow-hidden bg-slate-50/90 flex items-center justify-center p-2.5">
          {/* Discount tag ya unavailable status */}
          {isUnavailable ? (
            <span className="absolute top-2 left-2 z-10 bg-rose-50 text-rose-700 border border-rose-200 font-black text-[9px] px-1.5 py-0.5 rounded-full shadow-2xs tracking-tight">
              Unavailable
            </span>
          ) : discountPct > 0 ? (
            <span className="absolute top-2 left-2 z-10 bg-brand-600 text-white font-black text-[9px] px-1.5 py-0.5 rounded-full shadow-2xs tracking-tight">
              {discountPct}% OFF
            </span>
          ) : null}

          <img
            src={cleanProductImage(product)}
            alt={product.name}
            className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300 ease-out"
            loading="lazy"
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = "/categories/cement.png";
            }}
          />
        </div>

        {/* Brand name aur product ka full naam */}
        <div className="px-2.5 pt-2">
          <p className="text-[9px] sm:text-[9.5px] font-bold text-slate-400 uppercase tracking-wider truncate mb-0.5">
            {product.brand || "Standard"}
          </p>
          <h4 className="text-xs sm:text-[13px] font-black text-navy-950 leading-snug line-clamp-2 min-h-[2rem] sm:min-h-[2.3rem] group-hover:text-brand-600 transition-colors tracking-tight">
            {product.name}
          </h4>
        </div>
      </Link>

      {/* Rate, unit details aur add to cart button */}
      <div className="px-2.5 pb-2.5 pt-1 flex flex-col justify-between gap-1 flex-1">
        <div className="pt-1 border-t border-slate-100">
          {/* Live rate, kata hua mrp aur discount percent */}
          <div className="flex items-baseline gap-1.5 flex-wrap">
            <span className="text-sm sm:text-base font-black text-navy-950 tracking-tight tabular-nums">
              ₹{Number(price || 0).toLocaleString("en-IN")}
            </span>
            {mrp > price && (
              <span className="text-[10px] sm:text-[11px] text-slate-400 line-through font-normal tabular-nums">
                ₹{Number(mrp || 0).toLocaleString("en-IN")}
              </span>
            )}
            {discountPct > 0 && (
              <span className="text-[9.5px] sm:text-[10px] font-bold text-emerald-600">
                ({discountPct}% off)
              </span>
            )}
          </div>

          {/* Unit jaise bag/bucket aur kitni bachat hui */}
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            {product.unit && (
              <span className="text-[9px] sm:text-[9.5px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-md leading-none truncate max-w-[95px]">
                {product.unit}
              </span>
            )}
            {savings > 0 && (
              <span className="bg-emerald-50 text-emerald-700 font-extrabold text-[8.5px] sm:text-[9px] px-1.5 py-0.5 rounded-md border border-emerald-200/60 leading-none shadow-2xs">
                Save ₹{savings}
              </span>
            )}
          </div>
        </div>

        {/* Add button ya plus/minus quantity controller */}
        <div className="w-full mt-0.5">
          {isUnavailable ? (
            <div
              className="w-full bg-slate-100 text-rose-600 font-extrabold text-[11px] h-8 rounded-xl border border-rose-200/80 flex items-center justify-center select-none shadow-2xs cursor-not-allowed"
              title="This product is currently unavailable"
            >
              Unavailable
            </div>
          ) : qty > 0 ? (
            <div className="flex items-center justify-between border border-slate-200/90 rounded-xl bg-slate-100/70 p-0.5 shadow-2xs select-none h-8">
              <button
                type="button"
                onClick={handleDecrement}
                className="w-7 h-7 font-black text-navy-900 bg-white rounded-lg flex items-center justify-center shadow-2xs border border-slate-200/60 hover:bg-slate-50 active:scale-90 transition-all cursor-pointer text-sm select-none"
                title="Decrease quantity"
              >
                −
              </button>
              <span className="w-8 text-center text-xs font-black text-navy-950 tabular-nums select-none">
                {qty}
              </span>
              <button
                type="button"
                onClick={handleIncrement}
                className="w-7 h-7 font-black text-navy-900 bg-white rounded-lg flex items-center justify-center shadow-2xs border border-slate-200/60 hover:bg-slate-50 active:scale-90 transition-all cursor-pointer text-sm select-none"
                title="Increase quantity"
              >
                +
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleAdd}
              className="w-full bg-white hover:bg-slate-50 text-navy-950 font-black text-xs h-8 rounded-xl border border-slate-200/90 shadow-2xs hover:border-slate-300 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1 select-none"
            >
              <span className="text-sm leading-none font-black text-slate-700">+</span>
              <span className="tracking-tight text-navy-950">ADD</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}