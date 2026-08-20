import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useCart } from "../../context/CartContext";
import { useAdmin } from "../../context/AdminContext";
import { useRegion } from "../../context/RegionContext";
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
  { title: "Building Materials", sub: "Bricks, Cement, TMT Bars", icon: "🧱" },
  { title: "Plumbing & Electrical", sub: "Pipes, Wires, Switches", icon: "⚡" },
];

const banners = [
  {
    tag: "BUILD YOUR DREAM SPACE",
    title: ["Quality Supplies,", "Delivered Fast"],
    img: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=1200&q=80",
  },
  {
    tag: "WHOLESALE PRICES",
    title: ["Direct From", "Verified Suppliers"],
    img: "https://images.unsplash.com/photo-1541888946425-d0fbb186a5b2?auto=format&fit=crop&w=1200&q=80",
  },
];

// Customer Homepage - products update by selected region
export default function Home() {
  const { user } = useAuth();
  const { addItem, count } = useCart();
  const { region } = useRegion();
  const { products = [], masterProducts = [], productsLoading } = useAdmin();
  const navigate = useNavigate();

  const liveVendorApproved = products
    .filter((p) => {
      // Require Admin/DR approval before displaying on storefront
      if (p.approvalStatus !== "APPROVED" || p.isActive !== true) return false;

      const activeRegName = (region?.name || "Varanasi").toLowerCase().trim();
      const pRegName = (p.regionName || p.districtName || p.vendor?.region?.name || "varanasi").toLowerCase().trim();

      const matches = pRegName === activeRegName || pRegName.includes(activeRegName) || activeRegName.includes(pRegName);
      return matches;
    })
    .map((p) => ({
      ...p,
      price: (p.price !== undefined && p.price !== null && !isNaN(Number(p.price)))
        ? Math.round(Number(p.price))
        : Math.round(Number(p.suggestedPrice || 100) * (region?.priceFactor || 1)),
    }));

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
        vendorId: p.vendorId,
        vendorName: p.vendorName || "District Vendor",
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
            <div className="flex-1 flex items-center gap-2 rounded-xl border border-slate-200 bg-white focus-within:ring-4 focus-within:ring-brand-500/10 focus-within:border-brand-500 shadow-md px-3.5 py-3 transition-all duration-200">
              <SearchIcon />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                type="text"
                placeholder="Search for products, brands, services..."
                className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400 font-medium text-navy-900"
              />
            </div>
            <button
              type="button"
              className="h-[46px] w-[46px] shrink-0 flex items-center justify-center rounded-xl border border-slate-200 bg-white shadow-md text-slate-500 active:scale-[0.95] transition-all duration-200 cursor-pointer"
            >
              <ScanIcon />
            </button>
          </form>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 pt-5 space-y-8 relative">
        {/* Ambient subtle background section glow */}
        <div className="absolute top-10 left-1/2 -translate-x-1/2 w-full max-w-4xl h-72 bg-brand-500/5 blur-3xl pointer-events-none rounded-full" />

        {/* Hero banner */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-navy-950 via-navy-900 to-slate-900 h-48 sm:h-60 shadow-md border border-navy-800/60">
          {banners.map((b, i) => (
            <div
              key={i}
              className="absolute inset-0 transition-opacity duration-700 flex items-center"
              style={{ opacity: slide === i ? 1 : 0, pointerEvents: slide === i ? "auto" : "none" }}
            >
              <div className="flex-[1.4] flex flex-col justify-center px-6 sm:px-8 py-4 sm:py-5 relative z-10 pb-8 sm:pb-5">
                <span className="inline-flex items-center gap-1.5 bg-amber-400/20 border border-amber-400/40 text-amber-300 text-[10px] font-extrabold px-3 py-0.5 rounded-full w-fit mb-2 backdrop-blur-md uppercase tracking-wider shadow-2xs">
                  ✨ {b.tag}
                </span>
                <h1 className="text-white text-lg sm:text-3xl font-black leading-tight tracking-tight mb-2.5 sm:mb-3">
                  {b.title.map((line, idx) => (
                    <span key={idx}>
                      {line}
                      {idx < b.title.length - 1 && <br />}
                    </span>
                  ))}
                </h1>
                <Link
                  to="/categories"
                  className="inline-flex items-center gap-1.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-navy-950 font-black text-xs px-3.5 py-2 rounded-xl shadow-xs hover:shadow-md active:scale-[0.98] transition-all duration-200 cursor-pointer w-fit z-20"
                >
                  Shop Now ➔
                </Link>
              </div>
              <div className="flex-1 h-full relative hidden sm:block">
                <div className="absolute inset-0 bg-gradient-to-r from-navy-950 via-navy-950/70 to-transparent z-10" />
                <img src={b.img} alt="Banner" className="w-full h-full object-cover" />
              </div>
            </div>
          ))}

          {/* Slider Dot Indicators — Shifted to Right side so it never overlaps Shop Now button */}
          <div className="absolute bottom-3.5 right-6 sm:right-8 flex gap-1.5 z-30">
            {banners.map((_, i) => (
              <button
                key={i}
                onClick={() => setSlide(i)}
                className={`h-2 rounded-full transition-all cursor-pointer ${
                  slide === i ? "w-6 bg-amber-400" : "w-2 bg-white/30 hover:bg-white/50"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Visual Trust Badges Bar */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-white border border-slate-200/90 rounded-2xl p-3.5 shadow-xs relative z-10">
          <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50/70 border border-slate-100/80 hover:bg-white hover:border-slate-200 transition-all duration-200">
            <span className="text-xl shrink-0">✨</span>
            <div>
              <h4 className="text-xs font-black text-navy-900 tracking-tight">100% Certified Stock</h4>
              <p className="text-[10px] text-slate-500 font-medium">Direct DR & Lab Verified</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50/70 border border-slate-100/80 hover:bg-white hover:border-slate-200 transition-all duration-200">
            <span className="text-xl shrink-0">🛡️</span>
            <div>
              <h4 className="text-xs font-black text-navy-900 tracking-tight">Buyer Protection</h4>
              <p className="text-[10px] text-slate-500 font-medium">Pay on Site Delivery</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50/70 border border-slate-100/80 hover:bg-white hover:border-slate-200 transition-all duration-200">
            <span className="text-xl shrink-0">🚚</span>
            <div>
              <h4 className="text-xs font-black text-navy-900 tracking-tight">Fast Site Delivery</h4>
              <p className="text-[10px] text-slate-500 font-medium">Across UP District Network</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50/70 border border-slate-100/80 hover:bg-white hover:border-slate-200 transition-all duration-200">
            <span className="text-xl shrink-0">💰</span>
            <div>
              <h4 className="text-xs font-black text-navy-900 tracking-tight">Wholesale Pricing</h4>
              <p className="text-[10px] text-slate-500 font-medium">Direct Supplier Rates</p>
            </div>
          </div>
        </section>

        {/* Category Tiles */}
        <section className="relative z-10">
          <div className="flex items-center justify-between mb-3.5">
            <h2 className="text-base sm:text-lg font-black text-navy-900 tracking-tight">Popular Categories</h2>
            <Link to="/categories" className="text-xs font-bold text-brand-600 hover:text-brand-700 active:scale-[0.98] transition-all duration-200">
              All Categories →
            </Link>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 pt-1 -mx-1 px-1 no-scrollbar scroll-smooth sm:grid sm:grid-cols-5 sm:gap-3">
            {categoryTiles.map((c) => (
              <Link
                key={c.name}
                to={`/categories?cat=${encodeURIComponent(c.name)}`}
                className="rounded-2xl p-3.5 flex flex-col justify-between h-30 w-36 sm:w-auto shrink-0 border border-slate-200/80 shadow-2xs hover:shadow-md hover:border-brand-300 hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 group relative overflow-hidden"
                style={{ backgroundColor: c.bg }}
              >
                <span className="text-xs font-extrabold text-navy-900 tracking-tight">{c.name}</span>
                <img src={c.img} alt={c.name} className="w-13 h-13 object-cover rounded-xl self-end group-hover:scale-105 transition-transform duration-300 shadow-2xs" />
              </Link>
            ))}
          </div>
        </section>

        {/* Top Brands Grid */}
        <section className="relative z-10">
          <div className="flex items-center justify-between mb-3.5">
            <h2 className="text-base sm:text-lg font-black text-navy-900 tracking-tight">Top Brands</h2>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-9 gap-2.5">
            {brands.map((b) => (
              <Link
                key={b.name}
                to={`/categories?cat=${encodeURIComponent(b.category)}`}
                className="bg-white border border-slate-200/90 rounded-xl p-2.5 flex flex-col items-center text-center shadow-2xs hover:border-brand-400 hover:shadow-xs active:scale-[0.98] transition-all duration-200 group"
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-base mb-1.5 shadow-2xs group-hover:scale-105 transition-transform duration-200"
                  style={{ backgroundColor: b.color + "15", color: b.color }}
                >
                  {b.icon}
                </div>
                <span className="text-xs font-bold text-navy-900 leading-tight tracking-tight group-hover:text-brand-600 transition-colors">
                  {b.name}
                </span>
                <span className="text-[9px] font-semibold text-slate-400 mt-0.5">
                  {b.category}
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* DEALS OF THE WEEK & LIVE ADMIN/DR/VENDOR PRODUCTS */}
        <section className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs relative z-10">
          <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base sm:text-lg font-black text-navy-900 flex items-center gap-2 tracking-tight">
                <span>⚡ Deals Of The Week</span>
                <span className="bg-warning/20 border border-amber-400/40 text-amber-800 font-extrabold text-[10px] px-2.5 py-0.5 rounded-full uppercase tracking-wide">
                  Top 5 Deals
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                All certified construction products from database for {region?.name || "your region"}.
              </p>
            </div>
            <Link to="/categories" className="text-xs font-bold text-brand-600 hover:text-brand-700 active:scale-[0.98] transition-all duration-200 shrink-0">
              View All ({liveDisplayProducts.length}) →
            </Link>
          </div>

          {productsLoading ? (
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 animate-pulse">
              {[1, 2, 3, 4, 5].map((n) => (
                <div
                  key={n}
                  className="bg-white rounded-xl border border-slate-200 p-3 w-44 shrink-0 flex flex-col justify-between shadow-2xs"
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
            <div className="flex gap-3.5 overflow-x-auto pb-3 pt-1 -mx-1 px-1 no-scrollbar scroll-smooth">
              {liveDisplayProducts.map((p, i) => (
                <div
                  key={p.id || i}
                  className="bg-white rounded-xl border border-slate-200/90 p-3 w-48 sm:w-56 shrink-0 flex flex-col justify-between hover:shadow-md hover:border-brand-300 hover:-translate-y-0.5 active:scale-[0.99] transition-all duration-200 group"
                >
                  <div>
                    <div className="relative h-28 rounded-lg overflow-hidden bg-slate-100 mb-2 border border-slate-100">
                      <span className="absolute top-1.5 left-1.5 bg-amber-400 text-navy-950 text-[9px] font-black px-2 py-0.5 rounded shadow-2xs">
                        {p.categoryName || "Material"}
                      </span>
                      <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                    </div>

                    <div className="flex items-center gap-1 text-[9px] font-medium text-slate-500 mb-1">
                      <ClockIcon /> Express Delivery &nbsp;·&nbsp; Pay on Delivery
                    </div>
                    <span className="inline-block w-fit bg-emerald-50 text-emerald-700 text-[8px] font-bold px-1.5 py-0.5 rounded mb-1.5 border border-emerald-200/60">
                      Free Delivery above ₹1000
                    </span>

                    <p className="text-[9px] font-black text-brand-600 truncate mb-0.5">
                      🏬 {p.vendorName || p.addedBy || "District Catalog"}
                    </p>

                    <p className="text-[11px] font-bold text-navy-900 leading-tight mb-1.5 line-clamp-2 min-h-[32px] tracking-tight">
                      {p.name}
                    </p>
                  </div>

                  <div>
                    <div className="flex items-baseline justify-between mb-2">
                      <span className="text-base font-black text-navy-900 tracking-tight tabular-nums">
                        ₹{p.price || p.suggestedPrice}
                      </span>
                      <span className="text-[9px] font-medium text-slate-400">per {p.unit || "unit"}</span>
                    </div>

                    <button
                      onClick={() => handleAddToCart(p)}
                      className={`w-full text-xs font-black rounded-lg py-1.5 transition-all duration-200 active:scale-[0.98] shadow-2xs cursor-pointer ${
                        justAddedId === p.id
                          ? "bg-emerald-600 text-white shadow-xs"
                          : "bg-amber-400 text-navy-950 hover:bg-amber-500 hover:shadow-sm"
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
          <div className="flex items-center justify-between mb-3.5">
            <h2 className="text-base font-bold text-navy-900 tracking-tight">Popular Services</h2>
            <Link to="/categories" className="text-xs font-bold text-brand-600 hover:text-brand-700 active:scale-[0.98] transition-all duration-200">See all</Link>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {services.map((s) => (
              <div
                key={s.title}
                className="bg-white rounded-2xl border border-slate-200/90 p-4 flex flex-col justify-between h-28 shadow-2xs hover:shadow-md hover:border-brand-300 active:scale-[0.98] transition-all duration-200 group"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg group-hover:scale-110 transition-transform duration-200">{s.icon}</span>
                    <span className="text-xs font-extrabold text-navy-900 tracking-tight">{s.title}</span>
                  </div>
                  <p className="text-[10px] font-medium text-slate-500">{s.sub}</p>
                </div>
                <button className="h-6 w-6 rounded-full bg-brand-500 text-white flex items-center justify-center text-xs self-end group-hover:bg-brand-600 active:scale-[0.95] transition-all duration-200 shadow-2xs cursor-pointer">
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