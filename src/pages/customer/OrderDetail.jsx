import { useParams, Link, Navigate } from "react-router-dom";
import Navbar from "../../components/Navbar";
import BottomNav from "../../components/BottomNav";
import { useOrders } from "../../context/OrderContext";
import { formatShortId } from "../../utils/formatId";

const STATUS_MAP = {
  PENDING: { label: "Pending", color: "bg-amber-50 text-amber-700 border-amber-200" },
  PROCESSING: { label: "Processing", color: "bg-blue-50 text-blue-700 border-blue-200" },
  CONFIRMED: { label: "Confirmed", color: "bg-blue-50 text-blue-700 border-blue-200" },
  SHIPPED: { label: "Shipped", color: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  OUT_FOR_DELIVERY: { label: "Out for Delivery", color: "bg-purple-50 text-purple-700 border-purple-200" },
  DELIVERED: { label: "Delivered", color: "bg-green-50 text-green-700 border-green-200" },
  CANCELLED: { label: "Cancelled", color: "bg-red-50 text-red-600 border-red-200" },
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

  if (!order) return <Navigate to="/orders" replace />;

  const rawStatus = (order.status || "PENDING").toUpperCase();
  const statusInfo = STATUS_MAP[rawStatus] || STATUS_MAP.PENDING;

  let currentStepIndex = STEP_FLOW.findIndex((s) => s.id === rawStatus);
  if (currentStepIndex === -1) {
    if (rawStatus === "CONFIRMED") currentStepIndex = 1;
    else if (rawStatus === "SHIPPED") currentStepIndex = 2;
    else currentStepIndex = 0;
  }

  const orderDateStr = order.date || order.createdAt || new Date().toISOString();
  const displayTotal = Number(order.total || order.totalAmount || 0);

  return (
    <div className="min-h-screen bg-surface pb-20 font-sans">
      <Navbar />

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-6">
        <Link to="/orders" className="text-sm text-brand-500 hover:underline mb-3 inline-block font-bold">
          ← Back to Orders
        </Link>

        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-5 shadow-2xs">
          <div className="flex items-center justify-between mb-1">
            <h1 className="text-lg font-bold text-navy-900 flex items-center gap-2">
              Order {formatShortId(order.id, "ORD")}
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${statusInfo.color}`}>
                {statusInfo.label}
              </span>
            </h1>
            <span className="text-xs text-slate-400 font-medium">
              {new Date(orderDateStr).toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </span>
          </div>
          <p className="text-sm text-slate-500">
            Deliver to: {order.address?.line || order.address?.street || "Varanasi"}, {order.address?.city || "Uttar Pradesh"}
          </p>
        </div>

        {/* Live Delivery Status Progress Tracker */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 mb-5 shadow-2xs">
          <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-4">Live Order Progress</h3>
          <div className="flex items-center">
            {STEP_FLOW.map((step, i) => (
              <div key={step.id} className="flex-1 flex items-center last:flex-none">
                <div className="flex flex-col items-center gap-1.5">
                  <div
                    className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold ${
                      i <= currentStepIndex
                        ? "bg-brand-500 text-white shadow-2xs"
                        : "bg-slate-100 text-slate-400"
                    }`}
                  >
                    {i < currentStepIndex ? "✓" : i + 1}
                  </div>
                  <span
                    className={`text-[10px] text-center ${
                      i <= currentStepIndex ? "text-navy-900 font-extrabold" : "text-slate-400"
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
                {i < STEP_FLOW.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-1 mb-4 ${
                      i < currentStepIndex ? "bg-brand-500" : "bg-slate-100"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Items list */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-5 shadow-2xs">
          <h3 className="text-sm font-bold text-navy-900 mb-3">Ordered Items</h3>
          <div className="space-y-3">
            {(order.items || []).map((item, idx) => {
              const itemName = item.productName || item.name || "Material Item";
              const itemQty = Number(item.quantity || item.qty || 1);
              const itemPrice = Number(item.priceAtPurchase || item.unitPrice || item.price || 100);
              const itemImg = item.imageUrl || item.img || "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=400&q=80";
              const itemTotal = item.totalPrice ? Number(item.totalPrice) : itemQty * itemPrice;

              return (
                <div key={item.id || idx} className="flex gap-3 items-center">
                  <img
                    src={itemImg}
                    alt={itemName}
                    className="h-14 w-14 rounded-lg object-cover shrink-0 border border-slate-200"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-navy-900 font-semibold line-clamp-1">
                      {itemName}
                    </p>
                    <p className="text-xs text-slate-400">
                      Qty: {itemQty} × ₹{itemPrice}
                    </p>
                  </div>
                  <span className="text-sm font-bold text-navy-900">
                    ₹{itemTotal.toLocaleString("en-IN")}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="h-px bg-slate-100 my-3" />
          <div className="flex justify-between text-base font-black text-navy-900">
            <span>Total Amount</span>
            <span>₹{displayTotal.toLocaleString("en-IN")}</span>
          </div>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}