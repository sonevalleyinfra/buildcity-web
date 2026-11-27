import { getOrderView } from "../orderView";
import { Spinner } from "../ui/primitives";
import { ORDER_STATUS, cx, inr } from "../ui/format";
import { ordinal } from "../ui/time";
import OrderAddress from "./order/OrderAddress";
import OrderItems from "./order/OrderItems";
import ProgressTrack from "./order/ProgressTrack";
import StatusControl from "./order/StatusControl";

/**
 * Order tile — each fact once, whitespace instead of dividers:
 *   Customer name ──────────────── total
 *   time · 2nd order                Collect / Paid
 *   address (2 lines)                Map
 *   qty × item ………………………………… line total
 *        Delivery ………………………………… fee
 *   ▬▬ progress
 *   [call] [status dropdown]
 */
export default function OrderCard({ order, index = 0, now, districtName, customerStats, isHighlighted, transition, isUpdating, onStatusChange }) {
  const view = getOrderView(order, districtName, now);
  const isTransitioning = transition && String(transition.orderId) === String(order.id);
  const isOpen = ["PENDING", "PROCESSING", "OUT_FOR_DELIVERY"].includes(view.status);
  const orderCount = customerStats?.orderCount || 1;
  const collect = view.payment.collect && isOpen;

  return (
    <article
      id={`vendor-order-${order.id}`}
      data-order-id={order.id}
      style={{ "--i": index }}
      className={cx(
        // Resting elevation so each tile reads as its own card; lifts a little more on hover
        "relative flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.05),0_10px_28px_-16px_rgba(15,23,42,0.2)] transition-[border-color,box-shadow] duration-300",
        isHighlighted
          ? "border-brand-500 ring-2 ring-brand-500/25 vd-locate"
          : "hover:shadow-[0_2px_4px_rgba(15,23,42,0.06),0_18px_40px_-16px_rgba(15,23,42,0.3)]"
      )}
    >
      {isTransitioning && (
        <span className="absolute inset-x-0 top-0 h-0.5 overflow-hidden" aria-hidden="true">
          <span className="vd-indeterminate block h-full w-2/5 bg-gradient-to-r from-brand-500 to-amber-400" />
        </span>
      )}

      <div className="space-y-3.5 p-4">
        {/* Who and how much */}
        <header className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="truncate text-base font-semibold text-slate-900" title={view.customerName}>
                {view.customerName}
              </h3>
              {isHighlighted && <span className="shrink-0 rounded-full bg-brand-600 px-2 py-0.5 text-[11px] font-semibold text-white">New</span>}
            </div>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-slate-500">
              {/* Status is shown by the status control at the bottom of the card */}
              <span title={view.time.full}>{view.time.short}</span>
              {view.status === "PENDING" && view.ageMinutes >= 60 && <span className="text-coral-700">(waiting {view.age})</span>}
              {orderCount > 1 && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="text-amber-700">{ordinal(orderCount)} order</span>
                </>
              )}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-lg font-bold leading-tight tracking-tight tabular-nums text-slate-900">{inr(view.grandTotal)}</p>
            {view.couponCode && (
              <span className="mt-0.5 block text-[11px] font-medium text-slate-500">
                Coupon {view.couponCode}
              </span>
            )}
          </div>
        </header>

        <OrderAddress party={view.party} />
        <OrderItems
          items={view.items}
          deliveryFee={view.deliveryFee}
          splitOf={view.splitOf}
          discountAmount={view.discountAmount}
          walletDiscount={view.walletDiscount}
          couponCode={view.couponCode}
          status={view.status}
          collect={collect}
          grandTotal={view.grandTotal}
        />
      </div>

      {/* Progress + actions */}
      <footer className="mt-auto space-y-3 px-4 pb-4">
        <ProgressTrack status={isTransitioning ? transition.targetStatus : view.status} />
        {isTransitioning ? (
          <div className="flex h-11 items-center justify-center gap-2 rounded-xl bg-amber-50 text-sm font-medium text-amber-800 ring-1 ring-inset ring-amber-200" role="status">
            <Spinner />
            Updating to {ORDER_STATUS[transition.targetStatus]?.label.toLowerCase() || transition.targetStatus}
          </div>
        ) : (
          <StatusControl
            orderId={order.id}
            status={view.status}
            phone={view.phone}
            customerName={view.customerName}
            isUpdating={isUpdating}
            onStatusChange={onStatusChange}
          />
        )}
      </footer>
    </article>
  );
}
