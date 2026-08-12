import { createContext, useContext, useEffect, useState } from "react";

const NotificationContext = createContext(null);
const STORAGE_KEY = "buildcity_notifications";

// TEMPORARY MOCK — replace with GET /api/v1/notifications once backend is ready
const seedNotifications = [
  {
    id: "n1",
    title: "Welcome to BuildCity! 🎉",
    message: "Get 20% off on your first order. Use code WELCOME20 at checkout.",
    time: "2 hours ago",
    read: false,
    type: "offer",
  },
  {
    id: "n2",
    title: "Price Drop Alert",
    message: "UltraTech Cement 50kg is now ₹350, down from ₹390 in your region.",
    time: "5 hours ago",
    read: false,
    type: "price",
  },
  {
    id: "n3",
    title: "New vendors added",
    message: "3 new trusted vendors are now delivering in your area.",
    time: "1 day ago",
    read: true,
    type: "info",
  },
];

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setNotifications(JSON.parse(saved));
      } catch {
        setNotifications(seedNotifications);
      }
    } else {
      setNotifications(seedNotifications);
    }
  }, []);

  useEffect(() => {
    if (notifications.length) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
    }
  }, [notifications]);

  const addNotification = ({ title, message, type = "info" }) => {
    setNotifications((prev) => [
      {
        id: "n-" + Date.now(),
        title,
        message,
        time: "Just now",
        read: false,
        type,
      },
      ...prev,
    ]);
  };

  const markAsRead = (id) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <NotificationContext.Provider
      value={{ notifications, addNotification, markAsRead, markAllAsRead, unreadCount }}
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