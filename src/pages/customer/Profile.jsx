import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "../../components/Navbar";
import NotificationPanel from "../../components/NotificationPanel";
import { useAuth } from "../../context/AuthContext";
import { useCart } from "../../context/CartContext";
import { useOrders } from "../../context/OrderContext";
import { useAddresses } from "../../context/AddressContext";
import { useAdmin } from "../../context/AdminContext";
import { API_BASE_URL } from "../../config/api";
import { authFetch } from "../../config/authFetch";
import { formatShortId } from "../../utils/formatId";

const accountLinks = [
  { label: "Delivery Addresses", icon: "📍", to: "/addresses", sub: "Manage delivery locations" },
];

const supportLinks = [
  { label: "24/7 District Support", icon: "🎧", sub: "Call or WhatsApp support team" },
  { label: "About Build City", icon: "ℹ️", sub: "Platform terms & company details" },
];

export default function Profile() {
  const { user, logout, updateProfile } = useAuth();
  const { count } = useCart();
  const { orders, ordersSummary } = useOrders();
  const { addresses } = useAddresses();
  const { coupons = [] } = useAdmin();
  const [dbCoupons, setDbCoupons] = useState(coupons);
  const navigate = useNavigate();

  useEffect(() => {
    authFetch(`${API_BASE_URL}/api/v1/coupons`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setDbCoupons(data);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (coupons && coupons.length > 0) {
      setDbCoupons(coupons);
    }
  }, [coupons]);

  const activeSource = dbCoupons.length > 0 ? dbCoupons : coupons;
  const todayStr = new Date().toISOString().split("T")[0];
  const activeCoupons = (activeSource || []).filter((c) => {
    const isExpired = c.expiryDate && c.expiryDate < todayStr;
    return c.isActive !== false && !isExpired;
  });
  const activeCouponsCount = activeCoupons.length;


  const customerPhone = (user?.phone || "").trim();
  const customerId = user?.id;

  const myOrders = orders.filter((o) => {
    const oPhone = (o.userPhone || o.phone || o.customerPhone || o.customer?.phone || o.address?.phone || "").trim();
    const oUserId = o.userId || o.customerId || o.customer?.id;

    if (customerId && oUserId && String(oUserId).toLowerCase() === String(customerId).toLowerCase()) return true;
    if (customerPhone && oPhone && oPhone === customerPhone) return true;
    return false;
  });

  const [showCouponsModal, setShowCouponsModal] = useState(false);
  const [copiedCode, setCopiedCode] = useState("");

  // Wallet & Referral State (Instant Local Cache to avoid loading delay & text flicker)
  const [walletData, setWalletData] = useState(() => {
    try {
      const cached = localStorage.getItem(`buildcity_wallet_${user?.id || "guest"}`);
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const [loadingWallet, setLoadingWallet] = useState(!walletData);
  const [showPassbookModal, setShowPassbookModal] = useState(false);
  const [copiedReferral, setCopiedReferral] = useState(false);

  useEffect(() => {
    if (user) {
      if (!walletData) setLoadingWallet(true);
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
        .catch(() => {})
        .finally(() => setLoadingWallet(false));
    }
  }, [user]);

  const handleCopyCode = (code) => {
    navigator.clipboard?.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(""), 2500);
  };

  const handleCopyReferral = (code) => {
    if (!code) return;
    navigator.clipboard?.writeText(code);
    setCopiedReferral(true);
    setTimeout(() => setCopiedReferral(false), 2500);
  };

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: user?.name || "", email: user?.email || "" });
  const [successMsg, setSuccessMsg] = useState("");

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleSave = (e) => {
    e.preventDefault();
    updateProfile({ name: form.name.trim(), email: form.email.trim() });
    setEditing(false);
    setSuccessMsg("✓ Profile changes saved successfully!");
    setTimeout(() => setSuccessMsg(""), 4000);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-navy-900 pb-24 sm:pb-12 font-sans w-full max-w-full overflow-x-clip">
      {/* Desktop Navbar */}
      <div className="hidden lg:block">
        <Navbar />
      </div>

      {/* Mobile Header (Clean Back Navigation without Logo/Region) */}
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
              My Profile
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <NotificationPanel className="relative text-navy-900 hover:text-brand-600 transition-colors cursor-pointer" />
            <Link to="/cart" className="relative text-navy-900 hover:text-brand-600 transition-colors p-1" title="Cart">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="8" cy="21" r="1" />
                <circle cx="19" cy="21" r="1" />
                <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
              </svg>
              {count > 0 && (
                <span className="absolute -top-1 -right-1.5 h-4.5 w-4.5 rounded-full bg-brand-500 text-white text-[10px] font-black flex items-center justify-center shadow-xs">
                  {count}
                </span>
              )}
            </Link>
          </div>
        </div>
      </div>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        {successMsg && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold px-4 py-3 rounded-xl shadow-2xs flex items-center justify-between">
            <span>{successMsg}</span>
            <span className="text-emerald-500 font-extrabold">✓</span>
          </div>
        )}

        {/* Clean Minimalist Profile Header Card */}
        <div className="bg-gradient-to-r from-sky-50/80 via-white to-blue-50/60 rounded-2xl sm:rounded-3xl border border-slate-200/90 p-4 sm:p-5 shadow-2xs flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 sm:gap-4 min-w-0">
            <div className="h-14 w-14 sm:h-15 sm:w-15 rounded-full bg-gradient-to-br from-[#0284C7] to-[#0369A1] text-white font-black text-xl sm:text-2xl flex items-center justify-center shadow-xs border-2 border-white ring-2 ring-sky-200/80 shrink-0 select-none">
              {user?.name?.[0]?.toUpperCase() || "U"}
            </div>
            <h1 className="text-navy-950 text-base sm:text-lg font-black tracking-tight leading-snug capitalize truncate min-w-0">
              {user?.name || "Customer Account"}
            </h1>
          </div>

          <button
            onClick={() => setEditing((v) => !v)}
            className="text-xs font-bold text-navy-950 bg-white hover:bg-slate-50 border border-slate-200/90 px-3.5 py-2 rounded-xl shrink-0 transition-all cursor-pointer active:scale-95 shadow-2xs flex items-center gap-1.5"
          >
            <span>{editing ? "Cancel" : "✏️ Edit"}</span>
          </button>
        </div>

        {/* Edit Profile Form */}
        {editing && (
          <form
            onSubmit={handleSave}
            className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 space-y-4"
          >
            <h3 className="font-extrabold text-navy-900 text-sm border-b border-slate-100 pb-2">
              Edit Account Information
            </h3>
            <div>
              <label className="block text-xs font-bold text-navy-900 mb-1">
                Full Name *
              </label>
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full text-xs font-medium border border-slate-200 rounded-xl px-3.5 py-2.5 outline-none focus:border-brand-500 bg-slate-50"
                placeholder="Enter your name"
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
                placeholder="Enter your email"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold rounded-xl py-3 shadow-xs transition-colors cursor-pointer active:scale-[0.98]"
            >
              Save Profile Changes
            </button>
          </form>
        )}

        {/* 3 Matching Stat Cards: Wallet, Active Coupons, Total Orders */}
        {!editing && (
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {/* 1. BuildCity Wallet (Click to open Passbook) */}
            <button
              type="button"
              onClick={() => setShowPassbookModal(true)}
              className="bg-white rounded-xl border border-slate-200/90 py-2.5 px-2 sm:py-3.5 sm:px-3 text-center shadow-xs hover:shadow-md hover:border-brand-400 active:scale-[0.98] transition-all cursor-pointer group block"
            >
              <div className="flex items-center justify-center mb-1">
                <span className="text-[9.5px] font-black text-brand-700 bg-brand-50 px-2 py-0.5 rounded-full border border-brand-200/70">
                  Wallet
                </span>
              </div>
              {loadingWallet && !walletData ? (
                <div className="h-6 w-16 mx-auto bg-slate-200 animate-pulse rounded-md my-0.5" />
              ) : (
                <p className="text-base sm:text-xl font-black text-brand-600 group-hover:text-brand-700 transition-colors tabular-nums">
                  ₹{Number(walletData?.balance ?? user?.walletBalance ?? 0).toLocaleString("en-IN")}
                </p>
              )}
              <p className="text-[10px] font-bold text-slate-500 mt-0.5 flex items-center justify-center gap-1">
                <span>Passbook</span>
                <span className="text-brand-600 font-bold group-hover:translate-x-0.5 transition-transform">→</span>
              </p>
            </button>

            {/* 2. Active Coupons (Click to view active coupons) */}
            <button
              type="button"
              onClick={() => setShowCouponsModal(true)}
              className="bg-white rounded-xl border border-slate-200/90 py-2.5 px-2 sm:py-3.5 sm:px-3 text-center shadow-xs hover:shadow-md hover:border-emerald-400 active:scale-[0.98] transition-all cursor-pointer group block"
            >
              <div className="flex items-center justify-center mb-1">
                <span className="text-[9.5px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/80">
                  Active
                </span>
              </div>
              <p className="text-base sm:text-xl font-black text-emerald-600 group-hover:text-emerald-700 transition-colors tabular-nums">
                {activeCouponsCount} Active
              </p>
              <p className="text-[10px] font-bold text-slate-500 mt-0.5 flex items-center justify-center gap-1">
                <span>Coupons</span>
                <span className="text-emerald-600 font-bold group-hover:translate-x-0.5 transition-transform">→</span>
              </p>
            </button>

            {/* 3. Total Orders (Click to go to /orders) */}
            <button
              type="button"
              onClick={() => navigate("/orders")}
              className="bg-white rounded-xl border border-slate-200/90 py-2.5 px-2 sm:py-3.5 sm:px-3 text-center shadow-xs hover:shadow-md hover:border-navy-400 active:scale-[0.98] transition-all cursor-pointer group block"
            >
              <div className="flex items-center justify-center mb-1">
                <span className="text-[9.5px] font-black text-navy-800 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                  History
                </span>
              </div>
              <p className="text-base sm:text-xl font-black text-navy-950 group-hover:text-brand-600 transition-colors tabular-nums">
                {(ordersSummary?.totalOrders ?? myOrders.length) || 0}
              </p>
              <p className="text-[10px] font-bold text-slate-500 mt-0.5 flex items-center justify-center gap-1">
                <span>Orders</span>
                <span className="text-navy-950 font-bold group-hover:translate-x-0.5 transition-transform">→</span>
              </p>
            </button>
          </div>
        )}

        {/* Refer & Earn Card (Referral Code Only, Strictly No Dynamic Links) */}
        {!editing && (
          <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-extrabold text-navy-950">
                  Refer & Earn Rewards
                </h3>
              </div>
              {walletData?.settings ? (
                <span className="text-[10px] font-black text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200/80">
                  {walletData.settings.referralRewardType === "PERCENTAGE"
                    ? `Bonus ${walletData.settings.referrerReward}% Lifetime`
                    : `Bonus ₹${walletData.settings.referrerReward}`}
                </span>
              ) : (
                <span className="inline-block w-28 h-5 bg-emerald-100/70 animate-pulse rounded-full" />
              )}
            </div>

            {/* Referral Code Box */}
            <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-3 sm:p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Your Referral Code
                </span>
                <span className="font-mono text-xl font-black text-navy-950 tracking-widest select-all">
                  {walletData?.referralCode || user?.referralCode || "BC----"}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleCopyReferral(walletData?.referralCode || user?.referralCode)}
                  className={`flex-1 sm:flex-none text-xs font-black px-4 py-2.5 rounded-xl active:scale-95 transition-all cursor-pointer shadow-xs flex items-center justify-center gap-1.5 ${
                    copiedReferral
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-900 hover:bg-slate-800 text-white"
                  }`}
                >
                  <span>{copiedReferral ? "✓ Copied" : "Copy Code"}</span>
                </button>

                <a
                  href={`https://wa.me/?text=${encodeURIComponent(
                    `Join BuildCity for construction & building materials! Use my Referral Code: ${walletData?.referralCode || user?.referralCode} when registering to get wallet rewards on your orders.\n\nReferral Code: ${walletData?.referralCode || user?.referralCode}`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 sm:flex-none bg-[#128C7E] hover:bg-[#075E54] text-white active:scale-95 text-xs font-black px-4 py-2.5 rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>WhatsApp</span>
                </a>
              </div>
            </div>

            {/* How It Works - Step by Step Guide (Clean Monochrome & Minimalist) */}
            <div className="grid grid-cols-3 gap-2 sm:gap-2.5 pt-1 text-center">
              <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-2.5 sm:p-3 shadow-2xs hover:border-slate-300 transition-colors">
                <span className="inline-block text-[9.5px] font-extrabold text-slate-600 bg-white border border-slate-200/90 px-2.5 py-0.5 rounded-full shadow-2xs">
                  Step 1
                </span>
                <p className="text-[11px] sm:text-xs font-black text-navy-950 mt-1.5">Share Code</p>
                <p className="text-[9.5px] sm:text-[10px] font-medium text-slate-500 mt-0.5">Send code to friends</p>
              </div>
              <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-2.5 sm:p-3 shadow-2xs hover:border-slate-300 transition-colors">
                <span className="inline-block text-[9.5px] font-extrabold text-slate-600 bg-white border border-slate-200/90 px-2.5 py-0.5 rounded-full shadow-2xs">
                  Step 2
                </span>
                <p className="text-[11px] sm:text-xs font-black text-navy-950 mt-1.5">Friend Registers</p>
                <p className="text-[9.5px] sm:text-[10px] font-medium text-slate-500 mt-0.5">Enter code on signup</p>
              </div>
              <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-2.5 sm:p-3 shadow-2xs hover:border-slate-300 transition-colors">
                <span className="inline-block text-[9.5px] font-extrabold text-slate-600 bg-white border border-slate-200/90 px-2.5 py-0.5 rounded-full shadow-2xs">
                  Step 3
                </span>
                <p className="text-[11px] sm:text-xs font-black text-navy-950 mt-1.5">Earn on Delivery</p>
                <p className="text-[9.5px] sm:text-[10px] font-medium text-slate-500 mt-0.5">
                  {walletData?.settings?.referralRewardType === "PERCENTAGE"
                    ? `${walletData?.settings?.referrerReward || 2}% on every qualifying order`
                    : "Reward on qualifying orders"}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* My Account Links */}
        <section className="space-y-2">
          <h2 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider px-1">
            My Account & Activity
          </h2>
          <div className="bg-white rounded-2xl border border-slate-200/90 divide-y divide-slate-100 shadow-xs overflow-hidden">
            {accountLinks.map((l) => (
              <Link
                key={l.label}
                to={l.to}
                className="flex items-center gap-3.5 px-4 py-3.5 hover:bg-slate-50/80 active:bg-slate-100 transition-colors group"
              >
                <span className="text-xl bg-slate-100 p-2 rounded-xl group-hover:bg-brand-50 transition-colors">
                  {l.icon}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-navy-950 group-hover:text-brand-600 transition-colors">
                    {l.label}
                  </p>
                  <p className="text-[11px] text-slate-400 truncate">{l.sub}</p>
                </div>
                <svg className="w-4 h-4 text-slate-400 group-hover:text-brand-600 group-hover:translate-x-0.5 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            ))}
          </div>
        </section>

        {/* Support & Account Actions */}
        <section className="space-y-2">
          <h2 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider px-1">
            Support & Account
          </h2>
          <div className="bg-white rounded-2xl border border-slate-200/90 divide-y divide-slate-100 shadow-xs overflow-hidden">
            {supportLinks.map((l) => (
              <div
                key={l.label}
                className="flex items-center gap-3.5 px-4 py-3.5 hover:bg-slate-50/80 active:bg-slate-100 transition-colors cursor-pointer group"
              >
                <span className="text-xl bg-slate-100 p-2 rounded-xl group-hover:bg-brand-50 transition-colors">
                  {l.icon}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-navy-950 group-hover:text-brand-600 transition-colors">
                    {l.label}
                  </p>
                  <p className="text-[11px] text-slate-400 truncate">{l.sub}</p>
                </div>
                <svg className="w-4 h-4 text-slate-400 group-hover:text-brand-600 group-hover:translate-x-0.5 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            ))}
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3.5 px-4 py-3.5 hover:bg-rose-50/80 active:bg-rose-100 transition-colors text-left cursor-pointer group"
            >
              <span className="text-xl bg-rose-50 p-2 rounded-xl text-rose-600">🚪</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-extrabold text-rose-600">
                  Logout Account
                </p>
                <p className="text-[11px] text-rose-400">Sign out from this device</p>
              </div>
              <svg className="w-4 h-4 text-rose-400 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </section>
      </main>

      {/* ACTIVE COUPONS & OFFERS MODAL (Centered Pop-up) */}
      {showCouponsModal && (
        <div
          onClick={() => setShowCouponsModal(false)}
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-sm sm:max-w-md w-full p-4.5 sm:p-5 shadow-2xl border border-slate-100 flex flex-col max-h-[80vh] space-y-3 animate-modal-pop"
          >
            {/* Clean top-right close button (Header text removed) */}
            <div className="flex justify-end shrink-0 -mt-1 -mr-1">
              <button
                onClick={() => setShowCouponsModal(false)}
                className="text-slate-400 hover:text-navy-950 p-1.5 rounded-full hover:bg-slate-100 transition-colors text-sm cursor-pointer"
                title="Close"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2.5 overflow-y-auto flex-1 pr-0.5">
              {activeCoupons.length === 0 ? (
                <div className="text-center py-6 text-slate-400">
                  <p className="text-2xl mb-1">🏷️</p>
                  <p className="text-xs font-bold text-slate-600">No active coupons available</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Check back later for seasonal festival discounts!</p>
                </div>
              ) : (
                activeCoupons.map((c) => (
                  <div
                    key={c.code}
                    className="border border-slate-200/80 rounded-2xl p-3 sm:p-3.5 flex flex-col justify-between gap-2.5 bg-white shadow-2xs hover:border-brand-400 hover:shadow-xs transition-all"
                  >
                    {/* Top: Title & Active badge */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs sm:text-[13px] font-black text-navy-950 leading-tight">
                          {c.title || `Save ₹${c.discountAmount || 50} on your order`}
                        </h4>
                        <p className="text-[10px] text-slate-500 font-medium mt-0.5 line-clamp-1">
                          {c.desc || `Valid on orders above ₹${Number(c.minOrder || 0).toLocaleString("en-IN")}`}
                        </p>
                      </div>
                      <span className="text-[9.5px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/80 shrink-0">
                        Active
                      </span>
                    </div>

                    {/* Middle: Clean & Simple Code Row (No Dashes) */}
                    <div className="flex items-center justify-between gap-2.5 bg-slate-50 border border-slate-200/90 rounded-xl px-3 py-2">
                      <span className="font-mono text-xs sm:text-[13px] font-black tracking-wider text-brand-600 select-all">
                        {c.code}
                      </span>

                      <button
                        onClick={() => handleCopyCode(c.code)}
                        className={`text-[11px] font-black px-3.5 py-1.5 rounded-lg active:scale-95 transition-all cursor-pointer shrink-0 ${
                          copiedCode === c.code
                            ? "bg-emerald-600 text-white"
                            : "bg-brand-500 hover:bg-brand-600 text-white shadow-2xs"
                        }`}
                      >
                        {copiedCode === c.code ? "✓ Copied!" : "Copy Code"}
                      </button>
                    </div>

                    {/* Bottom: Validity & Min Order Details */}
                    <div className="flex items-center justify-between text-[9px] text-slate-400 font-medium pt-1 border-t border-slate-100 flex-wrap gap-1.5">
                      <span>
                        {c.minOrder ? `Min order: ₹${Number(c.minOrder).toLocaleString("en-IN")}` : "No min order"}
                      </span>
                      {c.expiryDate && (
                        <span>🕒 Valid: {c.expiryDate}</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-1.5 border-t border-slate-100 shrink-0">
              <button
                onClick={() => {
                  setShowCouponsModal(false);
                  navigate("/categories");
                }}
                className="w-full bg-brand-500 hover:bg-brand-600 active:scale-[0.98] text-white text-xs font-black py-2.5 rounded-xl transition-all cursor-pointer shadow-xs text-center"
              >
                Shop Materials with Coupon →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WALLET PASSBOOK MODAL */}
      {showPassbookModal && (
        <div
          onClick={() => setShowPassbookModal(false)}
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-sm sm:max-w-md w-full p-4.5 sm:p-5 shadow-2xl border border-slate-100 flex flex-col max-h-[85vh] space-y-3 animate-modal-pop"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="text-xl">📜</span>
                <h3 className="font-extrabold text-navy-950 text-sm sm:text-base">
                  Wallet Passbook
                </h3>
              </div>
              <button
                onClick={() => setShowPassbookModal(false)}
                className="text-slate-400 hover:text-navy-950 p-1.5 rounded-full hover:bg-slate-100 transition-colors text-sm cursor-pointer"
                title="Close"
              >
                ✕
              </button>
            </div>

            <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-3.5 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Available Wallet Balance
                </span>
                {loadingWallet && !walletData ? (
                  <div className="h-7 w-24 bg-slate-200 animate-pulse rounded-md mt-1" />
                ) : (
                  <span className="text-2xl font-black text-navy-950 tabular-nums">
                    ₹{Number(walletData?.balance || user?.walletBalance || 0).toLocaleString("en-IN")}
                  </span>
                )}
              </div>
              <span className="text-[11px] font-black text-brand-700 bg-brand-50 px-3 py-1 rounded-xl shadow-2xs border border-brand-200/80">
                BuildCity Wallet
              </span>
            </div>

            <div className="space-y-2 overflow-y-auto flex-1 pr-0.5 max-h-[50vh]">
              {loadingWallet && (!walletData || !walletData.transactions) ? (
                <div className="space-y-2 py-1">
                  {[1, 2, 3].map((idx) => (
                    <div
                      key={idx}
                      className="bg-slate-50 border border-slate-200/70 rounded-xl p-3 flex items-center justify-between gap-3 animate-pulse"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-slate-200" />
                        <div className="space-y-1.5">
                          <div className="h-3 w-28 bg-slate-200 rounded" />
                          <div className="h-2 w-16 bg-slate-200 rounded" />
                        </div>
                      </div>
                      <div className="h-4 w-12 bg-slate-200 rounded" />
                    </div>
                  ))}
                </div>
              ) : !walletData?.transactions || walletData.transactions.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <p className="text-3xl mb-1.5">💳</p>
                  <p className="text-xs font-bold text-slate-600">No transactions yet</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Cashback and referral bonuses will appear here once your orders are delivered!
                  </p>
                </div>
              ) : (
                walletData.transactions.map((t) => {
                  const isPositive = Number(t.amount) > 0;
                  return (
                    <div
                      key={t.id}
                      className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-3 flex items-center justify-between gap-3 hover:border-slate-300 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-bold text-xs ${
                            isPositive
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-rose-100 text-rose-700"
                          }`}
                        >
                          {isPositive ? "↓" : "↑"}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-navy-950 truncate">
                            {t.description || t.type}
                          </p>
                          <p className="text-[10px] text-slate-400 font-medium">
                            {t.createdAt
                              ? new Date(t.createdAt).toLocaleString("en-IN", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : "Recent"}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span
                          className={`text-xs sm:text-sm font-black tabular-nums ${
                            isPositive ? "text-emerald-600" : "text-rose-600"
                          }`}
                        >
                          {isPositive ? `+ ₹${Number(t.amount).toLocaleString("en-IN")}` : `− ₹${Math.abs(Number(t.amount)).toLocaleString("en-IN")}`}
                        </span>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                          {t.type}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="pt-2 border-t border-slate-100 shrink-0">
              <button
                onClick={() => setShowPassbookModal(false)}
                className="w-full bg-slate-100 hover:bg-slate-200 text-navy-950 text-xs font-bold py-2.5 rounded-xl transition-all cursor-pointer text-center"
              >
                Close Passbook
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}