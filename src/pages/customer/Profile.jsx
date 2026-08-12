import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "../../components/Navbar";
import BottomNav from "../../components/BottomNav";
import { useAuth } from "../../context/AuthContext";
import { useOrders } from "../../context/OrderContext";
import { useAddresses } from "../../context/AddressContext";

const accountLinks = [
  { label: "My Orders", icon: "📋", to: "/orders" },
  { label: "My Addresses", icon: "📍", to: "/addresses" },
];

const supportLinks = [
  { label: "Contact Us", icon: "🎧" },
  { label: "About Build City", icon: "ℹ️" },
  { label: "Rate this App", icon: "⭐" },
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
    <div className="min-h-screen bg-surface pb-20">
      <Navbar />

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-6">
        {/* Profile card  Hai */}
        <div className="relative overflow-hidden rounded-2xl bg-navy-900 px-5 pt-6 pb-14 mb-[-40px]">
          <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-brand-500/20 blur-3xl" />
          <div className="relative z-10 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-white/20 flex items-center justify-center text-2xl font-bold text-white shrink-0">
                {user?.name?.[0]?.toUpperCase() || "U"}
              </div>
              <div>
                <h1 className="text-white text-lg font-bold capitalize">
                  {user?.name}
                </h1>
                <p className="text-white/60 text-sm">{user?.email}</p>
                <span className="inline-flex items-center gap-1 mt-1 text-[11px] font-medium text-white bg-white/15 px-2 py-0.5 rounded-full">
                  ✓ Verified User
                </span>
              </div>
            </div>
            <button
              onClick={() => setEditing((v) => !v)}
              className="text-xs font-semibold text-white bg-white/15 px-3 py-1.5 rounded-lg shrink-0"
            >
              {editing ? "Cancel" : "Edit Profile"}
            </button>
          </div>
        </div>

        {editing && (
          <form
            onSubmit={handleSave}
            className="relative z-10 bg-white rounded-2xl border border-slate-200 shadow-sm p-4 mb-6 space-y-3"
          >
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                Full Name
              </label>
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2.5 outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                Email
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2.5 outline-none focus:border-brand-500"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-brand-500 text-white text-sm font-semibold rounded-lg py-2.5"
            >
              Save Changes
            </button>
          </form>
        )}

        {/* Stats card */}
        {!editing && (
          <div className="relative z-10 bg-white rounded-2xl border border-slate-200 shadow-sm grid grid-cols-3 divide-x divide-slate-100 mb-6">
            {[
              { label: "Wallet", value: "₹0" },
              { label: "Addresses", value: String(addresses.length) },
              { label: "Orders", value: String(orders.length) },
            ].map((s) => (
              <div key={s.label} className="text-center py-3.5 px-1">
                <div className="text-sm font-bold text-navy-900">{s.value}</div>
                <div className="text-[10px] text-slate-500 leading-tight mt-0.5">
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* My Account */}
        <section className="mb-6">
          <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-2 px-1">
            My Account
          </h2>
          <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
            {accountLinks.map((l) => (
              <Link
                key={l.label}
                to={l.to}
                className="flex items-center gap-3 px-4 py-3.5 hover:bg-surface"
              >
                <span className="text-lg">{l.icon}</span>
                <span className="flex-1 text-sm font-medium text-navy-900">
                  {l.label}
                </span>
                <span className="text-slate-300">›</span>
              </Link>
            ))}
          </div>
        </section>

        {/* Support */}
        <section className="mb-6">
          <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-2 px-1">
            Support & Info
          </h2>
          <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
            {supportLinks.map((l) => (
              <button
                key={l.label}
                className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-surface text-left"
              >
                <span className="text-lg">{l.icon}</span>
                <span className="flex-1 text-sm font-medium text-navy-900">
                  {l.label}
                </span>
                <span className="text-slate-300">›</span>
              </button>
            ))}
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-red-50 text-left"
            >
              <span className="text-lg">🚪</span>
              <span className="flex-1 text-sm font-medium text-red-500">
                Logout
              </span>
            </button>
          </div>
        </section>
      </main>

     
    </div>
  );
}