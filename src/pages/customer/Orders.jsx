import { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCart } from "../../context/CartContext";
import { useOrders } from "../../context/OrderContext";
import { useAuth } from "../../context/AuthContext";
import { useAdmin } from "../../context/AdminContext";
import Navbar from "../../components/Navbar";
import RegionPicker from "../../components/RegionPicker";
import NotificationPanel from "../../components/NotificationPanel";
import { formatShortId } from "../../utils/formatId";

const TABS = ["All", "Pending", "Processing", "Out for Delivery", "Delivered", "Cancelled"];

const STATUS_MAP = {
  PENDING: { label: "Pending", color: "bg-amber-50 text-amber-700 border-amber-200/80", pulse: true },
  PROCESSING: { label: "Processing", color: "bg-blue-50 text-blue-700 border-blue-200/80", pulse: true },
  CONFIRMED: { label: "Confirmed", color: "bg-blue-50 text-blue-700 border-blue-200/80", pulse: false },
  SHIPPED: { label: "Shipped", color: "bg-indigo-50 text-indigo-700 border-indigo-200/80", pulse: true },
  OUT_FOR_DELIVERY: { label: "Out for Delivery", color: "bg-purple-50 text-purple-700 border-purple-200/80", pulse: true },
  DELIVERED: { label: "Delivered", color: "bg-emerald-50 text-emerald-700 border-emerald-200/80", pulse: false },
  CANCELLED: { label: "Cancelled", color: "bg-rose-50 text-rose-600 border-rose-200/80", pulse: false },
};

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
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
    </svg>
  );
}

export default function Orders() {
  const navigate = useNavigate();
  const { count } = useCart();
  const { orders } = useOrders();
  const { user } = useAuth();
  const { productsLoading } = useAdmin();
  const [tab, setTab] = useState("All");

  const customerPhone = (user?.phone || "").trim();
  const customerId = user?.id;

  // STRICT CUSTOMER ISOLATION: Show ONLY orders belonging to the logged-in customer
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
    <div className="min-h-screen bg-slate-50 text-navy-900 pb-24 sm:pb-12 font-sans">
      {/* Desktop header */}
      <div className="hidden lg:block">
        <Navbar />
      </div>

      {/* Mobile header */}
      <div className="lg:hidden bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">🏗️</span>
            <div>
              <div className="font-black text-navy-900 text-base leading-none">
                Build <span className="text-brand-500">City</span>
              </div>
              <RegionPicker
                trigger={(r) => (
                  <span className="flex items-center gap-1 text-[11px] text-slate-500 mt-0.5">
                    <PinIcon />
                    {r.name}, {r.state === "Uttar Pradesh" ? "UP" : r.state}
                  </span>
                )}
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <NotificationPanel className="relative text-navy-900" />
            <Link to="/cart" className="relative text-navy-900">
              <CartIcon />
              {count > 0 && (
                <span className="absolute -top-1.5 -right-2 h-4.5 w-4.5 rounded-full bg-brand-500 text-white text-[10px] font-bold flex items-center justify-center">
                  {count}
                </span>
              )}
            </Link>
          </div>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 pt-6 space-y-6">
        {/* Header Title */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black text-navy-900 tracking-tight">
              My Orders & Fulfillment
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Live delivery status updates directly from partner vendors in your district.
            </p>
          </div>
          <button
            onClick={() => navigate("/categories")}
            className="text-xs font-black bg-brand-500 hover:bg-brand-600 active:scale-[0.98] text-white px-4 py-2.5 rounded-xl transition-all cursor-pointer shadow-xs"
          >
            + New Order
          </button>
        </div>

        {/* Status Filter Tabs */}
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

        {/* Orders List */}
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

              return (
                <Link
                  key={order.id}
                  to={`/orders/${order.id}`}
                  className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 hover:border-brand-400 hover:shadow-md active:scale-[0.99] transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 group shadow-2xs block"
                >
                  <div className="flex gap-4 items-center">
                    <div className="h-12 w-12 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-xl shrink-0 group-hover:bg-brand-50 transition-colors">
                      📦
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${statusInfo.color}`}>
                          {statusInfo.pulse && <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />}
                          {statusInfo.label}
                        </span>
                        <span className="text-[11px] text-slate-400 font-medium">
                          {new Date(order.date || order.createdAt || Date.now()).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </div>

                      <h3 className="text-xs font-black text-navy-900 leading-snug group-hover:text-brand-600 transition-colors tracking-tight">
                        {order.items?.[0]?.name || order.items?.[0]?.productName || "Order Item"}
                        {order.items && order.items.length > 1 && ` + ${order.items.length - 1} more items`}
                      </h3>
                      <p className="text-[11px] text-slate-400 mt-0.5">Order ID: <strong className="font-mono text-brand-700 font-extrabold">{formatShortId(order.id || order.orderNumber, "ORD")}</strong></p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                    <div className="text-left sm:text-right">
                      <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Total Amount</p>
                      <p className="text-base font-black text-navy-900 tabular-nums">₹{displayTotal.toLocaleString("en-IN")}</p>
                    </div>
                    <span className="text-xs font-bold text-brand-600 bg-brand-50 border border-brand-200 px-3.5 py-2 rounded-xl group-hover:bg-brand-500 group-hover:text-white transition-colors shrink-0 shadow-2xs">
                      View Details →
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}