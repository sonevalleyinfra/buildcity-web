import { useState } from "react";
import { createPortal } from "react-dom";
import { useNotifications } from "../context/NotificationContext";

const TYPE_ICON = {
  offer: "🎁",
  price: "🏷️",
  order: "📦",
  info: "ℹ️",
};

export default function NotificationPanel({ className }) {
  const { notifications, markAsRead, markAllAsRead, unreadCount } = useNotifications();
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false);

  const handleOpen = () => {
    setOpen(true);
    requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
  };

  const handleClose = () => {
    setVisible(false);
    setTimeout(() => setOpen(false), 200);
  };

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className={className || "relative text-slate-600 hover:text-navy-900"}
      >
        <BellIcon />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-red-500" />
        )}
      </button>

      {open &&
        createPortal(
          <div className="fixed inset-0 z-[999]">
            {/* Backdrop */}
            <div
              className={`absolute inset-0 bg-black/30 transition-opacity duration-200 ${
                visible ? "opacity-100" : "opacity-0"
              }`}
              onClick={handleClose}
            />

            {/* Panel- slides down from the top kar diya hai  */}
            <div
            className={`fixed top-14 right-3 left-3 sm:left-auto w-auto sm:w-80 max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden transition-all duration-200 ease-out ${
            visible
                  ? "translate-y-0 opacity-100"
                  : "-translate-y-6 opacity-0"
              }`}
            >
              <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-100 bg-white">
                <div className="flex items-center gap-2">
                  <span className="h-8 w-8 rounded-full bg-brand-50 flex items-center justify-center text-brand-500">
                    <BellIcon />
                  </span>
                  <h3 className="font-bold text-navy-900">Notifications</h3>
                  {unreadCount > 0 && (
                    <span className="text-[11px] font-semibold bg-brand-500 text-white rounded-full h-5 min-w-5 px-1.5 flex items-center justify-center">
                      {unreadCount}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={markAllAsRead}
                      className="text-xs font-medium text-brand-500 hover:underline"
                    >
                      Mark all read
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleClose}
                    className="text-slate-400 hover:text-slate-600 text-xl leading-none"
                  >
                    ×
                  </button>
                </div>
              </div>
              <div className="max-h-96 overflow-y-auto">
              
                {notifications.length === 0 ? (
                  <div className="p-10 text-center text-sm text-slate-500">
                    Koi notification nahi hai.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {notifications.map((n, i) => (
                      <button
                        type="button"
                        key={n.id}
                        onClick={() => markAsRead(n.id)}
                        className={`w-full text-left flex gap-3 px-4 py-3.5 transition-colors ${
                          n.read ? "bg-white hover:bg-surface" : "bg-brand-50 hover:bg-brand-50/70"
                        }`}
                      >
                        <span className="h-9 w-9 shrink-0 rounded-full bg-white border border-slate-200 flex items-center justify-center text-base">
                          {TYPE_ICON[n.type] || "🔔"}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-semibold text-navy-900 truncate">
                              {n.title}
                            </span>
                            {!n.read && (
                              <span className="h-1.5 w-1.5 rounded-full bg-brand-500 shrink-0" />
                            )}
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                            {n.message}
                          </p>
                          <p className="text-[11px] text-slate-400 mt-1">{n.time}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}

function BellIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9Z" />
      <path d="M13.7 21a2 2 0 0 1-3.4 0" />
    </svg>
  );
}