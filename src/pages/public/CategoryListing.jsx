import { useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import Navbar from "../../components/Navbar";
import MobileHeader from "../../components/ui/MobileHeader";
import EmptyState from "../../components/ui/EmptyState";
import { ChevronLeftIcon, ChevronRightIcon, CloseIcon, SearchIcon } from "../../components/ui/Icons";
import ProductCard from "../../components/ProductCard";
import FilterSidebar from "../../components/FilterSidebar";
import Footer from "../../components/Footer";
import { Capacitor } from "@capacitor/core";
import { useRegion } from "../../context/RegionContext";
import { useAdmin } from "../../context/AdminContext";
import { cleanProductImage } from "../../utils/productImage";

const CATEGORY_LABELS = {
  cement: "Cement",
  paints: "Paints",
  steel: "Steel",
  electronics: "Electronics",
  furniture: "Furniture",
  hardware: "Hardware",
  plumbing: "Plumbing",
};

const BRAND_POOL = {
  cement: ["UltraTech", "Ambuja", "ACC", "Shree Cement"],
  paints: ["Asian Paints", "Berger", "Nerolac", "Dulux"],
  steel: ["Tata Tiscon", "Jindal Panther", "Kamdhenu", "SAIL"],
  electronics: ["Havells", "Bosch", "Philips", "Crompton"],
  furniture: ["Godrej Interio", "Nilkamal", "Durian", "Urban Ladder"],
  hardware: ["Bosch", "Stanley", "Taparia", "Black+Decker"],
  plumbing: ["Cera", "Jaquar", "Somany", "Astral"],
};

const CATEGORY_IMAGES = {
  cement: "/categories/cement.png",
  paints: "/categories/paints.png",
  steel: "/categories/steel.png",
  plumbing: "/categories/plumbing.png",
  electrical: "/categories/steel.png",
  hardware: "/categories/rebars.png",
  furniture: "/categories/tiles.png",
  tiles: "/categories/tiles.png",
};

const PAGE_SIZE = 9;

export default function CategoryListing() {
  const { slug } = useParams();
  const { region } = useRegion();
  const { products = [] } = useAdmin();
  const label = CATEGORY_LABELS[slug] || slug || "Products";

  const allProducts = useMemo(() => {
    const slugLower = (slug || "").toLowerCase();
    const map = new Map();

    // Pehle live vendor products add kar rahe hain jo category se match hote hain
    products.forEach((p) => {
      const isApproved = p.approvalStatus === "APPROVED" || p.approvalStatus === undefined || p.isActive === true;
      if (!isApproved) return;
      if (p.isActive === false || p.isVendorSuspended || p.vendor?.status === "SUSPENDED") return;
      if (slugLower && slugLower !== "all") {
        const catName = (p.categoryName || "").toLowerCase();
        const catId = (p.categoryId || "").toLowerCase();
        const pName = (p.name || "").toLowerCase();
        const matches = catName.includes(slugLower) || slugLower.includes(catName) || catId === slugLower || pName.includes(slugLower);
        if (!matches) return;
      }

      const key = (p.masterProductId || p.name || p.id).toLowerCase().trim();
      const itemPrice = Math.round(Number(p.price || 100));

      if (!map.has(key)) {
        map.set(key, {
          id: p.id,
          name: p.name,
          brand: p.brand || "Generic",
          img: cleanProductImage(p, slugLower, p.name) || CATEGORY_IMAGES[slugLower] || "/categories/cement.png",
          mrp: Math.round(itemPrice * 1.15),
          price: itemPrice,
          rating: "4.9",
          reviews: 42,
          vendorName: p.vendorName,
          vendorId: p.vendorId,
        });
      } else {
        const existing = map.get(key);
        if (itemPrice < existing.price) {
          existing.price = itemPrice;
          existing.mrp = Math.round(itemPrice * 1.15);
          existing.id = p.id;
        }
      }
    });

    return Array.from(map.values());
  }, [slug, products]);
  const brands = BRAND_POOL[slug] || [];

  const [selectedBrands, setSelectedBrands] = useState([]);
  const [selectedPrice, setSelectedPrice] = useState(null);
  const [sortBy, setSortBy] = useState("popularity");
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  const toggleBrand = (b) => {
    setPage(1);
    setSelectedBrands((prev) =>
      prev.includes(b) ? prev.filter((x) => x !== b) : [...prev, b]
    );
  };

  const clearFilters = () => {
    setSelectedBrands([]);
    setSelectedPrice(null);
    setPage(1);
  };

  const filtered = useMemo(() => {
    let list = allProducts;
    if (selectedBrands.length) {
      list = list.filter((p) => selectedBrands.includes(p.brand));
    }
    if (selectedPrice) {
      list = list.filter(
        (p) => p.price >= selectedPrice.min && p.price <= selectedPrice.max
      );
    }
    list = [...list];
    if (sortBy === "price_low") list.sort((a, b) => a.price - b.price);
    if (sortBy === "price_high") list.sort((a, b) => b.price - a.price);
    if (sortBy === "rating") list.sort((a, b) => b.rating - a.rating);
    return list;
  }, [allProducts, selectedBrands, selectedPrice, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div data-storefront className="min-h-screen bg-surface flex flex-col justify-between">
      <div className="hidden lg:block">
        <Navbar />
      </div>
      <MobileHeader title={label} subtitle={region?.name} fallback="/categories" />

      <main className="bc-fade-in max-w-6xl w-full mx-auto px-4 sm:px-6 py-5 sm:py-6 pb-24 lg:pb-10 flex-1">

        {/* Breadcrumb navigation aur category heading */}
        <div className="mb-5">
          <nav aria-label="Breadcrumb" className="hidden lg:block text-sm text-slate-500 mb-1.5">
            <Link to="/" className="hover:text-navy-950">Home</Link>
            <span className="mx-1.5 text-slate-300">/</span>
            <Link to="/categories" className="hover:text-navy-950">Categories</Link>
            <span className="mx-1.5 text-slate-300">/</span>
            <span className="text-navy-950">{label}</span>
          </nav>
          <div className="flex items-baseline justify-between gap-3">
            <h1 className="hidden lg:block text-2xl font-semibold tracking-tight text-navy-950">{label}</h1>
            <span className="text-sm text-slate-500 tabular-nums">
              {filtered.length} {filtered.length === 1 ? "product" : "products"} in {region.name}
            </span>
          </div>
        </div>

        <div className="flex gap-6">
          {/* Filters desktop sidebar */}
          <div className="hidden md:block">
            <FilterSidebar
              brands={brands}
              selectedBrands={selectedBrands}
              onToggleBrand={toggleBrand}
              selectedPrice={selectedPrice}
              onSelectPrice={(r) => {
                setSelectedPrice(r);
                setPage(1);
              }}
              onClear={clearFilters}
            />
          </div>

          <div className="flex-1 min-w-0">
            {/* Mobile filter button aur sort dropdown */}
            <div className="flex items-center justify-between mb-4 gap-3">
              <button
                onClick={() => setShowFilters(true)}
                className="md:hidden flex h-10 items-center gap-1.5 text-sm font-medium text-navy-950 ring-1 ring-slate-200 bg-white rounded-xl px-3.5"
              >
                <FilterIcon />
                Filters
                {(selectedBrands.length > 0 || selectedPrice) && (
                  <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
                )}
              </button>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                aria-label="Sort products"
                className="ml-auto h-10 text-sm ring-1 ring-slate-200 border-0 rounded-xl px-3 bg-white text-navy-950 outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="popularity">Sort: Popularity</option>
                <option value="price_low">Price: Low to High</option>
                <option value="price_high">Price: High to Low</option>
                <option value="rating">Rating</option>
              </select>
            </div>

            {/* Selected active filters ke chips */}
            {(selectedBrands.length > 0 || selectedPrice) && (
              <div className="flex flex-wrap gap-2 mb-4">
                {selectedBrands.map((b) => (
                  <button
                    key={b}
                    onClick={() => toggleBrand(b)}
                    className="flex h-8 items-center gap-1.5 text-xs bg-white ring-1 ring-slate-200 text-slate-700 font-medium rounded-full px-3 hover:bg-slate-50"
                  >
                    {b} <span>×</span>
                  </button>
                ))}
                {selectedPrice && (
                  <button
                    onClick={() => setSelectedPrice(null)}
                    className="flex h-8 items-center gap-1.5 text-xs bg-white ring-1 ring-slate-200 text-slate-700 font-medium rounded-full px-3 hover:bg-slate-50"
                  >
                    {selectedPrice.label} <span>×</span>
                  </button>
                )}
              </div>
            )}

            {/* Products ka grid */}
            {pageItems.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-4">
                {pageItems.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            ) : (
              <div className="rounded-2xl bg-white ring-1 ring-slate-200/80">
                <EmptyState
                  icon={SearchIcon}
                  title="No products match these filters"
                  description="Try removing a brand or price filter."
                  actionLabel="Clear filters"
                  onAction={clearFilters}
                />
              </div>
            )}

            {/* Pages navigation pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  aria-label="Previous page"
                  className="h-10 w-10 rounded-xl ring-1 ring-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center"
                >
                  <ChevronLeftIcon className="h-4 w-4" />
                </button>
                {Array.from({ length: totalPages }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setPage(i + 1)}
                    aria-current={page === i + 1 ? "page" : undefined}
                    className={`h-10 w-10 rounded-xl text-sm font-medium tabular-nums transition-colors ${
                      page === i + 1
                        ? "bg-navy-950 text-white"
                        : "bg-white ring-1 ring-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  aria-label="Next page"
                  className="h-10 w-10 rounded-xl ring-1 ring-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center"
                >
                  <ChevronRightIcon className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Mobile screen ke liye bottom sheet filter */}
      {showFilters && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="Filters">
          <div
            className="bc-fade-in absolute inset-0 bg-slate-950/50"
            onClick={() => setShowFilters(false)}
          />
          <div className="bc-sheet-up absolute bottom-0 left-0 right-0 bg-surface rounded-t-3xl max-h-[85vh] overflow-y-auto p-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-300" aria-hidden="true" />
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-semibold text-navy-950">Filters</h3>
              <button
                onClick={() => setShowFilters(false)}
                aria-label="Close filters"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200"
              >
                <CloseIcon className="h-4 w-4" />
              </button>
            </div>
            <FilterSidebar
              brands={brands}
              selectedBrands={selectedBrands}
              onToggleBrand={toggleBrand}
              selectedPrice={selectedPrice}
              onSelectPrice={(r) => {
                setSelectedPrice(r);
                setPage(1);
              }}
              onClear={clearFilters}
            />
            <button
              onClick={() => setShowFilters(false)}
              className="w-full mt-4 h-12 bg-navy-950 hover:bg-navy-900 text-white text-sm font-semibold rounded-xl transition-colors"
            >
              Show {filtered.length} results
            </button>
          </div>
        </div>
      )}

      {!Capacitor.isNativePlatform() && <Footer />}
    </div>
  );
}

function FilterIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 6h16M7 12h10M10 18h4" />
    </svg>
  );
}