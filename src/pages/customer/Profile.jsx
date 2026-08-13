import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "../../components/Navbar";
import { useAuth } from "../../context/AuthContext";
import { useOrders } from "../../context/OrderContext";
import { useAddresses } from "../../context/AddressContext";

const accountLinks = [
  { label: "My District Orders", icon: "📋", to: "/orders", sub: "Track order status & history" },
  { label: "Delivery Addresses", icon: "📍", to: "/addresses", sub: "Manage delivery locations" },
  { label: "My Coupons & Offers", icon: "🏷️", to: "/cart", sub: "BUILDCITY100, SUPER500 & active promos" },
];

const supportLinks = [
  { label: "24/7 District Support", icon: "🎧", sub: "Call or WhatsApp support team" },
  { label: "About Build City", icon: "ℹ️", sub: "Platform terms & GST info" },
];

export default function Profile() {
  const { user, logout, updateProfile } = useAuth();
  const { orders } = useOrders();
  const { addresses } = useAddresses();
  const navigate = useNavigate();

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: user?.name || "", email: user?.email || "" });

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleSave = (e) => {
    e.preventDefault();
    updateProfile(form);
    setEditing(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-navy-900 pb-24 sm:pb-12 font-sans">
      <Navbar />

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Profile ha header Card */}
        <div className="relative overflow-hidden rounded-2xl bg-navy-950 p-6 text-white shadow-md border border-slate-800">
          <div className="relative z-10 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-2xl bg-brand-500 text-white font-black text-2xl flex items-center justify-center shadow-md shrink-0 border border-brand-400">
                {user?.name?.[0]?.toUpperCase() || "U"}
              </div>
              <div>
                <span className="bg-green-500/20 text-green-300 border border-green-500/30 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full inline-block mb-1">
                  ✓ VERIFIED CUSTOMER
                </span>
                <h1 className="text-white text-lg font-black tracking-tight leading-none capitalize">
                  {user?.name || "Customer Account"}
                </h1>
                <p className="text-slate-300 text-xs mt-1">📱 {user?.phone || "Phone verified"}</p>
                {user?.email && <p className="text-slate-400 text-[11px]">✉️ {user.email}</p>}
              </div>
            </div>

            <button
              onClick={() => setEditing((v) => !v)}
              className="text-xs font-bold text-white bg-white/10 hover:bg-white/20 border border-white/15 px-3.5 py-2 rounded-xl shrink-0 transition-colors cursor-pointer"
            >
              {editing ? "Cancel" : "✏️ Edit"}
            </button>
          </div>
        </div>

        {/* Edit kar sako */}
        {editing && (
          <form
            onSubmit={handleSave}
            className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4"
          >
            <h3 className="font-extrabold text-navy-900 text-sm border-b border-slate-100 pb-2">Edit Account Information</h3>
            <div>
              <label className="block text-xs font-bold text-navy-900 mb-1">
                Full Name *
              </label>
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full text-xs font-medium border border-slate-200 rounded-xl px-3.5 py-2.5 outline-none focus:border-brand-500 bg-slate-50"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-navy-900 mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className="w-full text-xs font-medium border border-slate-200 rounded-xl px-3.5 py-2.5 outline-none focus:border-brand-500 bg-slate-50"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold rounded-xl py-3 shadow-xs transition-colors cursor-pointer"
            >
              Save Profile Changes
            </button>
          </form>
        )}

        {/* Stats dekhata hai  */}
        {!editing && (
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white rounded-2xl border border-slate-200 p-4 text-center shadow-xs">
              <p className="text-lg font-black text-navy-900">₹0</p>
              <p className="text-[11px] font-medium text-slate-500 mt-0.5">Wallet Balance</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-4 text-center shadow-xs">
              <p className="text-lg font-black text-brand-600">3 Active</p>
              <p className="text-[11px] font-medium text-slate-500 mt-0.5">Coupons Available</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-4 text-center shadow-xs">
              <p className="text-lg font-black text-navy-900">{orders.length}</p>
              <p className="text-[11px] font-medium text-slate-500 mt-0.5">Total Orders</p>
            </div>
          </div>
        )}

        {/* My Account Links hai ye jo account deatils dekhata hia  */}
        <section className="space-y-2">
          <h2 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider px-1">
            My Account & Activity
          </h2>
          <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100 shadow-xs overflow-hidden">
            {accountLinks.map((l) => (
              <Link
                key={l.label}
                to={l.to}
                className="flex items-center gap-3.5 px-4 py-3.5 hover:bg-slate-50 transition-colors group"
              >
                <span className="text-xl bg-slate-100 p-2 rounded-xl group-hover:bg-brand-50 transition-colors">{l.icon}</span>
                <div className="flex-1">
                  <p className="text-xs font-bold text-navy-900 group-hover:text-brand-600 transition-colors">
                    {l.label}
                  </p>
                  <p className="text-[11px] text-slate-400">{l.sub}</p>
                </div>
                <span className="text-slate-400 group-hover:text-brand-600 font-bold transition-colors">→</span>
              </Link>
            ))}
          </div>
        </section>

        {/* Support & Account Actions */}
        <section className="space-y-2">
          <h2 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider px-1">
            Support & Account
          </h2>
          <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100 shadow-xs overflow-hidden">
            {supportLinks.map((l) => (
              <div
                key={l.label}
                className="flex items-center gap-3.5 px-4 py-3.5 hover:bg-slate-50 transition-colors cursor-pointer group"
              >
                <span className="text-xl bg-slate-100 p-2 rounded-xl">{l.icon}</span>
                <div className="flex-1">
                  <p className="text-xs font-bold text-navy-900 group-hover:text-brand-600 transition-colors">
                    {l.label}
                  </p>
                  <p className="text-[11px] text-slate-400">{l.sub}</p>
                </div>
                <span className="text-slate-400 font-bold">→</span>
              </div>
            ))}
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3.5 px-4 py-3.5 hover:bg-red-50 transition-colors text-left cursor-pointer group"
            >
              <span className="text-xl bg-red-50 p-2 rounded-xl text-red-600">🚪</span>
              <div className="flex-1">
                <p className="text-xs font-extrabold text-red-600">
                  Logout Account
                </p>
                <p className="text-[11px] text-red-400">Sign out from this device</p>
              </div>
              <span className="text-red-400 font-bold">→</span>
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}