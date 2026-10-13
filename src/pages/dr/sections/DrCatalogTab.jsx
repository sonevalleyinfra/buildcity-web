import { formatShortId } from "../../../utils/formatId";
import { cleanProductImage } from "../../../utils/productImage";
import {
  PackageIcon,
  PlusIcon,
  StoreIcon,
  CheckIcon,
  CloseIcon,
} from "../../vendor/ui/icons";
import { EditIcon } from "../DrShell";
import {
  Card,
  SearchField,
  Chip,
  ChipRow,
  Segmented,
  Button,
  EmptyState,
  Spinner,
} from "../../vendor/ui/primitives";
import { inr, cx } from "../../vendor/ui/format";

const CATALOG_FILTERS = [
  { key: "ALL", label: "All", dot: null },
  { key: "PENDING_REVIEW", label: "Pending", dot: "bg-amber-400" },
  { key: "APPROVED", label: "Approved", dot: "bg-emerald-500" },
  { key: "REJECTED", label: "Rejected", dot: "bg-rose-500" },
];

export default function DrCatalogTab({
  districtName,
  activeTab,
  setActiveTab,
  districtProducts,
  filteredProducts,
  masterProducts,
  productsLoading,
  listingFilter,
  setListingFilter,
  searchTerm,
  setSearchTerm,
  onAddProduct,
  onEditMasterProduct,
  busyListingAction,
  onListingAction,
}) {
  const isMasterMode = activeTab === "masterCatalog";

  const filteredMasterProducts = (masterProducts || []).filter((p) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase().trim();
    return (
      (p.name || "").toLowerCase().includes(q) ||
      (p.brand || "").toLowerCase().includes(q) ||
      (p.categoryName || "").toLowerCase().includes(q)
    );
  });

  const getFilterCount = (st) => {
    if (st === "ALL") return districtProducts.length;
    return districtProducts.filter(
      (p) => (p.approvalStatus || (p.isActive ? "APPROVED" : "PENDING_REVIEW")) === st
    ).length;
  };

  return (
    <div className="space-y-4">
      {/* Header + Segmented Switch (District Listings vs Master Catalog) + Search */}
      <Card className="p-4 sm:p-5 space-y-3.5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <Segmented
            label="Catalog View"
            value={isMasterMode ? "masterCatalog" : "products"}
            onChange={(val) => setActiveTab(val)}
            options={[
              { value: "products", label: "District Products", count: districtProducts.length },
              { value: "masterCatalog", label: "Master Catalog", count: masterProducts.length },
            ]}
          />

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <div className="w-full sm:w-64">
              <SearchField
                value={searchTerm}
                onChange={setSearchTerm}
                placeholder={isMasterMode ? "Search master catalog..." : "Search district products..."}
              />
            </div>
            <Button size="sm" onClick={onAddProduct} className="shrink-0">
              <PlusIcon className="h-4 w-4" strokeWidth={2.25} />
              {isMasterMode ? "Add Master Product" : "Add Product"}
            </Button>
          </div>
        </div>

        {!isMasterMode && (
          <ChipRow>
            {CATALOG_FILTERS.map((f) => (
              <Chip
                key={f.key}
                active={listingFilter === f.key}
                onClick={() => setListingFilter(f.key)}
                count={getFilterCount(f.key)}
                dot={f.dot}
              >
                {f.label}
              </Chip>
            ))}
          </ChipRow>
        )}
      </Card>

      {/* Mode 1: District Products */}
      {!isMasterMode && (
        <>
          {productsLoading && filteredProducts.length === 0 ? (
            <Card className="p-6 text-center text-xs font-medium text-slate-400">
              Loading products in {districtName}...
            </Card>
          ) : filteredProducts.length === 0 ? (
            <Card>
              <EmptyState
                icon={PackageIcon}
                title="No products found"
                description={`Add construction products with category, brand, grade, and pricing for ${districtName}.`}
                action={
                  <Button size="sm" onClick={onAddProduct}>
                    <PlusIcon className="h-4 w-4" />
                    Add Product Now
                  </Button>
                }
              />
            </Card>
          ) : (
            <>
              {/* Mobile Product Cards */}
              <div className="vd-stagger space-y-3 md:hidden">
                {filteredProducts.map((p, idx) => {
                  const st = p.approvalStatus || (p.isActive ? "APPROVED" : "PENDING_REVIEW");
                  const isApproving = busyListingAction?.id === p.id && busyListingAction?.action === "APPROVED";
                  const isRejecting = busyListingAction?.id === p.id && busyListingAction?.action === "REJECTED";

                  return (
                    <Card key={p.id} style={{ "--i": idx }} className="p-4 space-y-3">
                      <div className="flex items-start gap-3">
                        <img
                          src={cleanProductImage(p)}
                          alt={p.name}
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = "/categories/cement.png";
                          }}
                          className="h-14 w-14 shrink-0 rounded-xl border border-slate-200 object-cover bg-slate-100"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="rounded bg-navy-950 px-1.5 py-0.5 font-mono text-[10px] font-bold text-white">
                              {formatShortId(p.id, "PRD")}
                            </span>
                            <p className="truncate text-sm font-semibold text-slate-900">{p.name}</p>
                          </div>
                          <p className="mt-0.5 flex items-center gap-1 truncate text-xs font-medium text-brand-700">
                            <StoreIcon className="h-3.5 w-3.5 shrink-0" />
                            {p.vendorName}
                          </p>
                          <p className="mt-0.5 truncate text-xs text-slate-500">
                            {p.categoryName || "General"} · {p.brand || "Generic"} · Grade: {p.grade || "N/A"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-xs ring-1 ring-inset ring-slate-200/70">
                        <div>
                          <span className="font-bold text-slate-900 text-sm">{inr(p.price)}</span>
                          <span className="text-slate-500"> / {p.unit || "Unit"}</span>
                        </div>
                        <span
                          className={cx(
                            "rounded-md px-2 py-0.5 font-semibold",
                            Number(p.stockQty) > 0 ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                          )}
                        >
                          {p.stockQty} in stock
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          disabled={Boolean(busyListingAction?.id === p.id) || st === "APPROVED"}
                          onClick={() => onListingAction(p.id, "APPROVED")}
                          className={cx(
                            "flex h-9 items-center justify-center gap-1.5 rounded-xl text-xs font-semibold transition-all",
                            st === "APPROVED"
                              ? "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200 opacity-85 cursor-default"
                              : "bg-emerald-600 text-white hover:bg-emerald-700 active:scale-[0.98] cursor-pointer disabled:opacity-50"
                          )}
                        >
                          {isApproving ? (
                            <>
                              <Spinner className="h-3.5 w-3.5" />
                              <span>Approving...</span>
                            </>
                          ) : (
                            <>
                              <CheckIcon className="h-3.5 w-3.5" strokeWidth={2.5} />
                              <span>{st === "APPROVED" ? "Approved" : "Approve"}</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          disabled={Boolean(busyListingAction?.id === p.id) || st === "REJECTED"}
                          onClick={() => onListingAction(p.id, "REJECTED")}
                          className={cx(
                            "flex h-9 items-center justify-center gap-1.5 rounded-xl text-xs font-semibold transition-all",
                            st === "REJECTED"
                              ? "bg-rose-50 text-rose-600 ring-1 ring-inset ring-rose-200 opacity-85 cursor-default"
                              : "bg-white text-rose-600 ring-1 ring-inset ring-rose-200 hover:bg-rose-50 active:scale-[0.98] cursor-pointer disabled:opacity-50"
                          )}
                        >
                          {isRejecting ? (
                            <>
                              <Spinner className="h-3.5 w-3.5" />
                              <span>Rejecting...</span>
                            </>
                          ) : (
                            <>
                              <CloseIcon className="h-3.5 w-3.5" strokeWidth={2.5} />
                              <span>{st === "REJECTED" ? "Rejected" : "Reject"}</span>
                            </>
                          )}
                        </button>
                      </div>
                    </Card>
                  );
                })}
              </div>

              {/* Desktop Table */}
              <Card className="hidden overflow-hidden md:block">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                        <th className="py-3.5 px-4">Product Details</th>
                        <th className="py-3.5 px-4">Category / Brand</th>
                        <th className="py-3.5 px-4">Type & Grade</th>
                        <th className="py-3.5 px-4">Vendor</th>
                        <th className="py-3.5 px-4">Price / Unit</th>
                        <th className="py-3.5 px-4">Stock</th>
                        <th className="py-3.5 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredProducts.map((p) => {
                        const st = p.approvalStatus || (p.isActive ? "APPROVED" : "PENDING_REVIEW");
                        const isApproving = busyListingAction?.id === p.id && busyListingAction?.action === "APPROVED";
                        const isRejecting = busyListingAction?.id === p.id && busyListingAction?.action === "REJECTED";

                        return (
                          <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-3">
                                <img
                                  src={cleanProductImage(p)}
                                  alt={p.name}
                                  onError={(e) => {
                                    e.currentTarget.onerror = null;
                                    e.currentTarget.src = "/categories/cement.png";
                                  }}
                                  className="h-11 w-11 shrink-0 rounded-lg border border-slate-200 object-cover bg-slate-100"
                                />
                                <div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="rounded bg-navy-950 px-1.5 py-0.5 font-mono text-[9px] font-bold text-white">
                                      {formatShortId(p.id, "PRD")}
                                    </span>
                                    <p className="font-semibold text-slate-900">{p.name}</p>
                                  </div>
                                  <p className="mt-0.5 text-[11px] text-slate-400">Added by: {p.addedBy || "DR"}</p>
                                </div>
                              </div>
                            </td>
                            <td className="py-3.5 px-4">
                              <span className="inline-block rounded bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                                {p.categoryName || "General"}
                              </span>
                              <p className="mt-1 font-medium text-slate-800">{p.brand || "Generic"}</p>
                            </td>
                            <td className="py-3.5 px-4">
                              <p className="font-semibold text-slate-800">{p.type || "Standard"}</p>
                              <span className="mt-0.5 inline-block rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                                Grade: {p.grade || "N/A"}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 font-semibold text-slate-900">{p.vendorName}</td>
                            <td className="py-3.5 px-4 tabular-nums">
                              <p className="text-sm font-bold text-slate-900">{inr(p.price)}</p>
                              <p className="text-[11px] text-slate-500">per {p.unit || "Unit"}</p>
                            </td>
                            <td className="py-3.5 px-4">
                              <span
                                className={cx(
                                  "rounded-md px-2 py-1 text-xs font-semibold tabular-nums",
                                  Number(p.stockQty) > 0 ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-600"
                                )}
                              >
                                {p.stockQty} in stock
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  disabled={Boolean(busyListingAction?.id === p.id) || st === "APPROVED"}
                                  onClick={() => onListingAction(p.id, "APPROVED")}
                                  className={cx(
                                    "inline-flex min-w-[92px] items-center justify-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition-all",
                                    st === "APPROVED"
                                      ? "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200 opacity-85 cursor-default"
                                      : "bg-emerald-600 text-white hover:bg-emerald-700 active:scale-[0.98] cursor-pointer disabled:opacity-50"
                                  )}
                                >
                                  {isApproving ? (
                                    <>
                                      <Spinner className="h-3 w-3" />
                                      <span>Approving...</span>
                                    </>
                                  ) : (
                                    <>
                                      <CheckIcon className="h-3 w-3" strokeWidth={2.5} />
                                      <span>{st === "APPROVED" ? "Approved" : "Approve"}</span>
                                    </>
                                  )}
                                </button>

                                <button
                                  type="button"
                                  disabled={Boolean(busyListingAction?.id === p.id) || st === "REJECTED"}
                                  onClick={() => onListingAction(p.id, "REJECTED")}
                                  className={cx(
                                    "inline-flex min-w-[88px] items-center justify-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition-all",
                                    st === "REJECTED"
                                      ? "bg-rose-50 text-rose-600 ring-1 ring-inset ring-rose-200 opacity-85 cursor-default"
                                      : "bg-white text-rose-600 ring-1 ring-inset ring-rose-200 hover:bg-rose-50 active:scale-[0.98] cursor-pointer disabled:opacity-50"
                                  )}
                                >
                                  {isRejecting ? (
                                    <>
                                      <Spinner className="h-3 w-3" />
                                      <span>Rejecting...</span>
                                    </>
                                  ) : (
                                    <>
                                      <CloseIcon className="h-3 w-3" strokeWidth={2.5} />
                                      <span>{st === "REJECTED" ? "Rejected" : "Reject"}</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            </>
          )}
        </>
      )}

      {/* Mode 2: Platform Master Catalog */}
      {isMasterMode && (
        <>
          {filteredMasterProducts.length === 0 ? (
            <Card>
              <EmptyState
                icon={PackageIcon}
                title="No master catalog products found"
                description="Add a new master product to make it available across the platform."
                action={
                  <Button size="sm" onClick={onAddProduct}>
                    <PlusIcon className="h-4 w-4" />
                    Add Master Product
                  </Button>
                }
              />
            </Card>
          ) : (
            <>
              {/* Mobile Master Catalog Cards */}
              <div className="vd-stagger space-y-3 md:hidden">
                {filteredMasterProducts.map((p, idx) => (
                  <Card key={p.id} style={{ "--i": idx }} className="p-4 space-y-3">
                    <div className="flex items-start gap-3">
                      <img
                        src={cleanProductImage(p)}
                        alt={p.name}
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = "/categories/cement.png";
                        }}
                        className="h-14 w-14 shrink-0 rounded-xl border border-slate-200 object-cover bg-slate-100"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="rounded bg-navy-950 px-1.5 py-0.5 font-mono text-[10px] font-bold text-white">
                            {formatShortId(p.id, "PRD")}
                          </span>
                          <p className="truncate text-sm font-semibold text-slate-900">{p.name}</p>
                        </div>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {p.categoryName || "General"} · {p.brand || "Generic"}
                        </p>
                        <p className="mt-0.5 text-xs text-amber-700 font-medium">
                          {p.type || "Standard"} · Grade: {p.grade || "Standard"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-100 pt-2.5">
                      <div className="text-xs">
                        <span className="text-slate-500">Suggested: </span>
                        <span className="text-sm font-bold text-slate-900">
                          {inr(p.suggestedPrice || p.price || 0)}
                        </span>
                        <span className="text-slate-400"> / {p.unit}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => onEditMasterProduct(p)}
                        className="inline-flex h-8 items-center gap-1.5 rounded-xl bg-slate-100 px-3 text-xs font-semibold text-slate-800 hover:bg-slate-200 active:scale-95 cursor-pointer"
                      >
                        <EditIcon className="h-3.5 w-3.5" />
                        Edit Catalog
                      </button>
                    </div>
                  </Card>
                ))}
              </div>

              {/* Desktop Master Catalog Table */}
              <Card className="hidden overflow-hidden md:block">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                        <th className="py-3.5 px-4">Product Details</th>
                        <th className="py-3.5 px-4">Category / Brand</th>
                        <th className="py-3.5 px-4">Type & Grade</th>
                        <th className="py-3.5 px-4">Suggested Price</th>
                        <th className="py-3.5 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredMasterProducts.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <img
                                src={cleanProductImage(p)}
                                alt={p.name}
                                onError={(e) => {
                                  e.currentTarget.onerror = null;
                                  e.currentTarget.src = "/categories/cement.png";
                                }}
                                className="h-10 w-10 shrink-0 rounded-lg border border-slate-200 object-cover bg-slate-100"
                              />
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <span className="rounded bg-navy-950 px-1.5 py-0.5 font-mono text-[9px] font-bold text-white">
                                    {formatShortId(p.id, "PRD")}
                                  </span>
                                  <p className="font-semibold text-slate-900">{p.name}</p>
                                </div>
                                <p className="mt-0.5 text-[10px] text-slate-400">Packaging: {p.unit}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                              {p.categoryName || "General"}
                            </span>
                            <p className="mt-1 font-medium text-slate-700">{p.brand}</p>
                          </td>
                          <td className="py-3.5 px-4">
                            <p className="font-semibold text-slate-800">{p.type}</p>
                            <span className="mt-0.5 inline-block rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                              Grade: {p.grade}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 tabular-nums">
                            <span className="text-sm font-bold text-slate-900">
                              {inr(p.suggestedPrice || p.price || 0)}
                            </span>
                            <span className="text-[11px] text-slate-500"> / {p.unit}</span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <button
                              type="button"
                              onClick={() => onEditMasterProduct(p)}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-200 active:scale-[0.98] cursor-pointer"
                            >
                              <EditIcon className="h-3.5 w-3.5" />
                              Edit Catalog
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </>
          )}
        </>
      )}
    </div>
  );
}
