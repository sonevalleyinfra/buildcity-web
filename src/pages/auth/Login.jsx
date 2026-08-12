import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "../../layouts/AuthLayout";
import Button from "../../components/Button";
import { useAuth } from "../../context/AuthContext";

const ROLES = [
  { id: "customer", label: "Customer" },
  { id: "vendor", label: "Vendor" },
  { id: "admin", label: "Admin" },
];

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
          : user.role === "vendor"
          ? "/vendor/dashboard"
          : "/";
      navigate(home, { replace: true });
    } catch {
      setError("Something went wrong, try again");
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

      <div className="mb-5 rounded-lg bg-brand-50 border border-brand-500/20 px-3.5 py-2.5 text-xs text-navy-700">
        <strong>Dev preview:</strong> backend abhi nahi hai — koi bhi OTP
        chalega. Neeche role select karke Customer/Vendor/Admin, teeno test
        kar sakte ho.
      </div>

      {error && <p className="mb-4 text-sm text-red-500">{error}</p>}

      {step === "phone" ? (
        <form onSubmit={handleSendOtp} noValidate>
          <label className="block text-sm font-medium text-navy-900 mb-1.5">
            Phone Number
          </label>
          <div className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 mb-4 focus-within:border-brand-500">
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

          <label className="block text-sm font-medium text-navy-900 mb-1.5">
            Login as (dev testing)
          </label>
          <div className="flex gap-2 mb-6">
            {ROLES.map((r) => (
              <button
                type="button"
                key={r.id}
                onClick={() => setRole(r.id)}
                className={`flex-1 text-sm font-medium rounded-xl py-2.5 border transition-colors ${
                  role === r.id
                    ? "border-brand-500 bg-brand-50 text-brand-600"
                    : "border-slate-200 text-slate-600"
                }`}
              >
                {r.label}
              </button>
            ))}
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