import { useParams, Link, Navigate } from "react-router-dom";
import Navbar from "../../components/Navbar";
import BottomNav from "../../components/BottomNav";
import { useOrders } from "../../context/OrderContext";

const STEPS = ["Pending", "Confirmed", "Shipped", "Delivered"];

export default function OrderDetail() {
  const { id } = useParams();
  const { getOrder } = useOrders();
  const order = getOrder(id);

  if (!order) return <Navigate to="/orders" replace />;

  const currentStep = STEPS.indexOf(
    order.status === "Pending" ? "Pending" : order.status
  );

  return (
    <div className="min-h-screen bg-surface pb-20">
      <Navbar />

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-6">
        <Link to="/orders" className="text-sm text-brand-500 hover:underline mb-3 inline-block">
          ← Back to Orders
        </Link>

        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-5">
          <div className="flex items-center justify-between mb-1">
            <h1 className="text-lg font-bold text-navy-900">
              Order #{order.id}
            </h1>
            <span className="text-xs text-slate-400">
              {new Date(order.date).toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </span>
          </div>
          <p className="text-sm text-slate-500">
            Deliver to: {order.address?.line}, {order.address?.city}
          </p>
        </div>

        {/* Status  tracker */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 mb-5">
          <div className="flex items-center">
            {STEPS.map((step, i) => (
              <div key={step} className="flex-1 flex items-center last:flex-none">
                <div className="flex flex-col items-center gap-1.5">
                  <div
                    className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold ${
                      i <= currentStep
                        ? "bg-brand-500 text-white"
                        : "bg-slate-100 text-slate-400"
                    }`}
                  >
                    {i < currentStep ? "✓" : i + 1}
                  </div>
                  <span
                    className={`text-[10px] text-center ${
                      i <= currentStep ? "text-navy-900 font-medium" : "text-slate-400"
                    }`}
                  >
                    {step}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-1 mb-4 ${
                      i < currentStep ? "bg-brand-500" : "bg-slate-100"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Items Jo order details hai   */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-5">
          <h3 className="text-sm font-bold text-navy-900 mb-3">Items</h3>
          <div className="space-y-3">
            {order.items.map((item) => (
              <div key={item.id} className="flex gap-3 items-center">
                <img
                  src={item.img}
                  alt={item.name}
                  className="h-14 w-14 rounded-lg object-cover shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-navy-900 line-clamp-1">
                    {item.name}
                  </p>
                  <p className="text-xs text-slate-400">
                    Qty: {item.qty} × ₹{item.price}
                  </p>
                </div>
                <span className="text-sm font-semibold text-navy-900">
                  ₹{(item.price * item.qty).toLocaleString("en-IN")}
                </span>
              </div>
            ))}
          </div>
          <div className="h-px bg-slate-100 my-3" />
          <div className="flex justify-between text-base font-bold text-navy-900">
            <span>Total Paid</span>
            <span>₹{order.total.toLocaleString("en-IN")}</span>
          </div>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}