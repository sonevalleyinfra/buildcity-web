import { useEffect, useState, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { ArrowRightIcon, CartIcon } from "./ui/Icons";

export default function FloatingCartBar() {
  const { count, total, lastAddedAt } = useCart();
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

  // Auto-show for 7s ONLY when user actively adds/increments item in cart, then hide
  useEffect(() => {
    if (lastAddedAt > 0 && count > 0 && !isHiddenPage) {
      setIsVisible(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        setIsVisible(false);
      }, 7000); // 7s auto-hide
    } else {
      setIsVisible(false);
      if (timerRef.current) clearTimeout(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [lastAddedAt, isHiddenPage]);

  // Hide completely if 0 items, on excluded pages, or when 7s timer expired
  if (count <= 0 || isHiddenPage || !isVisible) return null;

  return (
    <div
      data-storefront
      className="pointer-events-none fixed inset-x-0 z-40 bottom-[calc(4rem+max(0.25rem,env(safe-area-inset-bottom)))] px-3 sm:px-6 lg:bottom-6"
    >
      <div className="bc-sheet-up pointer-events-auto mx-auto max-w-md">
        <Link
          to="/cart"
          className="group flex items-center justify-between gap-3 rounded-2xl bg-navy-950 py-2.5 pl-2.5 pr-3 text-white shadow-[0_12px_32px_-10px_rgba(15,23,42,0.55)] ring-1 ring-white/10 transition-colors hover:bg-navy-900 active:scale-[0.99]"
        >
          <span className="flex min-w-0 items-center gap-3">
            <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10">
              <CartIcon className="h-5 w-5" />
              <span className="absolute -right-1.5 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-brand-500 px-1 text-[11px] font-semibold leading-none text-white ring-2 ring-navy-950 tabular-nums">
                {count}
              </span>
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold leading-tight">
                {count} {count === 1 ? "item" : "items"} in cart
              </span>
              <span className="block text-xs leading-tight text-slate-300 tabular-nums">₹{Number(total || 0).toLocaleString("en-IN")}</span>
            </span>
          </span>
          <span className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-white px-3 py-2 text-sm font-semibold text-navy-950 transition-colors group-hover:bg-brand-50">
            View cart
            <ArrowRightIcon className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
          </span>
        </Link>
      </div>
    </div>
  );
}
