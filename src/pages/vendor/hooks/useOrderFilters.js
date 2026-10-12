import { useState, useMemo, useEffect } from "react";
import { formatShortId } from "../../../utils/formatId";
import { customerKey, getOrderParty } from "../orderView";

const ACTIVE = ["PENDING", "PROCESSING", "OUT_FOR_DELIVERY"];
const COMPLETED = ["DELIVERED", "COMPLETED", "CANCELLED"];
const ACTIVE_PRIORITY = { PENDING: 1, PROCESSING: 2, OUT_FOR_DELIVERY: 3 };
const statusOf = (o) => (o.status || "PENDING").toUpperCase();

// Customer, phone, street, city, material — and the order ID, though it's no longer shown
const matchesSearch = (ord, q) => {
  const { name, phone, street, city } = getOrderParty(ord);
  const idRaw = String(ord.id || ord.orderNumber || "").toLowerCase();
  const idShort = formatShortId(ord.id || ord.orderNumber, "ORD").toLowerCase();
  const itemsMatch = Array.isArray(ord.items)
    ? ord.items.some((i) => (i.productName || i.name || "").toLowerCase().includes(q))
    : String(ord.items || "").toLowerCase().includes(q);
  return [name, phone, street, city].some((f) => f.toLowerCase().includes(q)) || idRaw.includes(q) || idShort.includes(q) || itemsMatch;
};

// Minute tick so relative times ("12m ago") stay fresh between syncs
export function useNow(intervalMs = 60000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

/** Orders page state: Active / Completed section, status chip (or repeat customers), search, pending-first sort. */
export default function useOrderFilters(vendorOrders, statusTransition) {
  const [sectionTab, setSectionTabState] = useState("ACTIVE");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [search, setSearch] = useState("");

  const customerOrderCounts = useMemo(() => {
    const counts = {};
    vendorOrders.forEach((o) => {
      const key = customerKey(o);
      if (key) counts[key] = (counts[key] || 0) + 1;
    });
    return counts;
  }, [vendorOrders]);

  const getCustomerStats = (ord) => {
    const key = customerKey(ord);
    const orderCount = key ? customerOrderCounts[key] || 1 : 1;
    return { orderCount, isRepeat: orderCount > 1 };
  };

  // An order mid-update stays in the section it's leaving until the move completes
  const inTransition = (o) => Boolean(statusTransition) && String(statusTransition.orderId) === String(o.id);
  const activeOrders = vendorOrders.filter((o) => (inTransition(o) && sectionTab === "ACTIVE") || ACTIVE.includes(statusOf(o)));
  const completedOrders = vendorOrders.filter((o) => (inTransition(o) && sectionTab === "COMPLETED") || COMPLETED.includes(statusOf(o)));

  const q = search.toLowerCase().trim();
  const filteredOrders = (sectionTab === "ACTIVE" ? activeOrders : completedOrders)
    .filter((ord) => {
      if (inTransition(ord)) return true;
      if (statusFilter === "REPEAT_BUYERS") {
        if (!getCustomerStats(ord).isRepeat) return false;
      } else if (statusFilter !== "ALL" && statusOf(ord) !== statusFilter) {
        return false;
      }
      return !q || matchesSearch(ord, q);
    })
    .sort((a, b) => {
      if (sectionTab === "ACTIVE") {
        const diff = (ACTIVE_PRIORITY[statusOf(a)] || 99) - (ACTIVE_PRIORITY[statusOf(b)] || 99);
        if (diff !== 0) return diff;
      }
      return new Date(b.createdAt || b.date || 0).getTime() - new Date(a.createdAt || a.date || 0).getTime();
    });

  return {
    sectionTab,
    setSectionTab: (tab) => {
      setSectionTabState(tab);
      setStatusFilter("ALL");
    },
    // Jump straight to a section (and optional status chip), e.g. from Overview
    showSection: (tab, status = "ALL") => {
      setSectionTabState(tab);
      setStatusFilter(status);
    },
    statusFilter,
    setStatusFilter,
    search,
    setSearch,
    // A highlighted order must not be hidden by a chip or search
    clearFilters: () => {
      setStatusFilter("ALL");
      setSearch("");
    },
    activeOrders,
    completedOrders,
    filteredOrders,
    getCustomerStats,
  };
}
