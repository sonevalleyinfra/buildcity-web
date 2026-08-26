import { createContext, useContext, useState } from "react";
import { createPortal } from "react-dom";

const AlertContext = createContext(null);

export function AlertProvider({ children }) {
  const [config, setConfig] = useState({
    isOpen: false,
    title: "",
    message: "",
    type: "info", // warning, success, error, info
    buttonText: "Understood",
    onConfirm: null,
  });

  const showAlert = ({ title, message, type = "warning", buttonText = "Understood", onConfirm = null }) => {
    setConfig({
      isOpen: true,
      title: title || (type === "warning" ? "Notice" : type === "success" ? "Success" : "Notification"),
      message: message || "",
      type,
      buttonText,
      onConfirm,
    });
  };

  const hideAlert = () => {
    if (config.onConfirm) {
      try {
        config.onConfirm();
      } catch {}
    }
    setConfig((prev) => ({ ...prev, isOpen: false }));
  };

  return (
    <AlertContext.Provider value={{ showAlert, hideAlert }}>
      {children}
      {config.isOpen &&
        createPortal(
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
            {/* Backdrop Blur Overlay */}
            <div
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md transition-opacity duration-300"
              onClick={hideAlert}
            />

            {/* Centered High-End Modal Box */}
            <div className="relative z-10 bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl border border-slate-100/90 transform transition-all duration-300 scale-100 animate-in fade-in zoom-in-95">
              {/* Header Icon Badge */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-10 h-10 rounded-2xl flex items-center justify-center text-lg font-black shadow-xs ${
                      config.type === "warning"
                        ? "bg-amber-100 text-amber-800 border border-amber-300/80"
                        : config.type === "success"
                        ? "bg-emerald-100 text-emerald-800 border border-emerald-300/80"
                        : config.type === "error"
                        ? "bg-rose-100 text-rose-800 border border-rose-300/80"
                        : "bg-brand-100 text-brand-800 border border-brand-300/80"
                    }`}
                  >
                    {config.type === "warning"
                      ? "⚠️"
                      : config.type === "success"
                      ? "✅"
                      : config.type === "error"
                      ? "❌"
                      : "ℹ️"}
                  </div>
                  <div>
                    <h3 className="font-black text-navy-900 text-base sm:text-lg leading-tight tracking-tight">
                      {config.title}
                    </h3>
                    <span
                      className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full inline-block mt-0.5 ${
                        config.type === "warning"
                          ? "bg-amber-50 text-amber-800 border border-amber-200"
                          : config.type === "success"
                          ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                          : config.type === "error"
                          ? "bg-rose-50 text-rose-800 border border-rose-200"
                          : "bg-brand-50 text-brand-800 border border-brand-200"
                      }`}
                    >
                      System Notice
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={hideAlert}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-navy-900 flex items-center justify-center text-lg font-bold transition-colors cursor-pointer"
                >
                  ×
                </button>
              </div>

              {/* Message Body */}
              <div className="my-4 bg-slate-50/80 rounded-2xl p-4 border border-slate-100">
                <p className="text-xs font-semibold text-slate-700 leading-relaxed whitespace-pre-line">
                  {config.message}
                </p>
              </div>

              {/* Action Button */}
              <div className="mt-5">
                <button
                  type="button"
                  onClick={hideAlert}
                  className="w-full bg-navy-900 hover:bg-navy-950 active:scale-[0.98] text-white font-extrabold text-xs py-3.5 px-6 rounded-2xl shadow-md transition-all duration-200 cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>{config.buttonText}</span>
                  <span>→</span>
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </AlertContext.Provider>
  );
}

export function useAlert() {
  const ctx = useContext(AlertContext);
  if (!ctx) throw new Error("useAlert must be used within AlertProvider");
  return ctx;
}
