import { createContext, useContext, useEffect, useState } from "react";
import { API_BASE_URL } from "../config/api";

// OrderContext Provider — Customer checkout, Vendor isolated orders, Status tracking aur Supabase DB sync handle karta hai
const OrderContext = createContext(null);
const STORAGE_KEY = "buildcity_orders";

export function OrderProvider({ children }) {
  const [orders, setOrders] = useState([]);

  const fetchAllOrders = async () => {
    for (let i = 0; i < 3; i++) {
      try {
        const res = await fetch(`${API_BASE_URL}/api/v1/orders`);
        if (res.ok) {
          const data = await res.json();
          setOrders(data);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
          return data;
        }
      } catch (err) {
        if (i === 2) console.warn("Fetch orders network note:", err.message);
        await new Promise((r) => setTimeout(r, 800 * (i + 1)));
      }
    }
    return orders;
  };

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setOrders(JSON.parse(saved));
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    fetchAllOrders();
    const interval = setInterval(fetchAllOrders, 5000);
    return () => clearInterval(interval);
  }, []);

  // Instant Cross-Tab Storage Synchronization
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try { setOrders(JSON.parse(e.newValue)); } catch {}
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  // Order place - region & district details save
  const placeOrder = async ({ items, address, total, customerId, districtName, regionId }) => {
    const idempotencyKey = "ord_idem_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7);

    // Format items with vendorId
    const formattedItems = (items || []).map((it) => ({
      name: it.name || it.productName || "Material Item",
      quantity: Number(it.quantity) || 1,
      price: Number(it.price) || 100,
      vendorId: it.vendorId || "v1",
      vendorName: it.vendorName || "District Vendor",
    }));

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/orders/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId,
          totalAmount: Number(total) || 0,
          deliveryFee: 49,
          districtName: districtName || "Varanasi",
          regionId: regionId || "varanasi",
          address: address || { street: "Main Delivery Address", city: districtName || "Varanasi", state: "Uttar Pradesh", pincode: "221001" },
          items: formattedItems,
          idempotencyKey,
        }),
      });

      const resData = await response.json();
      if (resData.success && resData.order) {
        const createdOrder = {
          id: resData.order.id,
          userId: customerId || resData.order.userId || resData.order.customerId,
          userPhone: resData.order.userPhone || address?.phone,
          date: resData.order.createdAt || new Date().toISOString(),
          status: resData.order.status || "Pending",
          districtName: districtName || resData.order.districtName || "Varanasi",
          regionId: regionId || resData.order.regionId || "varanasi",
          items: formattedItems,
          address,
          total: Number(total) || 0,
        };
        setOrders((prev) => [createdOrder, ...prev]);
        return createdOrder;
      }
    } catch (err) {
      console.warn("Order placement fallback note:", err.message);
    }

    // Local fallback if server unreachable
    const fallbackOrder = {
      id: "BC" + Math.floor(10000 + Math.random() * 89999),
      date: new Date().toISOString(),
      status: "Pending",
      districtName: districtName || "Varanasi",
      regionId: regionId || "varanasi",
      items: formattedItems,
      address,
      total: Number(total) || 0,
    };
    setOrders((prev) => [fallbackOrder, ...prev]);
    return fallbackOrder;
  };

  // Vendor Isolated Orders fetch from Supabase Cloud DB
  const fetchVendorOrders = async (vendorId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/orders/vendor/${vendorId}`);
      if (res.ok) {
        const vendorData = await res.json();
        return vendorData;
      }
    } catch (err) {
      console.warn("Fetch vendor orders note:", err.message);
    }
    // Filter local orders if server unreachable
    return orders.filter((o) =>
      o.items?.some((it) => it.vendorId === vendorId)
    );
  };

  // Update Order Status in Supabase Cloud DB
  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        const updated = await res.json();
        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
        );
        return updated;
      }
    } catch (err) {
      console.warn("Update status note:", err.message);
    }

    // Local state update
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
    );
  };

  const getOrder = (id) => orders.find((o) => o.id === id);

  return (
    <OrderContext.Provider
      value={{
        orders,
        placeOrder,
        getOrder,
        fetchAllOrders,
        fetchVendorOrders,
        updateOrderStatus,
      }}
    >
      {children}
    </OrderContext.Provider>
  );
}

export function useOrders() {
  const ctx = useContext(OrderContext);
  if (!ctx) throw new Error("useOrders must be used inside OrderProvider");
  return ctx;
}