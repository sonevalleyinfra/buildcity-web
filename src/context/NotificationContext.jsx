import { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "./AuthContext";
import { API_BASE_URL } from "../config/api";

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const { user } = useAuth();
  const userIdent = user?.phone
    ? user.phone.replace(/\D/g, "")
    : user?.id
    ? user.id
    : "guest";

  const storageKey = `buildcity_notifications_${userIdent}`;
  const readKey = `buildcity_read_notifs_${userIdent}`;
  const dismissedKey = `buildcity_dismissed_notifs_${userIdent}`;

  const isAdmin = (user?.role || "").toLowerCase() === "admin";
  const [notifications, setNotifications] = useState([]);
  const [isSending, setIsSending] = useState(false);
  const [isLoadingNotifs, setIsLoadingNotifs] = useState(false);
  const [toastNotif, setToastNotif] = useState(null);

  const showToast = (notif) => {
    // Strictly do NOT show toast alerts to Admin. Only for Customers!
    if (isAdmin || !notif) return;
    setToastNotif(notif);
    setTimeout(() => {
      setToastNotif((curr) => (curr?.id === notif.id ? null : curr));
    }, 6000);
  };

  // Fetch real database notifications from backend (Vercel Serverless Edge + Render DB)
  const fetchDbNotifications = async (showLoading = false) => {
    if (showLoading) setIsLoadingNotifs(true);
    try {
      let dbList = null;

      // 1. Try Vercel Serverless Edge endpoint (Direct Supabase DB in 50ms)
      try {
        const vRes = await fetch("/api/v1/notifications");
        if (vRes.ok) {
          dbList = await vRes.json();
        }
      } catch {}

      // 2. Fallback to Render DB
      if (!Array.isArray(dbList) || dbList.length === 0) {
        const url = user?.id
          ? `${API_BASE_URL}/api/v1/notifications?userId=${encodeURIComponent(user.id)}`
          : `${API_BASE_URL}/api/v1/notifications`;
        const res = await fetch(url);
        if (res.ok) {
          dbList = await res.json();
        }
      }

      if (Array.isArray(dbList)) {
        let readIds = new Set();
        let dismissedIds = new Set();
        try {
          readIds = new Set(JSON.parse(localStorage.getItem(readKey) || "[]"));
          dismissedIds = new Set(JSON.parse(localStorage.getItem(dismissedKey) || "[]"));
        } catch {}

        const formatted = dbList
          .filter((n) => isAdmin || !dismissedIds.has(n.id))
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

        // Load private customer local orders
        let localOrders = [];
        if (!isAdmin) {
          try {
            const orderKey = `buildcity_user_orders_${userIdent}`;
            localOrders = (JSON.parse(localStorage.getItem(orderKey) || "[]"))
              .filter((o) => !dismissedIds.has(o.id))
              .map((o) => ({ ...o, read: readIds.has(o.id) || o.read }));
          } catch {}
        }

        const combined = [...localOrders, ...formatted];
        const unique = Array.from(new Map(combined.map((x) => [x.id || `${x.title}_${x.message}`, x])).values())
          .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

        setNotifications((prev) => {
          const prevIds = new Set(prev.map((p) => p.id));
          const newItems = unique.filter((f) => !prevIds.has(f.id) && !f.read);

          // If a new unread notification came from backend, trigger instant toast for customers
          if (newItems.length > 0 && prev.length > 0 && !isAdmin) {
            showToast(newItems[0]);
          }

          if (storageKey) {
            try { localStorage.setItem(storageKey, JSON.stringify(unique)); } catch {}
          }
          return unique;
        });
      }
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
            // ONLY customers should receive broadcast notifications in their bell & toast!
            if (!isAdmin) {
              const incoming = event.data.notification;
              let dismissedIds = new Set();
              try {
                dismissedIds = new Set(JSON.parse(localStorage.getItem(dismissedKey) || "[]"));
              } catch {}
              if (!dismissedIds.has(incoming.id)) {
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
  }, [isAdmin, dismissedKey]);

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

  // Real-Time Customer Private Event Notification Addition (e.g. Order updates)
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

    // Save to private customer order history so polling does not overwrite it
    if (type === "order" || (title || "").toLowerCase().includes("order")) {
      try {
        const orderKey = `buildcity_user_orders_${userIdent}`;
        const prevOrders = JSON.parse(localStorage.getItem(orderKey) || "[]");
        localStorage.setItem(orderKey, JSON.stringify([newNotif, ...prevOrders.filter((o) => o.id !== newNotif.id)]));
      } catch {}
    }

    // Only show toast to this customer
    showToast(newNotif);

    // If it's NOT an order (e.g. system broadcast), share across tabs. Orders remain strictly private.
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

  // Admin Broadcast Dispatcher (Saves directly to database and pushes to all customers)
  const sendBroadcastNotification = async ({ title, message, type = "offer" }) => {
    if (!title || !message) return false;
    setIsSending(true);

    try {
      let createdNotif = null;

      // 1. Send to Vercel Serverless Edge (Direct Supabase DB save in 50ms)
      try {
        const vRes = await fetch("/api/v1/notifications", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, message, type }),
        });
        if (vRes.ok) {
          const vData = await vRes.json();
          createdNotif = vData.notification;
        }
      } catch {}

      // 2. Backup to Render DB if Vercel endpoint didn't respond
      if (!createdNotif) {
        try {
          const res = await fetch(`${API_BASE_URL}/api/v1/notifications`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title, message, type }),
          });
          if (res.ok) {
            const rData = await res.json();
            createdNotif = rData.notification;
          }
        } catch {}
      }

      const createdObj = {
        id: createdNotif?.id || "n-" + Date.now(),
        title: title.startsWith("📢") || title.startsWith("🎁") || title.startsWith("🏷️") ? title : `${type === "offer" ? "🎁" : type === "price" ? "🏷️" : "📢"} ${title}`,
        message,
        timestamp: Date.now(),
        read: false,
        type: type || "offer",
      };

      // If on customer view, update local state, otherwise let customers receive via broadcast channel
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
        await fetch(`/api/v1/notifications?id=${encodeURIComponent(id)}`, { method: "PATCH" });
        await fetch(`${API_BASE_URL}/api/v1/notifications/${encodeURIComponent(id)}/read`, { method: "PATCH" });
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

  const clearAllNotifications = async () => {
    if (isAdmin) {
      // Admin actually wipes all from Supabase Database
      try {
        await Promise.allSettled([
          fetch("/api/v1/notifications", { method: "DELETE" }),
          fetch(`${API_BASE_URL}/api/v1/notifications`, { method: "DELETE" }),
          new Promise((r) => setTimeout(r, 450)),
        ]);
      } catch {}
    } else {
      // Customer clears their personal inbox
      try {
        const allIds = notifications.map((n) => n.id);
        const prevDismissed = JSON.parse(localStorage.getItem(dismissedKey) || "[]");
        const combined = Array.from(new Set([...prevDismissed, ...allIds]));
        localStorage.setItem(dismissedKey, JSON.stringify(combined));
      } catch {}
    }

    setNotifications([]);
    if (storageKey) {
      try { localStorage.setItem(storageKey, JSON.stringify([])); } catch {}
    }
  };

  const removeNotification = async (id) => {
    if (isAdmin) {
      // Admin deletes from Database
      try {
        await Promise.allSettled([
          fetch(`/api/v1/notifications?id=${encodeURIComponent(id)}`, { method: "DELETE" }),
          fetch(`${API_BASE_URL}/api/v1/notifications/${encodeURIComponent(id)}`, { method: "DELETE" }),
          new Promise((r) => setTimeout(r, 450)),
        ]);
      } catch {}
    } else {
      // Customer dismisses from personal inbox
      try {
        const prevDismissed = JSON.parse(localStorage.getItem(dismissedKey) || "[]");
        if (!prevDismissed.includes(id)) {
          prevDismissed.push(id);
          localStorage.setItem(dismissedKey, JSON.stringify(prevDismissed));
        }
      } catch {}
    }

    setNotifications((prev) => {
      const updated = prev.filter((n) => n.id !== id);
      if (storageKey) {
        try { localStorage.setItem(storageKey, JSON.stringify(updated)); } catch {}
      }
      return updated;
    });
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
  if (!ctx) throw new Error("useNotifications must be used within a NotificationProvider");
  return ctx;
}