import { createContext, useContext, useState } from "react";
import { createPortal } from "react-dom";

const AlertContext = createContext(null);

function AlertIcon({ type }) {
  const common = { viewBox: "0 0 24 24", className: "w-5 h-5", fill: "none", stroke: "currentColor", strokeWidth: 1.75, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true };
  if (type === "success") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="10" />
        <path d="m9 12 2 2 4-4" />
      </svg>
    );
  }
  if (type === "warning" || type === "error") {
    return (
      <svg {...common}>
        <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
        <path d="M12 9v4" />
        <path d="M12 17h.01" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </svg>
  );
}

export function AlertProvider({ children }) {
  const [config, setConfig] = useState({
    isOpen: false,
    title: "",
    message: "",
    type: "info", // warning, success, error, info
    buttonText: "Understood",
    isConfirm: false,
    cancelText: "Cancel",
    confirmText: "Confirm",
    onConfirm: null,
    onCancel: null,
  });

  const showAlert = (arg1, arg2, arg3) => {
    const isObj = typeof arg1 === "object" && arg1 !== null;
    const message = isObj ? (arg1.message || "") : String(arg1 || "");
    const type = isObj ? (arg1.type || "warning") : (arg3 || "warning");
    const title = isObj
      ? (arg1.title || (type === "warning" ? "Notice" : type === "success" ? "Success" : "Notification"))
      : (arg2 || (type === "warning" ? "Notice" : type === "success" ? "Success" : "Notification"));
    const buttonText = isObj ? (arg1.buttonText || "Understood") : "Understood";

    setConfig({
      isOpen: true,
      title,
      message,
      type,
      buttonText,
      isConfirm: false,
      onConfirm: null,
    });
  };

  const showConfirm = ({ title, message, type = "warning", confirmText = "Yes, Proceed", cancelText = "Cancel", onConfirm, onCancel }) => {
    setConfig({
      isOpen: true,
      title: title || "Confirmation Required",
      message: message || "Are you sure you want to proceed?",
      type,
      confirmText,
      cancelText,
      isConfirm: true,
      onConfirm,
      onCancel,
    });
  };

  const hideAlert = () => {
    setConfig((prev) => ({ ...prev, isOpen: false }));
  };

  const handleConfirmAction = () => {
    if (config.onConfirm) {
      try {
        config.onConfirm();
      } catch (err) {
        console.error("Alert confirm action error:", err);
      }
    }
    hideAlert();
  };

  const handleCancelAction = () => {
    if (config.onCancel) {
      try {
        config.onCancel();
      } catch (err) {
        console.error("Alert cancel action error:", err);
      }
    }
    hideAlert();
  };

  return (
    <AlertContext.Provider value={{ showAlert, showConfirm, hideAlert }}>
      {children}
      {config.isOpen &&
        createPortal(
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
            {/* peeche ka blur background */}
            <div
              className="absolute inset-0 bg-slate-950/50 vendor-fade"
              onClick={hideAlert}
            />

            {/* bich me popup modal */}
            <div role="alertdialog" aria-modal="true" className="relative z-10 bg-white rounded-2xl p-5 sm:p-6 max-w-md w-full shadow-xl vendor-rise">
              {/* modal ka header */}
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                      config.type === "warning"
                        ? "bg-orange-50 text-orange-700"
                        : config.type === "success"
                        ? "bg-emerald-50 text-emerald-700"
                        : config.type === "error"
                        ? "bg-rose-50 text-rose-700"
                        : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    <AlertIcon type={config.type} />
                  </div>
                  <h3 className="font-semibold text-slate-900 text-base sm:text-lg leading-tight tracking-tight">
                    {config.title}
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={hideAlert}
                  aria-label="Close"
                  className="w-9 h-9 -mr-1.5 -mt-1 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors cursor-pointer shrink-0"
                >
                  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true">
                    <path d="M18 6 6 18" />
                    <path d="m6 6 12 12" />
                  </svg>
                </button>
              </div>

              {/* alert ka main message */}
              <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                {config.message}
              </p>

              {/* confirm ya cancel buttons */}
              <div className="mt-6">
                {config.isConfirm ? (
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={handleCancelAction}
                      className="w-1/2 h-11 bg-white hover:bg-slate-50 text-slate-800 font-semibold text-sm px-4 rounded-xl ring-1 ring-inset ring-slate-200 transition-colors cursor-pointer text-center"
                    >
                      {config.cancelText}
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmAction}
                      className="w-1/2 h-11 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-sm px-4 rounded-xl transition-colors cursor-pointer text-center"
                    >
                      {config.confirmText}
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={hideAlert}
                    className="w-full h-11 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm px-6 rounded-xl transition-colors cursor-pointer flex items-center justify-center"
                  >
                    {config.buttonText}
                  </button>
                )}
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
