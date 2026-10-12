import {
  StoreIcon,
  PhoneIcon,
  MapPinIcon,
  PlusIcon,
  CheckIcon,
  ClockIcon,
  CloseIcon,
} from "../../vendor/ui/icons";
import { EditIcon, TrashIcon } from "../DrShell";
import {
  Card,
  SearchField,
  Button,
  EmptyState,
  Spinner,
} from "../../vendor/ui/primitives";
import { avatarTone, cx } from "../../vendor/ui/format";

function VendorStatusBadge({ status }) {
  const st = (status || "APPROVED").toUpperCase();
  if (st === "APPROVED") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
        <CheckIcon className="h-3 w-3" strokeWidth={2.5} />
        APPROVED
      </span>
    );
  }
  if (st === "PENDING") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800 ring-1 ring-inset ring-amber-600/20">
        <ClockIcon className="h-3 w-3" strokeWidth={2} />
        PENDING
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 text-[11px] font-semibold text-rose-700 ring-1 ring-inset ring-rose-600/20">
      <CloseIcon className="h-3 w-3" strokeWidth={2.5} />
      {st}
    </span>
  );
}

export default function DrVendorsTab({
  districtName,
  filteredVendors,
  searchTerm,
  setSearchTerm,
  onAddVendor,
  onEditVendor,
  updatingVendorStatus,
  onToggleVendorStatus,
  deletingVendorId,
  onDeleteVendor,
}) {
  return (
    <div className="space-y-4">
      <Card className="p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-slate-900">
                Registered Vendors in {districtName}
              </h2>
              <span className="rounded-full bg-sky-50 px-2.5 py-0.5 text-xs font-semibold tabular-nums text-sky-700 ring-1 ring-inset ring-sky-600/15">
                {filteredVendors.length}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-slate-500">
              Onboard, manage credentials, or suspend district vendor partners
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <div className="w-full sm:w-64">
              <SearchField
                value={searchTerm}
                onChange={setSearchTerm}
                placeholder="Search shop, owner, phone..."
              />
            </div>
            <Button size="sm" onClick={onAddVendor} className="shrink-0">
              <PlusIcon className="h-4 w-4" strokeWidth={2.25} />
              Add Vendor
            </Button>
          </div>
        </div>
      </Card>

      {filteredVendors.length === 0 ? (
        <Card>
          <EmptyState
            icon={StoreIcon}
            title="No vendors registered in this district"
            description={`Register the first construction supplier or trader in ${districtName}.`}
            action={
              <Button size="sm" onClick={onAddVendor}>
                <PlusIcon className="h-4 w-4" />
                Register Vendor Now
              </Button>
            }
          />
        </Card>
      ) : (
        <>
          {/* Mobile Cards View */}
          <div className="vd-stagger space-y-3 md:hidden">
            {filteredVendors.map((v, idx) => {
              const initials =
                (v.shopName || "V")
                  .trim()
                  .split(/\s+/)
                  .slice(0, 2)
                  .map((w) => w.charAt(0).toUpperCase())
                  .join("") || "V";

              return (
                <Card key={v.id} style={{ "--i": idx }} className="p-4 space-y-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span
                        className={cx(
                          "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xs font-semibold",
                          avatarTone(v.shopName)
                        )}
                      >
                        {initials}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">{v.shopName}</p>
                        <p className="truncate text-xs text-slate-500">Owner: {v.ownerName}</p>
                      </div>
                    </div>
                    <VendorStatusBadge status={v.status} />
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs ring-1 ring-inset ring-slate-200/70">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex items-center gap-1 font-medium text-slate-700">
                        <MapPinIcon className="h-3.5 w-3.5 text-brand-500" />
                        {v.regionName || districtName}
                      </span>
                      <span className="text-slate-300">·</span>
                      <span className="font-semibold text-slate-700">
                        {v.productCount || 0} Products
                      </span>
                    </div>
                    {v.phone && (
                      <a
                        href={`tel:${v.phone}`}
                        className="inline-flex items-center gap-1 font-semibold text-emerald-700 hover:underline tabular-nums"
                      >
                        <PhoneIcon className="h-3.5 w-3.5" />
                        {v.phone}
                      </a>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-0.5">
                    <button
                      type="button"
                      onClick={() => onEditVendor({ ...v })}
                      className="inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-xl bg-slate-100 px-3 text-xs font-semibold text-slate-800 hover:bg-slate-200 active:scale-[0.98] cursor-pointer"
                    >
                      <EditIcon className="h-3.5 w-3.5" />
                      Edit
                    </button>

                    {v.status !== "APPROVED" && (
                      <button
                        type="button"
                        disabled={updatingVendorStatus?.id === v.id}
                        onClick={() => onToggleVendorStatus(v.id, "APPROVED")}
                        className="inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3 text-xs font-semibold text-white hover:bg-emerald-700 active:scale-[0.98] cursor-pointer disabled:opacity-50"
                      >
                        {updatingVendorStatus?.id === v.id && updatingVendorStatus?.action === "APPROVED" ? (
                          <>
                            <Spinner className="h-3.5 w-3.5" />
                            <span>Approving...</span>
                          </>
                        ) : (
                          "Approve"
                        )}
                      </button>
                    )}

                    {v.status !== "SUSPENDED" ? (
                      <button
                        type="button"
                        disabled={updatingVendorStatus?.id === v.id}
                        onClick={() => onToggleVendorStatus(v.id, "SUSPENDED")}
                        className="inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-xl bg-amber-50 px-3 text-xs font-semibold text-amber-800 ring-1 ring-inset ring-amber-300 hover:bg-amber-100 active:scale-[0.98] cursor-pointer disabled:opacity-50"
                      >
                        {updatingVendorStatus?.id === v.id && updatingVendorStatus?.action === "SUSPENDED" ? (
                          <>
                            <Spinner className="h-3.5 w-3.5" />
                            <span>Suspending...</span>
                          </>
                        ) : (
                          "Suspend"
                        )}
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={updatingVendorStatus?.id === v.id}
                        onClick={() => onToggleVendorStatus(v.id, "APPROVED")}
                        className="inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-50 px-3 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-300 hover:bg-emerald-100 active:scale-[0.98] cursor-pointer disabled:opacity-50"
                      >
                        {updatingVendorStatus?.id === v.id && updatingVendorStatus?.action === "APPROVED" ? (
                          <>
                            <Spinner className="h-3.5 w-3.5" />
                            <span>Reinstating...</span>
                          </>
                        ) : (
                          "Reinstate"
                        )}
                      </button>
                    )}

                    <button
                      type="button"
                      disabled={deletingVendorId === v.id}
                      onClick={() => onDeleteVendor(v)}
                      className="inline-flex h-8 items-center justify-center gap-1 rounded-xl bg-rose-50 px-3 text-xs font-semibold text-rose-600 ring-1 ring-inset ring-rose-200 hover:bg-rose-100 active:scale-[0.98] cursor-pointer disabled:opacity-50"
                    >
                      {deletingVendorId === v.id ? (
                        <Spinner className="h-3.5 w-3.5" />
                      ) : (
                        <>
                          <TrashIcon className="h-3.5 w-3.5" />
                          <span>Delete</span>
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
                    <th className="py-3.5 px-4">Shop / Business</th>
                    <th className="py-3.5 px-4">Owner & Mobile</th>
                    <th className="py-3.5 px-4">District</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Products</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredVendors.map((v) => (
                    <tr key={v.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-slate-900">{v.shopName}</td>
                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-slate-800">{v.ownerName}</p>
                        <p className="mt-0.5 text-[11px] text-slate-500 tabular-nums">{v.phone}</p>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                          <MapPinIcon className="h-3 w-3 text-brand-500" />
                          {v.regionName || districtName}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <VendorStatusBadge status={v.status} />
                      </td>
                      <td className="py-3.5 px-4 font-semibold tabular-nums text-slate-700">
                        {v.productCount || 0} Products
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => onEditVendor({ ...v })}
                            className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1.5 text-[11px] font-semibold text-slate-800 hover:bg-slate-200 cursor-pointer"
                          >
                            <EditIcon className="h-3.5 w-3.5" />
                            Edit
                          </button>
                          {v.status !== "APPROVED" && (
                            <button
                              type="button"
                              disabled={updatingVendorStatus?.id === v.id}
                              onClick={() => onToggleVendorStatus(v.id, "APPROVED")}
                              className="inline-flex min-w-[75px] items-center justify-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-[11px] font-semibold text-white hover:bg-emerald-700 active:scale-[0.98] cursor-pointer disabled:opacity-50"
                            >
                              {updatingVendorStatus?.id === v.id && updatingVendorStatus?.action === "APPROVED" ? (
                                <>
                                  <Spinner className="h-3 w-3" />
                                  <span>Approving...</span>
                                </>
                              ) : (
                                "Approve"
                              )}
                            </button>
                          )}
                          {v.status !== "SUSPENDED" ? (
                            <button
                              type="button"
                              disabled={updatingVendorStatus?.id === v.id}
                              onClick={() => onToggleVendorStatus(v.id, "SUSPENDED")}
                              className="inline-flex min-w-[75px] items-center justify-center gap-1 rounded-lg border border-amber-300 px-2.5 py-1.5 text-[11px] font-semibold text-amber-700 hover:bg-amber-50 active:scale-[0.98] cursor-pointer disabled:opacity-50"
                            >
                              {updatingVendorStatus?.id === v.id && updatingVendorStatus?.action === "SUSPENDED" ? (
                                <>
                                  <Spinner className="h-3 w-3" />
                                  <span>Suspending...</span>
                                </>
                              ) : (
                                "Suspend"
                              )}
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={updatingVendorStatus?.id === v.id}
                              onClick={() => onToggleVendorStatus(v.id, "APPROVED")}
                              className="inline-flex min-w-[75px] items-center justify-center gap-1 rounded-lg border border-emerald-500 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-600 hover:bg-emerald-50 active:scale-[0.98] cursor-pointer disabled:opacity-50"
                            >
                              {updatingVendorStatus?.id === v.id && updatingVendorStatus?.action === "APPROVED" ? (
                                <>
                                  <Spinner className="h-3 w-3" />
                                  <span>Reinstating...</span>
                                </>
                              ) : (
                                "Reinstate"
                              )}
                            </button>
                          )}
                          <button
                            type="button"
                            disabled={deletingVendorId === v.id}
                            onClick={() => onDeleteVendor(v)}
                            className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-[11px] font-semibold text-rose-600 hover:bg-rose-100 cursor-pointer disabled:opacity-50"
                          >
                            {deletingVendorId === v.id ? (
                              <>
                                <Spinner className="h-3 w-3" />
                                <span>Deleting...</span>
                              </>
                            ) : (
                              <>
                                <TrashIcon className="h-3.5 w-3.5" />
                                <span>Delete</span>
                              </>
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
