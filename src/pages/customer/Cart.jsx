import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "../../components/Navbar";
import { useCart } from "../../context/CartContext";

const AVAILABLE_COUPONS = [
  { code: "BUILDCITY100", title: "Flat ₹100 OFF", minOrder: 1000, discountAmount: 100, desc: "Valid on orders above ₹1,000" },
  { code: "SUPER500", title: "Flat ₹500 OFF", minOrder: 5000, discountAmount: 500, desc: "Bulk order discount above ₹5,000" },
  { code: "WELCOME200", title: "Flat ₹200 OFF", minOrder: 1500, discountAmount: 200, desc: "Special welcome coupon for new site orders" },
];

export default function Cart() {
  const { items, updateQty, removeItem, subtotal, mrpTotal } = useCart();
  const navigate = useNavigate();

  // Coupon State
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponError, setCouponError] = useState("");
  const [showCouponsModal, setShowCouponsModal] = useState(false);

  const handleApplyCoupon = (codeToApply) => {
    const targetCode = (codeToApply || couponCode).trim().toUpperCase();
    setCouponError("");

    const matched = AVAILABLE_COUPONS.find((c) => c.code === targetCode);
    if (!matched) {
      setCouponError("Invalid Coupon Code! Try BUILDCITY100 or SUPER500.");
      return;
    }

    if (subtotal < matched.minOrder) {
      setCouponError(`Minimum order value ₹${matched.minOrder.toLocaleString()} required for ${matched.code}.`);
      return;
    }

    setAppliedCoupon(matched);
    setCouponCode(matched.code);
    setShowCouponsModal(false);
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode("");
    setCouponError("");
  };

  const mrpDiscount = mrpTotal - subtotal;
  const couponDiscount = appliedCoupon ? appliedCoupon.discountAmount : 0;
  const deliveryCharge = subtotal >= 999 || items.length === 0 ? 0 : 49;
  const total = Math.max(0, subtotal - couponDiscount + deliveryCharge);

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 text-navy-900 pb-20">
        <Navbar />
        <main className="max-w-lg mx-auto px-4 py-20 text-center">
          <span className="text-5xl mb-3 inline-block">🛒</span>
          <h1 className="text-xl font-extrabold text-navy-900 mb-2">Your Cart is Empty</h1>
          <p className="text-xs text-slate-500 mb-6">
            Building materials & supplies add karein aur yahan wapas aayein checkout ke liye.
          </p>
          <Link
            to="/"
            className="inline-block bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold rounded-xl px-6 py-3 shadow-xs transition-colors"
          >
            Start Shopping Building Materials
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-navy-900 pb-24 font-sans">
      <Navbar />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-xl font-black text-navy-900 tracking-tight">Shopping Cart ({items.length} Items)</h1>
            <p className="text-xs text-slate-500">Verified building products from district suppliers</p>
          </div>
          {deliveryCharge === 0 && (
            <span className="text-xs font-extrabold text-green-700 bg-green-50 px-3 py-1 rounded-full border border-green-200">
              🚚 FREE District Delivery Applied
            </span>
          )}
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Cart Items List */}
          <div className="md:col-span-2 space-y-3">
            {items.map((item) => (
              <div key={item.id} className="bg-white rounded-2xl border border-slate-200 p-4 flex gap-4 shadow-xs">
                <Link to={`/product/${item.id}`} className="h-20 w-20 shrink-0 rounded-xl overflow-hidden bg-slate-100 border border-slate-100">
                  <img src={item.img} alt={item.name} className="w-full h-full object-cover" />
                </Link>

                <div className="flex-1 min-w-0 flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <Link to={`/product/${item.id}`} className="text-xs font-extrabold text-navy-900 line-clamp-1 hover:text-brand-600 transition-colors">
                        {item.name}
                      </Link>
                      <button onClick={() => removeItem(item.id)} className="text-slate-400 hover:text-red-500 shrink-0 transition-colors cursor-pointer">
                        <TrashIcon />
                      </button>
                    </div>
                    {item.brand && <p className="text-[11px] font-semibold text-slate-500 mt-0.5">🏷️ {item.brand}</p>}
                  </div>

                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center border border-slate-200 rounded-xl bg-slate-50 p-1">
                      <button onClick={() => updateQty(item.id, item.qty - 1)} className="w-7 h-7 font-bold text-slate-600 hover:bg-white rounded-lg flex items-center justify-center transition-colors cursor-pointer">
                        -
                      </button>
                      <span className="w-8 text-center text-xs font-bold text-navy-900">{item.qty}</span>
                      <button onClick={() => updateQty(item.id, item.qty + 1)} className="w-7 h-7 font-bold text-slate-600 hover:bg-white rounded-lg flex items-center justify-center transition-colors cursor-pointer">
                        +
                      </button>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-navy-900">₹{(item.price * item.qty).toLocaleString("en-IN")}</p>
                      {item.mrp > item.price && <p className="text-[10px] text-slate-400 line-through">₹{(item.mrp * item.qty).toLocaleString("en-IN")}</p>}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Right Sidebar: Coupon Code Section & Price Details hai ye  */}
          <div className="space-y-4">
            
            {/* 🏷️ COUPON CODE SECTION */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-navy-900 flex items-center gap-1.5">
                  🏷️ Apply Coupon Code
                </span>
                <button
                  onClick={() => setShowCouponsModal((v) => !v)}
                  className="text-[11px] font-bold text-brand-600 hover:underline cursor-pointer"
                >
                  View Offers ({AVAILABLE_COUPONS.length})
                </button>
              </div>

              {appliedCoupon ? (
                <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-black text-green-800">✓ {appliedCoupon.code} APPLIED</span>
                    <p className="text-[10px] text-green-700 mt-0.5">Saved ₹{appliedCoupon.discountAmount} on this order!</p>
                  </div>
                  <button onClick={handleRemoveCoupon} className="text-xs font-bold text-red-600 hover:underline cursor-pointer">
                    Remove
                  </button>
                </div>
              ) : (
                <form onSubmit={(e) => { e.preventDefault(); handleApplyCoupon(); }} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    placeholder="Enter Code (e.g. BUILDCITY100)"
                    className="flex-1 bg-slate-50 text-xs font-bold border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-brand-500 uppercase placeholder:normal-case"
                  />
                  <button
                    type="submit"
                    className="bg-navy-900 hover:bg-navy-800 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-xs transition-colors cursor-pointer shrink-0"
                  >
                    Apply
                  </button>
                </form>
              )}

              {couponError && <p className="text-[11px] font-bold text-red-600">{couponError}</p>}

              {/* Quick Click Coupon lag jaye  */}
              {!appliedCoupon && (
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  {AVAILABLE_COUPONS.map((c) => (
                    <button
                      key={c.code}
                      onClick={() => handleApplyCoupon(c.code)}
                      className="bg-brand-50 hover:bg-brand-100 text-brand-700 border border-brand-200 text-[10px] font-extrabold px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                    >
                      🏷️ {c.code} (Save ₹{c.discountAmount})
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* PRICE SUMMARY DETAILS */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs sticky top-20 space-y-3">
              <h3 className="text-xs font-extrabold text-navy-900 uppercase tracking-wider border-b border-slate-100 pb-2">
                Order Price Details
              </h3>
              
              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-slate-600 font-medium">
                  <span>Total MRP</span>
                  <span>₹{mrpTotal.toLocaleString("en-IN")}</span>
                </div>

                {mrpDiscount > 0 && (
                  <div className="flex justify-between text-green-700 font-semibold">
                    <span>Discount on MRP</span>
                    <span>- ₹{mrpDiscount.toLocaleString("en-IN")}</span>
                  </div>
                )}

                {appliedCoupon && (
                  <div className="flex justify-between text-brand-600 font-bold">
                    <span>Coupon ({appliedCoupon.code})</span>
                    <span>- ₹{appliedCoupon.discountAmount}</span>
                  </div>
                )}

                <div className="flex justify-between text-slate-600 font-medium">
                  <span>District Delivery Fee</span>
                  <span className={deliveryCharge === 0 ? "text-green-700 font-bold" : ""}>
                    {deliveryCharge === 0 ? "FREE" : `₹${deliveryCharge}`}
                  </span>
                </div>

                <div className="border-t border-slate-100 pt-2 flex justify-between text-sm font-black text-navy-900">
                  <span>Total Amount</span>
                  <span>₹{total.toLocaleString("en-IN")}</span>
                </div>
              </div>

              {appliedCoupon && (
                <div className="bg-brand-50 text-brand-700 text-[11px] font-bold p-2 rounded-xl text-center border border-brand-200">
                  🎉 Total Savings: ₹{(mrpDiscount + appliedCoupon.discountAmount).toLocaleString("en-IN")}
                </div>
              )}

              <button
                onClick={() => navigate("/checkout")}
                className="w-full bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold rounded-xl py-3 shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                Proceed to Checkout →
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* OFFERS MODAL */}
      {showCouponsModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="font-extrabold text-navy-900 text-sm">Available Promo Coupons</h3>
              <button onClick={() => setShowCouponsModal(false)} className="text-slate-400 hover:text-navy-900 text-base">✕</button>
            </div>

            <div className="space-y-3 max-h-80 overflow-y-auto">
              {AVAILABLE_COUPONS.map((c) => (
                <div key={c.code} className="border border-slate-200 rounded-xl p-3 flex items-center justify-between hover:border-brand-500 transition-colors">
                  <div>
                    <span className="bg-navy-900 text-white text-[10px] font-black px-2 py-0.5 rounded">
                      {c.code}
                    </span>
                    <p className="text-xs font-bold text-navy-900 mt-1">{c.title}</p>
                    <p className="text-[10px] text-slate-500">{c.desc}</p>
                  </div>

                  <button
                    onClick={() => handleApplyCoupon(c.code)}
                    className="bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs px-3 py-1.5 rounded-lg cursor-pointer shrink-0"
                  >
                    Apply Code
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
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