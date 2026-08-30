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

  // Load from user storage on start and poll DB
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
    const interval = setInterval(fetchDbNotifications, 8000);
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
        addNotification({
          title: `📢 ${title}`,
          message,
          type: "info",
        });
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
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications must be used inside NotificationProvider");
  return ctx;
}