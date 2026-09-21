import { useEffect, useState, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { useCart } from "../context/CartContext";

export default function FloatingCartBar() {
  const { count, total, items } = useCart();
  const { pathname } = useLocation();
  const [isVisible, setIsVisible] = useState(false);
  const timerRef = useRef(null);

  // Hide on cart, checkout, auth, or dashboard pages
  const isHiddenPage =
    pathname === "/cart" ||
    pathname === "/checkout" ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/vendor") ||
    pathname.startsWith("/dr") ||
    pathname === "/login" ||
    pathname === "/register";

  // Auto-hide after 7 seconds of inactivity (similar to product card stepper reverting to '+ Add')
  useEffect(() => {
    if (count > 0 && !isHiddenPage) {
      setIsVisible(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        setIsVisible(false);
      }, 7000);
    } else {
      setIsVisible(false);
      if (timerRef.current) clearTimeout(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [count, total, items, pathname, isHiddenPage]);

  const handleMouseEnter = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setIsVisible(true);
  };

  const handleMouseLeave = () => {
    if (count > 0 && !isHiddenPage) {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        setIsVisible(false);
      }, 7000);
    }
  };

  // Hide completely if 0 items or on excluded pages
  if (count <= 0 || isHiddenPage) return null;

  return (
    <div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`fixed z-40 bottom-16 sm:bottom-6 left-0 right-0 px-3.5 sm:px-6 pointer-events-none transition-all duration-500 ease-in-out ${
        isVisible
          ? "opacity-100 translate-y-0"
          : "opacity-0 translate-y-8 pointer-events-none"
      }`}
    >
      <div className="max-w-xl mx-auto pointer-events-auto">
        <Link
          to="/cart"
          className="flex items-center justify-between bg-gradient-to-r from-[#0A192F] via-navy-900 to-brand-600 text-white px-4 py-3 sm:py-3.5 rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.25)] border border-white/15 active:scale-[0.98] hover:shadow-[0_12px_36px_rgba(0,0,0,0.35)] transition-all group"
        >
          {/* Left: Cart Icon & Item Count */}
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-10 rounded-xl bg-brand-500/20 border border-brand-400/30 flex items-center justify-center text-lg text-brand-400 shadow-inner group-hover:scale-105 transition-transform">
              🛒
              <span className="absolute -top-1.5 -right-1.5 bg-brand-500 text-white font-black text-[10px] min-w-[19px] h-[19px] px-1 rounded-full flex items-center justify-center border-2 border-navy-950 shadow-xs animate-pulse">
                {count}
              </span>
            </div>
            <div>
              <div className="text-xs sm:text-sm font-black tracking-tight text-white flex items-center gap-1.5">
                <span>{count} {count === 1 ? "Item" : "Items"} in Cart</span>
              </div>
              <div className="text-[11px] sm:text-xs text-brand-300 font-extrabold mt-0.5">
                ₹{Number(total || 0).toLocaleString("en-IN")}
              </div>
            </div>
          </div>

          {/* Right: View Cart Action */}
          <div className="flex items-center gap-2 bg-white/10 group-hover:bg-white/20 px-3.5 py-1.5 rounded-xl border border-white/10 transition-colors">
            <span className="text-xs sm:text-sm font-black text-white tracking-wide">
              View Cart
            </span>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              className="text-white group-hover:translate-x-0.5 transition-transform"
            >
              <path d="M5 12h14m-7-7 7 7-7 7" />
            </svg>
          </div>
        </Link>
      </div>
    </div>
  );
}
