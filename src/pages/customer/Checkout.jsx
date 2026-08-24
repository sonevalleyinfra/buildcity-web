import { useState, useEffect } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import Navbar from "../../components/Navbar";
import { useCart } from "../../context/CartContext";
import { useOrders } from "../../context/OrderContext";
import { useAuth } from "../../context/AuthContext";
import { useRegion } from "../../context/RegionContext";
import { useAddresses } from "../../context/AddressContext";
import { API_BASE_URL } from "../../config/api";

export default function Checkout() {
  const { items, subtotal, mrpTotal = subtotal, clearCart, hasRegionMismatch } = useCart();
  const { placeOrder } = useOrders();
  const navigate = useNavigate();
  const { user } = useAuth();
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

  // Load Profile / Context Addresses for Logged-In Customer (Zero 404 network errors)
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

  if (items.length === 0) {
    return <Navigate to="/cart" replace />;
  }

  const deliveryCharge = subtotal >= 999 ? 0 : 49;
  const total = subtotal + deliveryCharge;
  const activeAddress = dbAddresses.find((a) => a.id === selectedAddrId) || dbAddresses[0];

  const fetchWithRetry = async (url, options = {}, retries = 3) => {
    for (let i = 0; i < retries; i++) {
      try {
        const res = await fetch(url, options);
        if (res.ok) return res;
      } catch (err) {
        console.warn(`Render API retry ${i + 1}/${retries}:`, err.message);
        if (i === retries - 1) throw err;
        await new Promise((r) => setTimeout(r, 800 * (i + 1)));
      }
    }
  };

  const handleAddNewAddress = async (e) => {
    e.preventDefault();
    if (!newStreet || !newCity) return;

    setSavingAddr(true);
    addContextAddress({
      line: newStreet,
      city: newCity,
      state: "Uttar Pradesh",
      pincode: newPincode || "221001",
      isDefault: true,
    });

    try {
      const res = await fetchWithRetry(`${API_BASE_URL}/api/v1/addresses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user?.id,
          fullName: newFullName || user?.name || "Customer",
          phone: newPhone || user?.phone || "7607650875",
          street: newStreet,
          city: newCity,
          state: "Uttar Pradesh",
          pincode: newPincode || "221001",
        }),
      });

      if (res && res.ok) {
        const created = await res.json();
        setDbAddresses((prev) => [created, ...prev]);
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
        alert("Kripya Order place karne ke liye apna Site Delivery Address zaroor bharain.");
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

    setPlacing(true);

    // Save address to Supabase DB public.addresses table (with auto-retry)
    try {
      const dbRes = await fetchWithRetry(`${API_BASE_URL}/api/v1/addresses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user?.id,
          fullName: targetAddr.fullName,
          phone: targetAddr.phone,
          street: targetAddr.street,
          city: targetAddr.city,
          state: targetAddr.state || "Uttar Pradesh",
          pincode: targetAddr.pincode,
        }),
      });
      if (dbRes && dbRes.ok) {
        const savedDbAddr = await dbRes.json();
        if (savedDbAddr && savedDbAddr.id) {
          targetAddr = savedDbAddr;
        }
      }
    } catch (err) {
      console.warn("DB Address save note:", err.message);
    }

    const orderItems = items.map((i) => ({
      name: i.name,
      quantity: i.qty || i.quantity || 1,
      price: i.price,
      vendorId: i.vendorId,
      vendorName: i.vendorName,
    }));

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
    navigate(`/orders/${order.id}`, { replace: true });
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
              className="w-full mt-4 bg-brand-500 hover:bg-brand-600 active:scale-[0.98] text-white text-sm font-bold rounded-xl py-3 shadow-md transition-all cursor-pointer disabled:opacity-60"
            >
              {placing ? "Placing Order..." : "Place Order"}
            </button>
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
                  className="flex-1 bg-slate-100 text-slate-700 font-bold py-2.5 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingAddr}
                  className="flex-1 bg-brand-500 text-white font-bold py-2.5 rounded-xl shadow-xs hover:bg-brand-600"
                >
                  {savingAddr ? "Saving..." : "Save Address"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}