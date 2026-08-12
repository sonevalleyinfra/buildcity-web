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
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-4">
        <Link to="/">
          <Logo size="sm" />
        </Link>

        <nav className="hidden lg:flex items-center gap-6 ml-2">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              to={link.to}
              className={`text-sm font-medium ${
                pathname === link.to
                  ? "text-brand-500"
                  : "text-slate-600 hover:text-navy-900"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <RegionPicker
          trigger={(region) => (
            <span className="hidden sm:flex items-center gap-1 text-sm text-slate-600 hover:text-navy-900 shrink-0">
              <PinIcon />
              {region.name}
              <ChevronIcon />
            </span>
          )}
        />

        <form onSubmit={handleSearch} className="flex-1 max-w-xl mx-auto">
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-surface px-3.5 py-2">
            <SearchIcon />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              type="text"
              placeholder="Search for products, brands, services..."
              className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
            />
          </div>
        </form>

        <div className="flex items-center gap-4 shrink-0">
        <NotificationPanel />
          <Link to="/cart" className="relative text-slate-600 hover:text-navy-900">
            <CartIcon />
            {count > 0 && (
              <span className="absolute -top-2 -right-2 h-4 w-4 rounded-full bg-brand-500 text-white text-[10px] flex items-center justify-center">
                {count}
              </span>
            )}
          </Link>
          <div className="hidden lg:flex items-center gap-3 pl-3 border-l border-slate-200">
            <span className="text-sm text-slate-600">{user?.name}</span>
            <button
              onClick={handleLogout}
              className="text-sm font-medium text-red-500 hover:underline"
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