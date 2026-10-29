import { useState, useRef, useEffect, useCallback } from "react";
import { cleanProductImage } from "../utils/productImage";

export function getProductImages(product) {
  if (!product) return [cleanProductImage(null)];
  if (Array.isArray(product.images) && product.images.length > 0) {
    const valid = product.images.filter((img) => Boolean(img) && !String(img).includes("photo-1589939705384-5185137a7f0f"));
    if (valid.length > 0) return valid;
  }
  if (typeof product.imageUrl === "string" && product.imageUrl.trim()) {
    const split = product.imageUrl
      .split(",")
      .map((s) => s.trim())
      .filter((s) => Boolean(s) && !s.includes("photo-1589939705384-5185137a7f0f"));
    if (split.length > 0) return split;
  }
  return [cleanProductImage(product)];
}

export default function ProductImageSlider({ images = [], name = "Product Image", categoryName = "" }) {
  const [activeIdx, setActiveIdx] = useState(0);
  const validImages = Array.isArray(images)
    ? images.filter((img) => Boolean(img) && !String(img).includes("photo-1589939705384-5185137a7f0f"))
    : [];
  const imgList = validImages.length > 0 ? validImages : [cleanProductImage(null, categoryName, name)];

  // Zoom Lightbox State
  const [isZoomOpen, setIsZoomOpen] = useState(false);
  const [zoomScale, setZoomScale] = useState(1);
  const [panPosition, setPanPosition] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0 });

  // Swipe / Drag Tracking State (for main slider)
  const touchStartRef = useRef({ x: 0, y: 0, time: 0 });
  const mouseStartRef = useRef({ x: 0, y: 0, isDown: false });
  const [slideDirection, setSlideDirection] = useState("next");

  const handlePrev = useCallback(() => {
    setSlideDirection("prev");
    setActiveIdx((prev) => (prev === 0 ? imgList.length - 1 : prev - 1));
    // Reset zoom when navigating
    setZoomScale(1);
    setPanPosition({ x: 0, y: 0 });
  }, [imgList.length]);

  const handleNext = useCallback(() => {
    setSlideDirection("next");
    setActiveIdx((prev) => (prev === imgList.length - 1 ? 0 : prev + 1));
    // Reset zoom when navigating
    setZoomScale(1);
    setPanPosition({ x: 0, y: 0 });
  }, [imgList.length]);

  // Touch handlers for mobile swipe
  const handleTouchStart = (e) => {
    if (!e.touches || e.touches.length === 0) return;
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
      time: Date.now()
    };
  };

  const handleTouchEnd = (e) => {
    if (!e.changedTouches || e.changedTouches.length === 0) return;
    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;
    const deltaX = endX - touchStartRef.current.x;
    const deltaY = endY - touchStartRef.current.y;
    const elapsed = Date.now() - touchStartRef.current.time;

    // Minimum swipe distance is 40px, and horizontal swipe must dominate vertical swipe
    if (Math.abs(deltaX) > 40 && Math.abs(deltaX) > Math.abs(deltaY) * 1.2 && elapsed < 600) {
      if (deltaX < 0) {
        handleNext();
      } else {
        handlePrev();
      }
    }
  };

  // Mouse drag handlers for desktop swipe
  const handleMouseDown = (e) => {
    // Only left click
    if (e.button !== 0) return;
    mouseStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      isDown: true
    };
  };

  const handleMouseUp = (e) => {
    if (!mouseStartRef.current.isDown) return;
    const deltaX = e.clientX - mouseStartRef.current.x;
    const deltaY = e.clientY - mouseStartRef.current.y;
    mouseStartRef.current.isDown = false;

    // If dragged horizontally by more than 45px
    if (Math.abs(deltaX) > 45 && Math.abs(deltaX) > Math.abs(deltaY)) {
      if (deltaX < 0) {
        handleNext();
      } else {
        handlePrev();
      }
    } else if (Math.abs(deltaX) < 5 && Math.abs(deltaY) < 5) {
      // It's a clean tap/click -> open zoom lightbox
      setIsZoomOpen(true);
    }
  };

  // Keyboard navigation & Esc listener for zoom modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isZoomOpen) return;
      if (e.key === "Escape") {
        setIsZoomOpen(false);
        setZoomScale(1);
        setPanPosition({ x: 0, y: 0 });
      } else if (e.key === "ArrowLeft") {
        handlePrev();
      } else if (e.key === "ArrowRight") {
        handleNext();
      } else if (e.key === "+" || e.key === "=") {
        setZoomScale((prev) => Math.min(3.5, Number((prev + 0.5).toFixed(1))));
      } else if (e.key === "-" || e.key === "_") {
        setZoomScale((prev) => {
          const next = Math.max(1, Number((prev - 0.5).toFixed(1)));
          if (next === 1) setPanPosition({ x: 0, y: 0 });
          return next;
        });
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isZoomOpen, handleNext, handlePrev]);

  // Lock body scroll when zoom modal is open
  useEffect(() => {
    if (isZoomOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isZoomOpen]);

  // Zoom Modal Pan (Drag) Handlers
  const handleModalPanStart = (e) => {
    if (zoomScale <= 1) return;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    setIsPanning(true);
    panStartRef.current = {
      x: clientX - panPosition.x,
      y: clientY - panPosition.y
    };
  };

  const handleModalPanMove = (e) => {
    if (!isPanning || zoomScale <= 1) return;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const maxX = (zoomScale - 1) * 250;
    const maxY = (zoomScale - 1) * 250;
    const newX = Math.max(-maxX, Math.min(maxX, clientX - panStartRef.current.x));
    const newY = Math.max(-maxY, Math.min(maxY, clientY - panStartRef.current.y));
    setPanPosition({ x: newX, y: newY });
  };

  const handleModalPanEnd = () => {
    setIsPanning(false);
  };

  const toggleZoomLevel = () => {
    if (zoomScale > 1) {
      setZoomScale(1);
      setPanPosition({ x: 0, y: 0 });
    } else {
      setZoomScale(2.5);
    }
  };

  const currentImage = imgList[activeIdx] || imgList[0];

  return (
    <div className="space-y-3 select-none">
      {/* Main Feature Image Slider with Touch Swipe & Click-to-Zoom */}
      <div
        className="relative w-full aspect-4/3 sm:aspect-square bg-slate-50/90 rounded-2xl overflow-hidden border border-slate-200 group shadow-xs flex items-center justify-center p-4 cursor-grab active:cursor-grabbing touch-pan-y"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
      >
        <img
          key={activeIdx}
          src={currentImage}
          alt={`${name} - Image ${activeIdx + 1}`}
          draggable={false}
          className="w-full h-full object-contain pointer-events-none transition-all duration-300 group-hover:scale-105"
        />

        {/* Zoom Hint Badge */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsZoomOpen(true);
          }}
          className="absolute bottom-3 left-3 bg-white/95 hover:bg-white text-slate-700 text-xs font-bold px-2.5 py-1.5 rounded-full shadow-md border border-slate-200/80 backdrop-blur-xs flex items-center gap-1.5 transition-transform hover:scale-105 active:scale-95 cursor-pointer z-10"
          title="Click to Zoom"
        >
          <svg className="w-3.5 h-3.5 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
          </svg>
          <span className="hidden sm:inline">Tap to Zoom</span>
        </button>

        {/* Counter Badge */}
        {imgList.length > 1 && (
          <div className="absolute top-3 right-3 bg-slate-900/80 backdrop-blur-md text-white text-[11px] font-extrabold px-2.5 py-1 rounded-full border border-white/20 shadow-xs z-10">
            {activeIdx + 1} / {imgList.length}
          </div>
        )}

        {/* Slider Navigation Arrows (< & >) */}
        {imgList.length > 1 && (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handlePrev();
              }}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 hover:bg-white text-navy-900 shadow-md flex items-center justify-center font-black text-lg backdrop-blur-xs transition-all hover:scale-110 active:scale-95 cursor-pointer z-10 border border-slate-200"
              aria-label="Previous Image"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleNext();
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 hover:bg-white text-navy-900 shadow-md flex items-center justify-center font-black text-lg backdrop-blur-xs transition-all hover:scale-110 active:scale-95 cursor-pointer z-10 border border-slate-200"
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
              onClick={() => {
                setActiveIdx(idx);
                setZoomScale(1);
                setPanPosition({ x: 0, y: 0 });
              }}
              className={`relative w-14 h-14 rounded-xl overflow-hidden border-2 bg-slate-50 flex items-center justify-center p-1 transition-all cursor-pointer shrink-0 ${
                activeIdx === idx
                  ? "border-brand-500 ring-2 ring-brand-500/30 scale-105"
                  : "border-slate-200 opacity-70 hover:opacity-100"
              }`}
            >
              <img src={url} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-contain pointer-events-none" />
            </button>
          ))}
        </div>
      )}

      {/* Fullscreen High-Resolution Zoom Lightbox Modal */}
      {isZoomOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex flex-col justify-between select-none animate-fadeIn"
          onClick={() => {
            if (zoomScale === 1) {
              setIsZoomOpen(false);
            }
          }}
        >
          {/* Top Bar / Controls */}
          <div
            className="flex items-center justify-between px-4 py-3 bg-slate-900/80 backdrop-blur-md border-b border-white/10 z-20"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <span className="text-white/90 text-sm font-bold truncate max-w-[200px] sm:max-w-md">
                {name}
              </span>
              <span className="text-white/60 text-xs px-2 py-0.5 rounded-full bg-white/10 border border-white/10">
                {activeIdx + 1} / {imgList.length}
              </span>
            </div>

            {/* Zoom Controls */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setZoomScale((prev) => {
                    const next = Math.max(1, Number((prev - 0.5).toFixed(1)));
                    if (next === 1) setPanPosition({ x: 0, y: 0 });
                    return next;
                  });
                }}
                disabled={zoomScale <= 1}
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-40 text-white flex items-center justify-center text-lg font-bold transition-all cursor-pointer disabled:cursor-not-allowed"
                title="Zoom Out"
              >
                −
              </button>
              <span className="text-white text-xs font-mono font-semibold min-w-[40px] text-center">
                {Math.round(zoomScale * 100)}%
              </span>
              <button
                type="button"
                onClick={() => {
                  setZoomScale((prev) => Math.min(3.5, Number((prev + 0.5).toFixed(1))));
                }}
                disabled={zoomScale >= 3.5}
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-40 text-white flex items-center justify-center text-lg font-bold transition-all cursor-pointer disabled:cursor-not-allowed"
                title="Zoom In"
              >
                +
              </button>
              {zoomScale > 1 && (
                <button
                  type="button"
                  onClick={() => {
                    setZoomScale(1);
                    setPanPosition({ x: 0, y: 0 });
                  }}
                  className="px-2.5 py-1 text-xs rounded-lg bg-brand-500 hover:bg-brand-600 text-white font-bold transition-all cursor-pointer"
                >
                  Reset
                </button>
              )}
              {/* Close Button */}
              <button
                type="button"
                onClick={() => {
                  setIsZoomOpen(false);
                  setZoomScale(1);
                  setPanPosition({ x: 0, y: 0 });
                }}
                className="ml-2 w-8 h-8 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-200 hover:text-white flex items-center justify-center text-base font-bold transition-all cursor-pointer border border-red-500/30"
                title="Close (Esc)"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Modal Center Zoom Viewport */}
          <div
            className={`relative flex-1 flex items-center justify-center overflow-hidden p-2 sm:p-6 ${
              zoomScale > 1 ? "cursor-grab active:cursor-grabbing" : "cursor-zoom-in"
            }`}
            onClick={(e) => {
              e.stopPropagation();
              if (zoomScale === 1) {
                toggleZoomLevel();
              }
            }}
            onMouseDown={handleModalPanStart}
            onMouseMove={handleModalPanMove}
            onMouseUp={handleModalPanEnd}
            onTouchStart={zoomScale > 1 ? handleModalPanStart : handleTouchStart}
            onTouchMove={zoomScale > 1 ? handleModalPanMove : undefined}
            onTouchEnd={zoomScale > 1 ? handleModalPanEnd : handleTouchEnd}
          >
            <img
              src={currentImage}
              alt={name}
              draggable={false}
              style={{
                transform: `translate(${panPosition.x}px, ${panPosition.y}px) scale(${zoomScale})`,
                transition: isPanning ? "none" : "transform 0.25s ease-out"
              }}
              className="max-h-[82vh] max-w-[92vw] object-contain select-none pointer-events-none drop-shadow-2xl"
            />

            {/* In-Modal Prev / Next Arrows */}
            {imgList.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePrev();
                  }}
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/20 hover:bg-white/40 text-white shadow-xl flex items-center justify-center font-black text-2xl backdrop-blur-md transition-all hover:scale-110 active:scale-95 cursor-pointer border border-white/20"
                  aria-label="Previous Image"
                >
                  ‹
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleNext();
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/20 hover:bg-white/40 text-white shadow-xl flex items-center justify-center font-black text-2xl backdrop-blur-md transition-all hover:scale-110 active:scale-95 cursor-pointer border border-white/20"
                  aria-label="Next Image"
                >
                  ›
                </button>
              </>
            )}
          </div>

          {/* Modal Bottom Thumbnail Bar */}
          {imgList.length > 1 && (
            <div
              className="flex justify-center items-center gap-2 py-3 px-4 bg-slate-900/80 backdrop-blur-md border-t border-white/10 overflow-x-auto no-scrollbar z-20"
              onClick={(e) => e.stopPropagation()}
            >
              {imgList.map((url, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setActiveIdx(idx);
                    setZoomScale(1);
                    setPanPosition({ x: 0, y: 0 });
                  }}
                  className={`relative w-12 h-12 rounded-lg overflow-hidden border-2 bg-slate-800 flex items-center justify-center p-0.5 transition-all cursor-pointer shrink-0 ${
                    activeIdx === idx
                      ? "border-brand-400 ring-2 ring-brand-400/50 scale-105"
                      : "border-white/20 opacity-60 hover:opacity-100"
                  }`}
                >
                  <img src={url} alt={`Zoom Thumb ${idx + 1}`} className="w-full h-full object-contain pointer-events-none" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
