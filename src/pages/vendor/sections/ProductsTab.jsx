import { PackageIcon, SearchIcon, PlusIcon, ChevronRightIcon } from "../ui/icons";
import { PageHeader, Chip, ChipRow, SearchField, Card, EmptyState, Button, ApprovalBadge } from "../ui/primitives";
import { cx, inr } from "../ui/format";
import { getCategorySpec } from "../../../utils/categoryAttributes";

export function ProductThumb({ src, fallback, alt, className = "h-12 w-12" }) {
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      onError={(e) => {
        e.currentTarget.onerror = null;
        e.currentTarget.src = fallback;
      }}
      className={cx("shrink-0 rounded-xl border border-slate-100 bg-slate-50 object-cover transition-transform duration-300 group-hover:scale-[1.04]", className)}
    />
  );
}

export function ProductRowSkeleton() {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="vd-skeleton h-12 w-12 shrink-0 rounded-xl" />
      <div className="flex-1 space-y-2">
        <div className="vd-skeleton h-3.5 w-2/3 rounded" />
        <div className="vd-skeleton h-3 w-1/3 rounded" />
      </div>
    </div>
  );
}

function stockLabel(qty) {
  const n = Number(qty) || 0;
  return n > 0 ? { text: `${n.toLocaleString("en-IN")} in stock`, cls: "text-emerald-700" } : { text: "Out of stock", cls: "text-brand-700 font-medium" };
}

function ProductRow({ product, index = 0, imageFor, onEdit }) {
  const img = imageFor(product);
  const stock = stockLabel(product.stockQty);
  const price = Number(product.price) || 0;
  const mrp = Number(product.mrp) || 0;
  const spec = getCategorySpec(product.categoryName || product.category);
  const gradeLabel = spec.gradeLabel ? spec.gradeLabel.split("/")[0].trim() : "Grade";
  const gradeMeta = product.grade ? `${gradeLabel}: ${product.grade}` : null;
  const meta = [product.brand, gradeMeta, product.unit].filter(Boolean).join(" · ");

  return (
    <button
      type="button"
      onClick={() => onEdit(product)}
      style={{ "--i": index }}
      className="group grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-brand-50/40 active:bg-brand-50/70 cursor-pointer md:grid-cols-[auto_minmax(0,1fr)_8rem_8rem_6rem_1.25rem] md:gap-4 sm:px-5"
    >
      <ProductThumb src={img.src} fallback={img.fallback} alt={product.name} />

      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-slate-900">{product.name}</p>
        {meta && (
          <p className="mt-0.5 truncate text-xs text-slate-500">
            {product.brand && <span className="font-medium text-brand-700">{product.brand}</span>}
            {product.brand ? meta.slice(String(product.brand).length) : meta}
          </p>
        )}
        <div className="mt-1 flex items-center gap-2 md:hidden">
          <ApprovalBadge status={product.approvalStatus} />
          <span className={cx("text-xs", stock.cls)}>{stock.text}</span>
        </div>
      </div>

      {/* Phone: price on the right */}
      <div className="text-right md:hidden">
        <p className="text-sm font-semibold tabular-nums text-slate-900">{inr(price)}</p>
        {mrp > price && (
          <p className="mt-0.5 flex items-center justify-end gap-1 text-xs tabular-nums">
            <span className="text-slate-400 line-through">{inr(mrp)}</span>
            <span className="rounded bg-emerald-50 px-1 font-semibold text-emerald-700">{Math.round(((mrp - price) / mrp) * 100)}%</span>
          </p>
        )}
      </div>

      {/* Desktop columns */}
      <div className="hidden md:block">
        <p className="text-sm font-semibold tabular-nums text-slate-900">
          {inr(price)}
          <span className="font-normal text-slate-400"> / {product.unit || "unit"}</span>
        </p>
        {mrp > price && (
          <p className="text-xs tabular-nums text-slate-400">
            <span className="line-through">{inr(mrp)}</span>
            <span className="ml-1.5 rounded bg-emerald-50 px-1 font-semibold text-emerald-700">{Math.round(((mrp - price) / mrp) * 100)}% off</span>
          </p>
        )}
      </div>
      <p className={cx("hidden text-sm md:block", stock.cls)}>{stock.text}</p>
      <div className="hidden md:block">
        <ApprovalBadge status={product.approvalStatus} />
      </div>
      <ChevronRightIcon className="hidden h-4 w-4 text-slate-300 transition-[color,transform] duration-200 group-hover:translate-x-0.5 group-hover:text-brand-500 md:block" />
    </button>
  );
}

export default function ProductsTab({
  products,
  displayedProducts,
  loading,
  categories,
  categoryFilter,
  onCategoryFilterChange,
  search,
  onSearchChange,
  imageFor,
  onEdit,
  onAddProduct,
}) {
  const countFor = (cat) =>
    products.filter((p) => p.categoryId === cat.id || (p.categoryName || "").toLowerCase() === cat.name.toLowerCase()).length;
  const categoryChips = categories.map((c) => ({ ...c, count: countFor(c) })).filter((c) => c.count > 0);
  const isSelected = (cat) => categoryFilter === cat.id || categoryFilter.toLowerCase() === cat.name.toLowerCase();

  const addButton = (
    <Button size="sm" onClick={onAddProduct}>
      <PlusIcon className="h-4 w-4" strokeWidth={2.25} />
      Add
    </Button>
  );

  return (
    <div>
      <PageHeader title="Products" subtitle={`${products.length} listed`} actions={<span className="md:hidden">{addButton}</span>} />

      {products.length > 0 && (
        <div className="mb-4 space-y-3">
          <SearchField value={search} onChange={onSearchChange} placeholder="Search name, brand or grade" />
          {categoryChips.length > 1 && (
            <ChipRow>
              <Chip active={categoryFilter === "ALL"} count={products.length} onClick={() => onCategoryFilterChange("ALL")}>
                All
              </Chip>
              {categoryChips.map((cat) => (
                <Chip key={cat.id || cat.name} active={isSelected(cat)} count={cat.count} onClick={() => onCategoryFilterChange(cat.id || cat.name)}>
                  {cat.name}
                </Chip>
              ))}
            </ChipRow>
          )}
        </div>
      )}

      <Card className="overflow-hidden">
        {loading && products.length === 0 ? (
          <div className="divide-y divide-slate-100">
            {[0, 1, 2, 3].map((n) => (
              <ProductRowSkeleton key={n} />
            ))}
          </div>
        ) : products.length === 0 ? (
          <EmptyState
            icon={PackageIcon}
            tone="bg-indigo-50 text-indigo-600 ring-1 ring-inset ring-indigo-100"
            title="No products yet"
            description="Pick products from the BuildCity catalogue and set your price."
            action={
              <Button onClick={onAddProduct}>
                <PlusIcon className="h-4 w-4" strokeWidth={2.25} />
                Add product
              </Button>
            }
          />
        ) : displayedProducts.length === 0 ? (
          <EmptyState
            icon={SearchIcon}
            title="No matching products"
            action={
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  onCategoryFilterChange("ALL");
                  onSearchChange("");
                }}
              >
                Clear filters
              </Button>
            }
          />
        ) : (
          <>
            <div className="hidden grid-cols-[3rem_minmax(0,1fr)_8rem_8rem_6rem_1.25rem] gap-4 border-b border-slate-100 bg-slate-50/60 px-5 py-2.5 text-xs font-medium text-slate-500 md:grid">
              <span />
              <span>Product</span>
              <span>Price</span>
              <span>Stock</span>
              <span>Status</span>
              <span />
            </div>
            <div className="vd-stagger divide-y divide-slate-100">
              {displayedProducts.map((p, idx) => (
                <ProductRow key={p.id} index={idx} product={p} imageFor={imageFor} onEdit={onEdit} />
              ))}
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
