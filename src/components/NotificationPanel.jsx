import { useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { useNotifications } from "../context/NotificationContext";
import { BellIcon as BellOutline, CloseIcon, GiftIcon, InfoIcon, PackageIcon, PinIcon, TagIcon, UserIcon } from "./ui/Icons";

const TYPE_META = {
  offer: { icon: GiftIcon, label: "Offer", tone: "bg-emerald-50 text-emerald-700" },
  price: { icon: TagIcon, label: "Price", tone: "bg-amber-50 text-amber-700" },
  order: { icon: PackageIcon, label: "Order", tone: "bg-sky-50 text-sky-700" },
  address: { icon: PinIcon, label: "Address", tone: "bg-slate-100 text-slate-600" },
  auth: { icon: UserIcon, label: "Account", tone: "bg-slate-100 text-slate-600" },
  info: { icon: InfoIcon, label: "Info", tone: "bg-slate-100 text-slate-600" },
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
    if (unreadCount > 0) {
      markAllAsRead();
    }
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
        aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"}
      >
        <BellIcon />
        {unreadCount > 0 && (
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white" aria-hidden="true" />
        )}
      </button>

      {open &&
        createPortal(
          <div className="fixed inset-0 z-[999]" data-storefront>
            <div
              className={`absolute inset-0 bg-slate-950/40 transition-opacity duration-200 ${visible ? "opacity-100" : "opacity-0"}`}
              onClick={handleClose}
            />

            <div
              role="dialog"
              aria-modal="true"
              aria-label="Notifications"
              className={`fixed top-16 right-3 left-3 sm:left-auto sm:w-[400px] bg-white rounded-2xl shadow-[0_24px_60px_-20px_rgba(15,23,42,0.45)] ring-1 ring-slate-200 overflow-hidden origin-top-right transition-[opacity,transform] duration-200 ease-out ${
                visible ? "translate-y-0 opacity-100 scale-100" : "-translate-y-2 opacity-0 scale-[0.98]"
              }`}
            >
              <div className="px-4 pt-3.5 pb-3 border-b border-slate-100">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-navy-950 text-[15px]">Notifications</h3>
                    {unreadCount > 0 && (
                      <span className="text-[11px] font-semibold bg-brand-600 text-white rounded-full h-5 min-w-5 px-1.5 flex items-center justify-center tabular-nums">
                        {unreadCount}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={markAllAsRead}
                        className="h-8 px-2 rounded-lg text-xs font-medium text-brand-700 hover:bg-brand-50 cursor-pointer"
                      >
                        Mark all read
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleClose}
                      title="Close"
                      aria-label="Close notifications"
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-navy-950 cursor-pointer"
                    >
                      <CloseIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 mt-3">
                  {["All", "Orders", "Offers"].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setActiveTab(t)}
                      aria-pressed={activeTab === t}
                      className={`h-8 text-xs font-medium px-3 rounded-full transition-colors cursor-pointer ${
                        activeTab === t ? "bg-navy-950 text-white" : "text-slate-600 bg-slate-100 hover:bg-slate-200"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                  {notifications.length > 0 && (
                    <button
                      type="button"
                      onClick={clearAllNotifications}
                      className="h-8 px-2 rounded-lg text-xs font-medium text-slate-500 hover:text-rose-600 ml-auto transition-colors cursor-pointer"
                    >
                      Clear all
                    </button>
                  )}
                </div>
              </div>

              <div className="max-h-[min(28rem,70vh)] overflow-y-auto overscroll-contain divide-y divide-slate-100">
                {filtered.length === 0 ? (
                  <div className="px-6 py-12 text-center">
                    <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                      <BellOutline className="h-6 w-6" />
                    </span>
                    <p className="font-semibold text-navy-950 text-sm">You're all caught up</p>
                    <p className="text-sm text-slate-500 mt-0.5">Order updates and offers will show here.</p>
                  </div>
                ) : (
                  filtered.map((n) => {
                    const meta = TYPE_META[n.type] || TYPE_META.info;
                    const Icon = meta.icon;
                    return (
                      <div
                        key={n.id}
                        role={n.link ? "button" : undefined}
                        tabIndex={n.link ? 0 : undefined}
                        onClick={() => handleClickNotification(n)}
                        onKeyDown={(e) => {
                          if (n.link && (e.key === "Enter" || e.key === " ")) {
                            e.preventDefault();
                            handleClickNotification(n);
                          }
                        }}
                        className={`group relative flex w-full gap-3 px-4 py-3.5 text-left transition-colors ${n.link ? "cursor-pointer" : ""} ${
                          n.read ? "bg-white hover:bg-slate-50" : "bg-brand-50/40 hover:bg-brand-50/70"
                        }`}
                      >
                        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${meta.tone}`}>
                          <Icon className="h-[18px] w-[18px]" />
                        </span>

                        <div className="min-w-0 flex-1 pr-6">
                          <div className="flex items-center gap-1.5">
                            <span className="truncate text-sm font-semibold text-navy-950">{n.title}</span>
                            {!n.read && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" aria-label="Unread" />}
                          </div>
                          <p className="mt-0.5 text-[13px] leading-snug text-slate-600 break-words">{n.message}</p>
                          <div className="mt-1.5 flex items-center gap-2 text-xs text-slate-400">
                            <span>{meta.label}</span>
                            <span aria-hidden="true">·</span>
                            <span>{formatTime(n.timestamp)}</span>
                            {n.link && <span className="ml-auto font-medium text-brand-700 group-hover:underline">View</span>}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeNotification(n.id);
                          }}
                          className="absolute right-2.5 top-2.5 flex h-7 w-7 items-center justify-center rounded-lg text-slate-300 opacity-100 transition-colors hover:bg-slate-100 hover:text-rose-500 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100 cursor-pointer"
                          title="Dismiss"
                          aria-label="Dismiss notification"
                        >
                          <CloseIcon className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    );
                  })
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
  return <BellOutline className="h-[22px] w-[22px]" />;
}
