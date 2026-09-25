// "Load more" control for cursor-paginated lists (orders, customers)
export default function LoadMoreButton({ hasMore, loading, onClick, label = "Load older orders", shown, total }) {
  if (!hasMore) {
    return shown > 0 && total > 0 ? (
      <p className="text-center text-[11px] font-semibold text-slate-400 py-3">Showing all {total}</p>
    ) : null;
  }

  return (
    <div className="flex flex-col items-center gap-1.5 py-4">
      <button
        type="button"
        onClick={onClick}
        disabled={loading}
        className="bg-white hover:bg-slate-50 text-navy-900 font-bold text-xs px-4 py-2.5 rounded-xl border border-slate-200 shadow-2xs active:scale-95 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {loading ? "Loading…" : label}
      </button>
      {shown > 0 && total > 0 && (
        <span className="text-[11px] font-semibold text-slate-400 tabular-nums">
          Showing {Math.min(shown, total)} of {total}
        </span>
      )}
    </div>
  );
}
