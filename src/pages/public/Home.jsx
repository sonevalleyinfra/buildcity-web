import { useState, useEffect, useMemo, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
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
import { constructionServices } from "../../data/servicesData";
import { renderServiceLogo } from "../../data/serviceIcons";
import ContactFab from "../../components/ContactFab";
import SectionHeader from "../../components/ui/SectionHeader";
import EmptyState from "../../components/ui/EmptyState";
import {
  ArrowRightIcon,
  ChevronDownIcon,
  CloseIcon,
  HardHatIcon,
  MonitorIcon,
  PackageIcon,
  PinIcon,
  SearchIcon,
  ShieldCheckIcon,
  StarIcon,
  StoreIcon,
  TagIcon,
} from "../../components/ui/Icons";


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

  return (
    <div data-storefront className="min-h-screen bg-[#F8FAFC] font-sans w-full max-w-full overflow-x-clip">
      {/* Desktop screen ke liye navbar */}
      <div className="hidden lg:block">
        <Navbar />
      </div>

      {/* Mobile screen ke liye sticky top header */}
      <div className="lg:hidden sticky top-0 z-30 w-full max-w-full bg-white/95 backdrop-blur-md border-b border-slate-200/80">
        {/* Header row jisme logo, location picker aur login button hai */}
        <div className="px-3 pt-2 pb-1.5 flex items-center justify-between gap-2 w-full max-w-full">
          {/* Logo aur live district selector */}
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <Link to="/" className="active:scale-95 transition-transform shrink-0 flex items-center">
              <Logo size="sm" hideSubtitle={true} />
            </Link>

            <div className="h-4 w-px bg-slate-200 shrink-0" />

            <RegionPicker
              className="flex min-w-0 cursor-pointer"
              trigger={(r) => (
                <div className="flex h-9 items-center gap-1 rounded-lg px-1.5 cursor-pointer group min-w-0 hover:bg-slate-100 transition-colors">
                  <PinIcon className="h-4 w-4 shrink-0 text-brand-600" />
                  <span className="font-semibold text-navy-950 text-[13px] leading-none truncate min-w-0 max-w-[140px]">
                    {r?.name || "Varanasi"}
                  </span>
                  <ChevronDownIcon className="h-3.5 w-3.5 shrink-0 text-slate-400" strokeWidth={2.2} />
                </div>
              )}
            />
          </div>

          {/* Right side login aur notification button */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {!user && (
              <Link
                to="/login"
                className="inline-flex h-9 items-center rounded-xl bg-navy-950 px-3.5 text-[13px] font-semibold text-white active:scale-[0.97] transition-transform shrink-0"
              >
                Log in
              </Link>
            )}

            <NotificationPanel className="relative flex h-10 w-10 items-center justify-center rounded-xl text-navy-900 hover:bg-slate-100 transition-colors cursor-pointer shrink-0" />
          </div>
        </div>

        {/* Search bar input box */}
        <form onSubmit={handleSearch} className="px-3 pb-2.5">
          <div className="w-full flex items-center gap-2.5 bg-slate-100 rounded-xl px-3.5 border border-transparent focus-within:border-brand-500 focus-within:bg-white focus-within:shadow-[0_0_0_4px_rgba(234,88,12,0.10)] transition-[border-color,background-color,box-shadow] duration-150 h-11">
            <SearchIcon className="h-[18px] w-[18px] shrink-0 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search cement, steel, paints, pipes…"
              aria-label="Search materials"
              className="w-full bg-transparent text-sm text-navy-950 outline-none placeholder:text-slate-500 min-w-0"
            />
            {searchQuery && (
              <button type="button" onClick={() => setSearchQuery("")} aria-label="Clear search" className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:text-slate-600 shrink-0">
                <CloseIcon className="h-4 w-4" />
              </button>
            )}
          </div>
        </form>
      </div>

      <main className={`bc-fade-in max-w-6xl mx-auto px-4 pt-4 sm:pt-6 space-y-7 sm:space-y-9 ${
        Capacitor.isNativePlatform() ? "pb-24" : "pb-10"
      }`}>
        {/* 1. Hero banner slider (touch aur drag support ke saath) */}
        <div
          className="relative overflow-hidden rounded-2xl bg-slate-200 select-none group touch-pan-y flex flex-col"
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

        {/* 2. Top Brands (Original Circular Bubbles) */}
        <section className="space-y-3">
          <SectionHeader title="Top brands" linkTo="/categories" />

          <div className="flex lg:grid lg:grid-cols-7 gap-3.5 sm:gap-5 lg:gap-6 overflow-x-auto lg:overflow-visible pb-1 pt-0.5 no-scrollbar scroll-smooth px-1">
            {brandItems.map((b) => (
              <Link
                key={b.name}
                to={`/categories?cat=${encodeURIComponent(b.category)}`}
                className="w-[74px] sm:w-[84px] lg:w-auto shrink-0 lg:shrink flex flex-col items-center text-center group active:scale-[0.97] transition-transform"
              >
                <div
                  className="w-16 h-16 sm:w-18 sm:h-18 lg:w-20 lg:h-20 rounded-full flex items-center justify-center p-2 shadow-[0_1px_2px_rgba(15,23,42,0.06)] ring-1 ring-slate-200 group-hover:ring-slate-300 group-hover:-translate-y-0.5 group-hover:shadow-[0_8px_18px_-8px_rgba(15,23,42,0.25)] transition-[transform,box-shadow] duration-200 select-none overflow-hidden"
                  style={{ backgroundColor: b.bgColor }}
                >
                  <div className="w-full h-full max-w-[82%] max-h-[82%] flex items-center justify-center">
                    {b.renderLogo()}
                  </div>
                </div>
                <div className="w-full min-h-[22px] flex items-center justify-center text-center mt-1 px-0.5">
                  <span className="text-xs font-medium text-slate-700 group-hover:text-navy-950 transition-colors leading-tight line-clamp-2">
                    {b.name}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* 2.5 Construction Services section (Rich Card Style with Service Badges & Details) */}
        <section className="space-y-3">
          <SectionHeader title="Construction services" linkTo="/categories" />

          <div className="flex overflow-x-auto lg:grid lg:grid-cols-8 gap-2.5 sm:gap-3.5 pb-1 no-scrollbar scroll-smooth">
            {constructionServices.map((s) => (
              <div
                key={s.id}
                onClick={() => {
                  setSelectedService(s);
                  setSelectedSubCategory(s.subServices && s.subServices.length > 0 ? s.subServices[0] : "");
                  setServicePackageType("with_material");
                }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    e.currentTarget.click();
                  }
                }}
                className="w-[96px] sm:w-28 lg:w-auto shrink-0 lg:shrink rounded-2xl p-2.5 flex flex-col items-center justify-between ring-1 ring-slate-200/80 hover:ring-slate-300 hover:-translate-y-0.5 hover:shadow-[0_10px_24px_-14px_rgba(15,23,42,0.35)] active:scale-[0.97] transition-[transform,box-shadow] duration-200 group min-h-[118px] sm:min-h-[135px] cursor-pointer select-none text-center"
                style={{ backgroundColor: s.cardBg || s.bg || "#F8FAFC" }}
              >
                <div className="w-full flex-1 flex items-center justify-center py-1">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white shadow-[0_1px_2px_rgba(15,23,42,0.06)] flex items-center justify-center p-1.5 overflow-hidden">
                    {renderServiceLogo(s.id, "w-8 h-8 sm:w-9 sm:h-9 group-hover:scale-105 transition-transform duration-200") || (
                      <span className="text-2xl sm:text-3xl select-none">
                        {s.icon}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-center w-full pt-1">
                  <span className="text-xs sm:text-[13px] font-semibold text-navy-950 block truncate max-w-full leading-tight">
                    {s.shortName || s.name}
                  </span>
                  <span className="text-[11px] text-slate-500 block truncate leading-tight mt-0.5">
                    {s.subtitle}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Interactive Service Detail & With / Without Material Choice Modal */}
        {selectedService && (
          <div
            className="bc-fade-in fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/55 backdrop-blur-xs"
            role="dialog"
            aria-modal="true"
            aria-label={selectedService.name}
            onClick={() => setSelectedService(null)}
          >
            <div
              className="bc-sheet-up bg-white rounded-t-3xl sm:rounded-2xl max-w-md w-full p-5 sm:p-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl relative space-y-4 max-h-[90vh] overflow-y-auto no-scrollbar"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                onClick={() => setSelectedService(null)}
                className="absolute top-4 right-4 w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
                aria-label="Close"
              >
                <CloseIcon className="h-4 w-4" strokeWidth={2.2} />
              </button>

              {/* Header */}
              <div className="flex items-center gap-3 pr-8">
                <div
                  className="w-13 h-13 rounded-2xl flex items-center justify-center text-3xl ring-1 ring-slate-200/80 shrink-0"
                  style={{ backgroundColor: selectedService.bg }}
                >
                  {renderServiceLogo(selectedService.id, "w-8 h-8 sm:w-9 sm:h-9") || selectedService.icon}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-navy-950 leading-tight">
                    {selectedService.name}
                  </h3>
                  <p className="text-sm text-slate-500 mt-0.5">
                    {selectedService.subtitle} · {region?.name || "Varanasi"}
                  </p>
                </div>
              </div>

              {/* 1. Sub-Category Selection */}
              {selectedService.subServices && selectedService.subServices.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <p className="text-sm font-medium text-slate-700">
                    Type of work
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedService.subServices.map((sub) => {
                      const isChosen = selectedSubCategory === sub;
                      return (
                        <button
                          key={sub}
                          type="button"
                          onClick={() => setSelectedSubCategory(sub)}
                          className={`p-2.5 min-h-11 rounded-xl text-[13px] font-medium transition-colors border text-left flex items-center justify-between cursor-pointer active:scale-[0.98] ${
                            isChosen
                              ? "border-brand-500 bg-brand-50/60 text-navy-950 ring-1 ring-brand-500/30"
                              : "border-slate-200 hover:border-slate-300 text-slate-700 bg-white"
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
                <p className="text-sm font-medium text-slate-700">
                  How should we do it?
                </p>

                {/* Option 1: With Product (Turnkey) */}
                <div
                  onClick={() => setServicePackageType("with_material")}
                  role="radio"
                  aria-checked={servicePackageType === "with_material"}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setServicePackageType("with_material");
                    }
                  }}
                  className={`p-3.5 rounded-2xl border cursor-pointer transition-colors ${
                    servicePackageType === "with_material"
                      ? "border-brand-500 bg-brand-50/40 ring-1 ring-brand-500/20"
                      : "border-slate-200 hover:border-slate-300 bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <PackageIcon className="h-4 w-4 text-slate-500" />
                      <span className="text-sm font-semibold text-navy-950">
                        {selectedService.withMaterialTitle}
                      </span>
                    </div>
                    <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      servicePackageType === "with_material" ? "border-brand-600 bg-brand-600" : "border-slate-300"
                    }`}>
                      {servicePackageType === "with_material" && <span className="w-1.5 h-1.5 rounded-full bg-white"></span>}
                    </span>
                  </div>
                  <p className="text-[13px] text-slate-600 mt-1.5 pl-6 leading-relaxed">
                    {selectedService.withMaterialDesc}
                  </p>
                  <div className="mt-2 pl-6 flex items-center justify-between text-[13px]">
                    <span className="text-slate-500">Estimated rate</span>
                    <span className="font-semibold text-navy-950 tabular-nums">₹{selectedService.withMaterialRate} / {selectedService.unit || "sq.ft"}</span>
                  </div>
                </div>

                {/* Option 2: Without Product (Labour Rate Only) */}
                <div
                  onClick={() => setServicePackageType("without_material")}
                  role="radio"
                  aria-checked={servicePackageType === "without_material"}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setServicePackageType("without_material");
                    }
                  }}
                  className={`p-3.5 rounded-2xl border cursor-pointer transition-colors ${
                    servicePackageType === "without_material"
                      ? "border-brand-500 bg-brand-50/40 ring-1 ring-brand-500/20"
                      : "border-slate-200 hover:border-slate-300 bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <HardHatIcon className="h-4 w-4 text-slate-500" />
                      <span className="text-sm font-semibold text-navy-950">
                        {selectedService.withoutMaterialTitle}
                      </span>
                    </div>
                    <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      servicePackageType === "without_material" ? "border-brand-600 bg-brand-600" : "border-slate-300"
                    }`}>
                      {servicePackageType === "without_material" && <span className="w-1.5 h-1.5 rounded-full bg-white"></span>}
                    </span>
                  </div>
                  <p className="text-[13px] text-slate-600 mt-1.5 pl-6 leading-relaxed">
                    {selectedService.withoutMaterialDesc}
                  </p>
                  <div className="mt-2 pl-6 flex items-center justify-between text-[13px]">
                    <span className="text-slate-500">Labour rate</span>
                    <span className="font-semibold text-navy-950 tabular-nums">₹{selectedService.withoutMaterialRate} / {selectedService.unit || "sq.ft"}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons to navigate to Booking Page */}
              <div className="pt-2 space-y-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedService(null)}
                    className="flex-1 h-12 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold transition-colors cursor-pointer"
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
                    className="flex-[2] h-12 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold transition-colors active:scale-[0.98] flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>Continue to booking</span>
                    <ArrowRightIcon className="h-4 w-4" />
                  </button>
                </div>
                <p className="flex items-center justify-center gap-1.5 text-xs text-slate-500 text-center">
                  <ShieldCheckIcon className="h-4 w-4 text-emerald-600" />
                  Free site inspection · No advance payment
                </p>
              </div>
            </div>
          </div>
        )}


        {/* 4. Best offers product list (mobile me 2 column grid) */}
        <section className="space-y-3">
          <SectionHeader
            title={`Best offers in ${region?.name || "Varanasi"}`}
            linkTo="/categories"
            badge={
              liveDisplayProducts.length > 0 ? (
                <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/15 tabular-nums">
                  {liveDisplayProducts.length} live
                </span>
              ) : null
            }
          />

          {productsLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-2.5 sm:gap-3 lg:gap-4" aria-busy="true" aria-label="Loading products">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                <div key={n} className="rounded-2xl bg-white p-2.5 ring-1 ring-slate-200/80">
                  <div className="bc-skeleton aspect-square w-full rounded-xl" />
                  <div className="bc-skeleton mt-3 h-3 w-1/3 rounded" />
                  <div className="bc-skeleton mt-2 h-3.5 w-4/5 rounded" />
                  <div className="bc-skeleton mt-4 h-4 w-1/2 rounded" />
                  <div className="bc-skeleton mt-3 h-9 w-full rounded-xl" />
                </div>
              ))}
            </div>
          ) : liveDisplayProducts.length === 0 ? (
            <div className="rounded-2xl bg-white ring-1 ring-slate-200/80">
              <EmptyState
                icon={StoreIcon}
                title={`No products in ${region?.name || "Varanasi"} yet`}
                description="Local shops are being added. Try another district or check back soon."
              />
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-2.5 sm:gap-3 lg:gap-4">
              {liveDisplayProducts.slice(0, 12).map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </section>


        {/* 5. Deal of the week (horizontal scroll cards) */}
        {dealOfTheWeekProducts.length > 0 && (
          <section className="space-y-3">
            <SectionHeader
              title="Deals of the week"
              badge={
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700 ring-1 ring-inset ring-brand-600/15">
                  <TagIcon className="h-3 w-3" />
                  Changes daily
                </span>
              }
            />

            {/* Horizontal scroll product cards */}
            <div className="-mx-4 flex gap-2.5 sm:gap-4 overflow-x-auto no-scrollbar scroll-smooth snap-x snap-mandatory scroll-px-4 px-4 pb-1">
              {dealOfTheWeekProducts.map((p) => (
                <div key={p.id} className="w-[160px] sm:w-[195px] shrink-0 snap-start">
                  <ProductCard product={p} className="h-full" />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 5.5 Verified Site Reviews / Builders Feedback Demo */}
        <section className="space-y-3">
          <SectionHeader
            title="What builders say"
            badge={
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800 ring-1 ring-inset ring-amber-600/15 tabular-nums">
                <StarIcon className="h-3 w-3 text-amber-500" />
                4.7 / 5
              </span>
            }
          />

          <SiteReviewsSection />
        </section>

        {/* 6. Popular services section */}
        <section className="space-y-3">
          <SectionHeader title="Popular services" linkTo="/categories" />

          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {/* Site visit service card */}
            <div className="bg-[#EFF6FF] ring-1 ring-[#DBEAFE] rounded-2xl p-3.5 sm:p-4 flex items-center justify-between gap-2 transition-shadow hover:shadow-[0_10px_24px_-14px_rgba(15,23,42,0.35)] relative overflow-hidden group">
              <div className="flex flex-col justify-between h-full z-10">
                <div>
                  <div className="w-8 h-8 rounded-xl bg-[#2563EB] text-white flex items-center justify-center mb-2 shadow-xs">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                  </div>
                  <h4 className="text-sm font-semibold text-navy-950 leading-tight">Site visit</h4>
                  <p className="text-xs text-slate-500 mt-0.5">Professional inspection</p>
                </div>
                <Link
                  to="/categories"
                  aria-label="Book a site visit"
                  className="mt-3 w-9 h-9 rounded-full bg-[#2563EB] text-white flex items-center justify-center active:scale-95 transition-transform group-hover:translate-x-0.5"
                >
                  <ArrowRightIcon className="h-4 w-4" />
                </Link>
              </div>

              {/* Inspection icon badge */}
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-[#2563EB] text-white flex items-center justify-center shrink-0 select-none">
                <HardHatIcon className="h-7 w-7 sm:h-8 sm:w-8" />
              </div>
            </div>

            {/* Web development service card */}
            <div className="bg-white ring-1 ring-slate-200 rounded-2xl p-3.5 sm:p-4 flex items-center justify-between gap-2 transition-shadow hover:shadow-[0_10px_24px_-14px_rgba(15,23,42,0.35)] relative overflow-hidden group">
              <div className="flex flex-col justify-between h-full z-10">
                <div>
                  <div className="w-8 h-8 rounded-xl bg-[#0F172A] text-[#38BDF8] flex items-center justify-center mb-2 shadow-xs">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <rect x="2" y="3" width="20" height="14" rx="2" />
                      <line x1="8" y1="21" x2="16" y2="21" />
                      <line x1="12" y1="17" x2="12" y2="21" />
                    </svg>
                  </div>
                  <h4 className="text-sm font-semibold text-navy-950 leading-tight">Web development</h4>
                  <p className="text-xs text-slate-500 mt-0.5">Get your business online</p>
                </div>
                <Link
                  to="/categories"
                  aria-label="Web development services"
                  className="mt-3 w-9 h-9 rounded-full bg-[#0F172A] text-white flex items-center justify-center active:scale-95 transition-transform group-hover:translate-x-0.5"
                >
                  <ArrowRightIcon className="h-4 w-4" />
                </Link>
              </div>

              {/* Tech solutions icon badge */}
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-[#0F172A] text-[#38BDF8] flex items-center justify-center shrink-0 select-none">
                <MonitorIcon className="h-7 w-7 sm:h-8 sm:w-8" />
              </div>
            </div>
          </div>
        </section>

        {/* 7. Exclusive offers banner */}
        <section className="bg-navy-950 rounded-2xl p-4 sm:p-6 text-white relative overflow-hidden flex items-center justify-between gap-4">
          <div className="min-w-0 z-10">
            <h3 className="text-base sm:text-lg font-semibold leading-tight">Exclusive deals</h3>
            <p className="text-sm text-slate-300 mt-1 mb-3.5">
              Up to 20% off on selected products
            </p>
            <Link
              to="/categories"
              className="bg-white hover:bg-slate-100 text-navy-950 font-semibold text-sm h-10 px-4 rounded-xl active:scale-[0.98] transition-colors inline-flex items-center gap-1.5"
            >
              Explore offers
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
          </div>

          {/* Offer image aur discount badge */}
          <div className="flex items-center gap-2 relative">
            <img
              src="/categories/cement.png"
              alt="Deals"
              className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-xl ring-1 ring-white/15"
            />
            {/* Discount stamp badge */}
            <div className="hidden min-[360px]:flex w-14 h-14 rounded-full bg-brand-600 text-white flex-col items-center justify-center leading-none shrink-0">
              <span className="text-[10px] font-medium">up to</span>
              <span className="text-base font-bold tabular-nums">20%</span>
            </div>
          </div>
        </section>
      </main>

      {/* Footer section (web pe dikhega, mobile app me hidden rahega) */}
      {!Capacitor.isNativePlatform() && <Footer />}

      {/* Help button: WhatsApp / call */}
      <ContactFab />
    </div>
  );
}