import { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useOrders } from "../../context/OrderContext";
import { useAuth } from "../../context/AuthContext";
import { useAdmin } from "../../context/AdminContext";
import Navbar from "../../components/Navbar";
import MobileHeader from "../../components/ui/MobileHeader";
import EmptyState from "../../components/ui/EmptyState";
import { ChevronRightIcon, PackageIcon, ReceiptIcon } from "../../components/ui/Icons";
import { formatShortId, formatDateTimeIST } from "../../utils/formatId";
import { cleanProductImage } from "../../utils/productImage";
import LoadMoreButton from "../../components/LoadMoreButton";

const TABS = ["All", "Pending", "Processing", "Out for Delivery", "Delivered", "Cancelled"];

const STATUS_MAP = {
  PENDING: { label: "Pending", color: "bg-amber-50 text-amber-800 ring-amber-600/20", dot: "bg-amber-500" },
  PROCESSING: { label: "Processing", color: "bg-sky-50 text-sky-800 ring-sky-600/20", dot: "bg-sky-500" },
  CONFIRMED: { label: "Confirmed", color: "bg-sky-50 text-sky-800 ring-sky-600/20", dot: "bg-sky-500" },
  SHIPPED: { label: "Shipped", color: "bg-indigo-50 text-indigo-800 ring-indigo-600/20", dot: "bg-indigo-500" },
  OUT_FOR_DELIVERY: { label: "Out for Delivery", color: "bg-indigo-50 text-indigo-800 ring-indigo-600/20", dot: "bg-indigo-500" },
  DELIVERED: { label: "Delivered", color: "bg-emerald-50 text-emerald-800 ring-emerald-600/20", dot: "bg-emerald-500" },
  COMPLETED: { label: "Delivered", color: "bg-emerald-50 text-emerald-800 ring-emerald-600/20", dot: "bg-emerald-500" },
  CANCELLED: { label: "Cancelled", color: "bg-slate-100 text-slate-600 ring-slate-500/20", dot: "bg-slate-400" },
};

const ORDER_STEPS = ["PENDING", "PROCESSING", "OUT_FOR_DELIVERY", "DELIVERED"];



export default function Orders() {
  const navigate = useNavigate();
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

  const tabMatches = (o, t) => {
    const rawSt = (o.status || "PENDING").toUpperCase();
    const info = STATUS_MAP[rawSt] || STATUS_MAP.PENDING;
    return info.label.toLowerCase() === t.toLowerCase() || rawSt === t.toUpperCase();
  };
  const tabCount = (t) => (t === "All" ? customerOrders.length : customerOrders.filter((o) => tabMatches(o, t)).length);

  const filtered = tab === "All" ? customerOrders : customerOrders.filter((o) => {
    const rawSt = (o.status || "PENDING").toUpperCase();
    const info = STATUS_MAP[rawSt] || STATUS_MAP.PENDING;
    return info.label.toLowerCase() === tab.toLowerCase() || rawSt === tab.toUpperCase();
  });

  return (
    <div data-storefront className="min-h-screen bg-slate-50 text-navy-900 pb-24 lg:pb-12 font-sans w-full max-w-full overflow-x-clip">
      <div className="hidden lg:block">
        <Navbar />
      </div>
      <MobileHeader title="My orders" />

      <main className="bc-fade-in max-w-4xl mx-auto px-4 pt-4 sm:pt-6 space-y-4">
        <h1 className="hidden lg:block text-2xl font-semibold tracking-tight text-navy-950">My orders</h1>

        <div className="-mx-4 flex items-center gap-2 overflow-x-auto px-4 pb-1 no-scrollbar" role="tablist" aria-label="Filter orders by status">
          {TABS.map((t) => {
            const n = tabCount(t);
            const active = tab === t;
            return (
              <button
                key={t}
                role="tab"
                aria-selected={active}
                onClick={() => setTab(t)}
                className={`h-9 shrink-0 whitespace-nowrap rounded-full px-3.5 text-sm font-medium transition-colors cursor-pointer ${
                  active ? "bg-navy-950 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
                }`}
              >
                {t}
                {n > 0 && <span className={`ml-1.5 tabular-nums ${active ? "text-slate-300" : "text-slate-400"}`}>{n}</span>}
              </button>
            );
          })}
        </div>

        {/* Customer ke orders ki list */}
        {productsLoading ? (
          <div className="space-y-2.5" aria-busy="true" aria-label="Loading orders">
            {[1, 2, 3].map((n) => (
              <div key={n} className="bg-white rounded-2xl ring-1 ring-slate-200/80 p-4 flex items-center gap-4">
                <div className="bc-skeleton h-14 w-14 rounded-xl shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="bc-skeleton h-3.5 rounded w-24" />
                  <div className="bc-skeleton h-4 rounded w-3/5" />
                  <div className="bc-skeleton h-3 rounded w-2/5" />
                </div>
                <div className="bc-skeleton h-5 rounded w-16" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl ring-1 ring-slate-200/80">
            <EmptyState
              icon={ReceiptIcon}
              title={tab === "All" ? "No orders yet" : `No ${tab.toLowerCase()} orders`}
              description={
                tab === "All"
                  ? "Your cement, steel and other material orders will show up here."
                  : "Orders with this status will show up here."
              }
              actionLabel={tab === "All" ? "Browse materials" : "Show all orders"}
              onAction={() => (tab === "All" ? navigate("/categories") : setTab("All"))}
            />
          </div>
        ) : (
          <div className="space-y-2.5">
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

                const itemCount = order.items?.length || 0;
                return (
                  <Link
                    key={order.id}
                    to={`/orders/${order.id}`}
                    data-step={stepIndex}
                    className="group flex items-center gap-3 sm:gap-4 rounded-2xl bg-white p-3.5 sm:p-4 ring-1 ring-slate-200/80 transition-[box-shadow] duration-200 hover:ring-slate-300 hover:shadow-[0_12px_28px_-18px_rgba(15,23,42,0.4)]"
                  >
                    <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-white ring-1 ring-slate-100 flex items-center justify-center">
                      {firstItem ? (
                        <img
                          src={cleanProductImage(firstItem)}
                          alt=""
                          className="h-full w-full object-contain p-1"
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = cleanProductImage(null, firstItem?.categoryName || firstItem?.category, firstItem?.name || firstItem?.productName);
                          }}
                        />
                      ) : (
                        <PackageIcon className="h-6 w-6 text-slate-400" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${statusInfo.color}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${statusInfo.dot}`} aria-hidden="true" />
                          {statusInfo.label}
                        </span>
                        <span className="text-xs text-slate-500">{formatDateTimeIST(order.date || order.createdAt)}</span>
                      </div>
                      <h3 className="mt-1 truncate text-sm font-medium text-navy-950 sm:text-[15px]">
                        {firstItem?.name || firstItem?.productName || "Building materials"}
                        {itemCount > 1 && <span className="font-normal text-slate-500"> +{itemCount - 1} more</span>}
                      </h3>
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-slate-500">
                        <span className="font-mono">{formatShortId(order.id || order.orderNumber, "ORD")}</span>
                        {order.couponCode && <span>· Coupon {order.couponCode}</span>}
                        {Number(order.walletDiscount) > 0 && <span className="tabular-nums">· Wallet −₹{Number(order.walletDiscount).toLocaleString("en-IN")}</span>}
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-1 sm:gap-2">
                      <span className="text-[15px] font-semibold text-navy-950 tabular-nums sm:text-base">₹{displayTotal.toLocaleString("en-IN")}</span>
                      <ChevronRightIcon className="h-5 w-5 text-slate-400 transition-transform duration-200 group-hover:translate-x-0.5" />
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