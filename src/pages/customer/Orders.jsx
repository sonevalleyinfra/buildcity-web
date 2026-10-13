import { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCart } from "../../context/CartContext";
import { useOrders } from "../../context/OrderContext";
import { useAuth } from "../../context/AuthContext";
import { useAdmin } from "../../context/AdminContext";
import Navbar from "../../components/Navbar";
import RegionPicker from "../../components/RegionPicker";
import NotificationPanel from "../../components/NotificationPanel";
import { formatShortId, formatDateTimeIST } from "../../utils/formatId";
import { cleanProductImage } from "../../utils/productImage";
import LoadMoreButton from "../../components/LoadMoreButton";

const TABS = ["All", "Pending", "Processing", "Out for Delivery", "Delivered", "Cancelled"];

const STATUS_MAP = {
  PENDING: {
    label: "Pending",
    color: "bg-amber-50 text-amber-800 border-amber-300/80",
    tile: "bg-gradient-to-b from-amber-50/70 via-white to-white border-amber-300/70 shadow-[0_2px_10px_-4px_rgba(245,158,11,0.15)]",
    accent: "bg-amber-500",
    halo: "ring-amber-500/25",
    dot: "bg-amber-500",
    pulse: true,
  },
  PROCESSING: {
    label: "Processing",
    color: "bg-sky-50 text-sky-800 border-sky-300/80",
    tile: "bg-gradient-to-b from-sky-50/70 via-white to-white border-sky-300/70 shadow-[0_2px_10px_-4px_rgba(14,165,233,0.15)]",
    accent: "bg-sky-500",
    halo: "ring-sky-500/25",
    dot: "bg-sky-500",
    pulse: true,
  },
  CONFIRMED: {
    label: "Confirmed",
    color: "bg-sky-50 text-sky-800 border-sky-300/80",
    tile: "bg-gradient-to-b from-sky-50/70 via-white to-white border-sky-300/70 shadow-[0_2px_10px_-4px_rgba(14,165,233,0.15)]",
    accent: "bg-sky-500",
    halo: "ring-sky-500/25",
    dot: "bg-sky-500",
    pulse: false,
  },
  SHIPPED: {
    label: "Shipped",
    color: "bg-indigo-50 text-indigo-800 border-indigo-300/80",
    tile: "bg-gradient-to-b from-indigo-50/70 via-white to-white border-indigo-300/70 shadow-[0_2px_10px_-4px_rgba(99,102,241,0.15)]",
    accent: "bg-indigo-500",
    halo: "ring-indigo-500/25",
    dot: "bg-indigo-500",
    pulse: true,
  },
  OUT_FOR_DELIVERY: {
    label: "Out for Delivery",
    color: "bg-indigo-50 text-indigo-800 border-indigo-300/80",
    tile: "bg-gradient-to-b from-indigo-50/70 via-white to-white border-indigo-300/70 shadow-[0_2px_10px_-4px_rgba(99,102,241,0.15)]",
    accent: "bg-indigo-500",
    halo: "ring-indigo-500/25",
    dot: "bg-indigo-500",
    pulse: true,
  },
  DELIVERED: {
    label: "Delivered",
    color: "bg-emerald-50 text-emerald-800 border-emerald-300/80",
    tile: "bg-gradient-to-b from-emerald-50/70 via-white to-white border-emerald-300/70 shadow-[0_2px_10px_-4px_rgba(16,185,129,0.15)]",
    accent: "bg-emerald-500",
    halo: "ring-emerald-500/25",
    dot: "bg-emerald-500",
    pulse: false,
  },
  COMPLETED: {
    label: "Delivered",
    color: "bg-emerald-50 text-emerald-800 border-emerald-300/80",
    tile: "bg-gradient-to-b from-emerald-50/70 via-white to-white border-emerald-300/70 shadow-[0_2px_10px_-4px_rgba(16,185,129,0.15)]",
    accent: "bg-emerald-500",
    halo: "ring-emerald-500/25",
    dot: "bg-emerald-500",
    pulse: false,
  },
  CANCELLED: {
    label: "Cancelled",
    color: "bg-rose-50 text-rose-700 border-rose-300/70",
    tile: "bg-gradient-to-b from-slate-50 via-white to-white border-slate-300/80",
    accent: "bg-rose-400",
    halo: "ring-rose-400/25",
    dot: "bg-rose-400",
    pulse: false,
  },
};

const ORDER_STEPS = ["PENDING", "PROCESSING", "OUT_FOR_DELIVERY", "DELIVERED"];

function PinIcon() {
  return (
    <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function CartIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="21" r="1" />
      <circle cx="19" cy="21" r="1" />
      <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
    </svg>
  );
}

export default function Orders() {
  const navigate = useNavigate();
  const { count } = useCart();
  const { orders, hasMoreOrders, loadingMoreOrders, loadMoreOrders } = useOrders();
  const { user } = useAuth();
  const { productsLoading } = useAdmin();
  const [tab, setTab] = useState("All");

  const customerPhone = (user?.phone || "").trim();
  const customerId = user?.id;

  // Logged in customer ke hi orders dikhane ke liye filter
  const customerOrders = useMemo(() => {
    if (!customerPhone && !customerId) return orders || [];
    return (orders || []).filter((o) => {
      const oPhone = (o.userPhone || o.phone || o.customerPhone || o.customer?.phone || o.address?.phone || "").trim().replace(/\D/g, "");
      const cleanCust = customerPhone.replace(/\D/g, "");

      const oUserId = o.userId || o.customerId || o.customer?.id;

      if (customerId && oUserId && String(oUserId).toLowerCase() === String(customerId).toLowerCase()) {
        return true;
      }
      if (cleanCust && oPhone && (oPhone.includes(cleanCust.slice(-10)) || cleanCust.includes(oPhone.slice(-10)))) {
        return true;
      }
      return false;
    });
  }, [orders, customerPhone, customerId]);

  const filtered = tab === "All" ? customerOrders : customerOrders.filter((o) => {
    const rawSt = (o.status || "PENDING").toUpperCase();
    const info = STATUS_MAP[rawSt] || STATUS_MAP.PENDING;
    return info.label.toLowerCase() === tab.toLowerCase() || rawSt === tab.toUpperCase();
  });

  return (
    <div className="min-h-screen bg-slate-50 text-navy-900 pb-24 sm:pb-12 font-sans w-full max-w-full overflow-x-clip">
      {/* Desktop header navigation */}
      <div className="hidden lg:block">
        <Navbar />
      </div>

      {/* Mobile header back navigation ke saath */}
      <div className="lg:hidden bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Link
              to="/"
              className="p-1.5 -ml-1.5 rounded-xl hover:bg-slate-100 text-navy-900 active:scale-95 transition-all flex items-center justify-center"
              title="Back to Home"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="m15 18-6-6 6-6" />
              </svg>
            </Link>
            <h1 className="font-extrabold text-navy-900 text-base tracking-tight">My Orders</h1>
          </div>

          <div className="flex items-center gap-3">
            <NotificationPanel className="relative text-navy-900 hover:text-brand-600 transition-colors cursor-pointer" />
            <Link to="/cart" className="relative text-navy-900 hover:text-brand-600 transition-colors p-1" title="Cart">
              <CartIcon />
              {count > 0 && (
                <span className="absolute -top-1 -right-1.5 h-4.5 w-4.5 rounded-full bg-brand-500 text-white text-[10px] font-black flex items-center justify-center shadow-xs">
                  {count}
                </span>
              )}
            </Link>
          </div>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 pt-6 space-y-6">
        {/* Orders page ka title */}
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-navy-900 tracking-tight">
            My Orders
          </h1>
        </div>

        {/* Order status ke hisab se filter karne ke tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1.5 border-b border-slate-200/90 no-scrollbar">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3.5 py-2 text-xs font-bold rounded-xl active:scale-[0.98] transition-all whitespace-nowrap cursor-pointer ${
                tab === t
                  ? "bg-navy-900 text-white shadow-xs"
                  : "text-slate-600 bg-white border border-slate-200/90 hover:bg-slate-100"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Customer ke orders ki list */}
        {productsLoading ? (
          <div className="space-y-3.5 animate-pulse">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs"
              >
                <div className="flex gap-4 items-center">
                  <div className="h-12 w-12 rounded-xl bg-slate-200 shrink-0" />
                  <div className="space-y-2">
                    <div className="h-4 bg-slate-200 rounded w-48" />
                    <div className="h-3 bg-slate-200 rounded w-32" />
                    <div className="h-3 bg-slate-200 rounded w-24" />
                  </div>
                </div>
                <div className="flex items-center justify-between sm:flex-col sm:items-end gap-2">
                  <div className="h-4 bg-slate-200 rounded w-20" />
                  <div className="h-6 bg-slate-200 rounded w-24" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
            <p className="text-4xl mb-3">📦</p>
            <h3 className="text-sm font-extrabold text-navy-900">No Orders Found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {tab === "All"
                ? "You haven't placed any building material orders yet. Browse our certified catalog to order cement, steel, paints & more."
                : `No orders matching status "${tab}".`}
            </p>
            <button
              onClick={() => navigate("/categories")}
              className="mt-4 inline-block bg-brand-500 hover:bg-brand-600 active:scale-[0.98] text-white text-xs font-bold px-4.5 py-2.5 rounded-xl transition-all cursor-pointer shadow-2xs"
            >
              Browse Catalog & Order Now
            </button>
          </div>
        ) : (
          <div className="space-y-3.5">
            {filtered.map((order) => {
              const rawSt = (order.status || "PENDING").toUpperCase();
              const statusInfo = STATUS_MAP[rawSt] || STATUS_MAP.PENDING;
              const displayTotal = Number(order.total || order.totalAmount || 0);

                const firstItem = order.items?.[0];
                let stepIndex = ORDER_STEPS.indexOf(rawSt);
                if (stepIndex === -1) {
                  if (rawSt === "CONFIRMED") stepIndex = 1;
                  else if (rawSt === "SHIPPED") stepIndex = 2;
                  else stepIndex = 0;
                }

                return (
                  <Link
                    key={order.id}
                    to={`/orders/${order.id}`}
                    className={`relative overflow-hidden rounded-2xl border p-4 sm:p-5 hover:shadow-lg active:scale-[0.99] transition-all flex flex-col justify-between gap-3.5 group block ${statusInfo.tile}`}
                  >
                    {/* Status ki vertical color line */}
                    <span className={`absolute inset-y-0 left-0 w-1.5 transition-colors duration-500 ${statusInfo.accent}`} aria-hidden="true" />

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full">
                      <div className="flex gap-3.5 sm:gap-4 items-center min-w-0 pl-1">
                        {/* Product package icon or product image */}
                        <div className="h-13 w-13 sm:h-14 sm:w-14 rounded-xl bg-white border border-slate-200/90 flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 overflow-hidden transition-all select-none">
                          {firstItem ? (
                            <img
                              src={cleanProductImage(firstItem)}
                              alt={firstItem.name || "Item"}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.onerror = null;
                                e.currentTarget.src = "/categories/cement.png";
                              }}
                            />
                          ) : (
                            <span className="text-2xl">📦</span>
                          )}
                        </div>

                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10.5px] font-black border shadow-2xs ${statusInfo.color}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dot} ${statusInfo.pulse ? "animate-pulse" : ""}`} />
                              {statusInfo.label}
                            </span>
                            <span className="text-[11px] text-slate-400 font-medium">
                              {formatDateTimeIST(order.date || order.createdAt)}
                            </span>
                          </div>

                          <h3 className="text-xs sm:text-sm font-black text-navy-950 leading-snug group-hover:text-brand-600 transition-colors tracking-tight line-clamp-1">
                            {firstItem?.name || firstItem?.productName || "Building Materials"}
                          </h3>

                          <div className="flex items-center gap-2 flex-wrap pt-0.5">
                            <p className="text-[11px] text-slate-500 font-medium">
                              Order: <strong className="font-mono text-brand-700 font-black">{formatShortId(order.id || order.orderNumber, "ORD")}</strong>
                            </p>
                            {order.items && order.items.length > 1 && (
                              <span className="text-[10px] font-black text-slate-700 bg-slate-100/90 px-2 py-0.5 rounded-md border border-slate-200/80">
                                +{order.items.length - 1} more items
                              </span>
                            )}
                            <span className="text-[10px] font-bold text-slate-500 bg-white/90 px-2 py-0.5 rounded-md border border-slate-200/80">
                              Delivery: ₹{Number(order.deliveryFee !== undefined ? order.deliveryFee : 49)}
                            </span>
                            {order.couponCode && (
                              <span className="text-[10px] font-extrabold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200">
                                Coupon: {order.couponCode} {Number(order.discountAmount) > 0 ? `(-₹${Number(order.discountAmount).toLocaleString("en-IN")})` : ""}
                              </span>
                            )}
                            {Number(order.walletDiscount) > 0 && (
                              <span className="text-[10px] font-extrabold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                                Wallet (-₹{Number(order.walletDiscount).toLocaleString("en-IN")})
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                        <div className="text-left sm:text-right">
                          <p className="text-[9.5px] text-slate-400 font-black uppercase tracking-wider">Total Amount</p>
                          <p className="text-base sm:text-lg font-black text-navy-950 tabular-nums">₹{displayTotal.toLocaleString("en-IN")}</p>
                        </div>
                        <span className="text-xs font-black text-white bg-navy-950 group-hover:bg-brand-600 px-4 py-2 rounded-xl group-hover:shadow-md transition-all shrink-0 active:scale-95 flex items-center gap-1 shadow-2xs">
                          <span>Track Order</span>
                          <span className="transition-transform group-hover:translate-x-0.5">→</span>
                        </span>
                      </div>
                    </div>
                  </Link>
                );
            })}
          </div>
        )}
        <LoadMoreButton
          hasMore={hasMoreOrders}
          loading={loadingMoreOrders}
          onClick={loadMoreOrders}
        />
      </main>
    </div>
  );
}