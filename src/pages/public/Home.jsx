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
  {
    name: "Paints",
    tag: "Coatings & Finishes",
    bg: "#FDEAE8",
    img: "/categories/paints.png",
  },
  {
    name: "Steel",
    tag: "TMT & Angles",
    bg: "#F0F4F8",
    img: "/categories/steel.png",
  },
  {
    name: "Cement",
    tag: "OPC & PPC Bags",
    bg: "#F8FAFC",
    img: "/categories/cement.png",
  },
  {
    name: "Rebars",
    tag: "TMT Fe550D",
    bg: "#F1F5F9",
    img: "/categories/rebars.png",
  },
  {
    name: "Crushed Stone",
    tag: "Gitti & Aggregate",
    bg: "#F8FAFC",
    img: "/categories/crushed_stone.png",
  },
];

const brandItems = [
  {
    name: "Asian Paints",
    category: "Paints",
    bgColor: "#FFFFFF",
    renderLogo: () => (
      <div className="flex flex-col items-center justify-center">
        <div className="flex items-center text-lg font-black tracking-tighter leading-none">
          <span className="text-[#9333EA]">a</span>
          <span className="text-[#DC2626]">p</span>
        </div>
        <span className="text-[6.5px] font-extrabold text-[#DC2626] tracking-tight leading-none mt-0.5">
          asianpaints
        </span>
      </div>
    ),
  },
  {
    name: "Somany",
    category: "Tiles",
    bgColor: "#DC2626",
    renderLogo: () => (
      <div className="flex flex-col items-center justify-center text-white">
        <span className="font-black text-[12px] tracking-tighter leading-none">SOMANY</span>
        <span className="text-[5px] font-extrabold tracking-widest leading-none mt-0.5 opacity-95">
          TILES | BATH
        </span>
      </div>
    ),
  },
  {
    name: "Johnson",
    category: "Bathware",
    bgColor: "#FFFFFF",
    renderLogo: () => (
      <div className="flex flex-col items-center justify-center">
        <div className="flex items-center gap-1">
          <div className="w-2.5 h-2.5 bg-[#DC2626] rounded-xs flex items-center justify-center">
            <div className="w-1 h-1 bg-white" />
          </div>
          <span className="font-black text-[9.5px] text-navy-950 tracking-tight leading-none">JOHNSON</span>
        </div>
        <span className="text-[5.5px] font-extrabold text-[#DC2626] tracking-wider leading-none mt-0.5 uppercase">
          BATHWARE
        </span>
      </div>
    ),
  },
  {
    name: "Cera",
    category: "Sanitary",
    bgColor: "#FFFFFF",
    renderLogo: () => (
      <div className="flex flex-col items-center justify-center">
        <span className="font-black text-sm text-[#0284C7] tracking-widest leading-none">
          CERA
        </span>
        <span className="text-[5.5px] font-bold text-slate-400 tracking-tight leading-none mt-0.5">
          Sanitaryware
        </span>
      </div>
    ),
  },
  {
    name: "Kajaria",
    category: "Ceramics",
    bgColor: "#034EA2",
    renderLogo: () => (
      <div className="flex flex-col items-center justify-center text-white">
        <span className="font-black text-[13px] tracking-tight italic leading-none font-serif">
          Kajaria
        </span>
        <span className="text-[5.5px] font-extrabold tracking-widest leading-none mt-0.5 opacity-90">
          TILES
        </span>
      </div>
    ),
  },
  {
    name: "UltraTech",
    category: "Cement",
    bgColor: "#F59E0B",
    renderLogo: () => (
      <div className="flex flex-col items-center justify-center text-navy-950">
        <div className="w-3.5 h-2.5 bg-[#DC2626] flex items-center justify-center rounded-2xs mb-0.5 shadow-2xs">
          <div className="w-1.5 h-1.5 bg-[#FBBF24] rotate-45" />
        </div>
        <span className="font-black text-[8.5px] tracking-tighter leading-none text-navy-950">
          UltraTech
        </span>
        <span className="text-[5px] font-extrabold text-navy-900 tracking-tight leading-none mt-0.5">
          CEMENT
        </span>
      </div>
    ),
  },
  {
    name: "Tata Tiscon",
    category: "Steel",
    bgColor: "#FFFFFF",
    renderLogo: () => (
      <div className="flex flex-col items-center justify-center">
        <span className="font-black text-[8.5px] text-[#0369A1] tracking-widest leading-none">
          TATA
        </span>
        <span className="font-black text-[9.5px] text-[#DC2626] tracking-tighter leading-none mt-0.5">
          TISCON
        </span>
        <span className="text-[5px] font-bold text-slate-400 tracking-tighter leading-none mt-0.5">
          550D
        </span>
      </div>
    ),
  },
];

const bannerSlides = [
  {
    tag: "BUILD YOUR DREAM SPACE",
    line1: "Quality Products.",
    line2: "Best Prices.",
    line3: "Reliable Service.",
    img: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=1200&q=80",
  },
  {
    tag: "DIRECT FROM SUPPLIERS",
    line1: "Wholesale Rates.",
    line2: "Zero Middlemen.",
    line3: "Direct Delivery.",
    img: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80",
  },
  {
    tag: "100% CERTIFIED MATERIALS",
    line1: "Lab Tested.",
    line2: "Site Delivered.",
    line3: "Pay On Delivery.",
    img: "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&q=80",
  },
];

export default function Home() {
  const { user } = useAuth();
  const { addItem, count } = useCart();
  const { region } = useRegion();
  const { products = [], productsLoading } = useAdmin();
  const navigate = useNavigate();

  const [slide, setSlide] = useState(0);
  const [justAddedId, setJustAddedId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  const liveVendorApproved = products
    .filter((p) => {
      if (p.approvalStatus !== "APPROVED" && p.approvalStatus !== undefined) return false;
      const activeRegName = (region?.name || "Varanasi").toLowerCase().trim();
      const pRegName = (p.regionName || p.districtName || p.vendor?.region?.name || "varanasi").toLowerCase().trim();
      return pRegName === activeRegName || pRegName.includes(activeRegName) || activeRegName.includes(pRegName);
    })
    .map((p) => {
      const isSusp = p.isVendorSuspended || p.vendor?.status === "SUSPENDED" || p.isActive === false;
      return {
        ...p,
        isVendorSuspended: Boolean(isSusp),
        price: (p.price !== undefined && p.price !== null && !isNaN(Number(p.price)))
          ? Math.round(Number(p.price))
          : Math.round(Number(p.suggestedPrice || 100) * (region?.priceFactor || 1)),
      };
    });

  const liveDisplayProducts = useMemo(() => {
    if (!liveVendorApproved || liveVendorApproved.length === 0) return [];
    return [...liveVendorApproved];
  }, [liveVendorApproved]);

  useEffect(() => {
    const timer = setInterval(() => {
      setSlide((s) => (s + 1) % bannerSlides.length);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    navigate(searchQuery ? `/search?q=${encodeURIComponent(searchQuery)}` : "/search");
  };

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
    <div className="min-h-screen bg-[#F8FAFC] pb-28 font-sans">
      {/* 🖥️ Desktop Navbar */}
      <div className="hidden lg:block">
        <Navbar />
      </div>

      {/* 📱 Mobile Top Header (Clean Simple Standard White Header) */}
      <div className="lg:hidden bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        {/* Top Action Row (Logo & Location on Left, Notification & Cart on Right) */}
        <div className="px-4 py-3 flex items-center justify-between">
          {/* Left: Brand Logo & Live Location */}
          <div className="flex items-center gap-2">
            <Link to="/" className="flex items-center gap-1.5 active:scale-95 transition-transform">
              <span className="text-2xl leading-none">🏗️</span>
              <div className="font-black text-navy-950 text-base leading-none tracking-tight">
                Build <span className="text-brand-500">City</span>
              </div>
            </Link>

            <div className="h-3.5 w-px bg-slate-200 mx-0.5" />

            <RegionPicker
              trigger={(r) => (
                <div className="flex items-center gap-1 cursor-pointer group">
                  <span className="text-slate-600 text-[11px] leading-none">📍</span>
                  <span className="font-bold text-slate-700 text-xs leading-none tracking-tight truncate max-w-[110px] group-hover:text-brand-600 transition-colors">
                    {r?.name || "Varanasi"}
                  </span>
                  <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-slate-500 group-hover:text-black transition-transform">
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </div>
              )}
            />
          </div>

          {/* Right: Notification & Cart */}
          <div className="flex items-center gap-3">
            <NotificationPanel className="relative text-navy-900 hover:text-brand-600 transition-colors cursor-pointer" />
            <Link
              to="/cart"
              className="relative text-navy-900 hover:text-brand-600 transition-colors p-1"
              title="Cart"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="8" cy="21" r="1" />
                <circle cx="19" cy="21" r="1" />
                <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
              </svg>
              {count > 0 && (
                <span className="absolute -top-1 -right-1.5 h-4.5 w-4.5 rounded-full bg-brand-500 text-white text-[10px] font-black flex items-center justify-center shadow-xs">
                  {count}
                </span>
              )}
            </Link>
          </div>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="px-4 pb-3">
          <div className="w-full flex items-center gap-2.5 bg-slate-100 rounded-xl px-3.5 py-2.5 border border-slate-200 focus-within:border-brand-500 focus-within:bg-white transition-all shadow-2xs h-10.5">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2.2">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search cement, steel, paints, pipes..."
              className="w-full bg-transparent text-xs text-navy-900 font-medium outline-none placeholder:text-slate-400"
            />
            {searchQuery && (
              <button type="button" onClick={() => setSearchQuery("")} className="text-slate-400 hover:text-slate-600 text-xs p-0.5">
                ✕
              </button>
            )}
          </div>
        </form>
      </div>

      <main className="max-w-6xl mx-auto px-4 pt-4 sm:pt-6 space-y-6">
        {/* 🌟 1. HERO CAROUSEL BANNER WITH INTEGRATED TRUST BAR */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#07132B] via-[#0A1A3A] to-[#0D224D] shadow-lg border border-slate-800/40 flex flex-col">
          {/* Banner Main Carousel Area */}
          <div className="relative min-h-[175px] sm:min-h-[220px] flex items-stretch">
            {bannerSlides.map((b, i) => (
              <div
                key={i}
                className="absolute inset-0 transition-opacity duration-700 flex items-stretch"
                style={{ opacity: slide === i ? 1 : 0, pointerEvents: slide === i ? "auto" : "none" }}
              >
                {/* Left Content Area */}
                <div className="w-7/12 sm:w-1/2 flex flex-col justify-center px-4 sm:px-7 py-4 z-10">
                  <span className="text-[9px] sm:text-[10px] font-black text-[#FBBF24] tracking-wider uppercase mb-1">
                    {b.tag}
                  </span>
                  <h2 className="text-white text-sm sm:text-xl font-extrabold leading-snug tracking-tight mb-3">
                    {b.line1} <br />
                    {b.line2} <br />
                    {b.line3}
                  </h2>
                  <Link
                    to="/categories"
                    className="bg-white hover:bg-slate-100 text-navy-950 font-extrabold text-[10px] sm:text-xs px-3.5 py-1.5 rounded-full shadow-md active:scale-95 transition-all w-fit flex items-center gap-1"
                  >
                    Shop Now →
                  </Link>
                </div>

                {/* Right Image Area */}
                <div className="w-5/12 sm:w-1/2 h-full relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-[#07132B] via-[#07132B]/30 to-transparent z-10 pointer-events-none" />
                  <img
                    src={b.img}
                    alt="Hero Banner"
                    className="w-full h-full object-cover object-center transform scale-105"
                    onError={(e) => {
                      e.target.src = "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=1200&q=80";
                    }}
                  />
                </div>
              </div>
            ))}

            {/* Dots Indicator */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 sm:left-7 sm:translate-x-0 flex items-center gap-1.5 z-20">
              {bannerSlides.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setSlide(i)}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    slide === i ? "w-5 bg-[#38BDF8]" : "w-2 bg-white/40"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* 🏷️ 3. TOP BRANDS CIRCULAR SHOWCASE */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-extrabold text-navy-900 tracking-tight">Top Brands</h3>
            <Link to="/categories" className="text-xs font-bold text-[#0284C7] hover:underline">
              See all
            </Link>
          </div>

          <div className="flex lg:grid lg:grid-cols-7 gap-3 sm:gap-4 overflow-x-auto lg:overflow-visible pb-2 no-scrollbar scroll-smooth">
            {brandItems.map((b) => (
              <Link
                key={b.name}
                to={`/categories?cat=${encodeURIComponent(b.category)}`}
                className="flex flex-col items-center text-center shrink-0 lg:shrink group active:scale-95 transition-all"
              >
                <div
                  className="w-14 h-14 sm:w-16 sm:h-16 lg:w-20 lg:h-20 rounded-full flex items-center justify-center p-2 shadow-xs border border-slate-200/90 group-hover:shadow-md group-hover:scale-105 transition-all overflow-hidden relative select-none"
                  style={{ backgroundColor: b.bgColor }}
                >
                  {b.renderLogo()}
                </div>
                <span className="text-[10px] sm:text-[11px] lg:text-xs font-bold text-navy-900 mt-1.5 group-hover:text-[#0284C7] transition-colors truncate max-w-full">
                  {b.name}
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* 🛍️ 4. SHOP BY CATEGORY */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base sm:text-lg font-extrabold text-navy-900 tracking-tight">Shop by Category</h3>
            <Link to="/categories" className="text-xs font-bold text-[#0284C7] hover:underline">
              See all
            </Link>
          </div>

          <div className="flex sm:grid sm:grid-cols-5 gap-2.5 sm:gap-3.5 overflow-x-auto no-scrollbar pb-1.5 pt-0.5">
            {categoryTiles.map((c) => (
              <Link
                key={c.name}
                to={`/categories?cat=${encodeURIComponent(c.name)}`}
                className="w-[92px] sm:w-auto shrink-0 sm:shrink rounded-[22px] p-2 sm:p-2.5 flex flex-col items-center justify-between shadow-2xs hover:shadow-md border border-slate-200/60 hover:border-slate-300 active:scale-95 transition-all duration-200 group aspect-[3/4.4] min-h-[145px] sm:min-h-[175px] overflow-hidden"
                style={{ backgroundColor: c.bg }}
              >
                <div className="w-full flex-1 flex items-center justify-center overflow-hidden rounded-xl">
                  <img
                    src={c.img}
                    alt={c.name}
                    className="w-full h-full object-contain group-hover:scale-108 transition-transform duration-300"
                  />
                </div>
                <span className="text-[11px] sm:text-xs font-bold text-navy-900 group-hover:text-brand-600 transition-colors text-center truncate max-w-full leading-tight pt-1">
                  {c.name}
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* 🏗️ 5. BEST OFFERS (3 PER ROW ON MOBILE, 4 PER ROW ON DESKTOP) */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-extrabold text-navy-900 tracking-tight">Best Offers in {region?.name || "Jaunpur"}</h3>
              <span className="bg-emerald-50 text-emerald-700 text-[10px] font-black px-2 py-0.5 rounded-full border border-emerald-200">
                {liveDisplayProducts.length} Live
              </span>
            </div>
            <Link to="/categories" className="text-xs font-bold text-[#0284C7] hover:underline">
              See all
            </Link>
          </div>

          {productsLoading ? (
            <div className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-3.5 animate-pulse">
              {[1, 2, 3, 4].map((n) => (
                <div key={n} className="bg-white rounded-2xl p-3 border border-slate-200 h-48" />
              ))}
            </div>
          ) : liveDisplayProducts.length === 0 ? (
            <div className="bg-white rounded-2xl p-6 text-center text-xs font-bold text-slate-500 border border-slate-200">
              📦 No products listed in {region?.name || "your area"} right now.
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
              {liveDisplayProducts.slice(0, 8).map((p) => {
                const price = Number(p.price || 100);
                let mrp = Number(p.mrp || p.masterProduct?.suggestedPrice || 0);
                if (mrp <= price) {
                  mrp = Math.round(price * 1.2);
                }
                const discountPct = Math.max(5, Math.round(((mrp - price) / mrp) * 100));

                return (
                  <div
                    key={p.id}
                    className="bg-white rounded-2xl border border-slate-200/80 p-2 sm:p-2.5 lg:p-3 flex flex-col justify-between shadow-2xs hover:shadow-md hover:border-slate-300 active:scale-[0.98] transition-all group"
                  >
                    <Link to={`/product/${p.id}`} className="block">
                      <div className="relative aspect-square rounded-xl overflow-hidden bg-slate-50 mb-1.5 border border-slate-100 flex items-center justify-center p-1">
                        <span className="absolute top-1.5 left-1.5 z-10 bg-amber-100 text-amber-800 font-black text-[8px] sm:text-[9px] px-1.5 py-0.5 rounded border border-amber-200/60 shadow-2xs">
                          {discountPct}% OFF
                        </span>
                        <img
                          src={p.imageUrl || "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=400&q=80"}
                          alt={p.name}
                          className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />
                      </div>

                      <p className="text-[8.5px] sm:text-[9px] font-bold text-slate-400 uppercase tracking-tight truncate">
                        {p.brand || "Standard"}
                      </p>
                      <h4 className="text-[11px] sm:text-xs font-extrabold text-navy-950 leading-snug line-clamp-1 group-hover:text-brand-600 transition-colors">
                        {p.name}
                      </h4>
                    </Link>

                    <div className="mt-1.5 pt-1.5 border-t border-slate-100 flex flex-col sm:flex-row sm:items-end justify-between gap-1">
                      <div>
                        <div className="flex items-baseline gap-1">
                          <span className="text-xs sm:text-sm font-black text-navy-950">₹{price.toLocaleString("en-IN")}</span>
                          {mrp > price && (
                            <span className="text-[8.5px] sm:text-[9px] text-slate-400 line-through">₹{mrp.toLocaleString("en-IN")}</span>
                          )}
                        </div>
                        <span className="text-[8px] sm:text-[8.5px] text-slate-400 leading-none block">per {p.unit || "unit"}</span>
                      </div>

                      <button
                        onClick={() => handleAddToCart(p)}
                        className={`text-[10px] sm:text-xs font-bold px-2 py-1 rounded-lg transition-all shadow-2xs active:scale-95 cursor-pointer mt-1 sm:mt-0 ${
                          justAddedId === p.id
                            ? "bg-emerald-600 text-white"
                            : "bg-[#0A192F] text-white hover:bg-navy-900"
                        }`}
                      >
                        {justAddedId === p.id ? "✓" : "+ Add"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* 🔨 6. POPULAR SERVICES SECTION */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base sm:text-lg font-extrabold text-navy-900 tracking-tight">Popular Services</h3>
            <Link to="/categories" className="text-xs font-bold text-[#0284C7] hover:underline">
              See all
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {/* Service 1: Site Visit */}
            <div className="bg-[#EFF6FF] border border-[#DBEAFE] rounded-2xl p-3.5 sm:p-4 flex items-center justify-between shadow-2xs hover:shadow-md transition-all relative overflow-hidden group">
              <div className="flex flex-col justify-between h-full z-10">
                <div>
                  <div className="w-8 h-8 rounded-xl bg-[#2563EB] text-white flex items-center justify-center mb-2 shadow-xs">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                  </div>
                  <h4 className="text-xs sm:text-sm font-black text-navy-900 leading-tight">Site Visit</h4>
                  <p className="text-[10px] sm:text-xs text-slate-500 font-medium mt-0.5">Professional Inspection</p>
                </div>
                <Link
                  to="/categories"
                  className="mt-3 w-7 h-7 rounded-full bg-[#2563EB] text-white flex items-center justify-center text-xs active:scale-90 transition-transform shadow-xs"
                >
                  →
                </Link>
              </div>

              {/* Visual Badge */}
              <div className="w-16 h-18 sm:w-20 sm:h-22 rounded-2xl bg-gradient-to-br from-[#3B82F6] to-[#1D4ED8] text-white flex flex-col items-center justify-center shadow-md p-2 shrink-0 group-hover:scale-105 transition-transform select-none">
                <span className="text-2xl sm:text-3xl mb-0.5">👷‍♂️</span>
                <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-wider text-blue-100 text-center leading-none">Inspection</span>
              </div>
            </div>

            {/* Service 2: Web Development / Tech Solutions */}
            <div className="bg-[#F8FAFC] border border-slate-200 rounded-2xl p-3.5 sm:p-4 flex items-center justify-between shadow-2xs hover:shadow-md transition-all relative overflow-hidden group">
              <div className="flex flex-col justify-between h-full z-10">
                <div>
                  <div className="w-8 h-8 rounded-xl bg-[#0F172A] text-[#38BDF8] flex items-center justify-center mb-2 shadow-xs">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <rect x="2" y="3" width="20" height="14" rx="2" />
                      <line x1="8" y1="21" x2="16" y2="21" />
                      <line x1="12" y1="17" x2="12" y2="21" />
                    </svg>
                  </div>
                  <h4 className="text-xs sm:text-sm font-black text-navy-900 leading-tight">Web Development</h4>
                  <p className="text-[10px] sm:text-xs text-slate-500 font-medium mt-0.5">Get your business online</p>
                </div>
                <Link
                  to="/categories"
                  className="mt-3 w-7 h-7 rounded-full bg-[#0F172A] text-white flex items-center justify-center text-xs active:scale-90 transition-transform shadow-xs"
                >
                  →
                </Link>
              </div>

              {/* Visual Badge */}
              <div className="w-16 h-18 sm:w-20 sm:h-22 rounded-2xl bg-gradient-to-br from-[#0F172A] to-[#1E293B] text-white flex flex-col items-center justify-center shadow-md p-2 shrink-0 group-hover:scale-105 transition-transform select-none border border-slate-700/50">
                <span className="text-2xl sm:text-3xl mb-0.5">💻</span>
                <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-wider text-[#38BDF8] text-center leading-none">Solutions</span>
              </div>
            </div>
          </div>
        </section>

        {/* 🎁 7. EXCLUSIVE DEALS BANNER CARD */}
        <section className="bg-gradient-to-r from-[#07132B] via-[#0A1A3A] to-[#0D224D] rounded-2xl p-4 text-white shadow-lg border border-slate-800/40 relative overflow-hidden flex items-center justify-between">
          <div className="max-w-[55%] z-10">
            <h3 className="text-sm sm:text-base font-black leading-tight">Exclusive Deals</h3>
            <p className="text-[10px] sm:text-xs text-slate-300 font-medium mt-1 mb-3">
              Up to 20% OFF on selected products
            </p>
            <Link
              to="/categories"
              className="bg-white hover:bg-slate-100 text-navy-950 font-extrabold text-[10px] sm:text-xs px-3.5 py-1.5 rounded-full shadow-md active:scale-95 transition-all inline-flex items-center gap-1"
            >
              Explore Offers →
            </Link>
          </div>

          {/* Right Product Collage & Discount Burst */}
          <div className="flex items-center gap-2 relative">
            <img
              src="https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=200&q=80"
              alt="Deals"
              className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-xl shadow-md border border-white/20"
            />
            {/* Gold Stamp */}
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#F59E0B] to-[#D97706] text-navy-950 flex flex-col items-center justify-center font-black text-[8px] leading-tight shadow-lg border border-amber-300 shrink-0">
              <span>UP TO</span>
              <span className="text-[11px] leading-none">20%</span>
              <span>OFF</span>
            </div>
          </div>
        </section>
      </main>

      {/* 🟢 8. FLOATING WHATSAPP & PHONE CALL ACTION BUTTONS */}
      <div className="fixed bottom-20 right-4 z-40 flex flex-col gap-2.5">
        {/* WhatsApp Button */}
        <a
          href="https://wa.me/919161660447?text=Hello%20BuildCity%20Team,%20I%20have%20an%20inquiry%20regarding%20construction%20materials"
          target="_blank"
          rel="noopener noreferrer"
          className="w-12 h-12 rounded-full bg-[#25D366] hover:bg-[#20bd5a] text-white flex items-center justify-center shadow-lg active:scale-90 transition-all"
          title="Chat on WhatsApp"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.312.045-.634.055-.992-.061-.59-.191-1.353-.615-2.227-1.488-.874-.873-1.297-1.637-1.488-2.227-.116-.358-.106-.68-.061-.992.05-.333.419-1.026.824-1.17.135-.048.281-.03.394.045.114.075.764 1.846.764 1.846.06.146.028.314-.077.419l-.382.382c.285.503.744.962 1.247 1.247l.382-.382c.105-.105.273-.137.419-.077 0 0 1.771.65 1.846.764.075.113.093.259.046.394z" />
          </svg>
        </a>

        {/* Call Button */}
        <a
          href="tel:+919161660447"
          className="w-12 h-12 rounded-full bg-[#0284C7] hover:bg-[#0369A1] text-white flex items-center justify-center shadow-lg active:scale-90 transition-all"
          title="Call BuildCity Support"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
          </svg>
        </a>
      </div>
    </div>
  );
}