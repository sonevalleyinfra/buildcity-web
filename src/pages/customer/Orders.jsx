import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCart } from "../../context/CartContext";
import { useOrders } from "../../context/OrderContext";
import Navbar from "../../components/Navbar";
import RegionPicker from "../../components/RegionPicker";
import NotificationPanel from "../../components/NotificationPanel";

const TABS = ["All", "Pending", "Shipped", "Delivered", "Cancelled"];

const STATUS_STYLE = {
  Pending: "bg-amber-100 text-amber-700",
  Confirmed: "bg-blue-100 text-blue-700",
  Shipped: "bg-blue-100 text-blue-700",
  Delivered: "bg-green-100 text-green-700",
  Cancelled: "bg-red-100 text-red-700",
  Rejected: "bg-red-100 text-red-700",
};

export default function Orders() {
  const navigate = useNavigate();
  const { count } = useCart();
  const { orders } = useOrders();
  const [tab, setTab] = useState("All");

  const filtered = tab === "All" ? orders : orders.filter((o) => o.status === tab);

  return (
    <div className="min-h-screen bg-slate-50 pb-20 font-sans">
      {/* Desktop header — shared Navbar */}
      <div className="hidden lg:block">
        <Navbar />
      </div>

      {/* Mobile header — custom */}
      <div className="lg:hidden bg-white px-4 py-3 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-xl">🏗️</span>
            <div className="leading-none">
              <span className="font-extrabold text-navy-900 text-lg">Build <span className="text-brand-500">City</span></span>
            
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4 text-navy-900">
          <NotificationPanel className="relative text-navy-900" />
          
          <Link to="/cart" className="relative">
            <CartIcon />
            {count > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-brand-500 text-white text-[9px] font-bold h-4 w-4 rounded-full flex items-center justify-center">
                {count}
              </span>
            )}
          </Link>
        </div>
      </div>

      <main className="px-4 py-4 space-y-5">
        <h1 className="text-2xl font-bold text-navy-900">My Orders</h1>

        {/* Tabs */}
        <div className="flex gap-6 overflow-x-auto border-b border-slate-200 text-sm whitespace-nowrap">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`pb-2 ${
                tab === t
                  ? "text-brand-500 font-bold border-b-2 border-brand-500"
                  : "text-slate-500 font-medium"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          /* Empty State */
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-sm">
            <div className="w-48 h-32 mx-auto bg-blue-50 rounded-xl mb-4 flex items-center justify-center relative overflow-hidden">
              <div className="absolute w-20 h-20 bg-blue-500 rounded-md rotate-12 opacity-80" />
              <div className="absolute w-24 h-28 bg-white rounded-md shadow-sm border border-slate-200 flex flex-col p-2 gap-2">
                <div className="h-2 w-12 bg-slate-200 rounded" />
                <div className="flex gap-2 items-center"><div className="h-3 w-3 rounded-full bg-blue-500" /><div className="h-1.5 w-10 bg-slate-200 rounded" /></div>
                <div className="flex gap-2 items-center"><div className="h-3 w-3 rounded-full bg-blue-500" /><div className="h-1.5 w-10 bg-slate-200 rounded" /></div>
              </div>
            </div>
            <h2 className="text-lg font-bold text-navy-900 mb-1">No Orders Yet!</h2>
            <p className="text-sm text-slate-500 mb-5">
              Looks like you haven&apos;t placed any orders.<br />Let&apos;s start shopping.
            </p>
            <Link
              to="/"
              className="inline-block bg-brand-500 text-white font-semibold text-sm px-6 py-2.5 rounded-xl"
            >
              Start Shopping
            </Link>
          </div>
        ) : (
          /* Real Orders List */
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold text-navy-900">
                {tab === "All" ? "Recent Orders" : `${tab} Orders`}
              </h2>
              <span className="text-slate-400 text-xs">{filtered.length} orders</span>
            </div>

            <div className="space-y-3">
              {filtered.map((order) => (
                <Link
                  key={order.id}
                  to={`/orders/${order.id}`}
                  className="bg-white rounded-xl border border-slate-200 p-3.5 flex gap-3 shadow-sm block"
                >
                  <div className="w-20 h-20 bg-slate-100 rounded-lg overflow-hidden shrink-0 border border-slate-100 p-1">
                    <img
                      src={order.items[0]?.img}
                      alt={order.items[0]?.name}
                      className="w-full h-full object-contain mix-blend-multiply"
                    />
                  </div>
                  <div className="flex-1 flex flex-col justify-between min-w-0">
                    <div>
                      <div className="flex justify-between items-start mb-1">
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                            STATUS_STYLE[order.status] || "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {order.status}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {new Date(order.date).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                      <h3 className="text-sm font-semibold text-navy-900 leading-tight line-clamp-1">
                        {order.items[0]?.name}
                        {order.items.length > 1 && ` + ${order.items.length - 1} more`}
                      </h3>
                      <p className="text-[10px] text-slate-500 mt-0.5">Order ID: #{order.id}</p>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <div className="text-xs text-slate-600">
                        {order.items.reduce((s, i) => s + i.qty, 0)} Items &nbsp;•&nbsp;{" "}
                        <span className="font-semibold text-navy-900">
                          ₹{order.total.toLocaleString("en-IN")}
                        </span>
                      </div>
                      <span className="border border-brand-500 text-brand-500 text-xs font-semibold px-3 py-1.5 rounded-lg">
                        View Details
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

   
       {/* Need help banner */}
        <div className="relative overflow-hidden rounded-2xl bg-navy-900 px-5 py-5 flex items-center justify-between mb-4">
          <div className="absolute -bottom-8 -right-8 w-40 h-40 rounded-full bg-brand-500/20 blur-2xl" />
          <div className="relative z-10">
            <h3 className="text-white font-bold text-base mb-1">
              Need help with an order?
            </h3>
            <p className="text-white/60 text-xs mb-3 max-w-[220px]">
              Our support team is here for you, 24/7.
            </p>
            <button className="bg-white text-navy-900 text-xs font-semibold rounded-lg px-4 py-2">
              Contact Support →
            </button>
          </div>
          <span className="relative z-10 h-14 w-14 rounded-full bg-white/10 flex items-center justify-center text-2xl shrink-0">
            🎧
          </span>
        </div>

      </main>

    </div>
  );
}


function ChevronIcon() { return <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6" /></svg>; }
function PinIcon() { return <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></svg>; }
function SearchIcon() { return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>; }
function CartIcon() { return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" /><path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6" /></svg>; }