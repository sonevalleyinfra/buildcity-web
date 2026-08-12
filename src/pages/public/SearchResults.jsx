import { useMemo, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import Navbar from "../../components/Navbar";
import ProductCard from "../../components/ProductCard";
import { useRegion } from "../../context/RegionContext";

const ALL_KEYWORDS = [
  "cement", "paint", "steel", "tiles", "plumbing", "electrical",
  "hardware", "sanitary", "furniture", "drill", "pipe", "wire",
];

// TEMPORARY MOCK — replace with GET /api/v1/products?q= once backend is ready
function searchProducts(query, priceFactor) {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const matches = ALL_KEYWORDS.filter(
    (k) => k.includes(q) || q.includes(k)
  );
  const keywords = matches.length ? matches : [q];

  return keywords.flatMap((kw, ki) =>
    Array.from({ length: 4 }).map((_, i) => {
      const mrp = Math.round((300 + ((ki * 4 + i) * 173) % 4200) * priceFactor);
      const discount = i % 2 === 0 ? Math.round(mrp * 0.12) : 0;
      return {
        id: `search-${kw}-${i}`,
        name: `${kw[0].toUpperCase() + kw.slice(1)} Product ${i + 1}`,
        brand: "BuildCity Trusted Brand",
        img: `https://picsum.photos/seed/${kw}${i}/400/400`,
        mrp,
        price: mrp - discount,
        rating: (3.9 + ((ki + i) % 10) / 10).toFixed(1),
        reviews: 15 + ((ki + i) * 17) % 250,
      };
    })
  );
}

export default function SearchResults() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { region } = useRegion();
  const initialQuery = searchParams.get("q") || "";
  const [query, setQuery] = useState(initialQuery);

  const results = useMemo(
    () => searchProducts(searchParams.get("q") || "", region.priceFactor),
    [searchParams, region]
  );

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