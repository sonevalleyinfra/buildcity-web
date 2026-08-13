import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCart } from "../../context/CartContext";
import { useAdmin } from "../../context/AdminContext";
import Navbar from "../../components/Navbar";

const HERO_SLIDES = [
  {
    tag: "DIRECT WHOLESALE",
    title: "UltraTech & Tata Steel Wholesale Rates",
    desc: "Order 50kg cement bags & Fe 550D TMT rebars directly from verified district suppliers.",
    bg: "from-navy-950 via-navy-900 to-slate-900",
    image: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=600&q=80",
  },
  {
    tag: "PAINTS & FINISHES",
    title: "Asian Paints & Berger Luxury Emulsions",
    desc: "Interior shine, waterproofing damp-shield primers, and exterior weather-guard.",
    bg: "from-purple-950 via-slate-900 to-navy-950",
    image: "https://images.unsplash.com/photo-1562259949-e8e7689d7828?auto=format&fit=crop&w=600&q=80",
  },
  {
    tag: "PLUMBING & WIRES",
    title: "Astral Pipes & Finolex Heavy Wires",
    desc: "CPVC hot & cold water pipes, SWR fittings, and 90m flame retardant copper wire coils.",
    bg: "from-navy-900 via-blue-950 to-slate-950",
    image: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80",
  },
];

const CATEGORIES_DATA = [
  { id: "c1", name: "Cement", icon: "🏗️", count: "120+ Items", img: "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=300&q=80", tag: "Bulk" },
  { id: "c2", name: "Paints", icon: "🎨", count: "150+ Items", img: "https://images.unsplash.com/photo-1562259949-e8e7689d7828?auto=format&fit=crop&w=300&q=80", tag: "Shine" },
  { id: "c3", name: "Steel Rebar", icon: "⚙️", count: "80+ Items", img: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=300&q=80", tag: "550D" },
  { id: "c4", name: "Plumbing", icon: "🚰", count: "90+ Items", img: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=300&q=80", tag: "CPVC" },
  { id: "c5", name: "Electrical", icon: "⚡", count: "110+ Items", img: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=300&q=80", tag: "Wires" },
];

const BRANDS = [
  "🏗️ UltraTech",
  "🎨 Asian Paints",
  "⚙️ Tata Tiscon",
  "🛡️ Ambuja",
  "🚰 Astral",
  "⚡ Finolex",
  "🖌️ Berger",
  "💡 Havells",
];

export default function Home() {
  const { addItem } = useCart();
  const { masterProducts = [], products = [] } = useAdmin();
  const navigate = useNavigate();

  const [slide, setSlide] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCatFilter, setSelectedCatFilter] = useState("ALL");
  const [itemQuantities, setItemQuantities] = useState({});

  useEffect(() => {
    const timer = setInterval(() => {
      setSlide((s) => (s + 1) % HERO_SLIDES.length);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const displayItems = (masterProducts.length > 0 ? masterProducts : products).filter((item) => {
    if (selectedCatFilter === "ALL") return true;
    return item.categoryId === selectedCatFilter;
  });

  const getQty = (id) => itemQuantities[id] || 1;

  const updateQty = (id, delta) => {
    setItemQuantities((prev) => ({
      ...prev,
      [id]: Math.max(1, (prev[id] || 1) + delta),
    }));
  };

  const handleAddToCart = (item) => {
    const qty = getQty(item.id);
    addItem(
      {
        id: item.id,
        name: item.name,
        price: item.suggestedPrice || item.price || 390,
        image: item.imageUrl,
        unit: item.unit || "Unit",
      },
      qty
    );
    alert(`Added ${qty} x "${item.name}" to cart!`);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-navy-900 font-sans pb-28 lg:pb-12">
      {/* Announcement Bar */}
      <div className="bg-navy-950 text-white text-[11px] py-1.5 px-3 text-center border-b border-navy-800 font-medium">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <span className="truncate">🚚 Same-Day Site Delivery in <strong>Varanasi, Mirzapur &amp; Prayagraj</strong></span>
          <span className="hidden sm:inline bg-brand-500 text-white font-extrabold px-2 py-0.5 rounded text-[10px]">GST Bill Ready</span>
        </div>
      </div>

      {/* Main Navbar */}
      <Navbar />

      {/* Mobile Sticky Quick Search Bar */}
      <div className="sticky top-[53px] z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 p-2.5 sm:hidden shadow-xs">
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Cement, TMT Steel, Asian Paints..."
              className="w-full bg-slate-100 text-navy-900 text-xs font-semibold rounded-xl px-3 py-2 pl-8 outline-none focus:bg-white focus:ring-2 focus:ring-brand-500 transition-all"
            />
            <span className="absolute left-2.5 top-2 text-slate-400 text-xs">🔍</span>
          </div>
          <button type="submit" className="bg-brand-500 text-white text-xs font-bold px-3 py-2 rounded-xl shadow-xs">
            Search
          </button>
        </form>
      </div>

      {/* Hero Banner */}
      <section className="bg-navy-950 text-white relative overflow-hidden py-4 sm:py-10">
        <div className="max-w-7xl mx-auto px-3 sm:px-6">
          <div className={`bg-linear-to-r ${HERO_SLIDES[slide].bg} rounded-2xl sm:rounded-3xl p-4 sm:p-8 border border-white/10 shadow-xl relative`}>
            
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-8 items-center">
              <div className="lg:col-span-7 space-y-2 sm:space-y-4">
                <div className="flex items-center gap-2">
                  <span className="bg-brand-500 text-white text-[10px] sm:text-xs font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                    {HERO_SLIDES[slide].tag}
                  </span>
                  <span className="bg-white/10 text-slate-300 text-[10px] sm:text-xs font-semibold px-2.5 py-0.5 rounded-full">
                    ✓ Verified Suppliers
                  </span>
                </div>

                <h1 className="text-xl sm:text-4xl lg:text-5xl font-black text-white leading-tight tracking-tight">
                  {HERO_SLIDES[slide].title}
                </h1>

                <p className="text-xs sm:text-sm text-slate-300 max-w-lg leading-normal hidden sm:block">
                  {HERO_SLIDES[slide].desc}
                </p>

                {/* Desktop Search */}
                <form onSubmit={handleSearchSubmit} className="pt-2 hidden sm:flex items-center gap-2 max-w-lg">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search Cement, TMT Steel, Asian Paints..."
                      className="w-full bg-white text-navy-900 text-xs sm:text-sm font-semibold rounded-xl px-4 py-3 pl-10 outline-none shadow-lg"
                    />
                    <span className="absolute left-3.5 top-3 text-slate-400 text-sm">🔍</span>
                  </div>
                  <button type="submit" className="bg-brand-500 text-white font-bold text-xs sm:text-sm px-5 py-3 rounded-xl shadow-lg">
                    Search
                  </button>
                </form>
              </div>

              <div className="lg:col-span-5">
                <div className="relative rounded-xl overflow-hidden border border-white/20 shadow-lg">
                  <img
                    src={HERO_SLIDES[slide].image}
                    alt={HERO_SLIDES[slide].title}
                    className="w-full h-36 sm:h-64 object-cover"
                  />
                  <div className="absolute inset-0 bg-linear-to-t from-navy-950 via-transparent to-transparent"></div>
                  <div className="absolute bottom-2 left-2 right-2 sm:bottom-4 sm:left-4 sm:right-4 bg-navy-900/90 backdrop-blur-md p-2 sm:p-3 rounded-lg border border-white/10">
                    <p className="font-extrabold text-[11px] sm:text-xs text-white">Direct District Wholesale Rates</p>
                    <p className="text-[10px] text-slate-300">Onboarded by District Representatives (DR).</p>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Dots */}
          <div className="flex justify-center gap-1.5 mt-3">
            {HERO_SLIDES.map((_, i) => (
              <button
                key={i}
                onClick={() => setSlide(i)}
                className={`h-2 rounded-full transition-all cursor-pointer ${
                  slide === i ? "w-6 bg-brand-500" : "w-2 bg-slate-700"
                }`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-3 sm:px-6 mt-6 space-y-8">
        
        {/* Value Proposition Mobile Grid */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4">
          <div className="bg-white p-3 sm:p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-2.5">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-blue-50 text-brand-600 font-bold text-sm sm:text-lg flex items-center justify-center shrink-0">🚚</div>
            <div>
              <p className="font-extrabold text-xs text-navy-900">Fast Delivery</p>
              <p className="text-[10px] sm:text-[11px] text-slate-500">Same-day site unloading</p>
            </div>
          </div>
          <div className="bg-white p-3 sm:p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-2.5">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-green-50 text-green-700 font-bold text-sm sm:text-lg flex items-center justify-center shrink-0">✅</div>
            <div>
              <p className="font-extrabold text-xs text-navy-900">DR Verified</p>
              <p className="text-[10px] sm:text-[11px] text-slate-500">Audited local vendors</p>
            </div>
          </div>
          <div className="bg-white p-3 sm:p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-2.5">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-amber-50 text-amber-700 font-bold text-sm sm:text-lg flex items-center justify-center shrink-0">🏷️</div>
            <div>
              <p className="font-extrabold text-xs text-navy-900">Best Price</p>
              <p className="text-[10px] sm:text-[11px] text-slate-500">Direct factory rates</p>
            </div>
          </div>
          <div className="bg-white p-3 sm:p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-2.5">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-purple-50 text-purple-700 font-bold text-sm sm:text-lg flex items-center justify-center shrink-0">🧾</div>
            <div>
              <p className="font-extrabold text-xs text-navy-900">GST Invoice</p>
              <p className="text-[10px] sm:text-[11px] text-slate-500">100% Tax credit claim</p>
            </div>
          </div>
        </section>

        {/* Categories Section */}
        <section>
          <div className="flex items-center justify-between mb-3 sm:mb-5">
            <div>
              <h2 className="text-base sm:text-xl font-black text-navy-900 tracking-tight">Shop by Category</h2>
              <p className="text-[11px] sm:text-xs text-slate-500">Construction &amp; home improvement supplies</p>
            </div>
            <Link to="/categories" className="text-xs font-bold text-brand-600 hover:underline">
              View All →
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-4">
            {CATEGORIES_DATA.map((cat) => (
              <div
                key={cat.id}
                onClick={() => setSelectedCatFilter(cat.id === selectedCatFilter ? "ALL" : cat.id)}
                className={`group bg-white rounded-xl sm:rounded-2xl border p-3 sm:p-4 shadow-xs hover:shadow-md transition-all cursor-pointer overflow-hidden ${
                  selectedCatFilter === cat.id ? "border-brand-500 ring-2 ring-brand-500/20 bg-brand-50/20" : "border-slate-200 hover:border-brand-300"
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xl sm:text-2xl">{cat.icon}</span>
                  <span className="text-[9px] sm:text-[10px] font-bold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">
                    {cat.tag}
                  </span>
                </div>
                <h3 className="font-extrabold text-navy-900 text-xs sm:text-sm group-hover:text-brand-600 transition-colors">{cat.name}</h3>
                <p className="text-[10px] sm:text-[11px] text-slate-500">{cat.count}</p>

                <img
                  src={cat.img}
                  alt={cat.name}
                  className="w-full h-16 sm:h-24 object-cover rounded-lg mt-2 border border-slate-100"
                />
              </div>
            ))}
          </div>
        </section>

        {/* Master Catalog Products Mobile Grid (2 Columns on Mobile!) */}
        <section>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
            <div>
              <h2 className="text-base sm:text-xl font-black text-navy-900 tracking-tight">Marketplace Catalog</h2>
              <p className="text-[11px] sm:text-xs text-slate-500">Products configured by Admin &amp; DRs</p>
            </div>

            {/* Horizontal Filter Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              <button
                onClick={() => setSelectedCatFilter("ALL")}
                className={`text-[11px] sm:text-xs font-bold px-3 py-1 rounded-xl border transition-colors cursor-pointer whitespace-nowrap ${
                  selectedCatFilter === "ALL" ? "bg-navy-900 text-white border-navy-900" : "bg-white text-slate-700 border-slate-200"
                }`}
              >
                All ({displayItems.length})
              </button>
              {CATEGORIES_DATA.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCatFilter(c.id)}
                  className={`text-[11px] sm:text-xs font-bold px-3 py-1 rounded-xl border transition-colors cursor-pointer whitespace-nowrap ${
                    selectedCatFilter === c.id ? "bg-navy-900 text-white border-navy-900" : "bg-white text-slate-700 border-slate-200"
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          {/* Products Grid: 2 Columns on Mobile! */}
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-6">
            {displayItems.map((p) => {
              const currentQty = getQty(p.id);

              return (
                <div key={p.id} className="bg-white rounded-xl sm:rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-all p-2.5 sm:p-4 flex flex-col justify-between group">
                  <div>
                    {/* Image & Badges */}
                    <div className="relative rounded-lg sm:rounded-xl overflow-hidden border border-slate-100 mb-2 bg-slate-50">
                      <img
                        src={p.imageUrl}
                        alt={p.name}
                        className="w-full h-32 sm:h-44 object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <span className="absolute top-1.5 left-1.5 bg-navy-900/90 text-white text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded backdrop-blur-xs">
                        🏷️ {p.brand}
                      </span>
                      <span className="absolute top-1.5 right-1.5 bg-amber-400 text-navy-900 text-[9px] sm:text-[10px] font-extrabold px-1.5 py-0.5 rounded shadow-xs">
                        {p.grade}
                      </span>
                    </div>

                    {/* Category & Title */}
                    <div className="flex items-center justify-between text-[9px] sm:text-[11px] mb-0.5">
                      <span className="font-bold text-brand-600 uppercase tracking-wider">{p.categoryName}</span>
                    </div>

                    <h3 className="font-extrabold text-navy-900 text-xs sm:text-sm leading-snug line-clamp-2 mb-1">
                      {p.name}
                    </h3>
                    <p className="text-[10px] sm:text-xs text-slate-500 mb-2">Unit: <strong>{p.unit}</strong></p>
                  </div>

                  {/* Price & Cart Actions */}
                  <div className="pt-2 border-t border-slate-100">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="text-[9px] text-slate-400 uppercase font-bold">Wholesale</p>
                        <p className="text-sm sm:text-lg font-black text-navy-900">
                          ₹{p.suggestedPrice || p.price}
                        </p>
                      </div>
                      <span className="bg-green-50 text-green-700 text-[9px] font-extrabold px-1.5 py-0.5 rounded border border-green-200">
                        In Stock
                      </span>
                    </div>

                    {/* Stepper + Add Button */}
                    <div className="flex items-center gap-1.5">
                      <div className="flex items-center border border-slate-200 rounded-lg bg-slate-50 p-0.5 shrink-0">
                        <button
                          onClick={() => updateQty(p.id, -1)}
                          className="w-5 h-5 sm:w-7 sm:h-7 font-bold text-slate-600 hover:bg-white rounded flex items-center justify-center text-xs"
                        >
                          -
                        </button>
                        <span className="w-5 sm:w-8 text-center text-xs font-bold text-navy-900">{currentQty}</span>
                        <button
                          onClick={() => updateQty(p.id, 1)}
                          className="w-5 h-5 sm:w-7 sm:h-7 font-bold text-slate-600 hover:bg-white rounded flex items-center justify-center text-xs"
                        >
                          +
                        </button>
                      </div>

                      <button
                        onClick={() => handleAddToCart(p)}
                        className="flex-1 bg-brand-500 hover:bg-brand-600 text-white font-bold text-[11px] sm:text-xs py-2 px-2 rounded-lg sm:rounded-xl shadow-xs transition-colors text-center cursor-pointer"
                      >
                        + Add
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Brands Section */}
        <section className="bg-white rounded-xl sm:rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-xs">
          <h2 className="text-center text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">
            Verified Partner Brands Across Districts
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
            {BRANDS.map((b, i) => (
              <div key={i} className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-center">
                <span className="text-[11px] font-extrabold text-navy-900">{b}</span>
              </div>
            ))}
          </div>
        </section>

      </main>
    </div>
  );
}