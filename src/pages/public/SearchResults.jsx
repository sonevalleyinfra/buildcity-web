import { useMemo, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import Navbar from "../../components/Navbar";
import ProductCard from "../../components/ProductCard";
import { useRegion } from "../../context/RegionContext";
import { useAdmin } from "../../context/AdminContext";

export default function SearchResults() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { region } = useRegion();
  const { products = [], masterProducts = [] } = useAdmin();
  const initialQuery = searchParams.get("q") || "";
  const [query, setQuery] = useState(initialQuery);

  const activeQuery = (searchParams.get("q") || "").trim().toLowerCase();

  const results = useMemo(() => {
    if (!activeQuery || activeQuery.trim().length === 0) return [];

    const activeRegName = (region?.name || "Varanasi").toLowerCase().trim();

    // 1. Filter ALL approved vendor product listings in active region
    const vendorListingsInRegion = products.filter((p) => {
      if (p.approvalStatus !== "APPROVED" || p.isActive === false || p.isVendorSuspended) return false;

      const pRegName = (p.regionName || p.districtName || p.vendor?.region?.name || "").toLowerCase().trim();
      if (pRegName && activeRegName) {
        const matchesReg = pRegName === activeRegName || pRegName.includes(activeRegName) || activeRegName.includes(pRegName);
        if (!matchesReg) return false;
      }

      return true;
    });

    // 2. Filter vendor listings matching active search query
    const matchedListings = vendorListingsInRegion.filter((p) => {
      const name = (p.name || "").toLowerCase();
      const brand = (p.brand || "").toLowerCase();
      const category = (p.categoryName || p.category?.name || p.type || "").toLowerCase();
      const grade = (p.grade || "").toLowerCase();
      const desc = (p.desc || p.description || "").toLowerCase();
      const seller = (p.vendorName || p.vendor?.shopName || "").toLowerCase();

      return (
        name.includes(activeQuery) ||
        brand.includes(activeQuery) ||
        category.includes(activeQuery) ||
        grade.includes(activeQuery) ||
        desc.includes(activeQuery) ||
        seller.includes(activeQuery)
      );
    });

    // 3. Map each vendor's listing with their seller shop name and price
    return matchedListings.map((p) => {
      const itemPrice = Math.round(Number(p.price) || 100);
      const calculatedMrp = p.mrp || Math.round(itemPrice * 1.15);

      return {
        id: p.id,
        name: p.name,
        brand: p.brand || "Vendor Certified",
        vendorName: p.vendorName || p.vendor?.shopName || "District Vendor",
        img: p.img || p.imageUrl || "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=400&q=80",
        mrp: calculatedMrp,
        price: itemPrice,
        rating: p.rating || "4.9",
        reviews: p.reviews || 36,
      };
    });
  }, [products, activeQuery, region]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSearchParams(query ? { q: query } : {});
  };

  return (
    <div className="min-h-screen bg-surface pb-20">
      <Navbar />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        <form onSubmit={handleSubmit} className="mb-5 sm:hidden">
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-3">
            <SearchIcon />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search for products, brands, services..."
              className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
            />
          </div>
        </form>

        <div className="mb-5">
          <div className="text-xs text-slate-400 mb-1">
            <Link to="/" className="hover:text-brand-500">Home</Link>
            <span className="mx-1.5">/</span>
            Search
          </div>
          <h1 className="text-xl font-bold text-navy-900">
            {searchParams.get("q")
              ? `Results for "${searchParams.get("q")}"`
              : "Search products"}
          </h1>
          <p className="text-sm text-slate-500">
            {results.length} products found in {region.name}
          </p>
        </div>

        {results.length === 0 ? (
          <div className="bg-white rounded-xl border border-dashed border-slate-300 p-14 text-center">
            <span className="text-4xl mb-3 inline-block">🔍</span>
            <h3 className="font-bold text-navy-900 mb-1">
              {searchParams.get("q") ? "No products found" : "Search for something"}
            </h3>
            <p className="text-sm text-slate-500">
              Try "cement", "paint", "steel" ya koi aur product/brand naam.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {results.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </main>
    </div>
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