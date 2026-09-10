import { authFetch } from "../config/authFetch";
import { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "./AuthContext";
import { API_BASE_URL } from "../config/api";

// OrderContext Provider — Customer checkout, Vendor isolated orders, Status tracking aur Supabase DB sync handle karta hai
const OrderContext = createContext(null);
const STORAGE_KEY = "buildcity_orders";

export function OrderProvider({ children }) {
  const { user } = useAuth() || {};
  const userRole = (user?.role || "").toLowerCase();
  const isAdmin = userRole === "admin";
  const isVendor = userRole === "vendor";
  const userIdent = user?.id || user?.phone;

  const [orders, setOrders] = useState([]);

  const normalizeOrder = (ord) => {
    if (!ord) return ord;
    const addr = ord.address || {};
    const resolvedRegionName = addr.region?.name || ord.region?.name || addr.city || ord.districtName || ord.regionName || addr.district || "Varanasi";
    const resolvedRegionId = addr.region?.id || addr.regionId || ord.region?.id || ord.regionId || "2ab0f187-d170-4432-8eef-e0ac31ed21c3";
    return {
      ...ord,
      districtName: resolvedRegionName,
      regionName: resolvedRegionName,
      regionId: resolvedRegionId,
      total: Number(ord.totalAmount) || Number(ord.total) || 0,
      totalAmount: Number(ord.totalAmount) || Number(ord.total) || 0,
      items: Array.isArray(ord.items) ? ord.items : [],
    };
  };

  const fetchOrdersForCurrentRole = async () => {
    const token = typeof window !== "undefined" ? localStorage.getItem("buildcity_token") : null;
    if (!user || !token) return orders;

    try {
      if (isAdmin || userRole === "dr") {
        const res = await authFetch(`${API_BASE_URL}/api/v1/orders`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            const normalized = data.map(normalizeOrder);
            setOrders(normalized);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
            return normalized;
          }
        }
      } else if (isVendor) {
        const vId = user.vendorInfo?.id || user.vendorId || user.id;
        const res = await authFetch(`${API_BASE_URL}/api/v1/orders/vendor/${encodeURIComponent(vId)}`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            const normalized = data.map(normalizeOrder);
            setOrders(normalized);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
            return normalized;
          }
        }
      } else if (userIdent) {
        // Customer isolated orders via /me (zero phone number in URL)
        const res = await authFetch(`${API_BASE_URL}/api/v1/orders/me`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            const normalized = data.map(normalizeOrder);
            setOrders(normalized);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
            return normalized;
          }
        }
      }
    } catch (err) {
      console.warn("Fetch orders role note:", err.message);
    }
    return orders;
  };

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) setOrders(parsed.map(normalizeOrder));
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    fetchOrdersForCurrentRole();
    const interval = setInterval(fetchOrdersForCurrentRole, 3000);

    const handleOrderEvent = () => fetchOrdersForCurrentRole();
    window.addEventListener("buildcity_orders_updated", handleOrderEvent);
    window.addEventListener("buildcity_order_placed", handleOrderEvent);

    return () => {
      clearInterval(interval);
      window.removeEventListener("buildcity_orders_updated", handleOrderEvent);
      window.removeEventListener("buildcity_order_placed", handleOrderEvent);
    };
  }, [user, userRole, userIdent]);

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
      const response = await authFetch(`${API_BASE_URL}/api/v1/orders/checkout`, {
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
        const createdOrder = normalizeOrder({
          id: resData.order.id,
          userId: customerId || resData.order.userId || resData.order.customerId,
          userPhone: resData.order.userPhone || address?.phone || resData.order.customer?.phone,
          date: resData.order.createdAt || new Date().toISOString(),
          status: resData.order.status || "Pending",
          districtName: districtName || resData.order.districtName || resData.order.address?.city || "Varanasi",
          regionId: regionId || resData.order.regionId || resData.order.address?.regionId || "varanasi",
          items: resData.order.items && resData.order.items.length > 0 ? resData.order.items : formattedItems,
          address: resData.order.address || address,
          customer: resData.order.customer,
          total: Number(resData.order.totalAmount) || Number(total) || 0,
          totalAmount: Number(resData.order.totalAmount) || Number(total) || 0,
          deliveryFee: Number(resData.order.deliveryFee) || 49,
        });
        setOrders((prev) => {
          const updated = [createdOrder, ...prev.filter((p) => p.id !== createdOrder.id)];
          try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)); } catch {}
          return updated;
        });
        window.dispatchEvent(new CustomEvent("buildcity_orders_updated"));
        window.dispatchEvent(new CustomEvent("buildcity_order_placed", { detail: createdOrder }));
        return createdOrder;
      }
    } catch (err) {
      console.warn("Order placement fallback note:", err.message);
    }

    // Local fallback if server unreachable
    const fallbackOrder = normalizeOrder({
      id: "BC" + Math.floor(10000 + Math.random() * 89999),
      userId: customerId,
      userPhone: address?.phone,
      date: new Date().toISOString(),
      status: "Pending",
      districtName: districtName || "Varanasi",
      regionId: regionId || "varanasi",
      items: formattedItems,
      address,
      total: Number(total) || 0,
    });
    setOrders((prev) => {
      const updated = [fallbackOrder, ...prev.filter((p) => p.id !== fallbackOrder.id)];
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)); } catch {}
      return updated;
    });
    window.dispatchEvent(new CustomEvent("buildcity_orders_updated"));
    return fallbackOrder;
  };

  // Vendor Isolated Orders fetch from Supabase Cloud DB
  const fetchVendorOrders = async (vendorId) => {
    try {
      const res = await authFetch(`${API_BASE_URL}/api/v1/orders/vendor/${vendorId}`);
      if (res.ok) {
        const vendorData = await res.json();
        if (Array.isArray(vendorData)) {
          return vendorData.map(normalizeOrder);
        }
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
      const res = await authFetch(`${API_BASE_URL}/api/v1/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        const updated = await res.json();
        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
        );
        window.dispatchEvent(new CustomEvent("buildcity_orders_updated"));
        return updated;
      }
    } catch (err) {
      console.warn("Update status note:", err.message);
    }

    // Local state update
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
    );
    window.dispatchEvent(new CustomEvent("buildcity_orders_updated"));
  };

  const getOrder = (id) => orders.find((o) => o.id === id);

  return (
    <OrderContext.Provider
      value={{
        orders,
        placeOrder,
        getOrder,
        fetchAllOrders: fetchOrdersForCurrentRole,
        fetchOrdersForCurrentRole,
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