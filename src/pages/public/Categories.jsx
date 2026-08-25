import { useState, useMemo } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useCart } from "../../context/CartContext";
import { useAdmin } from "../../context/AdminContext";
import { useRegion } from "../../context/RegionContext";
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

const bestSelling = [];

// Categories Catalog Page — region based live product pricing and filter
export default function Categories() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialCat = searchParams.get("cat") || "All";

  const { count, addItem, items } = useCart();
  const { products = [], productsLoading, categories = [] } = useAdmin();
  const { region } = useRegion();
  const [activePill, setActivePill] = useState(initialCat);
  const [slide, setSlide] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");

  const dynamicFilterPills = useMemo(() => {
    const pills = [{ name: "All", img: null, icon: "⚡" }];
    (categories || []).forEach((c) => {
      if (c.isActive !== false) {
        pills.push({
          name: c.name,
          img: c.img || "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=150&q=80",
        });
      }
    });
    return pills;
  }, [categories]);

  const dynamicCategoryCards = useMemo(() => {
    return (categories || [])
      .filter((c) => c.isActive !== false)
      .map((c) => ({
        name: c.name,
        count: `${c.productCount || 0} Products`,
        img: c.img || "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=300&q=80",
        tag: `Verified`,
      }));
  }, [categories]);

  const handleSearch = (e) => {
    e.preventDefault();
    navigate(searchQuery ? `/search?q=${encodeURIComponent(searchQuery)}` : "/search");
  };

  const filteredCategories = dynamicCategoryCards.filter((c) => {
    if (activePill === "All") return true;
    return c.name.toLowerCase().includes(activePill.toLowerCase());
  });

  const uniqueVendorProducts = useMemo(() => {
    const map = new Map();
    products.forEach((p) => {
      // Require Admin/DR approval before displaying on storefront
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

  const liveVendorProducts = useMemo(() => {
    return uniqueVendorProducts.filter((p) => {
      if (activePill === "All") return true;
      const searchTarget = (activePill || "").toLowerCase();
      const catName = (p.categoryName || "").toLowerCase();
      const pName = (p.name || "").toLowerCase();
      const brandName = (p.brand || "").toLowerCase();
      return (
        catName.includes(searchTarget) ||
        searchTarget.includes(catName) ||
        pName.includes(searchTarget) ||
        brandName.includes(searchTarget)
      );
    });
  }, [uniqueVendorProducts, activePill]);

  const bestSellingProducts = useMemo(() => {
    if (uniqueVendorProducts && uniqueVendorProducts.length > 0) {
      return uniqueVendorProducts.map((p) => ({
        ...p,
        rating: "⭐ 4.9",
        discount: "BESTSELLER",
        img: p.imageUrl || p.img || "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=500&q=80",
      }));
    }
    return [
      {
        id: "bs-1",
        name: "UltraTech Super Cement (50kg)",
        brand: "UltraTech",
        price: 380,
        unit: "bag",
        rating: "⭐ 4.9",
        discount: "BESTSELLER",
        img: "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=500&q=80",
        vendorName: "Varanasi Building Depot",
      },
      {
        id: "bs-2",
        name: "Tata Tiscon 550D TMT Rebars 12mm",
        brand: "Tata Tiscon",
        price: 64,
        unit: "kg",
        rating: "⭐ 4.9",
        discount: "TOP DEMAND",
        img: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=500&q=80",
        vendorName: "Kashi Steel Traders",
      },
      {
        id: "bs-3",
        name: "Asian Paints Apex Exterior Emulsion (20L)",
        brand: "Asian Paints",
        price: 3450,
        unit: "bucket",
        rating: "⭐ 4.8",
        discount: "15% OFF",
        img: "https://images.unsplash.com/photo-1562259949-e8e7689d7828?auto=format&fit=crop&w=500&q=80",
        vendorName: "Mirzapur Color House",
      },
      {
        id: "bs-4",
        name: "Astral CPVC Pro Pipes 1 inch (3 meter)",
        brand: "Astral",
        price: 420,
        unit: "piece",
        rating: "⭐ 4.9",
        discount: "FAST MOVING",
        img: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=500&q=80",
        vendorName: "Sonbhadra Hardware Store",
      },
    ];
  }, [uniqueVendorProducts]);

  return (
    <div className="min-h-screen bg-slate-50 text-navy-900 pb-24 sm:pb-12 font-sans">
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
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 focus-within:bg-white focus-within:ring-4 focus-within:ring-brand-500/10 focus-within:border-brand-500 px-3.5 py-2.5 transition-all duration-200">
            <SearchIcon />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              type="text"
              placeholder="Search category, brand, material..."
              className="w-full bg-transparent text-xs outline-none placeholder:text-slate-400 font-medium text-navy-900"
            />
            <button type="button" className="text-slate-400">
              <ScanIcon />
            </button>
          </div>
        </form>
      </div>

      <main className="max-w-6xl mx-auto px-4 pt-6 space-y-8 relative">
        {/* Ambient section glow */}
        <div className="absolute top-10 left-1/2 -translate-x-1/2 w-full max-w-4xl h-72 bg-brand-500/5 blur-3xl pointer-events-none rounded-full" />

        {/* Top Header Title & Filter Pills */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 border-b border-slate-100 pb-3.5">
            <div>
              <h1 className="text-xl font-black text-navy-900 tracking-tight">Browse All Building Categories</h1>
              <p className="text-xs font-medium text-slate-500 mt-0.5">Certified construction supplies directly from verified district distributors</p>
            </div>
            <span className="text-xs font-bold bg-brand-50 text-brand-700 px-3 py-1 rounded-full border border-brand-200/80 w-fit shrink-0 shadow-2xs">
              {filteredCategories.length} Categories Available
            </span>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-2.5 overflow-x-auto pb-1.5 no-scrollbar">
            {dynamicFilterPills.map((p) => (
              <button
                key={p.name}
                onClick={() => setActivePill(p.name)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all duration-200 cursor-pointer shrink-0 text-xs font-bold tracking-tight active:scale-[0.98] ${
                  activePill === p.name
                    ? "bg-navy-900 text-white border-navy-900 shadow-md ring-1 ring-navy-900/10"
                    : "bg-slate-100/90 text-slate-700 border-slate-200/90 hover:bg-slate-200/70 hover:text-navy-900"
                }`}
              >
                {p.img && <img src={p.img} alt={p.name} className="w-5 h-5 rounded-full object-cover shrink-0 shadow-2xs" />}
                {p.icon && <span>{p.icon}</span>}
                <span>{p.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Hero Slider Banner */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-navy-950 via-navy-900 to-slate-900 h-40 sm:h-56 shadow-md border border-navy-800/60 z-10">
          {banners.map((b, i) => (
            <div
              key={i}
              className="absolute inset-0 transition-opacity duration-700 flex items-center"
              style={{ opacity: slide === i ? 1 : 0, pointerEvents: slide === i ? "auto" : "none" }}
            >
              <div className="flex-1 px-6 sm:px-10 py-5 z-10">
                <span className="bg-brand-500 text-white text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider mb-2.5 inline-block shadow-xs">
                  {b.tag}
                </span>
                <h2 className="text-white text-lg sm:text-2xl font-black leading-tight tracking-tight mt-1">
                  {b.title[0]} <br />
                  <span className="text-brand-300">{b.title[1]}</span>
                </h2>
                <p className="text-slate-300 text-xs font-medium mt-1.5 max-w-md hidden sm:block">{b.sub}</p>
              </div>

              <div className="w-1/2 h-full relative hidden sm:block">
                <div className="absolute inset-0 bg-gradient-to-r from-navy-950 via-navy-950/70 to-transparent z-10" />
                <img src={b.img} alt="Banner" className="w-full h-full object-cover" />
              </div>
            </div>
          ))}

          <div className="absolute bottom-3.5 left-1/2 -translate-x-1/2 flex gap-1.5 z-20">
            {banners.map((_, i) => (
              <button
                key={i}
                onClick={() => setSlide(i)}
                className={`h-2 rounded-full transition-all cursor-pointer ${
                  slide === i ? "w-6 bg-brand-400" : "w-2 bg-white/30 hover:bg-white/50"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Shop by Category Grid */}
        <section className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-black text-navy-900 tracking-tight">Explore Materials by Category</h2>
            <span className="text-xs text-slate-500 font-medium">Click category to view products</span>
          </div>

          <div className="flex gap-3 overflow-x-auto pb-3 pt-1 -mx-1 px-1 no-scrollbar scroll-smooth sm:grid sm:grid-cols-4 sm:gap-4">
            {filteredCategories.map((c) => (
              <div
                key={c.name}
                onClick={() => setActivePill(c.name)}
                className="bg-white border border-slate-200/90 rounded-2xl p-4 w-44 sm:w-auto shrink-0 flex flex-col justify-between shadow-2xs hover:shadow-md hover:border-brand-400 hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 group relative overflow-hidden cursor-pointer"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-black bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full">
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
                  <h3 className="font-extrabold text-navy-900 text-sm tracking-tight group-hover:text-brand-600 transition-colors">
                    {c.name}
                  </h3>
                  <p className="text-[11px] font-medium text-slate-500 mt-0.5">{c.count}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Products Filtered by Selected Category */}
        {productsLoading ? (
          <section className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs relative z-10">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <div className="h-5 bg-slate-200 rounded w-64 animate-pulse"></div>
              <div className="h-6 bg-slate-200 rounded w-32 animate-pulse"></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
              {[1, 2, 3, 4].map((n) => (
                <div
                  key={n}
                  className="bg-slate-50/70 border border-slate-200 rounded-2xl p-4 flex flex-col justify-between"
                >
                  <div>
                    <div className="relative h-36 rounded-xl overflow-hidden bg-slate-200 mb-3 border border-slate-200 flex items-center justify-center">
                      <span className="absolute top-2 left-2 bg-navy-800 text-white text-[9px] font-bold px-2 py-0.5 rounded opacity-60">
                        Category
                      </span>
                    </div>

                    <div className="h-2.5 bg-brand-200 rounded w-28 mb-1.5" />
                    <div className="h-4 bg-slate-200 rounded w-full mb-1" />
                    <div className="h-4 bg-slate-200 rounded w-3/4 mb-2" />
                    <div className="h-3 bg-slate-200 rounded w-1/2" />
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between">
                    <div>
                      <div className="h-5 bg-slate-200 rounded w-14 mb-1" />
                      <div className="h-2 bg-slate-200 rounded w-10" />
                    </div>
                    <div className="bg-brand-500 text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow-xs opacity-70">
                      + Add to Cart
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : liveVendorProducts.length > 0 && (
          <section className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs relative z-10">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-lg font-black text-navy-900 flex items-center gap-2 tracking-tight">
                  <span>⚡ {activePill === "All" ? "Premium Certified Materials Catalog" : activePill + " Master Supplies"}</span>
                  <span className="bg-emerald-50 text-emerald-700 border border-emerald-200/80 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                    ✨ 100% Certified Quality
                  </span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  100% Tested & Verified Construction Stock · Direct Site Delivery Across {region?.name || "Varanasi"} & UP Districts
                </p>
              </div>
              <span className="text-xs font-extrabold bg-slate-100 text-slate-700 px-3 py-1 rounded-xl border border-slate-200/80 w-fit shrink-0 shadow-2xs">
                {liveVendorProducts.length} Items Available in {region?.name || "Region"}
              </span>
            </div>

            <div className="flex gap-4 overflow-x-auto pb-3 pt-1 -mx-1 px-1 no-scrollbar scroll-smooth">
              {liveVendorProducts.map((p) => (
                <div
                  key={p.id}
                  className="bg-white border border-slate-200/90 rounded-2xl p-4 w-60 sm:w-64 shrink-0 flex flex-col justify-between hover:border-brand-300 hover:shadow-md hover:-translate-y-0.5 active:scale-[0.99] transition-all duration-200 group"
                >
                    <div>
                      <div className="relative h-36 rounded-xl overflow-hidden bg-slate-50 mb-3 border border-slate-200">
                        <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        <span className="absolute top-2 left-2 bg-navy-900 text-white text-[9px] font-bold px-2 py-0.5 rounded shadow-2xs">
                          {p.categoryName}
                        </span>
                      </div>

                      <p className="text-[10px] font-black text-brand-600 uppercase tracking-wide">
                        🏬 Offered by: {p.vendorName}
                      </p>
                      <h3 className="font-extrabold text-navy-900 text-xs leading-snug line-clamp-2 mt-0.5 tracking-tight">
                        {p.name}
                      </h3>
                      <p className="text-[11px] font-medium text-slate-500 mt-1">
                        Brand: <span className="font-bold text-slate-700">{p.brand}</span> · Grade: <span className="font-bold text-slate-700">{p.grade}</span>
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-200/90 flex items-center justify-between">
                      <div>
                        <span className="text-base font-black text-navy-900 tracking-tight tabular-nums">₹{p.price}</span>
                        <p className="text-[10px] font-medium text-slate-400">per {p.unit}</p>
                      </div>
                      <button
                        onClick={() => {
                          addItem(
                            {
                              id: p.id,
                              name: p.name,
                              price: p.price,
                              brand: p.brand,
                              img: p.imageUrl,
                              vendorId: p.vendorId,
                              vendorName: p.vendorName || "District Vendor",
                            },
                            1
                          );
                          alert(`"${p.name}" (Vendor: ${p.vendorName || "District Vendor"}) added to cart!`);
                        }}
                        className="bg-brand-500 hover:bg-brand-600 active:scale-[0.98] transition-all duration-200 text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow-xs cursor-pointer"
                      >
                        + Add to Cart
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </section>
        )}

        {/* Best Selling Products */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-black text-navy-900">Best Selling District Products</h2>
              <p className="text-xs text-slate-500">Highest ordered construction items across Varanasi & nearby districts</p>
            </div>
          </div>

          <div className="flex gap-4 overflow-x-auto pb-3 pt-1 -mx-1 px-1 no-scrollbar scroll-smooth">
            {bestSellingProducts.map((p) => {
              return (
                <div
                  key={p.id}
                  className="bg-white rounded-2xl border border-slate-200/90 p-4 w-60 sm:w-64 shrink-0 shadow-2xs hover:shadow-md hover:border-amber-400 hover:-translate-y-0.5 active:scale-[0.99] transition-all duration-200 flex flex-col justify-between group relative"
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

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <span className="text-base font-black text-navy-900">₹{p.price}</span>
                    </div>
                    <button
                      onClick={() => {
                        addItem(p, 1);
                        alert(`"${p.name}" added to cart!`);
                      }}
                      className="bg-brand-500 hover:bg-brand-600 active:scale-[0.97] transition-all text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-xs cursor-pointer"
                    >
                      + Add
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