export default function Logo({ variant = "dark", size = "md", iconOnly = false, hideSubtitle = false }) {
  const isLight = variant === "light";
  const primaryTextColor = isLight ? "text-white" : "text-navy-900";
  const accentColor = "text-brand-500";
  const subColor = isLight ? "text-slate-300" : "text-slate-400";

  const sizes = {
    sm: {
      badge: "w-7 h-7 sm:w-8 sm:h-8",
      title: "text-base font-black tracking-tight",
      sub: "text-[8.5px] font-bold tracking-wider",
    },
    md: {
      badge: "w-9 h-9 sm:w-10 sm:h-10",
      title: "text-xl font-black tracking-tight",
      sub: "text-[10px] font-bold tracking-wider",
    },
    lg: {
      badge: "w-12 h-12 sm:w-14 sm:h-14",
      title: "text-2xl sm:text-3xl font-black tracking-tight",
      sub: "text-xs font-bold tracking-wider",
    },
  };
  const s = sizes[size] || sizes.md;

  return (
    <div className="flex items-center gap-1.5 sm:gap-2 select-none group shrink-0">
      {/* BuildCity Official Orange Roof Brand Icon (100% Transparent) */}
      <div className={`${s.badge} flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-200`}>
        <img
          src="/buildcity-roof-logo.png"
          alt="BuildCity"
          className="w-full h-full object-contain"
          loading="eager"
        />
      </div>

      {!iconOnly && (
        <div className="leading-none shrink-0">
          <div className={`${s.title} ${primaryTextColor} flex items-center`}>
            <span>Build</span>
            <span className={`${accentColor} ml-0.5`}>City</span>
          </div>
          {!hideSubtitle && (
            <div className={`${s.sub} ${subColor} uppercase tracking-widest mt-0.5 font-bold ${size === "sm" ? "hidden sm:block" : ""}`}>
              Building Materials
            </div>
          )}
        </div>
      )}
    </div>
  );
}
