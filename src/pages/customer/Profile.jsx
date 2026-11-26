import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import { Capacitor } from "@capacitor/core";
import { useAuth } from "../../context/AuthContext";
import { useOrders } from "../../context/OrderContext";
import { useAdmin } from "../../context/AdminContext";
import { API_BASE_URL } from "../../config/api";
import { authFetch } from "../../config/authFetch";
import MobileHeader from "../../components/ui/MobileHeader";
import {
  ChevronRightIcon,
  CloseIcon,
  CopyIcon,
  EditIcon,
  GiftIcon,
  HeadsetIcon,
  InfoIcon,
  LogOutIcon,
  MapIcon,
  ReceiptIcon,
  TagIcon,
  WalletIcon,
  WhatsAppIcon,
} from "../../components/ui/Icons";

const accountLinks = [
  { label: "Delivery addresses", icon: MapIcon, to: "/addresses", sub: "Manage your site addresses" },
  { label: "My orders", icon: ReceiptIcon, to: "/orders", sub: "Track and view past orders" },
];

// These used to be inert rows; they now open the support line and the terms page.
const supportLinks = [
  { label: "Help & support", icon: HeadsetIcon, href: "tel:+919956886527", sub: "Call the BuildCity support team" },
  { label: "About BuildCity", icon: InfoIcon, to: "/terms", sub: "Terms, policies and company details" },
];

export default function Profile() {
  const { user, logout, updateProfile } = useAuth();
  const { orders, ordersSummary } = useOrders();
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

  const fetchWallet = () => {
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
        .catch(() => {})
        .finally(() => setLoadingWallet(false));
    }
  };

  useEffect(() => {
    fetchWallet();
  }, [user]);

  useEffect(() => {
    if (showPassbookModal) {
      fetchWallet();
    }
  }, [showPassbookModal]);

  // Realtime ledger calculation: if transactions are empty, balance is 0; otherwise exact sum of ledger
  const displayedWalletBalance = useMemo(() => {
    if (walletData?.transactions) {
      if (walletData.transactions.length === 0) return 0;
      return Math.max(0, walletData.transactions.reduce((acc, t) => acc + (Number(t.amount) || 0), 0));
    }
    if (walletData?.balance !== undefined && walletData?.balance !== null) {
      return Math.max(0, Number(walletData.balance));
    }
    return Math.max(0, Number(user?.walletBalance ?? 0));
  }, [walletData, user]);

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
    setSuccessMsg("Profile saved");
    setTimeout(() => setSuccessMsg(""), 4000);
  };

  return (
    <div data-storefront className="min-h-screen bg-slate-50 text-navy-900 font-sans w-full max-w-full overflow-x-clip flex flex-col justify-between">
      <div className="hidden lg:block">
        <Navbar />
      </div>
      <MobileHeader title="Profile" />

      <main className="bc-fade-in max-w-2xl w-full mx-auto px-4 py-4 sm:py-6 pb-24 lg:pb-12 space-y-4 flex-1">
        {successMsg && (
          <div role="status" className="bc-rise-in bg-emerald-50 ring-1 ring-inset ring-emerald-600/20 text-emerald-800 text-sm px-4 py-3 rounded-xl">
            {successMsg}
          </div>
        )}

        {/* Clean Minimalist Profile Header Card */}
        <div className="bg-white rounded-2xl ring-1 ring-slate-200/80 p-4 sm:p-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 sm:gap-4 min-w-0">
            <div className="h-14 w-14 rounded-full bg-navy-950 text-white font-semibold text-xl flex items-center justify-center shrink-0 select-none">
              {user?.name?.[0]?.toUpperCase() || "U"}
            </div>
            <div className="min-w-0">
              <h1 className="text-navy-950 text-base sm:text-lg font-semibold leading-snug capitalize truncate">
                {user?.name || "Customer Account"}
              </h1>
              {user?.phone && <p className="text-sm text-slate-500 tabular-nums">+91 {user.phone}</p>}
            </div>
          </div>

          <button
            onClick={() => setEditing((v) => !v)}
            className="h-10 text-sm font-medium text-navy-950 bg-white hover:bg-slate-50 ring-1 ring-slate-200 px-3.5 rounded-xl shrink-0 transition-colors cursor-pointer active:scale-[0.98] flex items-center gap-1.5"
          >
            {!editing && <EditIcon className="h-4 w-4 text-slate-500" />}
            <span>{editing ? "Cancel" : "Edit"}</span>
          </button>
        </div>

        {/* Edit Profile Form */}
        {editing && (
          <form
            onSubmit={handleSave}
            className="bc-rise-in bg-white rounded-2xl ring-1 ring-slate-200/80 p-4 sm:p-5 space-y-4"
          >
            <h3 className="font-semibold text-navy-950 text-[15px]">
              Edit profile
            </h3>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Full Name *
              </label>
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full h-11 text-sm border border-slate-200 rounded-xl px-3.5 outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 bg-white"
                placeholder="Enter your name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className="w-full h-11 text-sm border border-slate-200 rounded-xl px-3.5 outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 bg-white"
                placeholder="Enter your email"
              />
            </div>
            <button
              type="submit"
              className="w-full h-12 bg-navy-950 hover:bg-navy-900 text-white text-sm font-semibold rounded-xl transition-colors cursor-pointer active:scale-[0.98]"
            >
              Save changes
            </button>
          </form>
        )}

        {/* 3 Matching Stat Cards: Wallet, Active Coupons, Total Orders */}
        {!editing && (
          <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
            {/* 1. BuildCity Wallet (Click to open Passbook) */}
            <button
              type="button"
              onClick={() => setShowPassbookModal(true)}
              className="bg-white rounded-2xl ring-1 ring-slate-200/80 p-3 sm:p-4 text-left hover:ring-slate-300 hover:shadow-[0_10px_24px_-16px_rgba(15,23,42,0.35)] active:scale-[0.98] transition-[box-shadow,transform] cursor-pointer group block"
            >
              <span className="flex items-center gap-1.5 text-xs text-slate-500 mb-1.5">
                <WalletIcon className="h-4 w-4 text-brand-600" />
                Wallet
              </span>
              {loadingWallet && !walletData ? (
                <div className="bc-skeleton h-7 w-16 rounded-md" />
              ) : (
                <p className="text-lg sm:text-xl font-semibold text-navy-950 tabular-nums truncate">
                  ₹{displayedWalletBalance.toLocaleString("en-IN")}
                </p>
              )}
              <p className="text-xs text-brand-700 mt-0.5 flex items-center gap-0.5">
                <span>Passbook</span>
                <ChevronRightIcon className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
              </p>
            </button>

            {/* 2. Active Coupons (Click to view active coupons) */}
            <button
              type="button"
              onClick={() => setShowCouponsModal(true)}
              className="bg-white rounded-2xl ring-1 ring-slate-200/80 p-3 sm:p-4 text-left hover:ring-slate-300 hover:shadow-[0_10px_24px_-16px_rgba(15,23,42,0.35)] active:scale-[0.98] transition-[box-shadow,transform] cursor-pointer group block"
            >
              <span className="flex items-center gap-1.5 text-xs text-slate-500 mb-1.5">
                <TagIcon className="h-4 w-4 text-emerald-600" />
                Coupons
              </span>
              <p className="text-lg sm:text-xl font-semibold text-navy-950 tabular-nums">
                {activeCouponsCount}
              </p>
              <p className="text-xs text-brand-700 mt-0.5 flex items-center gap-0.5">
                <span>View all</span>
                <ChevronRightIcon className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
              </p>
            </button>

            {/* 3. Total Orders (Click to go to /orders) */}
            <button
              type="button"
              onClick={() => navigate("/orders")}
              className="bg-white rounded-2xl ring-1 ring-slate-200/80 p-3 sm:p-4 text-left hover:ring-slate-300 hover:shadow-[0_10px_24px_-16px_rgba(15,23,42,0.35)] active:scale-[0.98] transition-[box-shadow,transform] cursor-pointer group block"
            >
              <span className="flex items-center gap-1.5 text-xs text-slate-500 mb-1.5">
                <ReceiptIcon className="h-4 w-4 text-sky-600" />
                Orders
              </span>
              <p className="text-lg sm:text-xl font-semibold text-navy-950 tabular-nums">
                {(ordersSummary?.totalOrders ?? myOrders.length) || 0}
              </p>
              <p className="text-xs text-brand-700 mt-0.5 flex items-center gap-0.5">
                <span>History</span>
                <ChevronRightIcon className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
              </p>
            </button>
          </div>
        )}

        {/* Refer & Earn Card (Referral Code Only, Strictly No Dynamic Links) */}
        {!editing && (
          <div className="bg-white rounded-2xl ring-1 ring-slate-200/80 p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <GiftIcon className="h-[18px] w-[18px] text-brand-600" />
                <h3 className="text-[15px] font-semibold text-navy-950">
                  Refer & earn
                </h3>
              </div>
              {walletData?.settings ? (
                <span className="text-xs font-medium text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full ring-1 ring-inset ring-emerald-600/15">
                  {walletData.settings.referralRewardType === "PERCENTAGE"
                    ? `${walletData.settings.referrerReward}% lifetime bonus`
                    : `₹${walletData.settings.referrerReward} bonus`}
                </span>
              ) : (
                <span className="bc-skeleton inline-block w-28 h-5 rounded-full" />
              )}
            </div>

            {/* Referral Code Box */}
            <div className="bg-slate-50 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs text-slate-500 block">
                  Your referral code
                </span>
                <span className="selectable-text font-mono text-xl font-semibold text-navy-950 tracking-[0.2em] select-all">
                  {walletData?.referralCode || user?.referralCode || "BC----"}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleCopyReferral(walletData?.referralCode || user?.referralCode)}
                  className={`flex-1 sm:flex-none h-10 text-sm font-semibold px-4 rounded-xl active:scale-[0.98] transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                    copiedReferral
                      ? "bg-emerald-600 text-white"
                      : "bg-navy-950 hover:bg-navy-900 text-white"
                  }`}
                >
                  <CopyIcon className="h-4 w-4" />
                  <span aria-live="polite">{copiedReferral ? "Copied" : "Copy code"}</span>
                </button>

                <a
                  href={`https://wa.me/?text=${encodeURIComponent(
                    `Join BuildCity for construction & building materials! Use my Referral Code: ${walletData?.referralCode || user?.referralCode} when registering to get wallet rewards on your orders.\n\nReferral Code: ${walletData?.referralCode || user?.referralCode}`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 sm:flex-none h-10 bg-[#128C7E] hover:bg-[#075E54] text-white active:scale-[0.98] text-sm font-semibold px-4 rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <WhatsAppIcon className="h-4 w-4" />
                  <span>Share</span>
                </a>
              </div>
            </div>

            {/* How It Works - Step by Step Guide (Clean Monochrome & Minimalist) */}
            <ol className="grid grid-cols-3 gap-2 sm:gap-3">
              <li className="rounded-xl p-2.5 sm:p-3 ring-1 ring-slate-200/80">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">1</span>
                <p className="text-[13px] font-medium text-navy-950 mt-2">Share code</p>
                <p className="text-xs text-slate-500 mt-0.5 leading-snug">Send it to a friend</p>
              </li>
              <li className="rounded-xl p-2.5 sm:p-3 ring-1 ring-slate-200/80">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">2</span>
                <p className="text-[13px] font-medium text-navy-950 mt-2">They sign up</p>
                <p className="text-xs text-slate-500 mt-0.5 leading-snug">Using your code</p>
              </li>
              <li className="rounded-xl p-2.5 sm:p-3 ring-1 ring-slate-200/80">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">3</span>
                <p className="text-[13px] font-medium text-navy-950 mt-2">You earn</p>
                <p className="text-xs text-slate-500 mt-0.5 leading-snug">
                  {walletData?.settings?.referralRewardType === "PERCENTAGE"
                    ? `${walletData?.settings?.referrerReward || 2}% on every qualifying order`
                    : "Reward on qualifying orders"}
                </p>
              </li>
            </ol>
          </div>
        )}

        {/* My Account Links */}
        <section className="space-y-2 pt-1">
          <h2 className="text-sm font-medium text-slate-500 px-1">
            Account
          </h2>
          <div className="bg-white rounded-2xl ring-1 ring-slate-200/80 divide-y divide-slate-100 overflow-hidden">
            {accountLinks.map((l) => (
              <Link
                key={l.label}
                to={l.to}
                className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 active:bg-slate-100 transition-colors group"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                  <l.icon className="h-[18px] w-[18px]" />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-navy-950">
                    {l.label}
                  </p>
                  <p className="text-xs text-slate-500 truncate">{l.sub}</p>
                </div>
                <ChevronRightIcon className="h-4 w-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            ))}
          </div>
        </section>

        {/* Support & Account Actions */}
        <section className="space-y-2">
          <h2 className="text-sm font-medium text-slate-500 px-1">
            Support
          </h2>
          <div className="bg-white rounded-2xl ring-1 ring-slate-200/80 divide-y divide-slate-100 overflow-hidden">
            {supportLinks.map((l) => {
              const inner = (
                <>
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                    <l.icon className="h-[18px] w-[18px]" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-navy-950">{l.label}</p>
                    <p className="text-xs text-slate-500 truncate">{l.sub}</p>
                  </div>
                  <ChevronRightIcon className="h-4 w-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                </>
              );
              const rowClass = "flex items-center gap-3 px-4 py-3 hover:bg-slate-50 active:bg-slate-100 transition-colors group";
              return l.href ? (
                <a key={l.label} href={l.href} className={rowClass}>
                  {inner}
                </a>
              ) : (
                <Link key={l.label} to={l.to} className={rowClass}>
                  {inner}
                </Link>
              );
            })}
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-rose-50 active:bg-rose-100 transition-colors text-left cursor-pointer group"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
                <LogOutIcon className="h-[18px] w-[18px]" />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-rose-600">
                  Log out
                </p>
                <p className="text-xs text-slate-500">Sign out from this device</p>
              </div>
            </button>
          </div>
        </section>
      </main>

      {/* Footer section (web pe dikhega, mobile app me hidden rahega) */}
      {!Capacitor.isNativePlatform() && <Footer />}

      {/* ACTIVE COUPONS & OFFERS MODAL (Centered Pop-up) */}
      {showCouponsModal && (
        <div
          onClick={() => setShowCouponsModal(false)}
          className="bc-fade-in fixed inset-0 z-50 bg-slate-950/55 flex items-end sm:items-center justify-center sm:p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Coupons"
            className="bc-sheet-up bg-white rounded-t-3xl sm:rounded-2xl sm:max-w-md w-full p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl flex flex-col max-h-[85vh] space-y-3"
          >
            {/* Clean top-right close button (Header text removed) */}
            <div className="flex items-center justify-between shrink-0">
              <h3 className="text-base font-semibold text-navy-950">Your coupons</h3>
              <button
                onClick={() => setShowCouponsModal(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
                title="Close"
                aria-label="Close"
              >
                <CloseIcon className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-2.5 overflow-y-auto flex-1 pr-0.5">
              {activeCoupons.length === 0 ? (
                <div className="text-center py-8">
                  <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400"><TagIcon className="h-6 w-6" /></span>
                  <p className="text-sm font-semibold text-navy-950">No coupons right now</p>
                  <p className="text-sm text-slate-500 mt-0.5">New offers will show up here.</p>
                </div>
              ) : (
                activeCoupons.map((c) => (
                  <div
                    key={c.code}
                    className="rounded-2xl p-3.5 flex flex-col justify-between gap-2.5 bg-white ring-1 ring-slate-200"
                  >
                    {/* Top: Title & Active badge */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <h4 className="text-sm font-semibold text-navy-950 leading-tight">
                          {c.title || `Save ₹${c.discountAmount || 50} on your order`}
                        </h4>
                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                          {c.desc || `Valid on orders above ₹${Number(c.minOrder || 0).toLocaleString("en-IN")}`}
                        </p>
                      </div>
                      
                    </div>

                    {/* Middle: Clean & Simple Code Row (No Dashes) */}
                    <div className="flex items-center justify-between gap-2.5 bg-slate-50 rounded-xl pl-3 pr-1.5 py-1.5">
                      <span className="selectable-text font-mono text-sm font-semibold tracking-wider text-navy-950 select-all">
                        {c.code}
                      </span>

                      <button
                        onClick={() => handleCopyCode(c.code)}
                        className={`h-9 text-sm font-semibold px-3.5 rounded-lg active:scale-[0.97] transition-colors cursor-pointer shrink-0 ${
                          copiedCode === c.code
                            ? "bg-emerald-600 text-white"
                            : "bg-navy-950 hover:bg-navy-900 text-white"
                        }`}
                      >
                        {copiedCode === c.code ? "Copied" : "Copy"}
                      </button>
                    </div>

                    {/* Bottom: Validity & Min Order Details */}
                    <div className="flex items-center justify-between text-xs text-slate-500 flex-wrap gap-1.5">
                      <span>
                        {c.minOrder ? `Min order: ₹${Number(c.minOrder).toLocaleString("en-IN")}` : "No min order"}
                      </span>
                      {c.expiryDate && (
                        <span>Valid till {c.expiryDate}</span>
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
                className="w-full h-12 bg-brand-600 hover:bg-brand-700 active:scale-[0.98] text-white text-sm font-semibold rounded-xl transition-colors cursor-pointer text-center"
              >
                Shop materials
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WALLET PASSBOOK MODAL */}
      {showPassbookModal && (
        <div
          onClick={() => setShowPassbookModal(false)}
          className="bc-fade-in fixed inset-0 z-50 bg-slate-950/55 flex items-end sm:items-center justify-center sm:p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Wallet Passbook"
            className="bc-sheet-up bg-white rounded-t-3xl sm:rounded-2xl sm:max-w-md w-full p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl flex flex-col max-h-[88vh] space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-navy-950 text-base">
                  Wallet Passbook
                </h3>
              </div>
              <button
                onClick={() => setShowPassbookModal(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
                title="Close"
                aria-label="Close"
              >
                <CloseIcon className="h-4 w-4" />
              </button>
            </div>

            <div className="bg-navy-950 text-white rounded-2xl p-4 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-300 block">
                  Available balance
                </span>
                {loadingWallet && !walletData ? (
                  <div className="h-8 w-24 bg-white/10 rounded-md mt-1" />
                ) : (
                  <span className="text-2xl font-semibold tabular-nums">
                    ₹{displayedWalletBalance.toLocaleString("en-IN")}
                  </span>
                )}
              </div>
              <WalletIcon className="h-7 w-7 text-brand-400" />
            </div>

            <div className="overflow-y-auto overscroll-contain flex-1 pr-0.5 max-h-[50vh]">
              {loadingWallet && (!walletData || !walletData.transactions) ? (
                <div className="space-y-2 py-1">
                  {[1, 2, 3].map((idx) => (
                    <div
                      key={idx}
                      className="rounded-xl p-3 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="bc-skeleton w-8 h-8 rounded-full" />
                        <div className="space-y-1.5">
                          <div className="bc-skeleton h-3 w-28 rounded" />
                          <div className="bc-skeleton h-2.5 w-16 rounded" />
                        </div>
                      </div>
                      <div className="bc-skeleton h-4 w-12 rounded" />
                    </div>
                  ))}
                </div>
              ) : !walletData?.transactions || walletData.transactions.length === 0 ? (
                <div className="text-center py-8">
                  <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400"><WalletIcon className="h-6 w-6" /></span>
                  <p className="text-sm font-semibold text-navy-950">No transactions yet</p>
                  <p className="text-sm text-slate-500 mt-0.5 max-w-xs mx-auto">
                    Cashback and referral bonuses will appear here once your orders are delivered!
                  </p>
                </div>
              ) : (
                walletData.transactions.map((t) => {
                  const isPositive = Number(t.amount) > 0;
                  return (
                    <div
                      key={t.id}
                      className="rounded-xl px-1 py-2.5 flex items-center justify-between gap-3 border-b border-slate-100 last:border-b-0"
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
                          <p className="text-sm font-medium text-navy-950 truncate">
                            {t.description || t.type}
                          </p>
                          <p className="text-xs text-slate-500">
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
                          className={`text-sm font-semibold tabular-nums ${
                            isPositive ? "text-emerald-600" : "text-rose-600"
                          }`}
                        >
                          {isPositive ? `+ ₹${Number(t.amount).toLocaleString("en-IN")}` : `− ₹${Math.abs(Number(t.amount)).toLocaleString("en-IN")}`}
                        </span>
                        <p className="font-mono text-[11px] text-slate-400">
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
                className="w-full h-11 bg-slate-100 hover:bg-slate-200 text-navy-950 text-sm font-semibold rounded-xl transition-colors cursor-pointer text-center"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}