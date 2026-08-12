import { Link, useNavigate } from "react-router-dom";
import Navbar from "../../components/Navbar";
import BottomNav from "../../components/BottomNav";
import { useCart } from "../../context/CartContext";

export default function Cart() {
  const { items, updateQty, removeItem, subtotal, mrpTotal } = useCart();
  const navigate = useNavigate();

  const discount = mrpTotal - subtotal;
  const deliveryCharge = subtotal >= 999 || items.length === 0 ? 0 : 49;
  const total = subtotal + deliveryCharge;

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-surface pb-20">
        <Navbar />
        <main className="max-w-lg mx-auto px-4 py-20 text-center">
          <span className="text-5xl mb-4 inline-block">🛒</span>
          <h1 className="text-xl font-bold text-navy-900 mb-2">
            Your cart is empty
          </h1>
          <p className="text-sm text-slate-500 mb-6">
            Products add karo aur yahan wapas aao checkout karne ke liye.
          </p>
          <Link
            to="/"
            className="inline-block bg-brand-500 text-white text-sm font-semibold rounded-xl px-6 py-3"
          >
            Start Shopping
          </Link>
        </main>
       
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface pb-20">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-xl font-bold text-navy-900">
            My Cart ({items.length} items)
          </h1>
          {deliveryCharge === 0 && (
            <span className="text-xs font-medium text-success bg-green-50 px-2.5 py-1 rounded-full">
              🚚 You are getting FREE delivery
            </span>
          )}
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Items */}
          <div className="md:col-span-2 space-y-3">
            {items.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-xl border border-slate-200 p-3 flex gap-3"
              >
                <Link
                  to={`/product/${item.id}`}
                  className="h-20 w-20 shrink-0 rounded-lg overflow-hidden bg-slate-100"
                >
                  <img
                    src={item.img}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                </Link>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <Link
                        to={`/product/${item.id}`}
                        className="text-sm font-medium text-navy-900 line-clamp-1 hover:text-brand-500"
                      >
                        {item.name}
                      </Link>
                      <p className="text-xs text-slate-400">
                        Brand: {item.brand}
                      </p>
                    </div>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="text-slate-400 hover:text-red-500 shrink-0"
                    >
                      <TrashIcon />
                    </button>
                  </div>

                  <div className="flex items-end justify-between mt-2">
                    <div className="flex items-center border border-slate-200 rounded-lg">
                      <button
                        onClick={() => updateQty(item.id, item.qty - 1)}
                        className="px-2.5 py-1 text-slate-500 text-sm"
                      >
                        −
                      </button>
                      <span className="px-3 text-sm font-medium">
                        {item.qty}
                      </span>
                      <button
                        onClick={() => updateQty(item.id, item.qty + 1)}
                        className="px-2.5 py-1 text-slate-500 text-sm"
                      >
                        +
                      </button>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-navy-900">
                        ₹{(item.price * item.qty).toLocaleString("en-IN")}
                      </div>
                      {item.mrp > item.price && (
                        <div className="text-[11px] text-slate-400 line-through">
                          ₹{(item.mrp * item.qty).toLocaleString("en-IN")}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Price summary Yaha Banaya hai */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 h-fit sm:sticky sm:top-20">
            <h3 className="text-sm font-bold text-navy-900 mb-3">
              Price Details
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-slate-500">
                <span>Total MRP</span>
                <span>₹{mrpTotal.toLocaleString("en-IN")}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-success">
                  <span>Discount on MRP</span>
                  <span>− ₹{discount.toLocaleString("en-IN")}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-500">
                <span>Delivery Charges</span>
                <span className={deliveryCharge === 0 ? "text-success" : ""}>
                  {deliveryCharge === 0 ? "FREE" : `₹${deliveryCharge}`}
                </span>
              </div>
              <div className="h-px bg-slate-100 my-2" />
              <div className="flex justify-between text-base font-bold text-navy-900">
                <span>Total Amount</span>
                <span>₹{total.toLocaleString("en-IN")}</span>
              </div>
            </div>

            <button
              onClick={() => navigate("/checkout")}
              className="w-full mt-4 bg-brand-500 text-white text-sm font-semibold rounded-xl py-3 flex items-center justify-center gap-2 hover:bg-brand-600"
            >
              Proceed to Checkout →
            </button>
          </div>
        </div>
      </main>

    
    </div>
  );
}

function TrashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6h16Z" />
    </svg>
  );
}