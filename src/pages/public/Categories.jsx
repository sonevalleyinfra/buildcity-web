import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCart } from "../../context/CartContext";
import Navbar from "../../components/Navbar";
import RegionPicker from "../../components/RegionPicker";
import NotificationPanel from "../../components/NotificationPanel";

const filterPills = [
  { name: "All", img: null },
  { name: "Cement", img: "https://loremflickr.com/100/100/cement,bag" },
  { name: "Paints", img: "https://loremflickr.com/100/100/paint,bucket" },
  { name: "Steel", img: "https://loremflickr.com/100/100/steel,rebar" },
  { name: "Plumbing", img: "https://loremflickr.com/100/100/faucet,tap" },
];

const banners = [
  {
    tag: "UP TO 20% OFF",
    title: ["Premium Quality", "Building Materials"],
    sub: "At Best Prices",
    img: "https://loremflickr.com/500/500/construction,materials",
  },
  {
    tag: "NEW STOCK",
    title: ["Fresh Cement", "& Steel Arrivals"],
    sub: "Order in Bulk & Save",
    img: "https://loremflickr.com/500/500/cement,steel",
  },
];

const categoryCards = [
  { name: "Cement", count: "120+ Products", img: "https://loremflickr.com/300/300/cement,bag" },
  { name: "Paints", count: "150+ Products", img: "https://loremflickr.com/300/300/paint,bucket" },
  { name: "Steel", count: "100+ Products", img: "https://loremflickr.com/300/300/steel,rebar" },
  { name: "Plumbing", count: "80+ Products", img: "https://loremflickr.com/300/300/faucet,tap" },
  { name: "Electrical", count: "120+ Products", img: "https://loremflickr.com/300/300/bulb,light" },
  { name: "Sanitary", count: "90+ Products", img: "https://loremflickr.com/300/300/toilet,bathroom" },
  { name: "Hardware", count: "200+ Products", img: "https://loremflickr.com/300/300/drill,tools" },
  { name: "Tiles", count: "110+ Products", img: "https://loremflickr.com/300/300/tiles,ceramic" },
];

const bestSelling = [
  { id: "bs-1", name: "UltraTech Cement 50kg", brand: "UltraTech", img: "https://picsum.photos/seed/cement1/300/300", mrp: 445, price: 390, discount: "12% OFF" },
  { id: "bs-2", name: "Asian Paints Royale 20L", brand: "Asian Paints", img: "https://picsum.photos/seed/paint1/300/300", mrp: 2450, price: 2250, discount: "8% OFF" },
  { id: "bs-3", name: "TMT Steel Bar 12mm", brand: "Generic", img: "https://picsum.photos/seed/steel1/300/300", mrp: 765, price: 650, discount: "15% OFF" },
  { id: "bs-4", name: "Berger Weathercoat 20L", brand: "Berger", img: "https://picsum.photos/seed/paint2/300/300", mrp: 2250, price: 2050, discount: "10% OFF" },
];

export default function Categories() {
  const navigate = useNavigate();
  const { count, addItem, items } = useCart();
  const [activePill, setActivePill] = useState("All");
  const [slide, setSlide] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (e) => {
    e.preventDefault();
    navigate(searchQuery ? `/search?q=${encodeURIComponent(searchQuery)}` : "/search");
  };

  return (
    <div className="min-h-screen bg-surface pb-24 sm:pb-0">
      {/* Desktop header — shared Navbar bar hai  */}
      <div className="hidden lg:block">
        <Navbar />
      </div>

      {/* Mobile header — custom navy-accented header */}
      <div className="lg:hidden">
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          
          <div className="flex items-center gap-1.5">
            <span className="text-lg">🏗️</span>
            <div>
              <div className="font-extrabold text-navy-900 text-base leading-none">
                Build <span className="text-brand-500">City</span>
              </div>
              <RegionPicker
                trigger={(r) => (
                  <span className="flex items-center gap-1 text-[11px] text-slate-500 mt-1">
                    <PinIcon />
                    {r.name}, {r.state === "Uttar Pradesh" ? "UP" : r.state}
                    <ChevronIcon />
                  </span>
                )}
              />
            </div>
          </div>
          <div className="flex items-center gap-4">
           <NotificationPanel className="relative text-navy-900" />
            <Link to="/cart" className="relative text-navy-900">
              <CartIcon />
              {count > 0 && (
                <span className="absolute -top-2 -right-2 h-4 w-4 rounded-full bg-brand-500 text-white text-[10px] flex items-center justify-center">
                  {count}
                </span>
              )}
            </Link>
          </div>
        </div>

        {/* Search bar */}
        <form onSubmit={handleSearch} className="max-w-6xl mx-auto px-4 pb-3">
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-3">
            <SearchIcon />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              type="text"
              placeholder="Search for products, brands, services..."
              className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
            />
            <button type="button" className="text-slate-400">
              <ScanIcon />
            </button>
          </div>
        </form>

        {/* Filter pills */}
        <div className="max-w-6xl mx-auto px-4 pb-4 flex items-center gap-4 overflow-x-auto">
          {filterPills.map((p) => (
            <button
              key={p.name}
              onClick={() => setActivePill(p.name)}
              className="flex flex-col items-center gap-1.5 shrink-0"
            >
              <div
                className={`h-14 w-14 rounded-full flex items-center justify-center overflow-hidden border-2 ${
                  activePill === p.name
                    ? "border-brand-500 bg-brand-500"
                    : "border-slate-200 bg-white"
                }`}
              >
                {p.img ? (
                  <img src={p.img} alt={p.name} className="w-full h-full object-cover" />
                ) : (
                  <GridIcon active={activePill === p.name} />
                )}
              </div>
              <span
                className={`text-[11px] font-medium ${
                  activePill === p.name ? "text-brand-500" : "text-slate-600"
                }`}
              >
                {p.name}
              </span>
            </button>
          ))}
          <button className="flex flex-col items-center gap-1.5 shrink-0">
            <div className="h-14 w-14 rounded-full border-2 border-slate-200 bg-white flex items-center justify-center">
              <DotsIcon />
            </div>
            <span className="text-[11px] font-medium text-slate-600">More</span>
          </button>
        </div>
      </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 pt-4 space-y-7">
        {/* Banner slider */}
        <div className="relative overflow-hidden rounded-2xl bg-navy-900 h-44 sm:h-52">
          {banners.map((b, i) => (
            <div
              key={i}
              className="absolute inset-0 transition-opacity duration-700 flex"
              style={{ opacity: slide === i ? 1 : 0, pointerEvents: slide === i ? "auto" : "none" }}
            >
              <div className="flex-[1.3] flex flex-col justify-center px-6 py-5 relative z-10">
                <span className="text-warning text-[10px] font-bold tracking-wide mb-1.5">
                  {b.tag}
                </span>
                <h2 className="text-white text-xl sm:text-2xl font-extrabold leading-tight mb-1">
                  {b.title.map((line, idx) => (
                    <span key={idx}>
                      {line}
                      <br />
                    </span>
                  ))}
                </h2>
                <p className="text-white/70 text-xs mb-3">{b.sub}</p>
                <button className="bg-white text-navy-900 text-xs font-semibold rounded-xl px-4 py-2 flex items-center gap-1.5 w-fit">
                  Shop Now <span>→</span>
                </button>
              </div>
              <div className="flex-1 relative overflow-hidden">
                <img
                  src={b.img}
                  alt={b.title[0]}
                  className="absolute inset-0 w-full h-full object-cover"
                  style={{ clipPath: "polygon(15% 0, 100% 0, 100% 100%, 0% 100%)" }}
                />
              </div>
            </div>
          ))}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-20">
            {banners.map((_, i) => (
              <button
                key={i}
                onClick={() => setSlide(i)}
                className={`h-1.5 rounded-full transition-all ${
                  slide === i ? "w-4 bg-white" : "w-1.5 bg-white/40"
                }`}
              />
            ))}
          </div>
        </div>
{/* Shop by category — 4 columns, consistent small size */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-navy-900">Shop by Category</h2>
            
          </div>
          <div className="grid grid-cols-4 gap-2">
            {categoryCards.map((c) => (
              <Link
                key={c.name}
                to={`/category/${encodeURIComponent(c.name)}`}
                className="bg-white border border-slate-200 rounded-lg p-2 flex flex-col items-center text-center hover:border-brand-500 transition-colors"
              >
                <div className="h-12 w-12 mb-1.5 shrink-0">
                  <img
                    src={c.img}
                    alt={c.name}
                    className="w-full h-full object-cover rounded-md"
                    loading="lazy"
                  />
                </div>
                <span className="text-[10px] font-bold text-navy-900 leading-tight">{c.name}</span>
                <span className="text-[8px] text-slate-500 leading-tight">{c.count}</span>
              </Link>
            ))}
          </div>
        </section>

     {/* Shop by category — single row, rounded bordered cards like screenshot */}
     

        {/* Best Selling Products */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-navy-900">Best Selling Products</h2>
            <Link to="/categories" className="text-xs font-medium text-brand-500">View all</Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {bestSelling.map((p) => {
              const inCart = items.some((i) => i.id === p.id);
              return (
                <div
                  key={p.id}
                  className="bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col"
                >
                  <div className="relative aspect-square bg-slate-100">
                    {p.discount && (
                      <span className="absolute top-2 left-2 z-10 bg-success text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                        {p.discount}
                      </span>
                    )}
                    <img
                      src={p.img}
                      alt={p.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                  <div className="p-3 flex flex-col flex-1">
                    <p className="text-sm font-medium text-navy-900 leading-snug line-clamp-2 mb-1.5">
                      {p.name}
                    </p>
                    <div className="flex items-baseline gap-1.5 mb-3">
                      <span className="text-sm font-bold text-navy-900">
                        ₹{p.price.toLocaleString("en-IN")}
                      </span>
                      {p.mrp > p.price && (
                        <span className="text-xs text-slate-400 line-through">
                          ₹{p.mrp.toLocaleString("en-IN")}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => addItem(p, 1)}
                      className={`mt-auto w-full text-sm font-semibold rounded-lg py-2 transition-colors ${
                        inCart
                          ? "bg-success text-white"
                          : "border border-brand-500 text-brand-500 hover:bg-brand-500 hover:text-white"
                      }`}
                    >
                      {inCart ? "Added ✓" : "Add to Cart"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>

    </div>
  );
}
function MenuIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}
function ChevronIcon() {
  return (
    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
function ScanIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 8V5a2 2 0 0 1 2-2h3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M21 16v3a2 2 0 0 1-2 2h-3" />
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
function GridIcon({ active }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={active ? "#fff" : "#0f172a"} strokeWidth="2">
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );
}
function DotsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="text-slate-500">
      <circle cx="5" cy="12" r="1.8" />
      <circle cx="12" cy="12" r="1.8" />
      <circle cx="19" cy="12" r="1.8" />
    </svg>
  );
}