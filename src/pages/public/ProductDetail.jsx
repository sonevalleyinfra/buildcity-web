import { useMemo, useState, useEffect } from "react";
import { useParams, useNavigate, useLocation, Link } from "react-router-dom";
import Navbar from "../../components/Navbar";
import ProductCard from "../../components/ProductCard";
import ProductImageSlider, { getProductImages } from "../../components/ProductImageSlider";
import { useCart } from "../../context/CartContext";
import { useRegion } from "../../context/RegionContext";
import { useAdmin } from "../../context/AdminContext";
import { useAuth } from "../../context/AuthContext";
import { useOrders } from "../../context/OrderContext";
import { API_BASE_URL } from "../../config/api";
import { authFetch } from "../../config/authFetch";
import { generateProductPacks } from "../../utils/productPacks";



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
  const { addItem, buyNow } = useCart();
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
      authFetch(`${API_BASE_URL}/api/v1/vendor/listings`)
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
      const price = Number(realProd.price) || 100;
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

      return {
        id: realProd.id,
        name: realProd.name,
        brand: realProd.brand || "Generic",
        category: resolvedCategory || "Material",
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
        inStock: (realProd.stockQty || 0) > 0 && !isSuspended && isDeliverable,
        stockQty: realProd.stockQty,
        unit: realProd.unit || "Unit",
        customPacks: (() => {
          let cp = realProd.customPacks || realProd.custom_packs;
          if (typeof cp === "string") {
            try { cp = JSON.parse(cp); } catch {}
          }
          if (Array.isArray(cp) && cp.length > 0) return cp;
          try {
            const stored = JSON.parse(localStorage.getItem("buildcity_custom_packs") || "{}");
            if (Array.isArray(stored[realProd.id]) && stored[realProd.id].length > 0) {
              return stored[realProd.id];
            }
          } catch {}
          return realProd.masterProduct?.customPacks || null;
        })(),
        description:
          (realProd.description && realProd.description.trim()) ||
          (realProd.masterProduct?.description && realProd.masterProduct.description.trim()) ||
          (masterProducts.find((m) => m.id === realProd.masterProductId || m.id === realProd.id || (m.name && realProd.name && m.name.toLowerCase() === realProd.name.toLowerCase()))?.description) ||
          `High-quality certified ${realProd.name} by ${realProd.brand || "Authorized Brand"}. Supplied directly via BuildCity Certified Delivery Network.`,
        specs: [
          { label: "Fulfillment", value: `BuildCity Certified Network (${region?.name || "Local"})` },
          { label: "Brand", value: realProd.brand || "Generic" },
          { label: "Grade", value: realProd.grade || "Standard" },
          { label: "Type", value: realProd.type || "Standard Type" },
          { label: "Packaging Unit", value: realProd.unit || "Unit" },
          { label: "Available Stock", value: `${realProd.stockQty || 0} units` },
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

  // Rule-based automatic packs calculate karte hai
  const packs = useMemo(() => generateProductPacks(product), [product]);
  const [selectedPackIndex, setSelectedPackIndex] = useState(0);

  // Jab product badle toh pehla pack select karo
  useEffect(() => {
    setSelectedPackIndex(0);
  }, [product?.id]);

  const selectedPack = packs[selectedPackIndex] || packs[0];
  const currentPrice = selectedPack ? selectedPack.price : (product?.price || 0);
  const currentMrp = selectedPack ? selectedPack.mrp : (product?.mrp || 0);

  // Jab product badle toh page top par smoothly scroll karo
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
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
    } catch (err) {}
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
    } catch (e) {}
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
          } catch (e) {}
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
    addItem(
      {
        id: isCustomPack ? `${product.id}-pack-${selectedPack.qty}` : product.id,
        name: isCustomPack ? `${product.name} (${selectedPack.label})` : product.name,
        brand: product.brand,
        img: product.images?.[0] || product.image,
        price: selectedPack ? selectedPack.price : product.price,
        basePrice: selectedPack ? selectedPack.price : product.price,
        mrp: selectedPack ? selectedPack.mrp : product.mrp,
        packLabel: selectedPack ? selectedPack.label : null,
        packQty: selectedPack ? selectedPack.qty : 1,
        unit: selectedPack ? selectedPack.unitName : product.unit,
        vendorId: product.vendorId,
        vendorName: product.vendorName,
      },
      qty
    );
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1500);
  };

  const handleBuyNow = () => {
    if (!product?.isDeliverable) return;
    const isCustomPack = selectedPack && selectedPack.qty > 1;
    const directItem = {
      id: isCustomPack ? `${product.id}-pack-${selectedPack.qty}` : product.id,
      productId: product.id,
      name: isCustomPack ? `${product.name} (${selectedPack.label})` : product.name,
      brand: product.brand,
      img: product.images?.[0] || product.image,
      price: selectedPack ? selectedPack.price : product.price,
      basePrice: selectedPack ? selectedPack.price : product.price,
      mrp: selectedPack ? selectedPack.mrp : product.mrp,
      packLabel: selectedPack ? selectedPack.label : null,
      packQty: selectedPack ? selectedPack.qty : 1,
      unit: selectedPack ? selectedPack.unitName : product.unit,
      vendorId: product.vendorId,
      vendorName: product.vendorName,
      qty: qty,
      addedRegionId: region?.id || null,
      addedRegionName: region?.name || null,
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
      } catch (err) {}

      setReviewsList((prev) => {
        const updated = [data, ...prev.filter((r) => r.id !== data.id && r.comment !== data.comment)];
        try {
          localStorage.setItem(`buildcity_reviews_${targetProductId}`, JSON.stringify(updated));
        } catch (err) {}
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
      <div className="min-h-screen bg-surface pb-20 font-sans">
        <Navbar />
        <main className="max-w-6xl mx-auto px-4 sm:px-6 py-16 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <span className="w-8 h-8 border-3 border-brand-500 border-t-transparent rounded-full animate-spin"></span>
            <p className="text-xs font-bold text-slate-500">Loading Product Details...</p>
          </div>
        </main>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-surface pb-20 font-sans">
        <Navbar />
        <main className="max-w-6xl mx-auto px-4 sm:px-6 py-16 flex items-center justify-center text-center">
          <div className="bg-white rounded-3xl p-8 border border-slate-200/90 max-w-md w-full space-y-4 shadow-xs">
            <span className="text-4xl block">🔍</span>
            <h2 className="text-base font-black text-navy-950">Product Unavailable</h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              Yeh product filhal offline ya unavailable hai. Kripya dusre products check karein ya internet connection verify karein.
            </p>
            <Link
              to="/categories"
              className="inline-block mt-2 px-5 py-2.5 bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs rounded-xl transition-all shadow-xs"
            >
              Explore Available Materials →
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface pb-20 font-sans">
      <Navbar />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        <div className="text-xs text-slate-400 mb-4">
          <Link to="/" className="hover:text-brand-500">Home</Link>
          <span className="mx-1.5">/</span>
          <Link to={`/categories?cat=${encodeURIComponent(product.category)}`} className="hover:text-brand-500 capitalize">
            {product.category}
          </Link>
          <span className="mx-1.5">/</span>
          <span className="text-slate-500">{product.name}</span>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Product images ka slider */}
          <div>
            <ProductImageSlider images={product.images} name={product.name} />
          </div>

          {/* Product details aur pricing block */}
          <div>
            <span className="text-xs font-bold text-brand-600 uppercase tracking-wider">{product.brand}</span>
            <h1 className="text-xl sm:text-2xl font-extrabold text-navy-900 mt-1 mb-2 leading-snug tracking-tight">
              {product.name}
            </h1>

            <div className="flex items-center gap-2 mb-4">
              <span className="flex items-center gap-1 bg-emerald-600 text-white text-xs font-bold px-2 py-0.5 rounded-lg shadow-2xs">
                {avgRating} <StarIcon />
              </span>
              <span className="text-xs font-semibold text-slate-500">
                ({reviewsList.length} Customer Reviews)
              </span>
            </div>

            <div className="flex items-baseline gap-2.5 mb-1">
              <span className="text-2xl font-black text-navy-900 tracking-tight">
                ₹{Number(currentPrice || 0).toLocaleString("en-IN")}
              </span>
              {currentMrp > currentPrice && (
                <span className="text-xs text-slate-400 line-through font-medium">
                  ₹{Number(currentMrp || 0).toLocaleString("en-IN")}
                </span>
              )}
              {currentDiscountPct > 0 && (
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  {currentDiscountPct}% OFF
                </span>
              )}
            </div>

            <div className="mb-5">
              {!product?.isDeliverable ? (
                <div className="px-3 py-2 rounded-xl bg-amber-50/90 border border-amber-200 text-amber-900 text-xs font-semibold inline-flex items-center gap-2 animate-fade-in shadow-2xs">
                  <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                  <span className="font-bold text-amber-800">Not Deliverable to {region?.name || "Selected Region"}</span>
                </div>
              ) : isVendorSuspended ? (
                <span className="text-xs font-extrabold text-rose-700 bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-200 inline-block shadow-2xs">
                  Unavailable
                </span>
              ) : (
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    In Stock — Ready for site delivery in {region?.name || "your area"}
                  </span>
                  {product?.switchedVendor && (
                    <p className="text-[11px] text-slate-500 font-medium">
                      Fulfilled by local certified vendor: <strong className="text-navy-900">{product.vendorName || "Local Partner"}</strong>
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Pack ya quantity aur unit selector - mobile first grid layout */}
            {packs && packs.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-xs font-extrabold text-navy-900 uppercase tracking-wider">
                    Size: <span className="text-brand-600 font-black normal-case">{selectedPack?.label}</span>
                  </span>
                  {selectedPack?.qty > 1 && selectedPack?.perUnitPrice && (
                    <span className="text-[11px] font-semibold text-slate-500">
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
                        className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-center transition-all cursor-pointer relative ${
                          isSelected
                            ? "border-sky-600 bg-sky-50/80 shadow-xs ring-1 ring-sky-500"
                            : "border-slate-300 bg-white hover:border-slate-400 hover:bg-slate-50/50 shadow-2xs"
                        }`}
                      >
                        {pk.isBulk && (
                          <span className="absolute -top-2 right-1.5 text-[9px] font-black uppercase tracking-wider bg-emerald-700 text-white px-1.5 py-0.2 rounded-full shadow-2xs">
                            Bulk
                          </span>
                        )}
                        <span className="text-xs font-bold text-slate-800 leading-tight mb-1">
                          {pk.label}
                        </span>
                        <div className="w-full border-t border-slate-200/80 my-1" />
                        <div className="flex items-baseline justify-center gap-1.5">
                          <span className="text-xs font-black text-navy-900">
                            ₹{pk.price.toLocaleString("en-IN")}
                          </span>
                          {pk.mrp > pk.price && (
                            <span className="text-[10px] text-slate-400 line-through">
                              ₹{pk.mrp.toLocaleString("en-IN")}
                            </span>
                          )}
                        </div>
                        {pk.discountPct > 0 && (
                          <span className="text-[10px] font-bold text-emerald-700 mt-0.5">
                            {pk.discountPct}% OFF
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
              <span className="text-xs font-bold text-navy-900">Quantity</span>
              <div className="flex items-center border border-slate-200 rounded-xl bg-white shadow-2xs">
                <button
                  type="button"
                  disabled={!product?.isDeliverable || isVendorSuspended}
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  className="px-3.5 py-1.5 text-slate-600 font-bold hover:bg-slate-100 rounded-l-xl transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  −
                </button>
                <span className="px-4 text-xs font-extrabold text-navy-900">{qty}</span>
                <button
                  type="button"
                  disabled={!product?.isDeliverable || isVendorSuspended}
                  onClick={() => setQty((q) => q + 1)}
                  className="px-3.5 py-1.5 text-slate-600 font-bold hover:bg-slate-100 rounded-r-xl transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  +
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
                      className="flex-1 rounded-xl py-3 text-xs font-bold border border-slate-300 text-slate-400 bg-slate-100 cursor-not-allowed opacity-80"
                    >
                      Add to Cart
                    </button>
                    <button
                      type="button"
                      disabled
                      className="flex-1 rounded-xl py-3 text-xs font-bold bg-slate-200 text-slate-400 cursor-not-allowed opacity-80"
                    >
                      Buy Now
                    </button>
                  </div>
                  <Link
                    to={product.category && product.category !== "Material" ? `/categories?cat=${encodeURIComponent(product.category)}` : "/categories"}
                    className="w-full py-3 px-4 bg-brand-500 hover:bg-brand-600 active:scale-[0.98] text-white text-xs font-extrabold rounded-xl text-center shadow-xs transition-all flex items-center justify-center gap-1.5"
                  >
                    <span>Browse Available {product.category && product.category !== "Material" ? product.category : "Materials"} in {region?.name || "Your Area"}</span>
                    <span>→</span>
                  </Link>
                </div>
              ) : isVendorSuspended ? (
                <button
                  type="button"
                  disabled
                  className="w-full rounded-xl py-3 text-xs font-extrabold bg-slate-200 text-slate-600 border border-slate-300 cursor-not-allowed opacity-80"
                >
                  Unavailable
                </button>
              ) : (
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={handleAddToCart}
                    className={`flex-1 rounded-xl py-3 text-xs font-bold border transition-all active:scale-[0.98] cursor-pointer shadow-xs ${
                      justAdded
                        ? "border-emerald-500 text-emerald-700 bg-emerald-50 font-black"
                        : "border-brand-500 text-brand-600 hover:bg-brand-500 hover:text-white"
                    }`}
                  >
                    {justAdded ? "Added to Cart ✓" : "Add to Cart"}
                  </button>
                  <button
                    type="button"
                    onClick={handleBuyNow}
                    className="flex-1 rounded-xl py-3 text-xs font-extrabold bg-brand-500 text-white hover:bg-brand-600 shadow-md active:scale-[0.98] transition-all cursor-pointer"
                  >
                    Buy Now
                  </button>
                </div>
              )}
            </div>

            {/* Product ka description */}
            <div className="mb-6 bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
              <h3 className="text-xs font-extrabold text-navy-900 uppercase tracking-wider mb-1.5">Description</h3>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                {product.description}
              </p>
            </div>

            {/* Technical specifications details */}
            <div>
              <h3 className="text-xs font-extrabold text-navy-900 uppercase tracking-wider mb-2">Specifications</h3>
              <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white shadow-2xs">
                {product.specs.map((s, i) => (
                  <div
                    key={s.label}
                    className={`flex text-xs px-4 py-2.5 ${
                      i % 2 === 0 ? "bg-white" : "bg-slate-50/70"
                    }`}
                  >
                    <span className="w-1/3 text-slate-500 font-medium">{s.label}</span>
                    <span className="flex-1 text-navy-900 font-bold">
                      {s.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* You May Also Like / Complementary Products */}
        {similarProducts.length > 0 && (
          <section className="mt-12 bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4 mb-5">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-black text-navy-900 tracking-tight">
                    You May Also Like
                  </h2>
                </div>
              </div>
              <Link
                to="/categories"
                className="text-xs font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1 group transition-colors"
              >
                <span>Explore all categories</span>
                <span className="transition-transform group-hover:translate-x-0.5">→</span>
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3.5 sm:gap-4">
              {similarProducts.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </section>
        )}

        {/* Customer reviews aur ratings section */}
        <section className="mt-12 bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-6">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-navy-900 tracking-tight">
                  Customer Reviews
                </h2>
                <span className="bg-emerald-50 text-emerald-700 font-extrabold text-xs px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                  ★ {avgRating} / 5.0
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">Verified customer ratings & real site experiences.</p>
            </div>

            {!user ? (
              <button
                type="button"
                onClick={() => navigate(`/login?redirect=${encodeURIComponent(location.pathname)}`)}
                className="bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs transition-all active:scale-[0.98] cursor-pointer shrink-0"
              >
                Login to Write a Review
              </button>
            ) : isPartner ? (
              <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 border border-slate-200/90 px-3 py-1.5 rounded-xl shrink-0">
                Customer Review Only
              </span>
            ) : hasAlreadyReviewed ? (
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl shrink-0">
                Review Already Submitted
              </span>
            ) : hasPurchased ? (
              <button
                type="button"
                onClick={() => {
                  setReviewError("");
                  setShowForm((v) => !v);
                }}
                className="bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs transition-all active:scale-[0.98] cursor-pointer shrink-0"
              >
                {showForm ? "Close Form" : "Write a Review"}
              </button>
            ) : (
              <span className="text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200/80 px-3 py-1.5 rounded-xl shrink-0">
                Verified Buyers Only
              </span>
            )}
          </div>

          {/* Notice if logged in as admin/dr/vendor */}
          {isPartner && (
            <div className="mb-6 p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 text-xs font-medium">
              <span>
                You are logged in as <strong>{userRole.toUpperCase()}</strong>. Product reviews can only be submitted by verified customer accounts.
              </span>
            </div>
          )}

          {/* Review submit hone par success alert */}
          {reviewSubmitted && (
            <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold animate-fade-in">
              <span>Thank you! Your review has been published and saved to the database successfully.</span>
            </div>
          )}

          {/* Review submit error alert */}
          {reviewError && (
            <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold animate-fade-in">
              <span>{reviewError}</span>
            </div>
          )}

          {/* Naya review likhne ka form */}
          {showForm && isCustomer && (
            <form onSubmit={handleAddReview} className="mb-8 p-5 bg-brand-50/40 border border-brand-200/60 rounded-2xl space-y-4">
              <h3 className="font-extrabold text-navy-900 text-sm">Write Your Product Review</h3>

              <div>
                <label className="block text-xs font-bold text-navy-900 mb-1.5">Select Rating *</label>
                <div className="flex items-center gap-1.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      onClick={() => setNewRating(star)}
                      className="text-2xl transition-transform hover:scale-110 cursor-pointer p-0.5"
                    >
                      <span className={(hoverRating || newRating) >= star ? "text-emerald-500" : "text-slate-300"}>
                        ★
                      </span>
                    </button>
                  ))}
                  <span className="ml-2 text-xs font-bold text-navy-900">
                    {newRating} / 5 Stars
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-navy-900 mb-1">Your Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="Enter your name"
                    value={reviewerName}
                    onChange={(e) => setReviewerName(e.target.value)}
                    className="w-full bg-white text-xs border border-slate-200 rounded-xl px-3.5 py-2.5 outline-none font-bold focus:border-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-navy-900 mb-1">Review Comments *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Share your experience with product quality, packaging, and site delivery..."
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  className="w-full bg-white text-xs border border-slate-200 rounded-xl p-3 outline-none font-medium focus:border-brand-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setReviewError("");
                    setShowForm(false);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReview}
                  className="px-5 py-2 text-xs font-bold text-white bg-brand-500 rounded-xl shadow-xs hover:bg-brand-600 active:scale-[0.98] transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
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
            <div className="py-8 px-4 text-center bg-slate-50/80 rounded-2xl border border-dashed border-slate-300 flex flex-col items-center justify-center">
              <h4 className="text-xs font-black text-navy-900 mb-1">No Customer Reviews Yet</h4>
              <p className="text-[11px] text-slate-500 max-w-sm mb-3">Be the first verified customer to share your experience with this product!</p>
              {!showForm && (
                !user ? (
                  <button
                    type="button"
                    onClick={() => navigate(`/login?redirect=${encodeURIComponent(location.pathname)}`)}
                    className="bg-navy-900 hover:bg-brand-500 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all cursor-pointer shadow-2xs"
                  >
                    Login to Write First Review
                  </button>
                ) : isPartner ? null : hasAlreadyReviewed ? (
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-3.5 py-1.5 rounded-xl border border-emerald-200">
                    You have already reviewed this product
                  </span>
                ) : hasPurchased ? (
                  <button
                    type="button"
                    onClick={() => {
                      setReviewError("");
                      setShowForm(true);
                    }}
                    className="bg-navy-900 hover:bg-brand-500 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all cursor-pointer shadow-2xs"
                  >
                    Write the First Review
                  </button>
                ) : (
                  <span className="text-[11px] font-bold text-amber-800 bg-amber-50 px-3.5 py-1.5 rounded-xl border border-amber-200/80">
                    Purchase this product to write a verified review
                  </span>
                )
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {reviewsList.map((r) => (
                <div
                  key={r.id || r.name}
                  className="bg-slate-50/70 border border-slate-200/90 rounded-2xl p-4 shadow-2xs flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-extrabold text-navy-900">
                        {r.name}
                      </span>
                      <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
                        ★ {r.rating}.0
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed font-medium">{r.comment}</p>
                  </div>
                  <div className="mt-3 pt-2 border-t border-slate-200/60 text-[10px] text-slate-400 font-medium">
                    Verified Buyer · {r.createdAt ? new Date(r.createdAt).toLocaleDateString() : (r.date || "Recent")}
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