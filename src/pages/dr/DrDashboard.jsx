import { useState, useEffect, useMemo, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import { useAdmin } from "../../context/AdminContext";
import { useOrders } from "../../context/OrderContext";
import { useAlert } from "../../context/AlertContext";
import { API_BASE_URL } from "../../config/api";
import { authFetch } from "../../config/authFetch";
import { mergeOrderLists, ordersPageQuery, readOrdersPage } from "../../utils/orderPagination";
import DrShell from "./DrShell";
import DrOrdersTab from "./sections/DrOrdersTab";
import DrApprovalsTab from "./sections/DrApprovalsTab";
import DrVendorsTab from "./sections/DrVendorsTab";
import DrCatalogTab from "./sections/DrCatalogTab";
import DrReturnsTab from "./sections/DrReturnsTab";
import DrProfileTab from "./sections/DrProfileTab";
import DrModals from "./sections/DrModals";

const PRESET_IMAGES = [
  { label: "Cement Bag", url: "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=400&q=80" },
  { label: "Paint Bucket", url: "https://images.unsplash.com/photo-1562259949-e8e7689d7828?auto=format&fit=crop&w=400&q=80" },
  { label: "Steel Rebars", url: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=400&q=80" },
  { label: "Pipes & Plumbing", url: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=400&q=80" },
  { label: "Electrical / Wire", url: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=400&q=80" },
];

// Canonical district name resolver
const getCanonicalDistrict = (name) => {
  if (!name || typeof name !== "string") return "";
  const clean = name.toLowerCase().trim();
  if (["varanasi", "varnasi", "banaras", "kashi", "vns"].some((alias) => clean.includes(alias))) return "varanasi";
  if (["mirzapur", "mzp"].some((alias) => clean.includes(alias))) return "mirzapur";
  if (["prayagraj", "allahabad"].some((alias) => clean.includes(alias))) return "prayagraj";
  if (["jaunpur"].some((alias) => clean.includes(alias))) return "jaunpur";
  return clean;
};

// Helper to match region names with canonical alias support
const isSameDistrict = (nameA, nameB) => {
  if (!nameA || !nameB) return false;
  return getCanonicalDistrict(nameA) === getCanonicalDistrict(nameB);
};

// Deep equality comparator for live orders to prevent unnecessary re-renders & flickering
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

// Deep equality comparator for live vendors to prevent unnecessary re-renders & flickering
const areVendorsEqual = (listA, listB) => {
  if (listA === listB) return true;
  if (!listA && !listB) return true;
  if (!listA || !listB) return false;
  if (!Array.isArray(listA) || !Array.isArray(listB)) return false;
  if (listA.length !== listB.length) return false;
  for (let i = 0; i < listA.length; i++) {
    const a = listA[i];
    const b = listB[i];
    if (!a || !b) return false;
    if (a.id !== b.id || a.status !== b.status || a.shopName !== b.shopName || a.phone !== b.phone || a.regionId !== b.regionId) {
      return false;
    }
  }
  return true;
};

// Deep equality comparator for live products to prevent unnecessary re-renders & flickering
const areProductsEqual = (listA, listB) => {
  if (listA === listB) return true;
  if (!listA && !listB) return true;
  if (!listA || !listB) return false;
  if (!Array.isArray(listA) || !Array.isArray(listB)) return false;
  if (listA.length !== listB.length) return false;
  for (let i = 0; i < listA.length; i++) {
    const a = listA[i];
    const b = listB[i];
    if (!a || !b) return false;
    if (
      a.id !== b.id ||
      a.approvalStatus !== b.approvalStatus ||
      a.isActive !== b.isActive ||
      Number(a.price) !== Number(b.price) ||
      Number(a.stockQty) !== Number(b.stockQty)
    ) {
      return false;
    }
  }
  return true;
};

// District Representative (DR) Dashboard component — Ground Agent Portal
export default function DrDashboard() {
  const { user, logout } = useAuth();
  const { showAlert, showConfirm } = useAlert();
  const {
    drs = [],
    masterProducts = [],
    vendors = [],
    products = [],
    productsLoading,
    categories = [],
    regions = [],
    fetchCloudData,
    addVendor,
    updateVendor,
    removeVendor,
    addMasterProduct,
    updateMasterProduct,
    assignMasterProductToVendor,
    setVendorStatus,
    updateListingApprovalStatus,
    markRecentEdit,
  } = useAdmin();
  const { orders: contextOrders = [], updateOrderStatus } = useOrders() || {};

  const recentDrEditsRef = useRef(new Map());

  const markRecentDrEdit = (id, updates) => {
    if (!id || !updates) return;
    const key = String(id);
    const existing = recentDrEditsRef.current.get(key);
    recentDrEditsRef.current.set(key, {
      updates: { ...(existing?.updates || {}), ...updates },
      timestamp: Date.now(),
    });
    if (markRecentEdit) {
      markRecentEdit(id, updates);
    }
  };

  const getRecentDrEdit = (id) => {
    if (!id) return null;
    const entry = recentDrEditsRef.current.get(String(id));
    if (entry && Date.now() - entry.timestamp < 6000) {
      return entry.updates;
    }
    return null;
  };

  // Direct live orders state from DB with zero-flicker persistent cache
  const [directOrders, setDirectOrders] = useState(() => {
    try {
      const saved = localStorage.getItem("buildcity_dr_live_orders");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [];
  });

  // District orders are paginated (newest page + every open order; older pages on demand)
  const [directOrdersCursor, setDirectOrdersCursor] = useState(null);
  const [directHasMore, setDirectHasMore] = useState(false);
  const [loadingMoreDirect, setLoadingMoreDirect] = useState(false);
  const [districtSummary, setDistrictSummary] = useState(null);
  const olderDirectLoadedRef = useRef(false);
  const districtRegionParamRef = useRef("");

  // Direct live vendors state from DB with zero-flicker persistent cache
  const [directVendors, setDirectVendors] = useState(() => {
    try {
      const saved = localStorage.getItem("buildcity_dr_live_vendors");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [];
  });

  // Direct live products/listings state from DB with zero-flicker persistent cache
  const [directProducts, setDirectProducts] = useState(() => {
    try {
      const saved = localStorage.getItem("buildcity_dr_live_products");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [];
  });

  // Fetch live orders directly from DB endpoint (/api/v1/orders) with deep equality guard
  const fetchLiveOrdersDirect = async () => {
    const regionParam = districtRegionParamRef.current;
    const regionQuery = regionParam ? `&regionId=${encodeURIComponent(regionParam)}` : "";
    try {
      if (regionParam) {
        authFetch(`${API_BASE_URL}/api/v1/orders/summary?regionId=${encodeURIComponent(regionParam)}`)
          .then((r) => (r.ok ? r.json() : null))
          .then((summary) => {
            if (summary) setDistrictSummary(summary);
          })
          .catch(() => {});
      }

      const res = await authFetch(`${API_BASE_URL}/api/v1/orders${ordersPageQuery(null, regionQuery)}`);
      if (res.ok) {
        const page = readOrdersPage(await res.json());
        const keepOlderPages = olderDirectLoadedRef.current;
        setDirectOrders((prev) => {
          const next = keepOlderPages ? mergeOrderLists(page.orders, prev) : page.orders;
          if (areOrdersEqual(prev, next)) return prev;
          try {
            localStorage.setItem("buildcity_dr_live_orders", JSON.stringify(next));
          } catch {}
          return next;
        });
        if (!keepOlderPages) {
          setDirectOrdersCursor(page.nextCursor);
          setDirectHasMore(page.hasMore);
        }
      }
    } catch (err) {
      console.warn("Live direct orders sync note:", err.message);
    }
  };

  // Appends the next (older) page of district orders
  const loadMoreDistrictOrders = async () => {
    if (!directOrdersCursor || loadingMoreDirect) return;
    const regionParam = districtRegionParamRef.current;
    const regionQuery = regionParam ? `&regionId=${encodeURIComponent(regionParam)}` : "";
    setLoadingMoreDirect(true);
    try {
      const res = await authFetch(`${API_BASE_URL}/api/v1/orders${ordersPageQuery(directOrdersCursor, regionQuery)}`);
      if (!res.ok) return;
      const page = readOrdersPage(await res.json());
      olderDirectLoadedRef.current = true;
      setDirectOrders((prev) => mergeOrderLists(prev, page.orders));
      setDirectOrdersCursor(page.nextCursor);
      setDirectHasMore(page.hasMore);
    } catch (err) {
      console.warn("Load more district orders note:", err.message);
    } finally {
      setLoadingMoreDirect(false);
    }
  };

  // Fetch live vendors directly from DB endpoint (/api/v1/vendors) with deep equality guard
  const fetchLiveVendorsDirect = async () => {
    try {
      const res = await authFetch(`${API_BASE_URL}/api/v1/vendors`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          const merged = data.map((v) => {
            const recent = getRecentDrEdit(v.id);
            if (recent) return { ...v, ...recent };
            return v;
          });
          setDirectVendors((prev) => {
            if (areVendorsEqual(prev, merged)) return prev;
            try {
              localStorage.setItem("buildcity_dr_live_vendors", JSON.stringify(merged));
            } catch {}
            return merged;
          });
        }
      }
    } catch (err) {
      console.warn("Live direct vendors sync note:", err.message);
    }
  };

  // Fetch live vendor products/listings directly from DB endpoint (/api/v1/vendor/listings) with deep equality guard
  const fetchLiveProductsDirect = async () => {
    try {
      const res = await authFetch(`${API_BASE_URL}/api/v1/vendor/listings?mine=1`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          const formatted = data.map((l) => {
            const isVendorSuspended = l.vendor?.status === "SUSPENDED";
            const resolvedRegionName = l.regionName || l.districtName || l.vendor?.region?.name || "Mirzapur";
            const resolvedRegionId = l.regionId || l.vendor?.regionId || l.vendor?.region?.id || "mirzapur";
            const isListingApproved = l.approvalStatus === "APPROVED" || !l.approvalStatus || l.approvalStatus === "";

            let item = {
              id: l.id,
              masterProductId: l.masterProductId,
              name: l.name || l.masterProduct?.name || "Product",
              categoryId: l.categoryId || l.masterProduct?.categoryId,
              categoryName: l.categoryName || l.masterProduct?.category?.name || "Material",
              brand: l.brand || l.masterProduct?.brand || "Generic",
              type: l.type || l.masterProduct?.type || "Standard",
              grade: l.grade || l.masterProduct?.grade || "Standard Grade",
              unit: l.unit || l.masterProduct?.unit || "Unit",
              vendorId: l.vendorId,
              vendorName: l.vendor?.shopName || l.vendorName || "District Vendor",
              regionId: resolvedRegionId,
              regionName: resolvedRegionName,
              districtName: resolvedRegionName,
              mrp: Number(l.mrp || l.masterProduct?.suggestedPrice || Math.round((Number(l.price) || 100) * 1.2)),
              price: Number(l.price) || 100,
              stockQty: Number(l.stockQty) || 100,
              imageUrl:
                l.imageUrl ||
                l.masterProduct?.imageUrl ||
                "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=500&q=80",
              approvalStatus: l.approvalStatus || "APPROVED",
              isActive: isListingApproved && l.isActive !== false && !isVendorSuspended,
              isVendorSuspended: Boolean(isVendorSuspended),
              addedBy: l.addedBy || "Vendor",
            };
            const recent = getRecentDrEdit(l.id) || (l.masterProductId ? getRecentDrEdit(l.masterProductId) : null);
            if (recent) item = { ...item, ...recent };
            return item;
          });

          setDirectProducts((prev) => {
            if (areProductsEqual(prev, formatted)) return prev;
            try {
              localStorage.setItem("buildcity_dr_live_products", JSON.stringify(formatted));
            } catch {}
            return formatted;
          });
        }
      }
    } catch (err) {
      console.warn("Live direct products sync note:", err.message);
    }
  };

  // Smart Real-time Sync for DR Dashboard
  useEffect(() => {
    if (!districtRegionParamRef.current) fetchLiveOrdersDirect();
    fetchLiveVendorsDirect();
    fetchLiveProductsDirect();

    const interval = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        fetchLiveOrdersDirect();
        fetchLiveVendorsDirect();
        fetchLiveProductsDirect();
      }
    }, 300000);

    const handleFocus = () => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        fetchLiveOrdersDirect();
        fetchLiveVendorsDirect();
        fetchLiveProductsDirect();
        if (fetchCloudData) fetchCloudData();
      }
    };

    const handleOrdersUpdated = () => fetchLiveOrdersDirect();
    const handleVendorsUpdated = () => fetchLiveVendorsDirect();
    const handleProductsUpdated = () => fetchLiveProductsDirect();

    window.addEventListener("focus", handleFocus);
    window.addEventListener("visibilitychange", handleFocus);
    window.addEventListener("buildcity_orders_updated", handleOrdersUpdated);
    window.addEventListener("buildcity_order_placed", handleOrdersUpdated);
    window.addEventListener("buildcity_vendors_updated", handleVendorsUpdated);
    window.addEventListener("buildcity_products_updated", handleProductsUpdated);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("visibilitychange", handleFocus);
      window.removeEventListener("buildcity_orders_updated", handleOrdersUpdated);
      window.removeEventListener("buildcity_order_placed", handleOrdersUpdated);
      window.removeEventListener("buildcity_vendors_updated", handleVendorsUpdated);
      window.removeEventListener("buildcity_products_updated", handleProductsUpdated);
    };
  }, []);

  // Stable, zero-flicker live orders list
  const orders = useMemo(() => {
    if (Array.isArray(directOrders) && directOrders.length > 0) {
      if (Array.isArray(contextOrders) && contextOrders.length > 0) {
        const directIds = new Set(directOrders.map((o) => o.id));
        const unsynced = contextOrders.filter((co) => co && co.id && !directIds.has(co.id));
        if (unsynced.length > 0) {
          return [...unsynced, ...directOrders];
        }
      }
      return directOrders;
    }
    if (Array.isArray(contextOrders) && contextOrders.length > 0) {
      return contextOrders;
    }
    return [];
  }, [directOrders, contextOrders]);

  // Live vendors list
  const allVendors = useMemo(() => {
    if (Array.isArray(directVendors) && directVendors.length > 0) {
      return directVendors;
    }
    return vendors || [];
  }, [directVendors, vendors]);

  // Live products list
  const allProducts = useMemo(() => {
    if (Array.isArray(directProducts) && directProducts.length > 0) {
      return directProducts;
    }
    return products || [];
  }, [directProducts, products]);

  // Navigation Tabs with Android Back Button History
  const [activeTab, setActiveTabState] = useState("orders");
  const [tabHistory, setTabHistory] = useState(["orders"]);
  const setActiveTab = (tab) => {
    if (tab === activeTab) return;
    setActiveTabState(tab);
    setTabHistory((prev) => [...prev, tab]);
  };
  const [searchTerm, setSearchTerm] = useState("");
  const [listingFilter, setListingFilter] = useState("ALL");
  const [orderStatusFilter, setOrderStatusFilter] = useState("ALL");

  // --- Return & Refund Desk State (DR Only) ---
  const [returnSearchQuery, setReturnSearchQuery] = useState("");
  const [returnSearchResults, setReturnSearchResults] = useState([]);
  const [selectedReturnOrder, setSelectedReturnOrder] = useState(null);
  const [returnSearchMessage, setReturnSearchMessage] = useState("");
  const [returnQuantities, setReturnQuantities] = useState({});
  const [returnReason, setReturnReason] = useState("Excess unused material leftover");
  const [customCashbackDeduct, setCustomCashbackDeduct] = useState("");
  const [isSearchingReturnOrder, setIsSearchingReturnOrder] = useState(false);
  const [isSubmittingReturn, setIsSubmittingReturn] = useState(false);
  const [processedReturns, setProcessedReturns] = useState(() => {
    try {
      const saved = localStorage.getItem("buildcity_dr_processed_returns");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [loadingReturnsHistory, setLoadingReturnsHistory] = useState(false);

  const fetchProcessedReturns = async () => {
    setLoadingReturnsHistory(true);
    try {
      const res = await authFetch(`${API_BASE_URL}/api/v1/returns`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setProcessedReturns(data);
          try {
            localStorage.setItem("buildcity_dr_processed_returns", JSON.stringify(data.slice(0, 50)));
          } catch {}
        }
      }
    } catch (err) {
      console.warn("Fetch returns history note:", err.message);
    } finally {
      setLoadingReturnsHistory(false);
    }
  };

  const selectOrderForReturn = (ord) => {
    setSelectedReturnOrder(ord);
    const initialQtys = {};
    (ord?.items || []).forEach((it) => {
      const key = it.id || it.vendorProductId || it.productName;
      initialQtys[key] = 0;
    });
    setReturnQuantities(initialQtys);
    const defaultCb = Math.round(
      ord?.remainingCashbackToDeduct !== undefined
        ? Number(ord.remainingCashbackToDeduct || 0)
        : Number(ord?.cashbackEarned || 0)
    );
    setCustomCashbackDeduct(defaultCb > 0 ? String(defaultCb) : "0");
  };

  const searchOrderByIdForReturn = async (queryText = "") => {
    const q = String(queryText || "").trim();
    if (!q) {
      setReturnSearchResults([]);
      setSelectedReturnOrder(null);
      setReturnSearchMessage("Please enter a Customer Mobile Number or Order ID.");
      return;
    }

    setIsSearchingReturnOrder(true);
    setReturnSearchMessage("");
    try {
      const res = await authFetch(`${API_BASE_URL}/api/v1/returns/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (!res.ok) {
        setReturnSearchResults([]);
        setSelectedReturnOrder(null);
        setReturnSearchMessage(data?.error || "Search failed.");
        return;
      }

      const matchedOrders = Array.isArray(data) ? data : [];
      if (matchedOrders.length === 0) {
        setReturnSearchResults([]);
        setSelectedReturnOrder(null);
        setReturnSearchMessage("No orders found matching this Mobile Number or Order ID.");
        return;
      }

      const deliveredList = matchedOrders.filter((o) => {
        const st = String(o.status || "").toUpperCase();
        return st === "DELIVERED" || st === "COMPLETED";
      });

      if (deliveredList.length === 0) {
        setReturnSearchResults([]);
        setSelectedReturnOrder(null);
        setReturnSearchMessage("Orders found, but none are in DELIVERED or COMPLETED status.");
        return;
      }

      setReturnSearchMessage("");
      setReturnSearchResults(deliveredList);
      if (deliveredList.length === 1) {
        selectOrderForReturn(deliveredList[0]);
      } else {
        setSelectedReturnOrder(null);
      }
    } catch {
      setReturnSearchMessage("Unable to search order right now.");
    } finally {
      setIsSearchingReturnOrder(false);
    }
  };

  useEffect(() => {
    fetchProcessedReturns();
  }, []);

  useEffect(() => {
    if (activeTab === "returns") {
      fetchProcessedReturns();
    }
  }, [activeTab]);

  const handleSearchReturnOrder = async (e) => {
    if (e) e.preventDefault();
    await searchOrderByIdForReturn(returnSearchQuery);
  };

  const handleReturnQtyChange = (itemKey, newVal, maxQty) => {
    const clean = Math.min(maxQty, Math.max(0, Math.floor(Number(newVal) || 0)));
    setReturnQuantities((prev) => ({ ...prev, [itemKey]: clean }));
  };

  const handleProcessReturn = async () => {
    if (!selectedReturnOrder) return;
    const itemsPayload = (selectedReturnOrder.items || [])
      .map((it) => {
        const key = it.id || it.vendorProductId || it.productName;
        const qty = Number(returnQuantities[key] || 0);
        return {
          itemId: it.id,
          vendorProductId: it.vendorProductId,
          productName: it.productName || it.name,
          returnQty: qty,
        };
      })
      .filter((x) => x.returnQty > 0);

    if (itemsPayload.length === 0) {
      showAlert("Please select a return quantity of at least 1 item using the + button.", "Select Return Quantity", "warning");
      return;
    }

    setIsSubmittingReturn(true);
    try {
      const res = await authFetch(`${API_BASE_URL}/api/v1/returns`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: selectedReturnOrder.id,
          items: itemsPayload,
          returnReason,
          districtName,
          customCashbackDeduct: customCashbackDeduct !== "" ? Number(customCashbackDeduct) : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showAlert(data?.error || "Failed to process return.", "Return Error", "error");
        return;
      }

      const walletCredited = Number(data.summary?.walletToCredit || 0);
      const walletSettled = Number(data.summary?.totalWalletSettled || 0);
      const walletNote =
        walletCredited > 0
          ? ` Wallet Credited: +₹${walletCredited.toLocaleString("en-IN")} (Total Wallet Settled: ₹${walletSettled.toLocaleString("en-IN")}).`
          : "";

      showAlert(
        `Return recorded successfully. Net Cash to refund customer: ₹${Number(data.summary?.netRefundCash || 0).toLocaleString("en-IN")}.${walletNote} Vendor stock has been restored.`,
        "Return Completed",
        "success"
      );

      await fetchProcessedReturns();
      fetchLiveProductsDirect();
      fetchLiveOrdersDirect();
      await searchOrderByIdForReturn(returnSearchQuery);
    } catch {
      showAlert("Network error while filing return.", "Error", "error");
    } finally {
      setIsSubmittingReturn(false);
    }
  };

  // Modals state
  const [showVendorModal, setShowVendorModal] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingVendor, setEditingVendor] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);

  // Android Back Button & Modal Scroll Lock (Vendor Dashboard style)
  useEffect(() => {
    window.__buildcity_vendor_back_handler = () => {
      if (showVendorModal) {
        setShowVendorModal(false);
        return true;
      }
      if (showProductModal) {
        setShowProductModal(false);
        return true;
      }
      if (editingVendor) {
        setEditingVendor(null);
        return true;
      }
      if (editingProduct) {
        setEditingProduct(null);
        return true;
      }
      if (tabHistory.length > 1) {
        const updated = tabHistory.slice(0, -1);
        setTabHistory(updated);
        setActiveTabState(updated[updated.length - 1]);
        return true;
      }
      return false;
    };
    return () => {
      window.__buildcity_vendor_back_handler = null;
    };
  });

  useEffect(() => {
    const anySheetOpen = showVendorModal || showProductModal || Boolean(editingVendor) || Boolean(editingProduct);
    if (!anySheetOpen) return;
    const origOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = origOverflow;
    };
  }, [showVendorModal, showProductModal, editingVendor, editingProduct]);

  const editingImages = useMemo(() => {
    if (!editingProduct) return ["", "", ""];
    const list =
      Array.isArray(editingProduct.images) && editingProduct.images.length > 0
        ? editingProduct.images.filter(Boolean)
        : (editingProduct.imageUrl || "")
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
    return [
      editingProduct.img1 !== undefined ? editingProduct.img1 : list[0] || "",
      editingProduct.img2 !== undefined ? editingProduct.img2 : list[1] || "",
      editingProduct.img3 !== undefined ? editingProduct.img3 : list[2] || "",
    ];
  }, [editingProduct]);

  const handleEditImageSlotChange = (slotIdx, val) => {
    if (!editingProduct) return;
    const nextSlots = [...editingImages];
    nextSlots[slotIdx] = val;
    const validList = nextSlots.map((s) => (s || "").trim()).filter(Boolean);
    setEditingProduct({
      ...editingProduct,
      img1: nextSlots[0],
      img2: nextSlots[1],
      img3: nextSlots[2],
      imageUrl: validList.join(", "),
      images: validList,
    });
  };

  // Forms
  const [vendorForm, setVendorForm] = useState({
    shopName: "",
    ownerName: "",
    phone: "",
    password: "",
    status: "APPROVED",
    commissionRate: 10,
  });

  const [productForm, setProductForm] = useState({
    name: "",
    categoryId: "",
    brand: "",
    type: "",
    grade: "",
    unit: "50kg Bag",
    price: "",
    stockQty: "",
    vendorId: "",
    imageUrl: PRESET_IMAGES[0].url,
    description: "",
  });

  // Find current logged-in DR info dynamically
  const currentDr =
    (drs || []).find((d) => {
      if (!d) return false;
      const userPhoneClean = user?.phone ? String(user.phone).replace(/\D/g, "") : "";
      const dPhoneClean = d.phone ? String(d.phone).replace(/\D/g, "") : "";
      return (
        (userPhoneClean && dPhoneClean && dPhoneClean.slice(-10) === userPhoneClean.slice(-10)) ||
        d.userId === user?.id ||
        d.id === user?.id ||
        d.id === user?.drInfo?.id ||
        (d.userId && user?.drInfo?.userId && d.userId === user.drInfo.userId)
      );
    }) ||
    user?.drInfo ||
    {};

  const rawDrRegionId =
    currentDr?.regionId ||
    currentDr?.region?.id ||
    user?.drInfo?.regionId ||
    user?.drInfo?.region?.id ||
    user?.regionId ||
    user?.preferredRegionId ||
    "";
  const rawDrRegionName =
    currentDr?.region?.name ||
    currentDr?.regionName ||
    user?.drInfo?.region?.name ||
    user?.drInfo?.regionName ||
    user?.regionName ||
    user?.preferredRegionName ||
    "";

  const drRegion = (regions || []).find(
    (r) =>
      (rawDrRegionId && (r.id === rawDrRegionId || String(r.id).toLowerCase() === String(rawDrRegionId).toLowerCase())) ||
      (rawDrRegionName && isSameDistrict(r.name, rawDrRegionName))
  );

  const districtName = drRegion?.name || rawDrRegionName || regions[0]?.name || "Varanasi";
  const drRegionId =
    drRegion?.id || rawDrRegionId || regions.find((r) => isSameDistrict(r.name, districtName))?.id || "";

  // DR Assigned Region Vendors Filter (STRICT JURISDICTION LOCK)
  const districtVendors = useMemo(() => {
    return (allVendors || []).filter((v) => {
      if (!v) return false;
      const vRegId = v.regionId || v.region?.id;
      const vRegName = v.region?.name || v.regionName || v.districtName || "";
      if (drRegionId && vRegId && String(vRegId).toLowerCase() === String(drRegionId).toLowerCase()) {
        return true;
      }
      if (districtName && vRegName && isSameDistrict(districtName, vRegName)) {
        return true;
      }
      return false;
    });
  }, [allVendors, drRegionId, districtName]);

  // DR Assigned Region Products Filter (STRICT JURISDICTION LOCK)
  const districtProducts = useMemo(() => {
    return (allProducts || []).filter((p) => {
      if (!p) return false;
      const pRegId = p.regionId || p.vendor?.regionId || p.vendor?.region?.id;
      const pRegName = p.vendor?.region?.name || p.regionName || p.districtName || "";
      if (drRegionId && pRegId && String(pRegId).toLowerCase() === String(drRegionId).toLowerCase()) {
        return true;
      }
      if (districtName && pRegName && isSameDistrict(districtName, pRegName)) {
        return true;
      }
      return districtVendors.some(
        (v) =>
          (v?.id && p.vendorId && String(v.id).toLowerCase() === String(p.vendorId).toLowerCase()) ||
          (v?.shopName && p.vendorName && v.shopName.toLowerCase().trim() === p.vendorName.toLowerCase().trim())
      );
    });
  }, [allProducts, drRegionId, districtName, districtVendors]);

  // Resolve single definitive district for each order
  const getOrderDistrict = (o) => {
    if (!o) return "Varanasi";
    if (o.address?.region?.name) {
      const r = getCanonicalDistrict(o.address.region.name);
      if (r === "mirzapur") return "Mirzapur";
      if (r === "prayagraj") return "Prayagraj";
      if (r === "jaunpur") return "Jaunpur";
      if (r === "varanasi") return "Varanasi";
    }
    if (o.address?.regionId) {
      const matched = (regions || []).find((r) => r.id === o.address.regionId);
      if (matched?.name) {
        const r = getCanonicalDistrict(matched.name);
        if (r === "mirzapur") return "Mirzapur";
        if (r === "prayagraj") return "Prayagraj";
        if (r === "jaunpur") return "Jaunpur";
        if (r === "varanasi") return "Varanasi";
      }
    }
    if (Array.isArray(o.items) && o.items.length > 0) {
      for (const it of o.items) {
        const vReg = it?.vendor?.region?.name || it?.vendorRegion || it?.regionName;
        if (vReg) {
          const vr = getCanonicalDistrict(vReg);
          if (vr === "mirzapur") return "Mirzapur";
          if (vr === "prayagraj") return "Prayagraj";
          if (vr === "jaunpur") return "Jaunpur";
          if (vr === "varanasi") return "Varanasi";
        }
      }
    }
    if (o.region?.name) {
      const r = getCanonicalDistrict(o.region.name);
      if (r === "mirzapur") return "Mirzapur";
      if (r === "prayagraj") return "Prayagraj";
      if (r === "jaunpur") return "Jaunpur";
      if (r === "varanasi") return "Varanasi";
    }
    if (o.districtName) {
      const d = getCanonicalDistrict(o.districtName);
      if (d === "mirzapur") return "Mirzapur";
      if (d === "prayagraj") return "Prayagraj";
      if (d === "jaunpur") return "Jaunpur";
      if (d === "varanasi") return "Varanasi";
    }
    if (o.regionName) {
      const r = getCanonicalDistrict(o.regionName);
      if (r === "mirzapur") return "Mirzapur";
      if (r === "prayagraj") return "Prayagraj";
      if (r === "jaunpur") return "Jaunpur";
      if (r === "varanasi") return "Varanasi";
    }
    if (o.address?.city) {
      const c = getCanonicalDistrict(o.address.city);
      if (c === "mirzapur") return "Mirzapur";
      if (c === "prayagraj") return "Prayagraj";
      if (c === "jaunpur") return "Jaunpur";
      if (c === "varanasi") return "Varanasi";
    }
    return "Varanasi";
  };

  const currentDrCanonical = getCanonicalDistrict(districtName);

  const districtRegionParam = useMemo(() => {
    const ids = (regions || [])
      .filter((r) => r?.id && getCanonicalDistrict(r.name) === currentDrCanonical)
      .map((r) => r.id);
    if (ids.length === 0 && drRegionId) ids.push(drRegionId);
    return ids.sort().join(",");
  }, [regions, currentDrCanonical, drRegionId]);
  districtRegionParamRef.current = districtRegionParam;

  useEffect(() => {
    if (!districtRegionParam) return;
    olderDirectLoadedRef.current = false;
    fetchLiveOrdersDirect();
  }, [districtRegionParam]);

  const districtOrders = useMemo(() => {
    return (orders || []).filter((o) => {
      if (!o) return false;
      const ordDist = getOrderDistrict(o);
      return getCanonicalDistrict(ordDist) === currentDrCanonical;
    });
  }, [orders, currentDrCanonical, regions]);

  const districtOrdersCount = districtSummary ? districtSummary.totalOrders : districtOrders.length;

  const filteredDistrictOrders = useMemo(() => {
    const statusPriority = (st) => {
      const upper = String(st || "PENDING").toUpperCase();
      if (upper === "PENDING") return 1;
      if (upper === "PROCESSING" || upper === "CONFIRMED") return 2;
      if (upper === "OUT_FOR_DELIVERY") return 3;
      return 4;
    };

    const filtered = districtOrders.filter((ord) => {
      if (!ord) return false;
      const matchesSearch =
        !searchTerm ||
        (ord.id && String(ord.id).toLowerCase().includes(searchTerm.toLowerCase())) ||
        (ord.orderNumber && String(ord.orderNumber).toLowerCase().includes(searchTerm.toLowerCase())) ||
        (ord.customer?.name && String(ord.customer.name).toLowerCase().includes(searchTerm.toLowerCase())) ||
        (ord.customer?.phone && String(ord.customer.phone).includes(searchTerm)) ||
        (Array.isArray(ord.items) &&
          ord.items.some((i) => (i?.productName || i?.name || "").toLowerCase().includes(searchTerm.toLowerCase())));

      const ordStatus = (ord.status || "PENDING").toUpperCase();
      const isActiveOrder =
        ordStatus !== "DELIVERED" && ordStatus !== "COMPLETED" && ordStatus !== "CANCELLED";
      const matchesStatus =
        orderStatusFilter === "ALL" ? isActiveOrder : ordStatus === orderStatusFilter;

      return matchesSearch && matchesStatus;
    });

    if (orderStatusFilter === "ALL") {
      return [...filtered].sort((a, b) => {
        const prioDiff = statusPriority(a?.status) - statusPriority(b?.status);
        if (prioDiff !== 0) return prioDiff;
        const timeA = a?.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b?.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeB - timeA;
      });
    }

    return filtered;
  }, [districtOrders, searchTerm, orderStatusFilter]);

  const filteredVendors = useMemo(() => {
    return districtVendors.filter(
      (v) =>
        !searchTerm ||
        (v?.shopName && v.shopName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (v?.ownerName && v.ownerName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (v?.phone && String(v.phone).includes(searchTerm))
    );
  }, [districtVendors, searchTerm]);

  const filteredProducts = useMemo(() => {
    return districtProducts.filter((p) => {
      if (!p) return false;
      const matchesSearch =
        !searchTerm ||
        (p?.name && p.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (p?.brand && p.brand.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (p?.categoryName && p.categoryName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (p?.vendorName && p.vendorName.toLowerCase().includes(searchTerm.toLowerCase()));

      const st = p.approvalStatus || (p.isActive ? "APPROVED" : "PENDING_REVIEW");
      const matchesStatus = listingFilter === "ALL" ? true : st === listingFilter;

      return matchesSearch && matchesStatus;
    });
  }, [districtProducts, searchTerm, listingFilter]);

  // KPI Summary Stats for DrShell
  const stats = useMemo(() => {
    const deliveredRevenue = districtSummary?.deliveredRevenue !== undefined
      ? Number(districtSummary.deliveredRevenue || 0)
      : districtOrders.reduce((sum, o) => {
          const st = String(o?.status || "").toUpperCase();
          if (st === "DELIVERED" || st === "COMPLETED") {
            return sum + Number(o.totalAmount || o.total || 0);
          }
          return sum;
        }, 0);

    const activeOrdersCount = districtOrders.filter((o) => {
      const st = String(o?.status || "PENDING").toUpperCase();
      return st !== "DELIVERED" && st !== "COMPLETED" && st !== "CANCELLED";
    }).length;

    const approvedVendorsCount = districtVendors.filter(
      (v) => String(v?.status || "APPROVED").toUpperCase() === "APPROVED"
    ).length;

    const pendingApprovalsCount = districtProducts.filter(
      (p) => (p.approvalStatus || (p.isActive ? "APPROVED" : "PENDING_REVIEW")) === "PENDING_REVIEW"
    ).length;

    return {
      districtRevenue: deliveredRevenue,
      totalOrdersCount: districtOrdersCount,
      activeOrdersCount,
      totalVendorsCount: districtVendors.length,
      approvedVendorsCount,
      totalProductsCount: districtProducts.length,
      pendingApprovalsCount,
      returnsCount: processedReturns.length,
    };
  }, [districtSummary, districtOrders, districtOrdersCount, districtVendors, districtProducts, processedReturns.length]);

  const [isSubmittingVendor, setIsSubmittingVendor] = useState(false);
  const [isSubmittingEditVendor, setIsSubmittingEditVendor] = useState(false);
  const [isSubmittingProduct, setIsSubmittingProduct] = useState(false);
  const [deletingVendorId, setDeletingVendorId] = useState(null);
  const [updatingVendorStatus, setUpdatingVendorStatus] = useState(null);
  const [busyListingAction, setBusyListingAction] = useState(null);

  const handleListingAction = async (listingId, nextStatus) => {
    if (busyListingAction) return;
    const isApproved = nextStatus === "APPROVED";
    setBusyListingAction({ id: listingId, action: nextStatus });
    markRecentDrEdit(listingId, { approvalStatus: nextStatus, isActive: isApproved });
    setDirectProducts((prev) =>
      prev.map((item) => (item.id === listingId ? { ...item, approvalStatus: nextStatus, isActive: isApproved } : item))
    );
    try {
      await updateListingApprovalStatus(listingId, nextStatus);
      await fetchLiveProductsDirect();
      window.dispatchEvent(new CustomEvent("buildcity_products_updated"));
    } finally {
      setBusyListingAction(null);
    }
  };

  const handleToggleVendorStatus = async (vendorId, nextStatus) => {
    if (updatingVendorStatus) return;
    markRecentDrEdit(vendorId, { status: nextStatus });
    setUpdatingVendorStatus({ id: vendorId, action: nextStatus });
    try {
      setDirectVendors((prev) => prev.map((v) => (v.id === vendorId ? { ...v, status: nextStatus } : v)));
      await setVendorStatus(vendorId, nextStatus);
      await fetchLiveVendorsDirect();
      window.dispatchEvent(new CustomEvent("buildcity_vendors_updated"));
    } finally {
      setUpdatingVendorStatus(null);
    }
  };

  const handleDeleteVendor = async (v) => {
    showConfirm({
      title: "Delete Vendor Partner?",
      message: `Are you sure you want to permanently delete vendor "${v.shopName}" from Database?`,
      type: "error",
      confirmText: "Delete Vendor",
      onConfirm: async () => {
        setDeletingVendorId(v.id);
        try {
          await removeVendor(v.id);
          setDirectVendors((prev) => prev.filter((item) => item.id !== v.id));
          await fetchLiveVendorsDirect();
          window.dispatchEvent(new CustomEvent("buildcity_vendors_updated"));
          showAlert({ title: "Vendor Deleted", message: `Vendor "${v.shopName}" removed successfully from database.`, type: "success" });
        } catch (err) {
          await fetchLiveVendorsDirect();
          showAlert({
            title: "Delete Failed",
            message: err.message || "Failed to delete vendor from database. Try suspending instead.",
            type: "error",
          });
        } finally {
          setDeletingVendorId(null);
        }
      },
    });
  };

  const handleCreateVendor = async (e) => {
    e.preventDefault();
    if (!vendorForm.shopName.trim() || !vendorForm.ownerName.trim() || !vendorForm.phone.trim()) {
      showAlert({ title: "Validation Error", message: "Please fill all required vendor details!", type: "warning" });
      return;
    }
    if (isSubmittingVendor) return;

    setIsSubmittingVendor(true);
    try {
      const matchedReg = (regions || []).find((r) => r.name?.toLowerCase() === districtName.toLowerCase() || r.id === drRegionId);
      const targetRegionId = matchedReg ? matchedReg.id : drRegionId || "r2";
      const targetRegionName = matchedReg ? matchedReg.name : districtName || "Mirzapur";

      const created = await addVendor({
        shopName: vendorForm.shopName.trim(),
        ownerName: vendorForm.ownerName.trim(),
        phone: vendorForm.phone.trim(),
        password: vendorForm.password.trim() || "vendor123",
        regionId: targetRegionId,
        regionName: targetRegionName,
        districtName: targetRegionName,
        status: vendorForm.status || "APPROVED",
        commissionRate: Number(vendorForm.commissionRate) || 10,
        addedByDr: `${user?.name || "DR"} (${targetRegionName})`,
        drId: currentDr.id,
      });

      if (created) {
        setDirectVendors((prev) => [created, ...prev.filter((v) => v.id !== created.id)]);
      }
      await fetchLiveVendorsDirect();
      window.dispatchEvent(new CustomEvent("buildcity_vendors_updated"));

      setVendorForm({ shopName: "", ownerName: "", phone: "", password: "", status: "APPROVED", commissionRate: 10 });
      setShowVendorModal(false);
      showAlert({
        title: "Vendor Added",
        message: `Vendor "${vendorForm.shopName.trim()}" successfully added to Supabase Cloud Database!`,
        type: "success",
      });
    } catch (err) {
      showAlert({ title: "Error", message: "Failed to add vendor: " + err.message, type: "error" });
    } finally {
      setIsSubmittingVendor(false);
    }
  };

  const handleUpdateVendorSubmit = async (e) => {
    e.preventDefault();
    if (!editingVendor) return;
    setIsSubmittingEditVendor(true);
    const vendorToSave = { ...editingVendor };
    markRecentDrEdit(vendorToSave.id, vendorToSave);
    setDirectVendors((prev) => prev.map((v) => (v.id === vendorToSave.id ? { ...v, ...vendorToSave } : v)));
    setEditingVendor(null);
    setIsSubmittingEditVendor(false);
    showAlert({
      title: "Vendor Updated",
      message: `Vendor "${vendorToSave.shopName}" details & password updated successfully!`,
      type: "success",
    });

    try {
      await updateVendor(vendorToSave.id, vendorToSave);
      fetchLiveVendorsDirect();
      window.dispatchEvent(new CustomEvent("buildcity_vendors_updated"));
    } catch (err) {
      console.warn("Background update vendor note:", err.message);
    }
  };

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    if (!productForm.name.trim() || !productForm.categoryId) {
      showAlert({ title: "Validation Error", message: "Please select Category and enter Product Name!", type: "warning" });
      return;
    }
    if (isSubmittingProduct) return;

    setIsSubmittingProduct(true);
    try {
      const createdMp = await addMasterProduct({
        name: productForm.name.trim(),
        categoryId: productForm.categoryId,
        brand: productForm.brand.trim() || "Generic",
        type: productForm.type.trim() || "Standard",
        grade: productForm.grade.trim() || "Standard Grade",
        unit: productForm.unit.trim() || "Piece",
        suggestedPrice: Number(productForm.price) || 100,
        price: Number(productForm.price) || 100,
        imageUrl: productForm.imageUrl || PRESET_IMAGES[0].url,
        description: productForm.description?.trim() || null,
        addedBy: `DR: ${user?.name || "DR"} (${districtName})`,
      });

      const targetVendorId = productForm.vendorId || (districtVendors.length > 0 ? districtVendors[0].id : null);
      if (createdMp && targetVendorId) {
        await assignMasterProductToVendor({
          masterProductId: createdMp.id,
          vendorId: targetVendorId,
          regionId: drRegionId,
          regionName: districtName,
          districtName: districtName,
          price: Number(productForm.price) || 100,
          stockQty: Number(productForm.stockQty) || 100,
          description: productForm.description?.trim() || null,
          addedBy: `DR: ${user?.name || "DR"}`,
        }).catch(() => null);
      }

      setProductForm({
        name: "",
        categoryId: "",
        brand: "",
        type: "",
        grade: "",
        unit: "50kg Bag",
        price: "",
        stockQty: "",
        vendorId: "",
        imageUrl: PRESET_IMAGES[0].url,
        description: "",
      });
      await fetchLiveProductsDirect();
      window.dispatchEvent(new CustomEvent("buildcity_products_updated"));
      setShowProductModal(false);
      showAlert({
        title: "Product Added",
        message: `Product "${productForm.name.trim()}" added to Master Catalog & District Listings!`,
        type: "success",
      });
    } catch (err) {
      showAlert({ title: "Error", message: "Failed to add product: " + (err.message || err), type: "error" });
    } finally {
      setIsSubmittingProduct(false);
    }
  };

  const handleEditMasterProduct = (p) => {
    const defaultDesc = `High-quality certified ${p.name || "Product"} by ${p.brand || "Authorized Brand"}. Supplied directly via BuildCity Certified Delivery Network.`;
    setEditingProduct({
      ...p,
      description: p.description && p.description.trim() ? p.description : defaultDesc,
    });
  };

  const handleSaveEditedMasterProduct = (e) => {
    e.preventDefault();
    if (!editingProduct) return;
    const finalImgs = [
      editingProduct.img1 !== undefined ? editingProduct.img1 : editingImages[0],
      editingProduct.img2 !== undefined ? editingProduct.img2 : editingImages[1],
      editingProduct.img3 !== undefined ? editingProduct.img3 : editingImages[2],
    ]
      .map((s) => (s || "").trim())
      .filter(Boolean);
    const finalImageUrl = finalImgs.join(", ") || editingProduct.imageUrl || "";

    const prodToSave = {
      ...editingProduct,
      imageUrl: finalImageUrl,
      images: finalImgs,
      description: editingProduct.description !== undefined ? editingProduct.description?.trim() || null : undefined,
    };
    delete prodToSave.img1;
    delete prodToSave.img2;
    delete prodToSave.img3;

    setEditingProduct(null);
    updateMasterProduct(prodToSave.id || prodToSave.masterProductId, prodToSave);
    showAlert({ title: "Product Updated", message: `Product "${prodToSave.name}" updated successfully!`, type: "success" });
  };

  return (
    <DrShell
      drName={user?.name || currentDr?.name || "District Representative"}
      drPhone={user?.phone || currentDr?.phone || ""}
      districtName={districtName}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      stats={stats}
      onAddVendor={() => setShowVendorModal(true)}
      onAddProduct={() => setShowProductModal(true)}
      onOpenPendingApprovals={() => {
        setListingFilter(stats.pendingApprovalsCount > 0 ? "PENDING_REVIEW" : "ALL");
        setActiveTab("listings");
      }}
      onLogout={logout}
      modals={
        <DrModals
          districtName={districtName}
          categories={categories}
          presetImages={PRESET_IMAGES}
          showVendorModal={showVendorModal}
          setShowVendorModal={setShowVendorModal}
          vendorForm={vendorForm}
          setVendorForm={setVendorForm}
          isSubmittingVendor={isSubmittingVendor}
          handleCreateVendor={handleCreateVendor}
          showProductModal={showProductModal}
          setShowProductModal={setShowProductModal}
          productForm={productForm}
          setProductForm={setProductForm}
          isSubmittingProduct={isSubmittingProduct}
          handleCreateProduct={handleCreateProduct}
          editingVendor={editingVendor}
          setEditingVendor={setEditingVendor}
          isSubmittingEditVendor={isSubmittingEditVendor}
          handleUpdateVendorSubmit={handleUpdateVendorSubmit}
          editingProduct={editingProduct}
          setEditingProduct={setEditingProduct}
          editingImages={editingImages}
          handleEditImageSlotChange={handleEditImageSlotChange}
          onSaveEditedMasterProduct={handleSaveEditedMasterProduct}
        />
      }
    >
      {activeTab === "orders" && (
        <DrOrdersTab
          districtName={districtName}
          districtOrders={districtOrders}
          filteredDistrictOrders={filteredDistrictOrders}
          districtOrdersCount={districtOrdersCount}
          districtSummary={districtSummary}
          orderStatusFilter={orderStatusFilter}
          setOrderStatusFilter={setOrderStatusFilter}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          updateOrderStatus={updateOrderStatus}
          fetchLiveOrdersDirect={fetchLiveOrdersDirect}
          showConfirm={showConfirm}
          directHasMore={directHasMore}
          loadingMoreDirect={loadingMoreDirect}
          loadMoreDistrictOrders={loadMoreDistrictOrders}
        />
      )}

      {activeTab === "listings" && (
        <DrApprovalsTab
          districtName={districtName}
          districtProducts={districtProducts}
          filteredProducts={filteredProducts}
          listingFilter={listingFilter}
          setListingFilter={setListingFilter}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          busyListingAction={busyListingAction}
          onListingAction={handleListingAction}
        />
      )}

      {activeTab === "vendors" && (
        <DrVendorsTab
          districtName={districtName}
          filteredVendors={filteredVendors}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          onAddVendor={() => setShowVendorModal(true)}
          onEditVendor={(v) => setEditingVendor(v)}
          updatingVendorStatus={updatingVendorStatus}
          onToggleVendorStatus={handleToggleVendorStatus}
          deletingVendorId={deletingVendorId}
          onDeleteVendor={handleDeleteVendor}
        />
      )}

      {(activeTab === "products" || activeTab === "masterCatalog") && (
        <DrCatalogTab
          districtName={districtName}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          districtProducts={districtProducts}
          filteredProducts={filteredProducts}
          masterProducts={masterProducts}
          productsLoading={productsLoading}
          listingFilter={listingFilter}
          setListingFilter={setListingFilter}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          onAddProduct={() => setShowProductModal(true)}
          onEditMasterProduct={handleEditMasterProduct}
          busyListingAction={busyListingAction}
          onListingAction={handleListingAction}
        />
      )}

      {activeTab === "returns" && (
        <DrReturnsTab
          districtName={districtName}
          returnSearchQuery={returnSearchQuery}
          setReturnSearchQuery={setReturnSearchQuery}
          returnSearchMessage={returnSearchMessage}
          setReturnSearchMessage={setReturnSearchMessage}
          returnSearchResults={returnSearchResults}
          selectedReturnOrder={selectedReturnOrder}
          selectOrderForReturn={selectOrderForReturn}
          isSearchingReturnOrder={isSearchingReturnOrder}
          handleSearchReturnOrder={handleSearchReturnOrder}
          returnQuantities={returnQuantities}
          handleReturnQtyChange={handleReturnQtyChange}
          returnReason={returnReason}
          setReturnReason={setReturnReason}
          customCashbackDeduct={customCashbackDeduct}
          setCustomCashbackDeduct={setCustomCashbackDeduct}
          isSubmittingReturn={isSubmittingReturn}
          handleProcessReturn={handleProcessReturn}
          processedReturns={processedReturns}
          loadingReturnsHistory={loadingReturnsHistory}
          fetchProcessedReturns={fetchProcessedReturns}
        />
      )}

      {activeTab === "profile" && (
        <DrProfileTab
          drName={user?.name || currentDr?.name || "District Representative"}
          drPhone={user?.phone || currentDr?.phone || ""}
          drEmail={user?.email || currentDr?.email || ""}
          districtName={districtName}
          stats={stats}
          onAddVendor={() => setShowVendorModal(true)}
          onAddProduct={() => setShowProductModal(true)}
          onLogout={logout}
        />
      )}
    </DrShell>
  );
}
