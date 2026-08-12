import { useState } from "react";

export default function FormInput({
  label,
  type = "text",
  icon,
  error,
  ...props
}) {
  const [show, setShow] = useState(false);
  const isPassword = type === "password";
  const inputType = isPassword ? (show ? "text" : "password") : type;

  return (
    <div className="mb-4">
      {label && (
        <label className="block text-sm font-medium text-navy-900 mb-1.5">
          {label}
        </label>
      )}
      <div
        className={`flex items-center gap-2.5 rounded-xl border bg-white px-3.5 py-2.5 transition-colors ${
          error
            ? "border-red-400"
            : "border-slate-200 focus-within:border-brand-500"
        }`}
      >
        {icon && <span className="text-slate-400 shrink-0">{icon}</span>}
        <input
          type={inputType}
          className="w-full bg-transparent text-sm text-navy-900 placeholder:text-slate-400 outline-none"
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            className="text-slate-400 hover:text-slate-600 shrink-0"
            tabIndex={-1}
            aria-label={show ? "Hide password" : "Show password"}
          >
            {show ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

function EyeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
function EyeOffIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M17.94 17.94A10.94 10.94 0 0 1 12 19c-7 0-11-7-11-7a21.3 21.3 0 0 1 5.06-5.94M9.9 4.24A10.9 10.9 0 0 1 12 5c7 0 11 7 11 7a21.3 21.3 0 0 1-2.16 3.19M14.12 14.12a3 3 0 1 1-4.24-4.24" />
      <path d="M1 1l22 22" />
    </svg>
  );
}
