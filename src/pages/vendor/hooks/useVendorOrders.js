import { useState, useEffect, useMemo, useRef } from "react";
import { mergeOrderLists } from "../../../utils/orderPagination";
import { notifyVendorNewOrder } from "../../../utils/orderAlertSound";
import { pricedLine } from "../orderView";

const ACTIVE_STATUSES = ["PENDING", "PROCESSING", "OUT_FOR_DELIVERY"];

const PENDING_HIGHLIGHT_KEY = "buildcity_pending_highlight_order";
const PENDING_HIGHLIGHT_TIME_KEY = "buildcity_pending_highlight_time";
const INSTANT_ORDER_KEY = "buildcity_instant_incoming_order";
const LAST_ORDERS_KEY = "buildcity_last_vendor_orders";
const cacheKey = (vendorId) => `buildcity_vendor_orders_${vendorId}`;

// Placeholder shown the instant a push notification is tapped, before the real order is fetched
const makeInstantStub = (id, data) => ({
  id: String(id),
  orderNumber: String(data.orderNumber || id),
  status: "PENDING",
  totalAmount: Number(data.amount || 0),
  total: Number(data.amount || 0),
  createdAt: new Date().toISOString(),
  items: [],
  customer: { name: "Customer", phone: "" },
  address: { street: "Site Delivery Address" },
  _isInstantStub: true,
});

const readInstantOrder = (orderId) => {
  try {
    const data = JSON.parse(localStorage.getItem(INSTANT_ORDER_KEY) || "null");
    if (data && (String(data.orderId) === String(orderId) || String(data.id) === String(orderId))) return data;
  } catch {}
  return null;
};

const readPendingHighlight = () => {
  try {
    const id = localStorage.getItem(PENDING_HIGHLIGHT_KEY);
    const time = Number(localStorage.getItem(PENDING_HIGHLIGHT_TIME_KEY) || 0);
    if (id && Date.now() - time < 300000) return id;
  } catch {}
  return null;
};

// ⚡ 0-delay first frame: previously cached orders so the screen is never blank
const readCachedOrders = (vendorId) => {
  try {
    let list = [];
    const saved = localStorage.getItem(cacheKey(vendorId)) || localStorage.getItem(LAST_ORDERS_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) list = parsed;
    }
    if (list.length === 0) {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith("buildcity_vendor_orders_")) {
          const p = JSON.parse(localStorage.getItem(k) || "null");
          if (Array.isArray(p) && p.length > 0) {
            list = p;
            break;
          }
        }
      }
    }
    // App opened from a push notification: show the incoming order immediately
    const pendingId = localStorage.getItem(PENDING_HIGHLIGHT_KEY);
    const instant = pendingId && readInstantOrder(pendingId);
    if (instant && !list.some((o) => String(o.id) === String(pendingId) || String(o.orderNumber) === String(pendingId))) {
      return [makeInstantStub(pendingId, instant), ...list];
    }
    return list;
  } catch {}
  return [];
};

const hasCachedOrders = (vendorId) => {
  try {
    const parsed = JSON.parse(localStorage.getItem(cacheKey(vendorId)) || localStorage.getItem(LAST_ORDERS_KEY) || "null");
    return Array.isArray(parsed) && parsed.length > 0;
  } catch {}
  return false;
};

/**
 * Vendor order feed: cache-first load, polling + event-driven sync, new-order alerts,
 * push-notification highlight, older-page pagination and status updates.
 */
export default function useVendorOrders({
  vendorId,
  shopName,
  isItemForThisVendor,
  contextOrders,
  fetchVendorOrders,
  fetchVendorOrdersPage,
  updateOrderStatus,
  ordersSummary,
  onHighlight,
  showAlert,
}) {
  const [fetchedVendorOrders, setFetchedVendorOrders] = useState(() => readCachedOrders(vendorId));
  const [ordersLoaded, setOrdersLoaded] = useState(() => hasCachedOrders(vendorId));

  // Older (mostly completed) orders beyond the first page, loaded on demand
  const [olderVendorOrders, setOlderVendorOrders] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const olderPagesLoadedRef = useRef(false);

  const [newOrderAlert, setNewOrderAlert] = useState(null);
  const [highlightedOrderId, setHighlightedOrderId] = useState(null);
  const [statusTransition, setStatusTransition] = useState(null); // { orderId, targetStatus }

  const highlightTimerRef = useRef(null);
  const knownOrderIdsRef = useRef(new Set());
  const initialLoadDoneRef = useRef(false);
  const optimisticStatusMapRef = useRef(new Map());
  const onHighlightRef = useRef(onHighlight);
  onHighlightRef.current = onHighlight;

  const triggerOrderHighlight = (orderId) => {
    if (!orderId) return;
    onHighlightRef.current?.(orderId);
    setHighlightedOrderId(orderId);

    // Retry for up to 3s until the tile is in the DOM, then centre it
    let attempts = 0;
    const scrollInterval = setInterval(() => {
      attempts++;
      const el = document.getElementById(`vendor-order-${orderId}`) || document.querySelector(`[data-order-id="${orderId}"]`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        clearInterval(scrollInterval);
      } else if (attempts >= 12) {
        clearInterval(scrollInterval);
      }
    }, 250);

    // Highlight glow auto-dismisses after 5 seconds
    if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    highlightTimerRef.current = setTimeout(() => {
      setHighlightedOrderId((curr) => (curr === orderId ? null : curr));
      try {
        if (localStorage.getItem(PENDING_HIGHLIGHT_KEY) === String(orderId)) localStorage.removeItem(PENDING_HIGHLIGHT_KEY);
        localStorage.removeItem(INSTANT_ORDER_KEY);
      } catch {}
    }, 5000);
  };

  // Smart sync: instant event sync + focus/visibility aware polling + loud alert on new orders
  useEffect(() => {
    let isMounted = true;

    const syncVendorOrders = async () => {
      try {
        let vOrds;
        try {
          const page = await fetchVendorOrdersPage(vendorId);
          vOrds = page.orders;
          if (isMounted && !olderPagesLoadedRef.current) {
            setCursor(page.nextCursor);
            setHasMore(page.hasMore);
          }
        } catch {
          vOrds = await fetchVendorOrders(vendorId);
        }
        if (!isMounted || !Array.isArray(vOrds)) return;

        if (initialLoadDoneRef.current) {
          const newlyArrived = vOrds.filter((o) => o?.id && !knownOrderIdsRef.current.has(o.id));
          if (newlyArrived.length > 0) {
            const latest = newlyArrived[0];
            // 🔔 Chime + vibration + native notification
            notifyVendorNewOrder(latest);
            setNewOrderAlert(latest);
            setTimeout(() => setNewOrderAlert((curr) => (curr?.id === latest.id ? null : curr)), 5000);
          }
        }
        vOrds.forEach((o) => o?.id && knownOrderIdsRef.current.add(o.id));
        initialLoadDoneRef.current = true;

        // Keep in-flight optimistic statuses (≤20s old) from being overwritten by stale polls
        const now = Date.now();
        for (const [id, data] of optimisticStatusMapRef.current.entries()) {
          if (now - data.timestamp > 20000) optimisticStatusMapRef.current.delete(id);
        }
        const cleanVOrds = vOrds.map((o) =>
          o?.id && optimisticStatusMapRef.current.has(o.id) ? { ...o, status: optimisticStatusMapRef.current.get(o.id).status } : o
        );

        setFetchedVendorOrders((prev) =>
          prev.length === cleanVOrds.length && JSON.stringify(prev) === JSON.stringify(cleanVOrds) ? prev : cleanVOrds
        );
        try {
          localStorage.setItem(cacheKey(vendorId), JSON.stringify(cleanVOrds));
          localStorage.setItem(LAST_ORDERS_KEY, JSON.stringify(cleanVOrds));
        } catch {}
        setOrdersLoaded(true);

        const pendingId = readPendingHighlight();
        if (pendingId) triggerOrderHighlight(pendingId);
      } catch {
        if (isMounted) setOrdersLoaded(true);
      }
    };

    const pendingId = readPendingHighlight();
    if (pendingId) triggerOrderHighlight(pendingId);

    syncVendorOrders();

    // 60s fallback poll, only while visible
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") syncVendorOrders();
    }, 60000);

    const handleFocus = () => {
      if (document.visibilityState === "visible") syncVendorOrders();
    };
    const handleOrderEvent = () => syncVendorOrders();
    const handleHighlightEvent = (e) => {
      const oId = e.detail?.orderId;
      if (!oId) return;
      // Inject the incoming order immediately if it isn't in the list yet
      const instant = readInstantOrder(oId);
      if (instant) {
        setFetchedVendorOrders((prev) =>
          prev.some((o) => String(o.id) === String(oId) || String(o.orderNumber) === String(oId)) ? prev : [makeInstantStub(oId, instant), ...prev]
        );
      }
      triggerOrderHighlight(oId);
    };

    window.addEventListener("focus", handleFocus);
    window.addEventListener("visibilitychange", handleFocus);
    window.addEventListener("buildcity_orders_updated", handleOrderEvent);
    window.addEventListener("buildcity_order_placed", handleOrderEvent);
    window.addEventListener("buildcity_order_highlight", handleHighlightEvent);

    return () => {
      isMounted = false;
      clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("visibilitychange", handleFocus);
      window.removeEventListener("buildcity_orders_updated", handleOrderEvent);
      window.removeEventListener("buildcity_order_placed", handleOrderEvent);
      window.removeEventListener("buildcity_order_highlight", handleHighlightEvent);
    };
  }, [vendorId, shopName]);

  // Appends the next page of older orders (marked known so they never trigger a new-order alert)
  const loadMore = async () => {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const page = await fetchVendorOrdersPage(vendorId, cursor);
      page.orders.forEach((o) => o?.id && knownOrderIdsRef.current.add(o.id));
      olderPagesLoadedRef.current = true;
      setOlderVendorOrders((prev) => mergeOrderLists(prev, page.orders));
      setCursor(page.nextCursor);
      setHasMore(page.hasMore);
    } catch (err) {
      console.warn("Load more vendor orders note:", err.message);
    } finally {
      setLoadingMore(false);
    }
  };

  // Strict isolation: the vendor endpoint is authoritative; context orders are only a pre-load fallback
  const vendorOrders = useMemo(() => {
    const candidates =
      fetchedVendorOrders.length > 0
        ? olderVendorOrders.length > 0
          ? mergeOrderLists(fetchedVendorOrders, olderVendorOrders)
          : fetchedVendorOrders
        : ordersLoaded
        ? []
        : (contextOrders || []).filter((o) => Array.isArray(o.items) && o.items.some(isItemForThisVendor));

    const byId = new Map();
    candidates.forEach((o) => o?.id && !byId.has(o.id) && byId.set(o.id, o));
    const fetchedIds = new Set(fetchedVendorOrders.map((f) => f.id));

    return Array.from(byId.values())
      .map((o) => {
        if (!Array.isArray(o.items) || o.items.length === 0) return null;
        let myItems = o.items.filter(isItemForThisVendor);
        // Orders from the vendor endpoint already contain only this vendor's items
        if (myItems.length === 0 && (ordersLoaded || fetchedIds.has(o.id))) myItems = o.items;
        if (myItems.length === 0) return null;

        const vendorItemsTotal = myItems.reduce((acc, it) => acc + pricedLine(it), 0);
        const totalItemsInOrder = o.allOrderItemsCount || o.totalOrderItemsCount || o.items.length;
        const isSingleVendor = myItems.length === totalItemsInOrder;
        const deliveryFee = Number(o.deliveryFee ?? o.deliveryCharge ?? 49) || 0;
        const discount = Number(o.discountAmount || 0);

        // Agar single vendor order hai ya real totalAmount present hai, toh customer bill ka true total lo
        let orderTotal;
        if (isSingleVendor && (o.totalAmount || o.total)) {
          orderTotal = Number(o.totalAmount || o.total);
        } else if (o.totalAmount && Number(o.totalAmount) > 0) {
          orderTotal = Number(o.totalAmount);
        } else {
          orderTotal = Math.max(0, vendorItemsTotal + (isSingleVendor ? deliveryFee : 0) - discount);
        }

        return {
          ...o,
          items: myItems,
          totalAmount: orderTotal,
          total: orderTotal,
          vendorItemsTotal: o.vendorItemsTotal || vendorItemsTotal,
          isPartialOrder: o.isPartialOrder ?? !isSingleVendor,
          totalOrderItemsCount: totalItemsInOrder,
        };
      })
      .filter(Boolean);
  }, [fetchedVendorOrders, olderVendorOrders, ordersLoaded, contextOrders, isItemForThisVendor]);

  // Live status change: server first, then a 2.5s visible "moving" state before the tile relocates
  const changeStatus = async (orderId, newStatus) => {
    if (!orderId || !newStatus) return;
    const cleanId = String(orderId);
    setStatusTransition({ orderId: cleanId, targetStatus: newStatus });
    const startTime = Date.now();
    try {
      await updateOrderStatus(orderId, newStatus);
      const remaining = Math.max(0, 2500 - (Date.now() - startTime));
      if (remaining > 0) await new Promise((resolve) => setTimeout(resolve, remaining));

      optimisticStatusMapRef.current.set(orderId, { status: newStatus, timestamp: Date.now() });
      const apply = (list) => list.map((o) => (String(o.id) === cleanId ? { ...o, status: newStatus } : o));
      setFetchedVendorOrders((prev) => {
        const updated = apply(prev);
        try {
          localStorage.setItem(cacheKey(vendorId), JSON.stringify(updated));
        } catch {}
        return updated;
      });
      setOlderVendorOrders(apply);
    } catch (err) {
      console.warn("Status change error:", err);
      optimisticStatusMapRef.current.delete(orderId);
      showAlert({ title: "Couldn't update status", message: err.message || "Please try again.", type: "warning" });
    } finally {
      setStatusTransition(null);
    }
  };

  // Paginated totals come from the server summary; Math.max keeps just-updated orders visible
  const stats = useMemo(() => {
    const byStatus = (s) => vendorOrders.filter((o) => (o.status || "PENDING").toUpperCase() === s).length;
    const loadedRevenue = vendorOrders.reduce((sum, o) => {
      const st = (o.status || "").toUpperCase();
      return st === "DELIVERED" || st === "COMPLETED" ? sum + (Number(o.totalAmount || o.total || 0) || 0) : sum;
    }, 0);
    const loadedCompleted = byStatus("DELIVERED") + byStatus("COMPLETED") + byStatus("CANCELLED");
    const summary = ordersSummary?.revenueBasis === "delivered_vendor_items" ? ordersSummary : null;

    return {
      activeCount: vendorOrders.filter((o) => ACTIVE_STATUSES.includes((o.status || "").toUpperCase())).length,
      pendingCount: byStatus("PENDING"),
      totalRevenue: summary ? Math.max(summary.totalRevenue, loadedRevenue) : loadedRevenue,
      totalCount: summary ? Math.max(summary.totalOrders, vendorOrders.length) : vendorOrders.length,
      completedCount: summary
        ? Math.max((summary.byStatus?.DELIVERED || 0) + (summary.byStatus?.COMPLETED || 0) + (summary.byStatus?.CANCELLED || 0), loadedCompleted)
        : loadedCompleted,
    };
  }, [vendorOrders, ordersSummary]);

  return {
    vendorOrders,
    stats,
    hasMore,
    loadingMore,
    loadMore,
    changeStatus,
    statusTransition,
    updatingOrderId: statusTransition?.orderId || null,
    highlightedOrderId,
    triggerOrderHighlight,
    newOrderAlert,
    dismissNewOrderAlert: () => setNewOrderAlert(null),
  };
}
