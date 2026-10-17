import { useState, useEffect } from "react";
import { useParams, Link, Navigate } from "react-router-dom";
import Navbar from "../../components/Navbar";
import BottomNav from "../../components/BottomNav";
import { useOrders } from "../../context/OrderContext";
import { formatShortId, formatDateTimeIST } from "../../utils/formatId";
import { cleanProductImage } from "../../utils/productImage";

const STATUS_MAP = {
  PENDING: {
    label: "Pending",
    color: "bg-coral-50 text-coral-700 border-coral-300 ring-coral-500/25",
    accent: "bg-coral-500",
    halo: "ring-8 ring-coral-500/25",
    text: "text-coral-700",
  },
  PROCESSING: {
    label: "Processing",
    color: "bg-sky-50 text-sky-800 border-sky-300 ring-sky-500/25",
    accent: "bg-sky-500",
    halo: "ring-8 ring-sky-500/25",
    text: "text-sky-700",
  },
  CONFIRMED: {
    label: "Confirmed",
    color: "bg-sky-50 text-sky-800 border-sky-300 ring-sky-500/25",
    accent: "bg-sky-500",
    halo: "ring-8 ring-sky-500/25",
    text: "text-sky-700",
  },
  SHIPPED: {
    label: "Shipped",
    color: "bg-indigo-50 text-indigo-800 border-indigo-300 ring-indigo-500/25",
    accent: "bg-indigo-600",
    halo: "ring-8 ring-indigo-500/25",
    text: "text-indigo-700",
  },
  OUT_FOR_DELIVERY: {
    label: "Out for Delivery",
    color: "bg-indigo-50 text-indigo-800 border-indigo-300 ring-indigo-500/25",
    accent: "bg-indigo-600",
    halo: "ring-8 ring-indigo-500/25",
    text: "text-indigo-700",
  },
  DELIVERED: {
    label: "Delivered",
    color: "bg-emerald-50 text-emerald-800 border-emerald-300 ring-emerald-500/25",
    accent: "bg-emerald-600",
    halo: "ring-8 ring-emerald-500/25",
    text: "text-emerald-700",
  },
  COMPLETED: {
    label: "Delivered",
    color: "bg-emerald-50 text-emerald-800 border-emerald-300 ring-emerald-500/25",
    accent: "bg-emerald-600",
    halo: "ring-8 ring-emerald-500/25",
    text: "text-emerald-700",
  },
  CANCELLED: {
    label: "Cancelled",
    color: "bg-rose-50 text-rose-700 border-rose-300 ring-rose-500/25",
    accent: "bg-rose-500",
    halo: "ring-8 ring-rose-500/25",
    text: "text-rose-700",
  },
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

  return (
    <div className="min-h-screen bg-surface pb-20 font-sans">
      <Navbar />

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-6">
        <Link to="/orders" className="text-sm text-brand-500 hover:underline mb-3 inline-block font-bold">
          ← Back to Orders
        </Link>

        <div className={`relative overflow-hidden rounded-2xl border p-5 mb-5 shadow-[0_1px_3px_rgba(15,23,42,0.04),0_8px_20px_-8px_rgba(15,23,42,0.06)] ${
          rawStatus === "PENDING"
            ? "border-coral-300/80 bg-gradient-to-r from-coral-50/70 via-white to-white"
            : rawStatus === "PROCESSING" || rawStatus === "CONFIRMED"
            ? "border-sky-300/80 bg-gradient-to-r from-sky-50/70 via-white to-white"
            : rawStatus === "OUT_FOR_DELIVERY" || rawStatus === "SHIPPED"
            ? "border-indigo-300/80 bg-gradient-to-r from-indigo-50/70 via-white to-white"
            : rawStatus === "DELIVERED"
            ? "border-emerald-300/80 bg-gradient-to-r from-emerald-50/70 via-white to-white"
            : "border-slate-200/90 bg-white"
        }`}>
          {/* Left side me status ka vertical accent color */}
          <span className={`absolute inset-y-0 left-0 w-1.5 transition-colors duration-500 ${isDelivered ? "bg-emerald-600" : statusInfo.accent}`} aria-hidden="true" />

          <div className="flex items-center justify-between gap-3 mb-2.5 flex-wrap pl-1">
            <div className="flex items-center gap-2.5">
              <h1 className="text-base sm:text-lg font-black text-navy-950">
                Order <span className="font-mono text-brand-700">{formatShortId(order.id, "ORD")}</span>
              </h1>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-black border shadow-2xs ${statusInfo.color}`}>
                {statusInfo.label}
              </span>
            </div>
            <span className="text-xs text-slate-500 font-bold bg-white/90 px-2.5 py-1 rounded-lg border border-slate-200/80 shadow-2xs">
              🕒 {formatDateTimeIST(orderDateStr)}
            </span>
          </div>

          <div className="flex items-start gap-2 text-xs text-slate-600 font-medium pt-2 border-t border-slate-200/60 pl-1">
            <span className="text-base shrink-0 leading-none">📍</span>
            <div>
              <span className="text-slate-400 font-bold uppercase text-[10px] tracking-wider block">Delivering To Site:</span>
              <span className="font-bold text-navy-950">{order.address?.line || order.address?.street || "Site Address"}, {order.address?.city || "Uttar Pradesh"}</span>
            </div>
          </div>
        </div>

        {/* Order track karne ka horizontal stepper bar */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 mb-5 shadow-[0_1px_3px_rgba(15,23,42,0.04),0_8px_20px_-8px_rgba(15,23,42,0.06)] overflow-hidden relative">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">Live Order Tracking</h3>
              <p className="text-xs font-bold text-navy-900 mt-0.5">
                Status: <span className={`font-black ${isDelivered ? "text-emerald-700" : statusInfo.text}`}>{statusInfo.label}</span>
              </p>
            </div>
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black border shadow-2xs ${statusInfo.color}`}>
              <span className={`w-2 h-2 rounded-full ${isDelivered ? "bg-emerald-600" : "bg-current animate-pulse"}`} />
              {statusInfo.label}
            </span>
          </div>

          <div className="relative pt-2 pb-2">
            {/* Stepper nodes ke peeche ki connecting line */}
            <div
              className="absolute top-6 -translate-y-1/2 h-[3.5px] bg-slate-100 rounded-full z-0 overflow-hidden"
              style={{
                left: "calc(100% / 8)",
                right: "calc(100% / 8)",
              }}
            >
              <div
                className={`h-full ${isDelivered ? "bg-emerald-600" : statusInfo.accent} rounded-full`}
                style={{
                  width: `${progressPercent}%`,
                  transition: "width 1.25s cubic-bezier(0.22, 1, 0.36, 1)",
                }}
              />
            </div>

            {/* Har step ke circles */}
            <div className="flex items-center justify-between relative z-10">
              {STEP_FLOW.map((step, i) => {
                const isPassed = isDelivered || i < currentStepIndex;
                const isCurrent = !isDelivered && i === currentStepIndex;

                let nodeClasses = "";
                let nodeContent = "";

                if (isDelivered) {
                  nodeClasses = "bg-emerald-600 text-white shadow-xs ring-4 ring-emerald-500/25";
                  nodeContent = "✓";
                } else if (isPassed) {
                  nodeClasses = `${statusInfo.accent} text-white shadow-xs`;
                  nodeContent = "✓";
                } else if (isCurrent) {
                  nodeClasses = `${statusInfo.accent} text-white ${statusInfo.halo} shadow-md scale-105`;
                  nodeContent = i + 1;
                } else {
                  nodeClasses = "bg-white text-slate-400 border-2 border-slate-200";
                  nodeContent = i + 1;
                }

                return (
                  <div key={step.id} className="flex flex-col items-center flex-1 relative">
                    <div
                      className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-black transition-all duration-500 ${nodeClasses}`}
                    >
                      {nodeContent}
                    </div>
                    <span
                      className={`text-[11px] mt-2.5 text-center transition-colors leading-tight ${
                        isDelivered
                          ? "text-emerald-900 font-bold"
                          : isCurrent
                          ? `${statusInfo.text} font-black`
                          : isPassed
                          ? "text-navy-950 font-bold"
                          : "text-slate-400 font-medium"
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Order me shamil products ki list */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 mb-5 shadow-[0_1px_3px_rgba(15,23,42,0.04),0_8px_20px_-8px_rgba(15,23,42,0.06)]">
          <div className="flex items-center justify-between mb-3.5">
            <h3 className="text-sm font-black text-navy-950">Ordered Materials</h3>
            <span className="text-[11px] font-black text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200/60">
              {(order.items || []).length} {((order.items || []).length === 1) ? "item" : "items"}
            </span>
          </div>

          <div className="space-y-3">
            {(order.items || []).map((item, idx) => {
              const itemName = item.productName || item.name || "Material Item";
              const itemQty = Number(item.quantity || item.qty || 1);
              const itemPrice = Number(item.priceAtPurchase || item.unitPrice || item.price || 100);
              const itemImg = cleanProductImage(item);
              const itemTotal = item.totalPrice ? Number(item.totalPrice) : itemQty * itemPrice;

              return (
                <div key={item.id || idx} className="flex gap-3.5 items-center p-2 rounded-xl bg-slate-50/70 border border-slate-100">
                  <div className="h-14 w-14 rounded-lg bg-white overflow-hidden shrink-0 border border-slate-200/80 p-1 flex items-center justify-center">
                    <img
                      src={itemImg}
                      alt={itemName}
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = "/categories/cement.png";
                      }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-black text-navy-950 line-clamp-1">
                      {itemName}
                    </p>
                    <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                      Qty: <strong className="text-navy-900 font-bold">{itemQty}</strong> × ₹{itemPrice.toLocaleString("en-IN")}
                    </p>
                  </div>
                  <span className="text-sm font-black text-navy-950 tabular-nums">
                    ₹{itemTotal.toLocaleString("en-IN")}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Bill aur payment ka summary */}
          <div className="mt-4 pt-3.5 border-t border-dashed border-slate-200 space-y-2 text-xs">
            <div className="flex justify-between text-slate-600 font-medium">
              <span>Materials Subtotal</span>
              <span className="font-bold text-navy-900">₹{(order.items || []).reduce((sum, it) => sum + (Number(it.totalPrice) || (Number(it.quantity || 1) * Number(it.priceAtPurchase || 100))), 0).toLocaleString("en-IN")}</span>
            </div>
            <div className="flex justify-between text-slate-600 font-medium">
              <span>District Delivery Fee</span>
              <span className="font-bold text-brand-600">₹{Number(order.deliveryFee !== undefined ? order.deliveryFee : 49).toLocaleString("en-IN")}</span>
            </div>
            {Number(order.discountAmount) > 0 && (
              <div className="flex justify-between items-center text-emerald-700 font-semibold bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-200">
                <span className="font-extrabold">Coupon Discount ({order.couponCode || "Applied"})</span>
                <span className="font-black">− ₹{Number(order.discountAmount).toLocaleString("en-IN")}</span>
              </div>
            )}
            {Number(order.walletDiscount) > 0 && (
              <div className="flex justify-between items-center text-amber-800 font-semibold bg-amber-50 px-2.5 py-1.5 rounded-lg border border-amber-200">
                <span className="font-extrabold">Wallet Paid (Deducted)</span>
                <span className="font-black">− ₹{Number(order.walletDiscount).toLocaleString("en-IN")}</span>
              </div>
            )}
            <div className="pt-2 border-t border-slate-200/80 flex justify-between items-center text-sm font-black text-navy-950">
              <div>
                <span>Total Amount</span>
                <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/80 ml-2 font-extrabold uppercase">Cash On Delivery</span>
              </div>
              <span className="text-base sm:text-lg font-black text-navy-950 tabular-nums">
                ₹{displayTotal.toLocaleString("en-IN")}
              </span>
            </div>
          </div>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}