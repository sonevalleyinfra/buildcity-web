import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "../../layouts/AuthLayout";
import Button from "../../components/Button";
import { useAuth } from "../../context/AuthContext";

// Login Page component — User / Vendor / DR / Admin ka universal login screen
export default function Login() {
  const navigate = useNavigate();
  const { requestOtp, verifyOtp } = useAuth();

  // Screen State steps — Pehle "phone" input mode, phr "otp" verification mode
  const [step, setStep] = useState("phone"); // "phone" | "otp"
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [role, setRole] = useState("customer");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [demoOtp, setDemoOtp] = useState("");

  // Step 1: 10-digit Mobile number submit karke OTP request bhejna
  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError("");
    if (!/^\d{10}$/.test(phone.trim())) {
      setError("Please enter a valid 10-digit mobile number");
      return;
    }
    setLoading(true);
    const resData = await requestOtp(phone.trim());
    if (resData?.otp) {
      setDemoOtp(resData.otp);
    }
    setLoading(false);
    setStep("otp"); // OTP step par switch karo
  };

  // Step 2: Received OTP verify karna aur dynamic role ke basis par redirect karna
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
      
      // Arrow mapping — User ki dynamic role (Admin/DR/Vendor/Customer) ke mutabiq homepage target
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

  return (
    <AuthLayout>
      <h1 className="text-2xl font-bold text-navy-900 mb-1">
        Welcome back 👋
      </h1>
      <p className="text-sm text-slate-500 mb-7">
        {step === "phone"
          ? "Login with your phone number — no password needed"
          : `Enter the OTP sent to +91 ${phone}`}
      </p>

      {error && <p className="mb-4 text-sm text-red-500">{error}</p>}

      {step === "phone" ? (
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
              className="w-full bg-transparent text-sm text-navy-900 placeholder:text-slate-400 outline-none"
              autoFocus
            />
          </div>

          <Button type="submit" disabled={loading}>
            {loading ? "Sending OTP..." : "Continue with OTP"}
          </Button>

          <p className="mt-6 text-center text-sm text-slate-500">
            New to BuildCity?{" "}
            <Link to="/register" className="font-semibold text-brand-500 hover:underline">
              Create account
            </Link>
          </p>
        </form>
      ) : (
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

      {/* Firebase Invisible Recaptcha Container */}
      <div id="recaptcha-container"></div>
    </AuthLayout>
  );
}