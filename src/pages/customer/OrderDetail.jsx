import { useState, useEffect } from "react";
import { useParams, Link, Navigate } from "react-router-dom";
import Navbar from "../../components/Navbar";
import MobileHeader from "../../components/ui/MobileHeader";
import { CheckIcon, ClockIcon, CloseIcon, PinIcon } from "../../components/ui/Icons";
import { useOrders } from "../../context/OrderContext";
import { formatShortId, formatDateTimeIST } from "../../utils/formatId";
import { cleanProductImage } from "../../utils/productImage";

const STATUS_MAP = {
  PENDING: { label: "Pending", color: "bg-amber-50 text-amber-800 ring-amber-600/20", accent: "bg-amber-500", text: "text-amber-700" },
  PROCESSING: { label: "Processing", color: "bg-sky-50 text-sky-800 ring-sky-600/20", accent: "bg-sky-600", text: "text-sky-700" },
  CONFIRMED: { label: "Confirmed", color: "bg-sky-50 text-sky-800 ring-sky-600/20", accent: "bg-sky-600", text: "text-sky-700" },
  SHIPPED: { label: "Shipped", color: "bg-indigo-50 text-indigo-800 ring-indigo-600/20", accent: "bg-indigo-600", text: "text-indigo-700" },
  OUT_FOR_DELIVERY: { label: "Out for Delivery", color: "bg-indigo-50 text-indigo-800 ring-indigo-600/20", accent: "bg-indigo-600", text: "text-indigo-700" },
  DELIVERED: { label: "Delivered", color: "bg-emerald-50 text-emerald-800 ring-emerald-600/20", accent: "bg-emerald-600", text: "text-emerald-700" },
  COMPLETED: { label: "Delivered", color: "bg-emerald-50 text-emerald-800 ring-emerald-600/20", accent: "bg-emerald-600", text: "text-emerald-700" },
  CANCELLED: { label: "Cancelled", color: "bg-slate-100 text-slate-700 ring-slate-500/20", accent: "bg-slate-400", text: "text-slate-600" },
};

const STEP_FLOW = [
  { id: "PENDING", label: "Pending" },
  { id: "PROCESSING", label: "Processing" },
  { id: "OUT_FOR_DELIVERY", label: "Out for Delivery" },
  { id: "DELIVERED", label: "Delivered" },
];

export default function OrderDetail() {
  const { id } = useParams();
  const { getOrder, orders } = useOrders();
  const order = getOrder(id) || orders.find((o) => o.id === id);

  const rawStatus = (order?.status || "PENDING").toUpperCase();
  const statusInfo = STATUS_MAP[rawStatus] || STATUS_MAP.PENDING;
  const isDelivered = rawStatus === "DELIVERED" || rawStatus === "COMPLETED";

  let currentStepIndex = STEP_FLOW.findIndex((s) => s.id === rawStatus);
  if (currentStepIndex === -1) {
    if (rawStatus === "CONFIRMED") currentStepIndex = 1;
    else if (rawStatus === "SHIPPED") currentStepIndex = 2;
    else currentStepIndex = 0;
  }
  if (isDelivered) {
    currentStepIndex = STEP_FLOW.length - 1;
  }

  // Page load hone par progress bar animation smooth chalane ke liye
  const [progressPercent, setProgressPercent] = useState(0);

  useEffect(() => {
    setProgressPercent(0);
    const target = isDelivered ? 100 : Math.min(100, (currentStepIndex / (STEP_FLOW.length - 1)) * 100);
    const timer = setTimeout(() => {
      setProgressPercent(target);
    }, 120);
    return () => clearTimeout(timer);
  }, [order?.id, currentStepIndex, isDelivered]);

  if (!order) return <Navigate to="/orders" replace />;

  const orderDateStr = order.date || order.createdAt || new Date().toISOString();
  const matSubtotal = (order.items || []).reduce((sum, it) => sum + (Number(it.totalPrice) || (Number(it.quantity || 1) * Number(it.priceAtPurchase || 100))), 0);
  const delCharge = Number(order.deliveryFee !== undefined ? order.deliveryFee : 49);
  const discAmount = Number(order.discountAmount || 0);
  const displayTotal = Number(order.totalAmount || order.total) || Math.max(0, matSubtotal + delCharge - discAmount);

  const isCancelled = rawStatus === "CANCELLED";
  const items = order.items || [];
  const card = "bg-white rounded-2xl ring-1 ring-slate-200/80 p-4 sm:p-5";

  return (
    <div data-storefront className="min-h-screen bg-surface pb-24 lg:pb-12 font-sans">
      <div className="hidden lg:block">
        <Navbar />
      </div>
      <MobileHeader title={`Order ${formatShortId(order.id, "ORD")}`} fallback="/orders" />

      <main className="bc-fade-in max-w-2xl mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-3 sm:space-y-4">
        <Link to="/orders" className="hidden lg:inline-flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-navy-950">
          ← All orders
        </Link>

        {/* Summary */}
        <section className={card}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h1 className="text-lg font-semibold text-navy-950">
              Order <span className="font-mono">{formatShortId(order.id, "ORD")}</span>
            </h1>
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${statusInfo.color}`}>
              {statusInfo.label}
            </span>
          </div>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
            <ClockIcon className="h-4 w-4 shrink-0" />
            {formatDateTimeIST(orderDateStr)}
          </p>
          <div className="mt-3 flex items-start gap-2.5 border-t border-slate-100 pt-3">
            <PinIcon className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
            <div className="min-w-0 text-sm">
              <p className="text-xs text-slate-500">Delivering to</p>
              <p className="font-medium text-navy-950 break-words">
                {order.address?.line || order.address?.street || "Site Address"}, {order.address?.city || "Uttar Pradesh"}
              </p>
            </div>
          </div>
        </section>

        {/* Tracking */}
        <section className={card} aria-label="Order progress">
          {isCancelled ? (
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                <CloseIcon className="h-4 w-4" strokeWidth={2.2} />
              </span>
              <div>
                <h2 className="text-sm font-semibold text-navy-950">This order was cancelled</h2>
                <p className="mt-0.5 text-sm text-slate-500">Nothing will be delivered or collected for it.</p>
              </div>
            </div>
          ) : (
            <>
              <h2 className="mb-5 text-sm font-semibold text-navy-950">Tracking</h2>
              <div className="relative">
                <div className="absolute top-4 h-0.5 -translate-y-1/2 rounded-full bg-slate-100" style={{ left: "12.5%", right: "12.5%" }}>
                  <div
                    className={`h-full rounded-full ${isDelivered ? "bg-emerald-600" : statusInfo.accent}`}
                    style={{ width: `${progressPercent}%`, transition: "width 900ms cubic-bezier(0.22, 1, 0.36, 1)" }}
                  />
                </div>
                <ol className="relative z-10 flex items-start justify-between">
                  {STEP_FLOW.map((step, i) => {
                    const isPassed = isDelivered || i < currentStepIndex;
                    const isCurrent = !isDelivered && i === currentStepIndex;
                    return (
                      <li key={step.id} className="flex flex-1 flex-col items-center" aria-current={isCurrent ? "step" : undefined}>
                        <span
                          className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-colors duration-500 ${
                            isPassed
                              ? `${isDelivered ? "bg-emerald-600" : statusInfo.accent} text-white`
                              : isCurrent
                              ? `${statusInfo.accent} text-white ring-4 ring-slate-900/5`
                              : "bg-white text-slate-400 ring-2 ring-inset ring-slate-200"
                          }`}
                        >
                          {isPassed ? <CheckIcon className="h-4 w-4" strokeWidth={2.6} /> : i + 1}
                        </span>
                        <span
                          className={`mt-2 px-1 text-center text-xs leading-tight ${
                            isCurrent ? `font-semibold ${statusInfo.text}` : isPassed ? "font-medium text-navy-950" : "text-slate-400"
                          }`}
                        >
                          {step.label}
                        </span>
                      </li>
                    );
                  })}
                </ol>
              </div>
            </>
          )}
        </section>

        {/* Items + bill */}
        <section className={card}>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-navy-950">Items</h2>
            <span className="text-xs text-slate-500 tabular-nums">
              {items.length} {items.length === 1 ? "item" : "items"}
            </span>
          </div>

          <ul className="divide-y divide-slate-100">
            {items.map((item, idx) => {
              const itemName = item.productName || item.name || "Material Item";
              const itemQty = Number(item.quantity || item.qty || 1);
              const itemPrice = Number(item.priceAtPurchase || item.unitPrice || item.price || 100);
              const itemImg = cleanProductImage(item);
              const itemTotal = item.totalPrice ? Number(item.totalPrice) : itemQty * itemPrice;

              return (
                <li key={item.id || idx} className="flex items-center gap-3 py-2.5 first:pt-0">
                  <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-white p-1 ring-1 ring-slate-100 flex items-center justify-center">
                    <img
                      src={itemImg}
                      alt=""
                      className="h-full w-full object-contain"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = cleanProductImage(null, item.categoryName || item.category, itemName);
                      }}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm font-medium text-navy-950">{itemName}</p>
                    <p className="mt-0.5 text-xs text-slate-500 tabular-nums">
                      {itemQty} × ₹{itemPrice.toLocaleString("en-IN")}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-navy-950 tabular-nums">₹{itemTotal.toLocaleString("en-IN")}</span>
                </li>
              );
            })}
          </ul>

          <dl className="mt-3 space-y-2 border-t border-slate-100 pt-3 text-sm">
            <div className="flex justify-between text-slate-600">
              <dt>Materials subtotal</dt>
              <dd className="tabular-nums text-navy-950">₹{matSubtotal.toLocaleString("en-IN")}</dd>
            </div>
            <div className="flex justify-between text-slate-600">
              <dt>Delivery fee</dt>
              <dd className="tabular-nums text-navy-950">
                {delCharge === 0 ? <span className="font-medium text-emerald-700">Free</span> : `₹${delCharge.toLocaleString("en-IN")}`}
              </dd>
            </div>
            {discAmount > 0 && (
              <div className="flex justify-between text-emerald-700">
                <dt>Coupon ({order.couponCode || "applied"})</dt>
                <dd className="tabular-nums">− ₹{discAmount.toLocaleString("en-IN")}</dd>
              </div>
            )}
            {Number(order.walletDiscount) > 0 && (
              <div className="flex justify-between text-emerald-700">
                <dt>Paid from wallet</dt>
                <dd className="tabular-nums">− ₹{Number(order.walletDiscount).toLocaleString("en-IN")}</dd>
              </div>
            )}
            <div className="flex items-center justify-between border-t border-slate-100 pt-3">
              <dt className="flex items-center gap-2 font-semibold text-navy-950">
                Total
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">Cash on delivery</span>
              </dt>
              <dd className="text-lg font-semibold text-navy-950 tabular-nums">₹{displayTotal.toLocaleString("en-IN")}</dd>
            </div>
          </dl>
        </section>
      </main>
    </div>
  );
}
