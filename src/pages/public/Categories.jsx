import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate, useSearchParams, useNavigationType } from "react-router-dom";
import { useAdmin } from "../../context/AdminContext";
import { useRegion } from "../../context/RegionContext";
import Navbar from "../../components/Navbar";
import ProductCard from "../../components/ProductCard";
import MobileHeader from "../../components/ui/MobileHeader";
import { countLabel } from "../../utils/priceDisplay";
import SearchField from "../../components/ui/SearchField";
import SectionHeader from "../../components/ui/SectionHeader";
import EmptyState from "../../components/ui/EmptyState";
import ProductGridSkeleton from "../../components/ui/ProductGridSkeleton";
import { GridIcon, PackageIcon } from "../../components/ui/Icons";
import Footer from "../../components/Footer";
import { Capacitor } from "@capacitor/core";
import { resolveCategoryBubbleImage } from "../vendor/utils/productImage";

const category8Grid = [
  { name: "Cement", countTag: "Cement", img: "/categories/cement.png" },
  { name: "Paints", countTag: "Paints", img: "/categories/paints.png" },
  { name: "Steel", countTag: "Steel", img: "/categories/steel.png" },
  { name: "Crushed Stone", countTag: "Crushed Stone", img: "/categories/crushed_stone.png" },
  { name: "Plumbing", countTag: "Plumbing", img: "/categories/plumbing.png" },
  { name: "Electrical", countTag: "Electrical", img: "/categories/steel.png" },
  { name: "Sanitary", countTag: "Sanitary", img: "/categories/plumbing.png" },
  { name: "Hardware", countTag: "Hardware", img: "/categories/rebars.png" },
  { name: "Tiles", countTag: "Tiles", img: "/categories/tiles.png" },
];

export default function Categories() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const navType = useNavigationType();
  const initialCat = searchParams.get("cat") || "All";

  const { products = [], productsLoading } = useAdmin();
  const { region } = useRegion();
  const [activePill, setActivePill] = useState(initialCat);
  const [searchQuery, setSearchQuery] = useState("");
  const productsSectionRef = useRef(null);

  const scrollToProducts = () => {
    if (productsSectionRef.current) {
      // Calculate smooth scroll offset so the category title is clearly visible below fixed/sticky navigation
      const yOffset = -70;
      const element = productsSectionRef.current;
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: Math.max(0, y), behavior: "smooth" });
    }
  };

  const handleSelectCategory = (catName, shouldScroll = true) => {
    setActivePill(catName);
    if (shouldScroll) {
      setTimeout(() => {
        scrollToProducts();
      }, 50);
    }
  };

  // If page loads with a specific category query parameter like ?cat=Cement, auto-scroll to products
  useEffect(() => {
    const catFromUrl = searchParams.get("cat");
    if (catFromUrl) {
      setActivePill(catFromUrl);
      // Only auto-scroll to products on fresh navigation, NEVER on back button (POP)
      if (navType !== "POP") {
        setTimeout(() => {
          scrollToProducts();
        }, 250);
      }
    }
  }, [searchParams, navType]);

  const handleSearch = (e) => {
    e.preventDefault();
    navigate(searchQuery ? `/search?q=${encodeURIComponent(searchQuery)}` : "/search");
  };

  // Real Database products filtered by district
  const districtProducts = useMemo(() => {
    const map = new Map();
    products.forEach((p) => {
      if (p.approvalStatus !== "APPROVED") return;

      const activeRegName = (region?.name || "Varanasi").toLowerCase().trim();
      const pRegName = (p.regionName || p.districtName || p.vendor?.region?.name || "varanasi").toLowerCase().trim();

      const matches = pRegName === activeRegName || pRegName.includes(activeRegName) || activeRegName.includes(pRegName);
      if (!matches) return;

      const isSusp =
        p.isVendorSuspended === true ||
        p.vendor?.status === "SUSPENDED" ||
        p.vendorStatus === "SUSPENDED" ||
        p.isActive === false;

      const key = `${(p.name || "").toLowerCase()}_${p.vendorId || ""}`;
      if (!map.has(key)) {
        map.set(key, {
          ...p,
          isVendorSuspended: Boolean(isSusp),
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

  // Dynamic counts for each of the category cards from live database + All option
  const dynamic8Cards = useMemo(() => {
    const allCard = {
      name: "All",
      isAll: true,
      count: (districtProducts || []).length,
      countLabel: countLabel((districtProducts || []).length, "product"),
      isComingSoon: false,
    };

    const list = category8Grid.map((c) => {
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
        count,
        countLabel: count > 0 ? countLabel(count, "product") : "Coming soon",
        isComingSoon: count === 0,
      };
    });

    return [allCard, ...list];
  }, [districtProducts]);

  return (
    <div data-storefront className="min-h-screen bg-[#F8FAFC] font-sans w-full max-w-full overflow-x-clip flex flex-col justify-between">
      <div className="hidden lg:block">
        <Navbar />
      </div>

      <MobileHeader title="Categories">
        <SearchField value={searchQuery} onChange={setSearchQuery} onSubmit={handleSearch} />
      </MobileHeader>

      <main className="bc-fade-in max-w-6xl w-full mx-auto px-4 pt-4 sm:pt-6 pb-24 lg:pb-12 space-y-7 flex-1">
        <section className="space-y-3">
          <SectionHeader title="Shop by category" />

          <div className="grid grid-cols-4 sm:grid-cols-5 lg:grid-cols-10 gap-2 sm:gap-3" role="listbox" aria-label="Categories">
            {dynamic8Cards.map((c) => {
              const isSelected = activePill.toLowerCase() === c.name.toLowerCase();
              const isComingSoon = c.isComingSoon;

              return (
                <button
                  key={c.name}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleSelectCategory(c.name)}
                  className={`group flex min-h-[108px] cursor-pointer flex-col items-center rounded-2xl p-2 pt-2.5 text-center transition-[box-shadow,background-color] duration-200 active:scale-[0.97] ${
                    isSelected
                      ? "bg-brand-50 ring-2 ring-brand-500"
                      : isComingSoon
                      ? "bg-slate-50 ring-1 ring-slate-200/70"
                      : "bg-white ring-1 ring-slate-200/80 hover:ring-slate-300 hover:shadow-[0_10px_24px_-16px_rgba(15,23,42,0.35)]"
                  }`}
                >
                  <span
                    className={`mb-2 flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full sm:h-14 sm:w-14 ${
                      c.isAll ? (isSelected ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600") : isComingSoon ? "bg-slate-100 opacity-60 grayscale" : "bg-slate-50"
                    }`}
                  >
                    {c.isAll ? (
                      <GridIcon className="h-6 w-6" />
                    ) : (
                      <img
                        src={c.img}
                        alt=""
                        className="h-full w-full rounded-full object-cover transition-transform duration-300 group-hover:scale-105"
                        onError={(e) => {
                          e.target.src = resolveCategoryBubbleImage(c.name);
                        }}
                      />
                    )}
                  </span>
                  <span
                    className={`line-clamp-2 text-xs font-medium leading-tight ${
                      isSelected ? "text-brand-800" : isComingSoon ? "text-slate-500" : "text-navy-950"
                    }`}
                  >
                    {c.name}
                  </span>
                  <span className={`mt-0.5 text-[11px] leading-tight ${isComingSoon ? "text-slate-400" : "text-slate-500"} tabular-nums`}>
                    {isComingSoon ? "Soon" : c.countLabel}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section ref={productsSectionRef} id="products-section" className="space-y-3 scroll-mt-20">
          <SectionHeader
            title={activePill === "All" ? "All products" : activePill}
            badge={
              !productsLoading && filteredCategoryProducts.length > 0 ? (
                <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 tabular-nums">
                  {filteredCategoryProducts.length}
                </span>
              ) : null
            }
          />
          {activePill !== "All" && (
            <div className="-mt-1">
              <button
                type="button"
                onClick={() => handleSelectCategory("All", false)}
                className="inline-flex h-8 items-center gap-1.5 rounded-full bg-white px-3 text-xs font-medium text-slate-700 ring-1 ring-slate-200 transition-colors hover:bg-slate-50 cursor-pointer"
              >
                {activePill}
                <span aria-hidden="true" className="text-slate-400">×</span>
                <span className="sr-only">Clear category filter</span>
              </button>
            </div>
          )}

          {productsLoading ? (
            <ProductGridSkeleton />
          ) : filteredCategoryProducts.length === 0 ? (
            <div className="rounded-2xl bg-white ring-1 ring-slate-200/80">
              <EmptyState
                icon={PackageIcon}
                title={`${activePill} is coming soon`}
                description={`We're adding verified ${activePill.toLowerCase()} suppliers in ${region?.name || "your district"}.`}
                actionLabel="Browse all products"
                onAction={() => handleSelectCategory("All", false)}
              />
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-2.5 sm:gap-3 lg:gap-4">
              {filteredCategoryProducts.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </section>
      </main>
      {!Capacitor.isNativePlatform() && <Footer />}
    </div>
  );
}
