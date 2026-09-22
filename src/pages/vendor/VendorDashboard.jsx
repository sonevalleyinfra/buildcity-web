import { useState, useEffect, useMemo, useRef } from "react";
import DashboardShell from "../../components/DashboardShell";
import { useAuth } from "../../context/AuthContext";
import { useAdmin } from "../../context/AdminContext";
import { useOrders } from "../../context/OrderContext";
import { useAlert } from "../../context/AlertContext";
import { formatShortId, formatDateTimeIST } from "../../utils/formatId";
import {
  notifyVendorNewOrder,
  requestOrderNotificationPermission,
} from "../../utils/orderAlertSound";
import { initVendorPushNotifications } from "../../utils/pushNotifications";

// Helper for ultra-fast, zero-latency image resolution with bundled offline assets
const resolveProductImage = (imageUrl, categoryName = "", productName = "") => {
  const cat = (categoryName || "").toLowerCase();
  const name = (productName || "").toLowerCase();

  const getBundledAsset = () => {
    if (cat.includes("cement") || name.includes("cement") || name.includes("birla") || name.includes("acc") || name.includes("ultratech") || name.includes("ambuja")) {
      return "/categories/cement.png";
    }
    if (cat.includes("steel") || cat.includes("tmt") || name.includes("steel") || name.includes("tmt") || name.includes("jindal") || name.includes("tata tiscon")) {
      return "/categories/steel.png";
    }
    if (cat.includes("paint") || name.includes("paint") || name.includes("asian") || name.includes("berger") || name.includes("nerolac")) {
      return "/categories/paints.png";
    }
    if (cat.includes("plumb") || cat.includes("pipe") || name.includes("pipe") || name.includes("astral") || name.includes("ashirvad") || name.includes("supreme")) {
      return "/categories/plumbing.png";
    }
    if (cat.includes("tile") || cat.includes("marble") || name.includes("tile") || name.includes("kajaria") || name.includes("somany")) {
      return "/categories/tiles.png";
    }
    if (cat.includes("stone") || cat.includes("sand") || cat.includes("aggregate") || cat.includes("gitti") || cat.includes("morang") || cat.includes("balu")) {
      return "/categories/crushed_stone.png";
    }
    if (cat.includes("rebar") || name.includes("rebar") || name.includes("rod") || name.includes("sariya")) {
      return "/categories/rebars.png";
    }
    return "/categories/cement.png";
  };

  // If no URL or generic placeholder URL, use instant bundled asset directly!
  if (!imageUrl || typeof imageUrl !== "string" || imageUrl.trim() === "" || imageUrl.includes("photo-1589939705384-5185137a7f0f")) {
    return getBundledAsset();
  }

  // If already a local asset, return as-is
  if (imageUrl.startsWith("/") || imageUrl.startsWith("assets/")) {
    return imageUrl;
  }

  // If Unsplash, optimize with thumbnail params to load 10x faster
  if (imageUrl.includes("images.unsplash.com")) {
    const base = imageUrl.split("?")[0];
    return `${base}?auto=format&fit=crop&w=160&h=160&q=75`;
  }

  return imageUrl;
};

// =========================================================================
// BESPOKE UNIQUE NAVIGATION ICONS (Architectural Storefront, Isometric Materials, Precision Plus, Site Dispatch Carrier, Verified Partner Badge)
// =========================================================================
function NavStoreIcon({ className = "w-4 h-4", active = false }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth={active ? "2.2" : "1.8"} strokeLinecap="round" strokeLinejoin="round">
      {/* Storefront Awning */}
      <path d="M3 9.5l2.2-5.5h13.6l2.2 5.5" fill={active ? "currentColor" : "none"} fillOpacity={active ? "0.15" : "0"} />
      <path d="M20 9.5v9.5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V9.5" />
      {/* Dynamic Storefront Analytics Pillars */}
      <path d="M8 18v-4" strokeWidth={active ? "2.4" : "2"} />
      <path d="M12 18v-7" strokeWidth={active ? "2.4" : "2"} />
      <path d="M16 18v-3" strokeWidth={active ? "2.4" : "2"} />
    </svg>
  );
}

function NavProductsIcon({ className = "w-4 h-4", active = false }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth={active ? "2.2" : "1.8"} strokeLinecap="round" strokeLinejoin="round">
      {/* Isometric 3D Materials Cube */}
      <path d="M12 2.5L3.5 7.2v9.6L12 21.5l8.5-4.7V7.2L12 2.5z" fill={active ? "currentColor" : "none"} fillOpacity={active ? "0.12" : "0"} />
      <path d="M12 2.5v19" />
      <path d="M3.5 7.2L12 12l8.5-4.8" />
      {/* Precision Price Tag Notch on Right Face */}
      <circle cx="16" cy="14" r="1.5" fill="currentColor" />
    </svg>
  );
}

function NavPlusIcon({ className = "w-4 h-4" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

function NavOrdersIcon({ className = "w-4 h-4", active = false }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth={active ? "2.2" : "1.8"} strokeLinecap="round" strokeLinejoin="round">
      {/* Delivery Dispatch Tote */}
      <path d="M5 8h14l1 12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2L5 8z" fill={active ? "currentColor" : "none"} fillOpacity={active ? "0.15" : "0"} />
      {/* Carrier Handles */}
      <path d="M9 8V6a3 3 0 0 1 6 0v2" />
      {/* Verified Dispatch Checkmark */}
      <path d="M9 14.5l2 2 4-4" strokeWidth="2" />
    </svg>
  );
}

function NavProfileIcon({ className = "w-4 h-4", active = false }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth={active ? "2.2" : "1.8"} strokeLinecap="round" strokeLinejoin="round">
      {/* Partner User Avatar */}
      <circle cx="12" cy="7" r="4" fill={active ? "currentColor" : "none"} fillOpacity={active ? "0.15" : "0"} />
      <path d="M4 20.5a8 8 0 0 1 16 0" />
      {/* Verified Partner Badge Indicator */}
      <circle cx="18" cy="18" r="3" fill="#10B981" stroke="#FFFFFF" strokeWidth="1.8" />
    </svg>
  );
}

// Vendor Dashboard component — Vendor partner ka main portal (Master Catalog selection, Custom Price & Stock setting, Orders management)
export default function VendorDashboard() {
  const { user, logout } = useAuth();
  const { showAlert, showConfirm } = useAlert();
  const {
    masterProducts = [],
    vendors = [],
    products = [],
    productsLoading,
    categories = [],
    assignMasterProductToVendor,
    updateVendorProductListing,
    removeVendorProductListing,
  } = useAdmin();
  const { orders = [], fetchVendorOrders, updateOrderStatus } = useOrders();

  // Tabs navigation state: "orders" -> Default Open Screen, "products" -> My Shop Items, "overview" -> Store Info, "profile" -> Vendor Profile
  const [activeTab, setActiveTabState] = useState("orders");
  const [tabHistory, setTabHistory] = useState(["orders"]);
  const [fetchedVendorOrders, setFetchedVendorOrders] = useState(() => {
    try {
      const vKey = `buildcity_vendor_orders_${user?.vendorInfo?.id || user?.vendorId || user?.id || (user?.phone ? `v-${user.phone}` : "vnd")}`;
      const saved = localStorage.getItem(vKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [];
  });
  const [ordersLoaded, setOrdersLoaded] = useState(() => {
    try {
      const vKey = `buildcity_vendor_orders_${user?.vendorInfo?.id || user?.vendorId || user?.id || (user?.phone ? `v-${user.phone}` : "vnd")}`;
      const saved = localStorage.getItem(vKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return true;
      }
    } catch {}
    return false;
  });

  // Change tab and track history for Android back navigation
  const switchTab = (newTab) => {
    if (newTab === activeTab) return;
    setActiveTabState(newTab);
    setTabHistory((prev) => [...prev, newTab]);
  };
  const setActiveTab = switchTab;

  // Master Catalog — Admin/DR dwara banaye gaye Master Products select karne ke liye
  const [showCatalogModal, setShowCatalogModal] = useState(false);
  const [selectedMasterProd, setSelectedMasterProd] = useState(null);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("ALL");
  const [catalogSearch, setCatalogSearch] = useState("");

  // Pricing, MRP & Discount % State — Vendor custom offer setting
  const [vendorMrp, setVendorMrp] = useState("");
  const [vendorDiscountPct, setVendorDiscountPct] = useState(10);
  const [vendorSellingPrice, setVendorSellingPrice] = useState("");
  const [vendorStockQty, setVendorStockQty] = useState(100);

  // Edit Listing - Custom selling price, MRP, discount and stock modify karne ke liye
  const [editingProduct, setEditingProduct] = useState(null);
  const [isUpdatingListing, setIsUpdatingListing] = useState(false);
  const [isAddingToStore, setIsAddingToStore] = useState(false);

  // Logged-in Vendor Info details extraction matching DB Vendors
  const matchedVendorObj = (vendors || []).find((v) => {
    const userPhoneClean = user?.phone ? user.phone.replace(/\D/g, "") : "";
    const vPhoneClean = v.phone ? v.phone.replace(/\D/g, "") : "";
    const vUserPhoneClean = v.user?.phone ? v.user.phone.replace(/\D/g, "") : "";

    const phoneMatches = userPhoneClean && (vPhoneClean === userPhoneClean || vUserPhoneClean === userPhoneClean);
    const idMatches =
      (user?.vendorInfo?.id && (v.id === user.vendorInfo.id || v.userId === user.vendorInfo.id)) ||
      (user?.vendorId && (v.id === user.vendorId || v.userId === user.vendorId)) ||
      (user?.id && (v.id === user.id || v.userId === user.id));

    return phoneMatches || idMatches;
  }) || user?.vendorInfo || {};

  const shopName = matchedVendorObj.shopName || user?.vendorInfo?.shopName || user?.shopName || user?.name || "Distributor Store";
  const ownerName = matchedVendorObj.ownerName || user?.vendorInfo?.ownerName || user?.name || "Vendor Owner";
  const vendorPhone = matchedVendorObj.phone || user?.phone || user?.vendorInfo?.phone || "9876543210";
  const districtName = matchedVendorObj.region?.name || matchedVendorObj.regionName || matchedVendorObj.districtName || user?.vendorInfo?.region?.name || user?.vendorInfo?.regionName || "Mirzapur";
  const vendorId = matchedVendorObj.id || user?.vendorInfo?.id || user?.vendorId || user?.id || (user?.phone ? `v-${user.phone}` : `v-${Date.now()}`);

  const [newOrderAlert, setNewOrderAlert] = useState(null);
  const knownOrderIdsRef = useRef(new Set());
  const initialLoadDoneRef = useRef(false);

  // Auto-request notification permission on mount for native sound & alerts + FCM background push
  useEffect(() => {
    requestOrderNotificationPermission().catch(() => {});
    if (vendorId) {
      initVendorPushNotifications(vendorId).catch(() => {});
    }
  }, [vendorId]);

  // Smart Vendor Orders Sync: Instant Event Sync + Focus/Visibility Aware + Loud Alert on New Orders
  useEffect(() => {
    let isMounted = true;
    const syncVendorOrders = async () => {
      try {
        const vOrds = await fetchVendorOrders(vendorId);
        if (isMounted && Array.isArray(vOrds)) {
          // Detect newly arrived orders for this vendor
          if (initialLoadDoneRef.current) {
            const newlyArrived = vOrds.filter((o) => o?.id && !knownOrderIdsRef.current.has(o.id));
            if (newlyArrived.length > 0) {
              const latest = newlyArrived[0];
              // 🔔 Trigger Loud Chime Sound + Phone Vibration + Android Native Notification!
              notifyVendorNewOrder(latest);
              setNewOrderAlert(latest);
              // Auto-dismiss popup banner after 14 seconds
              setTimeout(() => {
                setNewOrderAlert((curr) => (curr?.id === latest.id ? null : curr));
              }, 14000);
            }
          }

          // Register all current order IDs to known set
          vOrds.forEach((o) => {
            if (o?.id) knownOrderIdsRef.current.add(o.id);
          });
          initialLoadDoneRef.current = true;

          setFetchedVendorOrders((prev) => {
            if (prev.length === vOrds.length && JSON.stringify(prev) === JSON.stringify(vOrds)) {
              return prev;
            }
            return vOrds;
          });
          try {
            localStorage.setItem(`buildcity_vendor_orders_${vendorId}`, JSON.stringify(vOrds));
          } catch {}
          setOrdersLoaded(true);
        }
      } catch {
        if (isMounted) setOrdersLoaded(true);
      }
    };

    syncVendorOrders();

    // 1. Fast Background & Foreground Polling (Every 7 seconds continuously so orders are always fresh and alerts trigger)
    const interval = setInterval(() => {
      syncVendorOrders();
    }, 7000);

    // 2. Instant Sync on Focus / Visibility
    const handleFocus = () => {
      syncVendorOrders();
    };

    // 3. Instant Event-Driven Sync
    const handleOrderEvent = () => syncVendorOrders();
    window.addEventListener("focus", handleFocus);
    window.addEventListener("visibilitychange", handleFocus);
    window.addEventListener("buildcity_orders_updated", handleOrderEvent);
    window.addEventListener("buildcity_order_placed", handleOrderEvent);

    return () => {
      isMounted = false;
      clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("visibilitychange", handleFocus);
      window.removeEventListener("buildcity_orders_updated", handleOrderEvent);
      window.removeEventListener("buildcity_order_placed", handleOrderEvent);
    };
  }, [vendorId, shopName]);

  // Handle Android Native Back Button: Closes modal first -> Go back in tab history -> Exit only on final initial tab!
  useEffect(() => {
    window.__buildcity_vendor_back_handler = () => {
      // 1. If Catalog modal is open, close it
      if (showCatalogModal) {
        setShowCatalogModal(false);
        return true;
      }
      // 2. If Product Edit sheet is open, close it
      if (editingProduct) {
        setEditingProduct(null);
        return true;
      }
      // 3. If there is previous tab history, go back to previous tab
      if (tabHistory.length > 1) {
        const updatedHistory = [...tabHistory];
        updatedHistory.pop(); // Remove current tab
        const prevTab = updatedHistory[updatedHistory.length - 1];
        setTabHistory(updatedHistory);
        setActiveTabState(prevTab);
        return true; // Back action consumed, app does not exit!
      }
      // Return false if on last/initial tab so Android can safely exit app
      return false;
    };

    return () => {
      window.__buildcity_vendor_back_handler = null;
    };
  }, [showCatalogModal, editingProduct, tabHistory]);

  // Lock document body scroll when modal/full-page sheet is open so background never scrolls
  useEffect(() => {
    if (showCatalogModal || editingProduct) {
      const origOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = origOverflow;
      };
    }
  }, [showCatalogModal, editingProduct]);

  // Strict Vendor Orders Isolation:
  // Primary and authoritative source is fetchedVendorOrders (returned directly by /api/v1/orders/vendor/:id).
  // Never merge raw global context orders to prevent order count oscillation.
  const isGenericStoreName = (str = "") => {
    const s = String(str || "").trim().toLowerCase();
    return !s || ["distributor store", "vendor owner", "vendor partner", "district vendor", "vendor", "store", "shop"].includes(s);
  };

  const isItemForThisVendor = (it) => {
    if (!it) return false;
    const itVendorId = it.vendorId || it.vendor?.id;
    const itVendorName = String(it.vendorName || it.vendor?.shopName || "").trim();
    const curShop = String(shopName || "").trim();
    const curOwner = String(ownerName || "").trim();
    const curPhone = (user?.phone || matchedVendorObj.phone || "").replace(/\D/g, "");
    const itPhone = (it.vendor?.phone || "").replace(/\D/g, "");

    const matchesId = Boolean(
      itVendorId && (
        itVendorId === vendorId ||
        itVendorId === matchedVendorObj.id ||
        (user?.id && itVendorId === user.id) ||
        (user?.vendorInfo?.id && itVendorId === user.vendorInfo.id) ||
        (matchedVendorObj.userId && itVendorId === matchedVendorObj.userId)
      )
    );
    const matchesPhone = Boolean(curPhone && itPhone && curPhone.length >= 8 && itPhone.length >= 8 && curPhone.slice(-10) === itPhone.slice(-10));
    const matchesShop = Boolean(
      !isGenericStoreName(curShop) &&
      !isGenericStoreName(itVendorName) &&
      (itVendorName.toLowerCase() === curShop.toLowerCase() ||
        (itVendorName.length > 5 && curShop.length > 5 && (itVendorName.toLowerCase().includes(curShop.toLowerCase()) || curShop.toLowerCase().includes(itVendorName.toLowerCase()))))
    );
    const matchesOwner = Boolean(!isGenericStoreName(curOwner) && curOwner.length > 3 && itVendorName.toLowerCase().includes(curOwner.toLowerCase()));

    return Boolean(matchesId || matchesPhone || matchesShop || matchesOwner);
  };

  // Dedicated candidate orders: When loaded or has data, strictly use fetchedVendorOrders
  const candidateOrders = (fetchedVendorOrders && fetchedVendorOrders.length > 0)
    ? fetchedVendorOrders
    : (ordersLoaded
        ? []
        : (orders || []).filter((o) => Array.isArray(o.items) && o.items.some(isItemForThisVendor)));

  const vendorOrderMap = new Map();
  candidateOrders.forEach((o) => {
    if (o && o.id && !vendorOrderMap.has(o.id)) {
      vendorOrderMap.set(o.id, o);
    }
  });

  const vendorOrders = Array.from(vendorOrderMap.values())
    .map((o) => {
      if (!o || !Array.isArray(o.items) || o.items.length === 0) return null;

      // Filter items for this vendor
      let myItems = o.items.filter(isItemForThisVendor);

      // If backend /api/v1/orders/vendor/:id returned this order, the items are already this vendor's items!
      if (myItems.length === 0 && (ordersLoaded || (fetchedVendorOrders || []).some((f) => f.id === o.id))) {
        myItems = o.items;
      }

      if (myItems.length === 0) return null;

      // Calculate total price for this vendor's items only
      const vendorItemsTotal = myItems.reduce((acc, it) => {
        const qty = Number(it.quantity || it.qty || it.count || 1);
        const rawPrice = it.price ?? it.unitPrice ?? it.priceAtPurchase ?? it.sellingPrice ?? it.rate;
        let line = 0;
        if (rawPrice !== undefined && rawPrice !== null && !isNaN(Number(rawPrice)) && Number(rawPrice) > 0) {
          line = Number(rawPrice) * qty;
        } else if (it.totalPrice || it.total || it.amount) {
          line = Number(it.totalPrice || it.total || it.amount) || 0;
        }
        return acc + line;
      }, 0);

      const totalItemsInOrder = o.totalOrderItemsCount || o.items.length;
      const isSingleVendor = myItems.length === totalItemsInOrder;
      const orderTotal = o.vendorItemsTotal || (isSingleVendor && (o.totalAmount || o.total)
        ? Number(o.totalAmount || o.total)
        : vendorItemsTotal);

      return {
        ...o,
        items: myItems,
        totalAmount: orderTotal,
        total: orderTotal,
        vendorItemsTotal: o.vendorItemsTotal || vendorItemsTotal,
        isPartialOrder: !isSingleVendor,
        totalOrderItemsCount: totalItemsInOrder,
      };
    })
    .filter(Boolean);

  // Category Bubble image resolver matching circular category tiles
  const resolveCategoryBubbleImage = (catName = "") => {
    const lower = (catName || "").toLowerCase().trim();
    if (lower.includes("cement")) return "/categories/cement.png";
    if (lower.includes("steel")) return "/categories/steel.png";
    if (lower.includes("rebar") || lower.includes("sariya")) return "/categories/rebars.png";
    if (lower.includes("stone") || lower.includes("gitti") || lower.includes("crush") || lower.includes("aggregate")) return "/categories/crushed_stone.png";
    if (lower.includes("tile")) return "/categories/tiles.png";
    if (lower.includes("plumb") || lower.includes("pipe")) return "/categories/plumbing.png";
    if (lower.includes("paint")) return "/categories/paints.png";
    if (lower.includes("brick")) return "https://images.unsplash.com/photo-1590069261209-f8e9b8642343?auto=format&fit=crop&w=160&q=80";
    if (lower.includes("elect")) return "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=160&q=80";
    return "/categories/cement.png";
  };

  // State for filtering vendor's own listed store products by category & search query
  const [vendorStoreCategoryFilter, setVendorStoreCategoryFilter] = useState("ALL");
  const [productSearch, setProductSearch] = useState("");
  const [orderSectionTab, setOrderSectionTab] = useState("ACTIVE"); // 'ACTIVE' (Pending, Processing, Out) vs 'COMPLETED' (Delivered, Cancelled)
  const [orderStatusFilter, setOrderStatusFilter] = useState("ALL");
  const [orderSearch, setOrderSearch] = useState("");
  const [updatingOrderId, setUpdatingOrderId] = useState(null);

  // Current vendor ki dukan par list huye products filter karo (Flexible DB Match)
  const vendorProducts = products.filter((p) => {
    if (!p) return false;
    const matchesId = p.vendorId && (p.vendorId === vendorId || p.vendorId === matchedVendorObj.id || p.vendorId === user?.id);
    const pShop = (p.vendorName || p.vendor?.shopName || "").toLowerCase().trim();
    const curShop = shopName.toLowerCase().trim();
    const curOwner = ownerName.toLowerCase().trim();
    const matchesShop = curShop && pShop && (pShop.includes(curShop) || curShop.includes(pShop));
    const matchesOwner = curOwner && p.vendor?.ownerName && p.vendor.ownerName.toLowerCase().includes(curOwner);
    return matchesId || matchesShop || matchesOwner;
  });

  // Category Bubbles list (Home screen round story bubbles style)
  const staticCategoryBubbles = [
    { id: "Cement", name: "Cement", img: "/categories/cement.png" },
    { id: "Steel", name: "Steel", img: "/categories/steel.png" },
    { id: "Rebars", name: "Rebars", img: "/categories/rebars.png" },
    { id: "Crushed Stone", name: "Crushed Stone", img: "/categories/crushed_stone.png" },
    { id: "Tiles", name: "Tiles", img: "/categories/tiles.png" },
    { id: "Plumbing", name: "Plumbing", img: "/categories/plumbing.png" },
    { id: "Paints", name: "Paints", img: "/categories/paints.png" },
  ];

  const categoryBubbleMap = new Map();
  staticCategoryBubbles.forEach((c) => categoryBubbleMap.set(c.name.toLowerCase(), c));
  (categories || []).forEach((c) => {
    const key = (c.name || "").toLowerCase();
    if (!categoryBubbleMap.has(key)) {
      categoryBubbleMap.set(key, {
        id: c.id,
        name: c.name,
        img: resolveCategoryBubbleImage(c.name),
      });
    }
  });
  const allCategoryBubbles = Array.from(categoryBubbleMap.values());

  // Selected category ke mutabiq filtered vendor products
  const filteredVendorProducts = vendorProducts.filter((p) => {
    if (vendorStoreCategoryFilter === "ALL") return true;
    const pCatId = p.categoryId || "";
    const pCatName = (p.categoryName || "").toLowerCase();
    const targetFilter = vendorStoreCategoryFilter.toLowerCase();
    return pCatId === vendorStoreCategoryFilter || pCatName === targetFilter || pCatName.includes(targetFilter);
  });

  // Live search query filtered products for vendor's products page
  const displayedVendorProducts = filteredVendorProducts.filter((p) => {
    if (!productSearch) return true;
    const q = productSearch.toLowerCase();
    return (
      (p.name || "").toLowerCase().includes(q) ||
      (p.brand || "").toLowerCase().includes(q) ||
      (p.categoryName || "").toLowerCase().includes(q) ||
      (p.grade || "").toLowerCase().includes(q)
    );
  });

  // Calculate customer order counts (detect repeat buyers / frequent customers)
  const customerOrderCounts = useMemo(() => {
    const counts = {};
    vendorOrders.forEach((o) => {
      const rawAddr = o.address;
      const isObj = typeof rawAddr === "object" && rawAddr !== null;
      const phone = ((isObj && rawAddr.phone) || o.customer?.phone || o.phone || "").trim();
      const name = ((isObj && (rawAddr.fullName || rawAddr.name)) || o.customer?.name || (typeof o.customer === "string" ? o.customer : "")).trim().toLowerCase();
      const key = phone || name;
      if (key) {
        counts[key] = (counts[key] || 0) + 1;
      }
    });
    return counts;
  }, [vendorOrders]);

  const getCustomerStats = (ord) => {
    const rawAddr = ord.address;
    const isObj = typeof rawAddr === "object" && rawAddr !== null;
    const phone = ((isObj && rawAddr.phone) || ord.customer?.phone || ord.phone || "").trim();
    const name = ((isObj && (rawAddr.fullName || rawAddr.name)) || ord.customer?.name || (typeof ord.customer === "string" ? ord.customer : "")).trim().toLowerCase();
    const key = phone || name;
    const count = key ? (customerOrderCounts[key] || 1) : 1;
    return {
      orderCount: count,
      isRepeat: count > 1,
    };
  };

  // Active Orders (Pending, Processing, Out for Delivery) vs Completed Orders (Delivered, Cancelled)
  const activeOrders = useMemo(() => {
    return vendorOrders.filter((o) => {
      const st = (o.status || "PENDING").toUpperCase();
      return st === "PENDING" || st === "PROCESSING" || st === "OUT_FOR_DELIVERY";
    });
  }, [vendorOrders]);

  const completedOrders = useMemo(() => {
    return vendorOrders.filter((o) => {
      const st = (o.status || "").toUpperCase();
      return st === "DELIVERED" || st === "CANCELLED";
    });
  }, [vendorOrders]);

  const pendingOrdersCount = vendorOrders.filter((o) => (o.status || "PENDING").toUpperCase() === "PENDING").length;

  // Filtered orders for dedicated orders page (with tab, status, search, and repeat filter + Smart Pending-First Sort)
  const filteredVendorOrders = useMemo(() => {
    // 1. First partition by Selected Section Tab (ACTIVE vs COMPLETED)
    const baseOrders = orderSectionTab === "ACTIVE" ? activeOrders : completedOrders;

    const filtered = baseOrders.filter((ord) => {
      // Status / Repeat Buyer Filter within the active tab
      if (orderStatusFilter === "REPEAT_BUYERS") {
        if (!getCustomerStats(ord).isRepeat) return false;
      } else if (orderStatusFilter !== "ALL") {
        if ((ord.status || "PENDING").toUpperCase() !== orderStatusFilter) return false;
      }

      // Search query filter (Order ID, Customer Name, Phone, Items, Delivery Address)
      if (orderSearch.trim()) {
        const q = orderSearch.toLowerCase().trim();
        const rawAddr = ord.address;
        const isObj = typeof rawAddr === "object" && rawAddr !== null;
        const isStr = typeof rawAddr === "string" && rawAddr.trim().length > 0;
        const custName = ((isObj && (rawAddr.fullName || rawAddr.name)) || ord.customer?.name || (typeof ord.customer === "string" ? ord.customer : "")).toLowerCase();
        const phone = ((isObj && rawAddr.phone) || ord.customer?.phone || ord.phone || "").toLowerCase();
        const ordId = String(ord.id || ord.orderNumber || "").toLowerCase();
        const formattedId = formatShortId(ord.id || ord.orderNumber, "ORD").toLowerCase();
        const street = (isObj ? (rawAddr.street || rawAddr.line || rawAddr.address) : (isStr ? rawAddr : "")).toLowerCase();
        const city = (isObj ? rawAddr.city : (ord.districtName || ord.regionName || "")).toLowerCase();

        const itemsMatch = Array.isArray(ord.items)
          ? ord.items.some((i) => (i.productName || i.name || "").toLowerCase().includes(q))
          : String(ord.items || "").toLowerCase().includes(q);

        const matchesSearch =
          custName.includes(q) ||
          phone.includes(q) ||
          ordId.includes(q) ||
          formattedId.includes(q) ||
          street.includes(q) ||
          city.includes(q) ||
          itemsMatch;

        if (!matchesSearch) return false;
      }

      return true;
    });

    // 2. Smart Priority Sorting:
    // For ACTIVE tab: PENDING first (urgency!), then PROCESSING, then OUT_FOR_DELIVERY, then newest date
    // For COMPLETED tab: Newest date first
    return filtered.sort((a, b) => {
      if (orderSectionTab === "ACTIVE") {
        const priority = { PENDING: 1, PROCESSING: 2, OUT_FOR_DELIVERY: 3 };
        const pA = priority[(a.status || "PENDING").toUpperCase()] || 99;
        const pB = priority[(b.status || "PENDING").toUpperCase()] || 99;
        if (pA !== pB) return pA - pB;
      }
      const timeA = new Date(a.createdAt || a.date || 0).getTime();
      const timeB = new Date(b.createdAt || b.date || 0).getTime();
      return timeB - timeA;
    });
  }, [vendorOrders, activeOrders, completedOrders, orderSectionTab, orderStatusFilter, orderSearch, customerOrderCounts]);

  // Quick stock stepper handler (+/- on 2x2 product card)
  const handleQuickStockChange = async (prod, delta) => {
    const curStock = Number(prod.stockQty) || 0;
    const newStock = Math.max(0, curStock + delta);
    if (newStock === curStock) return;
    try {
      await updateVendorProductListing(prod.id, {
        price: Number(prod.price),
        mrp: Number(prod.mrp || prod.price),
        stockQty: newStock,
      });
    } catch (err) {
      console.warn("Stock change error:", err);
    }
  };

  // Category aur search term ke mutabiq Master Catalog products filter karo
  const filteredMasterProducts = masterProducts.filter((mp) => {
    const matchesCategory =
      selectedCategoryFilter === "ALL" || mp.categoryId === selectedCategoryFilter;
    const matchesSearch =
      mp.name.toLowerCase().includes(catalogSearch.toLowerCase()) ||
      mp.brand.toLowerCase().includes(catalogSearch.toLowerCase()) ||
      mp.categoryName.toLowerCase().includes(catalogSearch.toLowerCase()) ||
      mp.type.toLowerCase().includes(catalogSearch.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleOpenMasterProductSelect = (mp) => {
    setSelectedMasterProd(mp);
    const mrp = Number(mp.suggestedPrice) || 390;
    const defaultDisc = 10;
    const calcSelling = Math.round(mrp * (1 - defaultDisc / 100));
    setVendorMrp(mrp);
    setVendorDiscountPct(defaultDisc);
    setVendorSellingPrice(calcSelling);
    setVendorStockQty(100);
  };

  const handleSellingPriceChange = (val) => {
    setVendorSellingPrice(val);
    const numPrice = Number(val) || 0;
    const numMrp = Number(vendorMrp) || 0;
    if (numMrp > 0 && numPrice > 0 && numPrice <= numMrp) {
      setVendorDiscountPct(Math.round(((numMrp - numPrice) / numMrp) * 100));
    }
  };

  const handleDiscountChange = (val) => {
    setVendorDiscountPct(val);
    const numDisc = Number(val) || 0;
    const numMrp = Number(vendorMrp) || 0;
    if (numMrp > 0) {
      setVendorSellingPrice(Math.round(numMrp * (1 - numDisc / 100)));
    }
  };

  const handleMrpChange = (val) => {
    setVendorMrp(val);
    const numMrp = Number(val) || 0;
    const numDisc = Number(vendorDiscountPct) || 0;
    if (numMrp > 0) {
      setVendorSellingPrice(Math.round(numMrp * (1 - numDisc / 100)));
    }
  };

  const handleAddMasterProductToStore = async (e) => {
    e.preventDefault();
    if (!selectedMasterProd || !vendorSellingPrice) return;

    setIsAddingToStore(true);
    try {
      const prodName = selectedMasterProd.name;
      const targetPrice = vendorSellingPrice;
      const targetDisc = vendorDiscountPct;

      await assignMasterProductToVendor({
        masterProductId: selectedMasterProd.id,
        vendorId: vendorId,
        vendorName: shopName,
        regionId: matchedVendorObj.regionId || user?.vendorInfo?.regionId,
        regionName: districtName || matchedVendorObj.regionName || "Mirzapur",
        districtName: districtName || matchedVendorObj.regionName || "Mirzapur",
        price: Number(vendorSellingPrice),
        mrp: Number(vendorMrp) || Number(selectedMasterProd.suggestedPrice) || Number(vendorSellingPrice),
        stockQty: Number(vendorStockQty) || 0,
        addedBy: `Vendor (${shopName})`,
      });

      setSelectedMasterProd(null);
      setShowCatalogModal(false);
      showAlert({
        title: "✅ Submitted for Review",
        message: `"${prodName}" has been added to your store!\n\nStatus: ⏳ Under Admin & DR Review\nPrice: ₹${targetPrice} (${targetDisc}% OFF)\nOnce approved by Admin or DR, this product will go live on the customer store.`,
        type: "success",
        buttonText: "Understood",
      });
    } catch (err) {
      showAlert({
        title: "Submission Error",
        message: err.message || "Failed to add product to store.",
        type: "warning",
      });
    } finally {
      setIsAddingToStore(false);
    }
  };

  const handleOpenEditProduct = (p) => {
    const price = Number(p.price) || 100;
    const mrp = Number(p.mrp || p.masterProduct?.suggestedPrice || Math.round(price * 1.2));
    const disc = mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;
    setEditingProduct({
      ...p,
      mrp: mrp,
      price: price,
      discountPct: disc,
      stockQty: p.stockQty !== undefined ? p.stockQty : 100,
    });
  };

  const handleEditPriceChange = (val) => {
    const numPrice = Number(val) || 0;
    const numMrp = Number(editingProduct.mrp) || 0;
    const disc = numMrp > numPrice && numPrice > 0 ? Math.round(((numMrp - numPrice) / numMrp) * 100) : 0;
    setEditingProduct((prev) => ({ ...prev, price: val, discountPct: disc }));
  };

  const handleEditDiscountChange = (val) => {
    const numDisc = Number(val) || 0;
    const numMrp = Number(editingProduct.mrp) || 0;
    const newPrice = numMrp > 0 ? Math.round(numMrp * (1 - numDisc / 100)) : editingProduct.price;
    setEditingProduct((prev) => ({ ...prev, discountPct: val, price: newPrice }));
  };

  const handleEditMrpChange = (val) => {
    const numMrp = Number(val) || 0;
    const numDisc = Number(editingProduct.discountPct) || 0;
    const newPrice = numMrp > 0 ? Math.round(numMrp * (1 - numDisc / 100)) : editingProduct.price;
    setEditingProduct((prev) => ({ ...prev, mrp: val, price: newPrice }));
  };

  const handleUpdateListing = async (e) => {
    e.preventDefault();
    if (!editingProduct) return;

    const prodToSave = { ...editingProduct };
    const updatedPrice = prodToSave.price;
    const updatedDisc = prodToSave.discountPct;
    setEditingProduct(null);
    showAlert({
      title: "✅ Offer Live on Store!",
      message: `Your product price has been updated to ₹${updatedPrice} (${updatedDisc}% OFF).\n\nCustomers across your district will now see this discounted price and % OFF badge immediately!`,
      type: "success",
      buttonText: "Awesome",
    });

    try {
      await updateVendorProductListing(prodToSave.id, {
        price: Number(prodToSave.price),
        mrp: Number(prodToSave.mrp),
        stockQty: Number(prodToSave.stockQty),
      });
    } catch (err) {
      console.warn("Background update listing note:", err.message);
    }
  };

  const handleRemoveListing = (id, name) => {
    showConfirm({
      title: "Remove Store Listing?",
      message: `Remove "${name}" from your store listings?`,
      type: "warning",
      confirmText: "Remove Listing",
      onConfirm: () => {
        removeVendorProductListing(id);
        showAlert({ title: "Listing Removed", message: `"${name}" removed from your store.`, type: "info" });
      },
    });
  };

  // Real DB stats calculation: Revenue counts ONLY when order is DELIVERED!
  const totalRevenue = vendorOrders.reduce((sum, ord) => {
    const st = (ord.status || "").toUpperCase();
    if (st !== "DELIVERED") return sum;
    return sum + (Number(ord.totalAmount || ord.total || 0) || 0);
  }, 0);

  // Live Status Change handler with real-time loading feedback & instant synchronous persistence
  const handleStatusChange = async (orderId, newStatus) => {
    if (!orderId || !newStatus) return;
    setUpdatingOrderId(orderId);

    // 1. Instant optimistic state + localStorage update so refresh never shows stale status!
    setFetchedVendorOrders((prev) => {
      const updated = prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o));
      try {
        localStorage.setItem(`buildcity_vendor_orders_${vendorId}`, JSON.stringify(updated));
      } catch {}
      return updated;
    });

    try {
      await updateOrderStatus(orderId, newStatus);
    } catch (err) {
      console.warn("Status change error:", err);
      showAlert({
        title: "Status Update Error",
        message: err.message || "Failed to update order status.",
        type: "warning",
      });
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const activeOrdersCount = vendorOrders.filter((o) => {
    const st = (o.status || "").toUpperCase();
    return st === "PENDING" || st === "PROCESSING" || st === "OUT_FOR_DELIVERY";
  }).length;

  return (
    <DashboardShell
      logoIconOnly={true}
      badge={
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-slate-300 font-normal">|</span>
          <span className="text-xs sm:text-sm font-black text-navy-950 truncate max-w-[170px] sm:max-w-[280px]" title={shopName || "Vendor Store"}>
            {shopName || "Vendor Store"}
          </span>
        </div>
      }
      hideLogout={true}
      onProfileClick={() => setActiveTab("profile")}
      isProfileActive={activeTab === "profile"}
      rightContent={
        <div className="px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl bg-slate-100/90 border border-slate-200/90 text-slate-700 text-[11px] sm:text-xs font-semibold flex items-center gap-1 shrink-0">
          <svg className="w-3 h-3 text-slate-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span>{districtName || "Location"}</span>
        </div>
      }
    >
      {/* 🔔 Real-time Loud Order Arrival Popup Alert Card */}
      {newOrderAlert && (
        <div className="fixed top-4 inset-x-3 sm:inset-x-auto sm:right-6 sm:w-96 z-50 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="bg-gradient-to-r from-navy-950 via-[#0A192F] to-slate-900 border-2 border-amber-400 text-white p-3.5 sm:p-4 rounded-2xl shadow-2xl flex items-start gap-3 backdrop-blur-md">
            <div className="w-10 h-10 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center text-xl shrink-0 animate-pulse shadow-md">
              🔔
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1">
                <p className="text-[11px] font-black uppercase tracking-wider text-amber-400">
                  Naya Order Aaya Hai!
                </p>
                <button
                  type="button"
                  onClick={() => setNewOrderAlert(null)}
                  className="text-slate-400 hover:text-white text-xs p-1"
                >
                  ✕
                </button>
              </div>
              <p className="text-sm font-extrabold text-white mt-0.5 truncate">
                Order {formatShortId(newOrderAlert.id || newOrderAlert.orderNumber, "ORD")}
              </p>
              <p className="text-xs font-semibold text-slate-300">
                ₹{(Number(newOrderAlert.totalAmount || newOrderAlert.total || newOrderAlert.vendorItemsTotal || 0)).toLocaleString("en-IN")} • {Array.isArray(newOrderAlert.items) ? newOrderAlert.items.length : 1} Items
              </p>
              <button
                type="button"
                onClick={() => {
                  setActiveTab("orders");
                  setNewOrderAlert(null);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className="mt-2 w-full py-1.5 px-3 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
              >
                <span>View Customer Order</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="pb-28 md:pb-8">

        {/* 🖥️ DESKTOP TOP NAVIGATION TABS (Visible only on md: screens and above) */}
        <div className="hidden md:flex items-center justify-between bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-2xl p-2 mb-6 shadow-xs sticky top-[52px] z-20">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setActiveTab("overview")}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === "overview"
                  ? "bg-[#FFF7ED] text-[#C2410C] border border-[#FED7AA] shadow-2xs font-extrabold"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              <NavStoreIcon className="w-4 h-4" active={activeTab === "overview"} />
              <span>Store Info</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("products")}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === "products"
                  ? "bg-[#FFF7ED] text-[#C2410C] border border-[#FED7AA] shadow-2xs font-extrabold"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              <NavProductsIcon className="w-4 h-4" active={activeTab === "products"} />
              <span>Products & Prices</span>
              <span className="bg-slate-200 text-slate-700 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                {vendorProducts.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("orders")}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 relative ${
                activeTab === "orders"
                  ? "bg-[#FFF7ED] text-[#C2410C] border border-[#FED7AA] shadow-2xs font-extrabold"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              <NavOrdersIcon className="w-4 h-4" active={activeTab === "orders"} />
              <span>Customer Orders</span>
              {activeOrdersCount > 0 && (
                <span className="bg-rose-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-black animate-pulse">
                  {activeOrdersCount}
                </span>
              )}
            </button>
          </div>

          <div>
            <button
              type="button"
              onClick={() => setShowCatalogModal(true)}
              className="bg-gradient-to-r from-brand-600 to-amber-500 hover:from-brand-500 hover:to-amber-400 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl shadow-xs active:scale-[0.98] transition-all cursor-pointer flex items-center gap-2 group"
            >
              <NavPlusIcon className="w-4 h-4 text-white group-hover:rotate-90 transition-transform duration-200" />
              <span>Choose from Master Catalog</span>
            </button>
          </div>
        </div>

      {/* ========================================================================= */}
      {/* PAGE 1: OVERVIEW / STORE INFO & SALES STATS (DEDICATED FULL VIEW)         */}
      {/* ========================================================================= */}
      {activeTab === "overview" && (
        <div className="space-y-4 sm:space-y-6">
          {/* ========================================================= */}
          {/* 3 ELEVATED TINTED STAT CARDS (Directly at top of page)    */}
          {/* ========================================================= */}
          <div className="space-y-3">
            {/* Exactly 3 Elevated Floating Cards (Left to Right in 3 Equal Columns) */}
            <div className="grid grid-cols-3 gap-2 sm:gap-3.5">
              
              {/* CARD 1: REVENUE (Delivered Only) */}
              <div className="bg-white rounded-2xl p-2.5 sm:p-4 border border-slate-200/80 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between group">
                <div>
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-slate-100 border border-slate-200/60 flex items-center justify-center text-slate-700 mb-1.5 sm:mb-2 group-hover:scale-105 transition-transform">
                    <span className="text-xs sm:text-sm font-black text-slate-800">₹</span>
                  </div>
                  <p className="text-[9px] sm:text-[11px] font-semibold text-slate-500 tracking-tight leading-tight">Revenue</p>
                  <h2 className="text-xs sm:text-lg font-black text-slate-900 tracking-tight mt-0.5 truncate">
                    ₹{Number(totalRevenue || 0).toLocaleString("en-IN")}
                  </h2>
                </div>
                <div className="mt-2 pt-1.5 sm:pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className="inline-flex items-center gap-0.5 text-[8px] sm:text-[9px] font-bold text-emerald-700 bg-emerald-50/80 px-1.5 py-0.5 rounded border border-emerald-200/40">
                    ✓ Delivered
                  </span>
                </div>
              </div>

              {/* CARD 2: ACTIVE ORDERS */}
              <button
                type="button"
                onClick={() => setActiveTab("orders")}
                className="text-left bg-white rounded-2xl p-2.5 sm:p-4 border border-slate-200/80 shadow-2xs hover:shadow-xs hover:border-slate-300 active:scale-[0.98] transition-all flex flex-col justify-between group cursor-pointer"
              >
                <div>
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-slate-100 border border-slate-200/60 flex items-center justify-center text-slate-700 mb-1.5 sm:mb-2 group-hover:scale-105 transition-transform">
                    <span className="text-xs sm:text-sm">📦</span>
                  </div>
                  <p className="text-[9px] sm:text-[11px] font-semibold text-slate-500 tracking-tight leading-tight group-hover:text-slate-800 transition-colors">Orders</p>
                  <h2 className="text-xs sm:text-lg font-black text-slate-900 tracking-tight mt-0.5 truncate">
                    {activeOrdersCount} Active
                  </h2>
                </div>
                <div className="mt-2 pt-1.5 sm:pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[8px] sm:text-[10px] font-bold text-slate-600 group-hover:text-brand-600 group-hover:translate-x-0.5 transition-all flex items-center gap-0.5">
                    View →
                  </span>
                </div>
              </button>

              {/* CARD 3: MY PRODUCTS */}
              <button
                type="button"
                onClick={() => setActiveTab("products")}
                className="text-left bg-white rounded-2xl p-2.5 sm:p-4 border border-slate-200/80 shadow-2xs hover:shadow-xs hover:border-slate-300 active:scale-[0.98] transition-all flex flex-col justify-between group cursor-pointer"
              >
                <div>
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-slate-100 border border-slate-200/60 flex items-center justify-center text-slate-700 mb-1.5 sm:mb-2 group-hover:scale-105 transition-transform">
                    <span className="text-xs sm:text-sm">🏷️</span>
                  </div>
                  <p className="text-[9px] sm:text-[11px] font-semibold text-slate-500 tracking-tight leading-tight group-hover:text-slate-800 transition-colors">Products</p>
                  <h2 className="text-xs sm:text-lg font-black text-slate-900 tracking-tight mt-0.5 truncate">
                    {vendorProducts.length} Listed
                  </h2>
                </div>
                <div className="mt-2 pt-1.5 sm:pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[8px] sm:text-[10px] font-bold text-slate-600 group-hover:text-brand-600 group-hover:translate-x-0.5 transition-all flex items-center gap-0.5">
                    Grid →
                  </span>
                </div>
              </button>

            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            <div className="lg:col-span-2 space-y-4 sm:space-y-6">
              {/* Store Products Preview Card */}
              <div className="bg-white border border-slate-200/90 rounded-2xl p-3.5 sm:p-5 shadow-xs">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 mb-3">
                  <div>
                    <h3 className="font-extrabold text-navy-900 text-sm">Products</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab("products")}
                    className="text-xs font-bold text-brand-600 hover:text-brand-700 cursor-pointer"
                  >
                    View All ({vendorProducts.length}) →
                  </button>
                </div>

                {productsLoading ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 animate-pulse">
                    {[1, 2].map((n) => (
                      <div key={n} className="border border-slate-200 rounded-xl p-2.5 flex gap-2.5 items-center bg-slate-50/50">
                        <div className="w-12 h-12 rounded-lg bg-slate-200 shrink-0" />
                        <div className="overflow-hidden flex-1 space-y-1.5">
                          <div className="h-3.5 bg-slate-200 rounded w-3/4" />
                          <div className="h-2.5 bg-slate-200 rounded w-1/2" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : vendorProducts.length === 0 ? (
                  <div className="text-center py-6">
                    <p className="text-2xl mb-1">📦</p>
                    <p className="text-xs font-bold text-navy-900">No products</p>
                    <button
                      onClick={() => setShowCatalogModal(true)}
                      className="mt-2.5 bg-brand-500 text-white text-xs font-bold px-3.5 py-1.5 rounded-xl cursor-pointer"
                    >
                      Add Products
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {vendorProducts.slice(0, 4).map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleOpenEditProduct(p)}
                        className="w-full text-left border border-slate-200/80 hover:border-brand-400 hover:shadow-xs rounded-xl p-2 flex gap-2.5 items-center bg-white active:scale-[0.98] transition-all cursor-pointer group"
                        title="Click to view & edit product"
                      >
                        <img
                          src={resolveProductImage(p.imageUrl, p.categoryName, p.name)}
                          alt={p.name}
                          loading="lazy"
                          decoding="async"
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = resolveProductImage(null, p.categoryName, p.name);
                          }}
                          className="w-11 h-11 rounded-lg object-cover border border-slate-200 shrink-0 bg-slate-50 group-hover:scale-105 transition-transform"
                        />
                        <div className="overflow-hidden flex-1 min-w-0">
                          <p className="font-bold text-xs text-navy-900 truncate group-hover:text-brand-600 transition-colors">{p.name}</p>
                          {(p.brand || p.grade) && (
                            <p className="text-[10px] text-slate-500 font-medium truncate mt-0.5">
                              {[p.brand, p.grade].filter(Boolean).join(" · ")}
                            </p>
                          )}
                          <div className="flex items-center justify-between mt-1">
                            <p className="text-xs font-black text-navy-900">₹{p.price}</p>
                            <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded">Stock: {p.stockQty}</span>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Recent Orders Preview Card */}
              <div className="bg-white border border-slate-200/90 rounded-2xl p-3.5 sm:p-5 shadow-xs">
                <div className="flex items-center justify-between mb-2.5 border-b border-slate-100 pb-2">
                  <h3 className="font-extrabold text-navy-900 text-sm">Recent Orders</h3>
                  <button
                    onClick={() => setActiveTab("orders")}
                    className="text-xs font-bold text-brand-600 hover:text-brand-700 cursor-pointer"
                  >
                    View All ({vendorOrders.length}) →
                  </button>
                </div>
                {vendorOrders.length === 0 ? (
                  <div className="text-center py-5 text-xs text-slate-400 font-medium">
                    No orders yet
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {vendorOrders.slice(0, 4).map((ord) => {
                      const orderTotal = ord.totalAmount || ord.total || 0;
                      const custName = typeof ord.customer === "object" ? (ord.customer?.name || "Customer") : (typeof ord.customer === "string" && !ord.customer.includes("cmt") && !ord.customer.includes("usr") ? ord.customer : "Customer");
                      const statusUpper = (ord.status || "PENDING").toUpperCase();
                      const statusConfig = {
                        PENDING: { label: "Pending", cls: "bg-sky-50 text-sky-700 border-sky-200" },
                        PROCESSING: { label: "Processing", cls: "bg-indigo-50 text-indigo-700 border-indigo-200" },
                        OUT_FOR_DELIVERY: { label: "Out For Delivery", cls: "bg-amber-50 text-amber-800 border-amber-200" },
                        DELIVERED: { label: "Delivered", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
                        CANCELLED: { label: "Cancelled", cls: "bg-rose-50 text-rose-700 border-rose-200" },
                      }[statusUpper] || { label: ord.status || "Pending", cls: "bg-slate-100 text-slate-700 border-slate-200" };

                      return (
                        <div key={ord.id} className="py-2.5 flex items-center justify-between gap-2.5 text-xs">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-navy-900 truncate max-w-[105px] xs:max-w-[130px] sm:max-w-[180px] block" title={custName}>
                                {custName}
                              </span>
                              <span className={`px-2 py-0.5 rounded-full text-[9.5px] font-bold border shrink-0 whitespace-nowrap leading-none ${statusConfig.cls}`}>
                                {statusConfig.label}
                              </span>
                            </div>
                            {ord.deliveryAddress?.address && (
                              <p className="text-[10px] text-slate-400 truncate max-w-[150px] sm:max-w-[220px] mt-0.5">{ord.deliveryAddress.address}</p>
                            )}
                          </div>
                          <div className="text-right shrink-0 pl-1">
                            <p className="font-black text-navy-900 text-xs sm:text-sm whitespace-nowrap">₹{Number(orderTotal).toLocaleString("en-IN")}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Right Sidebar */}
            <div className="space-y-4 sm:space-y-6">
              <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs">
                <h3 className="font-extrabold text-navy-900 text-sm mb-3">Quick Actions</h3>
                <div className="space-y-2">
                  <button
                    onClick={() => setShowCatalogModal(true)}
                    className="w-full bg-brand-50 hover:bg-brand-100 border border-brand-200 text-brand-700 text-xs font-bold p-3 rounded-xl flex items-center justify-between transition-colors cursor-pointer"
                  >
                    <span>🔍 Master Catalog ({masterProducts.length})</span>
                    <span>→</span>
                  </button>
                  <button
                    onClick={() => setActiveTab("products")}
                    className="w-full bg-slate-50 hover:bg-slate-100 border border-slate-200 text-navy-900 text-xs font-semibold p-3 rounded-xl flex items-center justify-between transition-colors cursor-pointer"
                  >
                    <span>📦 Manage Products ({vendorProducts.length})</span>
                    <span>→</span>
                  </button>
                  <button
                    onClick={() => setActiveTab("orders")}
                    className="w-full bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-semibold p-3 rounded-xl flex items-center justify-between transition-colors cursor-pointer"
                  >
                    <span>🛍️ Orders ({vendorOrders.length})</span>
                    <span>→</span>
                  </button>
                </div>
              </div>

              <div className="bg-gradient-to-br from-navy-900 to-slate-800 rounded-2xl p-4 sm:p-5 text-white shadow-xs">
                <span className="bg-amber-400 text-navy-900 text-[10px] font-extrabold px-2 py-0.5 rounded inline-block mb-1.5">
                  STANDARDIZED
                </span>
                <h4 className="font-bold text-sm">Verified Catalog</h4>
                <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                  All materials, brands & grades are verified by Admin & DR for {districtName}.
                </p>
              </div>

              {/* DR Partner Support Quick Card */}
              <div className="bg-emerald-50/90 border border-emerald-200 rounded-2xl p-4 shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm">📞</span>
                    <h4 className="font-black text-xs text-emerald-950">DR Partner Support</h4>
                  </div>
                  <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                    {districtName || "UP"}
                  </span>
                </div>
                <p className="text-[11px] text-emerald-800 font-medium">
                  Direct contact line for material approval & vendor help:
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <a
                    href="tel:+919956886527"
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-[11px] font-black py-2 rounded-xl text-center shadow-xs transition-all flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <span>📞</span>
                    <span>Call DR</span>
                  </a>
                  <a
                    href="https://wa.me/919956886527?text=Hello%20BuildCity%20Team,%20I%20am%20a%20Vendor%20Partner%20and%20need%20assistance"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 bg-white hover:bg-emerald-100 active:scale-95 text-emerald-800 border border-emerald-300 text-[11px] font-black py-2 rounded-xl text-center shadow-xs transition-all flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <span>💬</span>
                    <span>WhatsApp</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PAGE 2: MY PRODUCTS (DEDICATED FULL PAGE WITH ROUND BUBBLES & 2X2 GRID)  */}
      {/* ========================================================================= */}
      {activeTab === "products" && (
        <div className="space-y-3.5 sm:space-y-5">
          {/* Dedicated Products Page Header */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-3.5 sm:p-5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="font-black text-navy-900 text-base sm:text-lg tracking-tight">
                    📦 My Products
                  </h2>
                  {vendorStoreCategoryFilter !== "ALL" && (
                    <span className="text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <span>{vendorStoreCategoryFilter}</span>
                      <button
                        type="button"
                        onClick={() => setVendorStoreCategoryFilter("ALL")}
                        className="text-emerald-950 hover:text-red-600 ml-0.5 cursor-pointer"
                      >
                        ✕
                      </button>
                    </span>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowCatalogModal(true)}
                className="bg-brand-500 hover:bg-brand-600 active:scale-[0.98] text-white font-black text-xs px-4 py-2.5 rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
              >
                <span>➕</span>
                <span>Add from Master Catalog</span>
              </button>
            </div>

            {/* Fast Search Input */}
            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder="Search products, brand, or grade..."
                  className="w-full bg-slate-50 text-xs border border-slate-200 rounded-xl pl-9 pr-8 py-2 outline-none focus:border-brand-500 font-medium shadow-2xs"
                />
                <span className="absolute left-3 top-2.5 text-xs text-slate-400">🔍</span>
                {productSearch && (
                  <button
                    type="button"
                    onClick={() => setProductSearch("")}
                    className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* 🏷️ ROUND CATEGORY STORY BUBBLES */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-3 shadow-xs">
            <div className="flex items-center justify-between gap-2 mb-1 px-1">
              <span className="text-[11px] font-black text-navy-900 uppercase tracking-wider flex items-center gap-1">
                <span>🏷️ Categories</span>
              </span>
              <span className="text-[10px] text-slate-400 font-semibold">
                Tap to filter
              </span>
            </div>

            <div className="flex items-center gap-3 overflow-x-auto py-3 px-2 hide-scrollbar scroll-smooth">
              {/* All Items Bubble */}
              <button
                type="button"
                onClick={() => setVendorStoreCategoryFilter("ALL")}
                className="flex flex-col items-center shrink-0 cursor-pointer active:scale-95 transition-all text-center group"
              >
                <div
                  className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center shadow-xs transition-all ${
                    vendorStoreCategoryFilter === "ALL"
                      ? "bg-gradient-to-tr from-emerald-600 to-teal-500 text-white border-[3px] border-emerald-500 shadow-md shadow-emerald-500/20"
                      : "bg-slate-100 text-slate-700 border-2 border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <span className="text-xl">🌐</span>
                </div>
                <span className={`text-[10.5px] sm:text-[11px] mt-1.5 font-extrabold truncate max-w-[66px] ${
                  vendorStoreCategoryFilter === "ALL" ? "text-emerald-700 font-black" : "text-slate-700"
                }`}>
                  All Items
                </span>
                <span className="text-[9px] font-bold text-slate-400 -mt-0.5">
                  ({vendorProducts.length})
                </span>
              </button>

              {/* Individual Category Round Bubbles */}
              {allCategoryBubbles.map((cat) => {
                const count = vendorProducts.filter(
                  (p) =>
                    p.categoryId === cat.id ||
                    (p.categoryName || "").toLowerCase() === cat.name.toLowerCase()
                ).length;

                const isSelected =
                  vendorStoreCategoryFilter === cat.id ||
                  vendorStoreCategoryFilter.toLowerCase() === cat.name.toLowerCase();

                return (
                  <button
                    key={cat.id || cat.name}
                    type="button"
                    onClick={() => setVendorStoreCategoryFilter(cat.id || cat.name)}
                    className="flex flex-col items-center shrink-0 cursor-pointer active:scale-95 transition-all text-center group"
                  >
                    <div
                      className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white flex items-center justify-center p-1 shadow-xs transition-all overflow-hidden ${
                        isSelected
                          ? "border-[3px] border-emerald-500 shadow-md shadow-emerald-500/20"
                          : "border-2 border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <img
                        src={cat.img || resolveCategoryBubbleImage(cat.name)}
                        alt={cat.name}
                        className="w-full h-full object-cover rounded-full"
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = "/categories/cement.png";
                        }}
                      />
                    </div>
                    <span className={`text-[10.5px] sm:text-[11px] mt-1.5 font-extrabold truncate max-w-[68px] ${
                      isSelected ? "text-emerald-700 font-black" : "text-slate-700"
                    }`}>
                      {cat.name}
                    </span>
                    <span className="text-[9px] font-bold text-slate-400 -mt-0.5">
                      ({count})
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Products Empty States */}
          {vendorProducts.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200/90 p-8 text-center shadow-xs">
              <p className="text-3xl mb-1.5">📦</p>
              <h3 className="text-sm font-extrabold text-navy-900">No products listed</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Add products from the Master Catalog to start selling.
              </p>
              <button
                onClick={() => setShowCatalogModal(true)}
                className="mt-3 bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-xs cursor-pointer active:scale-95"
              >
                Browse Catalog
              </button>
            </div>
          ) : displayedVendorProducts.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200/90 p-6 text-center shadow-xs">
              <p className="text-2xl mb-1">🔍</p>
              <h3 className="text-xs font-extrabold text-navy-900">No products found</h3>
              <button
                onClick={() => {
                  setVendorStoreCategoryFilter("ALL");
                  setProductSearch("");
                }}
                className="mt-2.5 bg-emerald-600 text-white text-xs font-bold px-3.5 py-1.5 rounded-xl cursor-pointer"
              >
                Reset Filters ({vendorProducts.length})
              </button>
            </div>
          ) : (
            <>
              {/* 📱 2X2 MOBILE PRODUCT GRID (EXACT REFERENCE DESIGN FROM media_1789362449574.png) */}
              <div className="grid grid-cols-2 gap-2 sm:gap-3 md:hidden">
                {displayedVendorProducts.map((p) => {
                  const numPrice = Number(p.price) || 0;
                  const numMrp = Number(p.mrp) || numPrice;
                  const discountPct = numMrp > numPrice ? Math.round(((numMrp - numPrice) / numMrp) * 100) : 0;

                  return (
                    <div
                      key={p.id}
                      className="bg-white rounded-xl p-2 border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between relative group"
                    >
                      <div>
                        {/* Compact Product Image Section */}
                        <div className="relative aspect-4/3 rounded-lg bg-slate-50 overflow-hidden border border-slate-100 p-1.5 flex items-center justify-center mb-1.5">
                          <img
                            src={resolveProductImage(p.imageUrl, p.categoryName, p.name)}
                            alt={p.name}
                            loading="lazy"
                            decoding="async"
                            onError={(e) => {
                              e.currentTarget.onerror = null;
                              e.currentTarget.src = resolveProductImage(null, p.categoryName, p.name);
                            }}
                            className="w-full h-full object-contain mix-blend-multiply group-hover:scale-105 transition-transform duration-200"
                          />

                          {/* Top-Right Approval Status Pill */}
                          <span className={`absolute top-1 right-1 text-[8px] font-bold px-1.5 py-0.2 rounded leading-none shadow-2xs ${
                            p.approvalStatus === "PENDING_REVIEW"
                              ? "bg-amber-100 text-amber-800 border border-amber-200"
                              : p.approvalStatus === "REJECTED"
                              ? "bg-rose-100 text-rose-800 border border-rose-200"
                              : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          }`}>
                            {p.approvalStatus === "PENDING_REVIEW" ? "Review" : p.approvalStatus === "REJECTED" ? "Rejected" : "Live"}
                          </span>

                          {/* Bottom-Right Unit Pill */}
                          <span className="absolute bottom-1 right-1 bg-slate-900/70 text-white text-[7.5px] font-medium px-1 rounded leading-tight">
                            {p.unit || "unit"}
                          </span>
                        </div>

                        {/* Brand & Category line */}
                        <div className="flex items-center gap-1 text-[9.5px] text-slate-500 font-medium mb-0.5 truncate">
                          <span className="text-brand-600 font-bold truncate">🏷️ {p.brand || "Brand"}</span>
                          {p.grade && (
                            <>
                              <span>·</span>
                              <span className="text-slate-500 truncate">{p.grade}</span>
                            </>
                          )}
                        </div>

                        {/* Product Title */}
                        <h4 className="font-bold text-navy-950 text-xs leading-tight truncate" title={p.name}>
                          {p.name}
                        </h4>
                      </div>

                      <div className="mt-2 pt-1.5 border-t border-slate-100 space-y-2">
                        {/* Price & Stock Row */}
                        <div className="flex items-center justify-between gap-1">
                          <div className="flex items-baseline gap-0.5 truncate">
                            <span className="text-sm font-black text-navy-950">₹{p.price}</span>
                            <span className="text-[9.5px] text-slate-400 font-medium">/{p.unit || "unit"}</span>
                          </div>

                          <span className={`px-2 py-0.5 rounded-md text-[9.5px] font-bold shrink-0 ${
                            p.stockQty > 0
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200/80"
                              : "bg-rose-50 text-rose-700 border border-rose-200/80"
                          }`}>
                            {p.stockQty > 0 ? `${p.stockQty} left` : "Out of stock"}
                          </span>
                        </div>

                        {/* Sleek Edit Button */}
                        <button
                          type="button"
                          onClick={() => handleOpenEditProduct(p)}
                          className="w-full bg-slate-900 hover:bg-slate-800 active:scale-[0.97] text-white font-bold text-xs py-1.5 px-3 rounded-lg transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                        >
                          <svg className="w-3.5 h-3.5 text-brand-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                          <span>Edit</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* 🖥️ DESKTOP TABLE VIEW (PRESERVED CLEAN FOR >= md SCREENS) */}
              <div className="hidden md:block bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200/90 bg-slate-50/90 text-[11px] font-black text-slate-500 uppercase tracking-wider">
                      <th className="py-3.5 px-4">Product Details</th>
                      <th className="py-3.5 px-4">Category & Brand</th>
                      <th className="py-3.5 px-4">Type & Grade</th>
                      <th className="py-3.5 px-4">Approval Status</th>
                      <th className="py-3.5 px-4">Selling Price</th>
                      <th className="py-3.5 px-4">Stock Qty</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {displayedVendorProducts.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={resolveProductImage(p.imageUrl, p.categoryName, p.name)}
                              alt={p.name}
                              loading="lazy"
                              decoding="async"
                              onError={(e) => {
                                e.currentTarget.onerror = null;
                                e.currentTarget.src = resolveProductImage(null, p.categoryName, p.name);
                              }}
                              className="w-11 h-11 object-cover rounded-lg border border-slate-200 shrink-0 bg-white"
                            />
                            <div>
                              <span className="font-bold text-navy-900">{p.name}</span>
                              <p className="text-[10px] text-slate-400">Packaging: {p.unit}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px] font-semibold">
                            {p.categoryName || "General"}
                          </span>
                          <p className="text-slate-700 font-medium mt-0.5">🏷️ {p.brand}</p>
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="font-semibold text-slate-800">{p.type}</p>
                          <span className="bg-amber-50 text-amber-700 text-[10px] font-semibold px-1.5 py-0.5 rounded border border-amber-200 inline-block mt-0.5">
                            Grade: {p.grade}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          {p.approvalStatus === "PENDING_REVIEW" ? (
                            <span className="bg-amber-50 text-amber-700 border border-amber-200/80 px-2.5 py-1 rounded-full text-[11px] font-bold block w-fit">
                              ⏳ Under Review
                            </span>
                          ) : p.approvalStatus === "REJECTED" ? (
                            <span className="bg-rose-50 text-rose-700 border border-rose-200/80 px-2.5 py-1 rounded-full text-[11px] font-bold block w-fit">
                              🔴 Rejected
                            </span>
                          ) : (
                            <span className="bg-emerald-50 text-emerald-700 border border-emerald-200/80 px-2.5 py-1 rounded-full text-[11px] font-bold block w-fit">
                              🟢 Approved & Live
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-extrabold text-navy-900 text-sm">
                          <div className="flex items-baseline gap-1.5 flex-wrap">
                            <span>₹{p.price}</span>
                            {p.mrp > p.price && (
                              <span className="text-xs text-slate-400 line-through font-medium">₹{p.mrp}</span>
                            )}
                            {p.mrp > p.price && (
                              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-1.5 py-0.2 rounded">
                                {Math.round(((p.mrp - p.price) / p.mrp) * 100)}% OFF
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] font-normal text-slate-400 block mt-0.5">/{p.unit}</span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${p.stockQty > 0 ? "bg-emerald-50 text-emerald-700 border border-emerald-200/80" : "bg-rose-50 text-rose-700 border border-rose-200/80"}`}>
                            {p.stockQty} in stock
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => handleOpenEditProduct(p)}
                            className="text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-lg px-3 py-1.5 active:scale-[0.97] transition-all duration-200 cursor-pointer shadow-2xs inline-flex items-center gap-1.5"
                          >
                            <svg className="w-3.5 h-3.5 text-brand-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                            <span>Edit</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* PAGE 3: CUSTOMER ORDERS (DEDICATED FULL PAGE VIEW)                         */}
      {/* ========================================================================= */}
      {activeTab === "orders" && (
        <div className="space-y-3.5 sm:space-y-5">
          {/* Dedicated Orders Page Header */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-3.5 sm:p-5 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="font-black text-navy-900 text-base sm:text-lg tracking-tight">
                    🛍️ Orders
                  </h2>
                  <span className="bg-emerald-50 text-emerald-700 font-extrabold text-[10px] px-2 py-0.5 rounded-full border border-emerald-200">
                    {filteredVendorOrders.length}
                  </span>
                  {orderSearch && (
                    <span className="bg-brand-50 text-brand-700 font-extrabold text-[10px] px-2 py-0.5 rounded-full border border-brand-200">
                      &quot;{orderSearch}&quot;
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Store orders in {districtName}.
                </p>
              </div>

              {/* 2 Dedicated Segmented Tabs: Active vs Completed */}
              <div className="grid grid-cols-2 p-1 bg-slate-100/90 rounded-2xl border border-slate-200/80 gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setOrderSectionTab("ACTIVE");
                    setOrderStatusFilter("ALL");
                  }}
                  className={`py-2.5 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    orderSectionTab === "ACTIVE"
                      ? "bg-white text-navy-900 shadow-sm border border-slate-200/80"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  <span>⚡ Active</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                    orderSectionTab === "ACTIVE" ? "bg-amber-100 text-amber-900" : "bg-slate-200 text-slate-600"
                  }`}>
                    {activeOrders.length}
                  </span>
                  {pendingOrdersCount > 0 && (
                    <span className="hidden sm:inline text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-rose-50 text-rose-700 border border-rose-200">
                      {pendingOrdersCount} Pending
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setOrderSectionTab("COMPLETED");
                    setOrderStatusFilter("ALL");
                  }}
                  className={`py-2.5 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    orderSectionTab === "COMPLETED"
                      ? "bg-white text-emerald-900 shadow-sm border border-slate-200/80"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <span>✓ Delivered</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                    orderSectionTab === "COMPLETED" ? "bg-emerald-100 text-emerald-900" : "bg-slate-200 text-slate-600"
                  }`}>
                    {completedOrders.length}
                  </span>
                </button>
              </div>

              {/* Contextual Sub-Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 hide-scrollbar">
                {orderSectionTab === "ACTIVE" ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setOrderStatusFilter("ALL")}
                      className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all shrink-0 cursor-pointer ${
                        orderStatusFilter === "ALL"
                          ? "bg-navy-900 text-white font-black shadow-2xs"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200/60"
                      }`}
                    >
                      All Active ({activeOrders.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setOrderStatusFilter("PENDING")}
                      className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1 ${
                        orderStatusFilter === "PENDING"
                          ? "bg-amber-500 text-white font-black shadow-2xs"
                          : "bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200"
                      }`}
                    >
                      <span>⏳ Pending Action</span>
                      <span className="px-1 py-0.2 bg-white/30 rounded text-[9px]">{activeOrders.filter(o => (o.status || "PENDING").toUpperCase() === "PENDING").length}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setOrderStatusFilter("PROCESSING")}
                      className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1 ${
                        orderStatusFilter === "PROCESSING"
                          ? "bg-sky-600 text-white font-black shadow-2xs"
                          : "bg-sky-50 text-sky-800 hover:bg-sky-100 border border-sky-200"
                      }`}
                    >
                      <span>⚙️ Processing</span>
                      <span className="px-1 py-0.2 bg-white/30 rounded text-[9px]">{activeOrders.filter(o => (o.status || "").toUpperCase() === "PROCESSING").length}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setOrderStatusFilter("OUT_FOR_DELIVERY")}
                      className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1 ${
                        orderStatusFilter === "OUT_FOR_DELIVERY"
                          ? "bg-indigo-600 text-white font-black shadow-2xs"
                          : "bg-indigo-50 text-indigo-800 hover:bg-indigo-100 border border-indigo-200"
                      }`}
                    >
                      <span>🚚 Out for Delivery</span>
                      <span className="px-1 py-0.2 bg-white/30 rounded text-[9px]">{activeOrders.filter(o => (o.status || "").toUpperCase() === "OUT_FOR_DELIVERY").length}</span>
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setOrderStatusFilter("ALL")}
                      className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all shrink-0 cursor-pointer ${
                        orderStatusFilter === "ALL"
                          ? "bg-navy-900 text-white font-black shadow-2xs"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200/60"
                      }`}
                    >
                      All History ({completedOrders.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setOrderStatusFilter("DELIVERED")}
                      className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1 ${
                        orderStatusFilter === "DELIVERED"
                          ? "bg-emerald-600 text-white font-black shadow-2xs"
                          : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200"
                      }`}
                    >
                      <span>✓ Delivered</span>
                      <span className="px-1 py-0.2 bg-white/30 rounded text-[9px]">{completedOrders.filter(o => (o.status || "").toUpperCase() === "DELIVERED").length}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setOrderStatusFilter("CANCELLED")}
                      className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1 ${
                        orderStatusFilter === "CANCELLED"
                          ? "bg-rose-600 text-white font-black shadow-2xs"
                          : "bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200"
                      }`}
                    >
                      <span>✕ Cancelled</span>
                      <span className="px-1 py-0.2 bg-white/30 rounded text-[9px]">{completedOrders.filter(o => (o.status || "").toUpperCase() === "CANCELLED").length}</span>
                    </button>
                  </>
                )}

                {/* Repeat Buyers Special Filter */}
                <button
                  type="button"
                  onClick={() => setOrderStatusFilter(orderStatusFilter === "REPEAT_BUYERS" ? "ALL" : "REPEAT_BUYERS")}
                  className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1 ${
                    orderStatusFilter === "REPEAT_BUYERS"
                      ? "bg-amber-500 text-white font-black shadow-xs"
                      : "bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-300/80"
                  }`}
                >
                  <span>👑</span>
                  <span>Repeat Buyers</span>
                </button>
              </div>
            </div>

            {/* Fast Live Search Bar */}
            <div className="relative">
              <input
                type="text"
                value={orderSearch}
                onChange={(e) => setOrderSearch(e.target.value)}
                placeholder="Search orders by customer, phone, or ID..."
                className="w-full bg-slate-50 hover:bg-slate-100/70 focus:bg-white text-xs border border-slate-200/90 focus:border-brand-500 rounded-xl pl-3.5 pr-8 py-2 outline-none transition-all font-medium text-navy-900 placeholder:text-slate-400 shadow-2xs"
              />
              {orderSearch && (
                <button
                  type="button"
                  onClick={() => setOrderSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 text-xs font-black p-1 cursor-pointer"
                  title="Clear search"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {vendorOrders.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200/90 p-8 text-center shadow-xs">
              <p className="text-3xl mb-1.5">🛍️</p>
              <h3 className="text-sm font-extrabold text-navy-900">No orders yet</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                New customer orders will appear here in real time.
              </p>
            </div>
          ) : filteredVendorOrders.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200/90 p-6 text-center shadow-xs">
              <p className="text-2xl mb-1">🔍</p>
              <h3 className="text-xs font-extrabold text-navy-900">
                {orderSearch ? `No orders matching "${orderSearch}"` : "No matching orders"}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setOrderStatusFilter("ALL");
                  setOrderSearch("");
                }}
                className="mt-3 bg-brand-500 hover:bg-brand-600 active:scale-95 text-white text-xs font-bold px-4 py-2 rounded-xl cursor-pointer transition-all shadow-xs"
              >
                Show All Orders ({vendorOrders.length})
              </button>
            </div>
          ) : (
            <>
              {/* 📱 MOBILE TOUCH-FRIENDLY ORDER CARDS */}
              <div className="space-y-4 md:hidden">
                {filteredVendorOrders.map((ord) => {
                  const rawAddr = ord.address;
                  const isObj = typeof rawAddr === "object" && rawAddr !== null;
                  const isStr = typeof rawAddr === "string" && rawAddr.trim().length > 0;

                  let custFullName = (isObj && (rawAddr.fullName || rawAddr.name)) || ord.customer?.name || (typeof ord.customer === "string" ? ord.customer : "Customer");
                  let custPhone = (isObj && rawAddr.phone) || ord.customer?.phone || ord.phone || "";
                  let streetAddr = isObj ? (rawAddr.street || rawAddr.line || rawAddr.address) : (isStr ? rawAddr : null);
                  let cityAddr = isObj ? rawAddr.city : (ord.districtName || ord.regionName || "");

                  if (!streetAddr) {
                    streetAddr = `Site Delivery Location (${cityAddr || districtName})`;
                  }

                  const formattedOrderId = formatShortId(ord.id || ord.orderNumber, "ORD");
                  const customerStats = getCustomerStats(ord);
                  const deliveryFee = Number(ord.deliveryCharge ?? ord.deliveryFee ?? ord.shippingFee ?? ord.deliveryAmount ?? 0);

                  // Calculate Items Subtotal & Grand Total (Items + Delivery Fee)
                  let itemsSubtotal = 0;
                  if (Array.isArray(ord.items) && ord.items.length > 0) {
                    itemsSubtotal = ord.items.reduce((sum, it) => {
                      const itemQty = Number(it.quantity || it.qty || it.count || 1);
                      const rawPrice = it.price ?? it.unitPrice ?? it.sellingPrice ?? it.rate;
                      let line = 0;
                      if (rawPrice !== undefined && rawPrice !== null && !isNaN(Number(rawPrice)) && Number(rawPrice) > 0) {
                        line = Number(rawPrice) * itemQty;
                      } else if (it.totalPrice || it.total || it.amount) {
                        line = Number(it.totalPrice || it.total || it.amount) || 0;
                      }
                      return sum + line;
                    }, 0);
                  }
                  if (itemsSubtotal === 0) {
                    itemsSubtotal = Number(ord.vendorItemsTotal || ord.totalAmount || ord.total || 0);
                  }
                  const rawTotal = Number(ord.totalAmount || ord.total || itemsSubtotal);
                  const grandTotal = (rawTotal > itemsSubtotal && rawTotal >= itemsSubtotal + deliveryFee)
                    ? rawTotal
                    : (itemsSubtotal + deliveryFee);

                  const orderStatusUpper = (ord.status || "PENDING").toUpperCase();
                  const isPending = orderStatusUpper === "PENDING";
                  const isDelivered = orderStatusUpper === "DELIVERED";
                  const isCancelled = orderStatusUpper === "CANCELLED";

                  // Distinctive border accent for instant visual separation between cards
                  const statusAccentClass = isPending
                    ? "border-l-4 border-l-amber-500"
                    : isDelivered
                    ? "border-l-4 border-l-emerald-500"
                    : isCancelled
                    ? "border-l-4 border-l-slate-400"
                    : "border-l-4 border-l-sky-500";

                  return (
                    <div
                      key={ord.id}
                      className={`bg-white rounded-2xl p-3.5 border border-slate-200 shadow-sm hover:shadow-md ${statusAccentClass} space-y-2.5 transition-all`}
                    >
                      {/* Top Row: Customer Info, Date & Call Button */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-extrabold text-navy-950 text-xs truncate">
                              👤 {custFullName}
                            </span>
                            {customerStats.isRepeat && (
                              <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 border border-amber-300/90 px-1.5 py-0.2 rounded text-[9px] font-black">
                                <span>👑 Repeat ({customerStats.orderCount})</span>
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                            {formatDateTimeIST(ord.createdAt || ord.date)}
                            {custPhone && <span> • 📱 {custPhone}</span>}
                          </p>
                        </div>

                        {custPhone && (
                          <a
                            href={`tel:${custPhone}`}
                            className="bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-[11px] px-2.5 py-1 rounded-lg shadow-2xs flex items-center gap-1 shrink-0"
                          >
                            <span>📞</span>
                            <span>Call</span>
                          </a>
                        )}
                      </div>

                      {/* Site Delivery Address (Compact) */}
                      <div className="px-2 py-1 bg-slate-50 border border-slate-200/80 rounded-lg flex items-start gap-1 text-slate-700">
                        <span className="text-[11px] shrink-0 mt-0.5">📍</span>
                        <p className="text-[11px] font-medium text-slate-700 leading-tight truncate">
                          {streetAddr}{cityAddr ? `, ${cityAddr}` : ""}
                        </p>
                      </div>

                      {/* Ordered Items */}
                      <div className="space-y-1 pt-0.5">
                        {Array.isArray(ord.items) && ord.items.map((it, idx) => {
                          const itemQty = Number(it.quantity || it.qty || it.count || 1);
                          const rawPrice = it.price ?? it.unitPrice ?? it.sellingPrice ?? it.rate;
                          let lineTotal = 0;
                          if (rawPrice !== undefined && rawPrice !== null && !isNaN(Number(rawPrice)) && Number(rawPrice) > 0) {
                            lineTotal = Number(rawPrice) * itemQty;
                          } else if (it.totalPrice || it.total || it.amount) {
                            lineTotal = Number(it.totalPrice || it.total || it.amount) || 0;
                          } else if (Array.isArray(ord.items) && ord.items.length === 1 && itemsSubtotal > 0) {
                            lineTotal = itemsSubtotal;
                          } else if (itemsSubtotal > 0 && ord.items.length > 0) {
                            lineTotal = Math.round(itemsSubtotal / ord.items.length);
                          }

                          return (
                            <div key={idx} className="flex items-center justify-between text-xs py-0.5 border-b border-slate-50">
                              <span className="font-bold text-navy-900 truncate pr-2 text-[11px]">
                                {it.productName || it.name || "Material"} <span className="text-slate-400 font-normal">x{itemQty}</span>
                              </span>
                              <span className="font-extrabold text-navy-900 shrink-0 text-xs">
                                ₹{(Number(lineTotal) || 0).toLocaleString("en-IN")}
                              </span>
                            </div>
                          );
                        })}
                      </div>

                      {/* Total, Delivery Charge & Status Selector */}
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                        <div>
                          <div className="flex items-baseline gap-1">
                            <span className="text-[10px] text-slate-400 font-bold">Total:</span>
                            <span className="text-sm font-black text-navy-900">₹{grandTotal.toLocaleString("en-IN")}</span>
                          </div>
                          <span className="text-[10px] text-slate-500 font-medium block">
                            (Items: ₹{itemsSubtotal.toLocaleString("en-IN")} + 🚚 Delivery: ₹{deliveryFee})
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {updatingOrderId === ord.id ? (
                            <div className="flex items-center gap-1.5 px-2 py-1 bg-brand-50 border border-brand-200 rounded-lg text-brand-700 font-extrabold text-[11px] shadow-2xs animate-pulse">
                              <span className="w-3 h-3 border-2 border-brand-600 border-t-transparent rounded-full animate-spin shrink-0" />
                              <span>Updating...</span>
                            </div>
                          ) : (
                            <select
                              value={ord.status || "PENDING"}
                              onChange={(e) => handleStatusChange(ord.id, e.target.value)}
                              className="bg-slate-50 hover:bg-slate-100 border border-slate-200 font-extrabold text-[11px] text-navy-900 rounded-lg px-2 py-1 outline-none focus:border-brand-500 cursor-pointer shadow-2xs transition-colors"
                            >
                              <option value="PENDING">⏳ PENDING</option>
                              <option value="PROCESSING">⚙️ PROCESSING</option>
                              <option value="OUT_FOR_DELIVERY">🚚 OUT FOR DELIVERY</option>
                              <option value="DELIVERED">✅ DELIVERED</option>
                              <option value="CANCELLED">❌ CANCELLED</option>
                            </select>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* 🖥️ DESKTOP ORDERS TABLE */}
              <div className="hidden md:block bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200/90 bg-slate-50/90 text-[11px] font-black text-slate-500 uppercase tracking-wider">
                      <th className="py-3.5 px-4">Order ID</th>
                      <th className="py-3.5 px-4 min-w-[220px]">Customer Details & Address</th>
                      <th className="py-3.5 px-4">Ordered Items</th>
                      <th className="py-3.5 px-4">Total Amount</th>
                      <th className="py-3.5 px-4">Change Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredVendorOrders.map((ord) => {
                      const itemsSummary = Array.isArray(ord.items)
                        ? ord.items.map((i) => `${i.productName || i.name} (x${i.quantity})`).join(", ")
                        : ord.items || "Order Items";
                      const rawAddr = ord.address;
                      const isObj = typeof rawAddr === "object" && rawAddr !== null;
                      const isStr = typeof rawAddr === "string" && rawAddr.trim().length > 0;

                      let custFullName = (isObj && (rawAddr.fullName || rawAddr.name)) || ord.customer?.name || (typeof ord.customer === "string" ? ord.customer : "Customer");
                      let custPhone = (isObj && rawAddr.phone) || ord.customer?.phone || ord.phone || "";
                      let streetAddr = isObj ? (rawAddr.street || rawAddr.line || rawAddr.address) : (isStr ? rawAddr : null);
                      let cityAddr = isObj ? rawAddr.city : (ord.districtName || ord.regionName || "");

                      if (!streetAddr) {
                        streetAddr = `Site Delivery Location (${cityAddr || districtName})`;
                      }

                      const formattedOrderId = formatShortId(ord.id || ord.orderNumber, "ORD");
                      const customerStats = getCustomerStats(ord);
                      const deliveryFee = Number(ord.deliveryCharge ?? ord.deliveryFee ?? ord.shippingFee ?? ord.deliveryAmount ?? 0);

                      // Calculate Items Subtotal & Grand Total (Items + Delivery Fee)
                      let itemsSubtotal = 0;
                      if (Array.isArray(ord.items) && ord.items.length > 0) {
                        itemsSubtotal = ord.items.reduce((sum, it) => {
                          const itemQty = Number(it.quantity || it.qty || it.count || 1);
                          const rawPrice = it.price ?? it.unitPrice ?? it.priceAtPurchase ?? it.sellingPrice ?? it.rate;
                          let line = 0;
                          if (rawPrice !== undefined && rawPrice !== null && !isNaN(Number(rawPrice)) && Number(rawPrice) > 0) {
                            line = Number(rawPrice) * itemQty;
                          } else if (it.totalPrice || it.total || it.amount) {
                            line = Number(it.totalPrice || it.total || it.amount) || 0;
                          }
                          return sum + line;
                        }, 0);
                      }
                      if (itemsSubtotal === 0) {
                        itemsSubtotal = Number(ord.vendorItemsTotal || ord.totalAmount || ord.total || 0);
                      }
                      const rawTotal = Number(ord.totalAmount || ord.total || itemsSubtotal);
                      const grandTotal = (rawTotal > itemsSubtotal && rawTotal >= itemsSubtotal + deliveryFee)
                        ? rawTotal
                        : (itemsSubtotal + deliveryFee);

                      const isPending = (ord.status || "PENDING").toUpperCase() === "PENDING";

                      return (
                        <tr
                          key={ord.id}
                          className={`transition-colors ${
                            isPending
                              ? "bg-amber-50/40 hover:bg-amber-50/70 border-l-4 border-l-amber-500"
                              : "hover:bg-slate-50/80"
                          }`}
                        >
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-1.5">
                              <span className="font-extrabold text-brand-700 tracking-wide text-xs block">{formattedOrderId}</span>
                              {isPending && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-amber-500 text-white animate-pulse">
                                  NEW
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-slate-400 font-medium block mt-0.5">{formatDateTimeIST(ord.createdAt || ord.date)}</span>
                          </td>
                          <td className="py-3.5 px-4 text-slate-800 min-w-[240px]">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className="font-extrabold text-navy-900 text-xs">👤 Recipient: {custFullName}</p>
                              {customerStats.isRepeat ? (
                                <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 border border-amber-300/90 px-1.5 py-0.2 rounded-full text-[9px] font-black shadow-2xs">
                                  <span>👑 Repeat ({customerStats.orderCount})</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 bg-slate-200/70 text-slate-600 px-1.5 py-0.2 rounded text-[9px] font-medium">
                                  🌱 1st Order
                                </span>
                              )}
                            </div>
                            {custPhone && (
                              <p className="text-[11px] text-slate-700 font-bold mt-0.5 flex items-center gap-1.5">
                                <span>📱 Contact: {custPhone}</span>
                                <a href={`tel:${custPhone}`} className="text-emerald-700 hover:underline font-extrabold">📞 Call</a>
                              </p>
                            )}
                            <div className="mt-1 px-2.5 py-1 bg-slate-50 border border-slate-200/80 rounded-lg flex items-center gap-1.5 text-slate-700">
                              <span className="text-xs shrink-0">📍</span>
                              <p className="text-[11px] font-medium text-slate-800 truncate">{streetAddr}{cityAddr ? `, ${cityAddr}` : ""}</p>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 min-w-[260px] max-w-[340px]">
                            <div className="space-y-1 max-h-56 overflow-y-auto pr-1">
                              {Array.isArray(ord.items) && ord.items.map((it, idx) => {
                                const itemQty = Number(it.quantity || it.qty || it.count || 1);
                                const rawPrice = it.price ?? it.unitPrice ?? it.priceAtPurchase ?? it.sellingPrice ?? it.rate;
                                let lineTotal = 0;
                                if (rawPrice !== undefined && rawPrice !== null && !isNaN(Number(rawPrice)) && Number(rawPrice) > 0) {
                                  lineTotal = Number(rawPrice) * itemQty;
                                } else if (it.totalPrice || it.total || it.amount) {
                                  lineTotal = Number(it.totalPrice || it.total || it.amount) || 0;
                                } else if (itemsSubtotal > 0 && ord.items.length > 0) {
                                  lineTotal = Math.round(itemsSubtotal / ord.items.length);
                                }

                                return (
                                  <div key={idx} className="flex items-center justify-between text-xs py-1 border-b border-slate-100/80 last:border-0">
                                    <div className="flex items-center gap-1.5 min-w-0 pr-2">
                                      <span className="w-1.5 h-1.5 rounded-full bg-brand-500 shrink-0" />
                                      <span className="font-bold text-navy-900 truncate text-[11.5px]" title={it.productName || it.name}>
                                        {it.productName || it.name || "Material"}
                                      </span>
                                      <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded shrink-0">
                                        x{itemQty}
                                      </span>
                                    </div>
                                    <span className="font-extrabold text-navy-950 shrink-0 text-xs">
                                      ₹{(Number(lineTotal) || 0).toLocaleString("en-IN")}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <p className="font-black text-navy-900 text-sm">₹{grandTotal.toLocaleString("en-IN")}</p>
                            <span className="text-[10px] text-slate-400 font-medium block mt-0.5">
                              Items: ₹{itemsSubtotal.toLocaleString("en-IN")} + 🚚 {deliveryFee > 0 ? `₹${deliveryFee}` : "Free"}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            {updatingOrderId === ord.id ? (
                              <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-brand-50 border border-brand-200 rounded-lg text-brand-700 font-extrabold text-xs shadow-2xs animate-pulse">
                                <span className="w-3 h-3 border-2 border-brand-600 border-t-transparent rounded-full animate-spin shrink-0" />
                                <span>Updating...</span>
                              </div>
                            ) : (
                              <select
                                value={ord.status || "PENDING"}
                                onChange={(e) => handleStatusChange(ord.id, e.target.value)}
                                className="bg-slate-50 hover:bg-slate-100 border border-slate-200 font-bold text-xs text-navy-900 rounded-lg px-2.5 py-1.5 outline-none focus:border-brand-500 cursor-pointer shadow-2xs transition-colors"
                              >
                                <option value="PENDING">⏳ PENDING</option>
                                <option value="PROCESSING">⚙️ PROCESSING</option>
                                <option value="OUT_FOR_DELIVERY">🚚 OUT FOR DELIVERY</option>
                                <option value="DELIVERED">✅ DELIVERED</option>
                                <option value="CANCELLED">❌ CANCELLED</option>
                              </select>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* PAGE 4: VENDOR PROFILE & BUSINESS ACCOUNT (DEDICATED FULL VIEW)           */}
      {/* ========================================================================= */}
      {activeTab === "profile" && (
        <div className="space-y-4 sm:space-y-6">
          {/* Back Navigation Bar */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setActiveTab("overview")}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:text-brand-600 hover:border-brand-200 text-xs font-bold shadow-2xs transition-all cursor-pointer active:scale-95"
            >
              <span>← Back to Store Info</span>
            </button>
            <span className="text-xs font-bold text-slate-400">Partner Profile</span>
          </div>

          {/* Profile Card Header */}
          <div className="bg-navy-900 rounded-2xl sm:rounded-3xl p-5 sm:p-7 text-white shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 w-80 h-80 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-brand-500 to-amber-500 text-white font-black text-2xl flex items-center justify-center shadow-md border-2 border-white/20 shrink-0">
                  {(ownerName || "V").charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">{ownerName}</h2>
                    <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-black px-2 py-0.5 rounded-md">
                      ✓ Verified Partner
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-0.5">🏪 {shopName}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">📍 {districtName}, Uttar Pradesh</p>
                </div>
              </div>

              <button
                type="button"
                onClick={logout}
                className="bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-500/30 text-xs font-bold px-4 py-2 rounded-xl transition-colors cursor-pointer self-start sm:self-auto flex items-center gap-1.5"
              >
                <span>🚪</span>
                <span>Logout Account</span>
              </button>
            </div>
          </div>

          {/* Business & Account Details Card */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-6 shadow-xs space-y-4">
            <h3 className="font-extrabold text-navy-900 text-sm border-b border-slate-100 pb-2.5 flex items-center justify-between">
              <span>👤 Partner Account Information</span>
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                Active Partner
              </span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Shop Name</span>
                <p className="font-extrabold text-navy-900 text-sm mt-0.5">{shopName}</p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Owner Name</span>
                <p className="font-extrabold text-navy-900 text-sm mt-0.5">{ownerName}</p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Registered Mobile</span>
                <p className="font-extrabold text-navy-900 text-sm mt-0.5">📱 {vendorPhone}</p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Registered Email</span>
                <p className="font-extrabold text-navy-900 text-sm mt-0.5">✉️ {user?.email || "Not specified"}</p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Operating Region</span>
                <p className="font-extrabold text-navy-900 text-sm mt-0.5">📍 {districtName}, UP</p>
              </div>
            </div>
          </div>

          {/* Quick Stats Summary */}
          <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
            <div className="bg-white rounded-2xl border border-slate-200/90 p-3.5 sm:p-4 text-center shadow-xs">
              <span className="text-xl">📦</span>
              <p className="text-base sm:text-lg font-black text-navy-900 mt-1">{vendorProducts.length}</p>
              <span className="text-[10px] sm:text-xs text-slate-500 font-bold block">Materials Listed</span>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/90 p-3.5 sm:p-4 text-center shadow-xs">
              <span className="text-xl">🛍️</span>
              <p className="text-base sm:text-lg font-black text-navy-900 mt-1">{vendorOrders.length}</p>
              <span className="text-[10px] sm:text-xs text-slate-500 font-bold block">Total Orders</span>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/90 p-3.5 sm:p-4 text-center shadow-xs">
              <span className="text-xl">💰</span>
              <p className="text-base sm:text-lg font-black text-navy-900 mt-1">₹{totalRevenue}</p>
              <span className="text-[10px] sm:text-xs text-slate-500 font-bold block">Revenue</span>
            </div>
          </div>

          {/* Help & Support Card */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs space-y-3">
            <h4 className="font-extrabold text-navy-900 text-xs sm:text-sm">Support & Partner Help</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              If you need help adding new materials to your catalog or want to update your delivery district, contact your assigned District Representative (DR) or BuildCity Partner Support.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <a
                href="tel:+919956886527"
                className="bg-brand-50 hover:bg-brand-100 text-brand-700 border border-brand-200 text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-colors active:scale-95 cursor-pointer"
              >
                <span>📞</span>
                <span>Contact DR Support (+91 9956886527)</span>
              </a>
              <a
                href="https://wa.me/919956886527?text=Hello%20BuildCity%20Team,%20I%20am%20a%20Vendor%20Partner%20and%20need%20assistance"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-colors active:scale-95 cursor-pointer"
              >
                <span>💬</span>
                <span>WhatsApp DR Support</span>
              </a>
              <button
                type="button"
                onClick={logout}
                className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer active:scale-95 ml-auto"
              >
                <span>🚪</span>
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      )}

      </div>

      {/* MODAL 1: CHOOSE FROM MASTER CATALOG MODAL (Full page on mobile, sleek dialog on desktop) */}
      {showCatalogModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 sm:backdrop-blur-sm sm:p-4 flex flex-col sm:items-center sm:justify-center">
          <div className="bg-white w-full h-[100dvh] sm:h-auto sm:max-h-[88vh] sm:max-w-3xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            {/* Modal Header (Fixed at top) */}
            <div className="flex items-center justify-between border-b border-slate-200/80 px-4 py-3 sm:px-6 sm:py-3.5 bg-slate-50 shrink-0">
              <div className="min-w-0 pr-2">
                <h3 className="font-black text-navy-900 text-sm sm:text-base truncate">Choose from Master Product Catalog</h3>
                <p className="text-[11px] sm:text-xs text-slate-500 line-clamp-1">Verified products pre-configured by Admin & DR.</p>
              </div>
              <button
                onClick={() => {
                  setShowCatalogModal(false);
                  setSelectedMasterProd(null);
                }}
                className="w-8 h-8 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-700 flex items-center justify-center font-bold text-sm leading-none shrink-0 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Filter controls (Fixed under header so user can always filter / search) */}
            <div className="px-3 py-2.5 sm:px-6 sm:py-3 bg-white border-b border-slate-200 shrink-0">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar shrink-0">
                  <button
                    onClick={() => setSelectedCategoryFilter("ALL")}
                    className={`text-[11px] sm:text-xs font-bold px-3 py-1.5 rounded-lg border transition-all duration-200 cursor-pointer shrink-0 whitespace-nowrap active:scale-[0.98] ${
                      selectedCategoryFilter === "ALL"
                        ? "bg-navy-900 text-white border-navy-900 shadow-2xs"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    All Categories ({masterProducts.length})
                  </button>
                  {categories.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setSelectedCategoryFilter(c.id)}
                      className={`text-[11px] sm:text-xs font-bold px-3 py-1.5 rounded-lg border transition-all duration-200 cursor-pointer whitespace-nowrap shrink-0 active:scale-[0.98] ${
                        selectedCategoryFilter === c.id
                          ? "bg-navy-900 text-white border-navy-900 shadow-2xs"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>

                <input
                  type="text"
                  value={catalogSearch}
                  onChange={(e) => setCatalogSearch(e.target.value)}
                  placeholder="Search brand, product, type..."
                  className="bg-slate-50 text-xs border border-slate-200 rounded-xl px-3.5 py-2 outline-none focus:border-brand-500 w-full sm:w-60 shadow-2xs"
                />
              </div>
            </div>

            {/* Scrollable Products List & Offer Config Drawer */}
            <div className="flex-1 min-h-0 overflow-y-auto p-3.5 sm:p-6 space-y-3 pb-24 sm:pb-6">

              {/* Master Products List */}
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white">
                {filteredMasterProducts.length === 0 ? (
                  <div className="text-center py-10">
                    <p className="text-xs text-slate-500 font-semibold">No master products found in this filter.</p>
                  </div>
                ) : (
                  filteredMasterProducts.map((mp) => {
                    const alreadyInStore = vendorProducts.some(
                      (vp) => vp.masterProductId === mp.id || vp.name === mp.name
                    );
                    const isSelected = selectedMasterProd?.id === mp.id;

                    return (
                      <div
                        key={mp.id}
                        className={`p-3 sm:p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 transition-colors duration-150 ${
                          isSelected
                            ? "bg-brand-50/80 ring-1 ring-brand-300"
                            : "hover:bg-slate-50/80"
                        }`}
                      >
                        <div className="flex items-start sm:items-center gap-2.5 sm:gap-3 min-w-0">
                          <img
                            src={resolveProductImage(mp.imageUrl, mp.categoryName, mp.name)}
                            alt={mp.name}
                            loading="lazy"
                            decoding="async"
                            onError={(e) => {
                              e.currentTarget.onerror = null;
                              e.currentTarget.src = resolveProductImage(null, mp.categoryName, mp.name);
                            }}
                            className="w-14 h-14 sm:w-12 sm:h-12 object-cover rounded-xl border border-slate-200 shrink-0 bg-slate-100"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="font-extrabold text-xs sm:text-sm text-navy-900 leading-snug">{mp.name}</p>
                            <div className="flex flex-wrap items-center gap-1.5 mt-1">
                              <span className="bg-slate-100 text-slate-700 font-bold px-1.5 py-0.2 rounded text-[10px]">
                                {mp.categoryName}
                              </span>
                              <span className="text-[10px] font-semibold text-brand-600">🏷️ {mp.brand}</span>
                              {mp.grade && (
                                <span className="bg-amber-50 text-amber-700 text-[10px] font-semibold px-1.5 py-0.2 rounded border border-amber-200">
                                  {mp.grade}
                                </span>
                              )}
                              <span className="text-[10px] text-slate-400">Unit: {mp.unit}</span>
                            </div>
                          </div>
                        </div>

                        {/* Price & Action Row (Stacked cleanly on mobile) */}
                        <div className="flex items-center justify-between sm:flex-col sm:items-end gap-2 pt-1 sm:pt-0 border-t sm:border-t-0 border-slate-100 shrink-0">
                          <div className="text-left sm:text-right">
                            <span className="text-[9px] font-semibold text-slate-400 block sm:leading-none sm:mb-0.5">Suggested Price</span>
                            <span className="font-black text-navy-900 text-sm">₹{mp.suggestedPrice}</span>
                          </div>

                          <div className="shrink-0">
                            {alreadyInStore ? (
                              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1.5 rounded-lg inline-flex items-center gap-1 shadow-2xs">
                                ✓ In Your Store
                              </span>
                            ) : isSelected ? (
                              <span className="text-[10px] font-bold text-brand-700 bg-brand-100 border border-brand-300 px-2.5 py-1.5 rounded-lg inline-flex items-center gap-1 animate-pulse">
                                Configuring Offer ↓
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleOpenMasterProductSelect(mp)}
                                className="bg-brand-500 hover:bg-brand-600 active:scale-[0.98] text-white font-bold text-xs px-3.5 py-1.5 rounded-lg shadow-xs transition-all cursor-pointer"
                              >
                                + Add to My Store
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Sub-Modal / Form for Price, MRP, Discount & Stock when Master Product selected */}
              {selectedMasterProd && (
                <form onSubmit={handleAddMasterProductToStore} className="bg-brand-50/70 border border-brand-200 rounded-xl p-3.5 sm:p-4 space-y-3 shrink-0">
                  <div className="flex items-center justify-between border-b border-brand-200/60 pb-2">
                    <div>
                      <p className="text-xs font-bold text-brand-900">Set Live Offer & Stock for &quot;{selectedMasterProd.name}&quot;</p>
                      <p className="text-[11px] text-slate-500">Set custom price and discount for your store listing.</p>
                    </div>
                    <button type="button" onClick={() => setSelectedMasterProd(null)} className="text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer">Cancel</button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-navy-900 mb-1">
                        MRP / Base Price (₹) *
                      </label>
                      <input
                        type="number"
                        required
                        min="1"
                        placeholder="e.g. 2500"
                        value={vendorMrp}
                        onChange={(e) => handleMrpChange(e.target.value)}
                        className="w-full bg-white text-xs border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-brand-500 font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-navy-900 mb-1">
                        Discount (% OFF)
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          max="90"
                          placeholder="10"
                          value={vendorDiscountPct}
                          onChange={(e) => handleDiscountChange(e.target.value)}
                          className="w-full bg-white text-xs border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-brand-500 font-bold pr-8"
                        />
                        <span className="absolute right-3 top-2 text-xs font-bold text-slate-400">%</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-navy-900 mb-1">
                        Final Selling Price (₹) *
                      </label>
                      <input
                        type="number"
                        required
                        min="1"
                        placeholder="e.g. 2250"
                        value={vendorSellingPrice}
                        onChange={(e) => handleSellingPriceChange(e.target.value)}
                        className="w-full bg-emerald-50 text-emerald-900 text-xs border border-emerald-300 rounded-xl px-3 py-2 outline-none focus:border-emerald-500 font-extrabold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 pt-1">
                    <div>
                      <label className="block text-[11px] font-bold text-navy-900 mb-1">
                        Available Stock Qty *
                      </label>
                      <input
                        type="number"
                        required
                        min="1"
                        placeholder="100"
                        value={vendorStockQty}
                        onChange={(e) => setVendorStockQty(e.target.value)}
                        className="w-full bg-white text-xs border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-brand-500 font-bold"
                      />
                    </div>

                    <div className="flex flex-col justify-center">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Customer View Preview:</span>
                      <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-2xs">
                        <span className="text-sm font-extrabold text-navy-900">₹{vendorSellingPrice || 0}</span>
                        {Number(vendorMrp) > Number(vendorSellingPrice) && (
                          <span className="text-xs text-slate-400 line-through">₹{vendorMrp}</span>
                        )}
                        {Number(vendorDiscountPct) > 0 && (
                          <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                            {vendorDiscountPct}% OFF
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="submit"
                      disabled={isAddingToStore}
                      className="w-full sm:w-auto bg-brand-500 hover:bg-brand-600 active:scale-[0.98] transition-all duration-200 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-xs cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {isAddingToStore ? (
                        <>
                          <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                          Adding to Store & Syncing...
                        </>
                      ) : (
                        "Confirm & Add to My Store Listing"
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: EDIT LISTED PRODUCT MODAL (Bottom Sheet on mobile, modal dialog on desktop) */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 sm:backdrop-blur-sm sm:p-4 flex flex-col justify-end sm:items-center sm:justify-center">
          <div className="bg-white w-full h-[90dvh] sm:h-auto sm:max-h-[90vh] sm:max-w-lg rounded-t-3xl sm:rounded-2xl shadow-2xl p-5 sm:p-6 overflow-y-auto flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div>
                <h3 className="font-extrabold text-navy-900 text-base">Edit Product Listing</h3>
                <p className="text-xs text-slate-500">{editingProduct.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingProduct(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-sm leading-none transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateListing} className="space-y-3 flex-1 flex flex-col">
              {/* Row 1: MRP & Discount in 2 columns */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-navy-900 mb-1">MRP Price (₹)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={editingProduct.mrp || ""}
                    onChange={(e) => handleEditMrpChange(e.target.value)}
                    className="w-full bg-slate-50 text-xs border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-brand-500 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-navy-900 mb-1">Discount (% OFF)</label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      max="90"
                      value={editingProduct.discountPct || 0}
                      onChange={(e) => handleEditDiscountChange(e.target.value)}
                      className="w-full bg-slate-50 text-xs border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-brand-500 font-bold pr-7"
                    />
                    <span className="absolute right-2.5 top-2 text-xs font-bold text-slate-400">%</span>
                  </div>
                </div>
              </div>

              {/* Row 2: Selling Price & Available Stock in 2 columns */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-navy-900 mb-1">Selling Price (₹) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={editingProduct.price}
                    onChange={(e) => handleEditPriceChange(e.target.value)}
                    className="w-full bg-emerald-50 text-emerald-950 text-xs border border-emerald-300 rounded-xl px-3 py-2 outline-none focus:border-emerald-500 font-black"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-navy-900 mb-1">Stock Qty *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={editingProduct.stockQty}
                    onChange={(e) => setEditingProduct({ ...editingProduct, stockQty: e.target.value })}
                    className="w-full bg-slate-50 text-xs border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-brand-500 font-bold"
                  />
                </div>
              </div>

              {/* Compact Live Preview Box */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-xl px-3 py-2 flex items-center justify-between gap-2">
                <div className="flex items-baseline gap-1.5 truncate">
                  <span className="text-[10px] text-slate-400 font-bold">Store:</span>
                  <span className="text-sm font-black text-navy-900">₹{Number(editingProduct.price || 0).toLocaleString("en-IN")}</span>
                  {Number(editingProduct.mrp) > Number(editingProduct.price) && (
                    <span className="text-[10.5px] text-slate-400 line-through">₹{Number(editingProduct.mrp).toLocaleString("en-IN")}</span>
                  )}
                  {Number(editingProduct.discountPct) > 0 && (
                    <span className="text-[10px] font-black text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded">
                      {editingProduct.discountPct}% OFF
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-slate-500 font-semibold shrink-0">
                  {editingProduct.unit || "unit"}
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 mt-auto">
                <button
                  type="button"
                  disabled={isUpdatingListing}
                  onClick={() => setEditingProduct(null)}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingListing}
                  className="flex-1 sm:flex-none px-4 py-2 text-xs font-bold text-white bg-brand-500 rounded-xl hover:bg-brand-600 shadow-xs cursor-pointer active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                >
                  {isUpdatingListing ? (
                    <>
                      <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      Saving...
                    </>
                  ) : (
                    "Save & Update"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Floating Bottom Navigation Bar (Persistent touch navigation across Store Info (1st), Products (2nd), Master Catalog (+), Orders (4th), Profile (5th)) */}
      <div className="md:hidden fixed bottom-3 inset-x-3 sm:max-w-lg sm:mx-auto z-40 bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/90 shadow-2xl p-1.5 flex items-center justify-between">
        {/* 1. Store Info (FIRST!) */}
        <button
          type="button"
          onClick={() => setActiveTab("overview")}
          className={`flex-1 flex flex-col items-center py-1.5 rounded-xl transition-all cursor-pointer active:scale-95 ${
            activeTab === "overview"
              ? "text-[#C2410C] font-extrabold bg-[#FFF7ED] border border-[#FED7AA]/60 shadow-2xs"
              : "text-slate-400 hover:text-slate-700 font-semibold"
          }`}
        >
          <NavStoreIcon className="w-5 h-5 mb-0.5" active={activeTab === "overview"} />
          <span className="text-[10px] tracking-tight">Store Info</span>
        </button>

        {/* 2. Products */}
        <button
          type="button"
          onClick={() => setActiveTab("products")}
          className={`flex-1 flex flex-col items-center py-1.5 rounded-xl transition-all cursor-pointer active:scale-95 ${
            activeTab === "products"
              ? "text-[#C2410C] font-extrabold bg-[#FFF7ED] border border-[#FED7AA]/60 shadow-2xs"
              : "text-slate-400 hover:text-slate-700 font-semibold"
          }`}
        >
          <NavProductsIcon className="w-5 h-5 mb-0.5" active={activeTab === "products"} />
          <span className="text-[10px] tracking-tight">Products</span>
        </button>

        {/* 3. Center Raised Action Button for Instant Master Catalog Access */}
        <button
          type="button"
          onClick={() => setShowCatalogModal(true)}
          className="w-11 h-11 -mt-5 bg-gradient-to-tr from-brand-600 via-brand-500 to-amber-400 text-white rounded-full flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all cursor-pointer ring-4 ring-white shrink-0 mx-1 group"
          title="Add from Master Catalog"
        >
          <NavPlusIcon className="w-6 h-6 text-white group-hover:rotate-90 transition-transform duration-200" />
        </button>

        {/* 4. Orders */}
        <button
          type="button"
          onClick={() => setActiveTab("orders")}
          className={`flex-1 flex flex-col items-center py-1.5 rounded-xl transition-all cursor-pointer active:scale-95 relative ${
            activeTab === "orders"
              ? "text-[#C2410C] font-extrabold bg-[#FFF7ED] border border-[#FED7AA]/60 shadow-2xs"
              : "text-slate-400 hover:text-slate-700 font-semibold"
          }`}
        >
          <NavOrdersIcon className="w-5 h-5 mb-0.5" active={activeTab === "orders"} />
          <span className="text-[10px] tracking-tight">Orders</span>
          {activeOrdersCount > 0 && (
            <span className="absolute top-0.5 right-2 bg-rose-500 text-white font-black text-[9px] min-w-4 h-4 px-1 rounded-full flex items-center justify-center shadow-xs animate-pulse">
              {activeOrdersCount}
            </span>
          )}
        </button>
      </div>
    </DashboardShell>
  );
}