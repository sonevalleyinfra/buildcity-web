import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import AuthLayout from "../../layouts/AuthLayout";
import Button from "../../components/Button";
import { useAuth } from "../../context/AuthContext";

import { Capacitor } from "@capacitor/core";
import { initVendorPushNotifications, getDeviceFcmToken, markFcmTokenSynced } from "../../utils/pushNotifications";
import { isVendorApp } from "../../config/appMode";

// Login screen component - customer, vendor aur admin sabhi yahan se login karte hain
// forceVendorMode se web route par direct password login khulta hai
export default function Login({ forceVendorMode = false }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/";

  const { requestOtp, verifyOtp, vendorLogin } = useAuth();

  // Mode do tarah ka hai: customer ke liye OTP aur partner/vendor ke liye password
  const isNativeCustomer = Capacitor.isNativePlatform() && !isVendorApp;
  const [mode, setMode] = useState(!isNativeCustomer && (isVendorApp || forceVendorMode) ? "vendor" : "standard");
  const [partnerSubView, setPartnerSubView] = useState("login"); // "login" | "register" | "forgot"
  const [step, setStep] = useState("phone"); // "phone" ya "otp" step
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [role, setRole] = useState("customer");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Partner Registration Form State
  const [regForm, setRegForm] = useState({
    shopName: "",
    ownerName: "",
    phone: "",
    district: "Varanasi",
    address: "",
    password: "",
    confirmPassword: "",
    otp: "",
  });
  const [regOtpSent, setRegOtpSent] = useState(false);
  const [regCooldown, setRegCooldown] = useState(0);

  // Forgot Password State
  const [forgotForm, setForgotForm] = useState({
    phone: "",
    otp: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [forgotOtpSent, setForgotOtpSent] = useState(false);
  const [forgotCooldown, setForgotCooldown] = useState(0);

  const [cooldown, setCooldown] = useState(() => {
    try {
      const savedExpire = sessionStorage.getItem("buildcity_otp_expire");
      if (savedExpire) {
        const remaining = Math.max(0, Math.ceil((Number(savedExpire) - Date.now()) / 1000));
        return remaining;
      }
    } catch {}
    return 0;
  });

  useEffect(() => {
    if (regCooldown <= 0) return;
    const t = setInterval(() => setRegCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [regCooldown]);

  useEffect(() => {
    if (forgotCooldown <= 0) return;
    const t = setInterval(() => setForgotCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [forgotCooldown]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          try { sessionStorage.removeItem("buildcity_otp_expire"); } catch {}
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const formatCooldown = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m > 0 ? `${m}:${s.toString().padStart(2, "0")}` : `${s}s`;
  };

  // Customer ke phone pe OTP bhejne ka function
  const handleSendOtp = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (cooldown > 0 && step === "otp") return;
    setError("");
    const cleanedMobile = phone.replace(/\D/g, "").slice(-10);
    if (cleanedMobile.length !== 10) {
      setError("Please enter a valid 10-digit mobile number");
      return;
    }

    // Pehle check kar rahe hain ki yeh number partner ya staff ka toh nahi hai
    let isPartnerPhone = false;
    if (cleanedMobile === "9999999999" || cleanedMobile === "7777777777") {
      isPartnerPhone = true;
    } else {
      try {
        const savedVendors = localStorage.getItem("buildcity_admin_vendors");
        const vendors = savedVendors ? JSON.parse(savedVendors) : [];
        if (vendors.some((v) => (v.phone || "").replace(/\D/g, "").slice(-10) === cleanedMobile)) {
          isPartnerPhone = true;
        }
        const savedDrs = localStorage.getItem("buildcity_admin_drs");
        const drs = savedDrs ? JSON.parse(savedDrs) : [];
        if (drs.some((d) => (d.phone || "").replace(/\D/g, "").slice(-10) === cleanedMobile)) {
          isPartnerPhone = true;
        }
      } catch {}
    }

    if (isPartnerPhone) {
      if (isVendorApp) {
        setMode("vendor");
        setError("Please enter your password to login.");
      } else {
        setError(" This number is registered as a Partner account. Please use the BuildCity Partner app.");
      }
      return;
    }

    setLoading(true);
    try {
      await requestOtp(cleanedMobile, "login");
      setStep("otp");
      const expireTime = Date.now() + 90 * 1000;
      try { sessionStorage.setItem("buildcity_otp_expire", expireTime.toString()); } catch {}
      setCooldown(90);
    } catch (err) {
      if (err.notRegistered) {
        setError(
          <span>
            {err.message || "This mobile number is not registered."}{" "}
            <Link
              to={`/register?phone=${cleanedMobile}&redirect=${encodeURIComponent(redirectTo)}`}
              className="underline font-bold text-brand-600 block mt-1.5"
            >
               Click here to Create Account →
            </Link>
          </span>
        );
      } else {
        const rawErr = err?.message || "";
        const cleanMsg = rawErr.toLowerCase().includes("failed to fetch")
          ? "Network connection issue. Please check your internet connection or try again."
          : rawErr || "Failed to send OTP. Please check mobile number.";
        setError(cleanMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  // Customer ka OTP verify karne ka function
  const handleVerify = async (e) => {
    e.preventDefault();
    setError("");
    if (!/^\d{4,6}$/.test(otp.trim())) {
      setError("Please enter the OTP sent to your mobile number");
      return;
    }

    setLoading(true);
    try {
      const cleanedMobile = phone.replace(/\D/g, "").slice(-10);
      const user = await verifyOtp({ phone: cleanedMobile, otp: otp.trim(), role });
      
      const home =
        user.role === "admin"
          ? "/admin/dashboard"
          : user.role === "dr"
          ? "/dr/dashboard"
          : user.role === "vendor"
          ? "/vendor/dashboard"
          : redirectTo;
          
      navigate(home, { replace: true });
    } catch (err) {
      setError(err?.message || "Verification failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Vendor aur partner ka password check karke login karne ka logic
  const handleVendorPasswordLogin = async (e) => {
    e.preventDefault();
    setError("");
    if (!/^\d{10}$/.test(phone.trim())) {
      setError("Please enter a valid 10-digit registered mobile number");
      return;
    }
    if (!password.trim()) {
      setError("Please enter your Login Password");
      return;
    }

    setLoading(true);
    try {
      // Device ka notification token nikaal rahe hain taaki login ke sath bhej sakein
      let fcmToken = null;
      try {
        fcmToken = localStorage.getItem("buildcity_permanent_device_token") || localStorage.getItem("vendor_fcm_token");
        if (!fcmToken && Capacitor.isNativePlatform()) {
          fcmToken = await getDeviceFcmToken(1500);
        }
      } catch (_) {}

      const userObj = await vendorLogin({
        phone: phone.trim(),
        password: password.trim(),
        fcmToken,
      });

      const vid = userObj?.vendorInfo?.id || userObj?.vendorId || userObj?.id;
      // Vendor ke liye device token sync ho chuka hai
      if (vid && fcmToken && userObj.role === "vendor") markFcmTokenSynced(vid, fcmToken);
      if (vid) {
        initVendorPushNotifications(vid, { phone: phone.trim() }).catch(() => {});
      }
      const home =
        userObj.role === "admin"
          ? "/admin/dashboard"
          : userObj.role === "dr"
          ? "/dr/dashboard"
          : "/vendor/dashboard";

      navigate(home, { replace: true });
    } catch (err) {
      setError(err?.message || "Login failed. Invalid Mobile or Password.");
    } finally {
      setLoading(false);
    }
  };

  // 1. Partner Self-Registration Handlers
  const handleRegisterPartnerSendOtp = async () => {
    if (loading || regCooldown > 0) return;
    setError("");
    setSuccessMsg("");
    const cleaned = regForm.phone.replace(/\D/g, "").slice(-10);
    if (cleaned.length !== 10) {
      setError("Please enter a valid 10-digit mobile number.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/v1/auth/otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: cleaned, type: "register" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.success === false) {
        throw new Error(data.error || "Failed to dispatch verification OTP.");
      }
      setRegOtpSent(true);
      setRegCooldown(90);
      setSuccessMsg(`OTP sent to +91 ${cleaned}. Please enter it below.`);
    } catch (err) {
      setError(err?.message || "Could not send OTP. Please check the number.");
    } finally {
      setLoading(false);
    }
  };

  const handlePartnerRegisterSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    if (!regForm.shopName.trim()) {
      setError("Please enter your Shop / Business Name.");
      return;
    }
    if (!regForm.ownerName.trim()) {
      setError("Please enter Owner Name.");
      return;
    }
    const cleaned = regForm.phone.replace(/\D/g, "").slice(-10);
    if (cleaned.length !== 10) {
      setError("Please enter a valid 10-digit mobile number.");
      return;
    }
    if (!regForm.otp || regForm.otp.trim().length < 4) {
      setError("Please verify your phone by entering the OTP sent to your number.");
      return;
    }
    if (!regForm.password || regForm.password.trim().length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }
    const cleanRegPw = regForm.password.trim();
    const commonPasswords = ["12345678", "password", "password123", "vendor123", "admin123", "123456789", "buildcity123", "iloveyou"];
    if (commonPasswords.includes(cleanRegPw.toLowerCase())) {
      setError("This password is too common. Please choose a stronger password (e.g. MyShop@2026).");
      return;
    }
    if (cleaned && (cleanRegPw.includes(cleaned) || cleanRegPw.replace(/\D/g, "") === cleaned)) {
      setError("Password must not contain your mobile number.");
      return;
    }
    if (regForm.password !== regForm.confirmPassword) {
      setError("Password and Confirm Password do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/v1/auth/vendor/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shopName: regForm.shopName.trim(),
          ownerName: regForm.ownerName.trim(),
          phone: cleaned,
          password: regForm.password.trim(),
          districtName: regForm.district,
          address: regForm.address.trim(),
          otp: regForm.otp.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to submit partner application.");
      }
      setPartnerSubView("login");
      setSuccessMsg("🎉 Partnership request submitted! BuildCity team will review and activate your account shortly.");
      setPhone(cleaned);
      setPassword("");
    } catch (err) {
      setError(err?.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // 2. Forgot Password Handlers
  const handleForgotSendOtp = async () => {
    if (loading || forgotCooldown > 0) return;
    setError("");
    setSuccessMsg("");
    const cleaned = forgotForm.phone.replace(/\D/g, "").slice(-10);
    if (cleaned.length !== 10) {
      setError("Please enter your 10-digit registered mobile number.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/v1/auth/otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: cleaned, type: "forgot_password" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.success === false) {
        throw new Error(data.error || "Failed to send OTP.");
      }
      setForgotOtpSent(true);
      setForgotCooldown(90);
      setSuccessMsg(`OTP sent to +91 ${cleaned}.`);
    } catch (err) {
      setError(err?.message || "Could not send OTP. Check mobile number.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    const cleaned = forgotForm.phone.replace(/\D/g, "").slice(-10);
    if (cleaned.length !== 10) {
      setError("Enter registered 10-digit mobile number.");
      return;
    }
    if (!forgotForm.otp || forgotForm.otp.trim().length < 4) {
      setError("Please enter the verification OTP.");
      return;
    }
    if (!forgotForm.newPassword || forgotForm.newPassword.trim().length < 8) {
      setError("New password must be at least 8 characters long.");
      return;
    }
    const cleanForgotPw = forgotForm.newPassword.trim();
    const commonPasswords = ["12345678", "password", "password123", "vendor123", "admin123", "123456789", "buildcity123", "iloveyou"];
    if (commonPasswords.includes(cleanForgotPw.toLowerCase())) {
      setError("This password is too common. Please choose a stronger password (e.g. MyShop@2026).");
      return;
    }
    if (cleaned && (cleanForgotPw.includes(cleaned) || cleanForgotPw.replace(/\D/g, "") === cleaned)) {
      setError("Password must not contain your mobile number.");
      return;
    }
    if (forgotForm.newPassword !== forgotForm.confirmPassword) {
      setError("New password and confirm password do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/v1/auth/vendor/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: cleaned,
          otp: forgotForm.otp.trim(),
          newPassword: forgotForm.newPassword.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Password reset failed.");
      }
      setPartnerSubView("login");
      setSuccessMsg("🔐 Password reset successful! You can now sign in with your new password.");
      setPhone(cleaned);
      setPassword("");
    } catch (err) {
      setError(err?.message || "Password reset failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const footerVendorAction = null;

  return (
    <AuthLayout footerRight={footerVendorAction}>
      {!isVendorApp && mode === "standard" && (
        <div className="flex items-center bg-slate-100/80 p-1 rounded-xl mb-6 border border-slate-200/80">
          <button
            type="button"
            className="flex-1 py-2 text-xs font-black rounded-lg bg-white text-navy-900 shadow-2xs transition-all"
          >
             Customer Login
          </button>
          <Link
            to={`/register?redirect=${encodeURIComponent(redirectTo)}`}
            className="flex-1 py-2 text-xs font-bold rounded-lg text-slate-500 hover:text-navy-900 text-center transition-all"
          >
             Create Account
          </Link>
        </div>
      )}

      <h1 className={mode === "vendor" ? "text-2xl font-semibold text-slate-900 mb-1 tracking-tight" : "text-2xl font-black text-navy-900 mb-1 tracking-tight"}>
        {mode === "vendor"
          ? partnerSubView === "register"
            ? "Become a BuildCity Partner 🏪"
            : partnerSubView === "forgot"
            ? "Reset Password 🔐"
            : "Partner sign in"
          : "Welcome back "}
      </h1>
      <p className={mode === "vendor" ? "text-sm text-slate-500 mb-6" : "text-xs text-slate-500 mb-6"}>
        {mode === "vendor"
          ? partnerSubView === "register"
            ? "Fill in your shop details to join our vendor & supplier network."
            : partnerSubView === "forgot"
            ? "Verify your mobile number via OTP to set a new password."
            : "Use your registered mobile number and password."
          : step === "phone"
          ? "Login with your registered phone number via OTP"
          : `Enter the OTP sent to +91 ${phone}`}
      </p>

      {successMsg && (
        <div role="status" className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-3 text-sm text-emerald-800 font-medium animate-in fade-in">
          {successMsg}
        </div>
      )}

      {error && (
        <div role="alert" className={`mb-5 p-3.5 rounded-xl border text-xs font-bold leading-relaxed shadow-2xs animate-in fade-in ${
          typeof error === "string" && (error.includes("Partner") || error.includes("Vendor") || error.includes("DR") || error.includes("Admin"))
            ? "bg-amber-50 border-amber-200 text-amber-900"
            : "bg-rose-50 border-rose-200 text-rose-700"
        }`}>
          {error}
        </div>
      )}

      {mode === "vendor" ? (
        partnerSubView === "register" ? (
          /* ============================================================== */
          /* 1. BECOME A PARTNER / VENDOR REGISTRATION FORM                 */
          /* ============================================================== */
          <form onSubmit={handlePartnerRegisterSubmit} noValidate className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Shop / Business Name *
              </label>
              <input
                type="text"
                required
                value={regForm.shopName}
                onChange={(e) => setRegForm({ ...regForm, shopName: e.target.value })}
                placeholder="e.g. Shree Ram Hardware & Building Materials"
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-brand-500 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Owner / Contact Person *
              </label>
              <input
                type="text"
                required
                value={regForm.ownerName}
                onChange={(e) => setRegForm({ ...regForm, ownerName: e.target.value })}
                placeholder="e.g. Ramesh Kumar"
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-brand-500 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Mobile Number (For Login & OTP) *
              </label>
              <div className="flex gap-2">
                <div className="flex h-11 flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 focus-within:border-brand-500">
                  <span className="text-xs text-slate-500 shrink-0 font-bold">+91</span>
                  <input
                    type="tel"
                    maxLength={10}
                    value={regForm.phone}
                    onChange={(e) => setRegForm({ ...regForm, phone: e.target.value.replace(/\D/g, "") })}
                    placeholder="10-digit number"
                    className="w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400 outline-none font-bold"
                  />
                </div>
                <button
                  type="button"
                  disabled={loading || regCooldown > 0}
                  onClick={handleRegisterPartnerSendOtp}
                  className="px-3.5 h-11 text-xs font-bold rounded-xl bg-slate-900 hover:bg-slate-800 text-white shrink-0 disabled:opacity-50 cursor-pointer active:scale-95 transition-all"
                >
                  {regCooldown > 0 ? `${regCooldown}s` : regOtpSent ? "Resend OTP" : "Send OTP"}
                </button>
              </div>
            </div>

            {regOtpSent && (
              <div>
                <label className="block text-xs font-bold text-brand-700 mb-1">
                  Enter 6-digit OTP sent to Mobile *
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={regForm.otp}
                  onChange={(e) => setRegForm({ ...regForm, otp: e.target.value.replace(/\D/g, "") })}
                  placeholder="Enter SMS OTP"
                  className="h-11 w-full rounded-xl border border-brand-300 bg-brand-50/50 px-3.5 text-sm font-bold text-center tracking-widest text-slate-900 outline-none focus:border-brand-600 focus:bg-white"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                District / Delivery Region *
              </label>
              <select
                value={regForm.district}
                onChange={(e) => setRegForm({ ...regForm, district: e.target.value })}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-brand-500 font-medium"
              >
                <option value="Varanasi">Varanasi</option>
                <option value="Prayagraj">Prayagraj</option>
                <option value="Mirzapur">Mirzapur</option>
                <option value="Jaunpur">Jaunpur</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Shop Address / Landmark (Optional)
              </label>
              <input
                type="text"
                value={regForm.address}
                onChange={(e) => setRegForm({ ...regForm, address: e.target.value })}
                placeholder="e.g. Near Shiv Mandir, Main Road"
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-brand-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Create Password *
                </label>
                <input
                  type="password"
                  required
                  value={regForm.password}
                  onChange={(e) => setRegForm({ ...regForm, password: e.target.value })}
                  placeholder="Min 8 characters"
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-900 outline-none focus:border-brand-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Confirm Password *
                </label>
                <input
                  type="password"
                  required
                  value={regForm.confirmPassword}
                  onChange={(e) => setRegForm({ ...regForm, confirmPassword: e.target.value })}
                  placeholder="Re-enter password"
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-900 outline-none focus:border-brand-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand-600 text-sm font-semibold text-white transition-colors hover:bg-brand-700 cursor-pointer disabled:opacity-60 shadow-xs mt-2"
            >
              {loading && <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />}
              {loading ? "Submitting Request..." : "Register as Partner"}
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setError("");
                  setSuccessMsg("");
                  setPartnerSubView("login");
                }}
                className="text-xs font-bold text-slate-600 hover:text-brand-600 cursor-pointer underline"
              >
                ← Already have an account? Sign In
              </button>
            </div>
          </form>
        ) : partnerSubView === "forgot" ? (
          /* ============================================================== */
          /* 2. FORGOT PASSWORD (OTP RESET) FORM                            */
          /* ============================================================== */
          <form onSubmit={handleForgotSubmit} noValidate className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Registered Mobile Number *
              </label>
              <div className="flex gap-2">
                <div className="flex h-11 flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 focus-within:border-brand-500">
                  <span className="text-xs text-slate-500 shrink-0 font-bold">+91</span>
                  <input
                    type="tel"
                    maxLength={10}
                    value={forgotForm.phone}
                    onChange={(e) => setForgotForm({ ...forgotForm, phone: e.target.value.replace(/\D/g, "") })}
                    placeholder="10-digit number"
                    className="w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400 outline-none font-bold"
                  />
                </div>
                <button
                  type="button"
                  disabled={loading || forgotCooldown > 0}
                  onClick={handleForgotSendOtp}
                  className="px-3.5 h-11 text-xs font-bold rounded-xl bg-slate-900 hover:bg-slate-800 text-white shrink-0 disabled:opacity-50 cursor-pointer active:scale-95 transition-all"
                >
                  {forgotCooldown > 0 ? `${forgotCooldown}s` : forgotOtpSent ? "Resend OTP" : "Send OTP"}
                </button>
              </div>
            </div>

            {forgotOtpSent && (
              <div>
                <label className="block text-xs font-bold text-brand-700 mb-1">
                  Enter 6-digit OTP received via SMS *
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={forgotForm.otp}
                  onChange={(e) => setForgotForm({ ...forgotForm, otp: e.target.value.replace(/\D/g, "") })}
                  placeholder="Enter SMS OTP"
                  className="h-11 w-full rounded-xl border border-brand-300 bg-brand-50/50 px-3.5 text-sm font-bold text-center tracking-widest text-slate-900 outline-none focus:border-brand-600 focus:bg-white"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  New Password *
                </label>
                <input
                  type="password"
                  required
                  value={forgotForm.newPassword}
                  onChange={(e) => setForgotForm({ ...forgotForm, newPassword: e.target.value })}
                  placeholder="Min 8 characters"
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-900 outline-none focus:border-brand-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Confirm Password *
                </label>
                <input
                  type="password"
                  required
                  value={forgotForm.confirmPassword}
                  onChange={(e) => setForgotForm({ ...forgotForm, confirmPassword: e.target.value })}
                  placeholder="Re-enter password"
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-900 outline-none focus:border-brand-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !forgotOtpSent}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand-600 text-sm font-semibold text-white transition-colors hover:bg-brand-700 cursor-pointer disabled:opacity-60 shadow-xs mt-2"
            >
              {loading && <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />}
              {loading ? "Resetting Password..." : "Reset Password & Login"}
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setError("");
                  setSuccessMsg("");
                  setPartnerSubView("login");
                }}
                className="text-xs font-bold text-slate-600 hover:text-brand-600 cursor-pointer underline"
              >
                ← Back to Partner Sign In
              </button>
            </div>
          </form>
        ) : (
          /* ============================================================== */
          /* 3. PARTNER SIGN IN (LOGIN) FORM                                */
          /* ============================================================== */
          <form onSubmit={handleVendorPasswordLogin} noValidate className="space-y-4">
            <div>
              <label htmlFor="partner-phone" className="block text-sm font-medium text-slate-700 mb-1.5">
                Mobile number
              </label>
              <div className="flex h-12 items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3.5 transition-colors focus-within:border-slate-400">
                <span className="text-sm text-slate-500 shrink-0">+91</span>
                <span className="h-5 w-px bg-slate-200" aria-hidden="true" />
                <input
                  id="partner-phone"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  maxLength={10}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                  placeholder="10-digit number"
                  className="w-full bg-transparent text-base text-slate-900 placeholder:text-slate-400 outline-none font-medium"
                  autoFocus
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="partner-password" className="block text-sm font-medium text-slate-700">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setError("");
                    setSuccessMsg("");
                    setForgotForm({ phone: phone || "", otp: "", newPassword: "", confirmPassword: "" });
                    setPartnerSubView("forgot");
                  }}
                  className="text-xs font-bold text-brand-600 hover:text-brand-700 cursor-pointer"
                >
                  Forgot Password?
                </button>
              </div>
              <input
                id="partner-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="h-12 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-base font-medium text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-slate-400"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand-600 text-sm font-semibold text-white transition-colors hover:bg-brand-700 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading && <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" aria-hidden="true" />}
              {loading ? "Signing in" : "Sign in"}
            </button>

            {/* Become a Partner Callout */}
            <div className="pt-4 mt-2 border-t border-slate-200/80 text-center">
              <p className="text-xs text-slate-500 font-medium mb-2">New dealer or material supplier?</p>
              <button
                type="button"
                onClick={() => {
                  setError("");
                  setSuccessMsg("");
                  setRegForm({
                    shopName: "",
                    ownerName: "",
                    phone: phone || "",
                    district: "Varanasi",
                    address: "",
                    password: "",
                    confirmPassword: "",
                    otp: "",
                  });
                  setPartnerSubView("register");
                }}
                className="w-full py-2.5 px-3 rounded-xl border border-brand-200 bg-brand-50 hover:bg-brand-100 text-brand-700 text-xs font-bold transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-1.5"
              >
                🏪 Become a Partner / Register Shop →
              </button>
            </div>
          </form>
        )
      ) : step === "phone" ? (
        /* Customer phone number daal kar OTP request karne ka form */
        <form onSubmit={handleSendOtp} noValidate>
          <label className="block text-sm font-medium text-navy-900 mb-1.5">
            Phone Number
          </label>
          <div className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 mb-6 focus-within:border-brand-500">
            <span className="text-sm text-slate-500 shrink-0">+91</span>
            <span className="text-slate-200">|</span>
            <input
              type="tel"
              inputMode="numeric"
              maxLength={10}
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
              placeholder="Enter 10-digit mobile number"
              className="w-full bg-transparent text-sm text-navy-900 placeholder:text-slate-400 outline-none font-bold"
              autoFocus
            />
          </div>

          <Button type="submit" disabled={loading}>
            {loading ? "Sending OTP..." : "Continue with OTP"}
          </Button>

          <div className="mt-6 pt-5 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-500 font-medium">
              Don't have an account yet?{" "}
              <Link
                to={`/register?redirect=${encodeURIComponent(redirectTo)}`}
                className="font-black text-brand-600 hover:text-brand-700 underline ml-1 inline-flex items-center gap-0.5"
              >
                Create Account (Register) →
              </Link>
            </p>
            {!Capacitor.isNativePlatform() && !isVendorApp && (
              <div className="mt-4 pt-3 border-t border-slate-100">
                <Link
                  to="/vendor/login"
                  className="text-xs font-bold text-slate-500 hover:text-brand-600 transition-colors inline-flex items-center gap-1"
                >
                  Looking for Partner / Vendor Login? Click here →
                </Link>
              </div>
            )}
          </div>
        </form>
      ) : (
        /* Customer OTP daal kar login verify karne ka form */
        <form onSubmit={handleVerify} noValidate>
          <label className="block text-sm font-medium text-navy-900 mb-1.5">
            One-Time Password
          </label>
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
            placeholder="Enter 6-digit OTP"
            autoFocus
            className="w-full text-center tracking-[0.5em] text-lg font-bold rounded-xl border border-slate-200 bg-white px-3.5 py-3 mb-5 outline-none focus:border-brand-500 shadow-2xs"
          />

          <Button type="submit" disabled={loading}>
            {loading ? "Verifying..." : "Verify & Login"}
          </Button>

          <div className="flex items-center justify-between mt-5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                setStep("phone");
                setOtp("");
                setError("");
              }}
              className="text-xs font-semibold text-slate-500 hover:text-navy-900 cursor-pointer transition-colors"
            >
              ← Change Number
            </button>

            {cooldown > 0 ? (
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 bg-slate-100/90 border border-slate-200 px-3 py-1.5 rounded-xl shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-brand-500 animate-ping shrink-0" />
                <span>Resend OTP in</span>
                <span className="font-mono font-black text-brand-600 tabular-nums">{formatCooldown(cooldown)}</span>
              </div>
            ) : (
              <button
                type="button"
                disabled={loading}
                onClick={handleSendOtp}
                className="text-xs font-extrabold text-brand-600 hover:text-brand-700 bg-brand-50 hover:bg-brand-100 border border-brand-200 px-3 py-1.5 rounded-xl transition-all cursor-pointer shadow-2xs active:scale-[0.98]"
              >
                 Resend OTP
              </button>
            )}
          </div>
        </form>
      )}

      <div id="recaptcha-container"></div>
    </AuthLayout>
  );
}