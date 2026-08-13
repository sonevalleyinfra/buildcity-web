import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import Navbar from "../../components/Navbar";
import { useCart } from "../../context/CartContext";
import { useOrders } from "../../context/OrderContext";

const savedAddresses = [
  {
    id: "addr1",
    label: "Home",
    line: "House No. 12, Lanka Road, Near BHU Gate",
    city: "Varanasi, Uttar Pradesh - 221005",
  },
  {
    id: "addr2",
    label: "Work",
    line: "Shop No. 4, Godowlia Market",
    city: "Varanasi, Uttar Pradesh - 221001",
  },
];

export default function Checkout() {
  const { items, subtotal, mrpTotal, clearCart } = useCart();
  const { placeOrder } = useOrders();
  const navigate = useNavigate();

  const [selectedAddr, setSelectedAddr] = useState(savedAddresses[0].id);
  const [payment, setPayment] = useState("cod");
  const [placing, setPlacing] = useState(false);

  if (items.length === 0) {
    return <Navigate to="/cart" replace />;
  }

  const deliveryCharge = subtotal >= 999 ? 0 : 49;
  const total = subtotal + deliveryCharge;
  const address = savedAddresses.find((a) => a.id === selectedAddr);

  const handlePlaceOrder = () => {
    setPlacing(true);
    // Yad Rakhna : replace with POST /api/v1/orders once backend is ready
    setTimeout(() => {
      const order = placeOrder({
        items,
        address,
        total,
      });
      clearCart();
      setPlacing(false);
      navigate(`/orders/${order.id}`, { replace: true });
    }, 900);
  };

  return (
    <div className="min-h-screen bg-surface pb-16">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        <h1 className="text-xl font-bold text-navy-900 mb-5">Checkout</h1>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-5">
            {/* Address ka hai  */}
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <h3 className="text-sm font-bold text-navy-900 mb-3">
                Delivery Address
              </h3>
              <div className="space-y-2.5">
                {savedAddresses.map((a) => (
                  <label
                    key={a.id}
                    className={`flex items-start gap-3 border rounded-lg p-3 cursor-pointer ${
                      selectedAddr === a.id
                        ? "border-brand-500 bg-brand-50"
                        : "border-slate-200"
                    }`}
                  >
                    <input
                      type="radio"
                      name="address"
                      checked={selectedAddr === a.id}
                      onChange={() => setSelectedAddr(a.id)}
                      className="mt-1 h-4 w-4 accent-[#1E5FD9]"
                    />
                    <div>
                      <span className="text-sm font-semibold text-navy-900">
                        {a.label}
                      </span>
                      <p className="text-sm text-slate-500">{a.line}</p>
                      <p className="text-sm text-slate-500">{a.city}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Payment ka hai  */}
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <h3 className="text-sm font-bold text-navy-900 mb-3">
                Payment Method
              </h3>
              <div className="space-y-2.5">
                {[
                  { id: "cod", label: "Cash on Delivery" },
                  { id: "upi", label: "UPI (GPay / PhonePe / Paytm)" },
                  { id: "card", label: "Credit / Debit Card" },
                ].map((p) => (
                  <label
                    key={p.id}
                    className={`flex items-center gap-3 border rounded-lg p-3 cursor-pointer ${
                      payment === p.id
                        ? "border-brand-500 bg-brand-50"
                        : "border-slate-200"
                    }`}
                  >
                    <input
                      type="radio"
                      name="payment"
                      checked={payment === p.id}
                      onChange={() => setPayment(p.id)}
                      className="h-4 w-4 accent-[#1E5FD9]"
                    />
                    <span className="text-sm font-medium text-navy-900">
                      {p.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Items */}
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <h3 className="text-sm font-bold text-navy-900 mb-3">
                Order Items ({items.length})
              </h3>
              <div className="space-y-3">
                {items.map((item) => (
                  <div key={item.id} className="flex gap-3 items-center">
                    <img
                      src={item.img}
                      alt={item.name}
                      className="h-12 w-12 rounded-lg object-cover shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-navy-900 line-clamp-1">
                        {item.name}
                      </p>
                      <p className="text-xs text-slate-400">Qty: {item.qty}</p>
                    </div>
                    <span className="text-sm font-semibold text-navy-900">
                      ₹{(item.price * item.qty).toLocaleString("en-IN")}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 h-fit sm:sticky sm:top-20">
            <h3 className="text-sm font-bold text-navy-900 mb-3">
              Order Summary
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-slate-500">
                <span>Total MRP</span>
                <span>₹{mrpTotal.toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between text-success">
                <span>Discount</span>
                <span>− ₹{(mrpTotal - subtotal).toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Delivery</span>
                <span className={deliveryCharge === 0 ? "text-success" : ""}>
                  {deliveryCharge === 0 ? "FREE" : `₹${deliveryCharge}`}
                </span>
              </div>
              <div className="h-px bg-slate-100 my-2" />
              <div className="flex justify-between text-base font-bold text-navy-900">
                <span>Total</span>
                <span>₹{total.toLocaleString("en-IN")}</span>
              </div>
            </div>

            <button
              onClick={handlePlaceOrder}
              disabled={placing}
              className="w-full mt-4 bg-brand-500 text-white text-sm font-semibold rounded-xl py-3 disabled:opacity-60"
            >
              {placing ? "Placing Order..." : "Place Order"}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}