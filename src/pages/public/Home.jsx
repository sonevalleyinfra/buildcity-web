import { useState, useEffect, useMemo, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useCart } from "../../context/CartContext";
import { useAdmin } from "../../context/AdminContext";
import { useRegion } from "../../context/RegionContext";
import Navbar from "../../components/Navbar";
import RegionPicker from "../../components/RegionPicker";
import NotificationPanel from "../../components/NotificationPanel";

const categoryTiles = [
  { name: "Paints", tag: "Coatings & Finishes", bg: "#F5F3FF", img: "https://images.unsplash.com/photo-1562259949-e8e7689d7828?auto=format&fit=crop&w=600&q=80" },
  { name: "Electronics", tag: "Wiring & Lighting", bg: "#F1F5F9", img: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=600&q=80" },
  { name: "Furniture", tag: "Office & Fixtures", bg: "#EFF6FF", img: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=600&q=80" },
  { name: "Hardware", tag: "Tools & Fasteners", bg: "#FFF7ED", img: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=600&q=80" },
  { name: "Plumbing", tag: "Pipes & Fittings", bg: "#ECFDF5", img: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80" },
  { name: "Cement", tag: "Structural Grade", bg: "#FEF3C7", img: "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=600&q=80" },
];

const brands = [
  { name: "UltraTech", category: "Cement", short: "UltraTech", logo: "https://www.google.com/s2/favicons?domain=ultratechcement.com&sz=128", initials: "UT", color: "#D97706", bg: "#FEF3C7" },
  { name: "Asian Paints", category: "Paints", short: "Asian Paints", logo: "https://www.google.com/s2/favicons?domain=asianpaints.com&sz=128", initials: "AP", color: "#DC2626", bg: "#FEE2E2" },
  { name: "Tata Tiscon", category: "Steel 550D", short: "Tata Tiscon", logo: "https://www.google.com/s2/favicons?domain=tatatiscon.co.in&sz=128", initials: "TT", color: "#0284C7", bg: "#E0F2FE" },
  { name: "Ambuja", category: "Waterproof", short: "Ambuja", logo: "https://www.google.com/s2/favicons?domain=ambujacement.com&sz=128", initials: "AC", color: "#16A34A", bg: "#DCFCE7" },
  { name: "Astral Pipes", category: "Plumbing", short: "Astral", logo: "https://www.google.com/s2/favicons?domain=astralpipes.com&sz=128", initials: "AP", color: "#0EA5E9", bg: "#E0F2FE" },
  { name: "Finolex", category: "Electrical", short: "Finolex", logo: "https://www.google.com/s2/favicons?domain=finolex.com&sz=128", initials: "FC", color: "#E11D48", bg: "#FFE4E6" },
  { name: "Berger", category: "Coatings", short: "Berger", logo: "https://www.google.com/s2/favicons?domain=bergerpaints.com&sz=128", initials: "BP", color: "#9333EA", bg: "#F3E8FF" },
  { name: "Havells", category: "Switches", short: "Havells", logo: "https://www.google.com/s2/favicons?domain=havells.com&sz=128", initials: "HI", color: "#2563EB", bg: "#DBEAFE" },
  { name: "Kajaria", category: "Ceramics", short: "Kajaria", logo: "https://www.google.com/s2/favicons?domain=kajariaceramics.com&sz=128", initials: "KC", color: "#B45309", bg: "#FEF3C7" },
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
    img: "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=1200&q=80",
  },
  {
    tag: "100% CERTIFIED MATERIALS",
    title: ["Lab Tested", "Steel, Cement & Fittings"],
    img: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=1200&q=80",
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
      if (p.approvalStatus !== "APPROVED") return false;

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

  const liveDisplayProducts = useMemo(() => {
    if (!liveVendorApproved || liveVendorApproved.length === 0) return [];
    const todayStr = new Date().toISOString().split("T")[0];
    let seed = 0;
    for (let i = 0; i < todayStr.length; i++) {
      seed = (seed << 5) - seed + todayStr.charCodeAt(i);
      seed |= 0;
    }
    const pseudoRandom = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };

    const copy = [...liveVendorApproved];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(pseudoRandom() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }, [liveVendorApproved]);

  const [slide, setSlide] = useState(0);
  const [justAddedId, setJustAddedId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState("grid");

  const [maxGridItems, setMaxGridItems] = useState(() =>
    typeof window !== "undefined" && window.innerWidth < 640 ? 6 : 10
  );

  useEffect(() => {
    const handleResize = () => {
      setMaxGridItems(window.innerWidth < 640 ? 6 : 10);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const dealsScrollRef = useRef(null);

  const scrollDeals = (direction) => {
    if (dealsScrollRef.current) {
      const scrollAmount = direction === "left" ? -320 : 320;
      dealsScrollRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

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
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-navy-950 via-navy-900 to-slate-900 h-38 sm:h-48 md:h-52 shadow-md border border-navy-800/60">
          {banners.map((b, i) => (
            <div
              key={i}
              className="absolute inset-0 transition-opacity duration-700 flex items-stretch"
              style={{ opacity: slide === i ? 1 : 0, pointerEvents: slide === i ? "auto" : "none" }}
            >
              {/* Left 50% Content */}
              <div className="w-1/2 sm:w-7/12 flex flex-col justify-center px-3.5 sm:px-6 py-3 relative z-10">
                <span className="inline-flex items-center gap-1 bg-amber-400/20 border border-amber-400/40 text-amber-300 text-[8px] sm:text-[10px] font-extrabold px-2 sm:px-2.5 py-0.5 rounded-full w-fit mb-1 backdrop-blur-md uppercase tracking-wider">
                  ✨ {b.tag}
                </span>
                <h1 className="text-white text-xs sm:text-lg md:text-xl font-black leading-tight tracking-tight mb-2">
                  {b.title.map((line, idx) => (
                    <span key={idx}>
                      {line}
                      {idx < b.title.length - 1 && <br />}
                    </span>
                  ))}
                </h1>
                <Link
                  to="/categories"
                  className="inline-flex items-center gap-1 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-navy-950 font-black text-[9px] sm:text-xs px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-lg shadow-xs active:scale-[0.98] transition-all cursor-pointer w-fit z-20"
                >
                  Shop Now ➔
                </Link>
              </div>

              {/* Right 50% Image — VISIBLE ON MOBILE & DESKTOP */}
              <div className="w-1/2 sm:w-5/12 h-full relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-navy-950 via-navy-950/20 to-transparent z-10 pointer-events-none" />
                <img
                  src={b.img}
                  alt="Banner"
                  className="w-full h-full object-cover object-center transform hover:scale-105 transition-transform duration-500"
                  onError={(e) => {
                    e.target.src = "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=1200&q=80";
                  }}
                />
              </div>
            </div>
          ))}

          {/* Slider Dot Indicators */}
          <div className="absolute bottom-3.5 right-4 sm:right-8 flex gap-1.5 z-30">
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

        {/* Category Tiles — 50-50 Split Cards */}
        <section className="relative z-10">
          <div className="flex items-center justify-between mb-3.5">
            <div>
              <h2 className="text-base sm:text-lg font-black text-navy-900 tracking-tight">Popular Categories</h2>
              <p className="text-[11px] text-slate-500 font-medium hidden sm:block">Explore certified building materials & supplies</p>
            </div>
            <Link to="/categories" className="text-xs font-bold text-brand-600 hover:text-brand-700 active:scale-[0.98] transition-all duration-200">
              All Categories →
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {categoryTiles.map((c) => (
              <Link
                key={c.name}
                to={`/categories?cat=${encodeURIComponent(c.name)}`}
                className="h-28 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-brand-300 active:scale-[0.98] transition-all duration-200 group overflow-hidden flex items-stretch bg-white"
              >
                {/* Left 50% Content */}
                <div className="w-1/2 p-3.5 flex flex-col justify-between h-full relative z-10" style={{ backgroundColor: c.bg + "60" }}>
                  <div>
                    <span className="text-[9px] font-extrabold uppercase tracking-wider text-brand-700 bg-white/80 border border-brand-200/60 px-2 py-0.5 rounded-md inline-block mb-1 shadow-2xs">
                      {c.tag || "Catalog"}
                    </span>
                    <h3 className="text-sm font-black text-navy-900 leading-tight group-hover:text-brand-600 transition-colors">
                      {c.name}
                    </h3>
                  </div>
                  <span className="text-[11px] font-extrabold text-brand-600 group-hover:translate-x-1 transition-transform flex items-center gap-1">
                    Explore ➔
                  </span>
                </div>

                {/* Right 50% Image */}
                <div className="w-1/2 h-full relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-slate-100/30 to-transparent z-10 pointer-events-none" />
                  <img
                    src={c.img}
                    alt={c.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
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
                className="bg-white border border-slate-200/90 rounded-2xl p-2.5 flex flex-col items-center text-center shadow-2xs hover:border-brand-400 hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 group"
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center p-1.5 mb-1.5 shadow-2xs border border-slate-100 group-hover:scale-105 transition-transform duration-200 overflow-hidden relative"
                  style={{ backgroundColor: b.bg }}
                >
                  <span
                    className="absolute inset-0 flex items-center justify-center font-black text-xs tracking-tight select-none"
                    style={{ color: b.color }}
                  >
                    {b.initials}
                  </span>
                  {b.logo && (
                    <img
                      src={b.logo}
                      alt={b.name}
                      className="w-7 h-7 object-contain relative z-10"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  )}
                </div>
                <span className="text-xs font-black text-navy-900 leading-tight tracking-tight group-hover:text-brand-600 transition-colors">
                  {b.name}
                </span>
                <span className="text-[9px] font-bold text-slate-400 mt-0.5">
                  {b.category}
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* 🏗️ 1. All Certified District Products (HIGH-END PREMIUM GRID) */}
        <section className="bg-white border border-slate-200/90 rounded-2xl p-3.5 sm:p-5 shadow-xs relative z-10 space-y-4 overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-2">
            <div>
              <h2 className="text-base sm:text-lg font-black text-navy-900 flex flex-wrap items-center gap-2 tracking-tight">
                <span>🏗️ All Certified District Products</span>
                <span className="bg-emerald-50 border border-emerald-200 text-emerald-700 font-extrabold text-[10px] px-2.5 py-0.5 rounded-full uppercase tracking-wide shrink-0 shadow-2xs">
                  Live Stock ({liveDisplayProducts.length})
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Explore all verified building and construction materials available for delivery in {region?.name || "your region"}.
              </p>
            </div>
            <Link to="/categories" className="text-xs font-extrabold text-brand-600 hover:text-brand-700 active:scale-[0.98] transition-all duration-200 shrink-0 self-start sm:self-auto bg-brand-50 px-3 py-1.5 rounded-xl border border-brand-100">
              Browse All Categories →
            </Link>
          </div>

          {liveDisplayProducts.length === 0 ? (
            <div className="py-10 text-center text-slate-500 text-xs font-extrabold bg-slate-50 rounded-xl border border-slate-200">
              📦 No vendor products listed for this region yet.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
              {liveDisplayProducts.slice(0, maxGridItems).map((p, i) => (
                <div
                  key={`grid-${p.id || i}`}
                  className="bg-gradient-to-b from-white to-slate-50/60 rounded-2xl border border-slate-200/90 p-3 sm:p-3.5 flex flex-col justify-between hover:shadow-xl hover:border-brand-400 hover:-translate-y-1 active:scale-[0.99] transition-all duration-300 group"
                >
                  <Link to={`/product/${p.id}`} className="block flex-1">
                    <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-slate-100 mb-2.5 border border-slate-100 group-hover:border-brand-200 shadow-2xs">
                      <span className="absolute top-2 left-2 z-10 bg-slate-900/85 backdrop-blur-md text-amber-400 text-[9px] font-black px-2 py-0.5 rounded-md shadow-sm uppercase tracking-wider">
                        {p.categoryName || "Material"}
                      </span>
                      <img
                        src={p.imageUrl || p.img || "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=500&q=80"}
                        alt={p.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                    </div>

                    <div className="flex items-center justify-between text-[10px] font-medium text-slate-500 mb-1 gap-1">
                      <span className="truncate text-slate-400 font-bold uppercase tracking-wider text-[9px]">{p.brand || "Generic"}</span>
                      <span className="text-brand-700 font-bold bg-brand-50/90 border border-brand-200/80 px-2 py-0.5 rounded-md truncate max-w-[110px] shadow-2xs text-[9px]">
                        🏪 {p.vendorName || p.addedBy || "Vendor"}
                      </span>
                    </div>

                    <p className="text-xs font-black text-navy-950 leading-snug mb-2 line-clamp-2 min-h-[32px] tracking-tight group-hover:text-brand-600 transition-colors">
                      {p.name}
                    </p>
                  </Link>

                  <div className="mt-1">
                    <div className="flex flex-col mb-2 min-h-[34px] justify-end">
                      <span className="text-sm sm:text-base font-black text-navy-950 tracking-tight tabular-nums leading-none">
                        ₹{(p.price || p.suggestedPrice || 0).toLocaleString("en-IN")}
                      </span>
                      <span className="text-[9px] font-extrabold text-slate-400 truncate mt-1">
                        per {p.unit || "unit"}
                      </span>
                    </div>

                    <button
                      onClick={() => handleAddToCart(p)}
                      className={`w-full text-xs font-black rounded-xl py-2 transition-all duration-200 active:scale-[0.97] shadow-xs cursor-pointer ${
                        justAddedId === p.id
                          ? "bg-emerald-600 text-white shadow-xs"
                          : "bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-navy-950 shadow-sm hover:shadow"
                      }`}
                    >
                      {justAddedId === p.id ? "Added ✓" : "+ Add to Cart"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ⚡ 2. DEALS OF THE WEEK (TOP 5 DEALS HORIZONTAL SLIDER BELOW DISTRICT PRODUCTS) */}
        <section className="bg-white border border-slate-200/90 rounded-2xl p-3.5 sm:p-4 shadow-xs relative z-10 overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 border-b border-slate-100 pb-2.5 gap-2">
            <div>
              <h2 className="text-sm sm:text-base font-black text-navy-900 flex flex-wrap items-center gap-1.5 tracking-tight">
                <span>⚡ Deals Of The Week</span>
                <span className="bg-warning/20 border border-amber-400/40 text-amber-800 font-extrabold text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wide shrink-0">
                  Top 5 Deals
                </span>
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                All certified construction products from database for {region?.name || "your region"}.
              </p>
            </div>
            <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-2xs">
                <button
                  type="button"
                  onClick={() => scrollDeals("left")}
                  className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-white hover:bg-brand-500 hover:text-white text-navy-900 font-black text-xs flex items-center justify-center shadow-2xs active:scale-95 transition-all cursor-pointer"
                  title="Scroll Left"
                >
                  ◀
                </button>
                <button
                  type="button"
                  onClick={() => scrollDeals("right")}
                  className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-white hover:bg-brand-500 hover:text-white text-navy-900 font-black text-xs flex items-center justify-center shadow-2xs active:scale-95 transition-all cursor-pointer"
                  title="Scroll Right"
                >
                  ▶
                </button>
              </div>
              <Link to="/categories" className="text-[11px] font-bold text-brand-600 hover:text-brand-700 active:scale-[0.98] transition-all duration-200 shrink-0">
                View All →
              </Link>
            </div>
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
            <div ref={dealsScrollRef} className="flex gap-3.5 overflow-x-auto pb-3 pt-1 -mx-1 px-1 no-scrollbar scroll-smooth">
              {liveDisplayProducts.slice(0, 5).map((p, i) => (
                <div
                  key={p.id || i}
                  className="bg-white rounded-xl border border-slate-200/90 p-3 w-48 sm:w-56 shrink-0 flex flex-col justify-between hover:shadow-md hover:border-brand-300 hover:-translate-y-0.5 active:scale-[0.99] transition-all duration-200 group"
                >
                  <Link to={`/product/${p.id}`} className="block flex-1">
                    <div className="relative h-28 rounded-lg overflow-hidden bg-slate-100 mb-2 border border-slate-100 group-hover:border-brand-300">
                      <span className="absolute top-1.5 left-1.5 z-10 bg-amber-400 text-navy-950 text-[9px] font-black px-2 py-0.5 rounded shadow-2xs">
                        {p.categoryName || "Material"}
                      </span>
                      {p.isVendorSuspended && (
                        <span className="absolute top-1.5 right-1.5 z-10 bg-rose-600 text-white text-[9px] font-black px-2 py-0.5 rounded shadow-2xs">
                          Unavailable
                        </span>
                      )}
                      <img
                        src={p.imageUrl || p.img || p.masterProduct?.imageUrl || "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=500&q=80"}
                        alt={p.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                        onError={(e) => {
                          e.target.src = "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=500&q=80";
                        }}
                      />
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

                    <p className="text-[11px] font-bold text-navy-900 leading-tight mb-1.5 line-clamp-2 min-h-[32px] tracking-tight group-hover:text-brand-600 transition-colors">
                      {p.name}
                    </p>
                  </Link>

                  <div>
                    <div className="flex flex-col mb-2 min-h-[34px] justify-end">
                      <span className="text-base font-black text-navy-900 tracking-tight tabular-nums leading-none">
                        ₹{(p.price || p.suggestedPrice || 0).toLocaleString("en-IN")}
                      </span>
                      <span className="text-[9px] font-extrabold text-slate-400 truncate mt-1">
                        per {p.unit || "unit"}
                      </span>
                    </div>

                    {p.isVendorSuspended ? (
                      <button
                        disabled
                        className="w-full text-xs font-black rounded-lg py-1.5 bg-slate-200 text-slate-500 cursor-not-allowed opacity-80 shadow-2xs"
                      >
                        Unavailable
                      </button>
                    ) : (
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
                    )}
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