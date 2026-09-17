import { useState, useEffect } from "react";

const isVendorApp = import.meta.env.VITE_APP_MODE === "vendor";

export default function SplashScreen({ minDuration = 1400, onFinished }) {
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setFading(true);
      const removeTimer = setTimeout(() => {
        setVisible(false);
        if (onFinished) onFinished();
      }, 500); // 500ms fade transition
      return () => clearTimeout(removeTimer);
    }, minDuration);

    return () => clearTimeout(timer);
  }, [minDuration, onFinished]);

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-[99999] flex flex-col items-center justify-between p-6 bg-gradient-to-b from-slate-950 via-slate-900 to-navy-950 text-white select-none transition-opacity duration-500 ease-out ${
        fading ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      {/* Ambient background glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-brand-500/15 rounded-full blur-3xl pointer-events-none" />

      {/* Top spacer */}
      <div className="w-full h-8" />

      {/* Center Branded Identity */}
      <div className="relative flex flex-col items-center text-center -mt-8">
        {/* Logo Card with Breathing Glow */}
        <div className="relative mb-6">
          <div className="absolute inset-0 bg-brand-500/30 rounded-3xl blur-2xl scale-125 animate-pulse pointer-events-none" />
          <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 p-5 shadow-2xl flex items-center justify-center animate-splash-logo">
            <img
              src="/buildcity-roof-logo.png"
              alt="BuildCity Logo"
              className="w-full h-full object-contain"
            />
          </div>
        </div>

        {/* App Title */}
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white mb-2">
          Build<span className="text-brand-500">City</span>
        </h1>

        {/* Subtitle / Mode Badge */}
        {isVendorApp ? (
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-brand-500/15 border border-brand-500/30 text-brand-400 text-xs font-black uppercase tracking-widest shadow-sm">
            <span className="w-2 h-2 rounded-full bg-brand-500 animate-ping" />
            Partner Portal
          </div>
        ) : (
          <p className="text-xs sm:text-sm font-semibold text-slate-300 tracking-wide max-w-xs">
            India&apos;s Building Material Superstore
          </p>
        )}

        {/* Sleek Animated Progress Beam */}
        <div className="mt-8 flex flex-col items-center gap-2">
          <div className="w-36 h-1 bg-slate-800/90 rounded-full overflow-hidden relative shadow-inner">
            <div className="absolute inset-y-0 w-24 bg-gradient-to-r from-transparent via-brand-500 to-transparent rounded-full animate-splash-beam" />
          </div>
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
            {isVendorApp ? "Starting Partner Gateway..." : "Loading Marketplace..."}
          </span>
        </div>
      </div>

      {/* Footer Branding */}
      <div className="text-center pb-2">
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
          Verified Vendors • Direct Pricing • Fast Delivery
        </p>
      </div>
    </div>
  );
}
