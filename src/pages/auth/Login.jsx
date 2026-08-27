import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "../../layouts/AuthLayout";
import Button from "../../components/Button";
import { useAuth } from "../../context/AuthContext";

// Login Page component — User / Vendor / DR / Admin ka universal login screen
export default function Login() {
  const navigate = useNavigate();
  const { requestOtp, verifyOtp, vendorLogin } = useAuth();

  // Mode: "standard" (OTP for Customer/DR) vs "vendor" (Phone & Password for Vendor Partners)
  const [mode, setMode] = useState("standard");
  const [step, setStep] = useState("phone"); // "phone" | "otp"
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [role, setRole] = useState("customer");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [demoOtp, setDemoOtp] = useState("");

  // Customer / DR / Admin OTP Request
  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError("");
    const inputClean = phone.trim();
    const isAdminId = inputClean.toUpperCase() === "ADMIN2026";

    if (!isAdminId && !/^\d{10}$/.test(inputClean)) {
      setError("Please enter a valid 10-digit mobile number or Unique Admin ID");
      return;
    }

    setLoading(true);
    try {
      const resData = await requestOtp(inputClean);
      if (resData?.otp) {
        setDemoOtp(resData.otp);
      }
      setStep("otp");
    } catch (err) {
      setError(err?.message || "Failed to send OTP. Please check mobile number.");
    } finally {
      setLoading(false);
    }
  };

  // Customer / DR OTP Verification
  const handleVerify = async (e) => {
    e.preventDefault();
    setError("");
    if (!/^\d{4,6}$/.test(otp.trim())) {
      setError("Please enter the OTP sent to your mobile number");
      return;
    }

    setLoading(true);
    try {
      const user = await verifyOtp({ phone: phone.trim(), otp: otp.trim(), role });
      
      const home =
        user.role === "admin"
          ? "/admin/dashboard"
          : user.role === "dr"
          ? "/dr/dashboard"
          : user.role === "vendor"
          ? "/vendor/dashboard"
          : "/";
          
      navigate(home, { replace: true });
    } catch (err) {
      setError(err?.message || "Verification failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Vendor Partner Password Authentication
  const handleVendorPasswordLogin = async (e) => {
    e.preventDefault();
    setError("");
    if (!/^\d{10}$/.test(phone.trim())) {
      setError("Please enter a valid 10-digit registered mobile number");
      return;
    }
    if (!password.trim()) {
      setError("Please enter your Vendor Login Password");
      return;
    }

    setLoading(true);
    try {
      await vendorLogin({ phone: phone.trim(), password: password.trim() });
      navigate("/vendor/dashboard", { replace: true });
    } catch (err) {
      setError(err?.message || "Login failed. Invalid Phone or Password.");
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
      <span>🏬 Login as a Vendor Partner →</span>
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
      <span>← Back to Customer / DR Login (OTP)</span>
    </button>
  );

  return (
    <AuthLayout footerRight={footerVendorAction}>
      <h1 className="text-2xl font-bold text-navy-900 mb-1">
        {mode === "vendor" ? "Vendor Partner Login 🏬" : "Welcome back 👋"}
      </h1>
      <p className="text-sm text-slate-500 mb-6">
        {mode === "vendor"
          ? "Login with your registered mobile number and password assigned by DR or Admin"
          : step === "phone"
          ? "Login with your phone number — no password needed"
          : `Enter the OTP sent to +91 ${phone}`}
      </p>

      {error && <p className="mb-4 text-xs font-extrabold text-rose-600 bg-rose-50 p-3 rounded-xl border border-rose-200 leading-snug">{error}</p>}

      {mode === "vendor" ? (
        /* VENDOR PASSWORD LOGIN FORM */
        <form onSubmit={handleVendorPasswordLogin} noValidate className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-navy-900 mb-1.5">
              Vendor Registered Mobile Number
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
              Vendor Login Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password set by Admin / DR"
              className="w-full text-sm font-medium rounded-xl border border-slate-200 bg-white px-3.5 py-3 outline-none focus:border-emerald-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-extrabold text-sm py-3.5 rounded-xl shadow-md active:scale-[0.98] transition-all cursor-pointer disabled:opacity-60 mt-2"
          >
            {loading ? "Authenticating Vendor..." : "Login to Vendor Dashboard →"}
          </button>
        </form>
      ) : step === "phone" ? (
        /* CUSTOMER / DR / ADMIN LOGIN FORM */
        <form onSubmit={handleSendOtp} noValidate>
          <label className="block text-sm font-medium text-navy-900 mb-1.5">
            Mobile Number / Unique Admin ID
          </label>
          <div className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 mb-6 focus-within:border-brand-500">
            <span className="text-sm text-slate-500 shrink-0">📱</span>
            <span className="text-slate-200">|</span>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Enter 10-digit mobile number or Admin ID"
              className="w-full bg-transparent text-sm text-navy-900 placeholder:text-slate-400 outline-none font-bold uppercase"
              autoFocus
            />
          </div>

          <Button type="submit" disabled={loading}>
            {loading ? "Sending OTP..." : "Continue with OTP"}
          </Button>
        </form>
      ) : (
        /* CUSTOMER / DR OTP VERIFY FORM */
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
            className="w-full text-center tracking-[0.5em] text-lg font-semibold rounded-xl border border-slate-200 bg-white px-3.5 py-3 mb-4 outline-none focus:border-brand-500"
          />

          {demoOtp && (
            <div className="mb-4 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-left shadow-2xs">
              <div>
                <span className="text-[10px] uppercase tracking-wider font-extrabold text-emerald-700 block">📲 Generated OTP (Saved in Supabase DB)</span>
                <span className="text-xl font-black text-navy-900 tracking-widest">{demoOtp}</span>
              </div>
              <button
                type="button"
                onClick={() => setOtp(demoOtp)}
                className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-3 py-1.5 rounded-lg shadow-2xs cursor-pointer transition-all"
              >
                Auto Fill ✨
              </button>
            </div>
          )}

          <Button type="submit" disabled={loading}>
            {loading ? "Verifying..." : "Verify & Login"}
          </Button>

          <div className="flex items-center justify-between mt-4">
            <button
              type="button"
              onClick={() => {
                setStep("phone");
                setOtp("");
                setError("");
              }}
              className="text-sm font-medium text-slate-500 hover:text-navy-900 cursor-pointer"
            >
              ← Change number
            </button>
            <button
              type="button"
              onClick={handleSendOtp}
              className="text-sm font-medium text-brand-500 hover:underline cursor-pointer"
            >
              Resend OTP
            </button>
          </div>
        </form>
      )}

      <div id="recaptcha-container"></div>
    </AuthLayout>
  );
}