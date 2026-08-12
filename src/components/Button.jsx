export default function Button({
  children,
  variant = "primary",
  className = "",
  ...props
}) {
  const base =
    "w-full rounded-xl py-3 text-sm font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-60 disabled:cursor-not-allowed";

  const variants = {
    primary: "bg-brand-500 text-white hover:bg-brand-600",
    outline:
      "border border-slate-200 text-navy-900 bg-white hover:bg-slate-50",
  };

  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}
