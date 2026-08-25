export default function Logo({ variant = "dark", size = "md" }) {
  const textColor = variant === "light" ? "text-white" : "text-navy-900";
  const subColor = variant === "light" ? "text-white/70" : "text-slate-500";
  const iconColor = variant === "light" ? "#FFFFFF" : "#EA580C";

  const sizes = {
    sm: { icon: 22, title: "text-lg", sub: "text-[10px]" },
    md: { icon: 28, title: "text-2xl", sub: "text-xs" },
    lg: { icon: 34, title: "text-3xl", sub: "text-sm" },
  };
  const s = sizes[size];

  return (
    <div className="flex items-center gap-2.5">
      <svg width={s.icon} height={s.icon} viewBox="0 0 32 32" fill="none">
        <path
          d="M2 17L16 4L30 17"
          stroke={iconColor}
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M8 15L18 6L28 15"
          stroke={iconColor}
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.45"
        />
      </svg>
      <div className="leading-tight">
        <div className={`font-extrabold tracking-tight ${s.title} ${textColor}`}>
          Build City
        </div>
        <div className={`${s.sub} ${subColor} -mt-0.5`}>Building your dreams</div>
      </div>
    </div>
  );
}
