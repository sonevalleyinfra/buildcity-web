import { Link, useLocation } from "react-router-dom";

export default function BottomNav() {
  const { pathname } = useLocation();

  const tabs = [
    { label: "Home", path: "/", icon: HomeIcon },
    { label: "Categories", path: "/categories", icon: GridIcon },
    { label: "Cart", path: "/cart", icon: CartIcon },
    { label: "Orders", path: "/orders", icon: OrdersIcon },
    { label: "Profile", path: "/profile", icon: ProfileIcon },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 lg:hidden">
      <div className="grid grid-cols-5">
        {tabs.map((tab) => {
          const active = pathname === tab.path;
          const Icon = tab.icon;
          return (
            <Link
              key={tab.label}
              to={tab.path}
              className="flex flex-col items-center justify-center gap-1 py-2.5 relative"
            >
              <span className="relative">
                <Icon
                  className={active ? "text-brand-500" : "text-slate-400"}
                />
              </span>
              <span
                className={`text-[11px] font-medium ${
                  active ? "text-brand-500" : "text-slate-400"
                }`}
              >
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
 {/* Sabhi screen Jo bottom me hai wo yahi se manage hoti hai .  */}
function HomeIcon({ className }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className={className}>
      <path d="m3 11 9-8 9 8" />
      <path d="M5 10v10h14V10" />
    </svg>
  );
}
function GridIcon({ className }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className={className}>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );
}
function CartIcon({ className }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className={className}>
      <circle cx="9" cy="21" r="1" />
      <circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6" />
    </svg>
  );
}
function OrdersIcon({ className }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className={className}>
      <path d="M9 2h6a1 1 0 0 1 1 1v2H8V3a1 1 0 0 1 1-1Z" />
      <rect x="5" y="5" width="14" height="16" rx="2" />
      <path d="M9 12h6M9 16h6" />
    </svg>
  );
}
function ProfileIcon({ className }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className={className}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  );
}