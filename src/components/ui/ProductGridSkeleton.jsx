// Loading placeholder that matches ProductCard's shape, so the grid doesn't jump when products arrive.
export default function ProductGridSkeleton({ count = 8, className = "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 sm:gap-3 lg:gap-4" }) {
  return (
    <div className={className} aria-busy="true" aria-label="Loading products">
      {Array.from({ length: count }, (_, n) => (
        <div key={n} className="rounded-2xl bg-white p-3 ring-1 ring-slate-200/80">
          <div className="bc-skeleton aspect-square w-full rounded-xl" />
          <div className="bc-skeleton mt-3 h-3 w-1/3 rounded" />
          <div className="bc-skeleton mt-2 h-3.5 w-4/5 rounded" />
          <div className="bc-skeleton mt-4 h-4 w-1/2 rounded" />
          <div className="bc-skeleton mt-3 h-9 w-full rounded-xl" />
        </div>
      ))}
    </div>
  );
}
