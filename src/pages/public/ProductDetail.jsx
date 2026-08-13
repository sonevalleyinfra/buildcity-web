import { useMemo, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import Navbar from "../../components/Navbar";
import { useCart } from "../../context/CartContext";
import { useRegion } from "../../context/RegionContext";

// Mock single-product lookup - replace with GET /api/v1/products/:id?region=id jab  backend is ready
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
    images: [0, 1, 2, 3].map(
      (i) => `https://picsum.photos/seed/${slug}${id}${i}/600/600`
    ),
    mrp,
    price: mrp - discount,
    rating: 4.3,
    reviews: 128,
    inStock: true,
    unit: "1 Piece",
    description: `High-quality, durable material sourced from trusted manufacturers. Ideal for residential and commercial construction projects. Available for fast delivery across ${regionName} with region-based pricing.`,
    specs: [
      { label: "Brand", value: brand },
      { label: "Category", value: slug[0].toUpperCase() + slug.slice(1) },
      { label: "Unit", value: "1 Piece" },
      { label: "Warranty", value: "1 Year Manufacturer Warranty" },
      { label: "Delivery", value: "2-4 business days" },
    ],
    reviewsList: [
      { name: "Amit S.", rating: 5, comment: "Bahut acchi quality, time pe deliver bhi ho gaya." },
      { name: "Priya V.", rating: 4, comment: "Price thoda zyada laga par product accha hai." },
      { name: "Rakesh K.", rating: 5, comment: "Vendor ne jaldi respond kiya, packaging solid thi." },
    ],
  };
}

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const { region } = useRegion();
  const product = useMemo(
    () => generateProduct(id, region.priceFactor, region.name),
    [id, region]
  );

  const [activeImg, setActiveImg] = useState(0);
  const [qty, setQty] = useState(1);
  const [justAdded, setJustAdded] = useState(false);

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

  return (
    <div className="min-h-screen bg-surface pb-20">
      <Navbar />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        <div className="text-xs text-slate-400 mb-4">
          <Link to="/" className="hover:text-brand-500">Home</Link>
          <span className="mx-1.5">/</span>
          <Link to={`/category/${product.category}`} className="hover:text-brand-500 capitalize">
            {product.category}
          </Link>
          <span className="mx-1.5">/</span>
          <span className="text-slate-500">{product.name}</span>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Gallery Hai  */}
          <div>
            <div className="aspect-square rounded-2xl overflow-hidden bg-white border border-slate-200 mb-3">
              <img
                src={product.images[activeImg]}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="grid grid-cols-4 gap-2.5">
              {product.images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImg(i)}
                  className={`aspect-square rounded-lg overflow-hidden border-2 ${
                    activeImg === i ? "border-brand-500" : "border-transparent"
                  }`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          {/* Info hai  */}
          <div>
            <span className="text-xs text-slate-400">{product.brand}</span>
            <h1 className="text-xl sm:text-2xl font-bold text-navy-900 mt-1 mb-2 leading-snug">
              {product.name}
            </h1>

            <div className="flex items-center gap-2 mb-4">
              <span className="flex items-center gap-1 bg-success text-white text-xs font-semibold px-2 py-1 rounded">
                {product.rating} <StarIcon />
              </span>
              <span className="text-sm text-slate-500">
                {product.reviews} reviews
              </span>
            </div>

            <div className="flex items-baseline gap-2.5 mb-1">
              <span className="text-2xl font-bold text-navy-900">
                ₹{product.price.toLocaleString("en-IN")}
              </span>
              {discountPct > 0 && (
                <>
                  <span className="text-base text-slate-400 line-through">
                    ₹{product.mrp.toLocaleString("en-IN")}
                  </span>
                  <span className="text-sm font-semibold text-success">
                    {discountPct}% OFF
                  </span>
                </>
              )}
            </div>
            <p className="text-xs text-slate-500 mb-5">
              Inclusive of all taxes • Unit: {product.unit}
            </p>

            <div className="flex items-center gap-2 mb-5">
              <span className="h-2 w-2 rounded-full bg-success" />
              <span className="text-sm text-success font-medium">
                In Stock — ready to ship
              </span>
            </div>

            {/* Qty selector */}
            <div className="flex items-center gap-4 mb-5">
              <span className="text-sm font-medium text-navy-900">Quantity</span>
              <div className="flex items-center border border-slate-200 rounded-lg">
                <button
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  className="px-3.5 py-2 text-slate-500"
                >
                  −
                </button>
                <span className="px-4 text-sm font-semibold">{qty}</span>
                <button
                  onClick={() => setQty((q) => q + 1)}
                  className="px-3.5 py-2 text-slate-500"
                >
                  +
                </button>
              </div>
            </div>

            <div className="flex gap-3 mb-8">
              <button
                onClick={handleAddToCart}
                className={`flex-1 rounded-xl py-3 text-sm font-semibold border transition-colors ${
                  justAdded
                    ? "border-success text-success bg-success/5"
                    : "border-brand-500 text-brand-500 hover:bg-brand-500 hover:text-white"
                }`}
              >
                {justAdded ? "Added to Cart ✓" : "Add to Cart"}
              </button>
              <button
                onClick={handleBuyNow}
                className="flex-1 rounded-xl py-3 text-sm font-semibold bg-brand-500 text-white hover:bg-brand-600"
              >
                Buy Now
              </button>
            </div>

            {/* Description */}
            <div className="mb-6">
              <h3 className="text-sm font-bold text-navy-900 mb-2">Description</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                {product.description}
              </p>
            </div>

            {/* Specs */}
            <div>
              <h3 className="text-sm font-bold text-navy-900 mb-2">Specifications</h3>
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                {product.specs.map((s, i) => (
                  <div
                    key={s.label}
                    className={`flex text-sm px-4 py-2.5 ${
                      i % 2 === 0 ? "bg-white" : "bg-surface"
                    }`}
                  >
                    <span className="w-1/3 text-slate-500">{s.label}</span>
                    <span className="flex-1 text-navy-900 font-medium">
                      {s.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Reviews */}
        <section className="mt-12">
          <h2 className="text-lg font-bold text-navy-900 mb-4">
            Customer Reviews
          </h2>
          <div className="grid sm:grid-cols-3 gap-4">
            {product.reviewsList.map((r) => (
              <div
                key={r.name}
                className="bg-white rounded-xl border border-slate-200 p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-navy-900">
                    {r.name}
                  </span>
                  <span className="flex items-center gap-1 text-xs font-semibold text-warning">
                    {r.rating} <StarIcon />
                  </span>
                </div>
                <p className="text-sm text-slate-600">{r.comment}</p>
              </div>
            ))}
          </div>
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