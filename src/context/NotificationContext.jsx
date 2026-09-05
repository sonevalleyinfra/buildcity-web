import { createContext, useContext, useEffect, useState, useMemo } from "react";
import { authFetch } from "../config/authFetch";
import { useAuth } from "./AuthContext";
import { API_BASE_URL } from "../config/api";

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const { user } = useAuth();

  // Strict user isolation key
  const userIdent = user?.phone
    ? user.phone.replace(/\D/g, "").slice(-10)
    : user?.id
    ? user.id
    : "guest";

  const storageKey = `buildcity_notifs_${userIdent}`;
  const readKey = `buildcity_read_notifs_${userIdent}`;
  const dismissedKey = `buildcity_dismissed_notifs_${userIdent}`;
  const seenToastsKey = `buildcity_seen_toasts_${userIdent}`;
  const orderNotifsKey = `buildcity_order_notifs_${userIdent}`;

  const userRole = (user?.role || "").toLowerCase();
  const isStaff = userRole === "admin" || userRole === "vendor" || userRole === "dr";
  const isAdmin = userRole === "admin";

  const [notifications, setNotifications] = useState([]);
  const [isSending, setIsSending] = useState(false);
  const [isLoadingNotifs, setIsLoadingNotifs] = useState(false);
  const [toastNotif, setToastNotif] = useState(null);

  // Helper to get dismissed signatures set
  const getDismissedSet = () => {
    try {
      const arr = JSON.parse(localStorage.getItem(dismissedKey) || "[]");
      return new Set(Array.isArray(arr) ? arr : []);
    } catch {
      return new Set();
    }
  };

  // Helper to check if a notification has been permanently dismissed
  const isDismissed = (notif, dismissedSet = getDismissedSet()) => {
    if (!notif) return true;
    if (notif.id && dismissedSet.has(notif.id)) return true;
    const sig = `${(notif.title || "").trim()}_${(notif.message || "").trim()}`;
    if (dismissedSet.has(sig)) return true;
    return false;
  };

  // STRICT RULE: Only show Toast to Customers & exactly ONCE per notification
  const showToast = (notif) => {
    if (isStaff || !notif) return;

    let seenSet = new Set();
    try {
      seenSet = new Set(JSON.parse(localStorage.getItem(seenToastsKey) || "[]"));
    } catch {}

    const notifSig = notif.id || `${notif.title}_${notif.message}`;
    if (seenSet.has(notifSig) || isDismissed(notif)) {
      return; // Already delivered once or dismissed
    }

    seenSet.add(notifSig);
    try {
      localStorage.setItem(seenToastsKey, JSON.stringify(Array.from(seenSet)));
    } catch {}

    setToastNotif(notif);
    setTimeout(() => {
      setToastNotif((curr) => (curr?.id === notif.id ? null : curr));
    }, 6000);
  };

  // Fetch real database notifications (orders & admin broadcasts)
  const fetchDbNotifications = async (showLoading = false) => {
    if (showLoading) setIsLoadingNotifs(true);
    try {
      let dbList = [];

      // 1. Fetch from server DB notifications
      if (user) {
        try {
          const res = await authFetch(`${API_BASE_URL}/api/v1/notifications/me`);
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data)) dbList = data;
          }
        } catch {}
      }

      const dismissedSet = getDismissedSet();
      let readIds = new Set();
      try {
        readIds = new Set(JSON.parse(localStorage.getItem(readKey) || "[]"));
      } catch {}

      const formattedDb = dbList
        .filter((n) => !isDismissed(n, dismissedSet))
        .map((n) => {
          const titleLower = (n.title || "").toLowerCase();
          const isOrder = titleLower.includes("order") || titleLower.includes("📦");
          const isPrice = titleLower.includes("price") || titleLower.includes("rate") || titleLower.includes("🏷️");
          return {
            id: n.id,
            title: n.title,
            message: n.message,
            link: n.link || (isOrder ? "/orders" : "/categories"),
            timestamp: new Date(n.createdAt).getTime() || Date.now(),
            read: Boolean(n.isRead) || readIds.has(n.id),
            type: isOrder ? "order" : isPrice ? "price" : "offer",
          };
        });

      // Load user's private confirmed order notifications
      let localOrders = [];
      if (!isStaff) {
        try {
          const rawOrders = JSON.parse(localStorage.getItem(orderNotifsKey) || "[]");
          if (Array.isArray(rawOrders)) {
            localOrders = rawOrders
              .filter((o) => !isDismissed(o, dismissedSet))
              .map((o) => ({ ...o, read: readIds.has(o.id) || o.read }));
          }
        } catch {}
      }

      // Combine user orders and DB notifications
      const combined = isStaff && !isAdmin ? [] : [...localOrders, ...formattedDb];
      const unique = Array.from(new Map(combined.map((x) => [x.id || `${x.title}_${x.message}`, x])).values())
        .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

      setNotifications((prev) => {
        const prevIds = new Set(prev.map((p) => p.id));
        const newItems = unique.filter((f) => !prevIds.has(f.id) && !f.read);

        if (newItems.length > 0 && prev.length > 0 && !isStaff) {
          showToast(newItems[0]);
        }

        if (storageKey) {
          try { localStorage.setItem(storageKey, JSON.stringify(unique)); } catch {}
        }
        return unique;
      });
    } catch (err) {
      console.warn("DB notification fetch note:", err.message);
    } finally {
      if (showLoading) setIsLoadingNotifs(false);
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
            if (!isStaff) {
              const incoming = event.data.notification;
              if (!isDismissed(incoming)) {
                setNotifications((prev) => [incoming, ...prev.filter((p) => p.id !== incoming.id)]);
                showToast(incoming);
              }
            }
          }
        };
      }
    } catch {}

    return () => {
      if (bc) bc.close();
    };
  }, [isStaff, dismissedKey]);

  // Load from user storage on start & auto-poll
  useEffect(() => {
    const dismissedSet = getDismissedSet();
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setNotifications(parsed.filter((n) => !isDismissed(n, dismissedSet)));
        } else {
          setNotifications([]);
        }
      } else {
        setNotifications([]);
      }
    } catch {
      setNotifications([]);
    }

    fetchDbNotifications();
    const interval = setInterval(fetchDbNotifications, 5000);
    return () => clearInterval(interval);
  }, [storageKey, user]);

  // Real-Time Individual Order Confirmation / Event Notification Addition
  const addNotification = ({ id, title, message, type = "info", link = null }) => {
    const notifId = id || "n-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6);
    const newNotif = {
      id: notifId,
      title,
      message,
      link,
      timestamp: Date.now(),
      read: false,
      type,
    };

    const dismissedSet = getDismissedSet();
    if (isDismissed(newNotif, dismissedSet)) return newNotif;

    setNotifications((prev) => {
      const updated = [newNotif, ...prev.filter((p) => p.id !== notifId)];
      if (storageKey) {
        try { localStorage.setItem(storageKey, JSON.stringify(updated)); } catch {}
      }
      return updated;
    });

    // Save strictly to private customer order notifications
    if (type === "order" || (title || "").toLowerCase().includes("order")) {
      try {
        const prevOrders = JSON.parse(localStorage.getItem(orderNotifsKey) || "[]");
        localStorage.setItem(orderNotifsKey, JSON.stringify([newNotif, ...prevOrders.filter((o) => o.id !== notifId)]));
      } catch {}
    }

    // Show instant toast to the customer
    showToast(newNotif);

    // If it's a broadcast offer, push across active tabs
    if (type !== "order") {
      try {
        if (typeof window !== "undefined" && "BroadcastChannel" in window) {
          const bc = new BroadcastChannel("buildcity_notifications_channel");
          bc.postMessage({ type: "NEW_NOTIFICATION", notification: newNotif });
          bc.close();
        }
      } catch {}
    }

    return newNotif;
  };

  // Broadcast Message Dispatcher (Sends to all users in Offers tab)
  const sendBroadcastNotification = async ({ title, message, type = "offer" }) => {
    if (!title || !message) return false;
    setIsSending(true);

    try {
      let createdNotif = null;
      try {
        const res = await authFetch(`${API_BASE_URL}/api/v1/notifications`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, message, type }),
        });
        if (res.ok) {
          const rData = await res.json();
          createdNotif = rData.notification;
        }
      } catch {}

      const createdObj = {
        id: createdNotif?.id || "broadcast-" + Date.now(),
        title: title.startsWith("📢") || title.startsWith("🎁") || title.startsWith("🏷️") ? title : `${type === "offer" ? "🎁" : type === "price" ? "🏷️" : "📢"} ${title}`,
        message,
        timestamp: Date.now(),
        read: false,
        type: type || "offer",
        link: "/categories",
        isBroadcast: true,
      };

      if (!isAdmin) {
        setNotifications((prev) => [createdObj, ...prev.filter((p) => p.id !== createdObj.id)]);
        showToast(createdObj);
      }

      try {
        if (typeof window !== "undefined" && "BroadcastChannel" in window) {
          const bc = new BroadcastChannel("buildcity_notifications_channel");
          bc.postMessage({ type: "NEW_NOTIFICATION", notification: createdObj });
          bc.close();
        }
      } catch {}

      return true;
    } catch (err) {
      console.warn("Broadcast send note:", err.message);
    } finally {
      setIsSending(false);
    }
    return false;
  };

  const markAsRead = async (id) => {
    try {
      const readIds = JSON.parse(localStorage.getItem(readKey) || "[]");
      if (!readIds.includes(id)) {
        readIds.push(id);
        localStorage.setItem(readKey, JSON.stringify(readIds));
      }
    } catch {}

    setNotifications((prev) => {
      const updated = prev.map((n) => (n.id === id ? { ...n, read: true } : n));
      if (storageKey) {
        try { localStorage.setItem(storageKey, JSON.stringify(updated)); } catch {}
      }
      return updated;
    });

    if (id && id.length > 20) {
      try {
        await authFetch(`${API_BASE_URL}/api/v1/notifications/${encodeURIComponent(id)}/read`, { method: "PATCH" });
      } catch {}
    }
  };

  const markAllAsRead = () => {
    try {
      const readIds = notifications.map((n) => n.id);
      localStorage.setItem(readKey, JSON.stringify(readIds));
    } catch {}

    setNotifications((prev) => {
      const updated = prev.map((n) => ({ ...n, read: true }));
      if (storageKey) {
        try { localStorage.setItem(storageKey, JSON.stringify(updated)); } catch {}
      }
      return updated;
    });
  };

  // PERMANENT CLEAR: Dismissed notifications NEVER re-appear
  const clearAllNotifications = async () => {
    try {
      const prevDismissed = JSON.parse(localStorage.getItem(dismissedKey) || "[]");
      const currentIds = notifications.map((n) => n.id).filter(Boolean);
      const currentSigs = notifications.map((n) => `${(n.title || "").trim()}_${(n.message || "").trim()}`);
      const allToDismiss = Array.from(new Set([...prevDismissed, ...currentIds, ...currentSigs]));

      localStorage.setItem(dismissedKey, JSON.stringify(allToDismiss));
      localStorage.setItem(orderNotifsKey, JSON.stringify([]));
      localStorage.setItem(storageKey, JSON.stringify([]));
    } catch {}

    setNotifications([]);

    try {
      await authFetch(`${API_BASE_URL}/api/v1/notifications`, { method: "DELETE" });
    } catch {}
  };

  // PERMANENT REMOVE: Single notification dismissal
  const removeNotification = async (id) => {
    const target = notifications.find((n) => n.id === id);
    try {
      const prevDismissed = JSON.parse(localStorage.getItem(dismissedKey) || "[]");
      const sig = target ? `${(target.title || "").trim()}_${(target.message || "").trim()}` : null;
      const updatedDismissed = Array.from(new Set([...prevDismissed, id, sig].filter(Boolean)));
      localStorage.setItem(dismissedKey, JSON.stringify(updatedDismissed));

      // Remove from local order notifications if it was an order
      const prevOrders = JSON.parse(localStorage.getItem(orderNotifsKey) || "[]");
      localStorage.setItem(orderNotifsKey, JSON.stringify(prevOrders.filter((o) => o.id !== id)));
    } catch {}

    setNotifications((prev) => {
      const updated = prev.filter((n) => n.id !== id);
      if (storageKey) {
        try { localStorage.setItem(storageKey, JSON.stringify(updated)); } catch {}
      }
      return updated;
    });

    if (isAdmin && id && id.length > 20) {
      try {
        await authFetch(`${API_BASE_URL}/api/v1/notifications/${encodeURIComponent(id)}`, { method: "DELETE" });
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
        isLoadingNotifs,
      }}
    >
      {children}

      {/* Floating Real-Time Notification Toast */}
      {toastNotif && (
        <div className="fixed top-5 right-4 sm:right-6 z-[9999] max-w-sm w-[calc(100%-2rem)] sm:w-full animate-in slide-in-from-top-4 fade-in duration-300 pointer-events-auto">
          <div className="bg-slate-900/95 text-white border border-brand-500/40 rounded-2xl p-4 shadow-2xl backdrop-blur-xl flex items-start gap-3 relative overflow-hidden group">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 via-brand-500 to-rose-500 animate-pulse" />

            <span className="h-10 w-10 rounded-xl bg-brand-500/20 border border-brand-400/40 flex items-center justify-center text-xl shrink-0 mt-0.5 shadow-xs">
              {toastNotif.type === "offer" ? "🎁" : toastNotif.type === "price" ? "🏷️" : toastNotif.type === "order" ? "📦" : "📢"}
            </span>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 mb-1">
                <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                  toastNotif.type === "offer"
                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                    : toastNotif.type === "price"
                    ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                    : toastNotif.type === "order"
                    ? "bg-blue-500/20 text-blue-300 border-blue-500/30"
                    : "bg-purple-500/20 text-purple-300 border-purple-500/30"
                }`}>
                  {toastNotif.type === "offer" ? "Special Offer" : toastNotif.type === "price" ? "Price Alert" : toastNotif.type === "order" ? "Order Confirmed" : "Announcement"}
                </span>
                <span className="text-[10px] text-slate-400 font-semibold">Just now</span>
              </div>

              <h4 className="font-black text-xs text-white leading-tight tracking-tight">
                {toastNotif.title}
              </h4>
              <p className="text-[11px] text-slate-300 mt-1 leading-snug font-medium">
                {toastNotif.message}
              </p>

              {toastNotif.link && (
                <a
                  href={toastNotif.link}
                  onClick={() => setToastNotif(null)}
                  className="inline-flex items-center gap-1 text-[11px] font-black text-brand-400 hover:text-brand-300 hover:underline mt-2 cursor-pointer"
                >
                  View Details →
                </a>
              )}
            </div>

            <button
              onClick={() => setToastNotif(null)}
              className="text-slate-400 hover:text-white text-sm font-bold leading-none p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              title="Dismiss"
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
  if (!ctx) throw new Error("useNotifications must be used within a NotificationProvider");
  return ctx;
}