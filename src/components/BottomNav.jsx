import { Link, useLocation } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { CartIcon, GridIcon, HomeIcon, ReceiptIcon, UserIcon } from "./ui/Icons";

export default function BottomNav() {
  const { pathname } = useLocation();
  const { count } = useCart();

  const tabs = [
    { label: "Home", path: "/", icon: HomeIcon },
    { label: "Categories", path: "/categories", icon: GridIcon },
    { label: "Cart", path: "/cart", icon: CartIcon, badge: count },
    { label: "Orders", path: "/orders", icon: ReceiptIcon },
    { label: "Profile", path: "/profile", icon: UserIcon },
  ];

  return (
    <nav
      data-storefront
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200/80 bg-white/95 pb-[max(0.25rem,env(safe-area-inset-bottom))] backdrop-blur-md lg:hidden"
    >
      <div className="mx-auto grid h-14 w-full max-w-lg grid-cols-5">
        {tabs.map((tab) => {
          const active = pathname === tab.path || (tab.path !== "/" && pathname.startsWith(tab.path));
          const Icon = tab.icon;
          return (
            <Link
              key={tab.label}
              to={tab.path}
              aria-current={active ? "page" : undefined}
              className="relative flex touch-manipulation select-none flex-col items-center justify-center gap-1 transition-colors"
            >
              <span
                aria-hidden="true"
                className={`absolute top-0 h-0.5 w-8 rounded-b-full bg-brand-500 transition-opacity duration-200 ${active ? "opacity-100" : "opacity-0"}`}
              />
              <span className="relative">
                <Icon
                  className={`h-[22px] w-[22px] transition-colors duration-150 ${active ? "text-brand-600" : "text-slate-500"}`}
                  strokeWidth={active ? 2.1 : 1.8}
                />
                {tab.badge > 0 && (
                  <span className="absolute -right-2.5 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-brand-600 px-1 text-[11px] font-semibold leading-none text-white ring-2 ring-white tabular-nums">
                    {tab.badge > 99 ? "99+" : tab.badge}
                  </span>
                )}
              </span>
              <span className={`text-[11px] leading-none ${active ? "font-semibold text-brand-700" : "font-medium text-slate-500"}`}>
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
