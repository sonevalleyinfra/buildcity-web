import { useEffect, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import Logo from "./Logo";
import RegionPicker from "./RegionPicker";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import NotificationPanel from "./NotificationPanel";
import { Capacitor } from "@capacitor/core";
import {
  CartIcon,
  ChevronDownIcon,
  LogOutIcon,
  PinIcon,
  SearchIcon,
  CloseIcon,
} from "./ui/Icons";

// Desktop storefront header. Phones/tablets use the page's own header (MobileHeader or the Home header).
export default function Navbar() {
  const { user, logout } = useAuth();
  const { count } = useCart();
  const { pathname, search } = useLocation();
  const navigate = useNavigate();
  const [query, setQuery] = useState(() => (pathname === "/search" ? new URLSearchParams(search).get("q") || "" : ""));
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 8);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleSearch = (e) => {
    e.preventDefault();
    const q = query.trim();
    navigate(q ? `/search?q=${encodeURIComponent(q)}` : "/search");
  };

  const navLinkClass = ({ isActive }) =>
    `relative py-2 text-sm font-medium transition-colors ${
      isActive ? "text-navy-950 after:absolute after:inset-x-0 after:-bottom-[13px] after:h-0.5 after:rounded-full after:bg-brand-500" : "text-slate-600 hover:text-navy-950"
    }`;

  return (
    <header
      data-storefront
      className={`sticky top-0 z-30 bg-white/95 backdrop-blur-md transition-shadow duration-200 ${
        isScrolled ? "shadow-[0_1px_0_rgba(15,23,42,0.06),0_8px_24px_-12px_rgba(15,23,42,0.12)]" : "shadow-[0_1px_0_rgba(15,23,42,0.08)]"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6 xl:gap-5">
        <Link to="/" aria-label="BuildCity home" className="shrink-0 rounded-lg">
          <Logo size="sm" />
        </Link>

        <RegionPicker
          trigger={(region) => (
            <span className="hidden h-10 shrink-0 items-center gap-1.5 rounded-xl px-2.5 text-left transition-colors hover:bg-slate-100 sm:flex">
              <PinIcon className="h-4 w-4 text-brand-600" />
              <span className="flex flex-col leading-tight">
                <span className="text-[11px] text-slate-500">Deliver to</span>
                <span className="max-w-[120px] truncate text-sm font-semibold text-navy-950">{region.name}</span>
              </span>
              <ChevronDownIcon className="h-4 w-4 text-slate-400" />
            </span>
          )}
        />

        <form onSubmit={handleSearch} className="min-w-0 flex-1" role="search">
          <label className="group flex h-10 items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 transition-[border-color,background-color,box-shadow] duration-150 focus-within:border-brand-500 focus-within:bg-white focus-within:shadow-[0_0_0_4px_rgba(234,88,12,0.10)] hover:border-slate-300">
            <SearchIcon className="h-[18px] w-[18px] shrink-0 text-slate-400 group-focus-within:text-brand-600" />
            <span className="sr-only">Search</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              type="search"
              placeholder="Search cement, TMT, bricks, paints…"
              className="h-full w-full min-w-0 bg-transparent text-sm text-navy-950 outline-none placeholder:text-slate-400 [&::-webkit-search-cancel-button]:hidden"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-slate-400 hover:bg-slate-200/70 hover:text-slate-600"
              >
                <CloseIcon className="h-3.5 w-3.5" strokeWidth={2.2} />
              </button>
            )}
          </label>
        </form>

        <nav className="hidden shrink-0 items-center gap-5 lg:flex" aria-label="Main">
          <NavLink to="/categories" className={navLinkClass}>
            Categories
          </NavLink>
          {user && (
            <NavLink to="/orders" className={navLinkClass}>
              Orders
            </NavLink>
          )}
        </nav>

        <div className="flex shrink-0 items-center gap-1">
          <NotificationPanel className="relative flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl text-slate-600 transition-colors hover:bg-slate-100 hover:text-navy-950" />
          <Link
            to="/cart"
            aria-label={count > 0 ? `Cart, ${count} items` : "Cart"}
            className="relative flex h-10 w-10 items-center justify-center rounded-xl text-slate-600 transition-colors hover:bg-slate-100 hover:text-navy-950"
          >
            <CartIcon className="h-[22px] w-[22px]" />
            {count > 0 && (
              <span className="absolute right-1 top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-brand-600 px-1 text-[11px] font-semibold leading-none text-white ring-2 ring-white tabular-nums">
                {count > 99 ? "99+" : count}
              </span>
            )}
          </Link>

          {user ? (
            <AccountMenu user={user} onLogout={handleLogout} />
          ) : (
            <div className="ml-2 hidden items-center gap-1 lg:flex">
              <Link
                to="/login"
                className="inline-flex h-10 items-center rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white shadow-[0_1px_2px_rgba(154,52,18,0.3)] transition-colors hover:bg-brand-700 active:scale-[0.98]"
              >
                Log in
              </Link>
              {!Capacitor.isNativePlatform() && (
                <Link
                  to="/vendor/login"
                  className="hidden h-10 items-center rounded-xl px-3 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-navy-950 xl:inline-flex"
                >
                  For partners
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function AccountMenu({ user, onLogout }) {
  const name = user.name || "Customer";
  return (
    <div className="ml-1 hidden items-center gap-0.5 lg:flex">
      <Link
        to="/profile"
        title="Profile & wallet"
        className="flex h-10 items-center gap-2 rounded-xl pl-1 pr-2.5 transition-colors hover:bg-slate-100"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-50 text-sm font-semibold text-brand-700 ring-1 ring-brand-100">
          {name.trim()[0]?.toUpperCase() || "U"}
        </span>
        <span className="max-w-[140px] truncate text-sm font-medium text-navy-950">{name}</span>
      </Link>
      <button
        type="button"
        onClick={onLogout}
        aria-label="Logout"
        title="Log out"
        className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-rose-50 hover:text-rose-600"
      >
        <LogOutIcon className="h-[18px] w-[18px]" />
      </button>
    </div>
  );
}
