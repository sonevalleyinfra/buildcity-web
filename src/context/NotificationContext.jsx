import { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "./AuthContext";
import { API_BASE_URL } from "../config/api";

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const { user } = useAuth();
  const storageKey = user?.phone
    ? `buildcity_notifications_${user.phone.replace(/\D/g, "")}`
    : user?.id
    ? `buildcity_notifications_${user.id}`
    : "buildcity_notifications_guest";

  const [notifications, setNotifications] = useState([]);
  const [isSending, setIsSending] = useState(false);
  const [toastNotif, setToastNotif] = useState(null);

  const showToast = (notif) => {
    setToastNotif(notif);
    setTimeout(() => {
      setToastNotif((curr) => (curr?.id === notif.id ? null : curr));
    }, 6000);
  };

  // Fetch real database notifications from backend
  const fetchDbNotifications = async () => {
    try {
      const url = user?.id
        ? `${API_BASE_URL}/api/v1/notifications?userId=${encodeURIComponent(user.id)}`
        : `${API_BASE_URL}/api/v1/notifications`;
      const res = await fetch(url);
      if (res.ok) {
        const dbList = await res.json();
        if (Array.isArray(dbList)) {
          const formatted = dbList.map((n) => ({
            id: n.id,
            title: n.title,
            message: n.message,
            link: n.link || (n.title.toLowerCase().includes("order") ? "/orders" : "/categories"),
            timestamp: new Date(n.createdAt).getTime() || Date.now(),
            read: Boolean(n.isRead),
            type: n.title.toLowerCase().includes("order")
              ? "order"
              : n.title.toLowerCase().includes("price") || n.title.toLowerCase().includes("discount")
              ? "price"
              : n.title.toLowerCase().includes("offer")
              ? "offer"
              : "info",
          }));

          setNotifications((prev) => {
            const prevIds = new Set(prev.map((p) => p.id));
            const newItems = formatted.filter((f) => !prevIds.has(f.id));

            // If a new notification came from backend, trigger instant toast
            if (newItems.length > 0 && prev.length > 0) {
              showToast(newItems[0]);
            }

            const combined = [...prev, ...formatted];
            const unique = Array.from(new Map(combined.map((x) => [x.id || `${x.title}_${x.message}`, x])).values())
              .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
            if (storageKey) {
              try { localStorage.setItem(storageKey, JSON.stringify(unique)); } catch {}
            }
            return unique;
          });
        }
      }
    } catch (err) {
      console.warn("DB notification fetch note:", err.message);
    }
  };

  // Cross-Tab Broadcast Channel for Zero-Latency Real-Time Alerts
  useEffect(() => {
    let bc = null;
    try {
      if (typeof window !== "undefined" && "BroadcastChannel" in window) {
        bc = new BroadcastChannel("buildcity_notifications_channel");
        bc.onmessage = (event) => {
          if (event.data && event.data.type === "NEW_NOTIFICATION") {
            const incoming = event.data.notification;
            setNotifications((prev) => [incoming, ...prev.filter((p) => p.id !== incoming.id)]);
            showToast(incoming);
          }
        };
      }
    } catch {}

    return () => {
      if (bc) bc.close();
    };
  }, []);

  // Load from user storage on start and poll DB every 4s
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        setNotifications(JSON.parse(saved));
      } else {
        setNotifications([]);
      }
    } catch {
      setNotifications([]);
    }

    fetchDbNotifications();
    const interval = setInterval(fetchDbNotifications, 4000);
    return () => clearInterval(interval);
  }, [storageKey, user]);

  // Real-Time Local/Event Notification Addition
  const addNotification = ({ title, message, type = "info", link = null }) => {
    const newNotif = {
      id: "n-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6),
      title,
      message,
      link,
      timestamp: Date.now(),
      read: false,
      type,
    };

    setNotifications((prev) => {
      const updated = [newNotif, ...prev];
      if (storageKey) {
        try { localStorage.setItem(storageKey, JSON.stringify(updated)); } catch {}
      }
      return updated;
    });

    showToast(newNotif);

    try {
      if (typeof window !== "undefined" && "BroadcastChannel" in window) {
        const bc = new BroadcastChannel("buildcity_notifications_channel");
        bc.postMessage({ type: "NEW_NOTIFICATION", notification: newNotif });
        bc.close();
      }
    } catch {}

    return newNotif;
  };

  // Admin Broadcast Dispatcher (Saves directly to database and pushes to all customers)
  const sendBroadcastNotification = async ({ title, message }) => {
    if (!title || !message) return false;
    setIsSending(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/notifications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          message,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const createdObj = {
          id: data.notification?.id || "n-" + Date.now(),
          title: `📢 ${title}`,
          message,
          timestamp: Date.now(),
          read: false,
          type: "info",
        };

        setNotifications((prev) => [createdObj, ...prev.filter((p) => p.id !== createdObj.id)]);
        showToast(createdObj);

        try {
          if (typeof window !== "undefined" && "BroadcastChannel" in window) {
            const bc = new BroadcastChannel("buildcity_notifications_channel");
            bc.postMessage({ type: "NEW_NOTIFICATION", notification: createdObj });
            bc.close();
          }
        } catch {}

        await fetchDbNotifications();
        return true;
      }
    } catch (err) {
      console.warn("Broadcast send note:", err.message);
    } finally {
      setIsSending(false);
    }
    return false;
  };

  const markAsRead = async (id) => {
    setNotifications((prev) => {
      const updated = prev.map((n) => (n.id === id ? { ...n, read: true } : n));
      if (storageKey) {
        try { localStorage.setItem(storageKey, JSON.stringify(updated)); } catch {}
      }
      return updated;
    });

    if (id && id.length > 20) {
      try {
        await fetch(`${API_BASE_URL}/api/v1/notifications/${encodeURIComponent(id)}/read`, { method: "PATCH" });
      } catch {}
    }
  };

  const markAllAsRead = () => {
    setNotifications((prev) => {
      const updated = prev.map((n) => ({ ...n, read: true }));
      if (storageKey) {
        try { localStorage.setItem(storageKey, JSON.stringify(updated)); } catch {}
      }
      return updated;
    });
  };

  const clearAllNotifications = () => {
    setNotifications([]);
    try {
      localStorage.setItem(storageKey, JSON.stringify([]));
    } catch {}
  };

  const removeNotification = async (id) => {
    setNotifications((prev) => {
      const updated = prev.filter((n) => n.id !== id);
      if (storageKey) {
        try { localStorage.setItem(storageKey, JSON.stringify(updated)); } catch {}
      }
      return updated;
    });

    if (id && id.length > 20) {
      try {
        await fetch(`${API_BASE_URL}/api/v1/notifications/${encodeURIComponent(id)}`, { method: "DELETE" });
      } catch {}
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        addNotification,
        sendBroadcastNotification,
        isSending,
        markAsRead,
        markAllAsRead,
        clearAllNotifications,
        removeNotification,
        unreadCount,
        fetchDbNotifications,
      }}
    >
      {children}

      {/* Real-Time Floating Notification Toast Banner on Customer Screen */}
      {toastNotif && (
        <div className="fixed top-5 right-5 z-[9999] max-w-sm w-full animate-in slide-in-from-top-4 fade-in duration-300 pointer-events-auto">
          <div className="bg-navy-950/95 text-white border border-brand-400/40 rounded-2xl p-4 shadow-2xl backdrop-blur-md flex items-start gap-3 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 to-brand-500 animate-pulse" />
            <span className="h-8 w-8 rounded-xl bg-brand-500/20 border border-brand-400/40 flex items-center justify-center text-lg shrink-0 mt-0.5">
              🔔
            </span>
            <div className="min-w-0 flex-1">
              <h4 className="font-black text-xs text-white leading-tight tracking-tight">
                {toastNotif.title}
              </h4>
              <p className="text-[11px] text-slate-300 mt-1 leading-snug font-medium">
                {toastNotif.message}
              </p>
            </div>
            <button
              onClick={() => setToastNotif(null)}
              className="text-slate-400 hover:text-white text-xs font-bold leading-none p-1 cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications must be used inside NotificationProvider");
  return ctx;
}