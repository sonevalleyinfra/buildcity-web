import {
  BadgeCheckIcon,
  StoreIcon,
  CheckIcon,
  CloseIcon,
  ClockIcon,
} from "../../vendor/ui/icons";
import {
  Card,
  SearchField,
  Chip,
  ChipRow,
  EmptyState,
  Spinner,
} from "../../vendor/ui/primitives";
import { inr, cx } from "../../vendor/ui/format";
import { cleanProductImage } from "../../../utils/productImage";

const APPROVAL_FILTERS = [
  { key: "ALL", label: "All", dot: null },
  { key: "PENDING_REVIEW", label: "Pending review", dot: "bg-amber-400" },
  { key: "APPROVED", label: "Approved", dot: "bg-emerald-500" },
  { key: "REJECTED", label: "Rejected", dot: "bg-rose-500" },
];

function StatusPill({ status }) {
  const st = status || "APPROVED";
  if (st === "PENDING_REVIEW") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800 ring-1 ring-inset ring-amber-600/20">
        <ClockIcon className="h-3 w-3" strokeWidth={2} />
        Pending Review
      </span>
    );
  }
  if (st === "REJECTED") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 text-[11px] font-semibold text-rose-700 ring-1 ring-inset ring-rose-600/20">
        <CloseIcon className="h-3 w-3" strokeWidth={2.5} />
        Rejected
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
      <CheckIcon className="h-3 w-3" strokeWidth={2.5} />
      Approved
    </span>
  );
}

export default function DrApprovalsTab({
  districtName,
  districtProducts,
  filteredProducts,
  listingFilter,
  setListingFilter,
  searchTerm,
  setSearchTerm,
  busyListingAction,
  onListingAction,
}) {
  const getFilterCount = (st) => {
    if (st === "ALL") return districtProducts.length;
    return districtProducts.filter(
      (p) => (p.approvalStatus || (p.isActive ? "APPROVED" : "PENDING_REVIEW")) === st
    ).length;
  };

  return (
    <div className="space-y-4">
      <Card className="p-4 sm:p-5 space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-slate-900">
                Vendor Listings & Approvals ({districtName})
              </h2>
              <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold tabular-nums text-indigo-700 ring-1 ring-inset ring-indigo-600/15">
                {districtProducts.length}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-slate-500">
              Review vendor product requests, selling prices, and stock availability for {districtName}
            </p>
          </div>
          <div className="w-full sm:w-72">
            <SearchField
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="Search product, vendor, brand..."
            />
          </div>
        </div>

        <ChipRow>
          {APPROVAL_FILTERS.map((f) => (
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
      </Card>

      {filteredProducts.length === 0 ? (
        <Card>
          <EmptyState
            icon={BadgeCheckIcon}
            title="No product listings found"
            description={`No vendor listings match the selected filter (${listingFilter.toLowerCase().replace(/_/g, " ")}).`}
          />
        </Card>
      ) : (
        <>
          {/* Mobile Cards View */}
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
                        e.currentTarget.src = cleanProductImage(null, p?.categoryName || p?.category, p?.name);
                      }}
                      className="h-14 w-14 shrink-0 rounded-xl border border-slate-200 object-cover bg-slate-100"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="truncate text-sm font-semibold text-slate-900">{p.name}</p>
                        <StatusPill status={st} />
                      </div>
                      <p className="mt-0.5 flex items-center gap-1 truncate text-xs font-medium text-brand-700">
                        <StoreIcon className="h-3.5 w-3.5 shrink-0" />
                        {p.vendorName || "District Vendor"}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-slate-500">
                        {p.categoryName || "General"} · {p.brand || "Generic"} ({p.grade || "Standard"})
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-xs ring-1 ring-inset ring-slate-200/70">
                    <div>
                      <span className="text-slate-500">Selling Price: </span>
                      <span className="font-bold text-slate-900">{inr(p.price)}</span>
                      <span className="text-slate-400"> / {p.unit || "unit"}</span>
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

                  <div className="grid grid-cols-2 gap-2 pt-0.5">
                    <button
                      type="button"
                      disabled={Boolean(busyListingAction?.id === p.id) || st === "APPROVED"}
                      onClick={() => onListingAction(p.id, "APPROVED")}
                      className={cx(
                        "flex h-9 items-center justify-center gap-1.5 rounded-xl text-xs font-semibold transition-all select-none",
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
                        "flex h-9 items-center justify-center gap-1.5 rounded-xl text-xs font-semibold transition-all select-none",
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

          {/* Desktop Table View */}
          <Card className="hidden overflow-hidden md:block">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    <th className="py-3.5 px-4">Vendor Shop</th>
                    <th className="py-3.5 px-4">Product Name</th>
                    <th className="py-3.5 px-4">Category & Brand</th>
                    <th className="py-3.5 px-4">Selling Price</th>
                    <th className="py-3.5 px-4">Stock Qty</th>
                    <th className="py-3.5 px-4">Status</th>
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
                        <td className="py-3.5 px-4 font-semibold text-slate-900">
                          <span className="inline-flex items-center gap-1.5">
                            <StoreIcon className="h-4 w-4 text-brand-500 shrink-0" />
                            {p.vendorName || "District Vendor"}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <img
                              src={cleanProductImage(p)}
                              alt={p.name}
                              onError={(e) => {
                                e.currentTarget.onerror = null;
                                e.currentTarget.src = cleanProductImage(null, p?.categoryName || p?.category, p?.name);
                              }}
                              className="h-9 w-9 shrink-0 rounded-lg border border-slate-200 object-cover bg-slate-100"
                            />
                            <span className="font-semibold text-slate-900">{p.name}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-slate-600">
                          {p.categoryName || "Category"} · {p.brand} ({p.grade})
                        </td>
                        <td className="py-3.5 px-4 font-bold tabular-nums text-slate-900">
                          {inr(p.price)}
                        </td>
                        <td className="py-3.5 px-4 font-semibold tabular-nums text-slate-700">
                          {p.stockQty} {p.unit || "units"}
                        </td>
                        <td className="py-3.5 px-4">
                          <StatusPill status={st} />
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              disabled={Boolean(busyListingAction?.id === p.id) || st === "APPROVED"}
                              onClick={() => onListingAction(p.id, "APPROVED")}
                              className={cx(
                                "inline-flex min-w-[96px] items-center justify-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all select-none",
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
                                "inline-flex min-w-[92px] items-center justify-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all select-none",
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
                                  <CloseIcon className="h-3.5 w-3.5" strokeWidth={2.5} />
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
    </div>
  );
}
