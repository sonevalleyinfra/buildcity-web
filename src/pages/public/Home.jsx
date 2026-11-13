import { useState, useEffect, useMemo, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useCart } from "../../context/CartContext";
import { useAdmin } from "../../context/AdminContext";
import { useRegion } from "../../context/RegionContext";
import Navbar from "../../components/Navbar";
import Logo from "../../components/Logo";
import RegionPicker from "../../components/RegionPicker";
import NotificationPanel from "../../components/NotificationPanel";
import ProductCard from "../../components/ProductCard";
import Footer from "../../components/Footer";
import SiteReviewsSection from "../../components/SiteReviewsSection";
import { Capacitor } from "@capacitor/core";
import { resolveCategoryBubbleImage } from "../vendor/utils/productImage";
import { constructionServices } from "../../data/servicesData";

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
    tag: "Aggregates & Gitti",
    bg: "#F5F3EF",
    img: "/categories/crushed_stone.png",
  },
  {
    name: "Tiles",
    tag: "Floor & Wall",
    bg: "#EFF6FF",
    img: "/categories/tiles.png",
  },
  {
    name: "Plumbing",
    tag: "Pipes & Fittings",
    bg: "#ECFEFF",
    img: "/categories/plumbing.png",
  },
];


const brandItems = [
  {
    name: "Asian Paints",
    category: "Paints",
    bgColor: "#FFFFFF",
    renderLogo: () => (
      <div className="flex flex-col items-center justify-center pointer-events-none">
        <div className="flex items-center text-base sm:text-lg font-black tracking-tighter leading-none">
          <span className="text-[#9333EA]">a</span>
          <span className="text-[#DC2626]">p</span>
        </div>
        <span className="text-[6px] sm:text-[6.5px] font-extrabold text-[#DC2626] tracking-tight leading-none mt-0.5">
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
      <div className="flex flex-col items-center justify-center text-white px-1 pointer-events-none">
        <span className="font-black text-[9px] sm:text-[11px] tracking-tight leading-none">SOMANY</span>
        <span className="text-[4.5px] sm:text-[5px] font-extrabold tracking-wider leading-none mt-0.5 opacity-95">
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
      <div className="flex flex-col items-center justify-center px-1 pointer-events-none">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 bg-[#DC2626] rounded-2xs flex items-center justify-center shrink-0">
            <div className="w-0.5 h-0.5 bg-white" />
          </div>
          <span className="font-black text-[8px] sm:text-[9px] text-navy-950 tracking-tight leading-none">JOHNSON</span>
        </div>
        <span className="text-[4.5px] sm:text-[5.5px] font-extrabold text-[#DC2626] tracking-wider leading-none mt-0.5 uppercase">
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
      <div className="flex flex-col items-center justify-center px-1 pointer-events-none">
        <span className="font-black text-xs sm:text-sm text-[#0284C7] tracking-wider leading-none">
          CERA
        </span>
        <span className="text-[5px] sm:text-[5.5px] font-bold text-slate-400 tracking-tight leading-none mt-0.5">
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
      <div className="flex flex-col items-center justify-center text-white px-1 pointer-events-none">
        <span className="font-black text-[10px] sm:text-[12px] tracking-tight italic leading-none font-serif">
          Kajaria
        </span>
        <span className="text-[4.5px] sm:text-[5.5px] font-extrabold tracking-widest leading-none mt-0.5 opacity-90">
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
      <div className="flex flex-col items-center justify-center text-navy-950 px-1 pointer-events-none">
        <div className="w-3 h-2 bg-[#DC2626] flex items-center justify-center rounded-2xs mb-0.5 shadow-2xs shrink-0">
          <div className="w-1 h-1 bg-[#FBBF24] rotate-45" />
        </div>
        <span className="font-black text-[7.5px] sm:text-[8.5px] tracking-tighter leading-none text-navy-950">
          UltraTech
        </span>
        <span className="text-[4.5px] sm:text-[5px] font-extrabold text-navy-900 tracking-tight leading-none mt-0.5">
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
      <div className="flex flex-col items-center justify-center px-1 pointer-events-none">
        <span className="font-black text-[7.5px] sm:text-[8.5px] text-[#0369A1] tracking-widest leading-none">
          TATA
        </span>
        <span className="font-black text-[8px] sm:text-[9.5px] text-[#DC2626] tracking-tighter leading-none mt-0.5">
          TISCON
        </span>
        <span className="text-[4.5px] sm:text-[5px] font-bold text-slate-400 tracking-tighter leading-none mt-0.5">
          550D
        </span>
      </div>
    ),
  },
];

const DEFAULT_BANNER_SLIDES = [
  {
    id: "b-1",
    tag: "",
    title: "",
    imageUrl: "https://res.cloudinary.com/lbwxvqmg/image/upload/v1788936739/buildcitybanner.jpg",
    targetUrl: "/categories",
  },
  {
    id: "b-2",
    tag: "",
    title: "",
    imageUrl: "https://res.cloudinary.com/lbwxvqmg/image/upload/v1788938503/banner3.png",
    targetUrl: "/categories",
  },
  {
    id: "b-3",
    tag: "",
    title: "",
    imageUrl: "https://res.cloudinary.com/pvzxcmsk/image/upload/v1791021553/banner_6.png.png",
    targetUrl: "/categories",
  },
];

export default function Home() {
  const { user } = useAuth();
  const { addItem } = useCart();
  const { region } = useRegion();
  const { products = [], productsLoading, banners = [] } = useAdmin();
  const navigate = useNavigate();

  const activeSlides = useMemo(() => {
    const list = Array.isArray(banners)
      ? banners
          .filter((b) => b.isActive !== false)
          .sort((a, b) => (Number(a.displayOrder) || 0) - (Number(b.displayOrder) || 0))
      : [];
    return list.length > 0 ? list : DEFAULT_BANNER_SLIDES;
  }, [banners]);

  const [slide, setSlide] = useState(0);

  useEffect(() => {
    if (slide >= activeSlides.length) {
      setSlide(0);
    }
  }, [activeSlides.length, slide]);
  const [justAddedId, setJustAddedId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedService, setSelectedService] = useState(null);
  const [selectedSubCategory, setSelectedSubCategory] = useState("");
  const [servicePackageType, setServicePackageType] = useState("with_material");

  const touchStartX = useRef(null);
  const touchEndX = useRef(null);
  const isMouseDown = useRef(false);
  const mouseStartX = useRef(null);

  const liveVendorApproved = products
    .filter((p) => {
      if (p.approvalStatus !== "APPROVED" && p.approvalStatus !== undefined) return false;
      const activeRegName = (region?.name || "Varanasi").toLowerCase().trim();
      const activeRegId = (region?.id || "").toLowerCase().trim();
      
      const pRegName = (p.regionName || p.districtName || p.vendor?.region?.name || "varanasi").toLowerCase().trim();
      const pRegId = (p.regionId || p.vendor?.regionId || "").toLowerCase().trim();

      const matchesById = activeRegId && pRegId && activeRegId === pRegId;
      const matchesByName = pRegName === activeRegName || pRegName.includes(activeRegName) || activeRegName.includes(pRegName);

      return matchesById || matchesByName;
    })
    .map((p) => {
      const isSusp = p.isVendorSuspended === true || p.vendor?.status === "SUSPENDED" || p.vendorStatus === "SUSPENDED" || p.isActive === false;
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

  // Deal of the week ke 4 products jo har din rotate hote hain
  const dealOfTheWeekProducts = useMemo(() => {
    if (!liveDisplayProducts || liveDisplayProducts.length === 0) return [];

    const today = new Date();
    // Har din ka unique date number seed (YYYYMMDD)
    const daySeed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();

    let s = daySeed;
    const rng = () => {
      let t = (s += 0x6d2b79f5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };

    // Aaj ke seed se products ko random shuffle kar rahe hain
    const copy = [...liveDisplayProducts];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }

    return copy.slice(0, 5);
  }, [liveDisplayProducts]);

  const nextSlide = () => {
    setSlide((s) => (s + 1) % activeSlides.length);
  };

  const prevSlide = () => {
    setSlide((s) => (s - 1 + activeSlides.length) % activeSlides.length);
  };

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    const distance = touchStartX.current - touchEndX.current;
    if (distance > 40) {
      nextSlide();
    } else if (distance < -40) {
      prevSlide();
    }
    touchStartX.current = null;
    touchEndX.current = null;
  };

  const handleMouseDown = (e) => {
    isMouseDown.current = true;
    mouseStartX.current = e.clientX;
  };

  const handleMouseMove = (e) => {
    if (!isMouseDown.current) return;
    touchEndX.current = e.clientX;
  };

  const handleMouseUp = () => {
    if (!isMouseDown.current) return;
    isMouseDown.current = false;
    if (mouseStartX.current !== null && touchEndX.current !== null) {
      const distance = mouseStartX.current - touchEndX.current;
      if (distance > 40) {
        nextSlide();
      } else if (distance < -40) {
        prevSlide();
      }
    }
    mouseStartX.current = null;
    touchEndX.current = null;
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setSlide((s) => (s + 1) % activeSlides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [activeSlides.length]);

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
    <div className="min-h-screen bg-[#F8FAFC] font-sans w-full max-w-full overflow-x-clip">
      {/* Desktop screen ke liye navbar */}
      <div className="hidden lg:block">
        <Navbar />
      </div>

      {/* Mobile screen ke liye sticky top header */}
      <div className="lg:hidden sticky top-0 z-30 w-full max-w-full bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-2xs">
        {/* Header row jisme logo, location picker aur login button hai */}
        <div className="px-3 pt-2.5 pb-1.5 flex items-center justify-between gap-1.5 w-full max-w-full">
          {/* Logo aur live district selector */}
          <div className="flex items-center gap-1.5 min-w-0 shrink">
            <Link to="/" className="active:scale-95 transition-transform shrink-0 flex items-center">
              <Logo size="sm" hideSubtitle={true} />
            </Link>

            <div className="h-3.5 w-px bg-slate-200 mx-0.5 shrink-0" />

            <RegionPicker
              trigger={(r) => (
                <div className="flex items-center gap-0.5 cursor-pointer group min-w-0">
                  <span className="text-slate-600 text-[10px] sm:text-[11px] leading-none shrink-0">📍</span>
                  <span className="font-bold text-slate-700 text-[11px] sm:text-xs leading-none tracking-tight truncate max-w-[70px] sm:max-w-[110px] group-hover:text-brand-600 transition-colors">
                    {r?.name || "Varanasi"}
                  </span>
                  <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-slate-500 group-hover:text-black transition-transform shrink-0">
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </div>
              )}
            />
          </div>

          {/* Right side login aur notification button */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {!user && (
              <Link
                to="/login"
                className="bg-[#0A192F] hover:bg-brand-600 text-white font-extrabold text-[10.5px] px-2 py-1 rounded-xl shadow-2xs active:scale-95 transition-all flex items-center gap-1 shrink-0"
                title="Login / Register"
              >
                <span className="text-[11px]">🔑</span>
                <span>Login</span>
              </Link>
            )}

            <NotificationPanel className="relative text-navy-900 hover:text-brand-600 transition-colors cursor-pointer shrink-0" />
          </div>
        </div>

        {/* Search bar input box */}
        <form onSubmit={handleSearch} className="px-3 pb-2.5">
          <div className="w-full flex items-center gap-2.5 bg-slate-100/90 rounded-xl px-3.5 py-2 border border-slate-200/80 focus-within:border-brand-500 focus-within:bg-white focus-within:shadow-xs transition-colors shadow-2xs h-10">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2.2" className="shrink-0">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search cement, steel, paints, pipes..."
              className="w-full bg-transparent text-xs text-navy-900 font-medium outline-none placeholder:text-slate-400 min-w-0"
            />
            {searchQuery && (
              <button type="button" onClick={() => setSearchQuery("")} className="text-slate-400 hover:text-slate-600 text-xs p-0.5 shrink-0">
                ✕
              </button>
            )}
          </div>
        </form>
      </div>

      <main className={`max-w-6xl mx-auto px-4 pt-3.5 sm:pt-6 space-y-3.5 sm:space-y-5 ${
        Capacitor.isNativePlatform() ? "pb-20 sm:pb-24" : "pb-4 sm:pb-6"
      }`}>
        {/* 1. Hero banner slider (touch aur drag support ke saath) */}
        <div
          className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-slate-900 border border-slate-200/80 shadow-[0_6px_24px_-4px_rgba(15,23,42,0.10)] select-none group touch-pan-y flex flex-col ring-1 ring-black/5"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {/* Main banner image container (5:2 ratio) */}
          <div className="relative aspect-[5/2] sm:aspect-[5/2] w-full flex items-stretch cursor-grab active:cursor-grabbing touch-manipulation">
            {activeSlides.map((b, i) => (
              <div
                key={b.id || i}
                className="absolute inset-0 transition-all duration-700 ease-out overflow-hidden"
                style={{
                  opacity: slide === i ? 1 : 0,
                  transform: slide === i ? "translateX(0%) scale(1)" : i < slide ? "translateX(-5%) scale(0.98)" : "translateX(5%) scale(0.98)",
                  pointerEvents: slide === i ? "auto" : "none",
                }}
              >
                {/* Banner image aur category ka link */}
                <Link to={b.targetUrl || b.link || "/categories"} className="block w-full h-full relative group">
                  <img
                    src={b.imageUrl || b.img}
                    alt={b.tag || b.title || "Hero Banner"}
                    className="w-full h-full object-cover object-center group-hover:scale-[1.015] transition-transform duration-700 ease-out"
                    onError={(e) => {
                      e.target.src = "https://res.cloudinary.com/pvzxcmsk/image/upload/v1791020539/banner_5.png.png";
                    }}
                  />
                  {/* Hover karne par halka sa brightness effect */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors" />

                  {/* Banner ke upar title aur explore button */}
                  {(Boolean(b.tag?.trim()) || Boolean(b.title?.trim())) && (
                    <div className="absolute inset-x-0 bottom-0 px-3 py-2.5 sm:px-6 sm:py-3.5 bg-gradient-to-t from-black/80 via-black/35 to-transparent flex items-center justify-between gap-2 z-10 pointer-events-none">
                      <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
                        {b.tag?.trim() && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full bg-brand-600 text-white font-black text-[9px] sm:text-xs uppercase tracking-wider shadow-md shrink-0 border border-brand-500/60">
                            <span className="leading-none">{b.tag.trim()}</span>
                          </span>
                        )}
                        {b.title?.trim() && (
                          <p className="text-white font-black text-xs sm:text-base md:text-lg drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] truncate max-w-[140px] sm:max-w-xs md:max-w-md leading-tight">
                            {b.title.trim()}
                          </p>
                        )}
                      </div>

                      <span className="inline-flex items-center gap-1 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-white/95 hover:bg-white text-slate-950 font-black text-[10px] sm:text-xs shadow-md shrink-0 pointer-events-auto group-hover:bg-brand-600 group-hover:text-white transition-all active:scale-95">
                        <span>{(b.tag || b.title || "").toLowerCase().includes("book") ? "Book Now" : "Explore"}</span>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="shrink-0 transition-transform group-hover:translate-x-0.5">
                          <path d="m9 18 6-6-6-6" />
                        </svg>
                      </span>
                    </div>
                  )}
                </Link>
              </div>
            ))}

            {/* Desktop ke liye left right next-prev buttons */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                prevSlide();
              }}
              aria-label="Previous slide"
              className="hidden sm:flex absolute left-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-white/90 hover:bg-white text-navy-950 items-center justify-center backdrop-blur-md transition-all opacity-0 group-hover:opacity-100 active:scale-90 shadow-md border border-white/60 cursor-pointer"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="m15 18-6-6 6-6" />
              </svg>
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                nextSlide();
              }}
              aria-label="Next slide"
              className="hidden sm:flex absolute right-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-white/90 hover:bg-white text-navy-950 items-center justify-center backdrop-blur-md transition-all opacity-0 group-hover:opacity-100 active:scale-90 shadow-md border border-white/60 cursor-pointer"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="m9 18 6-6-6-6" />
              </svg>
            </button>

            {/* Slider dots indicator */}
            <div className="absolute top-2.5 right-2.5 sm:top-3.5 sm:right-3.5 flex items-center gap-1.5 z-20 bg-black/35 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/20 shadow-sm">
              {activeSlides.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setSlide(i)}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    slide === i ? "w-5 bg-white shadow-xs" : "w-1.5 bg-white/45 hover:bg-white/75"
                  }`}
                  aria-label={`Go to slide ${i + 1}`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* 2. Top brands (Temporarily hidden for review) */}
        {/*
        <section className="space-y-1.5 sm:space-y-2.5">
          <div className="flex items-center justify-between">
            <h3 className="text-base sm:text-lg font-black text-navy-950 tracking-tight">Top Brands</h3>
            <Link to="/categories" className="text-xs font-bold text-[#c2410c] hover:text-[#9a3412] hover:underline flex items-center gap-1 active:scale-95 transition-transform">
              <span>See all</span>
              <span className="text-sm">→</span>
            </Link>
          </div>

          <div className="flex lg:grid lg:grid-cols-7 gap-3.5 sm:gap-5 lg:gap-6 overflow-x-auto lg:overflow-visible pb-1 pt-0.5 no-scrollbar scroll-smooth px-1">
            {brandItems.map((b) => (
              <Link
                key={b.name}
                to={`/categories?cat=${encodeURIComponent(b.category)}`}
                className="w-[74px] sm:w-[84px] lg:w-auto shrink-0 lg:shrink flex flex-col items-center text-center group active:scale-95 transition-all"
              >
                <div
                  className="w-16 h-16 sm:w-18 sm:h-18 lg:w-20 lg:h-20 rounded-full flex items-center justify-center p-2 shadow-[0_2px_8px_-2px_rgba(15,23,42,0.08)] border border-slate-200/90 group-hover:border-brand-500 group-hover:shadow-[0_6px_20px_-4px_rgba(234,88,12,0.2)] group-hover:scale-105 transition-all duration-300 select-none overflow-hidden"
                  style={{ backgroundColor: b.bgColor }}
                >
                  <div className="w-full h-full max-w-[82%] max-h-[82%] flex items-center justify-center">
                    {b.renderLogo()}
                  </div>
                </div>
                <div className="w-full min-h-[22px] flex items-center justify-center text-center mt-1 px-0.5">
                  <span className="text-[11px] sm:text-xs font-black text-navy-950 group-hover:text-brand-600 transition-colors leading-tight tracking-tight line-clamp-2">
                    {b.name}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
        */}

        {/* 2.5 Construction Services section */}
        <section className="space-y-1.5 sm:space-y-2.5">
          <div className="flex items-center justify-between">
            <h3 className="text-base sm:text-lg font-black text-navy-950 tracking-tight">Construction Services</h3>
            <Link to="/categories" className="text-xs font-bold text-[#c2410c] hover:text-[#9a3412] hover:underline">
              See all
            </Link>
          </div>

          <div className="flex overflow-x-auto lg:grid lg:grid-cols-8 gap-2 sm:gap-2.5 pb-1 no-scrollbar scroll-smooth">
            {constructionServices.map((s) => (
              <div
                key={s.id}
                onClick={() => {
                  setSelectedService(s);
                  setSelectedSubCategory(s.subServices && s.subServices.length > 0 ? s.subServices[0] : "");
                  setServicePackageType("with_material");
                }}
                className="w-[96px] sm:w-[108px] lg:w-auto shrink-0 lg:shrink rounded-2xl p-2 sm:p-2.5 flex flex-col items-center justify-center shadow-[0_2px_8px_-2px_rgba(15,23,42,0.06)] hover:shadow-[0_8px_20px_-6px_rgba(15,23,42,0.12)] border border-slate-200/80 hover:border-brand-500/60 active:scale-[0.94] transition-all duration-300 group min-h-[105px] sm:min-h-[115px] cursor-pointer select-none text-center"
                style={{ backgroundColor: s.bg }}
              >
                <div className="w-12 h-12 sm:w-13 sm:h-13 rounded-full bg-white shadow-xs border border-white/90 flex items-center justify-center p-1.5 overflow-hidden group-hover:scale-110 group-hover:shadow-md transition-all duration-300 mb-1">
                  <span className="text-2xl sm:text-[25px]">{s.icon}</span>
                </div>
                <span className="text-xs sm:text-[12.5px] font-black text-navy-950 group-hover:text-brand-600 transition-colors block truncate max-w-full leading-tight">
                  {s.shortName || s.name}
                </span>
                <span className="text-[10px] text-slate-500 font-medium block truncate max-w-full mt-0.5">
                  {s.subtitle}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Interactive Service Detail & With / Without Material Choice Modal */}
        {selectedService && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fadeIn"
            onClick={() => setSelectedService(null)}
          >
            <div
              className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-200/90 relative space-y-4 max-h-[90vh] overflow-y-auto no-scrollbar"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                onClick={() => setSelectedService(null)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-sm transition-colors cursor-pointer"
                aria-label="Close"
              >
                ✕
              </button>

              {/* Header */}
              <div className="flex items-center gap-3 pr-8">
                <div
                  className="w-13 h-13 rounded-2xl flex items-center justify-center text-3xl shadow-xs border border-slate-200/80 shrink-0"
                  style={{ backgroundColor: selectedService.bg }}
                >
                  {selectedService.icon}
                </div>
                <div>
                  <h3 className="text-lg font-black text-navy-950 leading-tight">
                    {selectedService.name}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    {selectedService.subtitle} • {region?.name || "Varanasi"} Region
                  </p>
                </div>
              </div>

              {/* 1. Sub-Category Selection */}
              {selectedService.subServices && selectedService.subServices.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-600 block">
                    Choose Sub-Category / Specific Work:
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedService.subServices.map((sub) => {
                      const isChosen = selectedSubCategory === sub;
                      return (
                        <button
                          key={sub}
                          type="button"
                          onClick={() => setSelectedSubCategory(sub)}
                          className={`p-2.5 rounded-xl text-xs font-bold transition-all border text-left flex items-center justify-between cursor-pointer active:scale-95 ${
                            isChosen
                              ? "border-brand-500 bg-orange-50/70 text-navy-950 font-black ring-1 ring-brand-500/30 shadow-2xs"
                              : "border-slate-200 hover:border-slate-300 text-slate-700 bg-slate-50/50 hover:bg-white"
                          }`}
                        >
                          <span className="truncate">{sub}</span>
                          <span
                            className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 ml-1 ${
                              isChosen ? "border-brand-600 bg-brand-600" : "border-slate-300"
                            }`}
                          >
                            {isChosen && <span className="w-1 h-1 rounded-full bg-white" />}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 2. With / Without Material Selection */}
              <div className="space-y-2 pt-1">
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-600 block">
                  Choose Execution Type:
                </label>

                {/* Option 1: With Product (Turnkey) */}
                <div
                  onClick={() => setServicePackageType("with_material")}
                  className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all ${
                    servicePackageType === "with_material"
                      ? "border-brand-500 bg-orange-50/40 shadow-xs ring-1 ring-brand-500/20"
                      : "border-slate-200 hover:border-slate-300 bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-base">📦</span>
                      <span className="text-xs font-black text-navy-950">
                        {selectedService.withMaterialTitle}
                      </span>
                    </div>
                    <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      servicePackageType === "with_material" ? "border-brand-600 bg-brand-600" : "border-slate-300"
                    }`}>
                      {servicePackageType === "with_material" && <span className="w-1.5 h-1.5 rounded-full bg-white"></span>}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-1.5 pl-6 leading-relaxed font-medium">
                    {selectedService.withMaterialDesc}
                  </p>
                  <div className="mt-2 pl-6 flex items-center justify-between text-[11px]">
                    <span className="font-bold text-slate-400">Estimated Rate:</span>
                    <span className="font-black text-brand-600">₹{selectedService.withMaterialRate} / {selectedService.unit || "sq.ft"}</span>
                  </div>
                </div>

                {/* Option 2: Without Product (Labour Rate Only) */}
                <div
                  onClick={() => setServicePackageType("without_material")}
                  className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all ${
                    servicePackageType === "without_material"
                      ? "border-brand-500 bg-orange-50/40 shadow-xs ring-1 ring-brand-500/20"
                      : "border-slate-200 hover:border-slate-300 bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-base">👷</span>
                      <span className="text-xs font-black text-navy-950">
                        {selectedService.withoutMaterialTitle}
                      </span>
                    </div>
                    <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      servicePackageType === "without_material" ? "border-brand-600 bg-brand-600" : "border-slate-300"
                    }`}>
                      {servicePackageType === "without_material" && <span className="w-1.5 h-1.5 rounded-full bg-white"></span>}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-1.5 pl-6 leading-relaxed font-medium">
                    {selectedService.withoutMaterialDesc}
                  </p>
                  <div className="mt-2 pl-6 flex items-center justify-between text-[11px]">
                    <span className="font-bold text-slate-400">Labour Rate:</span>
                    <span className="font-black text-navy-950">₹{selectedService.withoutMaterialRate} / {selectedService.unit || "sq.ft"}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons to navigate to Booking Page */}
              <div className="pt-2 space-y-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedService(null)}
                    className="flex-1 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const sId = selectedService.id;
                      const mode = servicePackageType;
                      const sub = selectedSubCategory;
                      setSelectedService(null);
                      navigate(`/services/book?service=${sId}&sub=${encodeURIComponent(sub)}&mode=${mode}`);
                    }}
                    className="flex-[2] py-3 rounded-2xl bg-[#0A192F] hover:bg-brand-600 text-white text-xs font-black transition-all shadow-md active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>Proceed to Booking</span>
                    <span>→</span>
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 text-center">
                  ⚡ 100% Free Site Inspection • Zero Advance Payment • BuildCity Verified
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 3. Shop by category tiles list */}
        <section className="space-y-1.5 sm:space-y-2.5">
          <div className="flex items-center justify-between">
            <h3 className="text-base sm:text-lg font-extrabold text-navy-900 tracking-tight">Shop by Category</h3>
            <Link to="/categories" className="text-xs font-bold text-[#c2410c] hover:text-[#9a3412] hover:underline">
              See all
            </Link>
          </div>

          <div className="flex overflow-x-auto lg:grid lg:grid-cols-7 gap-2.5 sm:gap-3.5 pb-1 no-scrollbar scroll-smooth">
            {categoryTiles.map((c) => (
              <Link
                key={c.name}
                to={`/categories?cat=${encodeURIComponent(c.name)}`}
                className="w-[92px] sm:w-28 lg:w-auto shrink-0 lg:shrink rounded-2xl p-2.5 flex flex-col items-center justify-between shadow-[0_2px_8px_-2px_rgba(15,23,42,0.06)] hover:shadow-[0_8px_20px_-6px_rgba(15,23,42,0.12)] border border-slate-200/80 hover:border-slate-300 active:scale-[0.94] transition-all duration-300 group min-h-[115px] sm:min-h-[135px]"
                style={{ backgroundColor: c.bg }}
              >
                <div className="w-full flex-1 flex items-center justify-center py-1">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white/95 shadow-xs border border-white/90 flex items-center justify-center p-1.5 overflow-hidden group-hover:scale-110 group-hover:shadow-md transition-all duration-300">
                    <img
                      src={c.img}
                      alt={c.name}
                      className="w-full h-full object-cover rounded-full group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        e.target.src = resolveCategoryBubbleImage(c.name);
                      }}
                    />
                  </div>
                </div>
                <div className="text-center w-full pt-1">
                  <span className="text-xs sm:text-[13px] font-black text-navy-950 group-hover:text-brand-600 transition-colors block truncate max-w-full leading-tight">
                    {c.name}
                  </span>
                  {c.tag && (
                    <span className="text-[9px] font-bold text-slate-500 block truncate leading-none mt-0.5 opacity-80">
                      {c.tag}
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* 4. Best offers product list (mobile me 2 column grid) */}
        <section className="space-y-2 sm:space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-extrabold text-navy-900 tracking-tight">Best Offers in {region?.name || "Varanasi"}</h3>
              <span className="bg-emerald-50 text-emerald-700 text-[10px] font-black px-2 py-0.5 rounded-full border border-emerald-200">
                {liveDisplayProducts.length} Live
              </span>
            </div>
            <Link to="/categories" className="text-xs font-bold text-[#c2410c] hover:text-[#9a3412] hover:underline">
              See all
            </Link>
          </div>

          {productsLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3 animate-pulse">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                <div key={n} className="bg-white rounded-2xl p-3 border border-slate-200 h-48" />
              ))}
            </div>
          ) : liveDisplayProducts.length === 0 ? (
            <div className="bg-white rounded-2xl p-6 text-center text-xs font-bold text-slate-500 border border-slate-200">
              No products listed in {region?.name || "Varanasi"} right now.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3 lg:gap-4">
              {liveDisplayProducts.slice(0, 12).map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </section>


        {/* 5. Deal of the week (horizontal scroll cards) */}
        {dealOfTheWeekProducts.length > 0 && (
          <section className="space-y-3 bg-slate-50/90 p-3.5 sm:p-4.5 rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-2xs">
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-black text-navy-950 tracking-tight">
                Deal of the Week
              </h3>
              <span className="bg-brand-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-2xs uppercase tracking-wider">
                Daily Special
              </span>
            </div>

            {/* Horizontal scroll product cards */}
            <div className="flex gap-3 sm:gap-4 overflow-x-auto no-scrollbar scroll-smooth snap-x pb-1 pt-0.5 px-0.5">
              {dealOfTheWeekProducts.map((p) => (
                <div key={p.id} className="w-[160px] sm:w-[195px] shrink-0 snap-start">
                  <ProductCard product={p} className="h-full border-slate-200/90 shadow-2xs hover:border-brand-500" />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 5.5 Verified Site Reviews / Builders Feedback Demo */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-extrabold text-navy-900 tracking-tight">
                Customers Reviews
              </h3>
             
            </div>
            <span className="text-[11px] font-bold text-amber-600 bg-amber-50 px-2.5 py-0.5 rounded-md border border-amber-200/80">
              ⭐ 4.7 / 5.0
            </span>
          </div>

          <SiteReviewsSection />
        </section>

        {/* 6. Popular services section */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base sm:text-lg font-extrabold text-navy-900 tracking-tight">Popular Services</h3>
            <Link to="/categories" className="text-xs font-bold text-[#c2410c] hover:text-[#9a3412] hover:underline">
              See all
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {/* Site visit service card */}
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

              {/* Inspection icon badge */}
              <div className="w-16 h-18 sm:w-20 sm:h-22 rounded-2xl bg-gradient-to-br from-[#3B82F6] to-[#1D4ED8] text-white flex flex-col items-center justify-center shadow-md p-2 shrink-0 group-hover:scale-105 transition-transform select-none">
                <span className="text-2xl sm:text-3xl mb-0.5">👷‍♂️</span>
                <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-wider text-blue-100 text-center leading-none">Inspection</span>
              </div>
            </div>

            {/* Web development service card */}
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

              {/* Tech solutions icon badge */}
              <div className="w-16 h-18 sm:w-20 sm:h-22 rounded-2xl bg-gradient-to-br from-[#0F172A] to-[#1E293B] text-white flex flex-col items-center justify-center shadow-md p-2 shrink-0 group-hover:scale-105 transition-transform select-none border border-slate-700/50">
                <span className="text-2xl sm:text-3xl mb-0.5">💻</span>
                <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-wider text-[#38BDF8] text-center leading-none">Solutions</span>
              </div>
            </div>
          </div>
        </section>

        {/* 7. Exclusive offers banner */}
        <section className="bg-gradient-to-r from-[#07132B] via-[#0A1A3A] to-[#0D224D] rounded-2xl p-4 text-white shadow-lg relative overflow-hidden flex items-center justify-between">
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

          {/* Offer image aur discount badge */}
          <div className="flex items-center gap-2 relative">
            <img
              src="/categories/cement.png"
              alt="Deals"
              className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-xl shadow-md border border-white/20"
            />
            {/* Discount stamp badge */}
            <div className="w-12 h-12 rounded-full bg-brand-600 text-white flex flex-col items-center justify-center font-black text-[8px] leading-tight shadow-lg border border-brand-500 shrink-0">
              <span>UP TO</span>
              <span className="text-[11px] leading-none">20%</span>
              <span>OFF</span>
            </div>
          </div>
        </section>
      </main>

      {/* Footer section (web pe dikhega, mobile app me hidden rahega) */}
      {!Capacitor.isNativePlatform() && <Footer />}

      {/* Floating whatsapp aur direct calling buttons */}
      <div className="fixed bottom-32 sm:bottom-24 right-3.5 sm:right-5 z-40 flex flex-col gap-2">
        {/* WhatsApp chat button */}
        <a
          href="https://wa.me/919956886527?text=Hello%20BuildCity%20Team,%20I%20have%20an%20inquiry%20regarding%20construction%20materials"
          target="_blank"
          rel="noopener noreferrer"
          className="w-10.5 h-10.5 sm:w-11.5 sm:h-11.5 rounded-full bg-[#25D366] hover:bg-[#20bd5a] text-white flex items-center justify-center shadow-lg hover:shadow-xl ring-2 ring-white/90 active:scale-90 transition-all"
          title="Chat on WhatsApp"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.312.045-.634.055-.992-.061-.59-.191-1.353-.615-2.227-1.488-.874-.873-1.297-1.637-1.488-2.227-.116-.358-.106-.68-.061-.992.05-.333.419-1.026.824-1.17.135-.048.281-.03.394.045.114.075.764 1.846.764 1.846.06.146.028.314-.077.419l-.382.382c.285.503.744.962 1.247 1.247l.382-.382c.105-.105.273-.137.419-.077 0 0 1.771.65 1.846.764.075.113.093.259.046.394z" />
          </svg>
        </a>

        {/* Direct phone call button */}
        <a
          href="tel:+919956886527"
          className="w-10.5 h-10.5 sm:w-11.5 sm:h-11.5 rounded-full bg-[#0284C7] hover:bg-[#0369A1] text-white flex items-center justify-center shadow-lg hover:shadow-xl ring-2 ring-white/90 active:scale-90 transition-all"
          title="Call BuildCity Support"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
          </svg>
        </a>
      </div>
    </div>
  );
}