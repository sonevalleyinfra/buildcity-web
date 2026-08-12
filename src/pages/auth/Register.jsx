import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "../../layouts/AuthLayout";
import FormInput from "../../components/FormInput";
import Button from "../../components/Button";
import { useAuth } from "../../context/AuthContext";

export default function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirm: "",
  });
  const [agree, setAgree] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const handleChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = "Full name is required";
    if (!form.email.trim()) errs.email = "Email is required";
    if (!form.phone.trim()) errs.phone = "Mobile number is required";
    else if (!/^\d{10}$/.test(form.phone.trim()))
      errs.phone = "Enter a valid 10-digit number";
    if (!form.password) errs.password = "Password is required";
    else if (form.password.length < 6)
      errs.password = "Minimum 6 characters";
    if (form.confirm !== form.password)
      errs.confirm = "Passwords do not match";
    if (!agree) errs.agree = "Please accept Terms & Privacy Policy";
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setLoading(true);
    try {
      await register(form);
      navigate("/", { replace: true }); // new accounts always start as customer
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <h1 className="text-2xl font-bold text-navy-900 mb-1">
        Create Account
      </h1>
      <p className="text-sm text-slate-500 mb-7">
        Join BuildCity and start shopping!
      </p>

      <form onSubmit={handleSubmit} noValidate>
        <FormInput
          label="Full Name"
          name="name"
          placeholder="Enter your full name"
          value={form.name}
          onChange={handleChange}
          error={errors.name}
          icon={<UserIcon />}
        />
        <FormInput
          label="Email Address"
          name="email"
          placeholder="Enter your email"
          value={form.email}
          onChange={handleChange}
          error={errors.email}
          icon={<MailIcon />}
        />
        <FormInput
          label="Mobile Number"
          name="phone"
          placeholder="Enter your mobile number"
          value={form.phone}
          onChange={handleChange}
          error={errors.phone}
          icon={<PhoneIcon />}
        />
        <FormInput
          label="Password"
          type="password"
          name="password"
          placeholder="Create a password"
          value={form.password}
          onChange={handleChange}
          error={errors.password}
          icon={<LockIcon />}
        />
        <FormInput
          label="Confirm Password"
          type="password"
          name="confirm"
          placeholder="Confirm your password"
          value={form.confirm}
          onChange={handleChange}
          error={errors.confirm}
          icon={<LockIcon />}
        />

        <label className="flex items-start gap-2.5 text-sm text-slate-600 mb-6 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={agree}
            onChange={(e) => setAgree(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-[#1E5FD9]"
          />
          <span>
            I agree to the{" "}
            <span className="text-brand-500 font-medium">Terms & Conditions</span>{" "}
            and{" "}
            <span className="text-brand-500 font-medium">Privacy Policy</span>
          </span>
        </label>
        {errors.agree && (
          <p className="-mt-4 mb-4 text-xs text-red-500">{errors.agree}</p>
        )}

        <Button type="submit" disabled={loading}>
          {loading ? "Creating account..." : "Create Account"}
        </Button>

        <p className="text-center text-sm text-slate-500 mt-7">
          Already have an account?{" "}
          <Link to="/login" className="text-brand-500 font-semibold hover:underline">
            Login
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}

function UserIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  );
}
function MailIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 6-10 7L2 6" />
    </svg>
  );
}
function PhoneIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3-8.7A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.8.6 2.7a2 2 0 0 1-.5 2.1L8 9.7a16 16 0 0 0 6 6l1.2-1.2a2 2 0 0 1 2.1-.5c.9.3 1.8.5 2.7.6a2 2 0 0 1 1.7 2Z" />
    </svg>
  );
}
function LockIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="11" width="18" height="10" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}