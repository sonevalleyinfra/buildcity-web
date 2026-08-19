import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Logo from "./Logo";
import RegionPicker from "./RegionPicker";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import NotificationPanel from "./NotificationPanel";

const navLinks = [
  { label: "Home", to: "/" },
  { label: "Categories", to: "/categories" },
  { label: "Orders", to: "/orders" },
  { label: "Profile", to: "/profile" },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const { count } = useCart();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleSearch = (e) => {
    e.preventDefault();
    navigate(query ? `/search?q=${encodeURIComponent(query)}` : "/search");
  };

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-4">
        <Link to="/" className="active:scale-[0.98] transition-all duration-200 shrink-0">
          <Logo size="sm" />
        </Link>

        <nav className="hidden lg:flex items-center gap-6 ml-2">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              to={link.to}
              className={`text-sm font-semibold tracking-tight transition-colors duration-150 relative py-1 ${
                pathname === link.to
                  ? "text-brand-600 font-bold"
                  : "text-slate-600 hover:text-navy-900"
              }`}
            >
              {link.label}
              {pathname === link.to && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-600 rounded-full" />
              )}
            </Link>
          ))}
        </nav>

        <RegionPicker
          trigger={(region) => (
            <span className="hidden sm:flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-navy-900 shrink-0 px-3 py-1.5 rounded-xl bg-slate-100/70 hover:bg-slate-100 border border-slate-200/80 active:scale-[0.98] transition-all duration-200 cursor-pointer shadow-2xs">
              <PinIcon />
              {region.name}
              <ChevronIcon />
            </span>
          )}
        />

        <form onSubmit={handleSearch} className="flex-1 max-w-xl mx-auto">
          <div className="flex items-center gap-2.5 rounded-xl border border-slate-200/90 bg-slate-50/80 hover:bg-white focus-within:bg-white focus-within:ring-4 focus-within:ring-brand-500/10 focus-within:border-brand-500 px-3.5 py-2 transition-all duration-200 shadow-2xs">
            <SearchIcon />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              type="text"
              placeholder="Search for products, brands, services..."
              className="w-full bg-transparent text-xs font-medium text-navy-900 outline-none placeholder:text-slate-400"
            />
          </div>
        </form>

        <div className="flex items-center gap-4 shrink-0">
          <NotificationPanel />
          <Link
            to="/cart"
            className="relative text-slate-600 hover:text-navy-900 active:scale-[0.95] transition-all duration-200 p-1.5 rounded-xl hover:bg-slate-100/80"
          >
            <CartIcon />
            {count > 0 && (
              <span className="absolute -top-1 -right-1 h-4.5 min-w-[18px] px-1 rounded-full bg-brand-600 text-white text-[10px] font-black flex items-center justify-center shadow-xs ring-2 ring-white animate-pulse">
                {count}
              </span>
            )}
          </Link>
          <div className="hidden lg:flex items-center gap-3 pl-3 border-l border-slate-200">
            <span className="text-xs font-semibold text-slate-700 tracking-tight">{user?.name}</span>
            <button
              onClick={handleLogout}
              className="text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200/80 px-3 py-1.2 rounded-lg active:scale-[0.98] transition-all duration-200 cursor-pointer shadow-2xs"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

function PinIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}
function ChevronIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}
function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}
function BellIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9Z" />
      <path d="M13.7 21a2 2 0 0 1-3.4 0" />
    </svg>
  );
}
function CartIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="9" cy="21" r="1" />
      <circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6" />
    </svg>
  );
}