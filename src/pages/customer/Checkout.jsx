import { authFetch } from "../../config/authFetch";
import { useState, useEffect, useMemo } from "react";
import { useNavigate, Navigate, useLocation } from "react-router-dom";
import Navbar from "../../components/Navbar";
import { useCart } from "../../context/CartContext";
import { useOrders } from "../../context/OrderContext";
import { useAuth } from "../../context/AuthContext";
import { useAdmin } from "../../context/AdminContext";
import { useRegion } from "../../context/RegionContext";
import { useAddresses } from "../../context/AddressContext";
import { useAlert } from "../../context/AlertContext";
import { useNotifications } from "../../context/NotificationContext";
import { API_BASE_URL } from "../../config/api";
import { formatShortId } from "../../utils/formatId";

export default function Checkout() {
  const { items, subtotal, mrpTotal = subtotal, clearCart, hasRegionMismatch, appliedCoupon, applyCoupon, removeCoupon } = useCart();
  const { placeOrder } = useOrders();
  const { showAlert } = useAlert();
  const { addNotification } = useNotifications();
  const navigate = useNavigate();
  const location = useLocation();
  const directItem = location.state?.directItem;

  // Agar user "Buy Now" se aaya hai toh sirf directItem lo, warna regular cart items lo
  const checkoutItems = useMemo(() => {
    if (directItem) {
      return [{
        ...directItem,
        qty: directItem.qty || directItem.quantity || 1,
        quantity: directItem.qty || directItem.quantity || 1,
      }];
    }
    return items;
  }, [directItem, items]);

  const checkoutSubtotal = useMemo(() => {
    if (directItem) {
      const q = Number(directItem.qty || directItem.quantity || 1);
      return Number(directItem.price || 0) * q;
    }
    return subtotal;
  }, [directItem, subtotal]);

  const checkoutMrpTotal = useMemo(() => {
    if (directItem) {
      const q = Number(directItem.qty || directItem.quantity || 1);
      return Number(directItem.mrp || directItem.price || 0) * q;
    }
    return mrpTotal;
  }, [directItem, mrpTotal]);

  const { user, updateProfile } = useAuth();
  const { products = [], vendors = [], coupons = [], walletSettings: adminWalletSettings, fetchWalletSettings } = useAdmin() || {};

  useEffect(() => {
    if (fetchWalletSettings) {
      fetchWalletSettings();
    }
  }, [fetchWalletSettings]);
  const { region } = useRegion();
  const { addresses: contextAddresses = [], addAddress: addContextAddress } = useAddresses();

  const [dbAddresses, setDbAddresses] = useState([]);
  const [selectedAddrId, setSelectedAddrId] = useState("");
  const [payment, setPayment] = useState("cod");
  const [placing, setPlacing] = useState(false);

  // Wallet redemption state (with instant local cache)
  const [walletData, setWalletData] = useState(() => {
    try {
      const cached = localStorage.getItem(`buildcity_wallet_${user?.id || "guest"}`);
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const [useWallet, setUseWallet] = useState(false);

  useEffect(() => {
    if (user) {
      authFetch(`${API_BASE_URL}/api/v1/wallet`)
        .then((r) => r.json())
        .then((data) => {
          if (data && data.success) {
            setWalletData(data);
            try {
              localStorage.setItem(`buildcity_wallet_${user.id || "guest"}`, JSON.stringify(data));
            } catch {}
          }
        })
        .catch(() => {});
    }
  }, [user]);

  // Checkout coupon input state
  const [checkoutCouponCode, setCheckoutCouponCode] = useState("");
  const [couponError, setCouponError] = useState("");

  // Naya address add karne ke modal ka state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newFullName, setNewFullName] = useState(user?.name || "");
  const [newPhone, setNewPhone] = useState(user?.phone || "");
  const [newStreet, setNewStreet] = useState("");
  const [newCity, setNewCity] = useState(region?.name || "Varanasi");
  const [newPincode, setNewPincode] = useState("221001");
  const [savingAddr, setSavingAddr] = useState(false);

  const [successOrder, setSuccessOrder] = useState(null);

  useEffect(() => {
    if (region?.name) {
      setNewCity(region.name);
    }
  }, [region?.name]);

  // Agar customer ka naam missing ya default hai toh auto update karo
  const maybeUpdateProfileName = (enteredName) => {
    if (!enteredName || typeof enteredName !== "string" || !updateProfile) return;
    const clean = enteredName.trim();
    if (clean.length < 2) return;

    const current = (user?.name || "").trim().toLowerCase();
    const isPlaceholder =
      !current ||
      current === "customer" ||
      current === "user" ||
      current === "verified customer" ||
      /^customer\s*\d*$/i.test(current) ||
      /^user\s*\d*$/i.test(current);

    if (isPlaceholder && clean.toLowerCase() !== current) {
      console.log("Customer profile name update ho raha hai:", clean);
      updateProfile({ name: clean }).catch(() => null);
    }
  };

  // Check kar rahe hain ki address active district me deliver ho sakta hai ya nahi
  const isDeliverableInRegion = (addr, currentRegionName) => {
    if (!addr) return false;
    const reg = (currentRegionName || "Varanasi").toLowerCase().trim();
    const city = (addr.city || "").toLowerCase().trim();
    const district = (addr.districtName || addr.regionName || "").toLowerCase().trim();

    if (city === reg || district === reg) return true;
    if (city && reg && (city.includes(reg) || reg.includes(city))) return true;

    return false;
  };

  // Logged in user ke saved addresses load karne ka hook
  useEffect(() => {
    const activeRegion = region?.name || "Varanasi";
    const cleanContext = (contextAddresses || []).map((ca) => {
      let city = ca.city || ca.districtName;
      if (!city) {
        if (/mirzapur/i.test(ca.line || ca.street || "")) city = "Mirzapur";
        else if (/varanasi/i.test(ca.line || ca.street || "")) city = "Varanasi";
        else city = activeRegion;
      }
      return {
        id: ca.id || "addr_" + Date.now(),
        fullName: ca.fullName || user?.name || "Customer",
        phone: ca.phone || user?.phone || "",
        street: ca.line || ca.street || "",
        city: city,
        state: ca.state || "Uttar Pradesh",
        pincode: ca.pincode || "221001",
      };
    }).filter((a) => a.street && a.street.trim().length > 0 && !a.street.includes("Lanka Road") && !a.street.includes("House No. 12"));

    if (user?.address && user.address.trim().length > 0 && !user.address.includes("Lanka Road")) {
      const detectedCity = user.city || (/mirzapur/i.test(user.address) ? "Mirzapur" : (/varanasi/i.test(user.address) ? "Varanasi" : activeRegion));
      cleanContext.unshift({
        id: "addr_profile",
        fullName: user.name || "Customer",
        phone: user.phone || "",
        street: user.address,
        city: detectedCity,
        state: "Uttar Pradesh",
        pincode: "221001",
      });
    }

    const uniqueAddrs = Array.from(new Map(cleanContext.map((a) => [a.id || a.street, a])).values());

    setDbAddresses(uniqueAddrs);
    
    // Pehla deliverable address automatically select kar lo
    const currentSelected = uniqueAddrs.find((a) => a.id === selectedAddrId);
    if (!currentSelected || !isDeliverableInRegion(currentSelected, activeRegion)) {
      const firstDeliverable = uniqueAddrs.find((a) => isDeliverableInRegion(a, activeRegion));
      setSelectedAddrId(firstDeliverable ? firstDeliverable.id : "");
    }
  }, [user, contextAddresses, region?.name]);

  if (checkoutItems.length === 0 && !successOrder) {
    return <Navigate to="/cart" replace />;
  }

  const baseDeliveryFee = Number(region?.baseDeliveryCharge) || 49;
  const activeWalletSettings = walletData?.settings || adminWalletSettings || {};
  const freeDeliveryThreshold = Number(activeWalletSettings.freeDeliveryMinAmount) || 25000;
  const isFreeDeliveryProgramActive = activeWalletSettings.freeDeliveryEnabled !== false;
  const isFreeDelivery = isFreeDeliveryProgramActive && checkoutSubtotal >= freeDeliveryThreshold;
  const remainingForFreeDelivery = Math.max(0, freeDeliveryThreshold - checkoutSubtotal);
  const freeDeliveryProgress = Math.min(100, Math.round((checkoutSubtotal / freeDeliveryThreshold) * 100));
  const deliveryCharge = isFreeDelivery ? 0 : baseDeliveryFee;

  const couponDiscount = useMemo(() => {
    if (!appliedCoupon) return 0;
    const minOrderVal = Number(appliedCoupon.minOrder) || 0;
    if (checkoutSubtotal < minOrderVal) return 0;
    return Number(appliedCoupon.discountAmount) || 0;
  }, [appliedCoupon, checkoutSubtotal]);

  // Wallet redemption calculation based on Super Admin safety limits
  const walletBalance = Number(walletData?.balance || 0);
  const walletSettings = activeWalletSettings;
  const walletRedeemEnabled = walletSettings.walletRedeemEnabled !== false;

  const maxWalletApplicable = useMemo(() => {
    if (!walletRedeemEnabled || walletBalance <= 0) return 0;
    const maxPercent = Number(walletSettings.maxWalletUsagePercent || 10);
    const maxFlat = Number(walletSettings.maxWalletUsageFlat || 500);
    const percentLimit = (checkoutSubtotal * maxPercent) / 100;
    const orderRemaining = Math.max(0, checkoutSubtotal + deliveryCharge - couponDiscount);
    return Math.min(walletBalance, Math.floor(percentLimit), maxFlat, orderRemaining);
  }, [walletRedeemEnabled, walletBalance, walletSettings, checkoutSubtotal, deliveryCharge, couponDiscount]);

  const appliedWalletDiscount = useWallet ? maxWalletApplicable : 0;
  const total = Math.max(0, checkoutSubtotal + deliveryCharge - couponDiscount - appliedWalletDiscount);
  const hasDeliverableAddress = dbAddresses.some((a) => isDeliverableInRegion(a, region?.name));
  const activeAddress = dbAddresses.find((a) => a.id === selectedAddrId && isDeliverableInRegion(a, region?.name));

  const handleApplyCheckoutCoupon = (e) => {
    e?.preventDefault?.();
    const code = (checkoutCouponCode || "").trim().toUpperCase();
    setCouponError("");
    if (!code) return;

    const list = Array.isArray(coupons) && coupons.length > 0 ? coupons : [
      { code: "BUILDCITY100", title: "Flat ₹100 OFF", minOrder: 1000, discountAmount: 100, expiryDate: "2026-12-31", isActive: true },
      { code: "SUPER500", title: "Flat ₹500 OFF", minOrder: 5000, discountAmount: 500, expiryDate: "2026-12-31", isActive: true },
      { code: "WELCOME200", title: "Flat ₹200 OFF", minOrder: 1500, discountAmount: 200, expiryDate: "2026-12-31", isActive: true },
    ];
    const matched = list.find((c) => c.code === code);
    if (!matched) {
      setCouponError(`Invalid coupon code "${code}". Please enter a valid coupon.`);
      return;
    }
    const todayStr = new Date().toISOString().split("T")[0];
    if (matched.isActive === false || (matched.expiryDate && matched.expiryDate < todayStr)) {
      setCouponError(`Coupon code "${matched.code}" is expired or inactive.`);
      return;
    }
    if (checkoutSubtotal < (Number(matched.minOrder) || 0)) {
      setCouponError(`Minimum order value ₹${Number(matched.minOrder || 0).toLocaleString("en-IN")} required.`);
      return;
    }

    applyCoupon({
      ...matched,
      discountAmount: Number(matched.discountAmount) || 0,
      minOrder: Number(matched.minOrder) || 0,
    });
    setCheckoutCouponCode("");
  };

  const fetchWithRetry = async (url, options = {}, retries = 3) => {
    for (let i = 0; i < retries; i++) {
      try {
        const res = await authFetch(url, options);
        if (res.ok) return res;
      } catch (err) {
        console.warn(`API retry ${i + 1}/${retries}:`, err.message);
        if (i === retries - 1) throw err;
        await new Promise((r) => setTimeout(r, 800 * (i + 1)));
      }
    }
  };

  const handleAddNewAddress = async (e) => {
    e.preventDefault();
    if (!newStreet || !newCity) return;

    setSavingAddr(true);

    if (newFullName && newFullName.trim()) {
      maybeUpdateProfileName(newFullName);
    }

    const newObj = {
      fullName: newFullName || user?.name || "Customer",
      phone: newPhone || user?.phone || "7607650875",
      line: newStreet,
      street: newStreet,
      city: newCity,
      state: "Uttar Pradesh",
      pincode: newPincode || "221001",
      isDefault: true,
    };

    try {
      const added = await addContextAddress(newObj);
      if (added && added.id) {
        setDbAddresses((prev) => [added, ...prev.filter((p) => p.id !== added.id)]);
        setSelectedAddrId(added.id);
      }
    } catch {}

    try {
      const res = await fetchWithRetry(`${API_BASE_URL}/api/v1/addresses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user?.id,
          fullName: newObj.fullName,
          phone: newObj.phone,
          street: newObj.street,
          city: newObj.city,
          state: newObj.state,
          pincode: newObj.pincode,
        }),
      });

      if (res && res.ok) {
        const created = await res.json();
        setDbAddresses((prev) => [created, ...prev.filter((p) => p.id !== created.id)]);
        setSelectedAddrId(created.id);
      }
    } catch (err) {
      console.warn("Address save note:", err.message);
    }

    setShowAddModal(false);
    setNewStreet("");
    setSavingAddr(false);
  };

  // Order place karne ka main function - vendor aur address map karke
  const handlePlaceOrder = async () => {
    const activeRegionName = region?.name || "Varanasi";
    const activeRegionId = region?.id || "2ab0f187-d170-4432-8eef-e0ac31ed21c3";

    let targetAddr = activeAddress ? { ...activeAddress } : null;

    if (targetAddr && !isDeliverableInRegion(targetAddr, activeRegionName)) {
      targetAddr = null;
    }

    // Agar saved address nahi mila toh form ke input se address lo
    if (!targetAddr || !targetAddr.street) {
      if (!newStreet || !newStreet.trim()) {
        showAlert({
          title: "Deliverable Address Required",
          message: `Please select or add a delivery address in ${activeRegionName} to complete your order.`,
          type: "warning",
          buttonText: "Add Address",
        });
        setShowAddModal(true);
        return;
      }

      targetAddr = {
        fullName: newFullName || user?.name || "Customer",
        phone: newPhone || user?.phone || "7607650875",
        street: newStreet.trim(),
        city: activeRegionName,
        state: "Uttar Pradesh",
        pincode: newPincode || "221001",
      };
    } else {
      targetAddr = {
        ...targetAddr,
        city: targetAddr.city || activeRegionName,
      };
    }

    if (targetAddr.fullName && targetAddr.fullName.trim()) {
      maybeUpdateProfileName(targetAddr.fullName);
    }

    // Check karo ki koi item suspended vendor ka ya inactive toh nahi hai
    const hasSuspendedItems = checkoutItems.some((item) => {
      if (item.isVendorSuspended === true || item.inStock === false) return true;
      const matchedVendor = vendors.find(
        (v) => v.id === item.vendorId || (v.shopName && item.vendorName && v.shopName.toLowerCase() === item.vendorName.toLowerCase())
      );
      if (matchedVendor && matchedVendor.status === "SUSPENDED") return true;
      const matchedProd = products.find(
        (p) =>
          p.id === item.id ||
          p.id === item.productId ||
          (p.name && item.name && p.name.toLowerCase() === item.name.toLowerCase() && (p.vendorId === item.vendorId || p.vendorName === item.vendorName))
      );
      return matchedProd && (matchedProd.isVendorSuspended === true || matchedProd.vendor?.status === "SUSPENDED" || matchedProd.isActive === false);
    });

    if (hasSuspendedItems) {
      showAlert({
        title: "Order Blocked",
        message: "Your cart contains items that are currently unavailable. Please return to your cart and remove them before placing an order.",
        type: "warning",
        buttonText: "Return to Cart",
      });
      navigate("/cart");
      return;
    }

    setPlacing(true);

    const orderItems = checkoutItems.map((i) => {
      const pId = i.id || i.productId;
      const cleanName = (i.name || i.productName || "").trim().toLowerCase();

      // Agar vendorId missing hai toh product catalog me dhundo
      const catalogProd = Array.isArray(products)
        ? products.find(
            (p) =>
              p.id === pId ||
              (cleanName && p.name && p.name.trim().toLowerCase() === cleanName)
          )
        : null;

      const resolvedVendorId =
        i.vendorId ||
        catalogProd?.vendorId ||
        catalogProd?.vendor?.id ||
        catalogProd?.vendor?.userId ||
        "";

      const resolvedVendorName =
        i.vendorName ||
        catalogProd?.vendorName ||
        catalogProd?.vendor?.shopName ||
        catalogProd?.vendorInfo?.shopName ||
        "District Vendor";

      return {
        id: pId,
        productId: pId,
        name: i.name || i.productName || "Material Item",
        quantity: i.qty || i.quantity || 1,
        price: i.price || 100,
        img: i.img || i.imageUrl,
        vendorId: resolvedVendorId,
        vendorName: resolvedVendorName,
      };
    });

    // Natural loading delay taaki customer ko smooth confirmation lage
    const minDelayPromise = new Promise((resolve) => setTimeout(resolve, 1500));

    try {
      const [realOrder] = await Promise.all([
        placeOrder({
          customerId: user?.id,
          items: orderItems,
          address: targetAddr,
          total,
          deliveryFee: deliveryCharge,
          districtName: activeRegionName,
          regionId: activeRegionId,
          couponCode: appliedCoupon && couponDiscount > 0 ? appliedCoupon.code : null,
          discountAmount: couponDiscount || 0,
          useWallet: useWallet && appliedWalletDiscount > 0,
          walletDiscount: appliedWalletDiscount || 0,
        }),
        minDelayPromise,
      ]);

      if (!realOrder || (!realOrder.id && (!Array.isArray(realOrder.orders) || realOrder.orders.length === 0))) {
        throw new Error("Order not placed , please try again.");
      }

      // Real database order confirm hone par hi cart clear karo (sirf agar regular cart se checkout kiya ho)
      if (!directItem) {
        clearCart();
      }
      setSuccessOrder(realOrder);

      const customerName = targetAddr?.fullName || user?.name || "Customer";
      const displayId = formatShortId(realOrder.orderNumber || realOrder.id, "ORD");
      const orderConfirmedTotal = Number(realOrder.totalAmount || realOrder.total || total);
      addNotification({
        id: `order_confirmed_${Date.now()}`,
        title: `Order ${displayId} Confirmed!`,
        message: `Thank you ${customerName}! Your order of ₹${orderConfirmedTotal.toLocaleString("en-IN")} is placed and sent for dispatch.`,
        type: "order",
        link: `/orders`,
      });
    } catch (err) {
      console.error("Order placement error:", err);
      // Cart clear NAHI hoga taaki customer ke items cart me safe rahein
      const rawMsg = err?.message || "";
      const isNetworkIssue = rawMsg.toLowerCase().includes("failed to fetch") || rawMsg.toLowerCase().includes("network");
      const displayMsg = isNetworkIssue
        ? "Network connection issue. Order not placed , please try again."
        : rawMsg && rawMsg !== "Order placement failed on server"
        ? rawMsg
        : "Order not placed , please try again.";

      showAlert({
        title: "Order Failed",
        message: displayMsg,
        type: "error",
        buttonText: "OK",
      });
    } finally {
      setPlacing(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface pb-16">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        <h1 className="text-xl font-bold text-navy-900 mb-5">Checkout</h1>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-5">
            {/* Delivery address choose karne ka section */}
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-navy-900">
                  📍 Delivery Site Address
                </h3>
                {dbAddresses.length > 0 && (
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="text-xs font-bold text-brand-600 hover:underline cursor-pointer"
                  >
                    + Add New Address
                  </button>
                )}
              </div>

              {dbAddresses.length === 0 ? (
                <div className="bg-slate-50/80 border border-slate-200 rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-2 text-brand-700 bg-brand-50 p-2.5 rounded-lg border border-brand-200/60 mb-2">
                    <span className="text-base">📍</span>
                    <p className="text-xs font-bold">First Order: Please enter your Site Delivery Address below.</p>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-navy-900 mb-1">Full Name *</label>
                      <input
                        type="text"
                        required
                        value={newFullName}
                        onChange={(e) => setNewFullName(e.target.value)}
                        placeholder="e.g. Ramesh Kumar"
                        className="w-full bg-white text-xs border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-brand-500 font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-navy-900 mb-1">Mobile Phone *</label>
                      <input
                        type="tel"
                        required
                        maxLength={10}
                        value={newPhone}
                        onChange={(e) => setNewPhone(e.target.value.replace(/\D/g, ""))}
                        placeholder="10-digit mobile number"
                        className="w-full bg-white text-xs border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-brand-500 font-medium"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-navy-900 mb-1">Site Delivery Address / House / Plot No. *</label>
                    <input
                      type="text"
                      required
                      value={newStreet}
                      onChange={(e) => setNewStreet(e.target.value)}
                      placeholder="e.g. Plot No. 45, Near Hanuman Temple, Mirzapur Road"
                      className="w-full bg-white text-xs border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-brand-500 font-medium"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-navy-900 mb-1 flex items-center justify-between">
                        <span>District / City *</span>
                        <span className="text-[10px] text-brand-600 font-bold bg-brand-50 px-1.5 py-0.5 rounded border border-brand-200">
                          🔒 {region?.name || "Varanasi"}
                        </span>
                      </label>
                      <input
                        type="text"
                        readOnly
                        value={region?.name || newCity || "Varanasi"}
                        className="w-full bg-slate-100 text-xs border border-slate-200 rounded-xl px-3 py-2.5 outline-none font-bold text-navy-900 cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-navy-900 mb-1">Pincode *</label>
                      <input
                        type="text"
                        required
                        maxLength={6}
                        value={newPincode}
                        onChange={(e) => setNewPincode(e.target.value.replace(/\D/g, ""))}
                        placeholder="221001"
                        className="w-full bg-white text-xs border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-brand-500 font-medium"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddNewAddress}
                    disabled={savingAddr || !newStreet.trim()}
                    className="w-full mt-2 bg-brand-600 hover:bg-brand-700 active:scale-[0.98] transition-all duration-200 text-white font-bold text-xs py-3 rounded-xl shadow-xs disabled:opacity-50 cursor-pointer"
                  >
                    {savingAddr ? "Saving Address..." : "✓ Save & Select Delivery Address"}
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {dbAddresses.map((a) => {
                    const isDeliverable = isDeliverableInRegion(a, region?.name);
                    const isSelected = selectedAddrId === a.id;

                    return (
                      <div
                        key={a.id || a.street}
                        onClick={() => {
                          if (isDeliverable) setSelectedAddrId(a.id);
                        }}
                        className={`flex items-start gap-3 border rounded-xl p-3.5 transition-all ${
                          !isDeliverable
                            ? "border-slate-200 bg-slate-50/70 opacity-60 cursor-not-allowed"
                            : isSelected
                            ? "border-brand-500 bg-brand-50/60 shadow-xs cursor-pointer ring-1 ring-brand-500/20"
                            : "border-slate-200 hover:border-slate-300 bg-white cursor-pointer"
                        }`}
                      >
                        <input
                          type="radio"
                          name="address"
                          disabled={!isDeliverable}
                          checked={isSelected}
                          onChange={() => {
                            if (isDeliverable) setSelectedAddrId(a.id);
                          }}
                          className={`mt-1 h-4 w-4 ${
                            !isDeliverable ? "cursor-not-allowed opacity-40" : "accent-[#1E5FD9] cursor-pointer"
                          }`}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between flex-wrap gap-1">
                            <span className={`text-xs font-extrabold ${isDeliverable ? "text-navy-900" : "text-slate-600"}`}>
                              👤 {a.fullName || user?.name || "Customer"} · 📱 {a.phone || user?.phone || "7607650875"}
                            </span>
                            {isDeliverable ? (
                              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-md">
                                ✓ Deliverable
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold text-amber-800 bg-amber-100/90 border border-amber-300/80 px-2 py-0.5 rounded-md">
                                ⚠️ Not available for delivery in {region?.name || "Varanasi"}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-600 font-medium mt-0.5">{a.street}</p>
                          <p className="text-[11px] text-slate-500 font-semibold mt-0.5">
                            📍 {a.city}, {a.state} - {a.pincode}
                          </p>
                        </div>
                      </div>
                    );
                  })}

                  {/* Agar current district ka koi address nahi hai toh notice */}
                  {!hasDeliverableAddress && (
                    <div className="p-3.5 bg-sky-50 border border-sky-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 mt-3">
                      <div>
                        <p className="text-xs font-bold text-sky-950 flex items-center gap-1.5">
                          No deliverable address found in {region?.name || "Varanasi"}
                        </p>
                        <p className="text-[11px] text-sky-800 font-medium mt-0.5">
                          Please add a site delivery address located in {region?.name || "Varanasi"} to place this order.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowAddModal(true)}
                        className="text-xs font-bold bg-brand-600 hover:bg-brand-700 text-white px-3.5 py-2 rounded-lg shadow-xs cursor-pointer whitespace-nowrap active:scale-[0.98] transition-all"
                      >
                        + Add Address in {region?.name || "Varanasi"}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Payment method section - sirf cash on delivery */}
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <h3 className="text-sm font-bold text-navy-900 mb-3">
                Payment Method
              </h3>
              <div className="space-y-2.5">
                <label className="flex items-center gap-3 border border-brand-500 bg-brand-50 rounded-lg p-3.5 cursor-pointer">
                  <input
                    type="radio"
                    name="payment"
                    checked={true}
                    readOnly
                    className="h-4 w-4 accent-[#1E5FD9]"
                  />
                  <div>
                    <span className="text-xs font-extrabold text-navy-900 block">
                      💵 Cash on Delivery (Pay on Site Arrival)
                    </span>
                    <span className="text-[11px] font-medium text-slate-500">
                      Pay cash to driver upon inspecting delivered materials at construction site.
                    </span>
                  </div>
                </label>
              </div>
            </div>

            {/* Promo / Coupon Code Section */}
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <h3 className="text-sm font-bold text-navy-900 mb-2 flex items-center justify-between">
                <span>🏷️ Have a Coupon / Promo Code?</span>
                {appliedCoupon && couponDiscount > 0 && (
                  <span className="text-[11px] text-emerald-600 font-bold">✓ Coupon Applied</span>
                )}
              </h3>
              {appliedCoupon && couponDiscount > 0 ? (
                <div className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <div>
                    <span className="text-xs font-black text-emerald-800 tracking-wide uppercase font-mono">{appliedCoupon.code}</span>
                    <p className="text-[11px] text-emerald-600 font-medium">₹{couponDiscount.toLocaleString("en-IN")} discount applied to your order</p>
                  </div>
                  <button
                    type="button"
                    onClick={removeCoupon}
                    className="text-xs font-bold text-red-600 hover:text-red-800 bg-white border border-red-200 px-2.5 py-1 rounded-lg cursor-pointer transition-colors"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div>
                  <form onSubmit={handleApplyCheckoutCoupon} className="flex gap-2">
                    <input
                      type="text"
                      value={checkoutCouponCode}
                      onChange={(e) => {
                        setCheckoutCouponCode(e.target.value.toUpperCase());
                        setCouponError("");
                      }}
                      placeholder="e.g. BUILDCITY100"
                      className="flex-1 text-xs border border-slate-200 rounded-lg px-3 py-2 uppercase font-mono font-bold tracking-wider outline-none focus:border-brand-500"
                    />
                    <button
                      type="submit"
                      className="bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold px-4 py-2 rounded-lg cursor-pointer transition-all active:scale-95"
                    >
                      Apply
                    </button>
                  </form>
                  {couponError && (
                    <p className="text-[11px] text-red-600 font-medium mt-1.5">{couponError}</p>
                  )}
                </div>
              )}
            </div>

            {/* Order me add kiye gaye items */}
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <h3 className="text-sm font-bold text-navy-900 mb-3">
                Order Items ({checkoutItems.length})
              </h3>
              <div className="space-y-3">
                {checkoutItems.map((item) => (
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
                      <p className="text-xs text-slate-400">Qty: {item.qty || item.quantity || 1}</p>
                    </div>
                    <span className="text-sm font-semibold text-navy-900">
                      ₹{((item.price || 0) * (item.qty || item.quantity || 1)).toLocaleString("en-IN")}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Order ka amount summary */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 h-fit sm:sticky sm:top-20">
            <h3 className="text-sm font-bold text-navy-900 mb-3">
              Order Summary
            </h3>

            {/* BuildCity Wallet Redemption Option */}
            {walletRedeemEnabled && walletBalance > 0 && maxWalletApplicable > 0 && (
              <div className="mb-3.5 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/90 rounded-xl p-3 shadow-2xs">
                <label className="flex items-start gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={useWallet}
                    onChange={(e) => setUseWallet(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded accent-brand-600 text-brand-600 focus:ring-brand-500 border-amber-300 cursor-pointer"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-extrabold text-xs text-navy-950 flex items-center gap-1">
                        <span>💰 Use BuildCity Wallet</span>
                      </span>
                      <span className="text-[10px] font-black text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded-full border border-amber-200">
                        ₹{walletBalance.toLocaleString("en-IN")} Bal
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 font-medium mt-0.5 leading-snug">
                      {useWallet
                        ? `Applying ₹${appliedWalletDiscount.toLocaleString("en-IN")} discount on this order`
                        : `Apply ₹${maxWalletApplicable.toLocaleString("en-IN")} from your wallet`}
                    </p>
                    <p className="text-[9.5px] text-slate-400 mt-0.5">
                      (Max {walletSettings.maxWalletUsagePercent || 10}% / ₹{walletSettings.maxWalletUsageFlat || 500} per order)
                    </p>
                  </div>
                </label>
              </div>
            )}

            {/* Free Delivery Threshold Goal Tracker */}
            {isFreeDeliveryProgramActive && (
              <div className={`rounded-xl p-3 border mb-3 transition-all ${
                isFreeDelivery 
                  ? "bg-gradient-to-r from-emerald-50 to-teal-50/50 border-emerald-200 text-emerald-950 shadow-2xs" 
                  : "bg-gradient-to-r from-sky-50 to-blue-50 border-sky-200 text-slate-800 shadow-2xs"
              }`}>
                <div className="flex items-center justify-between gap-2 text-xs font-black mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm">🚚</span>
                    <span className="tracking-tight">
                      {isFreeDelivery ? "FREE District Delivery Unlocked!" : `Free Delivery on orders above ₹${freeDeliveryThreshold.toLocaleString("en-IN")}`}
                    </span>
                  </div>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0 ${
                    isFreeDelivery ? "bg-emerald-600 text-white" : "bg-sky-600 text-white"
                  }`}>
                    {isFreeDelivery ? "UNLOCKED" : `${freeDeliveryProgress}%`}
                  </span>
                </div>
                {!isFreeDelivery ? (
                  <>
                    <div className="w-full bg-sky-200/80 rounded-full h-1.5 overflow-hidden mb-1.5">
                      <div 
                        className="bg-brand-600 h-1.5 rounded-full transition-all duration-300"
                        style={{ width: `${freeDeliveryProgress}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-slate-600 font-semibold leading-snug">
                      Add <strong className="text-brand-600 font-extrabold">₹{remainingForFreeDelivery.toLocaleString("en-IN")}</strong> more materials to get <strong className="text-emerald-700 font-extrabold">100% Free District Delivery</strong>.
                    </p>
                  </>
                ) : (
                  <p className="text-[11px] text-emerald-800 font-bold flex items-center gap-1">
                    <span>✓</span>
                    <span>District delivery fee (₹{baseDeliveryFee}) is 100% free for this order!</span>
                  </p>
                )}
              </div>
            )}

            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-slate-500">
                <span>Total MRP</span>
                <span>₹{checkoutMrpTotal.toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between text-success">
                <span>Discount</span>
                <span>− ₹{(checkoutMrpTotal - checkoutSubtotal).toLocaleString("en-IN")}</span>
              </div>
              {appliedCoupon && couponDiscount > 0 && (
                <div className="flex justify-between items-center text-emerald-700 bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-200">
                  <span className="font-extrabold text-xs">🏷️ Coupon ({appliedCoupon.code})</span>
                  <span className="font-black">− ₹{couponDiscount.toLocaleString("en-IN")}</span>
                </div>
              )}
              {useWallet && appliedWalletDiscount > 0 && (
                <div className="flex justify-between items-center text-amber-800 bg-amber-50 px-2.5 py-1.5 rounded-lg border border-amber-200">
                  <span className="font-extrabold text-xs">💰 Wallet Balance</span>
                  <span className="font-black">− ₹{appliedWalletDiscount.toLocaleString("en-IN")}</span>
                </div>
              )}
              <div className="flex justify-between items-center text-slate-500">
                <div className="flex flex-col">
                  <span>Delivery Fee</span>
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
              <div className="h-px bg-slate-100 my-2" />
              <div className="flex justify-between text-base font-bold text-navy-900">
                <span>Total</span>
                <span>₹{total.toLocaleString("en-IN")}</span>
              </div>
            </div>

            <button
              onClick={handlePlaceOrder}
              disabled={placing}
              className="w-full mt-4 bg-brand-600 hover:bg-brand-700 active:scale-[0.98] text-white text-sm font-bold rounded-xl py-3.5 shadow-md transition-all cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {placing ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                  <span>⚡ Placing Order & Dispatching...</span>
                </>
              ) : (
                "Place Order (Cash on Delivery)"
              )}
            </button>

            {placing && (
              <p className="text-[11px] text-brand-600 font-bold text-center mt-2 animate-pulse">
                Processing site delivery dispatch... Please wait.
              </p>
            )}
          </div>
        </div>
      </main>

      {/* Naya address add karne ka modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="font-extrabold text-navy-900 text-base">📍 Add Delivery Address</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-navy-900 font-bold">✕</button>
            </div>

            <form onSubmit={handleAddNewAddress} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  placeholder="e.g. Rahul Kumar"
                  className="w-full border border-slate-200 rounded-lg p-2.5 outline-none focus:border-brand-500 font-medium"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Mobile Number</label>
                <input
                  type="tel"
                  required
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="10-digit mobile number"
                  className="w-full border border-slate-200 rounded-lg p-2.5 outline-none focus:border-brand-500 font-medium"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Street / House / Site Location</label>
                <input
                  type="text"
                  required
                  value={newStreet}
                  onChange={(e) => setNewStreet(e.target.value)}
                  placeholder="e.g. Plot No 45, BHU Lanka Road"
                  className="w-full border border-slate-200 rounded-lg p-2.5 outline-none focus:border-brand-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    District / City <span className="text-[10px] text-brand-600 font-semibold">(Selected Region)</span>
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={region?.name || newCity || "Varanasi"}
                    className="w-full border border-slate-200 bg-slate-50 text-slate-700 font-bold rounded-lg p-2.5 outline-none cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Pincode</label>
                  <input
                    type="text"
                    required
                    value={newPincode}
                    onChange={(e) => setNewPincode(e.target.value)}
                    placeholder="221001"
                    className="w-full border border-slate-200 rounded-lg p-2.5 outline-none focus:border-brand-500 font-medium"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 bg-slate-100 text-slate-700 font-bold py-2.5 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingAddr}
                  className="flex-1 bg-brand-600 hover:bg-brand-700 active:scale-[0.98] transition-all text-white font-bold py-2.5 rounded-xl shadow-xs disabled:opacity-60 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {savingAddr ? (
                    <>
                      <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                      </svg>
                      <span>Saving...</span>
                    </>
                  ) : (
                    "✓ Save Address"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Order success screen modal */}
      {successOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-emerald-100 text-center relative overflow-hidden animate-in zoom-in-95 duration-300">
            {/* Top background glow */}
            <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-64 bg-emerald-400/20 rounded-full blur-3xl pointer-events-none" />

            {/* Success checkmark badge */}
            <div className="relative mx-auto mb-4 w-20 h-20 rounded-full bg-emerald-50 border-4 border-emerald-100 flex items-center justify-center shadow-lg shadow-emerald-500/10">
              <div className="w-12 h-12 rounded-full bg-emerald-500 text-white flex items-center justify-center text-2xl font-black shadow-md animate-bounce">
                ✓
              </div>
            </div>

            <span className="inline-block text-xs font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full uppercase tracking-wider mb-2">
              Order Confirmed & Placed
            </span>

            <h2 className="text-2xl font-black text-navy-900 tracking-tight mb-1">
              Thank You For Your Order!
            </h2>
            <p className="text-xs text-slate-500 font-medium mb-5">
              {successOrder.isMultiVendor && Array.isArray(successOrder.orders) && successOrder.orders.length > 1
                ? `Your order has been split into ${successOrder.orders.length} vendor dispatch packages for immediate site delivery.`
                : "Your construction material order has been confirmed for immediate site delivery."}
            </p>

            {/* Order ki details ka card */}
            <div className="bg-slate-50/90 rounded-2xl p-4 border border-slate-200/80 text-left space-y-3 mb-6 shadow-2xs">
              {successOrder.isMultiVendor && Array.isArray(successOrder.orders) && successOrder.orders.length > 1 ? (
                <div className="space-y-2 pb-2.5 border-b border-slate-200/80">
                  <span className="text-[10.5px] font-extrabold text-slate-500 uppercase tracking-wider block">
                    Dispatched Packages ({successOrder.orders.length}):
                  </span>
                  {successOrder.orders.map((subOrd, idx) => (
                    <div
                      key={subOrd.id || idx}
                      className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-slate-200/90 shadow-2xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-brand-700 font-mono bg-brand-50 border border-brand-200/60 px-2 py-0.5 rounded-md">
                          {formatShortId(subOrd.id, "ORD")}
                        </span>
                        <span className="text-xs font-bold text-navy-900">
                          {subOrd.items?.length || 1} {(subOrd.items?.length === 1 ? "item" : "items")}
                        </span>
                      </div>
                      <span className="text-xs font-black text-navy-900">
                        ₹{Number(subOrd.totalAmount || subOrd.total || 0).toLocaleString("en-IN")}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-between pb-2.5 border-b border-slate-200/80">
                  <span className="text-xs font-bold text-slate-500">Order ID:</span>
                  <span className="text-xs font-black text-brand-700 font-mono bg-brand-50 border border-brand-200/60 px-2.5 py-0.5 rounded-md">
                    {formatShortId(successOrder.id, "ORD")}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between pb-2.5 border-b border-slate-200/80">
                <span className="text-xs font-bold text-slate-500">Total Amount:</span>
                <span className="text-sm font-black text-navy-900">
                  ₹{Number(successOrder.total || total).toLocaleString("en-IN")}
                </span>
              </div>

              <div className="flex items-center justify-between pb-2.5 border-b border-slate-200/80">
                <span className="text-xs font-bold text-slate-500">Payment:</span>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                  💵 Cash on Delivery (Pay on Site)
                </span>
              </div>

              <div>
                <span className="text-xs font-bold text-slate-500 block mb-1">📍 Site Delivery Destination:</span>
                <p className="text-xs font-bold text-navy-900">
                  {successOrder.address?.fullName || user?.name || "Customer"} · {successOrder.address?.phone || user?.phone}
                </p>
                <p className="text-xs text-slate-600 font-medium mt-0.5">
                  {successOrder.address?.street || successOrder.address?.line}, {successOrder.address?.city}
                </p>
              </div>
            </div>

            {/* Order track karne ke buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() =>
                  navigate(
                    successOrder.isMultiVendor && Array.isArray(successOrder.orders) && successOrder.orders.length > 1
                      ? "/orders"
                      : `/orders/${successOrder.id}`,
                    { replace: true }
                  )
                }
                className="flex-1 bg-brand-600 hover:bg-brand-700 active:scale-[0.98] transition-all duration-200 text-white font-black text-xs py-3.5 rounded-xl shadow-md cursor-pointer flex items-center justify-center gap-2"
              >
                <span>🚚</span>
                <span>
                  {successOrder.isMultiVendor && Array.isArray(successOrder.orders) && successOrder.orders.length > 1
                    ? `Track All Packages (${successOrder.orders.length})`
                    : "Track Live Order Status"}
                </span>
              </button>
              <button
                onClick={() => navigate("/", { replace: true })}
                className="sm:w-36 bg-slate-100 hover:bg-slate-200 active:scale-[0.98] transition-all text-slate-700 font-bold text-xs py-3.5 rounded-xl cursor-pointer"
              >
                Continue Shopping
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}