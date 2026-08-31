import { authFetch } from "../../config/authFetch";
import { useState, useEffect } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import Navbar from "../../components/Navbar";
import { useCart } from "../../context/CartContext";
import { useOrders } from "../../context/OrderContext";
import { useAuth } from "../../context/AuthContext";
import { useRegion } from "../../context/RegionContext";
import { useAddresses } from "../../context/AddressContext";
import { useAlert } from "../../context/AlertContext";
import { useNotifications } from "../../context/NotificationContext";
import { API_BASE_URL } from "../../config/api";
import { formatShortId } from "../../utils/formatId";

export default function Checkout() {
  const { items, subtotal, mrpTotal = subtotal, clearCart, hasRegionMismatch } = useCart();
  const { placeOrder } = useOrders();
  const { showAlert } = useAlert();
  const { addNotification } = useNotifications();
  const navigate = useNavigate();
  const { user, updateProfile } = useAuth();
  const { region } = useRegion();
  const { addresses: contextAddresses = [], addAddress: addContextAddress } = useAddresses();

  const [dbAddresses, setDbAddresses] = useState([]);
  const [selectedAddrId, setSelectedAddrId] = useState("");
  const [payment, setPayment] = useState("cod");
  const [placing, setPlacing] = useState(false);

  // New Address Form Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newFullName, setNewFullName] = useState(user?.name || "");
  const [newPhone, setNewPhone] = useState(user?.phone || "");
  const [newStreet, setNewStreet] = useState("");
  const [newCity, setNewCity] = useState(region?.name || "Varanasi");
  const [newPincode, setNewPincode] = useState("221001");
  const [savingAddr, setSavingAddr] = useState(false);

  const [successOrder, setSuccessOrder] = useState(null);

  // Auto-update profile name if current name is missing, default, or placeholder
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
      console.log("👤 Auto-updating customer profile name to:", clean);
      updateProfile({ name: clean }).catch(() => null);
    }
  };

  // Load Profile / Context Addresses for Logged-In Customer (Zero 404 network errors & zero flickering)
  useEffect(() => {
    const cleanContext = (contextAddresses || []).map((ca) => ({
      id: ca.id || "addr_" + Date.now(),
      fullName: ca.fullName || user?.name || "Customer",
      phone: ca.phone || user?.phone || "",
      street: ca.line || ca.street || "",
      city: ca.city || region?.name || "Mirzapur",
      state: ca.state || "Uttar Pradesh",
      pincode: ca.pincode || "221001",
    })).filter((a) => a.street && a.street.trim().length > 0 && !a.street.includes("Lanka Road") && !a.street.includes("House No. 12"));

    if (user?.address && user.address.trim().length > 0 && !user.address.includes("Lanka Road")) {
      cleanContext.unshift({
        id: "addr_profile",
        fullName: user.name || "Customer",
        phone: user.phone || "",
        street: user.address,
        city: region?.name || "Mirzapur",
        state: "Uttar Pradesh",
        pincode: "221001",
      });
    }

    const uniqueAddrs = Array.from(new Map(cleanContext.map((a) => [a.id || a.street, a])).values());

    setDbAddresses(uniqueAddrs);
    if (uniqueAddrs.length > 0) {
      if (!selectedAddrId) setSelectedAddrId(uniqueAddrs[0].id);
    } else {
      setSelectedAddrId("");
    }
  }, [user, contextAddresses, region]);

  if (items.length === 0 && !successOrder) {
    return <Navigate to="/cart" replace />;
  }

  const baseDeliveryFee = Number(region?.baseDeliveryCharge) || 49;
  const deliveryCharge = subtotal >= 25000 ? 0 : baseDeliveryFee;
  const total = subtotal + deliveryCharge;
  const activeAddress = dbAddresses.find((a) => a.id === selectedAddrId) || dbAddresses[0];

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

  // Order place - vendorId & vendorName strictly mapped with mandatory address DB insertion
  const handlePlaceOrder = async () => {
    let targetAddr = activeAddress;

    // If no saved address selected, check inline form fields
    if (!targetAddr || !targetAddr.street) {
      if (!newStreet || !newStreet.trim()) {
        showAlert({
          title: "📍 Delivery Address Required",
          message: "Please enter your Site Delivery Address to complete your order.",
          type: "warning",
          buttonText: "Fill Address",
        });
        return;
      }

      targetAddr = {
        fullName: newFullName || user?.name || "Customer",
        phone: newPhone || user?.phone || "7607650875",
        street: newStreet,
        city: newCity || region?.name || "Mirzapur",
        state: "Uttar Pradesh",
        pincode: newPincode || "221001",
      };
    }

    if (targetAddr.fullName && targetAddr.fullName.trim()) {
      maybeUpdateProfileName(targetAddr.fullName);
    }

    setPlacing(true);

    const orderItems = items.map((i) => ({
      name: i.name || i.productName || "Material Item",
      quantity: i.qty || i.quantity || 1,
      price: i.price || 100,
      vendorId: i.vendorId,
      vendorName: i.vendorName,
    }));

    try {
      const order = await placeOrder({
        customerId: user?.id,
        items: orderItems,
        address: targetAddr,
        total,
        districtName: targetAddr?.city || region?.name || "Mirzapur",
        regionId: region?.id || "mirzapur",
      });

      clearCart();
      setPlacing(false);
      setSuccessOrder(order);

      // Trigger interactive real-time notification
      addNotification({
        title: "Order Placed Successfully! 📦",
        message: `Order #${formatShortId(order.id, "ORD")} confirmed. Pay ₹${Number(order.total || total).toLocaleString("en-IN")} on site arrival.`,
        type: "order",
        link: `/orders/${order.id}`,
      });
    } catch (err) {
      setPlacing(false);
      showAlert({
        title: "⚠️ Order Creation Notice",
        message: err.message || "Failed to place order.",
        type: "warning",
        buttonText: "Understood",
      });
    }
  };

  return (
    <div className="min-h-screen bg-surface pb-16">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        <h1 className="text-xl font-bold text-navy-900 mb-5">Checkout</h1>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-5">
            {/* Address Selection Section */}
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
                      <label className="block text-xs font-bold text-navy-900 mb-1">District / City *</label>
                      <input
                        type="text"
                        required
                        value={newCity}
                        onChange={(e) => setNewCity(e.target.value)}
                        className="w-full bg-white text-xs border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-brand-500 font-bold"
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
                  {dbAddresses.map((a) => (
                    <label
                      key={a.id || a.street}
                      className={`flex items-start gap-3 border rounded-lg p-3 cursor-pointer ${
                        selectedAddrId === a.id
                          ? "border-brand-500 bg-brand-50"
                          : "border-slate-200"
                      }`}
                    >
                      <input
                        type="radio"
                        name="address"
                        checked={selectedAddrId === a.id}
                        onChange={() => setSelectedAddrId(a.id)}
                        className="mt-1 h-4 w-4 accent-[#1E5FD9]"
                      />
                      <div>
                        <span className="text-xs font-extrabold text-navy-900">
                          👤 {a.fullName || user?.name || "Customer"} · 📱 {a.phone || user?.phone || "7607650875"}
                        </span>
                        <p className="text-xs text-slate-600 font-medium mt-0.5">{a.street}</p>
                        <p className="text-[11px] text-slate-500 font-semibold">{a.city}, {a.state} - {a.pincode}</p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Payment ka hai — ONLY Cash on Delivery */}
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
              <p className="text-[11px] text-amber-600 font-bold text-center mt-2 animate-pulse">
                ⏳ Processing site delivery dispatch... Please wait.
              </p>
            )}
          </div>
        </div>
      </main>

      {/* Add New Address Modal */}
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
                  <label className="font-bold text-slate-700 block mb-1">District / City</label>
                  <input
                    type="text"
                    required
                    value={newCity}
                    onChange={(e) => setNewCity(e.target.value)}
                    className="w-full border border-slate-200 rounded-lg p-2.5 outline-none focus:border-brand-500 font-medium"
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

      {/* Modern Order Success Celebration Screen / Modal */}
      {successOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-emerald-100 text-center relative overflow-hidden animate-in zoom-in-95 duration-300">
            {/* Ambient Top Glow */}
            <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-64 bg-emerald-400/20 rounded-full blur-3xl pointer-events-none" />

            {/* Success Checkmark Badge */}
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
              Your construction material order has been dispatched to district vendors for immediate site delivery.
            </p>

            {/* Order Details Card */}
            <div className="bg-slate-50/90 rounded-2xl p-4 border border-slate-200/80 text-left space-y-3 mb-6 shadow-2xs">
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-200/80">
                <span className="text-xs font-bold text-slate-500">Order ID:</span>
                <span className="text-xs font-black text-brand-700 font-mono bg-brand-50 border border-brand-200/60 px-2.5 py-0.5 rounded-md">
                  {formatShortId(successOrder.id, "ORD")}
                </span>
              </div>

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

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => navigate(`/orders/${successOrder.id}`, { replace: true })}
                className="flex-1 bg-brand-600 hover:bg-brand-700 active:scale-[0.98] transition-all duration-200 text-white font-black text-xs py-3.5 rounded-xl shadow-md cursor-pointer flex items-center justify-center gap-2"
              >
                <span>🚚</span>
                <span>Track Live Order Status</span>
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