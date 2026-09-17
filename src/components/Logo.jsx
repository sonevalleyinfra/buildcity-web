export default function Logo({ variant = "dark", size = "md", iconOnly = false }) {
  const isLight = variant === "light";
  const primaryTextColor = isLight ? "text-white" : "text-navy-900";
  const accentColor = isLight ? "text-amber-400" : "text-brand-500";
  const subColor = isLight ? "text-slate-300" : "text-slate-400";

  const sizes = {
    sm: {
      badge: "w-7 h-7 sm:w-8 sm:h-8",
      title: "text-base font-black tracking-tight",
      sub: "text-[9px] font-bold tracking-wider",
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
    <div className="flex items-center gap-2 select-none group">
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
        <div className="leading-none">
          <div className={`${s.title} ${primaryTextColor} flex items-center`}>
            <span>Build</span>
            <span className={`${accentColor} ml-0.5`}>City</span>
            <span className="w-1.5 h-1.5 rounded-full bg-brand-500 ml-1 inline-block animate-pulse" />
          </div>
          <div className={`${s.sub} ${subColor} uppercase tracking-widest mt-1 font-bold`}>
            Building Materials
          </div>
        </div>
      )}
    </div>
  );
}
