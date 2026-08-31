import { useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { useNotifications } from "../context/NotificationContext";

const TYPE_ICON = {
  offer: "🎁",
  price: "🏷️",
  order: "📦",
  address: "📍",
  auth: "👤",
  info: "ℹ️",
};

function formatTime(timestamp) {
  if (!timestamp) return "Recently";
  const diff = Date.now() - Number(timestamp);
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  return `${days}d ago`;
}

export default function NotificationPanel({ className }) {
  const navigate = useNavigate();
  const {
    notifications,
    markAsRead,
    markAllAsRead,
    clearAllNotifications,
    removeNotification,
    unreadCount,
  } = useNotifications();

  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false);
  const [activeTab, setActiveTab] = useState("All");

  const filtered = useMemo(() => {
    if (activeTab === "All") return notifications;
    if (activeTab === "Orders") {
      return notifications.filter(
        (n) => n.type === "order" || (n.title || "").toLowerCase().includes("order")
      );
    }
    if (activeTab === "Offers") {
      return notifications.filter(
        (n) => n.type !== "order" && !(n.title || "").toLowerCase().includes("order")
      );
    }
    return notifications.filter((n) => n.type === activeTab.toLowerCase());
  }, [notifications, activeTab]);

  const handleOpen = () => {
    setOpen(true);
    requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
  };

  const handleClose = () => {
    setVisible(false);
    setTimeout(() => setOpen(false), 200);
  };

  const handleClickNotification = (n) => {
    markAsRead(n.id);
    if (n.link) {
      handleClose();
      navigate(n.link);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className={className || "relative text-slate-600 hover:text-navy-900 active:scale-[0.95] transition-all duration-200 p-1.5 rounded-xl hover:bg-slate-100/80 cursor-pointer"}
        title="Notifications"
      >
        <BellIcon />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500 shadow-xs"></span>
          </span>
        )}
      </button>

      {open &&
        createPortal(
          <div className="fixed inset-0 z-[999]">
            {/* Backdrop */}
            <div
              className={`absolute inset-0 bg-navy-950/40 backdrop-blur-xs transition-opacity duration-200 ${
                visible ? "opacity-100" : "opacity-0"
              }`}
              onClick={handleClose}
            />

            {/* Panel */}
            <div
              className={`fixed top-14 right-3 left-3 sm:left-auto w-auto sm:w-96 max-w-md bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-2xl shadow-2xl overflow-hidden transition-all duration-200 ease-out ${
                visible
                  ? "translate-y-0 opacity-100 scale-100"
                  : "-translate-y-6 opacity-0 scale-95"
              }`}
            >
              {/* Header */}
              <div className="px-4 py-3 border-b border-slate-100 bg-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="h-8 w-8 rounded-full bg-brand-50 flex items-center justify-center text-brand-600 text-sm shadow-2xs">
                      <BellIcon />
                    </span>
                    <h3 className="font-extrabold text-navy-900 text-sm">Notifications</h3>
                    {unreadCount > 0 && (
                      <span className="text-[10px] font-black bg-brand-500 text-white rounded-full h-4.5 min-w-4.5 px-1.5 flex items-center justify-center">
                        {unreadCount}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={markAllAsRead}
                        className="text-[11px] font-bold text-brand-600 hover:underline cursor-pointer"
                      >
                        Mark all read
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleClose}
                      className="text-slate-400 hover:text-slate-700 text-xl leading-none px-1 cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {/* Filter Tabs */}
                <div className="flex gap-1.5 mt-2.5 pt-2 border-t border-slate-100">
                  {["All", "Orders", "Offers"].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setActiveTab(t)}
                      className={`text-[11px] font-bold px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                        activeTab === t
                          ? "bg-navy-900 text-white"
                          : "text-slate-600 bg-slate-100 hover:bg-slate-200"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                  {notifications.length > 0 && (
                    <button
                      type="button"
                      onClick={clearAllNotifications}
                      className="text-[11px] font-bold text-slate-400 hover:text-rose-600 ml-auto transition-colors cursor-pointer"
                    >
                      Clear all
                    </button>
                  )}
                </div>
              </div>

              {/* Notification List */}
              <div className="max-h-96 overflow-y-auto divide-y divide-slate-100">
                {filtered.length === 0 ? (
                  <div className="p-10 text-center text-xs text-slate-500">
                    <p className="text-3xl mb-2">🔔</p>
                    <p className="font-extrabold text-navy-900 text-sm">No notifications here</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">You're all caught up with your site updates!</p>
                  </div>
                ) : (
                  filtered.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => handleClickNotification(n)}
                      className={`w-full text-left flex gap-3.5 px-4 py-3.5 transition-all cursor-pointer group relative active:scale-[0.99] ${
                        n.read ? "bg-white hover:bg-slate-50/90" : "bg-gradient-to-r from-brand-50/60 to-white hover:bg-brand-50/90"
                      }`}
                    >
                      <span className={`h-10 w-10 shrink-0 rounded-xl flex items-center justify-center text-lg shadow-2xs group-hover:scale-105 transition-transform border ${
                        n.type === "offer"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : n.type === "price"
                          ? "bg-amber-50 text-amber-700 border-amber-200"
                          : n.type === "order"
                          ? "bg-blue-50 text-blue-700 border-blue-200"
                          : "bg-purple-50 text-purple-700 border-purple-200"
                      }`}>
                        {TYPE_ICON[n.type] || "📢"}
                      </span>

                      <div className="min-w-0 flex-1 pr-4">
                        <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                          <span className={`text-[9px] font-extrabold uppercase px-2 py-0.2 rounded-full border ${
                            n.type === "offer"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : n.type === "price"
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : n.type === "order"
                              ? "bg-blue-50 text-blue-700 border-blue-200"
                              : "bg-purple-50 text-purple-700 border-purple-200"
                          }`}>
                            {n.type === "offer" ? "Offer" : n.type === "price" ? "Price" : n.type === "order" ? "Order" : "Info"}
                          </span>
                          <span className="text-xs font-black text-navy-900 truncate">
                            {n.title}
                          </span>
                          {!n.read && (
                            <span className="h-1.5 w-1.5 rounded-full bg-brand-500 shrink-0 animate-pulse" />
                          )}
                        </div>

                        <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed font-medium">
                          {n.message}
                        </p>

                        <div className="flex items-center gap-2.5 mt-1.5">
                          <span className="text-[10px] text-slate-400 font-bold">{formatTime(n.timestamp)}</span>
                          {n.link && (
                            <span className="text-[10px] text-brand-600 font-black group-hover:underline flex items-center gap-0.5">
                              View details →
                            </span>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeNotification(n.id);
                        }}
                        className="text-slate-300 hover:text-rose-500 text-xs absolute right-3 top-3 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                        title="Dismiss"
                      >
                        ✕
                      </button>
                    </div>
                  ))
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
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9Z" />
      <path d="M13.7 21a2 2 0 0 1-3.4 0" />
    </svg>
  );
}