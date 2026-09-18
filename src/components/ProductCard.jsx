import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useAdmin } from "../context/AdminContext";

export default function ProductCard({ product, className = "" }) {
  const { items, addItem, updateQty, removeItem } = useCart();
  const { vendors = [] } = useAdmin() || {};
  const [cartStatus, setCartStatus] = useState("idle"); // "idle" | "stepper" | "added"
  const timerRef = React.useRef(null);

  // Clean up timer on unmount
  React.useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const resetTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setCartStatus("idle");
    }, 4000); // 4 seconds of inactivity reverts back to "+ Add"
  };

  if (!product) return null;

  // Cart quantity check
  const cartItem = items.find((i) => i.id === product.id);
  const qty = cartItem ? cartItem.qty : 0;

  // Availability & Vendor suspension check
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

    setCartStatus("stepper");
    resetTimer();
  };

  const handleIncrement = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (isUnavailable) return;
    updateQty(product.id, qty + 1);
    setCartStatus("stepper");
    resetTimer();
  };

  const handleDecrement = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (qty <= 1) {
      removeItem(product.id);
      if (timerRef.current) clearTimeout(timerRef.current);
      setCartStatus("idle");
    } else {
      updateQty(product.id, qty - 1);
      setCartStatus("stepper");
      resetTimer();
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

        {/* 🛒 Action Button with + / - stepper that reverts to '+ Add' after 4s inactivity */}
        <div className="w-full mt-0.5">
          {isUnavailable ? (
            <div
              className="w-full bg-slate-100 text-rose-600 font-extrabold text-[10.5px] h-7 rounded-lg border border-rose-200/80 flex items-center justify-center select-none shadow-2xs cursor-not-allowed"
              title="This product is currently unavailable"
            >
              Unavailable
            </div>
          ) : cartStatus === "stepper" && qty > 0 ? (
            <div className="flex items-center justify-between bg-brand-50 border border-brand-300 rounded-lg h-7 px-1 shadow-2xs select-none animate-fade-in">
              <button
                type="button"
                onClick={handleDecrement}
                className="w-6 h-5 flex items-center justify-center text-xs font-black text-brand-700 bg-white rounded shadow-2xs hover:bg-brand-600 hover:text-white active:scale-90 transition-all cursor-pointer"
                title="Decrease quantity"
              >
                −
              </button>
              <div className="flex items-center gap-1">
                <span className="text-[11px] font-black text-navy-950 px-1">
                  {qty}
                </span>
                <span className="text-[9px] font-extrabold text-emerald-600 bg-emerald-100/70 px-1 rounded">
                  ✓
                </span>
              </div>
              <button
                type="button"
                onClick={handleIncrement}
                className="w-6 h-5 flex items-center justify-center text-xs font-black text-brand-700 bg-white rounded shadow-2xs hover:bg-brand-600 hover:text-white active:scale-90 transition-all cursor-pointer"
                title="Increase quantity"
              >
                +
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleAdd}
              className="w-full bg-[#0A192F] hover:bg-brand-600 active:scale-95 text-white text-[11px] font-bold h-7 rounded-lg transition-all shadow-2xs hover:shadow-xs cursor-pointer flex items-center justify-center gap-1"
            >
              <span>+ Add</span>
              {qty > 0 && (
                <span className="ml-1 bg-white/20 text-white text-[9.5px] font-bold px-1.5 py-0.2 rounded-full">
                  ({qty})
                </span>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}