import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import AuthLayout from "../../layouts/AuthLayout";
import FormInput from "../../components/FormInput";
import Button from "../../components/Button";
import { useAuth } from "../../context/AuthContext";

export default function Register() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/";
  const initialPhone = searchParams.get("phone") || "";

  const { requestOtp, verifyOtp } = useAuth();

  const [step, setStep] = useState("form"); // "form" | "otp"
  const [name, setName] = useState("");
  const [phone, setPhone] = useState(initialPhone);
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [cooldown, setCooldown] = useState(() => {
    try {
      const savedExpire = sessionStorage.getItem("buildcity_reg_otp_expire");
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
          try { sessionStorage.removeItem("buildcity_reg_otp_expire"); } catch {}
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

  const handleSendOtp = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (cooldown > 0 && step === "otp") return;
    setError("");

    if (!name.trim() || name.trim().length < 2) {
      setError("Please enter your full name (minimum 2 characters)");
      return;
    }

    const cleanedMobile = phone.replace(/\D/g, "").slice(-10);
    if (cleanedMobile.length !== 10) {
      setError("Please enter a valid 10-digit mobile number");
      return;
    }

    setLoading(true);
    try {
      await requestOtp(cleanedMobile, "register");
      setStep("otp");
      const expireTime = Date.now() + 90 * 1000;
      try { sessionStorage.setItem("buildcity_reg_otp_expire", expireTime.toString()); } catch {}
      setCooldown(90);
    } catch (err) {
      if (err.alreadyRegistered) {
        setError(
          <span>
            {err.message || "This mobile number is already registered."}{" "}
            <Link to={`/login?redirect=${encodeURIComponent(redirectTo)}`} className="underline font-bold text-brand-600">
              Log in here →
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

  const handleVerifyAndRegister = async (e) => {
    e.preventDefault();
    setError("");

    if (!/^\d{4,6}$/.test(otp.trim())) {
      setError("Please enter the 6-digit OTP sent to your mobile number");
      return;
    }

    setLoading(true);
    try {
      const cleanedMobile = phone.replace(/\D/g, "").slice(-10);
      await verifyOtp({
        phone: cleanedMobile,
        otp: otp.trim(),
        name: name.trim(),
        role: "customer",
      });

      // Clear cooldown storage upon successful registration
      try { sessionStorage.removeItem("buildcity_reg_otp_expire"); } catch {}

      // Navigate to destination (e.g. /checkout if coming from cart) or home
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err?.message || "Verification failed. Please check OTP and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="space-y-6 font-sans">
        <div>
          <span className="inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-wider bg-brand-50 text-brand-700 px-2.5 py-0.5 rounded-full border border-brand-200/80 mb-2">
            ✨ Customer Registration
          </span>
          <h1 className="text-2xl font-black text-navy-900 tracking-tight">Create Customer Account</h1>
          <p className="text-xs text-slate-500 mt-1">
            Sign up in seconds to purchase construction materials at verified wholesale prices.
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-bold text-red-700 flex items-start gap-2">
            <span>⚠️</span>
            <div className="flex-1">{error}</div>
          </div>
        )}

        {step === "form" ? (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div>
              <label className="block text-xs font-extrabold text-navy-900 mb-1.5">
                Full Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Ramesh Kumar"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-xs font-bold rounded-xl px-3.5 py-3 outline-none focus:border-brand-500 focus:bg-white transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-extrabold text-navy-900 mb-1.5">
                Mobile Number *
              </label>
              <div className="flex items-center">
                <span className="bg-slate-100 border border-r-0 border-slate-200 rounded-l-xl px-3 py-3 text-xs font-bold text-slate-600">
                  +91
                </span>
                <input
                  type="tel"
                  required
                  maxLength={10}
                  placeholder="10-digit mobile number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-r-xl text-xs font-bold px-3.5 py-3 outline-none focus:border-brand-500 focus:bg-white transition-all"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading || !name.trim() || phone.replace(/\D/g, "").length !== 10}
              className="w-full py-3.5 text-xs font-black rounded-xl bg-brand-500 hover:bg-brand-600 text-white shadow-md active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
            >
              {loading ? "Sending Verification OTP..." : "Send Verification OTP →"}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleVerifyAndRegister} className="space-y-4">
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 text-xs flex items-center justify-between">
              <div>
                <p className="font-bold text-navy-900">👤 {name}</p>
                <p className="text-[11px] text-slate-500 font-semibold">📱 +91 {phone.replace(/\D/g, "").slice(-10)}</p>
              </div>
              <button
                type="button"
                onClick={() => { setStep("form"); setError(""); }}
                className="text-[11px] font-extrabold text-brand-600 hover:underline cursor-pointer"
              >
                Change
              </button>
            </div>

            <div>
              <label className="block text-xs font-extrabold text-navy-900 mb-1.5">
                Enter 6-Digit OTP *
              </label>
              <input
                type="text"
                required
                maxLength={6}
                placeholder="Enter 6-digit SMS OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                className="w-full bg-slate-50 border border-slate-200 text-center tracking-[0.3em] text-lg font-black rounded-xl px-3.5 py-3 outline-none focus:border-brand-500 focus:bg-white transition-all"
              />
            </div>

            <Button
              type="submit"
              disabled={loading || otp.length < 4}
              className="w-full py-3.5 text-xs font-black rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-md active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
            >
              {loading ? "Creating Account..." : "✓ Verify OTP & Create Account"}
            </Button>

            <div className="flex items-center justify-between text-xs pt-1">
              {cooldown > 0 ? (
                <span className="text-slate-400 font-bold">Resend OTP in {formatCooldown(cooldown)}</span>
              ) : (
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={loading}
                  className="font-extrabold text-brand-600 hover:underline cursor-pointer"
                >
                  Resend SMS OTP
                </button>
              )}
            </div>
          </form>
        )}

        <div className="text-center border-t border-slate-100 pt-4">
          <p className="text-xs text-slate-500">
            Already have an account?{" "}
            <Link
              to={`/login?redirect=${encodeURIComponent(redirectTo)}`}
              className="font-extrabold text-brand-600 hover:underline"
            >
              Log in directly →
            </Link>
          </p>
        </div>
      </div>
    </AuthLayout>
  );
}