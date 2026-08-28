import { useState } from "react";

export function getProductImages(product) {
  if (!product) return ["https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=400&q=80"];
  if (Array.isArray(product.images) && product.images.length > 0) {
    const valid = product.images.filter(Boolean);
    if (valid.length > 0) return valid;
  }
  if (typeof product.imageUrl === "string" && product.imageUrl.trim()) {
    const split = product.imageUrl.split(",").map((s) => s.trim()).filter(Boolean);
    if (split.length > 0) return split;
  }
  return ["https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=400&q=80"];
}

export default function ProductImageSlider({ images = [], name = "Product Image" }) {
  const [activeIdx, setActiveIdx] = useState(0);
  const imgList = Array.isArray(images) && images.length > 0 ? images.filter(Boolean) : [
    "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=400&q=80"
  ];

  const handlePrev = () => {
    setActiveIdx((prev) => (prev === 0 ? imgList.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setActiveIdx((prev) => (prev === imgList.length - 1 ? 0 : prev + 1));
  };

  return (
    <div className="space-y-3">
      {/* Main Feature Image Slider */}
      <div className="relative w-full aspect-4/3 sm:aspect-square bg-slate-100 rounded-2xl overflow-hidden border border-slate-200 group shadow-xs">
        <img
          src={imgList[activeIdx] || imgList[0]}
          alt={`${name} - Image ${activeIdx + 1}`}
          className="w-full h-full object-cover transition-all duration-300 group-hover:scale-105"
        />

        {/* Counter Badge */}
        {imgList.length > 1 && (
          <div className="absolute top-3 right-3 bg-slate-900/80 backdrop-blur-md text-white text-[11px] font-extrabold px-2.5 py-1 rounded-full border border-white/20 shadow-xs">
            {activeIdx + 1} / {imgList.length}
          </div>
        )}

        {/* Slider Navigation Arrows (< & >) */}
        {imgList.length > 1 && (
          <>
            <button
              type="button"
              onClick={handlePrev}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 hover:bg-white text-navy-900 shadow-md flex items-center justify-center font-extrabold text-base backdrop-blur-xs transition-all hover:scale-110 active:scale-95 cursor-pointer"
              aria-label="Previous Image"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 hover:bg-white text-navy-900 shadow-md flex items-center justify-center font-extrabold text-base backdrop-blur-xs transition-all hover:scale-110 active:scale-95 cursor-pointer"
              aria-label="Next Image"
            >
              ›
            </button>
          </>
        )}
      </div>

      {/* Thumbnails Row */}
      {imgList.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {imgList.map((url, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setActiveIdx(idx)}
              className={`relative w-14 h-14 rounded-xl overflow-hidden border-2 transition-all cursor-pointer shrink-0 ${
                activeIdx === idx ? "border-brand-500 ring-2 ring-brand-500/30 scale-105" : "border-slate-200 opacity-70 hover:opacity-100"
              }`}
            >
              <img src={url} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
