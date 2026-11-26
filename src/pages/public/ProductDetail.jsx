import { useMemo, useState, useEffect } from "react";
import { useParams, useNavigate, useLocation, Link } from "react-router-dom";
import Navbar from "../../components/Navbar";
import MobileHeader from "../../components/ui/MobileHeader";
import EmptyState from "../../components/ui/EmptyState";
import { ArrowRightIcon, CheckIcon, ChevronRightIcon, MinusIcon, PackageIcon, PlusIcon, TruckIcon } from "../../components/ui/Icons";
import ProductCard from "../../components/ProductCard";
import ProductImageSlider, { getProductImages } from "../../components/ProductImageSlider";
import { useCart } from "../../context/CartContext";
import { useRegion } from "../../context/RegionContext";
import { useAdmin } from "../../context/AdminContext";
import { useAuth } from "../../context/AuthContext";
import { useOrders } from "../../context/OrderContext";
import { authFetch } from "../../config/authFetch";
import { API_BASE_URL } from "../../config/api";
import { generateProductPacks, STEEL_DIAMETERS, getDiameterPrice } from "../../utils/productPacks";
import { getCategorySpec } from "../../utils/categoryAttributes";



const DEMO_NAMES = new Set([
  "rahul singh",
  "vikram malhotra",
  "amit sharma",
  "rahul s.",
  "vikram m.",
  "amit s.",
  "priya v.",
  "rakesh k.",
  "priya verma",
  "rakesh kumar"
]);

function filterOutDemoReviews(list) {
  if (!Array.isArray(list)) return [];
  return list.filter((r) => {
    if (!r || !r.name) return false;
    const nameLower = r.name.toLowerCase().trim();
    return !DEMO_NAMES.has(nameLower);
  });
}

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const userRole = String(user?.role || "").toLowerCase();
  const isPartner = ["admin", "dr", "district_rep", "vendor"].includes(userRole) || Boolean(user?.drInfo) || Boolean(user?.vendorInfo);
  const isCustomer = Boolean(user && !isPartner);
  const { addItem } = useCart();
  const { region } = useRegion();
  const { products = [], masterProducts = [], vendors = [], productsLoading } = useAdmin();
  const { orders = [] } = useOrders();

  const [directProduct, setDirectProduct] = useState(null);
  const [directLoading, setDirectLoading] = useState(false);

  // Cloud API se direct product fetch karne ka fallback effect
  useEffect(() => {
    const decodedId = decodeURIComponent(id || "").trim();
    const existing = products.find(
      (p) =>
        p.id === id ||
        p.id === decodedId ||
        (p.name && p.name.toLowerCase() === decodedId.toLowerCase()) ||
        (p.name && encodeURIComponent(p.name) === id)
    );

    if (!existing) {
      setDirectLoading(true);
      authFetch(`${API_BASE_URL}/api/v1/public-catalog`)
        .then((r) => r.json())
        .then((data) => {
          const list = Array.isArray(data) ? data : (data?.listings || []);
          const found = list.find(
            (l) =>
              l.id === id ||
              l.id === decodedId ||
              (l.name && l.name.toLowerCase() === decodedId.toLowerCase()) ||
              (l.name && encodeURIComponent(l.name) === id)
          );
          if (found) {
            const isSusp = found.isVendorSuspended || found.vendor?.status === "SUSPENDED" || found.isActive === false;
            setDirectProduct({ ...found, isVendorSuspended: Boolean(isSusp) });
          }
          setDirectLoading(false);
        })
        .catch(() => setDirectLoading(false));
    } else {
      setDirectProduct(null);
    }
  }, [id, products]);

  const [syncTick, setSyncTick] = useState(0);

  // Vendor dwara lot price ya discount badalne par customer page turant bina reload ke sync hoga
  useEffect(() => {
    const handleSync = () => setSyncTick((t) => t + 1);
    window.addEventListener("buildcity_products_updated", handleSync);
    window.addEventListener("storage", handleSync);
    return () => {
      window.removeEventListener("buildcity_products_updated", handleSync);
      window.removeEventListener("storage", handleSync);
    };
  }, []);

  const product = useMemo(() => {
    const decodedId = decodeURIComponent(id || "").trim();
    let baseProd =
      products.find(
        (p) =>
          p.id === id ||
          p.id === decodedId ||
          (p.name && p.name.toLowerCase() === decodedId.toLowerCase()) ||
          (p.name && encodeURIComponent(p.name) === id)
      ) || directProduct;

    if (!baseProd) {
      try {
        const cached = JSON.parse(localStorage.getItem("buildcity_products") || "[]");
        if (Array.isArray(cached) && cached.length > 0) {
          baseProd = cached.find(
            (p) =>
              p.id === id ||
              p.id === decodedId ||
              (p.name && p.name.toLowerCase() === decodedId.toLowerCase()) ||
              (p.name && encodeURIComponent(p.name) === id)
          );
        }
      } catch {}
    }

    // Helper: checks if a product listing belongs to the currently active customer region
    const activeRegName = String(region?.name || "Varanasi").toLowerCase().trim();
    const activeRegId = String(region?.id || "").toLowerCase().trim();

    const isListingInRegion = (p) => {
      if (!p) return false;
      const pRegName = String(p.regionName || p.districtName || p.vendor?.region?.name || p.vendor?.districtName || "").toLowerCase().trim();
      const pRegId = String(p.regionId || p.vendor?.regionId || p.vendor?.region?.id || "").toLowerCase().trim();
      return (activeRegId && pRegId && activeRegId === pRegId) ||
             (activeRegName && pRegName && (pRegName === activeRegName || pRegName.includes(activeRegName) || activeRegName.includes(pRegName)));
    };

    let realProd = baseProd;
    let isDeliverable = true;
    let switchedVendor = false;

    if (baseProd) {
      const inCurrentRegion = isListingInRegion(baseProd);

      if (!inCurrentRegion) {
        // SMART VENDOR AUTO-SWITCH (Option 3 - Blinkit Style):
        // If current product is from another region, check if a certified vendor in THIS region sells the same item
        const baseMasterId = baseProd.masterProductId || baseProd.masterProduct?.id;
        const baseNormName = String(baseProd.name || "").toLowerCase().trim();

        const counterpart = products.find((p) => {
          if (!p || p.isActive === false) return false;
          if (p.isVendorSuspended === true || p.vendor?.status === "SUSPENDED" || p.vendorStatus === "SUSPENDED") return false;
          if (!isListingInRegion(p)) return false;

          // Match 1: same master product ID
          if (baseMasterId && (p.masterProductId === baseMasterId || p.masterProduct?.id === baseMasterId)) {
            return true;
          }
          // Match 2: same exact product name
          const pName = String(p.name || "").toLowerCase().trim();
          if (pName && baseNormName && pName === baseNormName) {
            return true;
          }
          return false;
        });

        if (counterpart) {
          // Local vendor found in new region! Automatically switch:
          realProd = counterpart;
          isDeliverable = true;
          switchedVendor = true;
        } else {
          // No vendor in this region carries this item -> Mark as Not Deliverable
          realProd = baseProd;
          isDeliverable = false;
          switchedVendor = false;
        }
      }
    }

    if (realProd) {
      let resolvedMrp = Number(realProd.mrp || 0);
      if (resolvedMrp <= 0) {
        try {
          const storedMrps = JSON.parse(localStorage.getItem("buildcity_listing_mrps") || "{}");
          if (storedMrps[realProd.id] && Number(storedMrps[realProd.id]) > 0) {
            resolvedMrp = Number(storedMrps[realProd.id]);
          }
        } catch {}
      }
      const mrp = resolvedMrp > 0
        ? resolvedMrp
        : (realProd.masterProduct?.mrp ? Number(realProd.masterProduct.mrp) : 0);

      const extractedImages = getProductImages(realProd);
      const isSuspended =
        realProd.isVendorSuspended === true ||
        realProd.vendor?.status === "SUSPENDED" ||
        realProd.isActive === false;
      const resolvedCategory =
        (typeof realProd.category === "string" ? realProd.category : realProd.category?.name) ||
        realProd.categoryName ||
        (typeof realProd.masterProduct?.category === "string" ? realProd.masterProduct?.category : realProd.masterProduct?.category?.name) ||
        realProd.masterProduct?.categoryName ||
        "";

      const catSpec = getCategorySpec(resolvedCategory);

      const resolvedStockQty = realProd.stockQty !== undefined && realProd.stockQty !== null
        ? Number(realProd.stockQty)
        : (realProd.masterProduct?.stockQty !== undefined && realProd.masterProduct?.stockQty !== null ? Number(realProd.masterProduct.stockQty) : 100);

      return {
        id: realProd.id,
        name: realProd.name,
        brand: realProd.brand || "Generic",
        category: resolvedCategory || "Material",
        catSpec,
        grade: realProd.grade || "",
        type: realProd.type || "",
        vendorId: realProd.vendorId,
        vendorName: realProd.vendorName || realProd.vendor?.shopName,
        isVendorSuspended: isSuspended,
        isDeliverable: isDeliverable && !isSuspended,
        switchedVendor: switchedVendor,
        deliveryRegion: region?.name || "Varanasi",
        images: extractedImages,
        mrp,
        price: Number(realProd.price) || 100,
        rating: 5.0,
        reviews: 0,
        inStock: resolvedStockQty > 0 && !isSuspended && isDeliverable,
        stockQty: resolvedStockQty,
        unit: realProd.unit || "Unit",
        customPacks: (() => {
          let cp = realProd.customPacks || realProd.custom_packs;
          if (typeof cp === "string") {
            try { cp = JSON.parse(cp); } catch {}
          }
          if (cp && typeof cp === "object" && !Array.isArray(cp) && Array.isArray(cp.packs)) {
            return cp.packs;
          }
          if (Array.isArray(cp) && cp.length > 0) return cp;
          try {
            const stored = JSON.parse(localStorage.getItem("buildcity_custom_packs") || "{}");
            if (stored[realProd.id]) {
              const val = stored[realProd.id];
              if (Array.isArray(val) && val.length > 0) return val;
              if (val && typeof val === "object" && Array.isArray(val.packs)) return val.packs;
            }
          } catch {}
          return null;
        })(),
        bulkEnabled: (() => {
          if (realProd.bulkEnabled !== undefined) return Boolean(realProd.bulkEnabled);
          if (realProd.bulk_enabled !== undefined) return Boolean(realProd.bulk_enabled);
          let cp = realProd.customPacks || realProd.custom_packs;
          if (typeof cp === "string") {
            try { cp = JSON.parse(cp); } catch {}
          }
          if (cp && typeof cp === "object" && !Array.isArray(cp) && cp.bulkEnabled !== undefined) {
            return Boolean(cp.bulkEnabled);
          }
          try {
            const stored = JSON.parse(localStorage.getItem("buildcity_bulk_enabled") || "{}");
            if (stored[realProd.id] !== undefined) return Boolean(stored[realProd.id]);
          } catch {}
          return false;
        })(),
        mmPricingEnabled: (() => {
          if (realProd.mmPricingEnabled !== undefined) return Boolean(realProd.mmPricingEnabled);
          if (realProd.diameterPricingEnabled !== undefined) return Boolean(realProd.diameterPricingEnabled);
          let cp = realProd.customPacks || realProd.custom_packs;
          if (typeof cp === "string") {
            try { cp = JSON.parse(cp); } catch {}
          }
          if (cp && typeof cp === "object" && !Array.isArray(cp) && cp.mmPricingEnabled !== undefined) {
            return Boolean(cp.mmPricingEnabled);
          }
          try {
            const stored = JSON.parse(localStorage.getItem("buildcity_mm_pricing") || "{}");
            if (stored[realProd.id] !== undefined) return Boolean(stored[realProd.id]);
          } catch {}
          return false;
        })(),
        mmRates: (() => {
          if (realProd.mmRates) return realProd.mmRates;
          let cp = realProd.customPacks || realProd.custom_packs;
          if (typeof cp === "string") {
            try { cp = JSON.parse(cp); } catch {}
          }
          if (cp && typeof cp === "object" && cp.mmRates) {
            return cp.mmRates;
          }
          try {
            const stored = JSON.parse(localStorage.getItem("buildcity_mm_rates") || "{}");
            if (stored[realProd.id]) return stored[realProd.id];
          } catch {}
          return null;
        })(),
        description:
          (realProd.description && realProd.description.trim()) ||
          (realProd.masterProduct?.description && realProd.masterProduct.description.trim()) ||
          (masterProducts.find((m) => m.id === realProd.masterProductId || m.id === realProd.id || (m.name && realProd.name && m.name.toLowerCase() === realProd.name.toLowerCase()))?.description) ||
          `High-quality certified ${realProd.name} by ${realProd.brand || "Authorized Brand"}. Supplied directly via BuildCity Certified Delivery Network.`,
        specs: [
          { label: "Fulfillment", value: `BuildCity Certified Network (${region?.name || "Local"})` },
          { label: "Category", value: catSpec.label || resolvedCategory || "Building Material" },
          { label: "Brand", value: realProd.brand || "Generic" },
          ...(realProd.type ? [{ label: catSpec.typeLabel || "Product Type", value: realProd.type }] : []),
          ...(realProd.grade ? [{ label: catSpec.gradeLabel || "Grade / Specification", value: realProd.grade }] : []),
          { label: catSpec.unitLabel || "Packaging Unit", value: realProd.unit || "Unit" },
          ...(realProd.customPacks?.diameter ? [{ label: "Rebar Diameter", value: realProd.customPacks.diameter }] : []),
          ...(realProd.customPacks?.tileSize ? [{ label: "Tile Dimensions", value: realProd.customPacks.tileSize }] : []),
          ...(realProd.customPacks?.pipeSize ? [{ label: "Pipe Bore / Size", value: realProd.customPacks.pipeSize }] : []),
          ...(realProd.customPacks?.availablePackSizes && Array.isArray(realProd.customPacks.availablePackSizes)
            ? [{ label: "Available Pack Sizes", value: realProd.customPacks.availablePackSizes.join(", ") }]
            : []),
          { label: "Available Stock", value: `${resolvedStockQty} units` },
        ],
        reviewsList: [],
      };
    }
    return null;
  }, [id, products, masterProducts, directProduct, region, syncTick]);

  // Check kar rahe hain ki vendor suspend toh nahi hai
  const isVendorSuspended = useMemo(() => {
    if (!product) return false;
    if (product.isVendorSuspended) return true;
    if (product.vendorId && Array.isArray(vendors) && vendors.length > 0) {
      const v = vendors.find(
        (v) => String(v.id).toLowerCase() === String(product.vendorId).toLowerCase()
      );
      if (v && v.status === "SUSPENDED") return true;
    }
    return false;
  }, [product, vendors]);

  const [qty, setQty] = useState(1);
  const [justAdded, setJustAdded] = useState(false);

  // 1. Detect if product is Steel / TMT Rebar / Sariya
  const isSteelProduct = useMemo(() => {
    if (!product) return false;
    const cat = String(
      (typeof product.category === "string" ? product.category : product.category?.name) ||
      product.categoryName ||
      product.masterProduct?.categoryName ||
      ""
    ).toLowerCase();
    const name = String(product.name || "").toLowerCase();
    return (
      cat.includes("steel") ||
      cat.includes("rebar") ||
      cat.includes("tmt") ||
      cat.includes("iron") ||
      cat.includes("sariya") ||
      name.includes("steel") ||
      name.includes("tiscon") ||
      name.includes("tmt") ||
      name.includes("rebar") ||
      name.includes("saria") ||
      name.includes("sariya") ||
      name.includes("jindal") ||
      name.includes("kamdhenu") ||
      name.includes("sail") ||
      name.includes("rungta")
    );
  }, [product]);

  const mmRates = useMemo(() => {
    if (!product) return null;
    let rates = product.mmRates || product.customPacks?.mmRates || null;
    if (typeof rates === "string") {
      try { rates = JSON.parse(rates); } catch {}
    }
    return rates;
  }, [product]);

  // 2. Identify initial diameter from product name or customPacks (ensuring active)
  const initialDiameter = useMemo(() => {
    if (!product) return "12mm";
    const name = product.name || "";
    let candidate = "12mm";
    for (const d of STEEL_DIAMETERS) {
      if (name.toLowerCase().includes(d.toLowerCase())) {
        candidate = d;
        break;
      }
    }
    if (product.customPacks && typeof product.customPacks === "object" && product.customPacks.diameter) {
      candidate = product.customPacks.diameter;
    }
    if (mmRates && mmRates[candidate]?.active === false) {
      const firstActive = STEEL_DIAMETERS.find((d) => mmRates[d]?.active !== false);
      if (firstActive) candidate = firstActive;
    }
    return candidate;
  }, [product, mmRates]);

  const [selectedDiameter, setSelectedDiameter] = useState(initialDiameter);

  useEffect(() => {
    setSelectedDiameter(initialDiameter);
  }, [initialDiameter, product?.id]);

  // 3. Dynamic price based on selected diameter for steel products (ONLY if vendor turned mm pricing ON)
  const isMmPricingOn = Boolean(product?.mmPricingEnabled === true || product?.hasDiameterPricing === true || product?.diameterPricingEnabled === true);

  const diameterAdjustedProduct = useMemo(() => {
    if (!product) return null;
    if (!isSteelProduct || !isMmPricingOn) return product;

    const basePrice = Number(product.price) || 680;
    const baseMrp = Number(product.mrp) || Math.round(basePrice * 1.15);
    const customRate = mmRates?.[selectedDiameter];
    const diaPrice = (customRate && Number(customRate.price) > 0)
      ? Number(customRate.price)
      : getDiameterPrice(basePrice, selectedDiameter, initialDiameter);
    const diaMrp = (customRate && Number(customRate.mrp) > 0)
      ? Number(customRate.mrp)
      : getDiameterPrice(baseMrp, selectedDiameter, initialDiameter);

    return {
      ...product,
      price: diaPrice,
      mrp: diaMrp,
      selectedDiameter: selectedDiameter,
    };
  }, [product, isSteelProduct, isMmPricingOn, selectedDiameter, initialDiameter, mmRates]);

  // Rule-based automatic packs calculate karte hai
  const packs = useMemo(
    () => generateProductPacks(diameterAdjustedProduct || product),
    [diameterAdjustedProduct, product]
  );
  const [selectedPackIndex, setSelectedPackIndex] = useState(0);

  // Jab product badle ya diameter badle toh pehla pack select karo
  useEffect(() => {
    setSelectedPackIndex(0);
  }, [product?.id, selectedDiameter]);

  const selectedPack = packs[selectedPackIndex] || packs[0];
  const currentPrice = selectedPack
    ? selectedPack.price
    : (diameterAdjustedProduct ? diameterAdjustedProduct.price : (product?.price || 0));
  const currentMrp = selectedPack
    ? selectedPack.mrp
    : (diameterAdjustedProduct ? diameterAdjustedProduct.mrp : (product?.mrp || 0));

  // Jab product badle toh page top par smoothly scroll karo
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [id]);

  // "You May Also Like" - Cross-selling & Complementary Products matching logic
  // STRICT RULE: Only active, approved vendor products from the CURRENT region.
  // NO generic master catalog items, NO other regions. If only 1-2 exist, show only 1-2.
  const similarProducts = useMemo(() => {
    if (!product) return [];

    const currentCat = String(
      (typeof product.category === "string" ? product.category : product.category?.name) ||
      product.categoryName ||
      product.masterProduct?.categoryName ||
      ""
    ).toLowerCase().trim();

    const currentId = String(product.id || id || "").toLowerCase().trim();
    const currentName = String(product.name || "").toLowerCase().trim();

    // Active customer region details
    const activeRegName = String(region?.name || "Varanasi").toLowerCase().trim();
    const activeRegId = String(region?.id || "").toLowerCase().trim();

    // Smart Cross-sell / Complementary category mapping
    const COMPLEMENTARY_MAP = {
      // Agar user Cement par hai -> Paints/Colors, Steel/TMT, Waterproofing, Putty, Tiles
      cement: ["paint", "color", "steel", "waterproof", "putty", "tile"],
      // Agar user Paint/Color par hai -> Putty, Primer, Waterproofing, Tools/Hardware, Tiles, Cement
      paint: ["putty", "primer", "waterproof", "brush", "hardware", "tile", "cement"],
      paints: ["putty", "primer", "waterproof", "brush", "hardware", "tile", "cement"],
      color: ["paint", "putty", "primer", "waterproof", "brush", "hardware", "cement"],
      // Agar user Steel par hai -> Cement, Hardware, Binding Wire, Pipes
      steel: ["cement", "hardware", "wire", "pipe", "plumb"],
      // Agar user Tiles par hai -> Bathware, Sanitary, Cement, Adhesive, Paints
      tile: ["bathware", "sanitary", "cement", "adhesive", "paint"],
      tiles: ["bathware", "sanitary", "cement", "adhesive", "paint"],
      // Agar user Bathware/Sanitary par hai -> Tiles, Plumbing, Pipes, Paints
      bathware: ["tile", "sanitary", "pipe", "plumb", "paint"],
      sanitary: ["tile", "bathware", "pipe", "plumb", "hardware"],
      // Agar user Plumbing/Pipes par hai -> Bathware, Sanitary, Hardware, Tiles
      plumbing: ["bathware", "sanitary", "tile", "hardware", "pipe"],
      pipe: ["plumb", "bathware", "sanitary", "hardware"],
      pipes: ["plumb", "bathware", "sanitary", "hardware"],
      // Agar user Electrical par hai -> Hardware, Tools, Paints
      electrical: ["hardware", "tool", "paint", "pipe"],
    };

    // Find target complementary category keywords
    let targetKeywords = [];
    for (const [key, targets] of Object.entries(COMPLEMENTARY_MAP)) {
      if (currentCat.includes(key) || currentName.includes(key)) {
        targetKeywords = [...targetKeywords, ...targets];
      }
    }
    targetKeywords = Array.from(new Set(targetKeywords));

    const seenIds = new Set([currentId]);
    if (id) seenIds.add(String(id).toLowerCase().trim());

    // Helper: does candidate match complementary targets?
    const matchesTarget = (p) => {
      const pCat = String(
        (typeof p.category === "string" ? p.category : p.category?.name) ||
        p.categoryName ||
        p.masterProduct?.categoryName ||
        ""
      ).toLowerCase().trim();
      const pName = String(p.name || "").toLowerCase().trim();

      if (targetKeywords.length === 0) {
        return pCat !== currentCat;
      }
      return targetKeywords.some((kw) => pCat.includes(kw) || pName.includes(kw));
    };

    // Helper: candidate validity check (strict region & vendor checks)
    const isValid = (p) => {
      if (!p || p.isActive === false) return false;
      if (p.isVendorSuspended === true || p.vendor?.status === "SUSPENDED" || p.vendorStatus === "SUSPENDED") return false;
      if (p.approvalStatus !== "APPROVED" && p.approvalStatus !== undefined) return false;

      const pId = String(p.id || "").toLowerCase().trim();
      if (seenIds.has(pId)) return false;
      if (currentName && String(p.name || "").toLowerCase().trim() === currentName) return false;

      // STRICT REGION CHECK: Product MUST belong to the current active customer region
      const pRegName = String(p.regionName || p.districtName || p.vendor?.region?.name || p.vendor?.districtName || "").toLowerCase().trim();
      const pRegId = String(p.regionId || p.vendor?.regionId || p.vendor?.region?.id || "").toLowerCase().trim();

      const matchesRegion =
        (activeRegId && pRegId && activeRegId === pRegId) ||
        (activeRegName && pRegName && (pRegName === activeRegName || pRegName.includes(activeRegName) || activeRegName.includes(pRegName)));

      return Boolean(matchesRegion);
    };

    if (!Array.isArray(products) || products.length === 0) return [];

    // Filter ONLY valid products from the current region that match complementary targets
    const matched = products.filter((p) => isValid(p) && matchesTarget(p));

    // Sort by stock quantity descending so in-stock items come first
    matched.sort((a, b) => (Number(b.stockQty) || 0) - (Number(a.stockQty) || 0));

    // Jitne real products is region me hain sirf wahi dikhenge (maximum 4)
    return matched.slice(0, 4);
  }, [product, id, products, region]);

  const targetProductId = useMemo(() => {
    return String(product?.id || id || "").trim();
  }, [product?.id, id]);

  // Product ke customer reviews ka state aur database sync
  const [reviewsList, setReviewsList] = useState(() => {
    try {
      const saved = localStorage.getItem(`buildcity_reviews_${id}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        const clean = filterOutDemoReviews(parsed);
        return clean;
      }
    } catch {}
    return [];
  });

  const [newRating, setNewRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewerName, setReviewerName] = useState(user?.name || "");
  const [reviewComment, setReviewComment] = useState("");
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [reviewError, setReviewError] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // Product ID badalane par reviews reset aur sync karo
  useEffect(() => {
    if (!targetProductId) return;
    try {
      const saved = localStorage.getItem(`buildcity_reviews_${targetProductId}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        const clean = filterOutDemoReviews(parsed);
        setReviewsList(clean);
        return;
      }
    } catch {}
    setReviewsList([]);
  }, [targetProductId]);

  useEffect(() => {
    if (user?.name && !reviewerName) {
      setReviewerName(user.name);
    }
  }, [user]);

  // Backend API se live reviews fetch karne ka function
  useEffect(() => {
    if (!targetProductId) return;
    let isMounted = true;
    authFetch(`${API_BASE_URL}/api/v1/reviews?productId=${encodeURIComponent(targetProductId)}`)
      .then((res) => {
        if (!res.ok) throw new Error("API status " + res.status);
        return res.json();
      })
      .then((data) => {
        if (isMounted && Array.isArray(data)) {
          const cleanData = filterOutDemoReviews(data);
          setReviewsList(cleanData);
          try {
            localStorage.setItem(`buildcity_reviews_${targetProductId}`, JSON.stringify(cleanData));
          } catch {}
        }
      })
      .catch((err) => {
        console.warn("Failed to fetch live DB reviews, keeping local state:", err);
      });
    return () => {
      isMounted = false;
    };
  }, [targetProductId]);

  // Average star rating aur total reviews live calculate karna
  const avgRating = useMemo(() => {
    if (!reviewsList || reviewsList.length === 0) return 5.0;
    const sum = reviewsList.reduce((acc, r) => acc + Number(r.rating || 5), 0);
    return (sum / reviewsList.length).toFixed(1);
  }, [reviewsList]);

  // Sirf wahi customer review de sakta hai jisne yeh product purchase kiya ho
  const hasPurchased = useMemo(() => {
    if (!user || !orders || orders.length === 0 || !product) return false;

    const currentProdId = String(product.id || id || "").toLowerCase().trim();
    const currentProdName = String(product.name || "").toLowerCase().trim();
    const currentMasterId = String(product.masterProductId || "").toLowerCase().trim();

    return orders.some((order) => {
      const status = String(order.status || "").toUpperCase();
      if (status === "CANCELLED" || status === "REJECTED") return false;

      const items = Array.isArray(order.items) ? order.items : [];
      return items.some((item) => {
        if (!item) return false;
        const itemId = String(item.productId || item.id || "").toLowerCase().trim();
        const itemName = String(item.name || item.productName || "").toLowerCase().trim();
        const itemMasterId = String(item.masterProductId || "").toLowerCase().trim();

        if (currentProdId && (itemId === currentProdId || itemId.startsWith(currentProdId))) return true;
        if (currentMasterId && (itemMasterId === currentMasterId || itemId === currentMasterId)) return true;
        if (currentProdName && (itemName === currentProdName || itemName.includes(currentProdName))) return true;
        return false;
      });
    });
  }, [user, orders, product, id]);

  // Ek user ek product par sirf ek hi baar review de sakta hai
  const hasAlreadyReviewed = useMemo(() => {
    if (!user) return false;
    const userName = String(user.name || "").toLowerCase().trim();
    const userId = String(user.id || "").toLowerCase().trim();
    const userPhone = String(user.phone || "").toLowerCase().trim();

    // 1. Check in loaded reviews list
    const inList = reviewsList.some((r) => {
      if (!r) return false;
      if (r.userId && userId && String(r.userId).toLowerCase().trim() === userId) return true;
      if (r.customerId && userId && String(r.customerId).toLowerCase().trim() === userId) return true;
      if (r.phone && userPhone && String(r.phone).toLowerCase().trim() === userPhone) return true;
      if (r.userPhone && userPhone && String(r.userPhone).toLowerCase().trim() === userPhone) return true;
      if (r.name && userName && String(r.name).toLowerCase().trim() === userName) return true;
      return false;
    });
    if (inList) return true;

    // 2. Local storage check for persistent 1-review guarantee
    try {
      const storageKey = `buildcity_reviewed_${user.id || user.phone || 'me'}_${targetProductId}`;
      if (localStorage.getItem(storageKey) === "true") return true;
    } catch {}

    return false;
  }, [user, reviewsList, targetProductId]);

  const currentDiscountPct = selectedPack
    ? (selectedPack.discountPct || 0)
    : (product?.mrp && Number(product.mrp) > Number(product.price))
    ? Math.round(((Number(product.mrp) - Number(product.price)) / Number(product.mrp)) * 100)
    : 0;

  const handleAddToCart = () => {
    if (!product?.isDeliverable) return;
    const isCustomPack = selectedPack && selectedPack.qty > 1;
    const effectivePrice = selectedPack ? selectedPack.price : (diameterAdjustedProduct ? diameterAdjustedProduct.price : product.price);
    const effectiveMrp = selectedPack ? selectedPack.mrp : (diameterAdjustedProduct ? diameterAdjustedProduct.mrp : product.mrp);

    let baseName = product.name;
    if (isSteelProduct && selectedDiameter && !baseName.toLowerCase().includes(selectedDiameter.toLowerCase())) {
      baseName = `${baseName} (${selectedDiameter})`;
    }
    const finalName = isCustomPack ? `${baseName} (${selectedPack.label})` : baseName;
    const finalId = isSteelProduct
      ? `${product.id}-${selectedDiameter}${isCustomPack ? `-pack-${selectedPack.qty}` : ""}`
      : (isCustomPack ? `${product.id}-pack-${selectedPack.qty}` : product.id);

    addItem(
      {
        id: finalId,
        name: finalName,
        brand: product.brand,
        img: product.images?.[0] || product.image,
        price: effectivePrice,
        basePrice: effectivePrice,
        mrp: effectiveMrp,
        packLabel: selectedPack ? selectedPack.label : null,
        packQty: selectedPack ? selectedPack.qty : 1,
        unit: selectedPack ? selectedPack.unitName : product.unit,
        vendorId: product.vendorId,
        vendorName: product.vendorName,
        diameter: isSteelProduct ? selectedDiameter : undefined,
      },
      qty
    );
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1500);
  };

  const handleBuyNow = () => {
    if (!product?.isDeliverable) return;
    const isCustomPack = selectedPack && selectedPack.qty > 1;
    const effectivePrice = selectedPack ? selectedPack.price : (diameterAdjustedProduct ? diameterAdjustedProduct.price : product.price);
    const effectiveMrp = selectedPack ? selectedPack.mrp : (diameterAdjustedProduct ? diameterAdjustedProduct.mrp : product.mrp);

    let baseName = product.name;
    if (isSteelProduct && selectedDiameter && !baseName.toLowerCase().includes(selectedDiameter.toLowerCase())) {
      baseName = `${baseName} (${selectedDiameter})`;
    }
    const finalName = isCustomPack ? `${baseName} (${selectedPack.label})` : baseName;
    const finalId = isSteelProduct
      ? `${product.id}-${selectedDiameter}${isCustomPack ? `-pack-${selectedPack.qty}` : ""}`
      : (isCustomPack ? `${product.id}-pack-${selectedPack.qty}` : product.id);

    const directItem = {
      id: finalId,
      productId: product.id,
      name: finalName,
      brand: product.brand,
      img: product.images?.[0] || product.image,
      price: effectivePrice,
      basePrice: effectivePrice,
      mrp: effectiveMrp,
      packLabel: selectedPack ? selectedPack.label : null,
      packQty: selectedPack ? selectedPack.qty : 1,
      unit: selectedPack ? selectedPack.unitName : product.unit,
      vendorId: product.vendorId,
      vendorName: product.vendorName,
      qty: qty,
      addedRegionId: region?.id || null,
      addedRegionName: region?.name || null,
      diameter: isSteelProduct ? selectedDiameter : undefined,
    };
    // Cart ke purane items ko touch kiye bina direct checkout me bhejte hain
    navigate("/checkout", { state: { directItem } });
  };

  const handleAddReview = async (e) => {
    e.preventDefault();
    setReviewError("");

    if (!user) {
      navigate(`/login?redirect=${encodeURIComponent(location.pathname)}`);
      return;
    }

    if (isPartner) {
      setReviewError("Only customer accounts can submit reviews. Admin, DR, and Vendor accounts cannot post reviews.");
      return;
    }

    if (!hasPurchased) {
      setReviewError("Only verified customers who have purchased this product can leave a review.");
      return;
    }

    if (hasAlreadyReviewed) {
      setReviewError("You have already submitted a review for this product. Only one review is allowed per customer.");
      return;
    }

    if (!reviewComment.trim()) {
      setReviewError("Please enter your review comments.");
      return;
    }

    const nameToUse = reviewerName.trim() || user?.name || "Verified Customer";
    setIsSubmittingReview(true);

    try {
      const res = await authFetch(`${API_BASE_URL}/api/v1/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: targetProductId,
          name: nameToUse,
          rating: Number(newRating),
          comment: reviewComment.trim(),
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit review to database.");
      }

      // Review successfully saved in Database!
      const userKey = `buildcity_reviewed_${user.id || user.phone || 'me'}_${targetProductId}`;
      try {
        localStorage.setItem(userKey, "true");
      } catch {}

      setReviewsList((prev) => {
        const updated = [data, ...prev.filter((r) => r.id !== data.id && r.comment !== data.comment)];
        try {
          localStorage.setItem(`buildcity_reviews_${targetProductId}`, JSON.stringify(updated));
        } catch {}
        return updated;
      });

      setReviewComment("");
      setReviewSubmitted(true);
      setShowForm(false);
      setTimeout(() => setReviewSubmitted(false), 4000);
    } catch (err) {
      setReviewError(err.message || "Failed to save review to database. Please check your connection and try again.");
    } finally {
      setIsSubmittingReview(false);
    }
  };

  if ((productsLoading && !product) || (directLoading && !product)) {
    return (
      <div data-storefront className="min-h-screen bg-surface pb-24 font-sans">
        <div className="hidden lg:block">
          <Navbar />
        </div>
        <MobileHeader title="Product" />
        <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6" aria-busy="true" aria-label="Loading product">
          <div className="grid md:grid-cols-2 gap-6 md:gap-10">
            <div className="bc-skeleton aspect-square w-full rounded-2xl" />
            <div className="space-y-3 pt-2">
              <div className="bc-skeleton h-4 w-1/4 rounded" />
              <div className="bc-skeleton h-7 w-4/5 rounded" />
              <div className="bc-skeleton h-8 w-1/3 rounded mt-4" />
              <div className="bc-skeleton h-4 w-2/3 rounded" />
              <div className="flex gap-3 pt-6">
                <div className="bc-skeleton h-12 flex-1 rounded-xl" />
                <div className="bc-skeleton h-12 flex-1 rounded-xl" />
              </div>
              <div className="bc-skeleton h-28 w-full rounded-2xl mt-4" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!product) {
    return (
      <div data-storefront className="min-h-screen bg-surface pb-24 font-sans">
        <div className="hidden lg:block">
          <Navbar />
        </div>
        <MobileHeader title="Product" />
        <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-16 flex justify-center">
          <div className="w-full max-w-md rounded-2xl bg-white ring-1 ring-slate-200/80">
            <EmptyState
              icon={PackageIcon}
              title="This product isn't available"
              description="It may have been removed by the shop, or your connection dropped. Browse other materials in your district."
              actionLabel="Browse materials"
              actionTo="/categories"
            />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div data-storefront className="min-h-screen bg-surface pb-24 lg:pb-12 font-sans">
      <div className="hidden lg:block">
        <Navbar />
      </div>
      <MobileHeader title={product.category || "Product"} fallback="/categories" />

      <main className="bc-fade-in max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
        <nav aria-label="Breadcrumb" className="hidden lg:flex items-center gap-1 text-sm text-slate-500 mb-5 min-w-0">
          <Link to="/" className="hover:text-navy-950 shrink-0">Home</Link>
          <ChevronRightIcon className="h-3.5 w-3.5 text-slate-300 shrink-0" />
          <Link to={`/categories?cat=${encodeURIComponent(product.category)}`} className="hover:text-navy-950 capitalize shrink-0">
            {product.category}
          </Link>
          <ChevronRightIcon className="h-3.5 w-3.5 text-slate-300 shrink-0" />
          <span className="text-navy-950 truncate">{product.name}</span>
        </nav>

        <div className="grid md:grid-cols-2 gap-5 md:gap-10">
          {/* Product images ka slider */}
          <div>
            <ProductImageSlider key={product.id || id} images={product.images} name={product.name} categoryName={product.category} />
          </div>

          {/* Product details aur pricing block */}
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="text-sm font-medium text-brand-700">{product.brand}</span>
              <span className="text-slate-300" aria-hidden="true">·</span>
              <span className="text-sm text-slate-500">{product.category}</span>
              {product.grade && (
                <span className="text-xs font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                  {product.catSpec?.gradeLabel ? `${product.catSpec.gradeLabel.split("/")[0].trim()}: ${product.grade}` : product.grade}
                </span>
              )}
            </div>
            <h1 className="text-xl sm:text-[28px] sm:leading-tight font-semibold text-navy-950 mt-1 mb-2 leading-snug tracking-tight break-words">
              {product.name}
            </h1>

            {reviewsList.length > 0 ? (
              <a href="#reviews" className="inline-flex items-center gap-2 mb-4 rounded-md">
                <span className="flex items-center gap-1 bg-emerald-600 text-white text-xs font-semibold px-1.5 py-0.5 rounded-md tabular-nums">
                  {avgRating} <StarIcon />
                </span>
                <span className="text-sm text-slate-500 hover:text-navy-950 tabular-nums">
                  {reviewsList.length} {reviewsList.length === 1 ? "review" : "reviews"}
                </span>
              </a>
            ) : (
              <div className="mb-4" />
            )}

            <div className="flex items-baseline gap-2.5 mb-1">
              <span className="text-3xl font-semibold text-navy-950 tracking-tight tabular-nums">
                ₹{Number(currentPrice || 0).toLocaleString("en-IN")}
              </span>
              {product.unit && <span className="text-sm text-slate-500">/ {product.unit}</span>}
              {currentMrp > currentPrice && (
                <span className="text-sm text-slate-400 line-through tabular-nums">
                  ₹{Number(currentMrp || 0).toLocaleString("en-IN")}
                </span>
              )}
              {currentDiscountPct > 0 && (
                <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-md ring-1 ring-inset ring-emerald-600/15 tabular-nums">
                  {currentDiscountPct}% off
                </span>
              )}
            </div>

            <div className="mb-5">
              {!product?.isDeliverable ? (
                <div className="px-3 py-2 rounded-xl bg-amber-50 ring-1 ring-inset ring-amber-600/20 text-amber-900 text-sm inline-flex items-center gap-2 bc-fade-in">
                  <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                  <span className="font-medium">Not deliverable to {region?.name || "the selected district"}</span>
                </div>
              ) : isVendorSuspended ? (
                <span className="text-sm font-medium text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg inline-block">
                  Currently unavailable
                </span>
              ) : (
                <div className="space-y-1">
                  <span className="text-sm text-emerald-700 flex items-center gap-1.5">
                    <TruckIcon className="h-4 w-4 shrink-0" />
                    In stock · Site delivery in {region?.name || "your area"}
                  </span>
                  {product?.switchedVendor && (
                    <p className="text-xs text-slate-500">
                      Fulfilled by local certified vendor: <strong className="text-navy-900">{product.vendorName || "Local Partner"}</strong>
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Steel Rebar MM-Wise Diameter Selector (ONLY if vendor turned mm pricing ON) */}
            {isSteelProduct && isMmPricingOn && (
              <div className="mb-5">
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-sm text-slate-600">
                    Diameter: <span className="font-semibold text-navy-950">{selectedDiameter}</span>
                  </span>
                  <span className="text-xs text-slate-500">Price by size</span>
                </div>

                <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
                  {STEEL_DIAMETERS.map((dia) => {
                    const isChosen = selectedDiameter === dia;
                    const customRate = mmRates?.[dia];
                    const isDiaActive = customRate ? customRate.active !== false : true;
                    const diaPrice = (customRate && Number(customRate.price) > 0)
                      ? Number(customRate.price)
                      : getDiameterPrice(product.price, dia, initialDiameter);
                    return (
                      <button
                        key={dia}
                        type="button"
                        disabled={!isDiaActive}
                        onClick={() => {
                          if (!isDiaActive) return;
                          setSelectedDiameter(dia);
                          setSelectedPackIndex(0);
                        }}
                        aria-pressed={isChosen}
                        className={`min-h-14 p-2 rounded-xl text-center border transition-colors flex flex-col items-center justify-center ${
                          !isDiaActive
                            ? "bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed"
                            : isChosen
                            ? "bg-navy-950 text-white border-navy-950 cursor-pointer"
                            : "bg-white text-slate-700 border-slate-200 hover:border-slate-400 cursor-pointer active:scale-[0.97]"
                        }`}
                      >
                        <span className="text-sm font-semibold leading-tight">{dia}</span>
                        <span className={`text-[11px] mt-0.5 tabular-nums ${!isDiaActive ? "text-slate-400" : isChosen ? "text-slate-300" : "text-slate-500"}`}>
                          {isDiaActive ? `₹${diaPrice.toLocaleString("en-IN")}` : "Out of stock"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Pack ya quantity aur unit selector - ONLY show if vendor turned Bulk ON (more than 1 pack available) */}
            {packs && packs.length > 1 && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-sm text-slate-600">
                    {isSteelProduct ? "Quantity:" : "Pack:"}{" "}
                    <span className="font-semibold text-navy-950">{selectedPack?.label}</span>
                  </span>
                  {selectedPack?.qty > 1 && selectedPack?.perUnitPrice && (
                    <span className="text-xs text-slate-500 tabular-nums">
                      (₹{selectedPack.perUnitPrice.toLocaleString("en-IN")} / {selectedPack.unitName})
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5 sm:gap-3">
                  {packs.map((pk, idx) => {
                    const isSelected = idx === selectedPackIndex;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSelectedPackIndex(idx)}
                        aria-pressed={isSelected}
                        className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-colors cursor-pointer relative ${
                          isSelected
                            ? "border-navy-950 bg-white ring-1 ring-navy-950"
                            : "border-slate-200 bg-white hover:border-slate-400"
                        }`}
                      >
                        {pk.isBulk && (
                          <span className="absolute -top-2 right-1.5 text-[10px] font-semibold bg-emerald-600 text-white px-1.5 py-px rounded-full">
                            Bulk
                          </span>
                        )}
                        <span className="text-[13px] font-medium text-slate-800 leading-tight mb-1">
                          {pk.label}
                        </span>
                        <div className="w-full border-t border-slate-200/80 my-1" />
                        <div className="flex items-baseline justify-center gap-1.5">
                          <span className="text-sm font-semibold text-navy-950 tabular-nums">
                            ₹{pk.price.toLocaleString("en-IN")}
                          </span>
                          {pk.mrp > pk.price && (
                            <span className="text-[11px] text-slate-400 line-through tabular-nums">
                              ₹{pk.mrp.toLocaleString("en-IN")}
                            </span>
                          )}
                        </div>
                        {pk.discountPct > 0 && (
                          <span className="text-[11px] font-medium text-emerald-700 mt-0.5 tabular-nums">
                            {pk.discountPct}% off
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Quantity select karne ka counter */}
            <div className="flex items-center gap-4 mb-5">
              <span className="text-sm text-slate-600">Quantity</span>
              <div className="flex items-center rounded-xl bg-white ring-1 ring-slate-200">
                <button
                  type="button"
                  disabled={!product?.isDeliverable || isVendorSuspended}
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  aria-label="Decrease quantity"
                  className="flex h-11 w-11 items-center justify-center text-slate-700 hover:bg-slate-100 rounded-l-xl transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <MinusIcon className="h-4 w-4" strokeWidth={2.2} />
                </button>
                <span className="min-w-10 text-center text-sm font-semibold text-navy-950 tabular-nums" aria-live="polite">{qty}</span>
                <button
                  type="button"
                  disabled={!product?.isDeliverable || isVendorSuspended}
                  onClick={() => setQty((q) => q + 1)}
                  aria-label="Increase quantity"
                  className="flex h-11 w-11 items-center justify-center text-slate-700 hover:bg-slate-100 rounded-r-xl transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <PlusIcon className="h-4 w-4" strokeWidth={2.2} />
                </button>
              </div>
            </div>

            <div className="mb-8">
              {!product?.isDeliverable ? (
                <div className="space-y-3">
                  <div className="flex gap-3">
                    <button
                      type="button"
                      disabled
                      className="flex-1 h-12 rounded-xl text-sm font-semibold text-slate-400 bg-slate-100 cursor-not-allowed"
                    >
                      Add to Cart
                    </button>
                    <button
                      type="button"
                      disabled
                      className="flex-1 h-12 rounded-xl text-sm font-semibold bg-slate-100 text-slate-400 cursor-not-allowed"
                    >
                      Buy Now
                    </button>
                  </div>
                  <Link
                    to={product.category && product.category !== "Material" ? `/categories?cat=${encodeURIComponent(product.category)}` : "/categories"}
                    className="w-full min-h-12 py-3 px-4 bg-navy-950 hover:bg-navy-900 active:scale-[0.98] text-white text-sm font-semibold rounded-xl text-center transition-colors flex items-center justify-center gap-1.5"
                  >
                    <span>Browse {product.category && product.category !== "Material" ? product.category.toLowerCase() : "materials"} in {region?.name || "your area"}</span>
                    <ArrowRightIcon className="h-4 w-4 shrink-0" />
                  </Link>
                </div>
              ) : isVendorSuspended ? (
                <button
                  type="button"
                  disabled
                  className="w-full h-12 rounded-xl text-sm font-semibold bg-slate-100 text-slate-500 cursor-not-allowed"
                >
                  Unavailable
                </button>
              ) : (
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={handleAddToCart}
                    className={`flex-1 h-12 rounded-xl text-sm font-semibold border transition-colors active:scale-[0.98] cursor-pointer inline-flex items-center justify-center gap-1.5 ${
                      justAdded
                        ? "border-emerald-600 text-emerald-700 bg-emerald-50"
                        : "border-brand-600 text-brand-700 bg-white hover:bg-brand-50"
                    }`}
                  >
                    {justAdded && <CheckIcon className="h-4 w-4" strokeWidth={2.4} />}
                    {justAdded ? "Added to Cart" : "Add to Cart"}
                  </button>
                  <button
                    type="button"
                    onClick={handleBuyNow}
                    className="flex-1 h-12 rounded-xl text-sm font-semibold bg-brand-600 text-white hover:bg-brand-700 shadow-[0_1px_2px_rgba(154,52,18,0.3)] active:scale-[0.98] transition-colors cursor-pointer"
                  >
                    Buy Now
                  </button>
                </div>
              )}
            </div>

            {/* Product ka description */}
            <div className="mb-6 bg-white p-4 sm:p-5 rounded-2xl ring-1 ring-slate-200/80">
              <h3 className="text-sm font-semibold text-navy-950 mb-1.5">Description</h3>
              <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                {product.description}
              </p>
            </div>

            {/* Technical specifications details */}
            <div>
              <h3 className="text-sm font-semibold text-navy-950 mb-2">Specifications</h3>
              <dl className="rounded-2xl ring-1 ring-slate-200/80 overflow-hidden bg-white divide-y divide-slate-100">
                {product.specs.map((s, i) => (
                  <div key={s.label} data-row={i} className="flex gap-3 text-sm px-4 py-2.5">
                    <dt className="w-2/5 sm:w-1/3 shrink-0 text-slate-500">{s.label}</dt>
                    <dd className="flex-1 min-w-0 break-words text-navy-950 font-medium">
                      {s.label === "Available Stock" && selectedPack?.stock !== undefined ? `${selectedPack.stock} units` : s.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </div>

        {/* You May Also Like / Complementary Products */}
        {similarProducts.length > 0 && (
          <section className="mt-10 sm:mt-14">
            <div className="flex items-end justify-between gap-2 mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-semibold text-navy-950 tracking-tight">
                    You may also like
                  </h2>
                </div>
              </div>
              <Link
                to="/categories"
                className="text-sm font-medium text-brand-700 hover:text-brand-600 flex items-center gap-0.5 group transition-colors shrink-0"
              >
                <span>All categories</span>
                <ChevronRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 sm:gap-4">
              {similarProducts.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </section>
        )}

        {/* Customer reviews aur ratings section */}
        <section id="reviews" className="mt-10 sm:mt-14 scroll-mt-24 bg-white ring-1 ring-slate-200/80 rounded-2xl p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4 mb-5">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-semibold text-navy-950 tracking-tight">
                  Customer reviews
                </h2>
                {reviewsList.length > 0 && (
                  <span className="bg-emerald-50 text-emerald-700 font-semibold text-xs px-2 py-0.5 rounded-full ring-1 ring-inset ring-emerald-600/15 flex items-center gap-1 tabular-nums">
                    <StarIcon /> {avgRating} / 5
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-500 mt-0.5">Only customers who bought this product can review it.</p>
            </div>

            {!user ? (
              <button
                type="button"
                onClick={() => navigate(`/login?redirect=${encodeURIComponent(location.pathname)}`)}
                className="h-10 bg-navy-950 hover:bg-navy-900 text-white text-sm font-semibold px-4 rounded-xl transition-colors active:scale-[0.98] cursor-pointer shrink-0"
              >
                Log in to review
              </button>
            ) : isPartner ? (
              <span className="text-xs text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg shrink-0">
                Customers only
              </span>
            ) : hasAlreadyReviewed ? (
              <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg shrink-0">
                You reviewed this
              </span>
            ) : hasPurchased ? (
              <button
                type="button"
                onClick={() => {
                  setReviewError("");
                  setShowForm((v) => !v);
                }}
                className="h-10 bg-navy-950 hover:bg-navy-900 text-white text-sm font-semibold px-4 rounded-xl transition-colors active:scale-[0.98] cursor-pointer shrink-0"
              >
                {showForm ? "Close" : "Write a review"}
              </button>
            ) : (
              <span className="text-xs text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg shrink-0">
                Verified buyers only
              </span>
            )}
          </div>

          {/* Notice if logged in as admin/dr/vendor */}
          {isPartner && (
            <div className="mb-5 p-3.5 rounded-xl bg-slate-50 text-slate-600 text-sm">
              <span>
                You are logged in as <strong>{userRole.toUpperCase()}</strong>. Product reviews can only be submitted by verified customer accounts.
              </span>
            </div>
          )}

          {/* Review submit hone par success alert */}
          {reviewSubmitted && (
            <div role="status" className="mb-5 p-3.5 rounded-xl bg-emerald-50 ring-1 ring-inset ring-emerald-600/20 text-emerald-800 text-sm bc-fade-in">
              <span>Thanks! Your review is now live.</span>
            </div>
          )}

          {/* Review submit error alert */}
          {reviewError && (
            <div role="alert" className="mb-5 p-3.5 rounded-xl bg-rose-50 ring-1 ring-inset ring-rose-600/20 text-rose-800 text-sm bc-fade-in">
              <span>{reviewError}</span>
            </div>
          )}

          {/* Naya review likhne ka form */}
          {showForm && isCustomer && (
            <form onSubmit={handleAddReview} className="bc-rise-in mb-6 p-4 sm:p-5 bg-slate-50 rounded-2xl space-y-4">
              <h3 className="font-semibold text-navy-950 text-sm">Your review</h3>

              <div>
                <p className="block text-sm font-medium text-slate-700 mb-1.5">Rating</p>
                <div className="flex items-center gap-1.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      onClick={() => setNewRating(star)}
                      aria-label={`${star} star${star > 1 ? "s" : ""}`}
                      aria-pressed={newRating === star}
                      className="text-3xl leading-none transition-transform hover:scale-110 cursor-pointer p-1"
                    >
                      <span className={(hoverRating || newRating) >= star ? "text-amber-500" : "text-slate-300"}>
                        ★
                      </span>
                    </button>
                  ))}
                  <span className="ml-2 text-sm text-slate-600 tabular-nums">
                    {newRating} / 5
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Your name</label>
                  <input
                    type="text"
                    required
                    placeholder="Enter your name"
                    value={reviewerName}
                    onChange={(e) => setReviewerName(e.target.value)}
                    className="w-full h-11 bg-white text-sm border border-slate-200 rounded-xl px-3.5 outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Your experience</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Share your experience with product quality, packaging, and site delivery..."
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  className="w-full bg-white text-sm border border-slate-200 rounded-xl p-3 outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setReviewError("");
                    setShowForm(false);
                  }}
                  className="h-10 px-4 text-sm font-medium text-slate-700 bg-white ring-1 ring-slate-200 rounded-xl hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReview}
                  className="h-10 px-5 text-sm font-semibold text-white bg-navy-950 rounded-xl hover:bg-navy-900 active:scale-[0.98] transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmittingReview ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      Saving...
                    </>
                  ) : (
                    "Submit Review"
                  )}
                </button>
              </div>
            </form>
          )}

          {/* Sabhi submitted reviews ki list */}
          {reviewsList.length === 0 ? (
            <div className="py-8 px-4 text-center bg-slate-50 rounded-2xl flex flex-col items-center justify-center">
              <h4 className="text-sm font-semibold text-navy-950 mb-1">No reviews yet</h4>
              <p className="text-sm text-slate-500 max-w-sm mb-3">Bought this product? Share how it worked on your site.</p>
              {!showForm && (
                !user ? (
                  <button
                    type="button"
                    onClick={() => navigate(`/login?redirect=${encodeURIComponent(location.pathname)}`)}
                    className="h-10 bg-navy-950 hover:bg-navy-900 text-white text-sm font-semibold px-4 rounded-xl transition-colors cursor-pointer"
                  >
                    Log in to review
                  </button>
                ) : isPartner ? null : hasAlreadyReviewed ? (
                  <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg">
                    You have already reviewed this product
                  </span>
                ) : hasPurchased ? (
                  <button
                    type="button"
                    onClick={() => {
                      setReviewError("");
                      setShowForm(true);
                    }}
                    className="h-10 bg-navy-950 hover:bg-navy-900 text-white text-sm font-semibold px-4 rounded-xl transition-colors cursor-pointer"
                  >
                    Write the first review
                  </button>
                ) : (
                  <span className="text-xs text-slate-500">
                    Buy this product to write a verified review
                  </span>
                )
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {reviewsList.map((r) => (
                <div
                  key={r.id || r.name}
                  className="bg-slate-50 rounded-2xl p-4 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-navy-950 truncate">
                        {r.name}
                      </span>
                      <span className="flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-md shrink-0 tabular-nums">
                        <StarIcon /> {r.rating}.0
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 leading-relaxed break-words">{r.comment}</p>
                  </div>
                  <div className="mt-3 pt-2 border-t border-slate-200/70 text-xs text-slate-500">
                    Verified buyer · {r.createdAt ? new Date(r.createdAt).toLocaleDateString() : (r.date || "Recent")}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function StarIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
      <path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1L12 2Z" />
    </svg>
  );
}