import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useCart } from "../../context/CartContext";
import { useAdmin } from "../../context/AdminContext";
import { useRegion } from "../../context/RegionContext";
import Navbar from "../../components/Navbar";
import RegionPicker from "../../components/RegionPicker";
import NotificationPanel from "../../components/NotificationPanel";

const topPills = [
  { name: "All", isGrid: true },
  { name: "Cement", img: "/categories/cement.png" },
  { name: "Paints", img: "/categories/paints.png" },
  { name: "Steel", img: "/categories/steel.png" },
  { name: "Plumbing", img: "/categories/plumbing.png" },
  { name: "More", isDots: true },
];

const bannerSlides = [
  {
    tag: "BUILD YOUR DREAM SPACE",
    line1: "Quality Products.",
    line2: "Best Prices.",
    line3: "Reliable Service.",
    targetCat: "All",
    img: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=1200&q=80",
  },
  {
    tag: "DIRECT FROM SUPPLIERS",
    line1: "Wholesale Rates.",
    line2: "Zero Middlemen.",
    line3: "Direct Delivery.",
    targetCat: "Cement",
    img: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80",
  },
  {
    tag: "100% CERTIFIED MATERIALS",
    line1: "Lab Tested.",
    line2: "Site Delivered.",
    line3: "Pay On Delivery.",
    targetCat: "Steel",
    img: "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&q=80",
  },
  {
    tag: "LUXURY INTERIORS & PAINTS",
    line1: "Royale Emulsions.",
    line2: "Waterproof Coats.",
    line3: "Modern Finishes.",
    targetCat: "Paints",
    img: "https://images.unsplash.com/photo-1562259949-e8e7689d7828?auto=format&fit=crop&w=1200&q=80",
  },
];

const category8Grid = [
  { name: "Cement", countTag: "Cement", img: "/categories/cement.png" },
  { name: "Paints", countTag: "Paints", img: "/categories/paints.png" },
  { name: "Steel", countTag: "Steel", img: "/categories/steel.png" },
  { name: "Plumbing", countTag: "Plumbing", img: "/categories/plumbing.png" },
  { name: "Electrical", countTag: "Electrical", img: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=300&q=80" },
  { name: "Sanitary", countTag: "Sanitary", img: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=300&q=80" },
  { name: "Hardware", countTag: "Hardware", img: "/categories/rebars.png" },
  { name: "Tiles", countTag: "Tiles", img: "/categories/tiles.png" },
];

export default function Categories() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialCat = searchParams.get("cat") || "All";

  const { count, addItem } = useCart();
  const { products = [], productsLoading, categories = [] } = useAdmin();
  const { region } = useRegion();
  const [activePill, setActivePill] = useState(initialCat);
  const [searchQuery, setSearchQuery] = useState("");
  const [justAddedId, setJustAddedId] = useState(null);
  const [slide, setSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setSlide((s) => (s + 1) % 4);
    }, 4000);
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
        price: p.price !== undefined ? p.price : (p.suggestedPrice || 100),
        brand: p.brand,
        img: p.imageUrl || p.img,
        vendorId: p.vendorId,
        vendorName: p.vendorName || "District Vendor",
      },
      1
    );
    setJustAddedId(p.id);
    setTimeout(() => setJustAddedId(null), 1500);
  };

  // Real Database products filtered by district
  const districtProducts = useMemo(() => {
    const map = new Map();
    products.forEach((p) => {
      if (p.approvalStatus !== "APPROVED" || p.isActive !== true) return;

      const activeRegName = (region?.name || "Varanasi").toLowerCase().trim();
      const pRegName = (p.regionName || p.districtName || p.vendor?.region?.name || "varanasi").toLowerCase().trim();

      const matches = pRegName === activeRegName || pRegName.includes(activeRegName) || activeRegName.includes(pRegName);
      if (!matches) return;

      const key = `${(p.name || "").toLowerCase()}_${p.vendorId || ""}`;
      if (!map.has(key)) {
        map.set(key, {
          ...p,
          price: (p.price !== undefined && p.price !== null && !isNaN(Number(p.price)))
            ? Math.round(Number(p.price))
            : Math.round(Number(p.suggestedPrice || 100) * (region?.priceFactor || 1)),
        });
      }
    });
    return Array.from(map.values());
  }, [products, region]);

  // Strict Category Filter — Only show products matching selected category!
  const filteredCategoryProducts = useMemo(() => {
    if (!districtProducts || districtProducts.length === 0) return [];
    if (!activePill || activePill === "All" || activePill === "More") return districtProducts;

    const target = activePill.toLowerCase().trim();
    return districtProducts.filter((p) => {
      const cat = (p.categoryName || p.category || p.masterProduct?.category?.name || "").toLowerCase();
      const name = (p.name || "").toLowerCase();
      const brand = (p.brand || "").toLowerCase();

      if (target === "cement") {
        return cat.includes("cement") || name.includes("cement") || brand.includes("ultratech") || brand.includes("ambuja") || brand.includes("acc") || brand.includes("jk");
      }
      if (target === "paints" || target === "paint") {
        return cat.includes("paint") || name.includes("paint") || name.includes("royale") || name.includes("emulsion") || brand.includes("asian") || brand.includes("berger") || brand.includes("nerolac");
      }
      if (target === "steel" || target === "rebars") {
        return cat.includes("steel") || cat.includes("tmt") || cat.includes("rebar") || name.includes("steel") || name.includes("tmt") || name.includes("bar") || brand.includes("tata") || brand.includes("jsw") || brand.includes("jindal");
      }
      if (target === "plumbing") {
        return cat.includes("plumb") || cat.includes("pipe") || name.includes("pipe") || name.includes("tap") || name.includes("faucet") || brand.includes("astral") || brand.includes("supreme") || brand.includes("ashirvad");
      }
      if (target === "electrical") {
        return cat.includes("electr") || cat.includes("wire") || name.includes("wire") || name.includes("switch") || name.includes("bulb") || brand.includes("havells") || brand.includes("polycab");
      }
      if (target === "sanitary") {
        return cat.includes("sanitar") || cat.includes("bath") || name.includes("toilet") || name.includes("basin") || name.includes("sink") || brand.includes("cera") || brand.includes("jaquar") || brand.includes("hindware");
      }
      if (target === "hardware") {
        return cat.includes("hardware") || cat.includes("tool") || name.includes("drill") || name.includes("screw") || name.includes("lock") || name.includes("hammer") || brand.includes("bosch") || brand.includes("stanley");
      }
      if (target === "tiles") {
        return cat.includes("tile") || cat.includes("ceramic") || name.includes("tile") || brand.includes("kajaria") || brand.includes("somany") || brand.includes("johnson");
      }

      return cat.includes(target) || name.includes(target) || brand.includes(target);
    });
  }, [districtProducts, activePill]);

  // Dynamic counts for each of the 8 category cards from live database
  const dynamic8Cards = useMemo(() => {
    return category8Grid.map((c) => {
      const target = c.name.toLowerCase().trim();
      const count = (districtProducts || []).filter((p) => {
        const cat = (p.categoryName || p.category || p.masterProduct?.category?.name || "").toLowerCase();
        const name = (p.name || "").toLowerCase();
        const brand = (p.brand || "").toLowerCase();
        if (target === "cement") return cat.includes("cement") || name.includes("cement") || brand.includes("ultratech");
        if (target === "paints") return cat.includes("paint") || name.includes("paint") || brand.includes("asian");
        if (target === "steel") return cat.includes("steel") || cat.includes("tmt") || name.includes("steel");
        if (target === "plumbing") return cat.includes("plumb") || cat.includes("pipe") || name.includes("pipe");
        if (target === "electrical") return cat.includes("electr") || cat.includes("wire");
        if (target === "sanitary") return cat.includes("sanitar") || cat.includes("bath");
        if (target === "hardware") return cat.includes("hardware") || cat.includes("tool");
        if (target === "tiles") return cat.includes("tile") || cat.includes("ceramic");
        return cat.includes(target) || name.includes(target);
      }).length;

      return {
        ...c,
        countLabel: count > 0 ? `${count} Products` : "Available",
      };
    });
  }, [districtProducts]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-28 font-sans">
      {/* 🖥️ Desktop Navbar */}
      <div className="hidden lg:block">
        <Navbar />
      </div>

      {/* 📱 Mobile Header (Clean Categories Header without Logo/Region) */}
      <div className="lg:hidden bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Link
              to="/"
              className="p-1.5 -ml-1.5 rounded-xl hover:bg-slate-100 text-navy-900 active:scale-95 transition-all flex items-center justify-center"
              title="Back to Home"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="m15 18-6-6 6-6" />
              </svg>
            </Link>
            <h1 className="font-extrabold text-navy-900 text-base tracking-tight">Categories</h1>
          </div>

          <div className="flex items-center gap-3">
            <NotificationPanel className="relative text-navy-900 hover:text-brand-600 transition-colors cursor-pointer" />
            <Link to="/cart" className="relative text-navy-900 hover:text-brand-600 transition-colors p-1" title="Cart">
              <CartIcon />
              {count > 0 && (
                <span className="absolute -top-1 -right-1.5 h-4.5 w-4.5 rounded-full bg-brand-500 text-white text-[10px] font-black flex items-center justify-center shadow-xs">
                  {count}
                </span>
              )}
            </Link>
          </div>
        </div>

        {/* Mobile Search Bar */}
        <form onSubmit={handleSearch} className="max-w-6xl mx-auto px-4 pb-3">
          <div className="flex items-center gap-2">
            <div className="flex-1 flex items-center gap-2 bg-slate-100 rounded-xl px-3 py-2 border border-slate-200 focus-within:border-brand-500 focus-within:bg-white transition-all shadow-2xs">
              <SearchIcon />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search cement, steel, paints, pipes..."
                className="w-full bg-transparent text-xs text-navy-900 font-medium outline-none placeholder:text-slate-400"
              />
              {searchQuery && (
                <button type="button" onClick={() => setSearchQuery("")} className="text-slate-400 hover:text-slate-600 text-xs">
                  ✕
                </button>
              )}
            </div>
            <button
              type="submit"
              className="p-2.5 rounded-xl bg-slate-100 border border-slate-200 text-navy-900 hover:bg-brand-500 hover:text-white transition-colors cursor-pointer shadow-2xs active:scale-95"
              title="Search"
            >
              <ScanIcon />
            </button>
          </div>
        </form>
      </div>

      <main className="max-w-6xl mx-auto px-4 pt-4 sm:pt-6 space-y-6">
        {/* 🔘 1. TOP CIRCLE CATEGORY PILLS (CENTERED & POLISHED ON DESKTOP & MOBILE) */}
        <section className="bg-white/70 backdrop-blur-md rounded-2xl p-3 sm:p-4 border border-slate-200/70 shadow-2xs">
          <div className="flex items-center justify-between sm:justify-center sm:gap-8 overflow-x-auto pb-0.5 no-scrollbar select-none">
            {topPills.map((pill) => {
              const isSelected = activePill.toLowerCase() === pill.name.toLowerCase();
              return (
                <button
                  key={pill.name}
                  type="button"
                  onClick={() => setActivePill(pill.name === "More" ? "All" : pill.name)}
                  className="flex flex-col items-center gap-1.5 shrink-0 group active:scale-95 transition-all cursor-pointer px-1.5"
                >
                  <div
                    className={`w-13 h-13 sm:w-16 sm:h-16 rounded-full flex items-center justify-center p-2.5 transition-all duration-300 ${
                      pill.isGrid
                        ? isSelected
                          ? "bg-[#0284C7] text-white shadow-lg shadow-sky-500/30 ring-3 ring-sky-300 scale-105"
                          : "bg-[#0284C7] text-white shadow-xs hover:scale-105"
                        : isSelected
                        ? "bg-sky-50 border-2 border-[#0284C7] ring-3 ring-sky-200 shadow-md scale-105"
                        : "bg-white border border-slate-200/90 shadow-2xs hover:border-slate-300 hover:shadow-xs hover:scale-105"
                    }`}
                  >
                    {pill.isGrid ? (
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                        <rect x="3" y="3" width="7" height="7" rx="1.5" />
                        <rect x="14" y="3" width="7" height="7" rx="1.5" />
                        <rect x="14" y="14" width="7" height="7" rx="1.5" />
                        <rect x="3" y="14" width="7" height="7" rx="1.5" />
                      </svg>
                    ) : pill.isDots ? (
                      <span className="font-black text-2xl text-slate-500 leading-none">•••</span>
                    ) : pill.img ? (
                      <img src={pill.img} alt={pill.name} className="w-8 h-8 sm:w-10 sm:h-10 object-contain drop-shadow-xs" />
                    ) : (
                      <span className="text-xl sm:text-2xl">{pill.iconSvg || "🚰"}</span>
                    )}
                  </div>
                  <span
                    className={`text-[11px] sm:text-xs font-bold transition-colors ${
                      isSelected ? "text-[#0284C7] font-black" : "text-slate-600 group-hover:text-navy-950"
                    }`}
                  >
                    {pill.name}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* 🌟 2. HERO CAROUSEL BANNER (MATCHING HOME PAGE BANNER DESIGN EXACTLY) */}
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
                  <button
                    type="button"
                    onClick={() => setActivePill(b.targetCat || "All")}
                    className="bg-white hover:bg-slate-100 text-navy-950 font-extrabold text-[10px] sm:text-xs px-3.5 py-1.5 rounded-full shadow-md active:scale-95 transition-all w-fit flex items-center gap-1 cursor-pointer"
                  >
                    Shop Now →
                  </button>
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
                  className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                    slide === i ? "w-5 bg-[#38BDF8]" : "w-2 bg-white/40"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* 🛍️ 3. SHOP BY CATEGORY (8-CARD 4-COLUMN COMPACT GRID) */}
        <section className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm sm:text-base font-extrabold text-navy-900 tracking-tight">Shop by Category</h3>
            <button
              type="button"
              onClick={() => setActivePill("All")}
              className="text-xs font-bold text-[#0284C7] hover:underline cursor-pointer"
            >
              View all
            </button>
          </div>

          <div className="grid grid-cols-4 gap-2 sm:gap-3">
            {dynamic8Cards.map((c) => {
              const isSelected = activePill.toLowerCase() === c.name.toLowerCase();
              return (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => setActivePill(c.name)}
                  className={`rounded-xl sm:rounded-2xl p-2 sm:p-2.5 flex flex-col items-center justify-between text-center transition-all duration-200 group active:scale-95 shadow-2xs hover:shadow-xs cursor-pointer min-h-[100px] sm:min-h-[125px] ${
                    isSelected
                      ? "bg-blue-50/90 border-2 border-[#0284C7] ring-2 ring-blue-200 shadow-xs"
                      : "bg-white border border-slate-200/70 hover:border-slate-300"
                  }`}
                >
                  <div className="w-full flex-1 flex items-center justify-center p-0.5 mb-1 overflow-hidden">
                    <img
                      src={c.img}
                      alt={c.name}
                      className="w-full h-full max-h-[46px] sm:max-h-[62px] object-contain group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <div>
                    <h4 className="text-[11px] sm:text-xs font-extrabold text-navy-950 leading-tight group-hover:text-[#0284C7] transition-colors truncate max-w-full">
                      {c.name}
                    </h4>
                    <p className="text-[8.5px] sm:text-[9.5px] text-slate-400 font-medium mt-0.5">{c.countLabel}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* 🌟 4. PRODUCTS GRID (4 PRODUCTS PER ROW - COMPACT & CLEAN) */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-extrabold text-navy-900 tracking-tight">
                {activePill === "All" ? "Best Selling Products" : `${activePill} Products`}
              </h3>
              <span className="bg-emerald-50 text-emerald-700 text-[10px] font-black px-2 py-0.5 rounded-full border border-emerald-200">
                {filteredCategoryProducts.length} Live
              </span>
            </div>
            {activePill !== "All" && (
              <button
                type="button"
                onClick={() => setActivePill("All")}
                className="text-xs font-bold text-[#0284C7] hover:underline cursor-pointer"
              >
                Clear Filter (View All)
              </button>
            )}
          </div>

          {productsLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 sm:gap-3.5 animate-pulse">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                <div key={n} className="bg-white rounded-2xl p-3 border border-slate-200 h-44" />
              ))}
            </div>
          ) : filteredCategoryProducts.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center text-xs font-bold text-slate-500 border border-slate-200">
              📦 No {activePill === "All" ? "" : activePill} products currently listed in {region?.name || "your area"}.
              <button
                onClick={() => setActivePill("All")}
                className="block mx-auto mt-2 text-[#0284C7] underline font-bold"
              >
                View all available products
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 sm:gap-3.5">
              {filteredCategoryProducts.map((p) => {
                const price = Number(p.price || 100);
                let mrp = Number(p.mrp || p.masterProduct?.suggestedPrice || 0);
                if (mrp <= price) mrp = Math.round(price * 1.2);
                const discountPct = Math.max(8, Math.round(((mrp - price) / mrp) * 100));

                return (
                  <div
                    key={p.id}
                    className="bg-white rounded-xl sm:rounded-2xl border border-slate-200/80 p-2 sm:p-2.5 flex flex-col justify-between shadow-2xs hover:shadow-md hover:border-slate-300 active:scale-[0.98] transition-all group relative"
                  >
                    <Link to={`/product/${p.id}`} className="block">
                      <div className="relative aspect-square rounded-lg sm:rounded-xl overflow-hidden bg-slate-50 mb-1.5 border border-slate-100 flex items-center justify-center p-1.5">
                        <span className="absolute top-1.5 left-1.5 z-10 bg-amber-100 text-amber-800 font-black text-[8px] sm:text-[8.5px] px-1.5 py-0.5 rounded border border-amber-200/60 shadow-2xs">
                          {discountPct}% OFF
                        </span>
                        <img
                          src={p.imageUrl || p.img || "/categories/cement.png"}
                          alt={p.name}
                          className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />
                      </div>

                      <p className="text-[8.5px] sm:text-[9px] font-bold text-slate-400 uppercase tracking-tight truncate">
                        {p.brand || "Standard"}
                      </p>
                      <h4 className="text-[11px] sm:text-xs font-extrabold text-navy-950 leading-snug line-clamp-1 group-hover:text-[#0284C7] transition-colors">
                        {p.name}
                      </h4>
                    </Link>

                    <div className="mt-1 pt-1.5 border-t border-slate-100 flex flex-col sm:flex-row sm:items-end justify-between gap-1">
                      <div>
                        <div className="flex items-baseline gap-1">
                          <span className="text-xs sm:text-sm font-black text-navy-950">₹{price.toLocaleString("en-IN")}</span>
                          {mrp > price && (
                            <span className="text-[8.5px] sm:text-[9px] text-slate-400 line-through">₹{mrp.toLocaleString("en-IN")}</span>
                          )}
                        </div>
                        <span className="text-[7.5px] sm:text-[8.5px] text-slate-400 leading-none block">per {p.unit || "unit"}</span>
                      </div>

                      <button
                        onClick={() => handleAddToCart(p)}
                        className={`text-[10px] sm:text-[11px] font-bold px-2 py-1 rounded-lg transition-all shadow-2xs active:scale-95 cursor-pointer mt-1 sm:mt-0 ${
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