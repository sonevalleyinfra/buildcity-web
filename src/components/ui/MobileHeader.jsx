import { Link, useNavigate } from "react-router-dom";
import { useCart } from "../../context/CartContext";
import NotificationPanel from "../NotificationPanel";
import { CartIcon, ChevronLeftIcon } from "./Icons";

// One app bar for every inner storefront page on phones/tablets (the desktop uses <Navbar />).
// Back goes to the previous screen when there is one, otherwise to `fallback`. `children` renders a second row (e.g. search).
export default function MobileHeader({
  title,
  subtitle,
  fallback = "/",
  showCart = true,
  showBell = true,
  actions = null,
  className = "lg:hidden",
  children = null,
}) {
  const navigate = useNavigate();
  const { count } = useCart();

  const goBack = () => {
    const idx = typeof window !== "undefined" ? window.history.state?.idx : 0;
    if (typeof idx === "number" && idx > 0) navigate(-1);
    else navigate(fallback, { replace: true });
  };

  return (
    <header
      data-storefront
      className={`sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 backdrop-blur-md ${className}`}
    >
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-1 px-2 sm:px-4">
        <button
          type="button"
          onClick={goBack}
          aria-label="Go back"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-navy-900 transition-colors hover:bg-slate-100 active:bg-slate-200"
        >
          <ChevronLeftIcon className="h-5 w-5" strokeWidth={2.2} />
        </button>

        <div className="min-w-0 flex-1 px-1">
          <h1 className="truncate text-[15px] font-semibold leading-tight tracking-tight text-navy-950">{title}</h1>
          {subtitle && <p className="truncate text-xs leading-tight text-slate-500">{subtitle}</p>}
        </div>

        <div className="flex shrink-0 items-center">
          {actions}
          {showBell && (
            <NotificationPanel className="relative flex h-10 w-10 items-center justify-center rounded-xl text-navy-900 transition-colors hover:bg-slate-100 active:bg-slate-200 cursor-pointer" />
          )}
          {showCart && (
            <Link
              to="/cart"
              aria-label={count > 0 ? `Cart, ${count} items` : "Cart"}
              className="relative flex h-10 w-10 items-center justify-center rounded-xl text-navy-900 transition-colors hover:bg-slate-100 active:bg-slate-200"
            >
              <CartIcon className="h-[22px] w-[22px]" />
              {count > 0 && (
                <span className="absolute right-1 top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-brand-600 px-1 text-[11px] font-semibold leading-none text-white ring-2 ring-white tabular-nums">
                  {count > 99 ? "99+" : count}
                </span>
              )}
            </Link>
          )}
        </div>
      </div>
      {children && <div className="mx-auto max-w-6xl px-4 pb-3">{children}</div>}
    </header>
  );
}
