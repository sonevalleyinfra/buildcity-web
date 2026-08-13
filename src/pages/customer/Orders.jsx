import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCart } from "../../context/CartContext";
import { useOrders } from "../../context/OrderContext";
import Navbar from "../../components/Navbar";
import RegionPicker from "../../components/RegionPicker";
import NotificationPanel from "../../components/NotificationPanel";

const TABS = ["All", "Pending", "Shipped", "Delivered", "Cancelled"];

const STATUS_STYLE = {
  Pending: "bg-amber-50 text-amber-700 border-amber-200",
  Confirmed: "bg-blue-50 text-blue-700 border-blue-200",
  Shipped: "bg-blue-50 text-blue-700 border-blue-200",
  Delivered: "bg-green-50 text-green-700 border-green-200",
  Cancelled: "bg-red-50 text-red-700 border-red-200",
  Rejected: "bg-red-50 text-red-700 border-red-200",
};

export default function Orders() {
  const navigate = useNavigate();
  const { count } = useCart();
  const { orders } = useOrders();
  const [tab, setTab] = useState("All");

  const filtered = tab === "All" ? orders : orders.filter((o) => o.status === tab);

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
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-black text-navy-900 tracking-tight">My District Orders</h1>
            <p className="text-xs text-slate-500">Track delivery status, view invoices & order history</p>
          </div>

          {/* Filter Tabs Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {TABS.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`text-xs font-bold px-3.5 py-1.5 rounded-xl border transition-all cursor-pointer whitespace-nowrap ${
                  tab === t
                    ? "bg-navy-900 text-white border-navy-900 shadow-xs"
                    : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          /* Empty State */
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-xs">
            <div className="w-20 h-20 mx-auto bg-brand-50 rounded-2xl mb-3 flex items-center justify-center text-3xl">
              📦
            </div>
            <h2 className="text-base font-black text-navy-900 mb-1">No Orders Found</h2>
            <p className="text-xs text-slate-500 mb-5 max-w-sm mx-auto">
              Aapne abhi tak koi order place nahi kiya hai. Apni requirement ke mutabiq building materials search karein.
            </p>
            <Link
              to="/"
              className="inline-block bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs px-6 py-3 rounded-xl shadow-xs transition-colors"
            >
              Start Shopping Building Materials
            </Link>
          </div>
        ) : (
          /* Real Orders List */
          <div className="space-y-4">
            {filtered.map((order) => (
              <Link
                key={order.id}
                to={`/orders/${order.id}`}
                className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs hover:shadow-md hover:border-brand-500 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 block group"
              >
                <div className="flex items-center gap-4 flex-1">
                  <img
                    src={order.items[0]?.img || "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=150&q=80"}
                    alt={order.items[0]?.name}
                    className="w-16 h-16 rounded-xl object-cover border border-slate-100 shrink-0"
                  />
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                          STATUS_STYLE[order.status] || "bg-slate-100 text-slate-600 border-slate-200"
                        }`}
                      >
                        {order.status}
                      </span>
                      <span className="text-[11px] text-slate-400 font-medium">
                        {new Date(order.date).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </div>

                    <h3 className="text-xs font-extrabold text-navy-900 leading-snug group-hover:text-brand-600 transition-colors">
                      {order.items[0]?.name}
                      {order.items.length > 1 && ` + ${order.items.length - 1} more items`}
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">Order ID: <strong>#{order.id}</strong></p>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                  <div className="text-left sm:text-right">
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Total Amount</p>
                    <p className="text-base font-black text-navy-900">₹{order.total.toLocaleString("en-IN")}</p>
                  </div>
                  <span className="text-xs font-bold text-brand-600 bg-brand-50 border border-brand-200 px-3.5 py-2 rounded-xl group-hover:bg-brand-500 group-hover:text-white transition-colors shrink-0">
                    View Details →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Support Banner */}
        <div className="bg-navy-950 rounded-2xl p-5 text-white shadow-md border border-slate-800 flex items-center justify-between">
          <div>
            <span className="bg-amber-400 text-navy-950 text-[10px] font-extrabold px-2 py-0.5 rounded inline-block mb-1">
              24/7 DISTRICT SUPPORT
            </span>
            <h3 className="text-sm font-bold text-white">Need Help With Your Delivery?</h3>
            <p className="text-xs text-slate-300 mt-0.5">Call or WhatsApp our team for quick resolution on site unloading.</p>
          </div>
          <button className="bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs transition-colors shrink-0 cursor-pointer">
            Contact Support →
          </button>
        </div>
      </main>
    </div>
  );
}

function PinIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}
function CartIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="9" cy="21" r="1" />
      <circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6" />
    </svg>
  );
}