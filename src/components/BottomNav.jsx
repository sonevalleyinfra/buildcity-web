import { Link, useLocation } from "react-router-dom";
import { useCart } from "../context/CartContext";

export default function BottomNav() {
  const { pathname } = useLocation();
  const { count } = useCart();

  const tabs = [
    { label: "Home", path: "/", icon: HomeIcon },
    { label: "Categories", path: "/categories", icon: GridIcon },
    { label: "Cart", path: "/cart", icon: CartIcon, badge: count },
    { label: "Orders", path: "/orders", icon: OrdersIcon },
    { label: "Account", path: "/profile", icon: ProfileIcon },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-slate-200/90 lg:hidden shadow-[0_-4px_16px_rgba(0,0,0,0.04)] pb-[env(safe-area-inset-bottom)]">
      <div className="grid grid-cols-5 h-14">
        {tabs.map((tab) => {
          const active = pathname === tab.path || (tab.path !== "/" && pathname.startsWith(tab.path));
          const Icon = tab.icon;
          return (
            <Link
              key={tab.label}
              to={tab.path}
              className="flex flex-col items-center justify-center gap-0.5 relative active:scale-90 transition-transform duration-150"
            >
              <div className="relative">
                <Icon
                  className={`transition-colors duration-150 ${
                    active ? "text-brand-600" : "text-slate-400"
                  }`}
                />
                {tab.badge > 0 && (
                  <span className="absolute -top-1 -right-2 bg-brand-600 text-white text-[9px] font-black h-4 min-w-[16px] px-1 rounded-full flex items-center justify-center ring-2 ring-white shadow-xs">
                    {tab.badge}
                  </span>
                )}
              </div>
              <span
                className={`text-[10px] tracking-tight transition-colors duration-150 ${
                  active ? "font-black text-brand-600" : "font-semibold text-slate-500"
                }`}
              >
                {tab.label}
              </span>
              {active && (
                <span className="absolute top-0 w-8 h-0.5 bg-brand-600 rounded-full" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function HomeIcon({ className }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="m3 11 9-8 9 8" />
      <path d="M5 10v10h14V10" />
    </svg>
  );
}

function GridIcon({ className }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );
}

function CartIcon({ className }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <circle cx="9" cy="21" r="1" />
      <circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6" />
    </svg>
  );
}

function OrdersIcon({ className }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="M9 2h6a1 1 0 0 1 1 1v2H8V3a1 1 0 0 1 1-1Z" />
      <rect x="5" y="5" width="14" height="16" rx="2" />
      <path d="M9 12h6M9 16h6" />
    </svg>
  );
}

function ProfileIcon({ className }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  );
}