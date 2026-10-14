import { useState } from "react";
import { formatShortId, formatDateTimeIST } from "../../../utils/formatId";
import LoadMoreButton from "../../../components/LoadMoreButton";
import {
  OrdersIcon,
  PhoneIcon,
  MapPinIcon,
  StoreIcon,
  PackageIcon,
} from "../../vendor/ui/icons";
import {
  Card,
  SearchField,
  Chip,
  ChipRow,
  StatusBadge,
  EmptyState,
  Spinner,
} from "../../vendor/ui/primitives";
import { inr, avatarTone, cx, ORDER_STATUS } from "../../vendor/ui/format";
import ProgressTrack from "../../vendor/sections/order/ProgressTrack";

const ORDER_FILTERS = [
  { key: "ALL", label: "All", dot: null },
  { key: "PENDING", label: "Pending", dot: "bg-amber-400" },
  { key: "PROCESSING", label: "Processing", dot: "bg-sky-500" },
  { key: "OUT_FOR_DELIVERY", label: "Out for delivery", dot: "bg-indigo-500" },
  { key: "DELIVERED", label: "Delivered", dot: "bg-emerald-500" },
  { key: "COMPLETED", label: "Completed", dot: "bg-teal-500" },
  { key: "CANCELLED", label: "Cancelled", dot: "bg-rose-400" },
];

const STATUS_LABELS = {
  PENDING: "Pending",
  PROCESSING: "Processing",
  OUT_FOR_DELIVERY: "Out for delivery",
  DELIVERED: "Delivered",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export default function DrOrdersTab({
  districtName,
  districtOrders,
  filteredDistrictOrders,
  districtOrdersCount,
  districtSummary,
  orderStatusFilter,
  setOrderStatusFilter,
  searchTerm,
  setSearchTerm,
  updateOrderStatus,
  fetchLiveOrdersDirect,
  showConfirm,
  directHasMore,
  loadingMoreDirect,
  loadMoreDistrictOrders,
}) {
  const [statusTransition, setStatusTransition] = useState(null); // { orderId, targetStatus }

  const getFilterCount = (st) => {
    if (st === "ALL") {
      if (districtSummary?.byStatus) {
        return Object.entries(districtSummary.byStatus).reduce((sum, [statusKey, count]) => {
          const upper = String(statusKey).toUpperCase();
          if (upper !== "DELIVERED" && upper !== "COMPLETED" && upper !== "CANCELLED") {
            return sum + Number(count || 0);
          }
          return sum;
        }, 0);
      }
      return districtOrders.filter((o) => {
        const ordSt = (o.status || "PENDING").toUpperCase();
        return ordSt !== "DELIVERED" && ordSt !== "COMPLETED" && ordSt !== "CANCELLED";
      }).length;
    }
    if (districtSummary) {
      return districtSummary.byStatus?.[st] || 0;
    }
    return districtOrders.filter((o) => (o.status || "PENDING").toUpperCase() === st).length;
  };

  const handleOrderStatusSelect = (ord, nextSt) => {
    if (!updateOrderStatus) return;

    const executeTransition = async () => {
      const cleanId = String(ord.id);
      setStatusTransition({ orderId: cleanId, targetStatus: nextSt });
      try {
        await updateOrderStatus(ord.id, nextSt);
        // Crisp 350ms visual transition: instant feel, zero lag, zero flicker
        await new Promise((res) => setTimeout(res, 350));
      } catch (err) {
        console.warn("Status change error in DR:", err);
      } finally {
        setStatusTransition(null);
      }
    };

    if (nextSt === "COMPLETED") {
      showConfirm({
        title: "Mark Order as Completed?",
        message: "Once marked as Completed, this order status cannot be changed again. Confirm completion?",
        type: "warning",
        confirmText: "Mark Completed",
        cancelText: "Cancel",
        onConfirm: executeTransition,
      });
    } else {
      executeTransition();
    }
  };

  return (
    <div className="space-y-4">
      {/* Header + Search + Status Filter Chips */}
      <Card className="p-4 sm:p-5 space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-slate-900">
                Customer Orders in {districtName}
              </h2>
              <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold tabular-nums text-brand-700 ring-1 ring-inset ring-brand-600/15">
                {districtOrdersCount}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-slate-500">
              Real-time tracking of marketplace orders scheduled for delivery in {districtName}
            </p>
          </div>
          <div className="w-full sm:w-72">
            <SearchField
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="Search order ID, customer, phone..."
            />
          </div>
        </div>

        <ChipRow>
          {ORDER_FILTERS.map((f) => (
            <Chip
              key={f.key}
              active={orderStatusFilter === f.key}
              onClick={() => setOrderStatusFilter(f.key)}
              count={getFilterCount(f.key)}
              dot={f.dot}
            >
              {f.label}
            </Chip>
          ))}
        </ChipRow>
      </Card>

      {/* Orders List */}
      {filteredDistrictOrders.length === 0 ? (
        <Card>
          <EmptyState
            icon={OrdersIcon}
            title={`No ${orderStatusFilter !== "ALL" ? orderStatusFilter.toLowerCase().replace(/_/g, " ") : ""} orders found`}
            description={`Orders placed by customers in ${districtName} will appear here in real time.`}
          />
        </Card>
      ) : (
        <div className="vd-stagger grid grid-cols-1 gap-3.5 lg:grid-cols-2">
          {filteredDistrictOrders.map((ord, idx) => {
            const displayAmt = Number(ord.totalAmount || ord.total || 0);
            const custName = ord.customer?.name || ord.customerName || ord.address?.fullName || "Customer";
            const custPhone = ord.customer?.phone || ord.customerPhone || ord.address?.phone || "";
            const rawAddr = ord.address;
            const isObj = typeof rawAddr === "object" && rawAddr !== null;
            const isStr = typeof rawAddr === "string" && rawAddr.trim().length > 0;

            let streetAddr = isObj ? rawAddr.street || rawAddr.line || rawAddr.address : isStr ? rawAddr : null;
            let cityAddr = isObj ? rawAddr.city : ord.districtName || ord.regionName || districtName;
            let pincodeAddr = isObj ? rawAddr.pincode : "";

            if (!streetAddr || streetAddr.includes("Site Delivery Address") || streetAddr.includes("Main Delivery Address")) {
              if (ord.customer?.address && !ord.customer.address.includes("Site Delivery Address")) {
                streetAddr = ord.customer.address;
              } else if (custPhone) {
                streetAddr = `Site Location for Mobile ${custPhone}`;
              } else {
                streetAddr = `Site Delivery Location (${cityAddr || districtName})`;
              }
            }

            const dateStr = formatDateTimeIST(ord.createdAt || ord.date);
            const statusKey = (ord.status || "PENDING").toUpperCase();
            const isCompletedLocked = statusKey === "COMPLETED";
            const initials =
              custName
                .trim()
                .split(/\s+/)
                .slice(0, 2)
                .map((w) => w.charAt(0).toUpperCase())
                .join("") || "C";

            const isTransitioning = statusTransition && String(statusTransition.orderId) === String(ord.id);
            const effectiveStatus = isTransitioning ? statusTransition.targetStatus : statusKey;
            const statusCfg = ORDER_STATUS[effectiveStatus] || ORDER_STATUS.PENDING;

            return (
              <Card
                key={ord.id}
                style={{ "--i": idx }}
                className={cx(
                  "relative flex flex-col justify-between overflow-hidden p-4 sm:p-5 pl-5 sm:pl-6 transition-all duration-300 hover:shadow-[0_12px_28px_-18px_rgba(15,23,42,0.2)]",
                  statusCfg.tile,
                  isTransitioning && "ring-2 ring-brand-500/30"
                )}
              >
                {/* Status colour down the leading edge */}
                <span className={cx("absolute inset-y-0 left-0 w-1 transition-colors duration-500", statusCfg.accent)} aria-hidden="true" />

                {/* Status Transition Top Progress Bar */}
                {isTransitioning && (
                  <span className="absolute inset-x-0 top-0 h-0.5 overflow-hidden z-10" aria-hidden="true">
                    <span className="vd-indeterminate block h-full w-2/5 bg-gradient-to-r from-brand-500 to-amber-400" />
                  </span>
                )}

                <div className="space-y-3.5">
                  {/* Top Bar: Order ID + Date + Status Badge */}
                  <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
                    <div>
                      <span className="font-mono text-sm font-bold text-brand-700">
                        {formatShortId(ord.id || ord.orderNumber, "ORD")}
                      </span>
                      <p className="mt-0.5 text-xs text-slate-400">{dateStr}</p>
                    </div>
                    <StatusBadge status={effectiveStatus} />
                  </div>

                  {/* Customer Row + 1-Tap Call */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span
                        className={cx(
                          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                          avatarTone(custName)
                        )}
                      >
                        {initials}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">{custName}</p>
                        <p className="truncate text-xs text-slate-500 tabular-nums">
                          {custPhone || "No phone provided"}
                        </p>
                      </div>
                    </div>
                    {custPhone && (
                      <a
                        href={`tel:${custPhone}`}
                        className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200 transition-colors hover:bg-emerald-100 active:scale-95"
                      >
                        <PhoneIcon className="h-3.5 w-3.5" />
                        Call
                      </a>
                    )}
                  </div>

                  {/* Site Delivery Address */}
                  <div className="flex items-start gap-2 rounded-xl bg-slate-50 p-3 ring-1 ring-inset ring-slate-200/70">
                    <MapPinIcon className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" />
                    <div className="min-w-0 flex-1 text-xs">
                      <p className="font-medium text-slate-800 break-words leading-snug">{streetAddr}</p>
                      <p className="mt-0.5 text-[11px] font-semibold text-brand-700">
                        {cityAddr} {pincodeAddr ? `· ${pincodeAddr}` : ""}
                      </p>
                    </div>
                  </div>

                  {/* Ordered Items List */}
                  <div className="space-y-1.5">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      Ordered Materials ({Array.isArray(ord.items) ? ord.items.length : 0})
                    </p>
                    {Array.isArray(ord.items) && ord.items.length > 0 ? (
                      <div className="divide-y divide-slate-100 rounded-xl border border-slate-100 bg-white px-3 py-1">
                        {ord.items.map((it, itemIdx) => (
                          <div key={itemIdx} className="flex items-center justify-between gap-2 py-2 text-xs">
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-semibold text-slate-800">
                                {it.productName || it.name}
                              </p>
                              {it.vendorName && (
                                <p className="mt-0.5 flex items-center gap-1 truncate text-[11px] font-medium text-brand-600">
                                  <StoreIcon className="h-3 w-3 shrink-0" />
                                  {it.vendorName}
                                </p>
                              )}
                            </div>
                            <div className="shrink-0 text-right tabular-nums">
                              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold text-slate-700">
                                x{it.quantity}
                              </span>
                              <span className="ml-2 font-semibold text-slate-900">
                                {inr(it.priceAtPurchase || it.price || 0)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 rounded-xl border border-slate-100 p-2.5 text-xs text-slate-500">
                        <PackageIcon className="h-4 w-4 text-slate-400" />
                        Construction Materials Order
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom Footer: Total Amount, Stepper & Status Control */}
                <div className="mt-4 space-y-3 border-t border-slate-100 pt-3.5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-bold tabular-nums text-slate-900">
                          {inr(displayAmt)}
                        </span>
                        <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold uppercase text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                          COD
                        </span>
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                        {ord.couponCode && (
                          <span className="inline-flex items-center rounded bg-purple-50 px-1.5 py-0.2 text-[10px] font-semibold text-purple-700 ring-1 ring-inset ring-purple-600/20">
                            {ord.couponCode}{" "}
                            {Number(ord.discountAmount) > 0 ? `(-${inr(ord.discountAmount)})` : ""}
                          </span>
                        )}
                        {Number(ord.walletDiscount) > 0 && (
                          <span className="inline-flex items-center rounded bg-amber-50 px-1.5 py-0.2 text-[10px] font-semibold text-amber-700 ring-1 ring-inset ring-amber-600/20">
                            Wallet -{inr(ord.walletDiscount)}
                          </span>
                        )}
                      </div>
                    </div>

                    {!isTransitioning && (
                      <div className="flex items-center gap-2">
                        {isCompletedLocked ? (
                          <span className="inline-flex h-11 items-center rounded-xl bg-teal-50 px-3.5 text-xs font-bold text-teal-800 ring-1 ring-inset ring-teal-600/20">
                            Completed
                          </span>
                        ) : (
                          updateOrderStatus && (
                            <select
                              value={statusKey}
                              disabled={statusTransition !== null}
                              onChange={(e) => handleOrderStatusSelect(ord, e.target.value)}
                              aria-label="Update Order Status"
                              className={cx(
                                "h-11 rounded-xl px-3.5 text-xs font-bold ring-1 ring-inset outline-none transition-colors duration-300 cursor-pointer disabled:opacity-50",
                                statusCfg.select
                              )}
                            >
                              <option value="PENDING">Pending</option>
                              <option value="PROCESSING">Processing</option>
                              <option value="OUT_FOR_DELIVERY">Out for delivery</option>
                              <option value="DELIVERED">Delivered</option>
                              <option value="COMPLETED">Completed</option>
                              <option value="CANCELLED">Cancelled</option>
                            </select>
                          )
                        )}
                      </div>
                    )}
                  </div>

                  {/* ProgressTrack Stepper (Placed -> Processing -> Dispatched -> Delivered) */}
                  <ProgressTrack
                    status={
                      effectiveStatus === "COMPLETED"
                        ? "DELIVERED"
                        : effectiveStatus
                    }
                  />

                  {/* Full-width Updating Pill exactly matching Vendor during status change */}
                  {isTransitioning && (
                    <div
                      className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-amber-50 text-sm font-medium text-amber-800 ring-1 ring-inset ring-amber-200"
                      role="status"
                    >
                      <Spinner className="h-4 w-4 text-amber-700" />
                      <span>
                        Updating to{" "}
                        {ORDER_STATUS[statusTransition.targetStatus]?.label.toLowerCase() ||
                          statusTransition.targetStatus.toLowerCase()}
                      </span>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <LoadMoreButton
        hasMore={directHasMore}
        loading={loadingMoreDirect}
        onClick={loadMoreDistrictOrders}
        shown={districtOrders.length}
        total={districtOrdersCount}
      />
    </div>
  );
}
