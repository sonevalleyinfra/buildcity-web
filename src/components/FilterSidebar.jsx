const priceRanges = [
  { label: "Under ₹500", min: 0, max: 500 },
  { label: "₹500 – ₹1,500", min: 500, max: 1500 },
  { label: "₹1,500 – ₹5,000", min: 1500, max: 5000 },
  { label: "Above ₹5,000", min: 5000, max: Infinity },
];

export default function FilterSidebar({
  brands,
  selectedBrands,
  onToggleBrand,
  selectedPrice,
  onSelectPrice,
  onClear,
}) {
  return (
    <aside className="w-full sm:w-60 shrink-0">
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:sticky sm:top-20">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-navy-900">Filters</h3>
          <button
            onClick={onClear}
            className="text-xs font-medium text-brand-500 hover:underline"
          >
            Clear all
          </button>
        </div>

        {/* Brand filter yaha se hota hai  */}
        <div className="mb-6">
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
            Brand
          </h4>
          <div className="space-y-2.5">
            {brands.map((b) => (
              <label
                key={b}
                className="flex items-center gap-2.5 text-sm text-slate-700 cursor-pointer select-none"
              >
                <input
                  type="checkbox"
                  checked={selectedBrands.includes(b)}
                  onChange={() => onToggleBrand(b)}
                  className="h-4 w-4 rounded border-slate-300 accent-[#1E5FD9]"
                />
                {b}
              </label>
            ))}
          </div>
        </div>

        {/* Price filter yaha se hota hai  */}
        <div>
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
            Price
          </h4>
          <div className="space-y-2.5">
            {priceRanges.map((r) => (
              <label
                key={r.label}
                className="flex items-center gap-2.5 text-sm text-slate-700 cursor-pointer select-none"
              >
                <input
                  type="radio"
                  name="price"
                  checked={selectedPrice?.label === r.label}
                  onChange={() => onSelectPrice(r)}
                  className="h-4 w-4 border-slate-300 accent-[#1E5FD9]"
                />
                {r.label}
              </label>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
}

export { priceRanges };