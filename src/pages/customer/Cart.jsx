import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "../../components/Navbar";
import MobileHeader from "../../components/ui/MobileHeader";
import { realMrp } from "../../utils/priceDisplay";
import EmptyState from "../../components/ui/EmptyState";
import { AlertIcon, ArrowRightIcon, CartIcon, CheckIcon, CloseIcon, MinusIcon, PinIcon, PlusIcon, TagIcon, TrashIcon as TrashOutline, TruckIcon } from "../../components/ui/Icons";
import { useCart } from "../../context/CartContext";
import { useAdmin } from "../../context/AdminContext";
import { useAlert } from "../../context/AlertContext";
import { useRegion } from "../../context/RegionContext";
import { useAuth } from "../../context/AuthContext";
import { API_BASE_URL } from "../../config/api";
import { authFetch } from "../../config/authFetch";
import { cleanProductImage } from "../../utils/productImage";

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
  // Minimum order se neeche aane par jo coupon apne aap hataya gaya, uski jankari
  const [couponNotice, setCouponNotice] = useState(null);

  useEffect(() => {
    if (appliedCoupon?.code) {
      setCouponCode(appliedCoupon.code);
    }
  }, [appliedCoupon]);

  // Quantity kam karne ya item hatane se cart coupon ke minimum order se neeche aa jaye toh coupon hata do.
  // Khali cart (abhi load ho raha ho) par kuch mat karo, warna refresh pe coupon galti se hat jayega.
  useEffect(() => {
    if (!appliedCoupon || items.length === 0) return;
    const minOrderVal = Number(appliedCoupon.minOrder) || 0;
    if (subtotal >= minOrderVal) return;
    removeCoupon();
    setCouponCode("");
    setCouponError("");
    setCouponNotice({ code: appliedCoupon.code, minOrder: minOrderVal });
  }, [appliedCoupon, items.length, subtotal, removeCoupon]);

  // Cart ki value badalne ke baad purana coupon error (jaise "minimum ₹1,000 chahiye") galat ho sakta hai, use hata do
  useEffect(() => {
    setCouponError("");
  }, [subtotal]);

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
      const { removedItems } = await updateCartToCurrentRegion(products);
      if (removedItems && removedItems.length > 0) {
        showAlert({
          title: "Some items were removed",
          message: `The following product(s) are not available in ${currentRegionName} and have been removed from your cart:\n\n• ${removedItems.join("\n• ")}`,
          type: "warning",
          buttonText: "Understood",
        });
      } else {
        showAlert({
          title: "Prices updated",
          message: `Cart prices and availability successfully updated for ${currentRegionName}!`,
          type: "success",
          buttonText: "Awesome",
        });
      }
    } catch (err) {
      showAlert({
        title: "Couldn't update prices",
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
        title: "Some items are unavailable",
        message: "Your cart contains items that are currently unavailable. Remove them from your cart to continue to checkout.",
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
    setCouponNotice(null);
    setShowCouponsModal(false);
  };

  const handleRemoveCoupon = () => {
    removeCoupon();
    setCouponCode("");
    setCouponError("");
    setCouponNotice(null);
  };

  const baseDeliveryFee = Number(region?.baseDeliveryCharge) || 49;
  const freeDeliveryThreshold = Number(walletSettings?.freeDeliveryMinAmount) || 2000;
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
      <div data-storefront className="min-h-screen bg-slate-50 text-navy-900 pb-24 w-full max-w-full overflow-x-clip">
        <div className="hidden lg:block">
          <Navbar />
        </div>
        <MobileHeader title="Cart" showCart={false} />

        <main className="max-w-lg mx-auto px-4 py-10 sm:py-16">
          <div className="rounded-2xl bg-white ring-1 ring-slate-200/80">
            <EmptyState
              icon={CartIcon}
              title="Your cart is empty"
              description="Add cement, steel, bricks and more — delivered to your site."
              actionLabel="Start shopping"
              actionTo="/"
            />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div data-storefront className="min-h-screen bg-slate-50 text-navy-900 pb-40 md:pb-24 font-sans w-full max-w-full overflow-x-clip">
      <div className="hidden lg:block">
        <Navbar />
      </div>
      <MobileHeader title={`Cart (${items.length})`} showCart={false} />

      <main className="bc-fade-in max-w-5xl mx-auto px-4 sm:px-6 py-4 sm:py-6 pb-28 md:pb-12 w-full min-w-0">
        <h1 className="hidden lg:block text-2xl font-semibold tracking-tight text-navy-950 mb-5">
          Cart <span className="text-slate-400 font-normal tabular-nums">({items.length})</span>
        </h1>
        {/* District delivery free hone par banner dikhao */}
        {deliveryCharge === 0 && (
          <div className="flex mb-4">
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full ring-1 ring-inset ring-emerald-600/15">
              <TruckIcon className="h-3.5 w-3.5" />
              Free district delivery applied
            </span>
          </div>
        )}

        {/* Agar district badal gaya hai toh alert banner */}
        {hasRegionMismatch && (
          <div role="status" className="bc-rise-in mb-5 bg-amber-50 ring-1 ring-inset ring-amber-600/20 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                <PinIcon className="h-[18px] w-[18px]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold text-navy-950 text-sm">
                    District changed to {currentRegionName}
                  </h4>
                </div>
                <p className="text-sm text-amber-900/80 mt-0.5">
                  These items were added in <span className="font-medium">{cartRegionName}</span>. Update them to {currentRegionName} prices before checkout.
                </p>
              </div>
            </div>
            <button
              disabled={isUpdatingPrices}
              onClick={handleUpdateRegionPrices}
              className="w-full sm:w-auto h-11 bg-navy-950 hover:bg-navy-900 active:scale-[0.98] text-white text-sm font-semibold px-4 rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5 shrink-0 disabled:opacity-60"
            >
              {isUpdatingPrices ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Updating prices…</span>
                </>
              ) : (
                `Update prices for ${currentRegionName}`
              )}
            </button>
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-4 sm:gap-6 w-full min-w-0">
          {/* Cart me jitne items hain unki list */}
          <div className="md:col-span-2 space-y-2.5 sm:space-y-3 w-full min-w-0">
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
              const unitMrp = realMrp(itemPrice, rawMrp) || itemPrice; // only a real MRP, never an invented one
              const itemTotal = itemPrice * item.qty;
              const itemMrpTotal = unitMrp * item.qty;
              const itemSavings = itemMrpTotal - itemTotal;

              return (
                <div
                  key={item.id}
                  className={`bg-white rounded-2xl p-3 sm:p-4 flex gap-3 sm:gap-4 transition-shadow w-full min-w-0 ${
                    isItemUnavailable ? "ring-1 ring-rose-300" : "ring-1 ring-slate-200/80"
                  }`}
                >
                  <Link to={`/product/${item.id}`} className="h-[72px] w-[72px] sm:h-20 sm:w-20 shrink-0 rounded-xl overflow-hidden bg-white ring-1 ring-slate-100 relative">
                    <img
                      src={cleanProductImage(item)}
                      alt={item.name}
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = cleanProductImage(null, item.categoryName || item.category, item.name);
                      }}
                      className={`w-full h-full object-contain p-1 ${isItemUnavailable ? "grayscale opacity-60" : ""}`}
                    />
                  </Link>

                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-1.5 w-full min-w-0">
                        <Link to={`/product/${item.id}`} className="text-sm font-medium text-navy-950 line-clamp-2 leading-snug hover:text-brand-700 transition-colors flex-1 min-w-0 pr-1">
                          {item.name}
                        </Link>
                        <button
                          onClick={() => removeItem(item.id)}
                          className="-mr-1 -mt-1 flex h-9 w-9 items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl shrink-0 transition-colors cursor-pointer active:scale-95"
                          title="Remove item"
                          aria-label={`Remove ${item.name}`}
                        >
                          <TrashOutline className="h-[18px] w-[18px]" />
                        </button>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                        {item.brand && (
                          <span className="text-xs text-slate-500 truncate max-w-[160px]">
                            {item.brand}
                          </span>
                        )}
                      </div>
                      {isItemUnavailable && (
                        <div className="mt-1">
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-rose-700">
                            <AlertIcon className="h-3.5 w-3.5" /> Unavailable — remove to continue
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between mt-2.5 sm:mt-3 gap-2 w-full min-w-0">
                      {/* Quantity change karne ke buttons */}
                      <div className="flex items-center rounded-xl ring-1 ring-slate-200 bg-white shrink-0">
                        <button
                          onClick={() => updateQty(item.id, item.qty - 1)}
                          className="w-9 h-9 text-navy-900 rounded-l-xl flex items-center justify-center hover:bg-slate-100 transition-colors active:scale-95 cursor-pointer select-none"
                          title="Decrease quantity"
                          aria-label="Decrease quantity"
                        >
                          <MinusIcon className="h-4 w-4" strokeWidth={2.2} />
                        </button>
                        <span className="min-w-8 text-center text-sm font-semibold text-navy-950 tabular-nums select-none" aria-live="polite">
                          {item.qty}
                        </span>
                        <button
                          disabled={isItemUnavailable}
                          onClick={() => updateQty(item.id, item.qty + 1)}
                          className="w-9 h-9 text-navy-900 rounded-r-xl flex items-center justify-center hover:bg-slate-100 transition-colors active:scale-95 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed select-none"
                          title="Increase quantity"
                          aria-label="Increase quantity"
                        >
                          <PlusIcon className="h-4 w-4" strokeWidth={2.2} />
                        </button>
                      </div>

                      {/* Pricing aur MRP savings calculation */}
                      <div className="text-right shrink-0">
                        <div className="flex items-baseline justify-end gap-1 sm:gap-1.5">
                          <span className="text-[15px] sm:text-base font-semibold text-navy-950 tabular-nums">
                            ₹{itemTotal.toLocaleString("en-IN")}
                          </span>
                          {unitMrp > itemPrice && (
                            <span className="text-xs text-slate-400 line-through tabular-nums">
                              ₹{itemMrpTotal.toLocaleString("en-IN")}
                            </span>
                          )}
                        </div>
                        {itemSavings > 0 && (
                          <span className="text-xs font-medium text-emerald-700 block mt-0.5 tabular-nums">
                            You save ₹{itemSavings.toLocaleString("en-IN")}
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
            <div className="bg-white rounded-2xl ring-1 ring-slate-200/80 p-4 space-y-3 w-full min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 text-sm font-semibold text-navy-950 truncate">
                  <TagIcon className="h-4 w-4 text-slate-500" />
                  Coupons
                </span>
                <button
                  onClick={() => setShowCouponsModal((v) => !v)}
                  className="h-8 px-2 -mr-2 rounded-lg text-sm font-medium text-brand-700 hover:bg-brand-50 cursor-pointer shrink-0 tabular-nums"
                >
                  View offers ({validCoupons.length})
                </button>
              </div>

              {appliedCoupon ? (
                <div className="bc-fade-in bg-emerald-50 ring-1 ring-inset ring-emerald-600/20 rounded-xl p-3 flex items-center justify-between gap-2 w-full min-w-0">
                  <div className="min-w-0 flex-1 flex items-center gap-2.5">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white"><CheckIcon className="h-4 w-4" strokeWidth={2.4} /></span>
                    <div className="min-w-0">
                      <span className="text-sm font-semibold text-emerald-900 block truncate">{appliedCoupon.code} applied</span>
                      <p className="text-xs text-emerald-800 truncate tabular-nums">You save ₹{appliedCoupon.discountAmount}</p>
                    </div>
                  </div>
                  <button onClick={handleRemoveCoupon} className="h-8 px-2 rounded-lg text-sm font-medium text-rose-600 hover:bg-rose-50 cursor-pointer shrink-0">
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
                      placeholder="Enter coupon code"
                      aria-label="Coupon code"
                      className="flex-1 min-w-0 h-11 bg-white text-sm font-medium border border-slate-200 rounded-xl px-3.5 outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 uppercase placeholder:normal-case placeholder:font-normal placeholder:text-slate-400 transition-[border-color,box-shadow]"
                    />
                    <button
                      type="submit"
                      className="h-11 bg-navy-950 hover:bg-navy-900 text-white font-semibold text-sm px-4 rounded-xl active:scale-[0.98] transition-colors cursor-pointer shrink-0"
                    >
                      Apply
                    </button>
                  </form>

                  {/* Best coupon suggest karne ka card */}
                  {bestCoupon && (
                    <div className="bg-slate-50 rounded-xl p-3 flex items-center justify-between gap-2 w-full min-w-0">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-mono font-semibold text-navy-950 bg-white px-2 py-0.5 rounded-md ring-1 ring-dashed ring-slate-300 shrink-0">
                            {bestCoupon.code}
                          </span>
                          <span className="text-xs font-medium text-emerald-700 shrink-0 tabular-nums">
                            Save ₹{bestCoupon.discountAmount}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 truncate mt-1">
                          {bestCoupon.title || `Valid on orders above ₹${bestCoupon.minOrder || 0}`}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleApplyCoupon(bestCoupon.code)}
                        className="h-9 text-sm font-semibold text-brand-700 bg-white hover:bg-brand-50 ring-1 ring-brand-600/30 px-3 rounded-lg active:scale-[0.97] transition-colors cursor-pointer shrink-0"
                      >
                        Apply
                      </button>
                    </div>
                  )}
                </div>
              )}

              {couponError && <p role="alert" className="text-sm text-rose-600">{couponError}</p>}

              {/* Coupon apne aap hata tab batao kyun, aur wapas eligible hone par dubara lagane ka button */}
              {couponNotice && !appliedCoupon && !couponError && (
                <div className="bg-amber-50 ring-1 ring-inset ring-amber-600/20 rounded-xl p-3 flex items-center justify-between gap-2 w-full min-w-0">
                  <p className="text-[13px] text-amber-900 min-w-0">
                    {subtotal < couponNotice.minOrder
                      ? `${couponNotice.code} removed: it needs a minimum order of ₹${couponNotice.minOrder.toLocaleString("en-IN")}. Add ₹${Math.ceil(couponNotice.minOrder - subtotal).toLocaleString("en-IN")} more to use it.`
                      : `${couponNotice.code} can be used again on this cart.`}
                  </p>
                  {subtotal >= couponNotice.minOrder && (
                    <button
                      type="button"
                      onClick={() => handleApplyCoupon(couponNotice.code)}
                      className="h-9 text-sm font-semibold text-brand-700 bg-white hover:bg-brand-50 ring-1 ring-brand-600/30 px-3 rounded-lg active:scale-[0.97] transition-colors cursor-pointer shrink-0"
                    >
                      Apply
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Free Delivery Threshold Goal Tracker */}
            {isFreeDeliveryProgramActive && (
              <div className={`rounded-2xl p-4 transition-colors ${
                isFreeDelivery ? "bg-emerald-50 ring-1 ring-inset ring-emerald-600/15 text-emerald-950" : "bg-white ring-1 ring-slate-200/80 text-slate-800"
              }`}>
                <div className="flex items-center gap-2 text-sm font-semibold mb-2.5">
                  <TruckIcon className={`h-[18px] w-[18px] shrink-0 ${isFreeDelivery ? "text-emerald-700" : "text-slate-500"}`} />
                  <span>
                    {isFreeDelivery ? "Free delivery unlocked" : `Free delivery above ₹${freeDeliveryThreshold.toLocaleString("en-IN")}`}
                  </span>
                </div>
                
                {!isFreeDelivery ? (
                  <>
                    <div
                      className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden mb-2"
                      role="progressbar"
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={Math.round(freeDeliveryProgress)}
                      aria-label="Progress to free delivery"
                    >
                      <div
                        className="bg-brand-500 h-full rounded-full transition-[width] duration-500 ease-out"
                        style={{ width: `${freeDeliveryProgress}%` }}
                      />
                    </div>
                    <p className="text-[13px] text-slate-600 leading-snug">
                      Add <strong className="font-semibold text-navy-950 tabular-nums">₹{remainingForFreeDelivery.toLocaleString("en-IN")}</strong> more to get free delivery.
                    </p>
                  </>
                ) : (
                  <p className="text-[13px] text-emerald-800 tabular-nums">
                    The ₹{baseDeliveryFee} district delivery fee is waived for this order.
                  </p>
                )}
              </div>
            )}

            {/* Order ka pura price details breakdown */}
            <div className="bg-white rounded-2xl ring-1 ring-slate-200/80 p-4 sm:p-5 sticky top-20 space-y-4 w-full min-w-0">
              <h3 className="text-sm font-semibold text-navy-950">
                Price details
              </h3>

              <div className="space-y-2.5 text-sm w-full min-w-0">
                <div className="flex justify-between items-center text-slate-600 gap-2">
                  <span className="truncate">Total MRP</span>
                  <span className="tabular-nums shrink-0">₹{Number(mrpTotal || 0).toLocaleString("en-IN")}</span>
                </div>

                {mrpDiscount > 0 && (
                  <div className="flex justify-between items-center text-emerald-700 gap-2">
                    <span className="truncate">Discount on MRP</span>
                    <span className="tabular-nums shrink-0">- ₹{Number(mrpDiscount || 0).toLocaleString("en-IN")}</span>
                  </div>
                )}

                {appliedCoupon && (
                  <div className="flex justify-between items-center text-emerald-700 gap-2">
                    <span className="truncate">Coupon ({appliedCoupon.code})</span>
                    <span className="tabular-nums shrink-0">- ₹{Number(couponDiscount).toLocaleString("en-IN")}</span>
                  </div>
                )}

                <div className="flex justify-between items-center text-slate-600 gap-2">
                  <div className="flex flex-col">
                    <span className="truncate">Delivery fee</span>
                    {isFreeDeliveryProgramActive && !isFreeDelivery && (
                      <span className="text-xs text-slate-400">
                        Free above ₹{freeDeliveryThreshold.toLocaleString("en-IN")}
                      </span>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    {deliveryCharge === 0 ? (
                      <div className="flex items-center gap-1.5 justify-end">
                        <span className="line-through text-slate-400 text-xs tabular-nums">₹{baseDeliveryFee}</span>
                        <span className="text-emerald-700 font-semibold text-sm">
                          Free
                        </span>
                      </div>
                    ) : (
                      <span className="tabular-nums">₹{deliveryCharge}</span>
                    )}
                  </div>
                </div>

                <div className="border-t border-slate-200/80 pt-3 flex justify-between items-baseline text-base font-semibold text-navy-950 gap-2">
                  <span className="truncate">Total amount</span>
                  <span className="tabular-nums shrink-0">₹{Number(total || 0).toLocaleString("en-IN")}</span>
                </div>
              </div>

              {totalSavings > 0 && (
                <div className="bg-emerald-50 text-emerald-800 text-sm font-medium px-3 py-2 rounded-xl text-center tabular-nums">
                  You save ₹{Number(totalSavings).toLocaleString("en-IN")} on this order
                </div>
              )}

              {hasUnavailableItems && (
                <div role="alert" className="bg-rose-50 ring-1 ring-inset ring-rose-600/20 rounded-xl p-3 text-sm text-rose-800 space-y-0.5">
                  <p className="flex items-center gap-1.5 font-semibold text-rose-900">
                    <AlertIcon className="h-4 w-4" /> Some items are unavailable
                  </p>
                  <p className="text-[13px] text-rose-700 leading-snug">
                    Some items in your cart are currently unavailable. Please remove them using the trash icon to proceed to checkout.
                  </p>
                </div>
              )}

              <button
                disabled={hasUnavailableItems || hasRegionMismatch}
                onClick={handleProceedToCheckout}
                className={`w-full h-12 text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 ${
                  hasUnavailableItems
                    ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                    : hasRegionMismatch
                    ? "bg-slate-100 text-slate-500 cursor-not-allowed"
                    : "bg-brand-600 hover:bg-brand-700 text-white shadow-[0_1px_2px_rgba(154,52,18,0.3)] active:scale-[0.98] cursor-pointer"
                }`}
              >
                {hasUnavailableItems
                  ? "Remove unavailable items to continue"
                  : hasRegionMismatch
                  ? `Update prices to continue`
                  : <>Proceed to Checkout <ArrowRightIcon className="h-4 w-4" /></>}
              </button>

              {hasRegionMismatch && !hasUnavailableItems && (
                <p className="text-xs text-slate-500 text-center -mt-1">
                  Update prices for {currentRegionName} above before checkout
                </p>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Mobile screen ke bottom me sticky checkout bar */}
      <div className="md:hidden fixed bottom-[calc(3.5rem+max(0.25rem,env(safe-area-inset-bottom)))] inset-x-0 bg-white/95 backdrop-blur-md border-t border-slate-200/80 px-4 py-2.5 z-40 shadow-[0_-8px_24px_-12px_rgba(15,23,42,0.18)]">
        <div className="flex items-center justify-between gap-3 max-w-lg mx-auto">
          <div>
            <span className="text-xs text-slate-500 block tabular-nums">
              Total · {items.length} {items.length === 1 ? "item" : "items"}
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-semibold text-navy-950 tabular-nums">
                ₹{Number(total || 0).toLocaleString("en-IN")}
              </span>
              {totalSavings > 0 && (
                <span className="text-xs font-medium text-emerald-700 tabular-nums">
                  Save ₹{Number(totalSavings).toLocaleString("en-IN")}
                </span>
              )}
            </div>
          </div>

          <button
            disabled={hasUnavailableItems || hasRegionMismatch}
            onClick={handleProceedToCheckout}
            className={`h-12 text-sm font-semibold px-6 rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer shrink-0 active:scale-[0.98] ${
              hasUnavailableItems || hasRegionMismatch
                ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                : "bg-brand-600 hover:bg-brand-700 text-white"
            }`}
          >
            <span>Checkout</span>
            <ArrowRightIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Sare available coupons ka popup modal */}
      {showCouponsModal && (
        <div
          className="bc-fade-in fixed inset-0 z-50 bg-slate-950/55 flex items-end sm:items-center justify-center sm:p-4"
          onClick={() => setShowCouponsModal(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Available coupons"
            onClick={(e) => e.stopPropagation()}
            className="bc-sheet-up bg-white rounded-t-3xl sm:rounded-2xl max-w-md w-full p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-navy-950 text-base">Available coupons</h3>
              <button
                onClick={() => setShowCouponsModal(false)}
                aria-label="Close"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200"
              >
                <CloseIcon className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-2.5 max-h-[60vh] overflow-y-auto overscroll-contain">
              {availableCouponsList.filter((c) => {
                const todayStr = new Date().toISOString().split("T")[0];
                const isExpired = c.expiryDate && c.expiryDate < todayStr;
                return c.isActive !== false && !isExpired;
              }).map((c) => (
                <div key={c.code} className="rounded-xl p-3.5 flex items-center justify-between gap-3 ring-1 ring-slate-200 hover:ring-slate-300 transition-shadow">
                  <div className="min-w-0">
                    <span className="font-mono text-xs font-semibold text-navy-950 bg-slate-100 px-2 py-0.5 rounded-md">
                      {c.code}
                    </span>
                    <p className="text-sm font-medium text-navy-950 mt-1.5">{c.title}</p>
                    <p className="text-xs text-slate-500">{c.desc || `Valid on orders above ₹${c.minOrder}`}</p>
                    <p className="text-xs text-slate-400 mt-0.5">Expires {c.expiryDate || "never"}</p>
                  </div>

                  <button
                    onClick={() => handleApplyCoupon(c.code)}
                    className="h-9 bg-navy-950 hover:bg-navy-900 text-white font-semibold text-sm px-3.5 rounded-xl active:scale-[0.98] transition-colors cursor-pointer shrink-0"
                  >
                    Apply
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
