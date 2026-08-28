import { useMemo, useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import Navbar from "../../components/Navbar";
import ProductImageSlider, { getProductImages } from "../../components/ProductImageSlider";
import { useCart } from "../../context/CartContext";
import { useRegion } from "../../context/RegionContext";
import { useAdmin } from "../../context/AdminContext";
import { useAuth } from "../../context/AuthContext";
import { API_BASE_URL } from "../../config/api";

// Fallback single-product lookup
function generateProduct(id, priceFactor = 1, regionName = "Varanasi") {
  const slug = (id.split("-")[0] || "product");
  const brand = "BuildCity Trusted Brand";
  const baseMrp = 300 + ((id.length * 191) % 4800);
  const mrp = Math.round(baseMrp * priceFactor);
  const discount = Math.round(mrp * 0.15);
  return {
    id,
    name: `${brand} ${slug[0].toUpperCase() + slug.slice(1)} — Premium Quality`,
    brand,
    category: slug,
    images: [
      `https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=600&q=80`,
      `https://images.unsplash.com/photo-1562259949-e8e7689d7828?auto=format&fit=crop&w=600&q=80`,
      `https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=600&q=80`,
    ],
    mrp,
    price: mrp - discount,
    rating: 4.8,
    reviews: 128,
    inStock: true,
    unit: "1 Piece",
    description: `High-quality, durable material sourced from trusted manufacturers. Ideal for residential and commercial construction projects. Available for fast delivery across ${regionName} with region-based pricing.`,
    specs: [
      { label: "Brand", value: brand },
      { label: "Category", value: slug[0].toUpperCase() + slug.slice(1) },
      { label: "Unit Packaging", value: "1 Piece" },
      { label: "Warranty", value: "1 Year Manufacturer Warranty" },
      { label: "Delivery", value: "2-4 business days" },
    ],
    reviewsList: [],
  };
}

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addItem } = useCart();
  const { region } = useRegion();
  const { products = [] } = useAdmin();

  const product = useMemo(() => {
    const realProd = products.find((p) => p.id === id);
    if (realProd) {
      const mrp = Math.round(Number(realProd.price) * 1.15);
      const extractedImages = getProductImages(realProd);
      return {
        id: realProd.id,
        name: realProd.name,
        brand: realProd.brand || "Generic",
        category: realProd.categoryName || "Material",
        vendorId: realProd.vendorId,
        vendorName: realProd.vendorName,
        images: extractedImages,
        mrp,
        price: Number(realProd.price) || 100,
        rating: 5.0,
        reviews: 0,
        inStock: (realProd.stockQty || 0) > 0,
        unit: realProd.unit || "Unit",
        description: realProd.description || `High-quality certified ${realProd.name} by ${realProd.brand}. Supplied directly by ${realProd.vendorName || "Authorized Vendor"}.`,
        specs: [
          { label: "Vendor Shop", value: realProd.vendorName || "Authorized BuildCity Vendor" },
          { label: "Brand", value: realProd.brand || "Generic" },
          { label: "Grade", value: realProd.grade || "Standard" },
          { label: "Type", value: realProd.type || "Standard Type" },
          { label: "Packaging Unit", value: realProd.unit || "Unit" },
          { label: "Available Stock", value: `${realProd.stockQty || 100} units` },
        ],
        reviewsList: [],
      };
    }
    return generateProduct(id, region.priceFactor, region.name);
  }, [id, products, region]);

  const [qty, setQty] = useState(1);
  const [justAdded, setJustAdded] = useState(false);

  // Reviews state with instant localStorage cache + Supabase Database sync
  const [reviewsList, setReviewsList] = useState(() => {
    try {
      const saved = localStorage.getItem(`buildcity_reviews_${id}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (err) {}
    return [];
  });

  const [newRating, setNewRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewerName, setReviewerName] = useState(user?.name || "");
  const [reviewComment, setReviewComment] = useState("");
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // Sync state when product ID changes
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`buildcity_reviews_${id}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setReviewsList(parsed);
          return;
        }
      }
    } catch (e) {}
    setReviewsList([]);
  }, [id]);

  useEffect(() => {
    if (user?.name && !reviewerName) {
      setReviewerName(user.name);
    }
  }, [user]);

  // Fetch Reviews from Database (Supabase PostgreSQL API via API_BASE_URL)
  useEffect(() => {
    let isMounted = true;
    fetch(`${API_BASE_URL}/api/v1/reviews?productId=${encodeURIComponent(id)}`)
      .then((res) => {
        if (!res.ok) throw new Error("API status " + res.status);
        return res.json();
      })
      .then((data) => {
        if (isMounted && Array.isArray(data)) {
          setReviewsList((prevList) => {
            // Merge DB data with local offline submissions so user reviews are NEVER erased
            const mergedMap = new Map();
            data.forEach((item) => {
              if (item && item.comment) mergedMap.set(item.id || item.comment, item);
            });
            prevList.forEach((item) => {
              if (item && item.comment && !mergedMap.has(item.id || item.comment)) {
                mergedMap.set(item.id || item.comment, item);
              }
            });
            const merged = Array.from(mergedMap.values());
            try {
              localStorage.setItem(`buildcity_reviews_${id}`, JSON.stringify(merged));
            } catch (e) {}
            return merged;
          });
        }
      })
      .catch((err) => {
        console.warn("Failed to fetch live DB reviews, keeping local state:", err);
      });
    return () => {
      isMounted = false;
    };
  }, [id]);

  // Recalculate Average Rating and Count Live
  const avgRating = useMemo(() => {
    if (!reviewsList || reviewsList.length === 0) return 5.0;
    const sum = reviewsList.reduce((acc, r) => acc + Number(r.rating || 5), 0);
    return (sum / reviewsList.length).toFixed(1);
  }, [reviewsList]);

  const discountPct = Math.round(
    ((product.mrp - product.price) / product.mrp) * 100
  );

  const handleAddToCart = () => {
    addItem(
      {
        id: product.id,
        name: product.name,
        brand: product.brand,
        img: product.images[0],
        price: product.price,
        mrp: product.mrp,
      },
      qty
    );
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1500);
  };

  const handleBuyNow = () => {
    handleAddToCart();
    navigate("/checkout");
  };

  const handleAddReview = async (e) => {
    e.preventDefault();
    if (!reviewComment.trim()) return;

    const nameToUse = reviewerName.trim() || user?.name || "Verified Customer";

    const newRev = {
      id: `rev-${Date.now()}`,
      productId: id,
      name: nameToUse,
      rating: Number(newRating),
      comment: reviewComment.trim(),
      createdAt: new Date().toISOString(),
      date: "Just now",
    };

    // 1. Save to state and localStorage IMMEDIATELY (Instant & Persistent)
    setReviewsList((prev) => {
      const updated = [newRev, ...prev.filter((r) => r.id !== newRev.id && r.comment !== newRev.comment)];
      try {
        localStorage.setItem(`buildcity_reviews_${id}`, JSON.stringify(updated));
      } catch (err) {}
      return updated;
    });

    setReviewComment("");
    setReviewSubmitted(true);
    setShowForm(false);

    // 2. Persist to Supabase DB via REST API
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: id,
          name: nameToUse,
          rating: Number(newRating),
          comment: reviewComment.trim(),
        }),
      });
      if (res.ok) {
        const savedRev = await res.json();
        setReviewsList((prev) => {
          const synced = prev.map((r) => (r.id === newRev.id ? savedRev : r));
          try {
            localStorage.setItem(`buildcity_reviews_${id}`, JSON.stringify(synced));
          } catch (e) {}
          return synced;
        });
      }
    } catch (err) {
      console.error("Failed to post review to DB (kept in device storage):", err);
    }

    setTimeout(() => setReviewSubmitted(false), 3000);
  };

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
          {/* Interactive Image Slider */}
          <div>
            <ProductImageSlider images={product.images} name={product.name} />
          </div>

          {/* Info Section */}
          <div>
            <span className="text-xs font-bold text-brand-600 uppercase tracking-wider">{product.brand}</span>
            <h1 className="text-xl sm:text-2xl font-extrabold text-navy-900 mt-1 mb-2 leading-snug tracking-tight">
              {product.name}
            </h1>

            <div className="flex items-center gap-2 mb-4">
              <span className="flex items-center gap-1 bg-amber-500 text-white text-xs font-bold px-2 py-0.5 rounded-lg shadow-2xs">
                {avgRating} <StarIcon />
              </span>
              <span className="text-xs font-semibold text-slate-500">
                ({reviewsList.length} Customer Reviews)
              </span>
            </div>

            <div className="flex items-baseline gap-2.5 mb-1">
              <span className="text-2xl font-black text-navy-900 tracking-tight">
                ₹{product.price.toLocaleString("en-IN")}
              </span>
              {discountPct > 0 && (
                <span className="text-xs text-slate-400 line-through font-medium">
                  ₹{product.mrp.toLocaleString("en-IN")}
                </span>
              )}
              {discountPct > 0 && (
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  {discountPct}% OFF
                </span>
              )}
            </div>

            <div className="mb-6">
              <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                In Stock — Ready for site delivery
              </span>
            </div>

            {/* Qty selector */}
            <div className="flex items-center gap-4 mb-5">
              <span className="text-xs font-bold text-navy-900">Quantity</span>
              <div className="flex items-center border border-slate-200 rounded-xl bg-white shadow-2xs">
                <button
                  type="button"
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  className="px-3.5 py-1.5 text-slate-600 font-bold hover:bg-slate-100 rounded-l-xl transition-colors cursor-pointer"
                >
                  −
                </button>
                <span className="px-4 text-xs font-extrabold text-navy-900">{qty}</span>
                <button
                  type="button"
                  onClick={() => setQty((q) => q + 1)}
                  className="px-3.5 py-1.5 text-slate-600 font-bold hover:bg-slate-100 rounded-r-xl transition-colors cursor-pointer"
                >
                  +
                </button>
              </div>
            </div>

            <div className="flex gap-3 mb-8">
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

            {/* Description */}
            <div className="mb-6 bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
              <h3 className="text-xs font-extrabold text-navy-900 uppercase tracking-wider mb-1.5">Description</h3>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                {product.description}
              </p>
            </div>

            {/* Specs */}
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

        {/* Customer Reviews Section */}
        <section className="mt-12 bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-6">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-navy-900 tracking-tight">
                  Customer Reviews
                </h2>
                <span className="bg-amber-50 text-amber-700 font-extrabold text-xs px-2.5 py-0.5 rounded-full border border-amber-200 flex items-center gap-1">
                  ⭐ {avgRating} / 5.0
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">Verified customer ratings & real site experiences.</p>
            </div>

            <button
              type="button"
              onClick={() => setShowForm((v) => !v)}
              className="bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs transition-all active:scale-[0.98] cursor-pointer shrink-0"
            >
              {showForm ? "✕ Close Form" : "✍️ Write a Review"}
            </button>
          </div>

          {/* Success Banner */}
          {reviewSubmitted && (
            <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-fade-in">
              <span>🎉 Thank you! Your review has been published successfully.</span>
            </div>
          )}

          {/* Review Submission Form */}
          {showForm && (
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
                      <span className={(hoverRating || newRating) >= star ? "text-amber-400" : "text-slate-300"}>
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
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-brand-500 rounded-xl shadow-xs hover:bg-brand-600 active:scale-[0.98] transition-all cursor-pointer"
                >
                  Submit Review
                </button>
              </div>
            </form>
          )}

          {/* Reviews List */}
          {reviewsList.length === 0 ? (
            <div className="py-8 px-4 text-center bg-slate-50/80 rounded-2xl border border-dashed border-slate-300 flex flex-col items-center justify-center">
              <span className="text-3xl mb-2">⭐</span>
              <h4 className="text-xs font-black text-navy-900 mb-1">No Customer Reviews Yet</h4>
              <p className="text-[11px] text-slate-500 max-w-sm mb-3">Be the first verified customer to share your experience with this product!</p>
              {!showForm && (
                <button
                  type="button"
                  onClick={() => setShowForm(true)}
                  className="bg-navy-900 hover:bg-brand-500 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all cursor-pointer shadow-2xs"
                >
                  ✍️ Write the First Review
                </button>
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
                      <span className="flex items-center gap-1 text-[11px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200/60">
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