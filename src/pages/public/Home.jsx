import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useCart } from "../../context/CartContext";
import { useAdmin } from "../../context/AdminContext";
import Navbar from "../../components/Navbar";
import RegionPicker from "../../components/RegionPicker";
import NotificationPanel from "../../components/NotificationPanel";

const categoryTiles = [
  { name: "Paints", bg: "#EDE7F6", img: "https://images.unsplash.com/photo-1562259949-e8e7689d7828?auto=format&fit=crop&w=500&q=80" },
  { name: "Electronics", bg: "#F1F5F9", img: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=500&q=80" },
  { name: "Furniture", bg: "#E3F2FD", img: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=500&q=80" },
  { name: "Hardware", bg: "#FFF3E0", img: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=500&q=80" },
  { name: "Plumbing", bg: "#EFF6FF", img: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=500&q=80" },
];

const brands = [
  { name: "UltraTech", category: "Cement", short: "UltraTech", icon: "🏗️", color: "#F59E0B" },
  { name: "Asian Paints", category: "Paints", short: "Asian Paints", icon: "🎨", color: "#1E5FD9" },
  { name: "Tata Tiscon", category: "Steel 550D", short: "Tata Tiscon", icon: "⚙️", color: "#0F172A" },
  { name: "Ambuja", category: "Waterproof", short: "Ambuja", icon: "🛡️", color: "#16A34A" },
  { name: "Astral Pipes", category: "Plumbing", short: "Astral", icon: "🚰", color: "#0EA5E9" },
  { name: "Finolex", category: "Electrical", short: "Finolex", icon: "⚡", color: "#DC2626" },
  { name: "Berger", category: "Coatings", short: "Berger", icon: "🖌️", color: "#9333EA" },
  { name: "Havells", category: "Switches", short: "Havells", icon: "💡", color: "#2563EB" },
  { name: "Kajaria", category: "Ceramics", short: "Kajaria", icon: "🧱", color: "#D97706" },
];

const services = [
  { title: "Site Visit", sub: "Professional Inspection", icon: "👷" },
  { title: "Web Development", sub: "Get your business online", icon: "💻" },
];

const banners = [
  {
    tag: "BUILD YOUR DREAM SPACE",
    title: ["Quality Products.", "Best Prices.", "Reliable Service."],
    img: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=600&q=80",
  },
  {
    tag: "NEW ARRIVALS",
    title: ["Modern Furniture.", "Timeless Design.", "Shop the Collection."],
    img: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=600&q=80",
  },
  {
    tag: "LIMITED TIME",
    title: ["Power Tools.", "Trusted Brands.", "Up to 30% Off."],
    img: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=600&q=80",
  },
];

// Main Customer Homepage Component — Live DB deals, category tiles, brand selection, aur structural skeleton loading
export default function Home() {
  const { user } = useAuth();
  const { addItem, count } = useCart();
  const { products = [], masterProducts = [], productsLoading } = useAdmin();
  const navigate = useNavigate();

  // Supabase DB se Live Approved Vendor Products aur Master Catalog items combine karein (Strictly no seed 390 price fallbacks)
  const liveVendorApproved = products.filter(
    (p) => p.approvalStatus === "APPROVED" || p.approvalStatus === undefined || p.isActive === true
  );

  const liveDisplayProducts = liveVendorApproved;

  const [slide, setSlide] = useState(0);
  const [justAddedId, setJustAddedId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (e) => {
    e.preventDefault();
    navigate(searchQuery ? `/search?q=${encodeURIComponent(searchQuery)}` : "/search");
  };

  useEffect(() => {
    const id = setInterval(() => {
      setSlide((s) => (s + 1) % banners.length);
    }, 4000);
    return () => clearInterval(id);
  }, []);

  const handleAddToCart = (p) => {
    addItem(
      {
        id: p.id,
        name: p.name,
        price: p.price || p.suggestedPrice,
        brand: p.brand,
        img: p.imageUrl,
        vendorName: p.vendorName || "Master Catalog",
      },
      1
    );
    setJustAddedId(p.id);
    setTimeout(() => setJustAddedId(null), 1500);
  };

  return (
    <div className="min-h-screen bg-surface pb-24 sm:pb-0 font-sans">
      {/* Desktop header */}
      <div className="hidden lg:block">
        <Navbar />
      </div>

      {/* Mobile header */}
      <div className="lg:hidden">
        <div className="relative bg-navy-900 pt-4 pb-14 px-4 ">
          <div className="flex items-center justify-end gap-4">
            <Link to="/cart" className="relative text-white">
              <CartIcon />
              {count > 0 && (
                <span className="absolute -top-1.5 -right-2 h-4 w-4 rounded-full bg-brand-500 text-white text-[10px] flex items-center justify-center font-bold">
                  {count}
                </span>
              )}
            </Link>
            <NotificationPanel className="relative text-white" />
          </div>
        </div>

        {/* White header card */}
        <div className="max-w-6xl mx-auto px-8 -mt-12 relative z-10">
          <div className="relative">
            <div className="bg-white rounded-2xl shadow-lg px-4 py-4 flex flex-col items-left text-left">
              <div className="flex items-center gap-1.5">
                <span className="text-lg">🏗️</span>
                <span className="font-extrabold text-navy-900 text-lg">
                  Build <span className="text-brand-500">City</span>
                </span>
              </div>
              <RegionPicker
                trigger={(r) => (
                  <span className="flex items-center gap-1 text-xs text-slate-500 mt-1">
                    <PinIcon />
                    {r.name}, {r.state === "Uttar Pradesh" ? "UP" : r.state}
                    <ChevronIcon />
                  </span>
                )}
              />
            </div>
          </div>

          {/* Search bar */}
          <form onSubmit={handleSearch} className="flex items-center gap-2 mt-3">
            <div className="flex-1 flex items-center gap-2 rounded-xl border border-slate-200 bg-white shadow-md px-3.5 py-3">
              <SearchIcon />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                type="text"
                placeholder="Search for products, brands, services..."
                className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
              />
            </div>
            <button
              type="button"
              className="h-[46px] w-[46px] shrink-0 flex items-center justify-center rounded-xl border border-slate-200 bg-white shadow-md text-slate-500"
            >
              <ScanIcon />
            </button>
          </form>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 pt-5 space-y-8">
        {/* Hero banner */}
        <div className="relative overflow-hidden rounded-2xl bg-navy-900 h-44 sm:h-56">
          {banners.map((b, i) => (
            <div
              key={i}
              className="absolute inset-0 transition-opacity duration-700 flex"
              style={{ opacity: slide === i ? 1 : 0, pointerEvents: slide === i ? "auto" : "none" }}
            >
              <div className="flex-[1.4] flex flex-col justify-center px-6 py-5 relative z-10">
                <span className="text-warning text-[10px] font-bold tracking-wide mb-1.5">
                  {b.tag}
                </span>
                <h1 className="text-white text-xl sm:text-2xl font-extrabold leading-tight mb-3">
                  {b.title.map((line, idx) => (
                    <span key={idx}>
                      {line}
                      {idx < b.title.length - 1 && <br />}
                    </span>
                  ))}
                </h1>
              </div>
              <div className="flex-1 relative hidden sm:block">
                <img src={b.img} alt="Banner" className="w-full h-full object-cover" />
              </div>
            </div>
          ))}

          <div className="absolute bottom-3 left-6 flex gap-1.5 z-20">
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

        {/* Category Tiles */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base sm:text-lg font-black text-navy-900">Popular Categories</h2>
            <Link to="/categories" className="text-xs font-bold text-brand-600 hover:underline">
              All Categories →
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {categoryTiles.map((c) => (
              <Link
                key={c.name}
                to={`/categories?cat=${encodeURIComponent(c.name)}`}
                className="rounded-2xl p-3 flex flex-col justify-between h-28 border border-slate-200/80 shadow-2xs hover:shadow-md transition-all group"
                style={{ backgroundColor: c.bg }}
              >
                <span className="text-xs font-extrabold text-navy-900">{c.name}</span>
                <img src={c.img} alt={c.name} className="w-12 h-12 object-cover rounded-lg self-end group-hover:scale-105 transition-transform" />
              </Link>
            ))}
          </div>
        </section>

        {/* Top Brands Grid */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base sm:text-lg font-black text-navy-900">Top Brands</h2>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-9 gap-2.5">
            {brands.map((b) => (
              <Link
                key={b.name}
                to={`/categories?cat=${encodeURIComponent(b.category)}`}
                className="bg-white border border-slate-200 rounded-xl p-2.5 flex flex-col items-center text-center shadow-2xs hover:border-brand-500 hover:shadow-xs transition-all group"
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-base mb-1.5 shadow-2xs"
                  style={{ backgroundColor: b.color + "15", color: b.color }}
                >
                  {b.icon}
                </div>
                <span className="text-xs font-bold text-navy-900 leading-tight group-hover:text-brand-600 transition-colors">
                  {b.name}
                </span>
                <span className="text-[9px] font-semibold text-slate-400 mt-0.5">
                  {b.category}
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* DEALS OF THE WEEK & LIVE ADMIN/DR/VENDOR PRODUCTS (MAX 5-6 FEATURED ITEMS) */}
        <section className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2.5">
            <div>
              <h2 className="text-base sm:text-lg font-black text-navy-900 flex items-center gap-2">
                <span>⚡ Deals Of The Week</span>
                <span className="bg-warning text-navy-900 font-extrabold text-[10px] px-2 py-0.5 rounded-full">
                  Top 5 Deals
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                5-6 featured construction products at our lowest ever wholesale prices.
              </p>
            </div>
            <Link to="/categories" className="text-xs font-bold text-brand-600 hover:underline shrink-0">
              View All →
            </Link>
          </div>

          {productsLoading ? (
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 sm:grid sm:grid-cols-5 sm:gap-3 animate-pulse">
              {[1, 2, 3, 4, 5].map((n) => (
                <div
                  key={n}
                  className="bg-white rounded-xl border border-slate-200 p-3 w-44 sm:w-auto shrink-0 flex flex-col justify-between shadow-2xs"
                >
                  <div>
                    <div className="relative h-28 rounded-lg overflow-hidden bg-slate-200 mb-2 border border-slate-100 flex items-center justify-center">
                      <span className="absolute top-1 left-1 bg-amber-200/80 text-amber-800 text-[9px] font-extrabold px-1.5 py-0.5 rounded shadow-2xs">
                        Material
                      </span>
                    </div>

                    <div className="h-2 bg-slate-200 rounded w-20 mb-1.5" />
                    <div className="h-2.5 bg-green-100 rounded w-28 mb-1.5" />
                    <div className="h-2 bg-slate-200 rounded w-24 mb-1" />
                    <div className="h-3 bg-slate-200 rounded w-full mb-1" />
                    <div className="h-3 bg-slate-200 rounded w-3/4 mb-2" />
                  </div>

                  <div>
                    <div className="flex items-baseline justify-between mb-2">
                      <div className="h-4 bg-slate-200 rounded w-12" />
                      <div className="h-2 bg-slate-200 rounded w-8" />
                    </div>
                    <div className="w-full h-7 bg-amber-300/80 rounded-lg flex items-center justify-center font-extrabold text-xs text-navy-900 shadow-2xs">
                      + ADD
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : liveDisplayProducts.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs font-extrabold bg-slate-50 rounded-xl border border-slate-200">
              📦 No live vendor deals available in this region yet.
            </div>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 sm:grid sm:grid-cols-5 sm:gap-3">
              {liveDisplayProducts.slice(0, 5).map((p, i) => (
                <div
                  key={p.id || i}
                  className="bg-white rounded-xl border border-slate-200 p-3 w-44 sm:w-auto shrink-0 flex flex-col justify-between hover:shadow-md hover:border-brand-300 transition-all"
                >
                  <div>
                    <div className="relative h-28 rounded-lg overflow-hidden bg-slate-100 mb-2 border border-slate-100">
                      <span className="absolute top-1 left-1 bg-warning text-navy-900 text-[9px] font-extrabold px-1.5 py-0.5 rounded shadow-xs">
                        {p.categoryName || "Material"}
                      </span>
                      <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" loading="lazy" />
                    </div>

                    <div className="flex items-center gap-1 text-[9px] text-slate-500 mb-1">
                      <ClockIcon /> 60 Mins &nbsp;·&nbsp; Pay on Delivery
                    </div>
                    <span className="inline-block w-fit bg-green-50 text-green-700 text-[8px] font-semibold px-1.5 py-0.5 rounded mb-1.5">
                      Free Delivery above ₹1000
                    </span>

                    <p className="text-[9px] font-extrabold text-brand-600 truncate mb-0.5">
                      🏬 {p.vendorName || p.addedBy || "District Catalog"}
                    </p>

                    <p className="text-[11px] font-bold text-navy-900 leading-tight mb-1.5 line-clamp-2 min-h-[32px]">
                      {p.name}
                    </p>
                  </div>

                  <div>
                    <div className="flex items-baseline justify-between mb-2">
                      <span className="text-sm font-black text-navy-900">
                        ₹{p.price || p.suggestedPrice}
                      </span>
                      <span className="text-[9px] text-slate-400">per {p.unit || "unit"}</span>
                    </div>

                    <button
                      onClick={() => handleAddToCart(p)}
                      className={`w-full text-xs font-bold rounded-lg py-1.5 transition-colors shadow-2xs cursor-pointer ${
                        justAddedId === p.id
                          ? "bg-success text-white"
                          : "bg-warning text-navy-900 hover:bg-amber-400"
                      }`}
                    >
                      {justAddedId === p.id ? "Added ✓" : "+ ADD"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Popular services */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-navy-900">Popular Services</h2>
            <Link to="/categories" className="text-xs font-medium text-brand-500">See all</Link>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {services.map((s) => (
              <div
                key={s.title}
                className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col justify-between h-28"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{s.icon}</span>
                    <span className="text-xs font-bold text-navy-900">{s.title}</span>
                  </div>
                  <p className="text-[10px] text-slate-500">{s.sub}</p>
                </div>
                <button className="h-6 w-6 rounded-full bg-brand-500 text-white flex items-center justify-center text-xs self-end">
                  →
                </button>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

function ClockIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </svg>
  );
}
function PinIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}
function ChevronIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 7V5a2 2 0 0 1 2-2h2" />
      <path d="M17 3h2a2 2 0 0 1 2 2v2" />
      <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
      <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
    </svg>
  );
}
function CartIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="8" cy="21" r="1" />
      <circle cx="19" cy="21" r="1" />
      <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
    </svg>
  );
}