import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useCart } from "../context/CartContext";

export default function ProductCard({ product, className = "" }) {
  const { items, addItem, updateQty, removeItem } = useCart();
  const [isHovered, setIsHovered] = useState(false);

  if (!product) return null;

  // Cart quantity check
  const cartItem = items.find((i) => i.id === product.id);
  const qty = cartItem ? cartItem.qty : 0;

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
      },
      1
    );
  };

  const handleIncrement = (e) => {
    e.preventDefault();
    e.stopPropagation();
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
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`bg-white rounded-2xl border border-slate-200/80 p-2 sm:p-2.5 flex flex-col justify-between shadow-[0_2px_8px_-2px_rgba(15,23,42,0.05)] hover:shadow-[0_10px_25px_-5px_rgba(15,23,42,0.12)] hover:border-slate-300 active:scale-[0.99] transition-all duration-200 group relative ${className}`}
    >
      {/* 🖼️ Product Link & Image */}
      <Link to={`/product/${product.id}`} className="block">
        <div className="relative aspect-square rounded-xl overflow-hidden bg-gradient-to-b from-slate-50 to-slate-100/50 mb-1.5 border border-slate-100 flex items-center justify-center p-1.5 group-hover:bg-slate-50/80 transition-colors">
          {/* Discount Badge */}
          {discountPct > 0 && (
            <span className="absolute top-1.5 left-1.5 z-10 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black text-[8px] sm:text-[9px] px-1.5 py-0.5 rounded-md shadow-2xs tracking-tight">
              {discountPct}% OFF
            </span>
          )}

          {/* Micro Trust Badge (In Stock / Fast Delivery) */}
          <span className="absolute bottom-1.5 right-1.5 z-10 bg-white/90 backdrop-blur-xs text-slate-700 font-extrabold text-[7.5px] sm:text-[8px] px-1.5 py-0.5 rounded-full shadow-2xs border border-slate-200/80 flex items-center gap-0.5">
            <span className="text-amber-500 text-[9px] leading-none">⚡</span> Fast
          </span>

          <img
            src={product.imageUrl || product.img || "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=400&q=80"}
            alt={product.name}
            className="w-full h-full object-contain group-hover:scale-108 transition-transform duration-300 ease-out drop-shadow-2xs"
            loading="lazy"
            onError={(e) => {
              e.target.src = "/categories/cement.png";
            }}
          />
        </div>

        {/* Brand & Name */}
        <p className="text-[8.5px] sm:text-[9px] font-extrabold text-slate-400 uppercase tracking-wider truncate mb-0.5">
          {product.brand || "Standard"}
        </p>
        <h4 className="text-[11px] sm:text-xs font-extrabold text-navy-950 leading-snug line-clamp-2 h-[2.2rem] group-hover:text-brand-600 transition-colors">
          {product.name}
        </h4>
      </Link>

      {/* 💰 Price, Savings & Interactive Cart CTA */}
      <div className="mt-1.5 pt-1.5 border-t border-slate-100 flex flex-col justify-between gap-1.5">
        <div className="flex items-baseline justify-between gap-1 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-baseline gap-1 flex-wrap">
              <span className="text-xs sm:text-sm font-black text-navy-950 tracking-tight">
                ₹{price.toLocaleString("en-IN")}
              </span>
              {mrp > price && (
                <span className="text-[8.5px] sm:text-[9px] text-slate-400 line-through font-normal">
                  ₹{mrp.toLocaleString("en-IN")}
                </span>
              )}
            </div>
            <span className="text-[8px] sm:text-[8.5px] text-slate-400 font-medium leading-none block truncate mt-0.5">
              per {product.unit || "unit"}
            </span>
          </div>

          {/* Green Savings Pill */}
          {savings > 0 && (
            <span className="bg-emerald-50 text-emerald-700 font-black text-[8px] sm:text-[8.5px] px-1.5 py-0.5 rounded border border-emerald-200/60 leading-none">
              Save ₹{savings}
            </span>
          )}
        </div>

        {/* 🛒 Dynamic Action Button (Add to Cart OR Interactive - / + Stepper) */}
        <div className="w-full">
          {qty > 0 ? (
            <div className="w-full bg-[#0A192F] text-white rounded-xl flex items-center justify-between px-1 py-0.5 shadow-xs font-black text-xs">
              <button
                type="button"
                onClick={handleDecrement}
                className="w-7 h-6 flex items-center justify-center rounded-lg hover:bg-white/20 active:scale-90 transition-all cursor-pointer text-sm leading-none"
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
                className="w-7 h-6 flex items-center justify-center rounded-lg hover:bg-white/20 active:scale-90 transition-all cursor-pointer text-sm leading-none"
                title="Increase quantity"
              >
                +
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleAdd}
              className="w-full bg-[#0A192F] hover:bg-brand-600 text-white text-[10px] sm:text-[11px] font-bold py-1.5 px-2 rounded-xl transition-all shadow-2xs hover:shadow-xs active:scale-95 cursor-pointer flex items-center justify-center gap-1"
            >
              <span>+ Add</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}