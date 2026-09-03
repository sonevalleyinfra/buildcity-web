import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import AuthLayout from "../../layouts/AuthLayout";
import Button from "../../components/Button";
import { useAuth } from "../../context/AuthContext";

// Login Page component — User / Vendor / DR / Admin ka universal login screen
export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/";

  const { requestOtp, verifyOtp, vendorLogin } = useAuth();

  // Mode: "standard" (OTP for Customer) vs "vendor" (Phone & Password for Vendor / DR / Admin Partners)
  const [mode, setMode] = useState("standard");
  const [step, setStep] = useState("phone"); // "phone" | "otp"
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [role, setRole] = useState("customer");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
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

  // Customer OTP Request
  const handleSendOtp = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (cooldown > 0 && step === "otp") return;
    setError("");
    const cleanedMobile = phone.replace(/\D/g, "").slice(-10);
    if (cleanedMobile.length !== 10) {
      setError("Please enter a valid 10-digit mobile number");
      return;
    }

    // Check if entered phone belongs to a Partner (Vendor / DR / Admin)
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
      setError("⚠️ Partner Account Detected! Vendors, DRs, and Admins must log in using 'Partner Login (Password)'.");
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
              👉 Click here to Create Account →
            </Link>
          </span>
        );
      } else {
        setError(err?.message || "Failed to send OTP. Please check mobile number.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Customer OTP Verification
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

  // Partner / Admin / DR / Vendor Password Authentication
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
      const userObj = await vendorLogin({ phone: phone.trim(), password: password.trim() });
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

  const footerVendorAction = mode === "standard" ? (
    <button
      type="button"
      onClick={() => {
        setMode("vendor");
        setError("");
      }}
      className="text-xs font-extrabold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-4 py-2.5 rounded-xl transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-2xs active:scale-[0.98]"
    >
      <span>🏬 Partner Login (Password) →</span>
    </button>
  ) : (
    <button
      type="button"
      onClick={() => {
        setMode("standard");
        setError("");
      }}
      className="text-xs font-bold text-slate-500 hover:text-navy-900 transition-all cursor-pointer inline-flex items-center gap-1"
    >
      <span>← Back to Customer Login (OTP)</span>
    </button>
  );

  return (
    <AuthLayout footerRight={footerVendorAction}>
      <h1 className="text-2xl font-bold text-navy-900 mb-1">
        {mode === "vendor" ? "Partner Portal Login 🏬" : "Welcome back 👋"}
      </h1>
      <p className="text-sm text-slate-500 mb-6">
        {mode === "vendor"
          ? "Login with your registered mobile number and password"
          : step === "phone"
          ? "Login with your phone number — no password needed"
          : `Enter the OTP sent to +91 ${phone}`}
      </p>

      {error && (
        <div className={`mb-5 p-3.5 rounded-2xl border ${
          error.includes("Partner") || error.includes("Vendor") || error.includes("DR") || error.includes("Admin")
            ? "bg-amber-50 border-amber-200 text-amber-900"
            : "bg-rose-50 border-rose-200 text-rose-700"
        } text-xs font-bold leading-relaxed shadow-2xs animate-in fade-in`}>
          <p>{error}</p>
        </div>
      )}

      {mode === "vendor" ? (
        /* PARTNER / ADMIN / DR / VENDOR PASSWORD LOGIN FORM */
        <form onSubmit={handleVendorPasswordLogin} noValidate className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-navy-900 mb-1.5">
              Registered Mobile Number
            </label>
            <div className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 focus-within:border-emerald-500">
              <span className="text-sm text-slate-500 shrink-0">+91</span>
              <span className="text-slate-200">|</span>
              <input
                type="tel"
                inputMode="numeric"
                maxLength={10}
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                placeholder="Registered 10-digit mobile number"
                className="w-full bg-transparent text-sm text-navy-900 placeholder:text-slate-400 outline-none font-bold"
                autoFocus
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-navy-900 mb-1.5">
              Login Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              className="w-full text-sm font-medium rounded-xl border border-slate-200 bg-white px-3.5 py-3 outline-none focus:border-emerald-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-extrabold text-sm py-3.5 rounded-xl shadow-md active:scale-[0.98] transition-all cursor-pointer disabled:opacity-60 mt-2"
          >
            {loading ? "Authenticating..." : "Login to Dashboard →"}
          </button>
        </form>
      ) : step === "phone" ? (
        /* CUSTOMER OTP REQUEST FORM */
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
        </form>
      ) : (
        /* CUSTOMER OTP VERIFY FORM */
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
                🔄 Resend OTP
              </button>
            )}
          </div>
        </form>
      )}

      <div id="recaptcha-container"></div>
    </AuthLayout>
  );
}