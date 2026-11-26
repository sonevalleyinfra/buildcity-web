import { useMemo, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import Navbar from "../../components/Navbar";
import ProductCard from "../../components/ProductCard";
import MobileHeader from "../../components/ui/MobileHeader";
import { realMrp } from "../../utils/priceDisplay";
import SearchField from "../../components/ui/SearchField";
import EmptyState from "../../components/ui/EmptyState";
import ProductGridSkeleton from "../../components/ui/ProductGridSkeleton";
import { SearchIcon } from "../../components/ui/Icons";
import { useRegion } from "../../context/RegionContext";
import { useAdmin } from "../../context/AdminContext";
import { cleanProductImage } from "../../utils/productImage";

export default function SearchResults() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { region } = useRegion();
  const { products = [], productsLoading } = useAdmin();
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

      return {
        ...p,
        id: p.id,
        name: p.name,
        brand: p.brand || "BuildCity Certified",
        vendorName: p.vendorName || p.vendor?.shopName || "District Vendor",
        img: cleanProductImage(p, p.categoryName || p.category, p.name),
        mrp: realMrp(itemPrice, p.mrp),
        price: itemPrice,
      };
    });
  }, [products, activeQuery, region]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSearchParams(query ? { q: query } : {});
  };

  const shownQuery = (searchParams.get("q") || "").trim();

  return (
    <div data-storefront className="min-h-screen bg-surface pb-24 lg:pb-12">
      <div className="hidden lg:block">
        <Navbar />
      </div>
      <MobileHeader title="Search">
        <SearchField value={query} onChange={setQuery} onSubmit={handleSubmit} autoFocus={!shownQuery} />
      </MobileHeader>

      <main className="bc-fade-in max-w-6xl mx-auto px-4 sm:px-6 py-5 sm:py-6">
        <div className="mb-5">
          <nav aria-label="Breadcrumb" className="hidden lg:block text-sm text-slate-500 mb-1.5">
            <Link to="/" className="hover:text-navy-950">Home</Link>
            <span className="mx-1.5 text-slate-300">/</span>
            <span className="text-navy-950">Search</span>
          </nav>
          <h1 className="text-lg sm:text-2xl font-semibold tracking-tight text-navy-950 break-words">
            {shownQuery ? <>Results for “{shownQuery}”</> : "Search products"}
          </h1>
          {shownQuery && !productsLoading && (
            <p className="mt-0.5 text-sm text-slate-500 tabular-nums">
              {results.length} {results.length === 1 ? "product" : "products"} in {region.name}
            </p>
          )}
        </div>

        {productsLoading && shownQuery ? (
          <ProductGridSkeleton className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-4" />
        ) : results.length === 0 ? (
          <div className="rounded-2xl bg-white ring-1 ring-slate-200/80">
            <EmptyState
              icon={SearchIcon}
              title={shownQuery ? `No results for “${shownQuery}”` : "What are you looking for?"}
              description={
                shownQuery
                  ? `Check the spelling or try a broader word like “cement”, “TMT” or “paint”. Results are for ${region.name}.`
                  : "Search by product, brand or shop — for example “UltraTech” or “12mm TMT”."
              }
              actionLabel={shownQuery ? "Browse categories" : undefined}
              actionTo={shownQuery ? "/categories" : undefined}
            />
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-4">
            {results.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
