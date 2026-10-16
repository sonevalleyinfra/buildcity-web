import { useState, useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { isVendorApp } from "../config/appMode";

export default function SplashScreen({ minDuration = 1400, onFinished }) {
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setFading(true);
      const removeTimer = setTimeout(() => {
        setVisible(false);
        if (onFinished) onFinished();
      }, 500); // 500ms fade transition
      return () => clearTimeout(removeTimer);
    }, minDuration);

    return () => clearTimeout(timer);
  }, [minDuration, onFinished]);

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-[#0A192F] text-white select-none transition-opacity duration-500 ease-out ${
        fading ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      <img src="/buildcity-roof-logo.png" alt="BuildCity" className="h-20 w-20 object-contain" />
      <h1 className="mt-5 text-2xl font-semibold tracking-tight">
        Build<span className="text-brand-500">City</span>
      </h1>
      <p className="mt-1 text-xs font-medium uppercase tracking-[0.2em] text-slate-400">
        {isVendorApp ? "Partner" : "India's Building Material Superstore"}
      </p>
    </div>
  );
}
