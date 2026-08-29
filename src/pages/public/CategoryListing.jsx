import { useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import Navbar from "../../components/Navbar";
import BottomNav from "../../components/BottomNav";
import ProductCard from "../../components/ProductCard";
import FilterSidebar from "../../components/FilterSidebar";
import { useRegion } from "../../context/RegionContext";
import { useAdmin } from "../../context/AdminContext";

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
  cement: "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=400&q=80",
  paints: "https://images.unsplash.com/photo-1562259949-e8e7689d7828?auto=format&fit=crop&w=400&q=80",
  steel: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=400&q=80",
  plumbing: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=400&q=80",
  electrical: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=400&q=80",
  hardware: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=400&q=80",
  furniture: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=400&q=80",
};

const PAGE_SIZE = 9;

export default function CategoryListing() {
  const { slug } = useParams();
  const { region } = useRegion();
  const { products = [], masterProducts = [] } = useAdmin();
  const label = CATEGORY_LABELS[slug] || slug || "Products";

  const allProducts = useMemo(() => {
    const slugLower = (slug || "").toLowerCase();
    const map = new Map();

    // 1. First add live vendor products matching this category
    products.forEach((p) => {
      const isApproved = p.approvalStatus === "APPROVED" || p.approvalStatus === undefined || p.isActive === true;
      if (!isApproved) return;
      if (slugLower && slugLower !== "all") {
        const catName = (p.categoryName || "").toLowerCase();
        const catId = (p.categoryId || "").toLowerCase();
        const pName = (p.name || "").toLowerCase();
        const matches = catName.includes(slugLower) || slugLower.includes(catName) || catId === slugLower || pName.includes(slugLower);
        if (!matches) return;
      }

      const key = `${(p.name || "").toLowerCase()}_${p.vendorId || ""}`;
      if (!map.has(key)) {
        map.set(key, {
          id: p.id,
          name: p.name,
          brand: p.brand || "Generic",
          img: p.img || p.imageUrl || CATEGORY_IMAGES[slugLower] || "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=400&q=80",
          mrp: Math.round(Number(p.price || 100) * 1.15),
          price: Number(p.price) || 100,
          rating: "4.9",
          reviews: 42,
          vendorName: p.vendorName,
          vendorId: p.vendorId,
        });
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
    <div className="min-h-screen bg-surface pb-20 sm:pb-0">
      <Navbar />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6">

        {/* Breadcrumb(jo chota cut ka icon hai wo ) + heading */}
        <div className="mb-5">
          <div className="text-xs text-slate-400 mb-1">
            <Link to="/" className="hover:text-brand-500">Home</Link>
            <span className="mx-1.5">/</span>
            {label}
          </div>
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-navy-900">{label}</h1>
           <span className="text-sm text-slate-500">
  {filtered.length} products in {region.name}
</span>
          </div>
        </div>

        <div className="flex gap-6">
          {/* Filters - desktop ka sidebar  hai */}
          <div className="hidden sm:block">
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
            {/* Toolbar: mobile filter button + sort */}
            <div className="flex items-center justify-between mb-4 gap-3">
              <button
                onClick={() => setShowFilters(true)}
                className="sm:hidden flex items-center gap-1.5 text-sm font-medium text-navy-900 border border-slate-200 bg-white rounded-lg px-3 py-2"
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
                className="ml-auto text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-navy-900 outline-none"
              >
                <option value="popularity">Sort: Popularity</option>
                <option value="price_low">Price: Low to High</option>
                <option value="price_high">Price: High to Low</option>
                <option value="rating">Rating</option>
              </select>
            </div>

            {/* Active filter chips */}
            {(selectedBrands.length > 0 || selectedPrice) && (
              <div className="flex flex-wrap gap-2 mb-4">
                {selectedBrands.map((b) => (
                  <button
                    key={b}
                    onClick={() => toggleBrand(b)}
                    className="flex items-center gap-1.5 text-xs bg-brand-50 text-brand-600 font-medium rounded-full px-3 py-1.5"
                  >
                    {b} <span>×</span>
                  </button>
                ))}
                {selectedPrice && (
                  <button
                    onClick={() => setSelectedPrice(null)}
                    className="flex items-center gap-1.5 text-xs bg-brand-50 text-brand-600 font-medium rounded-full px-3 py-1.5"
                  >
                    {selectedPrice.label} <span>×</span>
                  </button>
                )}
              </div>
            )}

            {/* Product grid */}
            {pageItems.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
                {pageItems.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center text-slate-500 text-sm">
                Is filter ke sath koi product nahi mila. Filters clear karke dekho.
              </div>
            )}

            {/* Pagination  , Pages hai */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="h-9 w-9 rounded-lg border border-slate-200 bg-white text-slate-600 disabled:opacity-40 flex items-center justify-center"
                >
                  ‹
                </button>
                {Array.from({ length: totalPages }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setPage(i + 1)}
                    className={`h-9 w-9 rounded-lg text-sm font-medium ${
                      page === i + 1
                        ? "bg-brand-500 text-white"
                        : "bg-white border border-slate-200 text-slate-600"
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="h-9 w-9 rounded-lg border border-slate-200 bg-white text-slate-600 disabled:opacity-40 flex items-center justify-center"
                >
                  ›
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Filters -  mobile bottom sheet  Jo phone me dekhega */}
      {showFilters && (
        <div className="fixed inset-0 z-50 sm:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowFilters(false)}
          />
          <div className="absolute bottom-0 left-0 right-0 bg-surface rounded-t-2xl max-h-[80vh] overflow-y-auto p-4 pb-8">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-navy-900">Filters</h3>
              <button
                onClick={() => setShowFilters(false)}
                className="text-slate-400 text-xl leading-none"
              >
                ×
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
              className="w-full mt-4 bg-brand-500 text-white text-sm font-semibold rounded-xl py-3"
            >
              Show {filtered.length} results
            </button>
          </div>
        </div>
      )}

     
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