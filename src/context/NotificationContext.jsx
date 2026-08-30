import { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "./AuthContext";

const NotificationContext = createContext(null);

const DEFAULT_NOTIFICATIONS = [
  {
    id: "n-welcome",
    title: "Welcome to Sonevalley BuildCity! 🏗️",
    message: "Certified building materials, steel, cement & sanitary delivered direct to your construction site.",
    link: "/categories",
    timestamp: Date.now() - 3600000 * 2,
    read: false,
    type: "info",
  },
  {
    id: "n-offer",
    title: "Bulk Construction Site Discount 🎉",
    message: "Free express site delivery across Uttar Pradesh districts on all bulk orders above ₹25,000.",
    link: "/categories",
    timestamp: Date.now() - 3600000 * 5,
    read: false,
    type: "offer",
  },
];

export function NotificationProvider({ children }) {
  const { user } = useAuth();
  const storageKey = user?.phone
    ? `buildcity_notifications_${user.phone.replace(/\D/g, "")}`
    : user?.id
    ? `buildcity_notifications_${user.id}`
    : "buildcity_notifications_guest";

  const [notifications, setNotifications] = useState([]);

  // Load user-specific notifications
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        setNotifications(JSON.parse(saved));
      } else {
        setNotifications(DEFAULT_NOTIFICATIONS);
      }
    } catch {
      setNotifications(DEFAULT_NOTIFICATIONS);
    }
  }, [storageKey]);

  // Persist to user storage key
  useEffect(() => {
    if (notifications.length > 0 && storageKey) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(notifications));
      } catch {}
    }
  }, [notifications, storageKey]);

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

    setNotifications((prev) => [newNotif, ...prev]);
    return newNotif;
  };

  const markAsRead = (id) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
    try {
      localStorage.setItem(storageKey, JSON.stringify([]));
    } catch {}
  };

  const removeNotification = (id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        addNotification,
        markAsRead,
        markAllAsRead,
        clearAllNotifications,
        removeNotification,
        unreadCount,
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