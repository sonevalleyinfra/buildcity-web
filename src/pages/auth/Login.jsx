import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "../../layouts/AuthLayout";
import Button from "../../components/Button";
import { useAuth } from "../../context/AuthContext";

export default function Login() {
  const navigate = useNavigate();
  const { requestOtp, verifyOtp } = useAuth();

  const [step, setStep] = useState("phone"); // "phone" | "otp"
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [role, setRole] = useState("customer");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError("");
    if (!/^\d{10}$/.test(phone.trim())) {
      setError("Enter a valid 10-digit phone number");
      return;
    }
    setLoading(true);
    await requestOtp(phone.trim());
    setLoading(false);
    setStep("otp");
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setError("");
    if (!/^\d{4,6}$/.test(otp.trim())) {
      setError("Enter the OTP sent to your phone");
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
      setError(err?.message || "Something went wrong, try again");
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
            />
          </div>

          <Button type="submit" disabled={loading}>
            {loading ? "Sending OTP..." : "Send OTP"}
          </Button>

          <p className="text-center text-sm text-slate-500 mt-7">
            Don&apos;t have an account?{" "}
            <Link to="/register" className="text-brand-500 font-semibold hover:underline">
              Sign Up
            </Link>
          </p>

          <div className="mt-8 text-center border-t border-slate-100 pt-4">
            <p className="text-xs text-slate-400">
              Admin Access: Enter <strong>9999999999</strong> as phone number
            </p>
          </div>
        </form>
      ) : (
        <form onSubmit={handleVerify} noValidate>
          <label className="block text-sm font-medium text-navy-900 mb-1.5">
            Enter OTP
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
              className="text-sm font-medium text-slate-500 hover:text-navy-900"
            >
              ← Change number
            </button>
            <button
              type="button"
              onClick={handleSendOtp}
              className="text-sm font-medium text-brand-500 hover:underline"
            >
              Resend OTP
            </button>
          </div>
        </form>
      )}
    </AuthLayout>
  );
}