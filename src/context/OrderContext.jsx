import { authFetch, getToken } from "../config/authFetch";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { useAuth } from "./AuthContext";
import { API_BASE_URL } from "../config/api";
import { mergeOrderLists, ordersPageQuery, readOrdersPage } from "../utils/orderPagination";

// OrderContext Provider - checkout, vendor orders, status tracking aur database sync handle karta hai
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
  // Pagination: naye orders upar aate hain aur purane orders loadMoreOrders se judte hain
  const [ordersCursor, setOrdersCursor] = useState(null);
  const [hasMoreOrders, setHasMoreOrders] = useState(false);
  const [loadingMoreOrders, setLoadingMoreOrders] = useState(false);
  const [ordersSummary, setOrdersSummary] = useState(() => {
    try {
      const saved = localStorage.getItem(`${getRoleStorageKey()}_summary`);
      const parsed = saved ? JSON.parse(saved) : null;
      if (parsed?.revenueBasis === "all_orders_total") {
        try { localStorage.removeItem(`${getRoleStorageKey()}_summary`); } catch {}
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  });
  const olderPagesLoadedRef = useRef(false);
  const identityKeyRef = useRef(null);

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
      walletDiscount: Number(ord.walletDiscount || 0),
      discountAmount: Number(ord.discountAmount || 0),
      items: Array.isArray(ord.items) ? ord.items : [],
    };
  };

  const getRoleStorageKey = () => {
    if (user?.id) return `${STORAGE_KEY}_${userRole || "user"}_${user.id}`;
    if (user?.phone) return `${STORAGE_KEY}_${userRole || "user"}_${user.phone}`;
    return `${STORAGE_KEY}_${userRole || "anon"}`;
  };

  // Ek sath multiple requests se bachne ke liye request share kar rahe hain
  const inFlightOrdersRef = useRef(null);
  const fetchOrdersForCurrentRole = () => {
    if (inFlightOrdersRef.current) return inFlightOrdersRef.current;
    const request = loadOrdersForCurrentRole().finally(() => {
      inFlightOrdersRef.current = null;
    });
    inFlightOrdersRef.current = request;
    return request;
  };

  // Same URL ke liye ek hi bar fetch call trigger ho uske liye cache
  const inFlightPagesRef = useRef(new Map());
  const getOrdersPageShared = (url) => {
    const pending = inFlightPagesRef.current.get(url);
    if (pending) return pending;
    const request = authFetch(url)
      .then(async (res) => ({ ok: res.ok, status: res.status, data: res.ok ? await res.json() : null }))
      .finally(() => inFlightPagesRef.current.delete(url));
    inFlightPagesRef.current.set(url, request);
    return request;
  };

  // User role ke mutabiq sahi orders API URL nikalna
  const getOrdersListUrl = () => {
    if (isAdmin || isDr) return `${API_BASE_URL}/api/v1/orders`;
    if (isVendor) {
      const vId = user.vendorInfo?.id || user.vendorId || user.phone || user.id;
      return `${API_BASE_URL}/api/v1/orders/vendor/${encodeURIComponent(vId)}`;
    }
    if (userIdent) return `${API_BASE_URL}/api/v1/orders/me`;
    return null;
  };

  // Agle purane orders fetch karke list me jodne ka function
  const loadMoreOrders = async () => {
    const listUrl = getOrdersListUrl();
    if (!listUrl || !ordersCursor || loadingMoreOrders) return [];
    setLoadingMoreOrders(true);
    try {
      const res = await authFetch(`${listUrl}${ordersPageQuery(ordersCursor)}`);
      if (!res.ok) return [];
      const page = readOrdersPage(await res.json());
      const older = page.orders.map(normalizeOrder);
      olderPagesLoadedRef.current = true;
      setOrders((prev) => mergeOrderLists(prev, older));
      setOrdersCursor(page.nextCursor);
      setHasMoreOrders(page.hasMore);
      return older;
    } catch (err) {
      console.warn("Load more orders note:", err.message);
      return [];
    } finally {
      setLoadingMoreOrders(false);
    }
  };

  const loadOrdersForCurrentRole = async () => {
    const token = getToken() || user?.token || (typeof window !== "undefined" ? localStorage.getItem("buildcity_token") : null);
    if (!user || !token) return orders;
    const currentStorageKey = getRoleStorageKey();

    const listUrl = getOrdersListUrl();
    if (!listUrl) return orders;

    try {
      // Dashboard ke live counts ke liye summary fetch karte hain
      if (!isDr) {
        authFetch(`${API_BASE_URL}/api/v1/orders/summary`)
          .then((r) => (r.ok ? r.json() : null))
          .then((summary) => {
            if (summary) {
              if (summary.revenueBasis === "all_orders_total") {
                try { localStorage.removeItem(`${currentStorageKey}_summary`); } catch {}
                return;
              }
              setOrdersSummary(summary);
              try { localStorage.setItem(`${currentStorageKey}_summary`, JSON.stringify(summary)); } catch {}
            }
          })
          .catch(() => {});
      }

      const res = await getOrdersPageShared(`${listUrl}${ordersPageQuery(null)}`);
      if (res.ok) {
        const page = readOrdersPage(res.data);
        const normalized = page.orders.map(normalizeOrder);
        const keepOlderPages = olderPagesLoadedRef.current;
        setOrders((prev) => {
          // Purane loaded orders ko preserve rakhte hue naye orders merge karo
          const next = keepOlderPages ? mergeOrderLists(normalized, prev) : normalized;
          if (areOrdersEqual(prev, next)) return prev;
          try { localStorage.setItem(currentStorageKey, JSON.stringify(next)); } catch {}
          return next;
        });
        if (!keepOlderPages) {
          setOrdersCursor(page.nextCursor);
          setHasMoreOrders(page.hasMore);
        }
        return normalized;
      }
    } catch (err) {
      console.warn("Fetch orders role note:", err.message);
    }
    return orders;
  };

  useEffect(() => {
    const currentStorageKey = getRoleStorageKey();
    // Alag account login hone par hi pagination reset karo
    const identityKey = `${userRole}:${userIdent || ""}`;
    if (identityKeyRef.current !== identityKey) {
      identityKeyRef.current = identityKey;
      olderPagesLoadedRef.current = false;
      setOrdersCursor(null);
      setHasMoreOrders(false);
      try {
        const savedSummary = localStorage.getItem(`${currentStorageKey}_summary`);
        setOrdersSummary(savedSummary ? JSON.parse(savedSummary) : null);
      } catch {
        setOrdersSummary(null);
      }
    }
    const saved = localStorage.getItem(currentStorageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) setOrders(parsed.map(normalizeOrder));
      } catch {
        localStorage.removeItem(currentStorageKey);
      }
    } else {
      // Role change hone par orders state reset karo
      setOrders([]);
    }
    fetchOrdersForCurrentRole();

    // Tab open aur visible hone par hi polling karo
    const interval = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        fetchOrdersForCurrentRole();
      }
    }, 300000);

    // Tab par wapas aane par turant fresh orders fetch karo
    const handleFocus = () => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        fetchOrdersForCurrentRole();
      }
    };

    // Order place ya update hone par turant sync karo
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

  // Dusre browser tab me badlav hone par sync karo
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try { setOrders(JSON.parse(e.newValue)); } catch {}
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  // Order place karna - alag alag vendors ke items ko group karke order banana
  const placeOrder = async ({ items, address, total, customerId, districtName, regionId, deliveryFee = 49, couponCode = null, discountAmount = 0, useWallet = false, walletDiscount = 0 }) => {
    // Items ko vendor details ke sath format karo
    const formattedItems = (items || []).map((it) => ({
      id: it.id || it.productId,
      productId: it.productId || it.id,
      name: it.name || it.productName || "Material Item",
      quantity: Number(it.quantity || it.qty) || 1,
      price: Number(it.price) || 100,
      vendorId: it.vendorId,
      vendorName: it.vendorName || "District Vendor",
    }));

    // Ek vendor ke sabhi items ko ek order me group karo
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
        // Default district catalog ke items ko ek sath group karo
        vKey = "default_district_vendor";
      }

      if (!vendorMap.has(vKey)) {
        vendorMap.set(vKey, []);
      }
      vendorMap.get(vKey).push(it);
    });

    const vendorGroups = Array.from(vendorMap.values());

    // Sabhi vendor groups ke orders parallel me dispatch karo
    const orderPromises = vendorGroups.map(async (groupItems, i) => {
      const groupSubtotal = groupItems.reduce(
        (sum, it) => sum + Number(it.price || 0) * (Number(it.quantity || 1)),
        0
      );
      // Delivery fee direct checkout charge se respect karo
      const groupDeliveryFee = deliveryFee !== undefined && deliveryFee !== null ? Number(deliveryFee) : 0;
      const groupDiscount = i === 0 ? Number(discountAmount || 0) : 0;
      const groupWalletDiscount = i === 0 ? Number(walletDiscount || 0) : 0;
      const groupCouponCode = i === 0 && couponCode ? String(couponCode).toUpperCase() : null;
      const groupTotal = Math.round(Math.max(0, groupSubtotal + groupDeliveryFee - groupDiscount - groupWalletDiscount) * 100) / 100;
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
            discountAmount: groupDiscount,
            couponCode: groupCouponCode,
            useWallet: i === 0 ? Boolean(useWallet) : false,
            walletDiscount: groupWalletDiscount,
            districtName: districtName || "Varanasi",
            regionId: regionId || "varanasi",
            address: address || { street: "Main Delivery Address", city: districtName || "Varanasi", state: "Uttar Pradesh", pincode: "221001" },
            items: groupItems,
            vendorId: groupVendorId,
            vendorName: groupVendorName,
            idempotencyKey,
          }),
        });

        let resData = null;
        try {
          resData = await response.json();
        } catch {
          resData = { error: "Network or server connection failed." };
        }

        if (response.ok && resData?.success && resData?.order) {
          // Har vendor ka alag order id generate hota hai
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
            total: Number(so.totalAmount !== undefined ? so.totalAmount : groupTotal),
            totalAmount: Number(so.totalAmount !== undefined ? so.totalAmount : groupTotal),
            deliveryFee: Number(so.deliveryFee !== undefined ? so.deliveryFee : groupDeliveryFee),
            discountAmount: Number(so.discountAmount !== undefined ? so.discountAmount : groupDiscount),
            walletDiscount: Number(so.walletDiscount !== undefined ? so.walletDiscount : groupWalletDiscount),
            couponCode: so.couponCode || groupCouponCode,
          }));
        } else {
          throw new Error(resData?.error || "Order not placed , please try again.");
        }
      } catch (err) {
        console.error("Order placement error for vendor group:", err.message);
        throw err;
      }

      return ordersSaved;
    });

    const createdOrders = (await Promise.all(orderPromises)).flat();

    // Orders state update karo aur event trigger karo
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

  // Vendor ke specific orders database se fetch karna
  const fetchVendorOrdersPage = async (vendorId, cursor = null) => {
    const res = await getOrdersPageShared(`${API_BASE_URL}/api/v1/orders/vendor/${encodeURIComponent(vendorId)}${ordersPageQuery(cursor)}`);
    if (!res.ok) throw new Error(`Vendor orders HTTP ${res.status}`);
    const page = readOrdersPage(res.data);
    return { ...page, orders: page.orders.map(normalizeOrder) };
  };

  const fetchVendorOrders = async (vendorId) => {
    try {
      return (await fetchVendorOrdersPage(vendorId)).orders;
    } catch (err) {
      console.warn("Fetch vendor orders note:", err.message);
    }
    // Agar server down ho toh local orders filter karke do
    return orders.filter((o) =>
      o.items?.some((it) => it.vendorId === vendorId)
    );
  };

  // Order status change karna aur database me save karna
  const updateOrderStatus = async (orderId, newStatus) => {
    const currentStorageKey = getRoleStorageKey();
    const previousStatus = orders.find((o) => o.id === orderId)?.status;

    // UI me turant status update dikhao
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

    // Server se error aane par purana status wapas lagao
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
        fetchVendorOrdersPage,
        updateOrderStatus,
        hasMoreOrders,
        loadingMoreOrders,
        loadMoreOrders,
        ordersSummary,
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