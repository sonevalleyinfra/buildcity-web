import React, { useState, useEffect } from "react";
import { useAdmin } from "../../context/AdminContext";

export default function WalletSettingsTab() {
  const {
    walletSettings,
    loadingWalletSettings,
    fetchWalletSettings,
    updateWalletSettings,
    walletUsers,
    fetchWalletUsers,
    adjustUserWallet,
  } = useAdmin();

  // Local form state initialized from context
  const [form, setForm] = useState({
    referralEnabled: true,
    cashbackEnabled: true,
    cashbackType: "PERCENTAGE",
    cashbackValue: 2.0,
    minOrderForCashback: 5000.0,
    maxCashbackCap: 500.0,
    referralRewardType: "PERCENTAGE",
    referrerReward: 2.0,
    maxReferralRewardCap: 1000.0,
    refereeRewardType: "FLAT",
    refereeReward: 50.0,
    walletRedeemEnabled: true,
    maxWalletUsagePercent: 10.0,
    maxWalletUsageFlat: 500.0,
    freeDeliveryEnabled: true,
    freeDeliveryMinAmount: 25000.0,
  });

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [savingDelivery, setSavingDelivery] = useState(false);
  const [deliverySaveSuccess, setDeliverySaveSuccess] = useState(false);
  const [visibleWalletUsersCount, setVisibleWalletUsersCount] = useState(10);
  const [searchPhone, setSearchPhone] = useState("");
  const [adjustModal, setAdjustModal] = useState({
    open: false,
    user: null,
    action: "CREDIT",
    amount: "",
    reason: "",
    submitting: false,
  });

  // Sync settings when loaded
  useEffect(() => {
    fetchWalletSettings();
    fetchWalletUsers("");
  }, []);

  useEffect(() => {
    if (walletSettings) {
      setForm({
        referralEnabled: walletSettings.referralEnabled ?? true,
        cashbackEnabled: walletSettings.cashbackEnabled ?? true,
        cashbackType: walletSettings.cashbackType || "PERCENTAGE",
        cashbackValue: Number(walletSettings.cashbackValue) || 2.0,
        minOrderForCashback: Number(walletSettings.minOrderForCashback) || 5000.0,
        maxCashbackCap: Number(walletSettings.maxCashbackCap) || 500.0,
        referralRewardType: walletSettings.referralRewardType || "PERCENTAGE",
        referrerReward: Number(walletSettings.referrerReward) || 2.0,
        maxReferralRewardCap: Number(walletSettings.maxReferralRewardCap ?? 1000.0),
        refereeRewardType: walletSettings.refereeRewardType || "FLAT",
        refereeReward: Number(walletSettings.refereeReward) || 50.0,
        walletRedeemEnabled: walletSettings.walletRedeemEnabled ?? true,
        maxWalletUsagePercent: Number(walletSettings.maxWalletUsagePercent) || 10.0,
        maxWalletUsageFlat: Number(walletSettings.maxWalletUsageFlat) || 500.0,
        freeDeliveryEnabled: walletSettings.freeDeliveryEnabled !== false,
        freeDeliveryMinAmount: Number(walletSettings.freeDeliveryMinAmount ?? 25000.0),
      });
    }
  }, [walletSettings]);

  const handleSaveSettings = async (e) => {
    e?.preventDefault();
    setSaving(true);
    setSaveSuccess(false);
    try {
      await updateWalletSettings({
        ...form,
        freeDeliveryEnabled: Boolean(form.freeDeliveryEnabled),
        freeDeliveryMinAmount: Number(form.freeDeliveryMinAmount) || 0,
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3500);
    } catch (err) {
      alert("Failed to save wallet settings: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDeliveryRules = async () => {
    setSavingDelivery(true);
    setDeliverySaveSuccess(false);
    try {
      const payload = {
        ...form,
        freeDeliveryEnabled: Boolean(form.freeDeliveryEnabled),
        freeDeliveryMinAmount: Number(form.freeDeliveryMinAmount) || 0,
      };
      await updateWalletSettings(payload);
      setDeliverySaveSuccess(true);
      setTimeout(() => setDeliverySaveSuccess(false), 3000);
    } catch (err) {
      alert("Failed to save delivery rule: " + err.message);
    } finally {
      setSavingDelivery(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setVisibleWalletUsersCount(10);
    fetchWalletUsers(searchPhone);
  };

  const handleOpenAdjust = (u) => {
    setAdjustModal({
      open: true,
      user: u,
      action: "CREDIT",
      amount: "",
      reason: "",
      submitting: false,
    });
  };

  const handleExecuteAdjust = async (e) => {
    e.preventDefault();
    if (!adjustModal.amount || Number(adjustModal.amount) <= 0) {
      alert("Please enter a valid positive amount");
      return;
    }
    setAdjustModal((prev) => ({ ...prev, submitting: true }));
    try {
      await adjustUserWallet({
        userId: adjustModal.user.id,
        amount: Number(adjustModal.amount),
        action: adjustModal.action,
        reason: adjustModal.reason || `Admin ${adjustModal.action.toLowerCase()}`,
      });
      alert(`Wallet updated successfully! New Balance: ₹${adjustModal.user.walletBalance + (adjustModal.action === "CREDIT" ? Number(adjustModal.amount) : -Number(adjustModal.amount))}`);
      setAdjustModal({ open: false, user: null, action: "CREDIT", amount: "", reason: "", submitting: false });
      fetchWalletUsers(searchPhone);
    } catch (err) {
      alert("Adjustment failed: " + err.message);
      setAdjustModal((prev) => ({ ...prev, submitting: false }));
    }
  };

  // Preview calculations
  const previewOrderAmount = 10000;
  const calculatedCashback =
    form.cashbackType === "PERCENTAGE"
      ? Math.min(form.maxCashbackCap, (previewOrderAmount * form.cashbackValue) / 100)
      : form.cashbackValue;

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-gradient-to-r from-navy-950 via-slate-900 to-[#0A1A3A] rounded-2xl p-5 sm:p-6 text-white shadow-md border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-lg sm:text-xl font-black tracking-tight text-white">
              Wallet, Referral & Cashback Control Hub
            </h2>
            <span
              className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                form.referralEnabled || form.cashbackEnabled
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                  : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
              }`}
            >
              {form.referralEnabled || form.cashbackEnabled ? "Active Program" : "System Paused"}
            </span>
          </div>
        </div>

        <button
          onClick={handleSaveSettings}
          disabled={saving}
          className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-extrabold text-xs sm:text-sm shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 shrink-0 disabled:opacity-50"
        >
          {saving ? (
            <>
              <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
              </svg>
              <span>Saving...</span>
            </>
          ) : (
            <>
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
              <span>Save Settings</span>
            </>
          )}
        </button>
      </div>

      {saveSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl flex items-center justify-between text-xs sm:text-sm font-bold shadow-2xs">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
            </svg>
            <span>Settings saved successfully! Storefront is now using the updated configuration.</span>
          </div>
          <button onClick={() => setSaveSuccess(false)} className="text-emerald-600 hover:text-emerald-900 text-xs">
            ✕
          </button>
        </div>
      )}

      {/* 1. Master System Toggles (3 Bento Cards) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Toggle 1: Referral Program */}
        <div
          className={`p-4.5 rounded-2xl border transition-all ${
            form.referralEnabled ? "bg-white border-emerald-200 shadow-2xs" : "bg-slate-50 border-slate-200 opacity-80"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-lg">👥</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={form.referralEnabled}
                onChange={(e) => setForm({ ...form, referralEnabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
            </label>
          </div>
          <h3 className="text-sm font-black text-navy-950">Referral Program</h3>
          <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
            Customers receive a unique code to invite peers. Bonuses unlock when friend's 1st order is delivered.
          </p>
          <div className="mt-3">
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                form.referralEnabled ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-600"
              }`}
            >
              {form.referralEnabled ? "ENABLED" : "PAUSED"}
            </span>
          </div>
        </div>

        {/* Toggle 2: Order Cashback */}
        <div
          className={`p-4.5 rounded-2xl border transition-all ${
            form.cashbackEnabled ? "bg-white border-blue-200 shadow-2xs" : "bg-slate-50 border-slate-200 opacity-80"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-lg">⚡</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={form.cashbackEnabled}
                onChange={(e) => setForm({ ...form, cashbackEnabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
          <h3 className="text-sm font-black text-navy-950">Order Spend Cashback</h3>
          <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
            Auto-credit wallet cashback on completed site deliveries exceeding minimum threshold amount.
          </p>
          <div className="mt-3">
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                form.cashbackEnabled ? "bg-blue-100 text-blue-800" : "bg-slate-200 text-slate-600"
              }`}
            >
              {form.cashbackEnabled ? "ENABLED" : "PAUSED"}
            </span>
          </div>
        </div>

        {/* Toggle 3: Checkout Wallet Redemption */}
        <div
          className={`p-4.5 rounded-2xl border transition-all ${
            form.walletRedeemEnabled ? "bg-white border-amber-200 shadow-2xs" : "bg-slate-50 border-slate-200 opacity-80"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-lg">🛒</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={form.walletRedeemEnabled}
                onChange={(e) => setForm({ ...form, walletRedeemEnabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
            </label>
          </div>
          <h3 className="text-sm font-black text-navy-950">Checkout Redemption</h3>
          <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
            Allow customers to use their earned wallet cash to get direct discounts during checkout.
          </p>
          <div className="mt-3">
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                form.walletRedeemEnabled ? "bg-amber-100 text-amber-800" : "bg-slate-200 text-slate-600"
              }`}
            >
              {form.walletRedeemEnabled ? "ENABLED" : "DISABLED"}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Detailed Configuration Forms Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Cashback Rate & Limits */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-black text-navy-950">Order Cashback Configuration</h3>
              <p className="text-[10px] text-slate-500">Calculated strictly on net materials price</p>
            </div>
            <span className="text-[11px] font-bold text-slate-400">Delivered Orders Only</span>
          </div>

          <div className="space-y-3.5 text-xs">
            {/* Mode: Pure Percentage */}
            <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
              <span className="text-[11px] font-bold text-slate-700 uppercase">
                Cashback Mode
              </span>
              <span className="text-[10.5px] font-black text-brand-700 bg-brand-50 px-2.5 py-0.5 rounded-full border border-brand-200">
                Percentage (%) Mode
              </span>
            </div>

            {/* Rate Value */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                Cashback Rate (%)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="100"
                  value={form.cashbackValue}
                  onChange={(e) => setForm({ ...form, cashbackValue: Number(e.target.value) })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-black text-navy-950 focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none"
                />
                <span className="absolute right-3 top-2 text-xs font-bold text-slate-400">
                  %
                </span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Cashback net materials price par banta hai (Delivery fee aur BuildCity Due wallet discount hatane ke baad).
              </p>
            </div>

            {/* Minimum Order Value */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                Minimum Qualifying Order Value (₹)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="500"
                  min="0"
                  value={form.minOrderForCashback}
                  onChange={(e) => setForm({ ...form, minOrderForCashback: Number(e.target.value) })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-black text-navy-950 focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none"
                />
                <span className="absolute right-3 top-2 text-xs font-bold text-slate-400">₹</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Orders below this amount will receive ₹0 cashback.</p>
            </div>

            {/* Maximum Cap per Order */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                Maximum Cashback Cap per Order (₹)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="50"
                  min="0"
                  value={form.maxCashbackCap}
                  onChange={(e) => setForm({ ...form, maxCashbackCap: Number(e.target.value) })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-black text-navy-950 focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none"
                />
                <span className="absolute right-3 top-2 text-xs font-bold text-slate-400">₹</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Protects margin on bulk orders (e.g. ₹1,00,000 order gets capped at ₹{form.maxCashbackCap}).
              </p>
            </div>

            {/* Live Calculation Example */}
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/70 text-[11px] space-y-1">
              <span className="font-bold text-navy-950 block">Live Calculator Example:</span>
              <p className="text-slate-600">
                Agar customer <strong className="text-navy-900">₹{previewOrderAmount.toLocaleString("en-IN")}</strong> net materials ka order karta hai, toh uske wallet mein{" "}
                <strong className="text-emerald-700 font-black">₹{calculatedCashback}</strong> credit hoga. (Delivery charges excluded).
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Referral Rewards & Checkout Limits */}
        <div className="space-y-6">
          {/* Referral Reward Settings */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-black text-navy-950">Referral Reward Payouts</h3>
                <p className="text-[10px] text-slate-500">Lifetime commission on all qualifying orders</p>
              </div>
              <span className="text-[11px] font-bold text-slate-400">Lifetime Commission</span>
            </div>

            <div className="space-y-3.5 text-xs">
              {/* Pure Percentage Mode */}
              <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
                <span className="text-[11px] font-bold text-slate-700 uppercase">
                  Referral Reward Mode
                </span>
                <span className="text-[10.5px] font-black text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  Lifetime Percentage (%) Mode
                </span>
              </div>

              {/* Referrer Reward Input */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Referrer Commission Rate (%)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="100"
                    value={form.referrerReward}
                    onChange={(e) => setForm({ ...form, referrerReward: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-black text-navy-950 focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none"
                  />
                  <span className="absolute right-3 top-2 text-xs font-bold text-slate-400">
                    %
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Referee ke har qualifying delivered order par net materials price ka ye % referrer ke wallet me credit hoga (Lifetime Commission).
                </p>
              </div>

              {/* Live Calculator Preview Box (Accurate & Clear) */}
              <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200/80 text-[11px] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-navy-950">Live Referral Calculator:</span>
                  <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/80">
                    {form.referrerReward}% Lifetime on Every Qualifying Order
                  </span>
                </div>

                <div className="bg-white rounded-lg p-2.5 border border-slate-200/90 space-y-1">
                  <div className="flex justify-between text-slate-500 text-[10.5px]">
                    <span>Sample Net Materials Order:</span>
                    <strong className="text-navy-900 font-bold">₹1,00,000</strong>
                  </div>
                  <div className="flex justify-between text-slate-500 text-[10.5px]">
                    <span>Commission Rate:</span>
                    <strong className="text-navy-900 font-bold">{form.referrerReward}%</strong>
                  </div>
                  <div className="flex justify-between text-navy-950 font-black text-xs pt-1 border-t border-slate-100">
                    <span>Referrer ko Milega:</span>
                    <span className="text-emerald-600 font-extrabold text-sm">
                      ₹{((100000 * Number(form.referrerReward || 0)) / 100).toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>

                <p className="text-[10px] text-slate-500 leading-relaxed">
                  ✓ Referee ko uske order ka normal Cashback net materials price par milega.<br />
                  ✓ Referrer ko referee ke <strong>har qualifying delivered order</strong> par lifetime commission seedha wallet me milega.<br />
                  ✓ Delivery fee aur BuildCity Due wallet discount hatane ke baad strictly final materials price par commission calculate hota hai.
                </p>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-100 border border-slate-200/80 text-[10.5px] text-slate-700 leading-relaxed">
                <strong>Safety Condition:</strong> Referral rewards are strictly credited in the background when the order status is updated to <strong>DELIVERED</strong>.
              </div>
            </div>
          </div>

          {/* Checkout Redemption Limits */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-black text-navy-950">Checkout Redemption Limits</h3>
              </div>
              <span className="text-[11px] font-bold text-slate-400">Anti-Abuse Cap</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Max Wallet % of Cart
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="1"
                    min="1"
                    max="100"
                    value={form.maxWalletUsagePercent ?? ""}
                    onChange={(e) => setForm({ ...form, maxWalletUsagePercent: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-black text-navy-950 focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none"
                  />
                  <span className="absolute right-3 top-2 text-xs font-bold text-slate-400">%</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Max % of bill paid via wallet.</p>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Max Flat Deduction (₹)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="50"
                    min="0"
                    value={form.maxWalletUsageFlat ?? ""}
                    onChange={(e) => setForm({ ...form, maxWalletUsageFlat: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-black text-navy-950 focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none"
                  />
                  <span className="absolute right-3 top-2 text-xs font-bold text-slate-400">₹</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Ceiling per single order.</p>
              </div>
            </div>
          </div>

          {/* Free Delivery Threshold Rules */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-black text-navy-950">Free Delivery Rules & Threshold</h3>
              </div>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${form.freeDeliveryEnabled ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-500 border-slate-200"}`}>
                {form.freeDeliveryEnabled ? "Active" : "Deactivated"}
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <label className="flex items-center gap-2.5 cursor-pointer bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 hover:bg-slate-100/70 transition-colors">
                <input
                  type="checkbox"
                  checked={Boolean(form.freeDeliveryEnabled)}
                  onChange={(e) => setForm({ ...form, freeDeliveryEnabled: e.target.checked })}
                  className="w-4 h-4 rounded text-emerald-600 accent-emerald-600 cursor-pointer"
                />
                <div>
                  <p className="text-xs font-black text-navy-950">Enable Free Delivery Program</p>
                  <p className="text-[10px] text-slate-500">Qualifying high-value cart orders will get 100% Free District Delivery.</p>
                </div>
              </label>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Minimum Qualifying Order Value (₹)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="500"
                    min="0"
                    disabled={!form.freeDeliveryEnabled}
                    value={form.freeDeliveryMinAmount ?? ""}
                    onChange={(e) => setForm({ ...form, freeDeliveryMinAmount: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-black text-navy-950 focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none disabled:opacity-40"
                  />
                  <span className="absolute right-3 top-2 text-xs font-bold text-slate-400">₹</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  {form.freeDeliveryEnabled
                    ? `Cart subtotal at or above ₹${Number(form.freeDeliveryMinAmount || 0).toLocaleString("en-IN")} gets Free Delivery (₹0). Below this, district fee applies.`
                    : "Free delivery disabled. District base fee will always apply on all orders."}
                </p>
              </div>

              {/* Card Save Action */}
              <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-slate-100">
                <div>
                  {deliverySaveSuccess && (
                    <span className="text-xs font-bold text-emerald-600 flex items-center gap-1.5">
                      <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                      </svg>
                      Delivery rule updated successfully!
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleSaveDeliveryRules}
                  disabled={savingDelivery}
                  className="px-4 py-2 rounded-xl bg-navy-900 hover:bg-navy-800 text-white font-bold text-xs shadow-xs active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer shrink-0"
                >
                  {savingDelivery ? (
                    <>
                      <svg className="animate-spin h-3.5 w-3.5 text-white" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                      </svg>
                      <span>Saving Rule...</span>
                    </>
                  ) : (
                    <span>Save Delivery Rule</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Customer Wallet Inspector & Manual Adjustment Table */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black text-navy-950">Customer Wallet Inspector</h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                {walletUsers.length} total
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Lookup customer wallet balances, view referral codes, or manually credit/debit for customer support.
            </p>
          </div>

          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Search phone or name..."
              value={searchPhone}
              onChange={(e) => setSearchPhone(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-navy-950 focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none w-48 sm:w-56"
            />
            <button
              type="submit"
              className="bg-navy-900 text-white font-bold text-xs px-3 py-1.5 rounded-xl hover:bg-navy-800 transition-colors"
            >
              Search
            </button>
          </form>
        </div>

        {/* Customer Table with Internal Fixed Scroll (Whole page does not scroll) */}
        <div className="max-h-[440px] overflow-y-auto overflow-x-auto rounded-xl border border-slate-200/80">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-slate-50 z-10 shadow-2xs">
              <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-2.5 px-3">Customer</th>
                <th className="py-2.5 px-3">Phone</th>
                <th className="py-2.5 px-3">Referral Code</th>
                <th className="py-2.5 px-3">Referred By</th>
                <th className="py-2.5 px-3">Wallet Balance</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 bg-white">
              {walletUsers.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-slate-400">
                    No customers found matching search criteria.
                  </td>
                </tr>
              ) : (
                walletUsers.slice(0, visibleWalletUsersCount).map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3 font-bold text-navy-950">{u.name || "Customer"}</td>
                    <td className="py-3 px-3 font-mono text-slate-600">{u.phone}</td>
                    <td className="py-3 px-3 font-mono font-black text-brand-600">
                      {u.referralCode || "—"}
                    </td>
                    <td className="py-3 px-3 text-slate-500 text-[11px]">
                      {u.referredBy ? "Linked" : "Direct"}
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60">
                        ₹{Number(u.walletBalance || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => handleOpenAdjust(u)}
                        className="bg-slate-100 hover:bg-slate-200 text-navy-950 font-bold text-[11px] px-2.5 py-1 rounded-lg border border-slate-200 transition-colors active:scale-95"
                      >
                        Adjust
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Load More Button (Loads after 10 rows without page scrolling) */}
        {walletUsers.length > 10 && (
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-slate-100">
            <span className="text-[11px] font-semibold text-slate-500">
              Showing {Math.min(visibleWalletUsersCount, walletUsers.length)} of {walletUsers.length} customers
            </span>
            {walletUsers.length > visibleWalletUsersCount ? (
              <button
                type="button"
                onClick={() => setVisibleWalletUsersCount((prev) => prev + 10)}
                className="px-4 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-navy-950 font-extrabold text-xs border border-slate-200 transition-all active:scale-95 cursor-pointer shadow-2xs"
              >
                Load More Customers (+10)
              </button>
            ) : (
              <span className="text-[11px] text-slate-400 font-medium">All customers loaded</span>
            )}
          </div>
        )}
      </div>

      {/* Manual Wallet Adjustment Modal */}
      {adjustModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-black text-navy-950">Manual Wallet Adjustment</h3>
                <p className="text-[11px] text-slate-500">
                  {adjustModal.user?.name} ({adjustModal.user?.phone})
                </p>
              </div>
              <button
                onClick={() => setAdjustModal({ ...adjustModal, open: false })}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleExecuteAdjust} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase text-[10px] mb-1">
                  Action Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjustModal({ ...adjustModal, action: "CREDIT" })}
                    className={`py-2 rounded-xl font-bold border transition-all ${
                      adjustModal.action === "CREDIT"
                        ? "bg-emerald-600 text-white border-emerald-600"
                        : "bg-slate-50 text-slate-700 border-slate-200"
                    }`}
                  >
                    + Credit Cash
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustModal({ ...adjustModal, action: "DEBIT" })}
                    className={`py-2 rounded-xl font-bold border transition-all ${
                      adjustModal.action === "DEBIT"
                        ? "bg-rose-600 text-white border-rose-600"
                        : "bg-slate-50 text-slate-700 border-slate-200"
                    }`}
                  >
                    - Deduct Cash
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase text-[10px] mb-1">
                  Amount (₹)
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  placeholder="e.g. 100"
                  value={adjustModal.amount}
                  onChange={(e) => setAdjustModal({ ...adjustModal, amount: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-navy-950 focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase text-[10px] mb-1">
                  Reason / Audit Note
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Compensation for dispatch delay"
                  value={adjustModal.reason}
                  onChange={(e) => setAdjustModal({ ...adjustModal, reason: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-navy-950 focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAdjustModal({ ...adjustModal, open: false })}
                  className="px-3 py-2 rounded-xl font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adjustModal.submitting}
                  className="px-4 py-2 rounded-xl font-bold text-white bg-navy-950 hover:bg-navy-900 transition-colors shadow-xs disabled:opacity-50"
                >
                  {adjustModal.submitting ? "Processing..." : "Confirm Adjustment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
