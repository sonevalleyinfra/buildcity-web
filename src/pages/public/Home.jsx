import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useCart } from "../../context/CartContext";
import Navbar from "../../components/Navbar";
import RegionPicker from "../../components/RegionPicker";
import NotificationPanel from "../../components/NotificationPanel"; 
// Category Tiles array  Homepage par category grid ke liye High-Res images ke saath
const categoryTiles = [
  { name: "Paints", bg: "#EDE7F6", img: "https://images.unsplash.com/photo-1562259949-e8e7689d7828?auto=format&fit=crop&w=500&q=80" },
  { name: "Electronics", bg: "#F1F5F9", img: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=500&q=80" },
  { name: "Furniture", bg: "#E3F2FD", img: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=500&q=80" },
  { name: "Hardware", bg: "#FFF3E0", img: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=500&q=80" },
  { name: "Plumbing", bg: "#EFF6FF", img: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=500&q=80" },
];

// Top Brands array - District brand partners grid me rendering ke liye (UltraTech, Asian Paints, Tata Tiscon, etc.)
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

// Building Material Categories array - Bulk pricing tags ke saath
const categories = [
  { name: "Cement", img: "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=300&q=80", tag: "Bulk Prices" },
  { name: "Tiling", img: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=300&q=80", tag: "Bulk Prices" },
  { name: "Painting", img: "https://images.unsplash.com/photo-1562259949-e8e7689d7828?auto=format&fit=crop&w=300&q=80" },
  { name: "Water Proofing", img: "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=300&q=80" },
  { name: "Plywood, MDF & HDHMR", img: "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=300&q=80" },
  { name: "Adhesives", img: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=300&q=80" },
  { name: "Wires, MCB & Boards", img: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=300&q=80" },
  { name: "Kitchen Sinks & Faucets", img: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=300&q=80" },
  { name: "Sanitary & Bath Fittings", img: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=300&q=80" },
  { name: "Switches & Sockets", img: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=300&q=80" },
  { name: "Hardware & Handles", img: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=300&q=80" },
  { name: "Lighting", img: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=300&q=80" },
];

// Features - Fast Delivery, Verified Brands, Best Prices, Support
const features = [
  { title: "Fast Delivery", sub: "Across Varanasi", icon: "🚚", bg: "#DBEAFE" },
  { title: "Verified", sub: "Trusted Brands", icon: "✅", bg: "#DCFCE7" },
  { title: "Best Price", sub: "Guaranteed", icon: "🏷️", bg: "#FEF3C7" },
  { title: "Support", sub: "24/7 Help", icon: "🎧", bg: "#EDE9FE" },
];

const services = [
  { title: "Site Visit", sub: "Professional Inspection", icon: "👷" },
  { title: "Web Development", sub: "Get your business online", icon: "💻" },
];

// Hero Banners list - 4s timer slider ke saath change hone wale banners
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

// Deals of the week products - Discount tags & cashback offers
const deals = [
  {
    id: "deal-1",
    name: "UltraTech Super PPC Cement, 50 Kg Bag",
    brand: "UltraTech",
    img: "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=300&q=80",
    mrp: 390,
    price: 360,
    discount: "8% OFF",
    cashback: "₹1000 Cashback",
  },
  {
    id: "deal-2",
    name: "Asian Paints Royale Luxury Emulsion, 20L",
    brand: "Asian Paints",
    img: "https://images.unsplash.com/photo-1562259949-e8e7689d7828?auto=format&fit=crop&w=300&q=80",
    mrp: 3250,
    price: 2950,
    discount: "9% OFF",
    cashback: "₹1000 Cashback",
  },
  {
    id: "deal-3",
    name: "Tata Tiscon 550D TMT Steel Rebar, 12mm",
    brand: "Tata Tiscon",
    img: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=300&q=80",
    mrp: 720,
    price: 650,
    discount: "10% OFF",
    cashback: "₹1000 Cashback",
  },
  {
    id: "deal-4",
    name: "Tractor Uno Acrylic Distemper Paint, White, 20kg",
    brand: "Tractor",
    img: "https://images.unsplash.com/photo-1562259949-e8e7689d7828?auto=format&fit=crop&w=300&q=80",
    mrp: 1580,
    price: 980,
    discount: "38% OFF",
    cashback: "₹1000 Cashback",
  },
  {
    id: "deal-5",
    name: "Astral CPVC Pipe 1 Inch, Heavy Duty",
    brand: "Astral",
    img: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=300&q=80",
    mrp: 450,
    price: 320,
    discount: "28% OFF",
    cashback: "₹1000 Cashback",
  },
];

// Main Homepage component
export default function Home() {
  const { user } = useAuth();
  const { addItem, count } = useCart();
  const navigate = useNavigate();
  const [slide, setSlide] = useState(0);
  const [qty, setQty] = useState(deals.map(() => 1));
  const [justAdded, setJustAdded] = useState(deals.map(() => false));
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

  const changeQty = (i, delta) => {
    setQty((q) => q.map((v, idx) => (idx === i ? Math.max(1, v + delta) : v)));
  };

  const handleAdd = (i, deal) => {
    addItem(deal, qty[i]);
    setJustAdded((prev) => prev.map((v, idx) => (idx === i ? true : v)));
    setTimeout(() => {
      setJustAdded((prev) => prev.map((v, idx) => (idx === i ? false : v)));
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-surface pb-24 sm:pb-0">
      {/* Desktop header - shared Navbar (logo, nav links, search, cart) */}
      <div className="hidden lg:block">
        <Navbar />
      </div>

      {/* Mobile header - navy hero + floating search card */}
      <div className="lg:hidden">
        <div className="relative bg-navy-900 pt-4 pb-14 px-4 ">
          <div className="flex items-center justify-end gap-4">
            <Link to="/cart" className="relative text-white">
              <CartIcon />
              {count > 0 && (
                <span className="absolute -top-1.5 -right-2 h-4 w-4 rounded-full bg-brand-500 text-white text-[10px] flex items-center justify-center">
                  {count}
                </span>
              )}
            </Link>
         <NotificationPanel className="relative text-white" />
          </div>
        </div>

        {/* White card */}
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

          {/* Search bar + scan */}
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
        {/* Hero banner Hai */}
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
                <button className="bg-white text-navy-900 text-xs font-semibold rounded-xl px-4 py-2 flex items-center gap-1.5 w-fit">
                  Shop Now <span>→</span>
                </button>
              </div>
              <div className="flex-1 relative overflow-hidden">
                <img
                  src={b.img}
                  alt={b.title[0]}
                  className="absolute inset-0 w-full h-full object-cover"
                  style={{ clipPath: "polygon(20% 0, 100% 0, 100% 100%, 0% 100%)" }}
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

        {/* Feature strip */}
        <div className="grid grid-cols-4 gap-2 sm:gap-4 bg-white rounded-xl border border-slate-200 p-3">
          {features.map((f) => (
            <div key={f.title} className="flex flex-col items-center text-center gap-1.5">
              <div
                className="h-10 w-10 rounded-full flex items-center justify-center text-lg"
                style={{ backgroundColor: f.bg }}
              >
                {f.icon}
              </div>
              <div className="text-[11px] sm:text-xs font-semibold text-navy-900 leading-tight">
                {f.title}
              </div>
              <div className="text-[9px] sm:text-[10px] text-slate-500 leading-tight">
                {f.sub}
              </div>
            </div>
          ))}
        </div>

 {/* Shop by category - colored bg with image overlay */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-navy-900">Shop by Category</h2>
           <Link to="/categories" className="text-xs font-medium text-brand-500">See all</Link>
          </div>
          <div className="grid grid-cols-5 gap-2 sm:gap-3">
            {categoryTiles.map((c) => (
              <Link
                key={c.name}
                to={`/category/${c.name.toLowerCase()}`}
                className="flex flex-col items-center gap-1.5"
              >
                <div
                  className="w-full aspect-square rounded-xl overflow-hidden flex items-center justify-center"
                  style={{ backgroundColor: c.bg }}
                >
                  <img
                    src={c.img}
                    alt={c.name}
                    className="w-full h-full object-cover mix-blend-multiply opacity-90"
                    loading="lazy"
                  />
                </div>
                <span className="text-[11px] font-medium text-navy-900">{c.name}</span>
              </Link>
            ))}
          </div>
        </section>
        {/* Top Brands - Responsive Grid */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-base font-bold text-navy-900">Top Brands</h2>
              <p className="text-[11px] text-slate-500">Official manufacturers & verified district distributors</p>
            </div>
            <Link to="/categories" className="text-xs font-semibold text-brand-500 hover:underline">
              See all →
            </Link>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-9 gap-2 sm:gap-3">
            {brands.map((b) => (
              <Link
                key={b.name}
                to={`/search?q=${encodeURIComponent(b.name)}`}
                className="bg-white rounded-2xl border border-slate-200 p-2.5 flex flex-col items-center justify-center text-center hover:border-brand-500 hover:shadow-md transition-all group"
              >
                <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-base mb-1.5 group-hover:scale-110 transition-transform">
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

        {/* Deals of the Week */}
        <section>
          <h2 className="text-lg font-bold text-navy-900">Deals Of The Week</h2>
          <p className="text-xs text-slate-500 mb-3">5 products at our lowest ever price</p>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 sm:grid sm:grid-cols-5 sm:gap-3">
            {deals.map((d, i) => (
              <div
                key={d.name}
                className="bg-white rounded-xl border border-slate-200 p-3 w-40 sm:w-auto shrink-0 flex flex-col"
              >
                <div className="relative h-24 rounded-lg overflow-hidden bg-slate-100 mb-2">
                  {d.discount && (
                    <span className="absolute top-1 left-1 bg-warning text-navy-900 text-[9px] font-bold px-1.5 py-0.5 rounded">
                      {d.discount}
                    </span>
                  )}
                  <img src={d.img} alt={d.name} className="w-full h-full object-cover" loading="lazy" />
                </div>

                <div className="flex items-center gap-1 text-[9px] text-slate-500 mb-1">
                  <ClockIcon /> 60 Mins &nbsp;·&nbsp; Pay on Delivery
                </div>
                <span className="inline-block w-fit bg-green-50 text-green-700 text-[8px] font-semibold px-1.5 py-0.5 rounded mb-1.5">
                  Free Delivery above ₹1000
                </span>

                <p className="text-[11px] font-medium text-navy-900 leading-tight mb-1.5 line-clamp-2 flex-1">
                  {d.name}
                </p>

                <div className="flex items-baseline gap-1.5 mb-1">
                  {d.mrp !== d.price && (
                    <span className="text-[10px] text-slate-400 line-through">₹{d.mrp}</span>
                  )}
                  <span className="text-sm font-bold text-navy-900">₹{d.price}</span>
                </div>
                <span className="text-[8px] text-amber-700 font-medium mb-2">{d.cashback}</span>

                <div className="flex items-center gap-2">
                  <div className="flex items-center border border-slate-200 rounded-lg">
                    <button
                      onClick={() => changeQty(i, -1)}
                      className="px-2 py-1 text-slate-500 text-sm"
                    >
                      −
                    </button>
                    <span className="px-2 text-xs font-medium">{qty[i]}</span>
                    <button
                      onClick={() => changeQty(i, 1)}
                      className="px-2 py-1 text-slate-500 text-sm"
                    >
                      +
                    </button>
                  </div>
                  <button
                    onClick={() => handleAdd(i, d)}
                    className={`flex-1 text-xs font-bold rounded-lg py-1.5 ${
                      justAdded[i]
                        ? "bg-success text-white"
                        : "bg-warning text-navy-900"
                    }`}
                  >
                    {justAdded[i] ? "Added ✓" : "ADD"}
                  </button>
                </div>
              </div>
            ))}
          </div>
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

        {/* Exclusive deals */}
        <div className="rounded-2xl bg-navy-900 px-6 py-6 flex items-center justify-between overflow-hidden relative">
          <div className="relative z-10">
            <h3 className="text-white font-bold text-base mb-1">Exclusive Deals</h3>
            <p className="text-white/60 text-xs mb-3">Up to 20% OFF on selected products</p>
            <button className="bg-white text-navy-900 text-xs font-semibold rounded-lg px-4 py-2">
              Explore Offers →
            </button>
          </div>
          <span className="relative z-10 text-warning font-extrabold text-lg bg-white/10 rounded-full h-16 w-16 flex items-center justify-center text-center leading-none shrink-0">
            UP TO
            <br />
            20% OFF
          </span>
        </div>
      </main>

    </div>
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
function ClockIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </svg>
  );
}