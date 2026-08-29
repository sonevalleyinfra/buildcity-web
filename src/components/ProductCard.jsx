import { useState } from "react";
import { Link } from "react-router-dom";
import { useCart } from "../context/CartContext";

export default function ProductCard({ product }) {
  const { addItem } = useCart();
  const [justAdded, setJustAdded] = useState(false);

  const discountPct =
    product.mrp > product.price
      ? Math.round(((product.mrp - product.price) / product.mrp) * 100)
      : 0;

  const handleAdd = () => {
    addItem(product, 1);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1500);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col group">
      <Link to={`/product/${product.id}`} className="relative block aspect-square bg-slate-100">
        {discountPct > 0 && (
          <span className="absolute top-2 left-2 z-10 bg-success text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
            {discountPct}% OFF
          </span>
        )}
        <img
          src={product.img}
          alt={product.name}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
      </Link>

      <div className="p-3 flex flex-col flex-1">
        <div className="flex items-center justify-between text-[11px] mb-0.5 gap-1">
          <span className="text-slate-400 truncate">{product.brand}</span>
          {product.vendorName && (
            <span className="text-brand-600 font-bold bg-brand-50 border border-brand-200/80 px-1.5 py-0.5 rounded text-[10px] shrink-0 truncate max-w-[130px]" title={product.vendorName}>
              🏪 {product.vendorName}
            </span>
          )}
        </div>
        <Link
          to={`/product/${product.id}`}
          className="text-sm font-medium text-navy-900 leading-snug line-clamp-2 mb-1.5 hover:text-brand-500"
        >
          {product.name}
        </Link>

        <div className="flex items-center gap-1 text-[11px] text-slate-500 mb-2">
          <StarIcon />
          {product.rating}
          <span className="text-slate-300">•</span>
          {product.reviews} reviews
        </div>

        <div className="flex items-baseline gap-1.5 mb-3">
          <span className="text-sm font-bold text-navy-900">
            ₹{product.price.toLocaleString("en-IN")}
          </span>
          {discountPct > 0 && (
            <span className="text-xs text-slate-400 line-through">
              ₹{product.mrp.toLocaleString("en-IN")}
            </span>
          )}
        </div>

        <button
          onClick={handleAdd}
          className={`mt-auto w-full text-sm font-semibold rounded-lg py-2 transition-colors ${
            justAdded
              ? "bg-success text-white"
              : "border border-brand-500 text-brand-500 hover:bg-brand-500 hover:text-white"
          }`}
        >
          {justAdded ? "Added ✓" : "Add to Cart"}
        </button>
      </div>
    </div>
  );
}

function StarIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="#F59E0B">
      <path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1L12 2Z" />
    </svg>
  );
}