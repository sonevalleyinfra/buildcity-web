import React from "react";
import { Link } from "react-router-dom";
import { useCart } from "../context/CartContext";

export default function ProductCard({ product, className = "" }) {
  const { items, addItem, updateQty, removeItem } = useCart();

  if (!product) return null;

  // Cart quantity check
  const cartItem = items.find((i) => i.id === product.id);
  const qty = cartItem ? cartItem.qty : 0;

  // Availability & Vendor suspension check
  const isUnavailable =
    product.isVendorSuspended === true ||
    product.vendor?.status === "SUSPENDED" ||
    product.vendorStatus === "SUSPENDED" ||
    product.isActive === false ||
    product.inStock === false ||
    (product.stockQty !== undefined && Number(product.stockQty) <= 0);

  // Price & Savings calculations
  const price = Number(product.price || product.suggestedPrice || 100);
  let mrp = Number(product.mrp || product.masterProduct?.suggestedPrice || 0);
  if (mrp <= price) {
    mrp = Math.round(price * 1.2);
  }
  const discountPct = Math.max(5, Math.round(((mrp - price) / mrp) * 100));
  const savings = mrp - price;

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
        img: product.imageUrl || product.img,
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
      className={`bg-white rounded-xl sm:rounded-2xl border border-slate-200/90 p-2 flex flex-col justify-between shadow-2xs hover:shadow-md hover:border-slate-300 active:scale-[0.99] transition-all duration-200 group relative ${className}`}
    >
      {/* 🖼️ Product Link & Image (Big, clear, unblocked image) */}
      <Link to={`/product/${product.id}`} className="block">
        <div className="relative aspect-square w-full rounded-lg sm:rounded-xl overflow-hidden bg-gradient-to-b from-slate-50 to-slate-100/50 mb-1 border border-slate-100/90 flex items-center justify-center p-1 group-hover:bg-slate-50/90 transition-colors">
          {/* Discount Badge / Unavailable Badge */}
          {isUnavailable ? (
            <span className="absolute top-1 left-1 z-10 bg-rose-50 text-rose-700 border border-rose-200 font-extrabold text-[8px] sm:text-[8.5px] px-1.5 py-0.5 rounded shadow-2xs tracking-tight">
              Unavailable
            </span>
          ) : discountPct > 0 ? (
            <span className="absolute top-1 left-1 z-10 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black text-[8px] sm:text-[8.5px] px-1.5 py-0.5 rounded shadow-2xs tracking-tight">
              {discountPct}% OFF
            </span>
          ) : null}

          <img
            src={product.imageUrl || product.img || "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=400&q=80"}
            alt={product.name}
            className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300 ease-out drop-shadow-2xs"
            loading="lazy"
            onError={(e) => {
              e.target.src = "/categories/cement.png";
            }}
          />
        </div>

        {/* Brand & Full Product Title */}
        <p className="text-[8.5px] sm:text-[9px] font-bold text-slate-400 uppercase tracking-wider truncate">
          {product.brand || "Standard"}
        </p>
        <h4 className="text-[11px] sm:text-xs font-black text-navy-950 leading-snug line-clamp-2 min-h-[2.4rem] group-hover:text-brand-600 transition-colors">
          {product.name}
        </h4>
      </Link>

      {/* 💰 Price, Savings & Compact Stepper */}
      <div className="mt-1 pt-1 border-t border-slate-100 flex flex-col justify-between gap-1">
        <div>
          <div className="flex items-center justify-between gap-1 flex-wrap">
            <div className="flex items-baseline gap-1">
              <span className="text-xs sm:text-sm font-black text-navy-950 tracking-tight">
                ₹{Number(price || 0).toLocaleString("en-IN")}
              </span>
              {mrp > price && (
                <span className="text-[8.5px] sm:text-[9px] text-slate-400 line-through font-normal">
                  ₹{Number(mrp || 0).toLocaleString("en-IN")}
                </span>
              )}
            </div>

            {savings > 0 && (
              <span className="bg-emerald-50 text-emerald-700 font-black text-[8px] px-1 py-0.5 rounded border border-emerald-200/60 leading-none">
                Save ₹{savings}
              </span>
            )}
          </div>

          <span className="text-[8px] sm:text-[8.5px] text-slate-400 font-medium leading-none block truncate mt-0.5">
            per {product.unit || "unit"}
          </span>
        </div>

        {/* 🛒 Compact Action Button / Stepper */}
        <div className="w-full mt-0.5">
          {isUnavailable ? (
            <div
              className="w-full bg-slate-100 text-rose-600 font-extrabold text-[10.5px] h-7 rounded-lg border border-rose-200/80 flex items-center justify-center select-none shadow-2xs cursor-not-allowed"
              title="This product is currently unavailable"
            >
              Unavailable
            </div>
          ) : qty > 0 ? (
            <div className="w-full bg-[#0A192F] text-white rounded-lg flex items-center justify-between px-1 h-7 shadow-xs font-black text-xs">
              <button
                type="button"
                onClick={handleDecrement}
                className="w-6 h-6 flex items-center justify-center rounded hover:bg-white/20 active:scale-90 transition-all cursor-pointer text-sm leading-none"
                title="Decrease quantity"
              >
                −
              </button>
              <span className="font-black text-xs px-1 select-none text-white tracking-tight">
                {qty}
              </span>
              <button
                type="button"
                onClick={handleIncrement}
                className="w-6 h-6 flex items-center justify-center rounded hover:bg-white/20 active:scale-90 transition-all cursor-pointer text-sm leading-none"
                title="Increase quantity"
              >
                +
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleAdd}
              className="w-full bg-[#0A192F] hover:bg-brand-600 text-white text-[11px] font-bold h-7 rounded-lg transition-all shadow-2xs hover:shadow-xs active:scale-95 cursor-pointer flex items-center justify-center gap-1"
            >
              <span>+ Add</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}