export default function Logo({ variant = "dark", size = "md", iconOnly = false }) {
  const isLight = variant === "light";
  const primaryTextColor = isLight ? "text-white" : "text-navy-900";
  const accentColor = isLight ? "text-amber-400" : "text-brand-500";
  const subColor = isLight ? "text-slate-300" : "text-slate-400";

  const sizes = {
    sm: {
      badge: "w-7 h-7 rounded-lg",
      iconSvg: "w-4 h-4",
      title: "text-base font-black tracking-tight",
      sub: "text-[9px] font-bold tracking-wider",
    },
    md: {
      badge: "w-9 h-9 rounded-xl",
      iconSvg: "w-5 h-5",
      title: "text-xl font-black tracking-tight",
      sub: "text-[10px] font-bold tracking-wider",
    },
    lg: {
      badge: "w-11 h-11 rounded-2xl",
      iconSvg: "w-6 h-6",
      title: "text-2xl font-black tracking-tight",
      sub: "text-xs font-bold tracking-wider",
    },
  };
  const s = sizes[size] || sizes.md;

  return (
    <div className="flex items-center gap-2.5 select-none group">
      {/* Modern 3D Architectural / Construction Brand Icon */}
      <div
        className={`${s.badge} bg-gradient-to-tr from-brand-600 via-brand-500 to-amber-400 shadow-sm shadow-brand-500/30 flex items-center justify-center text-white shrink-0 group-hover:scale-105 transition-transform duration-200`}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`${s.iconSvg} stroke-white`}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* Main high-rise architectural tower */}
          <path d="M3 21h18" strokeWidth="2.2" />
          <path d="M5 21V7l7-4v18" fill="rgba(255,255,255,0.15)" strokeWidth="2" />
          <path d="M12 21V11l7 4v6" fill="rgba(255,255,255,0.25)" strokeWidth="2" />
          {/* Structural window facets */}
          <line x1="8" y1="9" x2="9" y2="9" strokeWidth="2.2" />
          <line x1="8" y1="13" x2="9" y2="13" strokeWidth="2.2" />
          <line x1="8" y1="17" x2="9" y2="17" strokeWidth="2.2" />
          <line x1="15" y1="16" x2="16" y2="16" strokeWidth="2.2" />
        </svg>
      </div>

      {!iconOnly && (
        <div className="leading-none">
          <div className={`${s.title} ${primaryTextColor} flex items-center`}>
            <span>Build</span>
            <span className={`${accentColor} ml-0.5`}>City</span>
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 ml-1 inline-block animate-pulse" />
          </div>
          <div className={`${s.sub} ${subColor} uppercase tracking-widest mt-0.5`}>
            Building Materials
          </div>
        </div>
      )}
    </div>
  );
}
