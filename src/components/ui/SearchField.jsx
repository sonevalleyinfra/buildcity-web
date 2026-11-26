import { CloseIcon, SearchIcon } from "./Icons";

// Storefront search box (phones/tablets). Submit is handled by the caller.
export default function SearchField({
  value,
  onChange,
  onSubmit,
  placeholder = "Search cement, steel, paints, pipes…",
  autoFocus = false,
  className = "",
}) {
  return (
    <form onSubmit={onSubmit} role="search" className={className}>
      <label className="flex h-11 w-full items-center gap-2.5 rounded-xl border border-transparent bg-slate-100 px-3.5 transition-[border-color,background-color,box-shadow] duration-150 focus-within:border-brand-500 focus-within:bg-white focus-within:shadow-[0_0_0_4px_rgba(234,88,12,0.10)]">
        <SearchIcon className="h-[18px] w-[18px] shrink-0 text-slate-500" />
        <span className="sr-only">Search materials</span>
        <input
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          enterKeyHint="search"
          className="h-full w-full min-w-0 bg-transparent text-sm text-navy-950 outline-none placeholder:text-slate-500 [&::-webkit-search-cancel-button]:hidden"
        />
        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            aria-label="Clear search"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-400 hover:text-slate-600"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        )}
      </label>
    </form>
  );
}
