import { authFetch, getToken } from "../config/authFetch";
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
  const isDr = userRole === "dr" || userRole === "district_rep" || Boolean(user?.drInfo) || String(user?.role || "").toUpperCase() === "DR";
  const isVendor = userRole === "vendor" || Boolean(user?.vendorInfo);
  const userIdent = user?.id || user?.phone;

  const [orders, setOrders] = useState([]);

  const areOrdersEqual = (listA, listB) => {
    if (listA === listB) return true;
    if (!listA && !listB) return true;
    if (!listA || !listB) return false;
    if (!Array.isArray(listA) || !Array.isArray(listB)) return false;
    if (listA.length !== listB.length) return false;
    for (let i = 0; i < listA.length; i++) {
      const a = listA[i];
      const b = listB[i];
      if (!a || !b) return false;
      if (a.id !== b.id) return false;
      if (String(a.status || "").toUpperCase() !== String(b.status || "").toUpperCase()) return false;
      const aAmt = Number(a.totalAmount ?? a.total ?? 0);
      const bAmt = Number(b.totalAmount ?? b.total ?? 0);
      if (aAmt !== bAmt) return false;
    }
    return true;
  };

  const normalizeOrder = (ord) => {
    if (!ord) return ord;
    const addr = ord.address || {};
    let vendorRegion = null;
    if (Array.isArray(ord.items)) {
      for (const it of ord.items) {
        if (it?.vendor?.region?.name || it?.vendorRegion) {
          vendorRegion = it?.vendor?.region?.name || it?.vendorRegion;
          break;
        }
      }
    }
    const resolvedRegionName = addr.region?.name || ord.region?.name || vendorRegion || ord.districtName || ord.regionName || addr.city || "Varanasi";
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

  const getRoleStorageKey = () => {
    if (user?.id) return `${STORAGE_KEY}_${userRole || "user"}_${user.id}`;
    if (user?.phone) return `${STORAGE_KEY}_${userRole || "user"}_${user.phone}`;
    return `${STORAGE_KEY}_${userRole || "anon"}`;
  };

  const fetchOrdersForCurrentRole = async () => {
    const token = getToken() || user?.token || (typeof window !== "undefined" ? localStorage.getItem("buildcity_token") : null);
    if (!user || !token) return orders;
    const currentStorageKey = getRoleStorageKey();

    try {
      if (isAdmin || isDr) {
        const res = await authFetch(`${API_BASE_URL}/api/v1/orders`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            const normalized = data.map(normalizeOrder);
            setOrders((prev) => {
              if (areOrdersEqual(prev, normalized)) return prev;
              try { localStorage.setItem(currentStorageKey, JSON.stringify(normalized)); } catch {}
              return normalized;
            });
            return normalized;
          }
        }
      } else if (isVendor) {
        const vId = user.vendorInfo?.id || user.vendorId || user.phone || user.id;
        const res = await authFetch(`${API_BASE_URL}/api/v1/orders/vendor/${encodeURIComponent(vId)}`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            const normalized = data.map(normalizeOrder);
            setOrders((prev) => {
              if (areOrdersEqual(prev, normalized)) return prev;
              try { localStorage.setItem(currentStorageKey, JSON.stringify(normalized)); } catch {}
              return normalized;
            });
            return normalized;
          }
        }
      } else if (userIdent) {
        // Customer isolated orders via /me (zero phone number in URL)
        const res = await authFetch(`${API_BASE_URL}/api/v1/orders/me`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            const normalized = data.map(normalizeOrder);
            setOrders((prev) => {
              if (areOrdersEqual(prev, normalized)) return prev;
              try { localStorage.setItem(currentStorageKey, JSON.stringify(normalized)); } catch {}
              return normalized;
            });
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
    const currentStorageKey = getRoleStorageKey();
    const saved = localStorage.getItem(currentStorageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) setOrders(parsed.map(normalizeOrder));
      } catch {
        localStorage.removeItem(currentStorageKey);
      }
    } else {
      // Clear orders when switching to an un-cached role
      setOrders([]);
    }
    fetchOrdersForCurrentRole();

    // 1. Smart Interval: Poll only when tab is visible to the user (5m fallback instead of 90s)
    const interval = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        fetchOrdersForCurrentRole();
      }
    }, 300000);

    // 2. Instant Sync on Window Focus (when user returns to the tab)
    const handleFocus = () => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        fetchOrdersForCurrentRole();
      }
    };

    // 3. Instant Event-Driven Sync (0ms delay when order is placed or updated)
    const handleOrderEvent = () => fetchOrdersForCurrentRole();
    window.addEventListener("focus", handleFocus);
    window.addEventListener("visibilitychange", handleFocus);
    window.addEventListener("buildcity_orders_updated", handleOrderEvent);
    window.addEventListener("buildcity_order_placed", handleOrderEvent);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("visibilitychange", handleFocus);
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

  // Order place - Multi-vendor isolated splitting with independent status & grouped items for same vendor
  const placeOrder = async ({ items, address, total, customerId, districtName, regionId, deliveryFee = 49 }) => {
    // 1. Format items with vendorId & vendorName
    const formattedItems = (items || []).map((it) => ({
      id: it.id || it.productId,
      productId: it.productId || it.id,
      name: it.name || it.productName || "Material Item",
      quantity: Number(it.quantity || it.qty) || 1,
      price: Number(it.price) || 100,
      vendorId: it.vendorId,
      vendorName: it.vendorName || "District Vendor",
    }));

    // 2. Group items strictly by vendor identity (same vendor's multiple items grouped into one order)
    const vendorMap = new Map();
    formattedItems.forEach((it, idx) => {
      const rawVendorId = it.vendorId ? String(it.vendorId).trim() : "";
      const rawVendorName = it.vendorName ? String(it.vendorName).trim() : "";

      const isGenericId = !rawVendorId || rawVendorId === "v1" || rawVendorId === "default" || rawVendorId.startsWith("v-") || rawVendorId.startsWith("vendor_default");
      const isGenericName = !rawVendorName || rawVendorName.toLowerCase() === "district vendor" || rawVendorName.toLowerCase() === "vendor" || rawVendorName.toLowerCase().includes("default");

      let vKey = "";
      if (!isGenericId) {
        vKey = `vid:${rawVendorId}`;
      } else if (!isGenericName) {
        vKey = `vname:${rawVendorName.toLowerCase()}`;
      } else {
        // Group all generic/default district catalog items into 1 unified order instead of splitting!
        vKey = "default_district_vendor";
      }

      if (!vendorMap.has(vKey)) {
        vendorMap.set(vKey, []);
      }
      vendorMap.get(vKey).push(it);
    });

    const vendorGroups = Array.from(vendorMap.values());

    // 3. Place orders in parallel (Promise.all) for instant checkout response
    const orderPromises = vendorGroups.map(async (groupItems, i) => {
      const groupSubtotal = groupItems.reduce(
        (sum, it) => sum + Number(it.price || 0) * (Number(it.quantity || 1)),
        0
      );
      // Flat delivery fee per dispatch route (or 0 if total was free)
      const groupDeliveryFee = Number(total) >= 2000 ? 0 : Number(deliveryFee || 49);
      const groupTotal = groupSubtotal + groupDeliveryFee;
      const groupVendorName = groupItems[0]?.vendorName || "District Vendor";
      const groupVendorId = groupItems[0]?.vendorId || "v1";

      const idempotencyKey = "ord_idem_" + Date.now() + "_" + i + "_" + Math.random().toString(36).substring(2, 7);

      let ordersSaved = [];

      try {
        const response = await authFetch(`${API_BASE_URL}/api/v1/orders/checkout`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            customerId,
            totalAmount: groupTotal,
            deliveryFee: groupDeliveryFee,
            districtName: districtName || "Varanasi",
            regionId: regionId || "varanasi",
            address: address || { street: "Main Delivery Address", city: districtName || "Varanasi", state: "Uttar Pradesh", pincode: "221001" },
            items: groupItems,
            vendorId: groupVendorId,
            vendorName: groupVendorName,
            idempotencyKey,
          }),
        });

        const resData = await response.json();
        if (resData.success && resData.order) {
          // Server creates one order per vendor, so a single checkout call can return several orders
          const serverOrders = Array.isArray(resData.orders) && resData.orders.length > 0 ? resData.orders : [resData.order];
          ordersSaved = serverOrders.map((so) => normalizeOrder({
            id: so.id,
            userId: customerId || so.userId || so.customerId,
            userPhone: so.userPhone || address?.phone || so.customer?.phone,
            date: so.createdAt || new Date().toISOString(),
            status: so.status || "Pending",
            districtName: districtName || so.districtName || so.address?.city || "Varanasi",
            regionId: regionId || so.regionId || so.address?.regionId || "varanasi",
            vendorId: so.items?.[0]?.vendorId || groupVendorId,
            vendorName: so.items?.[0]?.vendorName || groupVendorName,
            items: so.items && so.items.length > 0 ? so.items : groupItems,
            address: so.address || address,
            customer: so.customer,
            total: Number(so.totalAmount) || groupTotal,
            totalAmount: Number(so.totalAmount) || groupTotal,
            deliveryFee: Number(so.deliveryFee) || groupDeliveryFee,
          }));
        } else {
          throw new Error(resData.error || "Order placement failed on server");
        }
      } catch (err) {
        console.error("Order placement error for vendor group:", err.message);
        throw err;
      }

      return ordersSaved;
    });

    const createdOrders = (await Promise.all(orderPromises)).flat();

    // 4. Update orders state synchronously & dispatch events
    setOrders((prev) => {
      const newIds = new Set(createdOrders.map((o) => o.id));
      const updated = [...createdOrders, ...prev.filter((p) => !newIds.has(p.id))];
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)); } catch {}
      return updated;
    });

    window.dispatchEvent(new CustomEvent("buildcity_orders_updated"));
    createdOrders.forEach((o) => {
      window.dispatchEvent(new CustomEvent("buildcity_order_placed", { detail: o }));
    });

    if (createdOrders.length === 1) {
      return createdOrders[0];
    }

    return {
      ...createdOrders[0],
      isMultiVendor: true,
      orders: createdOrders,
      totalAmount: createdOrders.reduce((sum, o) => sum + Number(o.totalAmount || o.total || 0), 0),
      total: createdOrders.reduce((sum, o) => sum + Number(o.total || 0), 0),
    };
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

  // Update Order Status in Supabase Cloud DB with instant synchronous cache persistence
  const updateOrderStatus = async (orderId, newStatus) => {
    const currentStorageKey = getRoleStorageKey();
    const previousStatus = orders.find((o) => o.id === orderId)?.status;

    // Optimistic local state + storage update so refreshes never see stale statuses
    setOrders((prev) => {
      const updated = prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o));
      try { localStorage.setItem(currentStorageKey, JSON.stringify(updated)); } catch {}
      return updated;
    });

    let res;
    try {
      res = await authFetch(`${API_BASE_URL}/api/v1/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
    } catch (err) {
      console.warn("Update status note:", err.message);
      return;
    }

    if (res.ok) {
      const updated = await res.json();
      setOrders((prev) => {
        const next = prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o));
        try { localStorage.setItem(currentStorageKey, JSON.stringify(next)); } catch {}
        return next;
      });
      window.dispatchEvent(new CustomEvent("buildcity_orders_updated"));
      return updated;
    }

    // Server refused the change (e.g. not this vendor's order): undo the optimistic update and surface why
    const errData = await res.json().catch(() => ({}));
    setOrders((prev) => {
      const next = prev.map((o) => (o.id === orderId && previousStatus !== undefined ? { ...o, status: previousStatus } : o));
      try { localStorage.setItem(currentStorageKey, JSON.stringify(next)); } catch {}
      return next;
    });
    throw new Error(errData.error || "Failed to update order status.");
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