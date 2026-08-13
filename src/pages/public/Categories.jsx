import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCart } from "../../context/CartContext";
import Navbar from "../../components/Navbar";
import RegionPicker from "../../components/RegionPicker";
import NotificationPanel from "../../components/NotificationPanel";

const filterPills = [
  { name: "All", img: null, icon: "⚡" },
  { name: "Cement", img: "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=150&q=80" },
  { name: "Paints", img: "https://images.unsplash.com/photo-1562259949-e8e7689d7828?auto=format&fit=crop&w=150&q=80" },
  { name: "Steel", img: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=150&q=80" },
  { name: "Plumbing", img: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=150&q=80" },
  { name: "Electrical", img: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=150&q=80" },
];

const banners = [
  {
    tag: "DISTRICT DIRECT SALE",
    title: ["Premium Building", "Materials Catalog"],
    sub: "Direct Wholesale Rates from Authorized DR Suppliers",
    img: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=600&q=80",
  },
  {
    tag: "WHOLESALE DEALS",
    title: ["Fresh Cement &", "TMT Steel Stock"],
    sub: "Bulk Quantity Discounts & Same-Day Site Delivery",
    img: "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=600&q=80",
  },
];

const categoryCards = [
  { name: "Cement", count: "120+ Products", img: "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=300&q=80", tag: "OPC & PPC" },
  { name: "Paints", count: "150+ Products", img: "https://images.unsplash.com/photo-1562259949-e8e7689d7828?auto=format&fit=crop&w=300&q=80", tag: "Emulsion" },
  { name: "Steel", count: "100+ Products", img: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=300&q=80", tag: "Fe 550D" },
  { name: "Plumbing", count: "80+ Products", img: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=300&q=80", tag: "CPVC / PVC" },
  { name: "Electrical", count: "120+ Products", img: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=300&q=80", tag: "Wires & Switches" },
  { name: "Sanitary", count: "90+ Products", img: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=300&q=80", tag: "Fittings" },
  { name: "Hardware", count: "200+ Products", img: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=300&q=80", tag: "Tools" },
  { name: "Tiles", count: "110+ Products", img: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=300&q=80", tag: "Ceramics" },
];

const bestSelling = [
  { id: "bs-1", name: "UltraTech Super PPC Cement, 50kg", brand: "UltraTech", img: "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=400&q=80", mrp: 445, price: 390, discount: "12% OFF", rating: "4.9 ★" },
  { id: "bs-2", name: "Asian Paints Royale Luxury Emulsion, 20L", brand: "Asian Paints", img: "https://images.unsplash.com/photo-1562259949-e8e7689d7828?auto=format&fit=crop&w=400&q=80", mrp: 2450, price: 2250, discount: "8% OFF", rating: "4.8 ★" },
  { id: "bs-3", name: "Tata Tiscon 550D TMT Steel Bar 12mm", brand: "Tata Tiscon", img: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=400&q=80", mrp: 765, price: 650, discount: "15% OFF", rating: "5.0 ★" },
  { id: "bs-4", name: "Berger Weathercoat Smooth 20L", brand: "Berger", img: "https://images.unsplash.com/photo-1562259949-e8e7689d7828?auto=format&fit=crop&w=400&q=80", mrp: 2250, price: 2050, discount: "10% OFF", rating: "4.7 ★" },
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

  const filteredCategories = categoryCards.filter((c) => {
    if (activePill === "All") return true;
    return c.name.toLowerCase().includes(activePill.toLowerCase());
  });

  return (
    <div className="min-h-screen bg-slate-50 text-navy-900 pb-24 sm:pb-12">
      {/* Desktop Navbar */}
      <div className="hidden lg:block">
        <Navbar />
      </div>

      {/* Mobile Header */}
      <div className="lg:hidden bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">🏗️</span>
            <div>
              <div className="font-black text-navy-900 text-base leading-none">
                Build <span className="text-brand-500">City</span>
              </div>
              <RegionPicker
                trigger={(r) => (
                  <span className="flex items-center gap-1 text-[11px] text-slate-500 mt-0.5">
                    <PinIcon />
                    {r.name}, {r.state === "Uttar Pradesh" ? "UP" : r.state}
                    <ChevronIcon />
                  </span>
                )}
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <NotificationPanel className="relative text-navy-900" />
            <Link to="/cart" className="relative text-navy-900">
              <CartIcon />
              {count > 0 && (
                <span className="absolute -top-1.5 -right-2 h-4.5 w-4.5 rounded-full bg-brand-500 text-white text-[10px] font-bold flex items-center justify-center">
                  {count}
                </span>
              )}
            </Link>
          </div>
        </div>

        {/* Mobile Search Bar */}
        <form onSubmit={handleSearch} className="max-w-6xl mx-auto px-4 pb-3">
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5">
            <SearchIcon />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              type="text"
              placeholder="Search category, brand, material..."
              className="w-full bg-transparent text-xs outline-none placeholder:text-slate-400 font-medium"
            />
            <button type="button" className="text-slate-400">
              <ScanIcon />
            </button>
          </div>
        </form>
      </div>

      <main className="max-w-6xl mx-auto px-4 pt-6 space-y-8">
        
        {/* Top Header Title & Filter Pills */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 border-b border-slate-100 pb-3">
            <div>
              <h1 className="text-xl font-black text-navy-900 tracking-tight">Browse All Building Categories</h1>
              <p className="text-xs text-slate-500">Certified construction supplies directly from verified district distributors</p>
            </div>
            <span className="text-xs font-bold bg-brand-50 text-brand-700 px-3 py-1 rounded-full border border-brand-200 w-fit">
              {filteredCategories.length} Categories Available
            </span>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-3 overflow-x-auto pb-1">
            {filterPills.map((p) => (
              <button
                key={p.name}
                onClick={() => setActivePill(p.name)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border transition-all cursor-pointer shrink-0 text-xs font-bold ${
                  activePill === p.name
                    ? "bg-navy-900 text-white border-navy-900 shadow-xs"
                    : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                }`}
              >
                {p.img ? (
                  <img src={p.img} alt={p.name} className="w-5 h-5 rounded-full object-cover border border-white/20" />
                ) : (
                  <span>{p.icon || "🧱"}</span>
                )}
                <span>{p.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Hero Slider Banner */}
        <div className="relative overflow-hidden rounded-2xl bg-navy-950 text-white h-44 sm:h-56 shadow-md border border-slate-800">
          {banners.map((b, i) => (
            <div
              key={i}
              className="absolute inset-0 transition-opacity duration-700 flex"
              style={{ opacity: slide === i ? 1 : 0, pointerEvents: slide === i ? "auto" : "none" }}
            >
              <div className="flex-[1.3] flex flex-col justify-center px-6 sm:px-8 py-5 relative z-10">
                <span className="text-brand-300 text-[10px] font-black tracking-widest uppercase mb-1">
                  {b.tag}
                </span>
                <h2 className="text-white text-xl sm:text-3xl font-black leading-tight mb-1 tracking-tight">
                  {b.title.map((line, idx) => (
                    <span key={idx}>
                      {line}
                      <br />
                    </span>
                  ))}
                </h2>
                <p className="text-slate-300 text-xs mb-3">{b.sub}</p>
                <button className="bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold rounded-xl px-4 py-2 flex items-center gap-1.5 w-fit shadow-xs transition-colors cursor-pointer">
                  Shop Category <span>→</span>
                </button>
              </div>

              <div className="flex-1 relative overflow-hidden">
                <img
                  src={b.img}
                  alt={b.title[0]}
                  className="absolute inset-0 w-full h-full object-cover"
                  style={{ clipPath: "polygon(15% 0, 100% 0, 100% 100%, 0% 100%)" }}
                />
                <div className="absolute inset-0 bg-linear-to-r from-navy-950/90 via-transparent to-transparent"></div>
              </div>
            </div>
          ))}

          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-20">
            {banners.map((_, i) => (
              <button
                key={i}
                onClick={() => setSlide(i)}
                className={`h-2 rounded-full transition-all cursor-pointer ${
                  slide === i ? "w-6 bg-brand-500" : "w-2 bg-white/40"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Shop by Category Grid */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-black text-navy-900">Explore Materials by Category</h2>
            <span className="text-xs text-slate-500 font-medium">Click category to view products</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-4 gap-4">
            {filteredCategories.map((c) => (
              <Link
                key={c.name}
                to={`/category/${encodeURIComponent(c.name.toLowerCase())}`}
                className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col justify-between shadow-xs hover:shadow-md hover:border-brand-500 transition-all group relative overflow-hidden"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-extrabold bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full">
                    {c.tag}
                  </span>
                  <span className="text-xs text-brand-600 font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                    Explore →
                  </span>
                </div>

                <div className="h-28 w-full rounded-xl overflow-hidden bg-slate-100 mb-3 border border-slate-100">
                  <img
                    src={c.img}
                    alt={c.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                </div>

                <div>
                  <h3 className="font-extrabold text-navy-900 text-sm group-hover:text-brand-600 transition-colors">
                    {c.name}
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">{c.count}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Best Selling Products */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-black text-navy-900">Best Selling District Products</h2>
              <p className="text-xs text-slate-500">Highest ordered construction items across Varanasi & nearby districts</p>
            </div>
            <Link to="/search" className="text-xs font-bold text-brand-600 hover:underline">
              View All Products →
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {bestSelling.map((p) => {
              const inCart = items.some((i) => i.id === p.id);

              return (
                <div
                  key={p.id}
                  className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
                >
                  <div>
                    <div className="relative rounded-xl overflow-hidden bg-slate-50 mb-3 border border-slate-100">
                      {p.discount && (
                        <span className="absolute top-2 left-2 z-10 bg-green-600 text-white text-[10px] font-extrabold px-2 py-0.5 rounded shadow-xs">
                          {p.discount}
                        </span>
                      )}
                      <span className="absolute top-2 right-2 z-10 bg-navy-900/80 text-white text-[10px] font-bold px-2 py-0.5 rounded backdrop-blur-xs">
                        {p.rating}
                      </span>
                      <img
                        src={p.img}
                        alt={p.name}
                        className="w-full h-40 object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                    </div>

                    <span className="text-[10px] font-bold text-brand-600 uppercase tracking-wider">
                      🏷️ {p.brand}
                    </span>
                    <h3 className="font-extrabold text-navy-900 text-xs leading-snug line-clamp-2 mt-0.5 mb-2">
                      {p.name}
                    </h3>
                  </div>

                  <div className="pt-3 border-t border-slate-100">
                    <div className="flex items-baseline gap-2 mb-3">
                      <span className="text-base font-black text-navy-900">
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
                      className={`w-full text-xs font-bold rounded-xl py-2.5 transition-all shadow-xs cursor-pointer ${
                        inCart
                          ? "bg-green-600 text-white"
                          : "bg-brand-500 hover:bg-brand-600 text-white"
                      }`}
                    >
                      {inCart ? "Added to Cart ✓" : "+ Add to Cart"}
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
function CartIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="9" cy="21" r="1" />
      <circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6" />
    </svg>
  );
}