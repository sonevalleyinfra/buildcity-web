import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "../../components/Navbar";
import NotificationPanel from "../../components/NotificationPanel";
import { useCart } from "../../context/CartContext";
import { useAdmin } from "../../context/AdminContext";
import { useAlert } from "../../context/AlertContext";
import { useRegion } from "../../context/RegionContext";
import { useAuth } from "../../context/AuthContext";
import { API_BASE_URL } from "../../config/api";
import { authFetch } from "../../config/authFetch";

const AVAILABLE_COUPONS = [
  { code: "BUILDCITY100", title: "Flat ₹100 OFF", minOrder: 1000, discountAmount: 100, expiryDate: "2026-12-31", isActive: true, desc: "Valid on orders above ₹1,000" },
  { code: "SUPER500", title: "Flat ₹500 OFF", minOrder: 5000, discountAmount: 500, expiryDate: "2026-12-31", isActive: true, desc: "Bulk order discount above ₹5,000" },
  { code: "WELCOME200", title: "Flat ₹200 OFF", minOrder: 1500, discountAmount: 200, expiryDate: "2026-12-31", isActive: true, desc: "Special welcome coupon for new site orders" },
];

export default function Cart() {
  const { user } = useAuth();
  const { 
    items, 
    updateQty, 
    removeItem, 
    subtotal, 
    mrpTotal,
    hasRegionMismatch,
    cartRegionName,
    currentRegionName,
    updateCartToCurrentRegion,
    appliedCoupon,
    applyCoupon,
    removeCoupon,
  } = useCart();
  const { coupons: adminCoupons = [], products = [], vendors = [], walletSettings, fetchWalletSettings } = useAdmin();
  const { region } = useRegion();
  const { showAlert } = useAlert();
  const navigate = useNavigate();

  useEffect(() => {
    if (fetchWalletSettings) {
      fetchWalletSettings();
    }
  }, [fetchWalletSettings]);

  // Database se aane wale coupons ka state
  const [dbCoupons, setDbCoupons] = useState(adminCoupons);
  const [isUpdatingPrices, setIsUpdatingPrices] = useState(false);

  // Apply kiye gaye coupon ka state
  const [couponCode, setCouponCode] = useState(appliedCoupon?.code || "");
  const [couponError, setCouponError] = useState("");
  const [showCouponsModal, setShowCouponsModal] = useState(false);

  useEffect(() => {
    if (appliedCoupon?.code) {
      setCouponCode(appliedCoupon.code);
    }
  }, [appliedCoupon]);

  // Check kar rahe hain ki cart me koi suspended vendor ya out-of-stock item toh nahi hai
  const unavailableItemIds = useMemo(() => {
    const set = new Set();
    items.forEach((item) => {
      // Item pe direct suspension ya stock ka flag check
      if (item.isVendorSuspended === true || item.inStock === false) {
        set.add(item.id);
        return;
      }

      // Vendor suspend toh nahi hai uska check
      const matchedVendor = vendors.find(
        (v) => v.id === item.vendorId || (v.shopName && item.vendorName && v.shopName.toLowerCase() === item.vendorName.toLowerCase())
      );
      if (matchedVendor && matchedVendor.status === "SUSPENDED") {
        set.add(item.id);
        return;
      }

      // Catalog me product active aur in-stock hai ya nahi uska check
      const matchedProd = products.find(
        (p) =>
          p.id === item.id ||
          p.id === item.productId ||
          (p.name && item.name && p.name.toLowerCase() === item.name.toLowerCase() && (p.vendorId === item.vendorId || p.vendorName === item.vendorName))
      );

      if (matchedProd) {
        if (
          matchedProd.isVendorSuspended === true ||
          matchedProd.vendor?.status === "SUSPENDED" ||
          matchedProd.vendorStatus === "SUSPENDED" ||
          matchedProd.isActive === false ||
          (matchedProd.stockQty !== undefined && Number(matchedProd.stockQty) <= 0)
        ) {
          set.add(item.id);
        }
      }
    });
    return set;
  }, [items, products, vendors]);

  const hasUnavailableItems = unavailableItemIds.size > 0;

  const handleUpdateRegionPrices = async () => {
    setIsUpdatingPrices(true);
    try {
      const { updatedCount, removedItems } = await updateCartToCurrentRegion(products);
      if (removedItems && removedItems.length > 0) {
        showAlert({
          title: "📍 Region Availability Notice",
          message: `The following product(s) are not available in ${currentRegionName} and have been removed from your cart:\n\n• ${removedItems.join("\n• ")}`,
          type: "warning",
          buttonText: "Understood",
        });
      } else {
        showAlert({
          title: "✅ Region Sync Complete",
          message: `Cart prices and availability successfully updated for ${currentRegionName}!`,
          type: "success",
          buttonText: "Awesome",
        });
      }
    } catch (err) {
      showAlert({
        title: "❌ Update Failed",
        message: "Error updating region prices: " + (err.message || err),
        type: "error",
        buttonText: "Close",
      });
    } finally {
      setIsUpdatingPrices(false);
    }
  };

  const handleProceedToCheckout = async () => {
    if (hasUnavailableItems) {
      showAlert({
        title: "⚠️ Unavailable Items in Cart",
        message: "Your cart contains items that are currently unavailable. Please remove them using the trash icon (🗑️) to proceed to checkout.",
        type: "warning",
        buttonText: "Understood",
      });
      return;
    }

    if (hasRegionMismatch) {
      try {
        await updateCartToCurrentRegion(products);
      } catch (err) {
        console.warn("Auto region sync on checkout:", err.message);
      }
    }
    if (!user) {
      navigate("/login?redirect=/checkout");
      return;
    }
    navigate("/checkout");
  };

  // Coupons API se live data fetch aur window events listen karne ka hook
  useEffect(() => {
    let isMounted = true;

    const fetchLiveCoupons = async () => {
      try {
        const res = await authFetch(`${API_BASE_URL}/api/v1/coupons`);
        if (res.ok) {
          const data = await res.json();
          if (isMounted && Array.isArray(data) && data.length > 0) {
            setDbCoupons((prev) => (JSON.stringify(prev) === JSON.stringify(data) ? prev : data));
          }
        }
      } catch {}
    };

    fetchLiveCoupons();
    const interval = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        fetchLiveCoupons();
      }
    }, 300000);

    const onSync = () => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        fetchLiveCoupons();
      }
    };
    window.addEventListener("focus", onSync);
    window.addEventListener("visibilitychange", onSync);
    window.addEventListener("buildcity_coupons_updated", onSync);

    return () => {
      isMounted = false;
      clearInterval(interval);
      window.removeEventListener("focus", onSync);
      window.removeEventListener("visibilitychange", onSync);
      window.removeEventListener("buildcity_coupons_updated", onSync);
    };
  }, []);

  const rawCouponsList = dbCoupons.length > 0 ? dbCoupons : adminCoupons;
  const availableCouponsList = useMemo(() => {
    const list = rawCouponsList.length > 0 ? rawCouponsList : AVAILABLE_COUPONS;
    return list.map((c) => ({
      ...c,
      discountAmount: Number(c.discountAmount) || 0,
      minOrder: Number(c.minOrder) || 0,
    }));
  }, [rawCouponsList, adminCoupons]);

  const todayStr = new Date().toISOString().split("T")[0];
  const validCoupons = availableCouponsList.filter((c) => {
    const isExpired = c.expiryDate && c.expiryDate < todayStr;
    return c.isActive !== false && !isExpired;
  });
  const bestCoupon = validCoupons[0];

  const handleApplyCoupon = (codeToApply) => {
    const targetCode = (codeToApply || couponCode).trim().toUpperCase();
    setCouponError("");

    const matched = availableCouponsList.find((c) => c.code === targetCode);
    if (!matched) {
      setCouponError(`Invalid Coupon Code "${targetCode}". Please enter a valid code.`);
      return;
    }

    const isExpired = matched.expiryDate && matched.expiryDate < todayStr;

    if (matched.isActive === false || isExpired) {
      setCouponError(`Coupon code "${matched.code}" is expired or inactive.`);
      return;
    }

    if (subtotal < (Number(matched.minOrder) || 0)) {
      setCouponError(`Minimum order value ₹${Number(matched.minOrder || 0).toLocaleString("en-IN")} required for ${matched.code}.`);
      return;
    }

    applyCoupon({
      ...matched,
      discountAmount: Number(matched.discountAmount) || 0,
      minOrder: Number(matched.minOrder) || 0,
    });
    setCouponCode(matched.code);
    setShowCouponsModal(false);
  };

  const handleRemoveCoupon = () => {
    removeCoupon();
    setCouponCode("");
    setCouponError("");
  };

  const baseDeliveryFee = Number(region?.baseDeliveryCharge) || 49;
  const freeDeliveryThreshold = Number(walletSettings?.freeDeliveryMinAmount) || 25000;
  const isFreeDeliveryProgramActive = walletSettings?.freeDeliveryEnabled !== false;
  const isFreeDelivery = isFreeDeliveryProgramActive && subtotal >= freeDeliveryThreshold;
  const remainingForFreeDelivery = Math.max(0, freeDeliveryThreshold - subtotal);
  const freeDeliveryProgress = Math.min(100, Math.round((subtotal / freeDeliveryThreshold) * 100));
  const deliveryCharge = isFreeDelivery ? 0 : baseDeliveryFee;
  const couponDiscount = appliedCoupon ? Number(appliedCoupon.discountAmount) || 0 : 0;
  const total = Math.max(0, subtotal + deliveryCharge - couponDiscount);
  const mrpDiscount = Math.max(0, Number(mrpTotal || 0) - Number(subtotal || 0));
  const totalSavings = mrpDiscount + couponDiscount + (isFreeDelivery ? baseDeliveryFee : 0);

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 text-navy-900 pb-20 w-full max-w-full overflow-x-clip">
        {/* Desktop navbar */}
        <div className="hidden lg:block">
          <Navbar />
        </div>

        {/* Mobile header back navigation */}
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
              <h1 className="font-extrabold text-navy-900 text-base tracking-tight">Shopping Cart</h1>
            </div>
            <NotificationPanel className="relative text-navy-900 hover:text-brand-600 transition-colors cursor-pointer" />
          </div>
        </div>

        <main className="max-w-lg mx-auto px-4 py-20 text-center">
          <span className="text-5xl mb-3 inline-block">🛒</span>
          <h1 className="text-xl font-extrabold text-navy-900 mb-2">Your Cart is Empty</h1>
          
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
    <div className="min-h-screen bg-slate-50 text-navy-900 pb-40 md:pb-24 font-sans w-full max-w-full overflow-x-clip">
      {/* Desktop navbar */}
      <div className="hidden lg:block">
        <Navbar />
      </div>

      {/* Mobile header back navigation */}
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
            <h1 className="font-extrabold text-navy-900 text-base tracking-tight">
              My Cart ({items.length})
            </h1>
          </div>
          <NotificationPanel className="relative text-navy-900 hover:text-brand-600 transition-colors cursor-pointer" />
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-3.5 sm:px-6 py-4 sm:py-6 pb-28 md:pb-12 w-full min-w-0">
        {/* District delivery free hone par banner dikhao */}
        {deliveryCharge === 0 && (
          <div className="flex justify-end mb-4">
            <span className="text-xs font-extrabold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 shadow-2xs">
              FREE District Delivery Applied
            </span>
          </div>
        )}

        {/* Agar district badal gaya hai toh alert banner */}
        {hasRegionMismatch && (
          <div className="mb-5 bg-gradient-to-r from-amber-500/10 via-amber-500/15 to-orange-500/10 border border-amber-300/80 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center text-lg font-bold shrink-0 shadow-xs">
                📍
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-extrabold text-navy-950 text-sm tracking-tight">
                    District Region Changed to {currentRegionName}
                  </h4>
                  <span className="bg-amber-200/80 text-amber-900 text-[10px] font-extrabold px-2 py-0.5 rounded-md">
                    Action Required
                  </span>
                </div>
                <p className="text-xs font-bold text-amber-800 mt-1">
                  Cart items were added in <span className="underline font-black">{cartRegionName}</span>. Update prices to fetch live DB rates for {currentRegionName}.
                </p>
              </div>
            </div>
            <button
              disabled={isUpdatingPrices}
              onClick={handleUpdateRegionPrices}
              className="w-full sm:w-auto bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 active:scale-[0.98] text-white text-xs font-black px-4.5 py-2.5 rounded-xl shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 shrink-0 disabled:opacity-60"
            >
              {isUpdatingPrices ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Fetching DB Prices...</span>
                </>
              ) : (
                `🔄 Update Cart Prices to ${currentRegionName}`
              )}
            </button>
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-4 sm:gap-6 w-full min-w-0">
          {/* Cart me jitne items hain unki list */}
          <div className="md:col-span-2 space-y-3 sm:space-y-3.5 w-full min-w-0">
            {items.map((item) => {
              const isItemUnavailable = unavailableItemIds.has(item.id);
              const itemPrice = Number(item.price) || 0;
              const matchedProd = products.find(
                (p) =>
                  p.id === item.id ||
                  p.id === item.productId ||
                  (p.name && item.name && p.name.toLowerCase().trim() === item.name.toLowerCase().trim())
              );
              const rawMrp = Number(item.mrp || matchedProd?.mrp);
              const unitMrp = rawMrp > itemPrice ? rawMrp : Math.round(itemPrice * 1.2);
              const itemTotal = itemPrice * item.qty;
              const itemMrpTotal = unitMrp * item.qty;
              const itemSavings = itemMrpTotal - itemTotal;

              return (
                <div
                  key={item.id}
                  className={`bg-white rounded-2xl border p-3 sm:p-4 flex gap-3 sm:gap-4 shadow-xs transition-all w-full min-w-0 ${
                    isItemUnavailable ? "border-rose-300 bg-rose-50/25" : "border-slate-200/90 hover:border-slate-300"
                  }`}
                >
                  <Link to={`/product/${item.id}`} className="h-16 w-16 sm:h-20 sm:w-20 shrink-0 rounded-xl overflow-hidden bg-slate-100 border border-slate-100 relative">
                    <img src={item.img} alt={item.name} className={`w-full h-full object-cover ${isItemUnavailable ? "grayscale opacity-80" : ""}`} />
                    {isItemUnavailable && (
                      <span className="absolute inset-x-0 bottom-0 bg-rose-600 text-white text-[8px] font-black text-center py-0.5 uppercase tracking-wider">
                        Unavailable
                      </span>
                    )}
                  </Link>

                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-1.5 w-full min-w-0">
                        <Link to={`/product/${item.id}`} className="text-xs sm:text-sm font-black text-navy-950 truncate hover:text-brand-600 transition-colors tracking-tight flex-1 min-w-0 pr-1">
                          {item.name}
                        </Link>
                        <button
                          onClick={() => removeItem(item.id)}
                          className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 p-1 sm:p-1.5 rounded-xl shrink-0 transition-all cursor-pointer active:scale-95"
                          title="Remove item"
                        >
                          <TrashIcon />
                        </button>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                        {item.brand && (
                          <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-md truncate max-w-[140px]">
                            {item.brand}
                          </span>
                        )}
                      </div>
                      {isItemUnavailable && (
                        <div className="mt-1">
                          <span className="inline-flex items-center gap-1 text-[9px] font-black text-rose-700 bg-rose-100/90 px-1.5 py-0.5 rounded-md border border-rose-300">
                            ⚠️ Currently Unavailable — Please Remove
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between mt-2.5 sm:mt-3 gap-2 w-full min-w-0">
                      {/* Quantity change karne ke buttons */}
                      <div className="flex items-center border border-slate-200/90 rounded-xl bg-slate-100/70 p-0.5 sm:p-1 shadow-2xs shrink-0">
                        <button
                          onClick={() => updateQty(item.id, item.qty - 1)}
                          className="w-6 h-6 sm:w-7 sm:h-7 font-black text-navy-900 bg-white rounded-lg flex items-center justify-center shadow-2xs border border-slate-200/60 hover:bg-slate-50 hover:border-slate-300 transition-all active:scale-90 cursor-pointer text-xs sm:text-sm select-none"
                          title="Decrease quantity"
                        >
                          −
                        </button>
                        <span className="w-6 sm:w-8 text-center text-xs font-black text-navy-950 tabular-nums select-none">
                          {item.qty}
                        </span>
                        <button
                          disabled={isItemUnavailable}
                          onClick={() => updateQty(item.id, item.qty + 1)}
                          className="w-6 h-6 sm:w-7 sm:h-7 font-black text-navy-900 bg-white rounded-lg flex items-center justify-center shadow-2xs border border-slate-200/60 hover:bg-slate-50 hover:border-slate-300 transition-all active:scale-90 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed text-xs sm:text-sm select-none"
                          title="Increase quantity"
                        >
                          +
                        </button>
                      </div>

                      {/* Pricing aur MRP savings calculation */}
                      <div className="text-right shrink-0">
                        <div className="flex items-baseline justify-end gap-1 sm:gap-1.5">
                          <span className="text-xs sm:text-base font-black text-navy-950 tracking-tight tabular-nums">
                            ₹{itemTotal.toLocaleString("en-IN")}
                          </span>
                          {unitMrp > itemPrice && (
                            <span className="text-[9px] sm:text-xs text-slate-400 line-through tabular-nums">
                              ₹{itemMrpTotal.toLocaleString("en-IN")}
                            </span>
                          )}
                        </div>
                        {itemSavings > 0 && (
                          <span className="text-[8px] sm:text-[9px] font-extrabold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-200 shadow-2xs inline-block mt-0.5">
                            Save ₹{itemSavings.toLocaleString("en-IN")}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right sidebar: coupon box aur order summary */}
          <div className="space-y-4 w-full min-w-0">
            
            {/* Coupon code apply karne ka box */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-3.5 sm:p-4.5 shadow-xs space-y-3 w-full min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-extrabold text-navy-900 tracking-tight truncate">
                  Apply Coupon Code
                </span>
                <button
                  onClick={() => setShowCouponsModal((v) => !v)}
                  className="text-[11px] font-bold text-brand-600 hover:underline cursor-pointer active:scale-95 transition-transform shrink-0"
                >
                  View Offers ({validCoupons.length})
                </button>
              </div>

              {appliedCoupon ? (
                <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-3 flex items-center justify-between gap-2 shadow-2xs w-full min-w-0">
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-black text-emerald-800 tracking-tight block truncate">✓ {appliedCoupon.code} APPLIED</span>
                    <p className="text-[10px] text-emerald-700 font-semibold mt-0.5 truncate">Saved ₹{appliedCoupon.discountAmount} on this order!</p>
                  </div>
                  <button onClick={handleRemoveCoupon} className="text-xs font-bold text-rose-600 hover:underline cursor-pointer shrink-0">
                    Remove
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5 w-full min-w-0">
                  <form onSubmit={(e) => { e.preventDefault(); handleApplyCoupon(); }} className="flex items-center gap-2 w-full min-w-0">
                    <input
                      type="text"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      placeholder="Enter Code (e.g. WELCOME200)"
                      className="flex-1 min-w-0 bg-slate-50 text-xs font-bold border border-slate-200/90 rounded-xl px-3 py-2.5 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 uppercase placeholder:normal-case transition-all"
                    />
                    <button
                      type="submit"
                      className="bg-navy-950 hover:bg-navy-900 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-xs active:scale-[0.98] transition-all cursor-pointer shrink-0"
                    >
                      Apply
                    </button>
                  </form>

                  {/* Best coupon suggest karne ka card */}
                  {bestCoupon && (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 flex items-center justify-between gap-2 shadow-2xs w-full min-w-0">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-mono font-black text-brand-700 bg-white px-2 py-0.5 rounded border border-slate-200 shrink-0">
                            {bestCoupon.code}
                          </span>
                          <span className="text-[10px] font-black text-emerald-700 bg-emerald-100/70 px-1.5 py-0.5 rounded shrink-0">
                            Save ₹{bestCoupon.discountAmount}
                          </span>
                        </div>
                        <p className="text-[10.5px] text-slate-500 font-medium truncate mt-0.5">
                          {bestCoupon.title || `Valid on orders above ₹${bestCoupon.minOrder || 0}`}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleApplyCoupon(bestCoupon.code)}
                        className="text-xs font-black text-brand-600 hover:text-brand-700 bg-white hover:bg-brand-50 border border-brand-200 px-3 py-1.5 rounded-lg active:scale-95 transition-all cursor-pointer shrink-0 shadow-2xs"
                      >
                        Apply
                      </button>
                    </div>
                  )}
                </div>
              )}

              {couponError && <p className="text-[11px] font-bold text-rose-600">{couponError}</p>}
            </div>

            {/* Free Delivery Threshold Goal Tracker */}
            {isFreeDeliveryProgramActive && (
              <div className={`rounded-2xl p-3.5 sm:p-4 border transition-all ${
                isFreeDelivery 
                  ? "bg-gradient-to-r from-emerald-50 to-teal-50/50 border-emerald-200 text-emerald-950 shadow-2xs" 
                  : "bg-gradient-to-r from-sky-50/90 to-blue-50/60 border-sky-200 text-slate-800 shadow-2xs"
              }`}>
                <div className="flex items-center justify-between gap-2 text-xs font-black mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-base">🚚</span>
                    <span className="tracking-tight">
                      {isFreeDelivery ? "FREE District Delivery Unlocked!" : `Free Delivery on orders above ₹${freeDeliveryThreshold.toLocaleString("en-IN")}`}
                    </span>
                  </div>
                  {isFreeDelivery && (
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0 bg-emerald-600 text-white">
                      UNLOCKED
                    </span>
                  )}
                </div>
                
                {!isFreeDelivery ? (
                  <>
                    <div className="w-full bg-sky-200/80 rounded-full h-2 overflow-hidden mb-2">
                      <div 
                        className="bg-brand-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${freeDeliveryProgress}%` }}
                      />
                    </div>
                    <p className="text-[11px] font-semibold text-slate-600 leading-snug">
                      Add <strong className="text-brand-600 font-extrabold">₹{remainingForFreeDelivery.toLocaleString("en-IN")}</strong> more materials to your cart to get <strong className="text-emerald-700 font-extrabold">100% Free District Delivery</strong>.
                    </p>
                  </>
                ) : (
                  <p className="text-[11px] font-bold text-emerald-800 flex items-center gap-1.5">
                    <span>✓</span>
                    <span>District delivery fee (₹{baseDeliveryFee}) is 100% free for this order!</span>
                  </p>
                )}
              </div>
            )}

            {/* Order ka pura price details breakdown */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-sm sticky top-20 space-y-4 w-full min-w-0">
              <h3 className="text-xs font-black text-navy-900 uppercase tracking-wider border-b border-slate-100 pb-2.5">
                Order Price Details
              </h3>
              
              <div className="space-y-2.5 text-xs w-full min-w-0">
                <div className="flex justify-between items-center text-slate-600 font-medium gap-2">
                  <span className="truncate">Total MRP</span>
                  <span className="font-bold tabular-nums shrink-0">₹{Number(mrpTotal || 0).toLocaleString("en-IN")}</span>
                </div>

                {mrpDiscount > 0 && (
                  <div className="flex justify-between items-center text-emerald-700 font-bold gap-2">
                    <span className="truncate">Discount on MRP</span>
                    <span className="tabular-nums shrink-0">- ₹{Number(mrpDiscount || 0).toLocaleString("en-IN")}</span>
                  </div>
                )}

                {appliedCoupon && (
                  <div className="flex justify-between items-center text-brand-600 font-black gap-2">
                    <span className="truncate">Coupon ({appliedCoupon.code})</span>
                    <span className="tabular-nums shrink-0">- ₹{Number(couponDiscount).toLocaleString("en-IN")}</span>
                  </div>
                )}

                <div className="flex justify-between items-center text-slate-600 font-medium gap-2">
                  <div className="flex flex-col">
                    <span className="truncate">District Delivery Fee</span>
                    {isFreeDeliveryProgramActive && !isFreeDelivery && (
                      <span className="text-[10px] text-slate-400 font-normal">
                        Free above ₹{freeDeliveryThreshold.toLocaleString("en-IN")}
                      </span>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    {deliveryCharge === 0 ? (
                      <div className="flex items-center gap-1.5 justify-end">
                        <span className="line-through text-slate-400 font-semibold text-xs">₹{baseDeliveryFee}</span>
                        <span className="text-emerald-700 font-extrabold text-xs bg-emerald-100/90 px-2 py-0.5 rounded-md border border-emerald-200">
                          FREE
                        </span>
                      </div>
                    ) : (
                      <span className="font-bold tabular-nums">₹{deliveryCharge}</span>
                    )}
                  </div>
                </div>

                <div className="border-t border-slate-200/80 pt-3 flex justify-between items-baseline text-base font-black text-navy-900 tracking-tight gap-2">
                  <span className="truncate">Total Amount</span>
                  <span className="tabular-nums shrink-0">₹{Number(total || 0).toLocaleString("en-IN")}</span>
                </div>
              </div>

              {totalSavings > 0 && (
                <div className="bg-emerald-50/80 text-emerald-800 text-[11px] font-black p-2.5 rounded-xl text-center border border-emerald-200/80 shadow-2xs">
                  Total Savings: ₹{Number(totalSavings).toLocaleString("en-IN")}
                </div>
              )}

              {hasUnavailableItems && (
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-800 font-bold space-y-1">
                  <p className="flex items-center gap-1 text-rose-900 font-black">
                    <span>Unavailable Items in Cart</span>
                  </p>
                  <p className="text-[11px] font-medium text-rose-700 leading-snug">
                    Some items in your cart are currently unavailable. Please remove them using the trash icon to proceed to checkout.
                  </p>
                </div>
              )}

              <button
                disabled={hasUnavailableItems || hasRegionMismatch}
                onClick={handleProceedToCheckout}
                className={`w-full text-xs font-black rounded-xl py-3.5 shadow-md transition-all flex items-center justify-center gap-2 ${
                  hasUnavailableItems
                    ? "bg-slate-200 text-slate-500 cursor-not-allowed border border-slate-300 shadow-none"
                    : hasRegionMismatch
                    ? "bg-sky-600 hover:bg-sky-700 text-white border border-sky-700 shadow-none active:scale-[0.98] cursor-pointer"
                    : "bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 text-white active:scale-[0.98] cursor-pointer"
                }`}
              >
                {hasUnavailableItems
                  ? "Remove Unavailable Items to Checkout"
                  : hasRegionMismatch
                  ? `Update Prices to Checkout (${currentRegionName})`
                  : "Proceed to Checkout →"}
              </button>

              {hasRegionMismatch && !hasUnavailableItems && (
                <p className="text-[10px] font-bold text-sky-900 text-center mt-1.5 bg-sky-50 py-1.5 px-2 rounded-lg border border-sky-200">
                  Region update required for {currentRegionName} before placing order
                </p>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Mobile screen ke bottom me sticky checkout bar */}
      <div className="md:hidden fixed bottom-[calc(3.5rem+max(0.25rem,env(safe-area-inset-bottom)))] inset-x-0 bg-white/95 backdrop-blur-md border-t border-slate-200/90 px-4 py-2.5 z-40 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
        <div className="flex items-center justify-between gap-3 max-w-lg mx-auto">
          <div>
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
              Total ({items.length} {items.length === 1 ? "Item" : "Items"})
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-black text-navy-950 tabular-nums">
                ₹{Number(total || 0).toLocaleString("en-IN")}
              </span>
              {totalSavings > 0 && (
                <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 shadow-2xs">
                  Save ₹{Number(totalSavings).toLocaleString("en-IN")}
                </span>
              )}
            </div>
          </div>

          <button
            disabled={hasUnavailableItems || hasRegionMismatch}
            onClick={handleProceedToCheckout}
            className={`text-sm font-black px-6 py-3.5 rounded-xl shadow-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0 active:scale-95 ${
              hasUnavailableItems
                ? "bg-slate-200 text-slate-500 cursor-not-allowed border border-slate-300 shadow-none"
                : hasRegionMismatch
                ? "bg-sky-600 text-white shadow-sky-600/25"
                : "bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 text-white shadow-brand-500/25"
            }`}
          >
            <span>Checkout</span>
            <span className="text-base leading-none">→</span>
          </button>
        </div>
      </div>

      {/* Sare available coupons ka popup modal */}
      {showCouponsModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-navy-900 text-sm">Available Promo Coupons</h3>
              <button onClick={() => setShowCouponsModal(false)} className="text-slate-400 hover:text-navy-900 text-base">✕</button>
            </div>

            <div className="space-y-3 max-h-80 overflow-y-auto">
              {availableCouponsList.filter((c) => {
                const todayStr = new Date().toISOString().split("T")[0];
                const isExpired = c.expiryDate && c.expiryDate < todayStr;
                return c.isActive !== false && !isExpired;
              }).map((c) => (
                <div key={c.code} className="border border-slate-200/90 rounded-xl p-3.5 flex items-center justify-between hover:border-brand-500 transition-colors shadow-2xs">
                  <div>
                    <span className="bg-navy-900 text-white text-[10px] font-black px-2 py-0.5 rounded">
                      {c.code}
                    </span>
                    <p className="text-xs font-bold text-navy-900 mt-1">{c.title}</p>
                    <p className="text-[10px] text-slate-500">{c.desc || `Valid on orders above ₹${c.minOrder}`}</p>
                    <p className="text-[9px] text-slate-400 mt-0.5">Expires: {c.expiryDate || "Never"}</p>
                  </div>

                  <button
                    onClick={() => handleApplyCoupon(c.code)}
                    className="bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs px-3.5 py-2 rounded-xl active:scale-[0.98] transition-all cursor-pointer shrink-0 shadow-xs"
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