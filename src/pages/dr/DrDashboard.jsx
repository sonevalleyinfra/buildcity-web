import { useState, useEffect } from "react";
import Logo from "../../components/Logo";
import { useAuth } from "../../context/AuthContext";
import { useAdmin } from "../../context/AdminContext";
import { useOrders } from "../../context/OrderContext";
import { useAlert } from "../../context/AlertContext";
import { API_BASE_URL } from "../../config/api";
import { authFetch } from "../../config/authFetch";
import { formatShortId, formatDateTimeIST } from "../../utils/formatId";

const PRESET_IMAGES = [
  { label: "Cement Bag", url: "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=400&q=80" },
  { label: "Paint Bucket", url: "https://images.unsplash.com/photo-1562259949-e8e7689d7828?auto=format&fit=crop&w=400&q=80" },
  { label: "Steel Rebars", url: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=400&q=80" },
  { label: "Pipes & Plumbing", url: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=400&q=80" },
  { label: "Electrical / Wire", url: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=400&q=80" },
];

const ORDER_STATUS_STYLE = {
  APPROVED: "bg-emerald-50 text-emerald-700 border-emerald-200/80 font-bold",
  CONFIRMED: "bg-emerald-50 text-emerald-700 border-emerald-200/80 font-bold",
  PROCESSING: "bg-blue-50 text-blue-700 border-blue-200/80 font-bold",
  SHIPPED: "bg-blue-50 text-blue-700 border-blue-200/80 font-bold",
  OUT_FOR_DELIVERY: "bg-indigo-50 text-indigo-700 border-indigo-200/80 font-bold",
  DELIVERED: "bg-emerald-50 text-emerald-700 border-emerald-200/80 font-bold",
  PENDING: "bg-amber-50 text-amber-700 border-amber-200/80 font-bold",
  CANCELLED: "bg-rose-50 text-rose-700 border-rose-200/80 font-bold",
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
    categories,
    regions,
    orders: adminOrders = [],
    fetchCloudData,
    addVendor,
    updateVendor,
    removeVendor,
    addMasterProduct,
    updateMasterProduct,
    removeMasterProduct,
    assignMasterProductToVendor,
    updateVendorProductListing,
    removeVendorProductListing,
    setVendorStatus,
    updateListingApprovalStatus,
  } = useAdmin();
  const { orders: contextOrders = [], fetchAllOrders, updateOrderStatus } = useOrders() || {};

  const [directOrders, setDirectOrders] = useState([]);

  // Auto real-time background sync every 2.5s for DR Portal
  useEffect(() => {
    let isMounted = true;
    const fetchDirectOrders = async () => {
      try {
        const res = await authFetch(`${API_BASE_URL}/api/v1/orders`);
        if (res.ok) {
          const data = await res.json();
          if (isMounted && Array.isArray(data)) {
            setDirectOrders(data);
          }
        }
      } catch {}
      if (fetchCloudData) fetchCloudData();
      if (fetchAllOrders) fetchAllOrders();
    };

    fetchDirectOrders();
    const interval = setInterval(fetchDirectOrders, 2500);

    const handleSync = () => fetchDirectOrders();
    window.addEventListener("buildcity_orders_updated", handleSync);
    window.addEventListener("buildcity_order_placed", handleSync);
    window.addEventListener("buildcity_vendors_updated", handleSync);
    window.addEventListener("buildcity_categories_updated", handleSync);
    window.addEventListener("buildcity_regions_updated", handleSync);
    window.addEventListener("storage", handleSync);

    return () => {
      isMounted = false;
      clearInterval(interval);
      window.removeEventListener("buildcity_orders_updated", handleSync);
      window.removeEventListener("buildcity_order_placed", handleSync);
      window.removeEventListener("buildcity_vendors_updated", handleSync);
      window.removeEventListener("buildcity_categories_updated", handleSync);
      window.removeEventListener("buildcity_regions_updated", handleSync);
      window.removeEventListener("storage", handleSync);
    };
  }, []);

  // Unified deduplicated live orders list across all sources
  const allRawOrders = [...directOrders, ...(contextOrders || []), ...(adminOrders || [])];
  const orderMap = new Map();
  allRawOrders.forEach((o) => {
    if (o && o.id && !orderMap.has(o.id)) {
      orderMap.set(o.id, o);
    }
  });
  const orders = Array.from(orderMap.values());

  const [activeTab, setActiveTab] = useState("products");
  const [searchTerm, setSearchTerm] = useState("");
  const [listingFilter, setListingFilter] = useState("ALL");
  const [orderStatusFilter, setOrderStatusFilter] = useState("ALL");

  // Modals state
  const [showVendorModal, setShowVendorModal] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);

  // Editing state
  const [editingVendor, setEditingVendor] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);

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
  });

  // Helper to match region names with canonical alias support
  const isSameDistrict = (nameA, nameB) => {
    if (!nameA || !nameB) return false;
    const a = nameA.toLowerCase().trim();
    const b = nameB.toLowerCase().trim();
    if (a === b) return true;

    const getCanonical = (name) => {
      if (["varanasi", "varnasi", "banaras", "kashi"].some((alias) => name.includes(alias))) return "varanasi";
      if (["mirzapur", "mzp"].some((alias) => name.includes(alias))) return "mirzapur";
      if (["prayagraj", "allahabad"].some((alias) => name.includes(alias))) return "prayagraj";
      if (["jaunpur"].some((alias) => name.includes(alias))) return "jaunpur";
      return name;
    };

    return getCanonical(a) === getCanonical(b);
  };

  // Find current logged-in DR info dynamically from live DB drs list or user.drInfo
  const currentDr = (drs || []).find((d) => {
    const userPhoneClean = user?.phone ? user.phone.replace(/\D/g, "") : "";
    const dPhoneClean = d.phone ? d.phone.replace(/\D/g, "") : "";
    return (
      (userPhoneClean && dPhoneClean === userPhoneClean) ||
      d.userId === user?.id ||
      d.id === user?.id ||
      d.id === user?.drInfo?.id ||
      (d.userId && user?.drInfo?.userId && d.userId === user.drInfo.userId)
    );
  }) || user?.drInfo || {};
  
  const rawDrRegionId = currentDr.regionId || currentDr.region?.id || user?.drInfo?.regionId || user?.drInfo?.region?.id || user?.regionId || "";
  const rawDrRegionName = currentDr.region?.name || currentDr.regionName || user?.drInfo?.region?.name || user?.drInfo?.regionName || user?.regionName || "";

  // Match region object from database regions list
  const drRegion = (regions || []).find((r) =>
    (rawDrRegionId && (r.id === rawDrRegionId || String(r.id).toLowerCase() === String(rawDrRegionId).toLowerCase())) ||
    (rawDrRegionName && isSameDistrict(r.name, rawDrRegionName))
  );

  const districtName = drRegion?.name || rawDrRegionName || "Mirzapur";
  const drRegionId = drRegion?.id || rawDrRegionId || "";

  // DR Assigned Region Vendors Filter
  const districtVendors = vendors.filter((v) => {
    if (!user) return true;
    if (user.role === "admin") return true;

    const vRegId = v.regionId || v.region?.id;
    const vRegName = v.regionName || v.districtName || v.region?.name || "";

    // 1. Match Region ID
    if (drRegionId && vRegId && String(vRegId).toLowerCase() === String(drRegionId).toLowerCase()) {
      return true;
    }

    // 2. Match Region Name with canonical aliases
    if (districtName && vRegName && isSameDistrict(districtName, vRegName)) {
      return true;
    }

    // 3. Match Added By DR (name or phone)
    const matchesAddedBy = v.addedByDr && user?.name && v.addedByDr.toLowerCase().includes(user.name.toLowerCase());
    const matchesDrPhone = v.addedByDr && user?.phone && v.addedByDr.includes(user.phone.replace(/\D/g, ""));

    return matchesAddedBy || matchesDrPhone;
  });

  // DR Assigned Region Products Filter
  const districtProducts = products.filter((p) => {
    if (!user) return true;
    if (user.role === "admin") return true;

    const pRegId = p.regionId;
    const pRegName = p.regionName || p.districtName || "";

    // 1. Direct region ID match
    if (drRegionId && pRegId && String(pRegId).toLowerCase() === String(drRegionId).toLowerCase()) {
      return true;
    }

    // 2. Direct region Name match with canonical alias
    if (districtName && pRegName && isSameDistrict(districtName, pRegName)) {
      return true;
    }

    // 3. Belongs to a vendor in this DR's district
    const belongsToDistrictVendor = districtVendors.some(
      (v) =>
        (v.id && p.vendorId && String(v.id).toLowerCase() === String(p.vendorId).toLowerCase()) ||
        (v.shopName && p.vendorName && v.shopName.toLowerCase().trim() === p.vendorName.toLowerCase().trim())
    );
    if (belongsToDistrictVendor) return true;

    // 4. Added by DR
    const addedByDr =
      p.addedBy &&
      ((user?.name && p.addedBy.toLowerCase().includes(user.name.toLowerCase())) ||
        (user?.phone && p.addedBy.includes(user.phone.replace(/\D/g, ""))));
    return addedByDr;
  });

  // DR Assigned Region Orders Filter (Strictly filter orders belonging to DR's jurisdiction destination)
  const districtOrders = orders.filter((o) => {
    if (!user) return true;
    if (user.role === "admin") return true;

    // 1. Direct Delivery Address Region ID matching
    const orderRegionId = o.address?.regionId || o.address?.region?.id || o.regionId || o.region?.id;
    if (drRegionId && orderRegionId && String(orderRegionId).toLowerCase() === String(drRegionId).toLowerCase()) {
      return true;
    }

    // 2. Direct Delivery Address Region Name matching (prioritizing true region name over typed city string)
    const orderRegionName = o.address?.region?.name || o.region?.name || o.districtName || o.regionName || o.address?.district || o.address?.city || "";
    if (districtName && orderRegionName && isSameDistrict(districtName, orderRegionName)) {
      return true;
    }

    return false;
  });

  // Filtered district orders by search and status filter
  const filteredDistrictOrders = districtOrders.filter((ord) => {
    const matchesSearch =
      !searchTerm ||
      (ord.id && ord.id.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (ord.orderNumber && ord.orderNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (ord.customer?.name && ord.customer.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (ord.customer?.phone && ord.customer.phone.includes(searchTerm)) ||
      (Array.isArray(ord.items) && ord.items.some((i) => (i.productName || i.name || "").toLowerCase().includes(searchTerm.toLowerCase())));

    const ordStatus = (ord.status || "PENDING").toUpperCase();
    const matchesStatus = orderStatusFilter === "ALL" || ordStatus === orderStatusFilter;

    return matchesSearch && matchesStatus;
  });

  // Filtered by search
  const filteredVendors = districtVendors.filter(
    (v) =>
      !searchTerm ||
      v.shopName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.ownerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.phone.includes(searchTerm)
  );

  const filteredProducts = districtProducts.filter((p) => {
    const matchesSearch =
      !searchTerm ||
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.categoryName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.vendorName?.toLowerCase().includes(searchTerm.toLowerCase());

    const st = p.approvalStatus || (p.isActive ? "APPROVED" : "PENDING_REVIEW");
    const matchesStatus = listingFilter === "ALL" ? true : st === listingFilter;

    return matchesSearch && matchesStatus;
  });

  const [isSubmittingVendor, setIsSubmittingVendor] = useState(false);
  const [isSubmittingEditVendor, setIsSubmittingEditVendor] = useState(false);
  const [isSubmittingProduct, setIsSubmittingProduct] = useState(false);
  const [deletingVendorId, setDeletingVendorId] = useState(null);
  const [updatingVendorStatus, setUpdatingVendorStatus] = useState(null); // { id, action }
  const [busyListingAction, setBusyListingAction] = useState(null); // { id, action: 'APPROVED' | 'REJECTED' }
  const [busyListingId, setBusyListingId] = useState(null);

  const handleToggleVendorStatus = async (vendorId, nextStatus) => {
    if (updatingVendorStatus) return;
    setUpdatingVendorStatus({ id: vendorId, action: nextStatus });
    try {
      await setVendorStatus(vendorId, nextStatus);
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
          showAlert({ title: "Vendor Deleted", message: `Vendor "${v.shopName}" removed successfully.`, type: "success" });
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
      const targetRegionId = matchedReg ? matchedReg.id : (drRegionId || "r2");
      const targetRegionName = matchedReg ? matchedReg.name : (districtName || "Mirzapur");

      await addVendor({
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

      setVendorForm({ shopName: "", ownerName: "", phone: "", password: "", status: "APPROVED", commissionRate: 10 });
      setShowVendorModal(false);
      showAlert({ title: "Vendor Added", message: `Vendor "${vendorForm.shopName.trim()}" successfully added to Supabase Cloud Database!`, type: "success" });
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
    try {
      await updateVendor(editingVendor.id, editingVendor);
      setEditingVendor(null);
      showAlert({ title: "Vendor Updated", message: `Vendor "${editingVendor.shopName}" details & password updated in Database!`, type: "success" });
    } catch (err) {
      showAlert({ title: "Error", message: "Failed to update vendor: " + (err.message || err), type: "error" });
    } finally {
      setIsSubmittingEditVendor(false);
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
      });
      setShowProductModal(false);
      showAlert({ title: "Product Added", message: `Product "${productForm.name.trim()}" added to Master Catalog & District Listings!`, type: "success" });
    } catch (err) {
      showAlert({ title: "Error", message: "Failed to add product: " + (err.message || err), type: "error" });
    } finally {
      setIsSubmittingProduct(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-navy-900 pb-16">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo size="sm" />
            <span className="bg-brand-50 text-brand-600 border border-brand-200 text-xs font-bold px-2.5 py-1 rounded-full">
              DR Portal
            </span>
            <span className="hidden md:inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 bg-amber-50 text-amber-700 rounded-lg border border-amber-200">
              📍 District: <strong>{districtName}</strong>
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-navy-900">{user?.name || "District Representative"}</p>
              <p className="text-xs text-slate-500">📱 {user?.phone}</p>
            </div>
            <button
              onClick={logout}
              className="text-xs font-semibold text-red-600 bg-red-50 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-100 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 mt-6">
        {/* District Banner & Stats */}
        <div className="bg-gradient-to-r from-navy-950 via-navy-900 to-slate-900 border border-navy-800/60 rounded-2xl p-6 text-white shadow-md mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-brand-300">
                District Representative Dashboard
              </span>
              <h1 className="text-2xl font-black tracking-tight mt-1">{districtName} District Portal</h1>
              <p className="text-xs text-slate-300 font-medium mt-1">
                Manage vendors, add construction products, category, brands, grade & images for {districtName}.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowVendorModal(true)}
                className="bg-white text-navy-950 font-extrabold text-xs px-4 py-2.5 rounded-xl hover:bg-slate-100 active:scale-[0.98] transition-all duration-200 flex items-center gap-2 shadow-xs cursor-pointer"
              >
                <span>➕</span> Add New Vendor
              </button>
              <button
                onClick={() => setShowProductModal(true)}
                className="bg-brand-500 hover:bg-brand-600 active:scale-[0.98] transition-all duration-200 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-xs cursor-pointer"
              >
                <span>📦</span> Add New Product
              </button>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-5 border-t border-slate-700/60">
            <div className="bg-white/10 rounded-xl p-3.5 backdrop-blur-xs border border-white/10">
              <p className="text-[11px] text-slate-300 font-medium">Assigned District</p>
              <p className="text-lg font-black mt-0.5 tracking-tight">{districtName}</p>
            </div>
            <div className="bg-white/10 rounded-xl p-3.5 backdrop-blur-xs border border-white/10">
              <p className="text-[11px] text-slate-300 font-medium">Active Vendors</p>
              <p className="text-lg font-black mt-0.5 tracking-tight">{districtVendors.length}</p>
            </div>
            <div className="bg-white/10 rounded-xl p-3.5 backdrop-blur-xs border border-white/10">
              <p className="text-[11px] text-slate-300 font-medium">Total Products</p>
              <p className="text-lg font-black mt-0.5 tracking-tight">{districtProducts.length}</p>
            </div>
            <div className="bg-white/10 rounded-xl p-3.5 backdrop-blur-xs border border-white/10">
              <p className="text-[11px] text-slate-300 font-medium">Assigned Mobile</p>
              <p className="text-lg font-black mt-0.5 tracking-tight">{user?.phone}</p>
            </div>
          </div>
        </div>

        {/* Navigation Tabs & Search */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-2 bg-white p-1.5 rounded-xl border border-slate-200 shadow-2xs overflow-x-auto no-scrollbar">
            <button
              onClick={() => setActiveTab("products")}
              className={`px-4 py-2 text-xs font-bold rounded-lg active:scale-[0.98] transition-all duration-200 cursor-pointer shrink-0 ${
                activeTab === "products"
                  ? "bg-brand-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-navy-900 hover:bg-slate-100/80"
              }`}
            >
              📦 District Products ({districtProducts.length})
            </button>
            <button
              onClick={() => setActiveTab("masterCatalog")}
              className={`px-4 py-2 text-xs font-bold rounded-lg active:scale-[0.98] transition-all duration-200 cursor-pointer shrink-0 ${
                activeTab === "masterCatalog"
                  ? "bg-brand-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-navy-900 hover:bg-slate-100/80"
              }`}
            >
              🏬 Master Catalog ({masterProducts.length})
            </button>
            <button
              onClick={() => setActiveTab("vendors")}
              className={`px-4 py-2 text-xs font-bold rounded-lg active:scale-[0.98] transition-all duration-200 cursor-pointer shrink-0 ${
                activeTab === "vendors"
                  ? "bg-brand-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-navy-900 hover:bg-slate-100/80"
              }`}
            >
              🏬 Vendors ({districtVendors.length})
            </button>
            <button
              onClick={() => setActiveTab("listings")}
              className={`px-4 py-2 text-xs font-bold rounded-lg active:scale-[0.98] transition-all duration-200 cursor-pointer shrink-0 flex items-center gap-1.5 ${
                activeTab === "listings"
                  ? "bg-brand-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-navy-900 hover:bg-slate-100/80"
              }`}
            >
              <span>📋 Listings & Approvals ({districtProducts.length})</span>
              {districtProducts.filter((p) => (p.approvalStatus || (p.isActive ? "APPROVED" : "PENDING_REVIEW")) === "PENDING_REVIEW").length > 0 && (
                <span className="bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full animate-pulse">
                  {districtProducts.filter((p) => (p.approvalStatus || (p.isActive ? "APPROVED" : "PENDING_REVIEW")) === "PENDING_REVIEW").length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("orders")}
              className={`px-4 py-2 text-xs font-bold rounded-lg active:scale-[0.98] transition-all duration-200 cursor-pointer shrink-0 ${
                activeTab === "orders"
                  ? "bg-brand-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-navy-900 hover:bg-slate-100/80"
              }`}
            >
              🛍️ District Orders ({districtOrders.length})
            </button>
          </div>

          <div className="relative w-full sm:w-72">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={`Search ${activeTab}...`}
              className="w-full bg-white text-xs border border-slate-200/90 rounded-xl px-3.5 py-2.5 pl-9 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 shadow-2xs transition-all duration-200"
            />
            <span className="absolute left-3 top-2.5 text-slate-400 text-xs">🔍</span>
          </div>
        </div>

        {/* Tab 1: Products Section */}
        {activeTab === "products" && (
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
              <h2 className="text-sm font-bold text-navy-900">
                Products in {districtName}
              </h2>

              <div className="flex items-center gap-2">
                <div className="flex gap-1 bg-slate-200/70 p-1 rounded-xl text-xs font-bold">
                  {["ALL", "PENDING_REVIEW", "APPROVED", "REJECTED"].map((st) => (
                    <button
                      key={st}
                      onClick={() => setListingFilter(st)}
                      className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                        listingFilter === st ? "bg-white text-navy-900 shadow-2xs" : "text-slate-600 hover:text-navy-900"
                      }`}
                    >
                      {st === "ALL" ? "All" : st === "PENDING_REVIEW" ? "🟡 Pending" : st === "APPROVED" ? "🟢 Approved" : "🔴 Rejected"}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setShowProductModal(true)}
                  className="text-xs bg-brand-500 hover:bg-brand-600 text-white font-semibold px-3 py-1.5 rounded-lg transition-colors cursor-pointer shrink-0"
                >
                  + Add Product
                </button>
              </div>
            </div>

            {productsLoading ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="py-3 px-4">Product Details</th>
                      <th className="py-3 px-4">Category / Brand</th>
                      <th className="py-3 px-4">Type & Grade</th>
                      <th className="py-3 px-4">Vendor</th>
                      <th className="py-3 px-4">Price / Unit</th>
                      <th className="py-3 px-4">Stock</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs animate-pulse">
                    {[1, 2, 3, 4].map((n) => (
                      <tr key={n}>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-slate-200 rounded-lg shrink-0" />
                            <div className="space-y-1.5 flex-1">
                              <div className="h-3.5 bg-slate-200 rounded w-44" />
                              <div className="h-2.5 bg-slate-200 rounded w-24" />
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4"><div className="h-3.5 bg-slate-200 rounded w-20" /></td>
                        <td className="py-3.5 px-4"><div className="h-3.5 bg-slate-200 rounded w-24" /></td>
                        <td className="py-3.5 px-4"><div className="h-3.5 bg-slate-200 rounded w-24" /></td>
                        <td className="py-3.5 px-4"><div className="h-3.5 bg-slate-200 rounded w-16" /></td>
                        <td className="py-3.5 px-4"><div className="h-3.5 bg-slate-200 rounded w-16" /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-12 px-4">
                <p className="text-3xl mb-2">📦</p>
                <p className="text-sm font-semibold text-navy-900">No products found</p>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  District vendors ke liye pehla product add karein. Specify Category, Brand, Type, Grade & Image.
                </p>
                <button
                  onClick={() => setShowProductModal(true)}
                  className="mt-4 bg-brand-500 text-white text-xs font-semibold px-4 py-2 rounded-xl"
                >
                  Add Product Now
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="py-3 px-4">Product Details</th>
                      <th className="py-3 px-4">Category / Brand</th>
                      <th className="py-3 px-4">Type & Grade</th>
                      <th className="py-3 px-4">Vendor</th>
                      <th className="py-3 px-4">Price / Unit</th>
                      <th className="py-3 px-4">Stock</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {filteredProducts.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={p.imageUrl}
                              alt={p.name}
                              className="w-12 h-12 object-cover rounded-lg border border-slate-200 shrink-0"
                            />
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="bg-navy-900 text-white font-mono text-[9px] font-bold px-1.5 py-0.5 rounded">
                                  {formatShortId(p.id, "PRD")}
                                </span>
                                <p className="font-bold text-navy-900">{p.name}</p>
                              </div>
                              <p className="text-[11px] text-slate-400">Added by: {p.addedBy || "DR"}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="inline-block bg-slate-100 text-slate-700 font-semibold px-2 py-0.5 rounded text-[11px]">
                            {p.categoryName || "General"}
                          </span>
                          <p className="text-xs font-medium text-navy-900 mt-1">
                            🏷️ {p.brand || "Generic"}
                          </p>
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="font-semibold text-slate-800">{p.type || "Standard"}</p>
                          <span className="inline-block bg-amber-50 text-amber-700 text-[10px] font-semibold px-1.5 py-0.5 rounded border border-amber-200 mt-0.5">
                            Grade: {p.grade || "N/A"}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="font-semibold text-navy-900">{p.vendorName}</p>
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="font-extrabold text-navy-900 text-sm">₹{p.price}</p>
                          <p className="text-[11px] text-slate-500">per {p.unit || "Unit"}</p>
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`font-semibold px-2 py-1 rounded text-xs ${
                              p.stockQty > 0 ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"
                            }`}
                          >
                            {p.stockQty} in stock
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              disabled={Boolean(busyListingAction?.id === p.id) || p.approvalStatus === "APPROVED"}
                              onClick={async () => {
                                if (busyListingAction) return;
                                setBusyListingAction({ id: p.id, action: "APPROVED" });
                                try {
                                  await updateListingApprovalStatus(p.id, "APPROVED");
                                } finally {
                                  setBusyListingAction(null);
                                }
                              }}
                              className={`min-w-[95px] text-[11px] font-bold px-2.5 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                                p.approvalStatus === "APPROVED"
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-not-allowed opacity-80"
                                  : busyListingAction?.id === p.id && busyListingAction?.action === "APPROVED"
                                  ? "bg-emerald-600 text-white cursor-wait pointer-events-none"
                                  : busyListingAction?.id === p.id
                                  ? "opacity-40 cursor-not-allowed bg-emerald-600 text-white"
                                  : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs active:scale-[0.98] cursor-pointer"
                              }`}
                            >
                              {busyListingAction?.id === p.id && busyListingAction?.action === "APPROVED" ? (
                                <>
                                  <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                  <span>Approving...</span>
                                </>
                              ) : p.approvalStatus === "APPROVED" ? (
                                "✓ Approved"
                              ) : (
                                "✓ Approve"
                              )}
                            </button>

                            <button
                              disabled={Boolean(busyListingAction?.id === p.id) || p.approvalStatus === "REJECTED"}
                              onClick={async () => {
                                if (busyListingAction) return;
                                setBusyListingAction({ id: p.id, action: "REJECTED" });
                                try {
                                  await updateListingApprovalStatus(p.id, "REJECTED");
                                } finally {
                                  setBusyListingAction(null);
                                }
                              }}
                              className={`min-w-[90px] text-[11px] font-bold px-2.5 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                                p.approvalStatus === "REJECTED"
                                  ? "bg-rose-50 text-rose-600 border border-rose-200 cursor-not-allowed opacity-80"
                                  : busyListingAction?.id === p.id && busyListingAction?.action === "REJECTED"
                                  ? "bg-rose-100 text-rose-700 border border-rose-300 cursor-wait pointer-events-none"
                                  : busyListingAction?.id === p.id
                                  ? "opacity-40 cursor-not-allowed bg-white text-rose-600 border border-rose-200"
                                  : "bg-white text-rose-600 border border-rose-200 hover:bg-rose-50 active:scale-[0.98] cursor-pointer"
                              }`}
                            >
                              {busyListingAction?.id === p.id && busyListingAction?.action === "REJECTED" ? (
                                <>
                                  <span className="w-3 h-3 border-2 border-rose-600 border-t-transparent rounded-full animate-spin" />
                                  <span>Rejecting...</span>
                                </>
                              ) : p.approvalStatus === "REJECTED" ? (
                                "✕ Rejected"
                              ) : (
                                "✕ Reject"
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab: Master Products Catalog (All Platform Master Products) */}
        {activeTab === "masterCatalog" && (
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
              <div>
                <h2 className="text-sm font-bold text-navy-900">
                  Platform Master Product Catalog ({masterProducts.length})
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">Sare Master Products jo Platform Catalog me listed hain.</p>
              </div>
              <button
                onClick={() => setShowProductModal(true)}
                className="text-xs bg-brand-500 hover:bg-brand-600 text-white font-semibold px-3.5 py-2 rounded-xl transition-colors cursor-pointer shadow-2xs"
              >
                + Add Master Product
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Product Details</th>
                    <th className="py-3 px-4">Category / Brand</th>
                    <th className="py-3 px-4">Type & Grade</th>
                    <th className="py-3 px-4">Suggested Price</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {masterProducts
                    .filter((p) => {
                      if (!searchTerm.trim()) return true;
                      const q = searchTerm.toLowerCase().trim();
                      return (
                        (p.name || "").toLowerCase().includes(q) ||
                        (p.brand || "").toLowerCase().includes(q) ||
                        (p.categoryName || "").toLowerCase().includes(q)
                      );
                    })
                    .map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <img src={p.imageUrl} alt={p.name} className="w-10 h-10 object-cover rounded-lg border border-slate-200 shrink-0" />
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="bg-navy-900 text-white font-mono text-[9px] font-bold px-1.5 py-0.5 rounded">
                                  {formatShortId(p.id, "PRD")}
                                </span>
                                <p className="font-bold text-navy-900">{p.name}</p>
                              </div>
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
                          <span className="font-extrabold text-navy-900 text-sm">₹{p.suggestedPrice || p.price}</span>
                          <span className="text-[11px] text-slate-500"> /{p.unit}</span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => setEditingProduct({ ...p })}
                            className="text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg px-2.5 py-1.5 cursor-pointer active:scale-[0.98] transition-all"
                          >
                            ✏️ Edit Catalog
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/*  Vendors Section */}
        {activeTab === "vendors" && (
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
              <h2 className="text-sm font-bold text-navy-900">
                Vendors in {districtName}
              </h2>
              <button
                onClick={() => setShowVendorModal(true)}
                className="text-xs bg-brand-500 hover:bg-brand-600 text-white font-semibold px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
              >
                + Add Vendor
              </button>
            </div>

            {filteredVendors.length === 0 ? (
              <div className="text-center py-12 px-4">
                <p className="text-3xl mb-2">🏬</p>
                <p className="text-sm font-semibold text-navy-900">No vendors registered in this district</p>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  {districtName} district ke pehle vendor/trader ko yahan register karein.
                </p>
                <button
                  onClick={() => setShowVendorModal(true)}
                  className="mt-4 bg-brand-500 text-white text-xs font-semibold px-4 py-2 rounded-xl"
                >
                  Register Vendor Now
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="py-3 px-4">Shop / Business</th>
                      <th className="py-3 px-4">Owner & Mobile</th>
                      <th className="py-3 px-4">District / Region</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Products</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {filteredVendors.map((v) => (
                      <tr key={v.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-navy-900">{v.shopName}</td>
                        <td className="py-3.5 px-4">
                          <p className="font-semibold text-slate-800">{v.ownerName}</p>
                          <p className="text-[11px] text-slate-500">📱 {v.phone}</p>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium text-[11px]">
                            {v.regionName || districtName}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                              v.status === "APPROVED"
                                ? "bg-green-50 text-green-700 border border-green-200"
                                : v.status === "PENDING"
                                ? "bg-amber-50 text-amber-700 border border-amber-200"
                                : "bg-red-50 text-red-600 border border-red-200"
                            }`}
                          >
                            {v.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-slate-700">
                          {v.productCount || 0} Products
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setEditingVendor({ ...v })}
                              className="text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg px-2.5 py-1.5 cursor-pointer"
                            >
                              ✏️ Edit
                            </button>
                            {v.status !== "APPROVED" && (
                              <button
                                disabled={Boolean(updatingVendorStatus)}
                                onClick={() => handleToggleVendorStatus(v.id, "APPROVED")}
                                className="text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg px-2.5 py-1.5 shadow-2xs active:scale-[0.98] transition-all duration-200 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-1 min-w-[75px] justify-center"
                              >
                                {updatingVendorStatus?.id === v.id && updatingVendorStatus?.action === "APPROVED" ? (
                                  <>
                                    <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                                    <span>Approving...</span>
                                  </>
                                ) : (
                                  "Approve"
                                )}
                              </button>
                            )}
                            {v.status !== "SUSPENDED" && (
                              <button
                                disabled={Boolean(updatingVendorStatus)}
                                onClick={() => handleToggleVendorStatus(v.id, "SUSPENDED")}
                                className="text-[11px] font-semibold border border-amber-300 text-amber-700 hover:bg-amber-50 rounded-lg px-2.5 py-1.5 active:scale-[0.98] transition-all duration-200 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-1 min-w-[75px] justify-center"
                              >
                                {updatingVendorStatus?.id === v.id && updatingVendorStatus?.action === "SUSPENDED" ? (
                                  <>
                                    <span className="w-3 h-3 border-2 border-amber-700 border-t-transparent rounded-full animate-spin"></span>
                                    <span>Suspending...</span>
                                  </>
                                ) : (
                                  "Suspend"
                                )}
                              </button>
                            )}
                            {v.status === "SUSPENDED" && (
                              <button
                                disabled={Boolean(updatingVendorStatus)}
                                onClick={() => handleToggleVendorStatus(v.id, "APPROVED")}
                                className="text-[11px] font-semibold border border-emerald-500 text-emerald-600 hover:bg-emerald-50 rounded-lg px-2.5 py-1.5 active:scale-[0.98] transition-all duration-200 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-1 min-w-[75px] justify-center"
                              >
                                {updatingVendorStatus?.id === v.id && updatingVendorStatus?.action === "APPROVED" ? (
                                  <>
                                    <span className="w-3 h-3 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></span>
                                    <span>Reinstating...</span>
                                  </>
                                ) : (
                                  "Reinstate"
                                )}
                              </button>
                            )}
                            <button
                              disabled={deletingVendorId === v.id}
                              onClick={() => handleDeleteVendor(v)}
                              className="text-[11px] font-bold bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg px-2.5 py-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                            >
                              {deletingVendorId === v.id ? (
                                <>
                                  <span className="w-3 h-3 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></span>
                                  Deleting...
                                </>
                              ) : (
                                "🗑️ Delete"
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

      {/* 3. LISTINGS & APPROVALS TAB */}
      {activeTab === "listings" && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden p-5 space-y-4 font-sans">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h3 className="font-extrabold text-navy-900 text-sm flex items-center gap-2">
                District Vendor Product Listings & Approvals ({districtProducts.length})
              </h3>
              <p className="text-xs text-slate-500">Review vendor product requests, custom price & stock settings for {districtName}.</p>
            </div>

            {/* Filter Pills */}
            <div className="flex gap-1.5 bg-slate-100 p-1 rounded-xl w-fit text-xs font-bold">
              {["ALL", "PENDING_REVIEW", "APPROVED", "REJECTED"].map((st) => (
                <button
                  key={st}
                  onClick={() => setListingFilter(st)}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    listingFilter === st ? "bg-white text-navy-900 shadow-2xs" : "text-slate-600 hover:text-navy-900"
                  }`}
                >
                  {st === "ALL" ? "All" : st === "PENDING_REVIEW" ? "🟡 Pending Review" : st === "APPROVED" ? "🟢 Approved" : "🔴 Rejected"}
                </button>
              ))}
            </div>
          </div>

          {filteredProducts.length === 0 ? (
            <div className="text-center py-10 text-xs text-slate-500 font-medium">No product listings found for selected filter status ({listingFilter}).</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200/90 bg-slate-50/90 text-[11px] font-black text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Vendor Shop</th>
                    <th className="py-3 px-4">Product Name</th>
                    <th className="py-3 px-4">Category & Brand</th>
                    <th className="py-3 px-4">Selling Price</th>
                    <th className="py-3 px-4">Stock Qty</th>
                    <th className="py-3 px-4">Approval Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredProducts.map((p) => {
                      const st = p.approvalStatus || (p.isActive ? "APPROVED" : "PENDING_REVIEW");
                      const stBadge =
                        st === "APPROVED"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200/80 font-bold"
                          : st === "REJECTED"
                          ? "bg-rose-50 text-rose-700 border border-rose-200/80 font-bold"
                          : "bg-amber-50 text-amber-700 border border-amber-200/80 font-bold";

                      return (
                        <tr key={p.id} className="hover:bg-slate-50/80 transition-colors duration-150">
                          <td className="py-3.5 px-4 font-bold text-navy-900">
                            🏬 {p.vendorName || "Shree Cement Traders"}
                          </td>
                          <td className="py-3.5 px-4 font-semibold text-slate-800 flex items-center gap-2">
                            <img src={p.imageUrl} alt={p.name} className="h-8 w-8 rounded-lg object-cover border border-slate-200 shrink-0" />
                            <span>{p.name}</span>
                          </td>
                          <td className="py-3.5 px-4 text-slate-600">
                            {p.categoryName || "Category"} · {p.brand} ({p.grade})
                          </td>
                          <td className="py-3.5 px-4 font-extrabold text-navy-900">₹{p.price}</td>
                          <td className="py-3.5 px-4 font-bold text-slate-700">{p.stockQty} {p.unit || "units"}</td>
                          <td className="py-3.5 px-4">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${stBadge}`}>
                              {st === "APPROVED" ? "APPROVED" : st === "REJECTED" ? "REJECTED" : "PENDING REVIEW"}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                disabled={Boolean(busyListingAction?.id === p.id) || st === "APPROVED"}
                                onClick={async (e) => {
                                  e.preventDefault();
                                  if (busyListingAction) return;
                                  setBusyListingAction({ id: p.id, action: "APPROVED" });
                                  try {
                                    await updateListingApprovalStatus(p.id, "APPROVED");
                                  } finally {
                                    setBusyListingAction(null);
                                  }
                                }}
                                className={`min-w-[100px] text-[11px] font-extrabold px-3 py-1.5 rounded-xl transition-all duration-200 flex items-center justify-center gap-1.5 select-none ${
                                  st === "APPROVED"
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-default opacity-90 pointer-events-none"
                                    : busyListingAction?.id === p.id && busyListingAction?.action === "APPROVED"
                                    ? "bg-emerald-600 text-white cursor-wait pointer-events-none"
                                    : busyListingAction?.id === p.id
                                    ? "opacity-40 cursor-not-allowed bg-emerald-600 text-white"
                                    : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs active:scale-[0.98] cursor-pointer"
                                }`}
                              >
                                {busyListingAction?.id === p.id && busyListingAction?.action === "APPROVED" ? (
                                  <>
                                    <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    <span>Approving...</span>
                                  </>
                                ) : st === "APPROVED" ? (
                                  "✓ Approved"
                                ) : (
                                  "✓ Approve"
                                )}
                              </button>

                              <button
                                disabled={Boolean(busyListingAction?.id === p.id) || st === "REJECTED"}
                                onClick={async (e) => {
                                  e.preventDefault();
                                  if (busyListingAction) return;
                                  setBusyListingAction({ id: p.id, action: "REJECTED" });
                                  try {
                                    await updateListingApprovalStatus(p.id, "REJECTED");
                                  } finally {
                                    setBusyListingAction(null);
                                  }
                                }}
                                className={`min-w-[95px] text-[11px] font-extrabold px-3 py-1.5 rounded-xl transition-all duration-200 flex items-center justify-center gap-1.5 select-none ${
                                  st === "REJECTED"
                                    ? "bg-rose-50 text-rose-600 border border-rose-200 cursor-default opacity-90 pointer-events-none"
                                    : busyListingAction?.id === p.id && busyListingAction?.action === "REJECTED"
                                    ? "bg-rose-100 text-rose-700 border border-rose-300 cursor-wait pointer-events-none"
                                    : busyListingAction?.id === p.id
                                    ? "opacity-40 cursor-not-allowed bg-white text-rose-600 border border-rose-200"
                                    : "bg-white text-rose-600 border border-rose-200 hover:bg-rose-50 active:scale-[0.98] cursor-pointer"
                                }`}
                              >
                                {busyListingAction?.id === p.id && busyListingAction?.action === "REJECTED" ? (
                                  <>
                                    <span className="w-3 h-3 border-2 border-rose-600 border-t-transparent rounded-full animate-spin" />
                                    <span>Rejecting...</span>
                                  </>
                                ) : st === "REJECTED" ? (
                                  "✕ Rejected"
                                ) : (
                                  "✕ Reject"
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 4: District Orders */}
      {activeTab === "orders" && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden p-5 space-y-4 font-sans">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-extrabold text-navy-900 flex items-center gap-2">
                <span>🛒 Customer Orders in {districtName} District</span>
                <span className="bg-brand-50 text-brand-700 border border-brand-200 text-xs font-extrabold px-2.5 py-0.5 rounded-full">
                  {districtOrders.length} District Orders
                </span>
              </h2>
              <p className="text-xs text-slate-500">Live real-time tracking of marketplace orders placed for delivery within {districtName} jurisdiction.</p>
            </div>

            {/* Status Filter Pills */}
            <div className="flex flex-wrap gap-1.5 bg-slate-100 p-1 rounded-xl w-fit text-xs font-bold">
              {["ALL", "PENDING", "PROCESSING", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"].map((st) => {
                const count = st === "ALL"
                  ? districtOrders.length
                  : districtOrders.filter((o) => (o.status || "PENDING").toUpperCase() === st).length;
                return (
                  <button
                    key={st}
                    onClick={() => setOrderStatusFilter(st)}
                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                      orderStatusFilter === st ? "bg-white text-navy-900 shadow-2xs" : "text-slate-600 hover:text-navy-900"
                    }`}
                  >
                    <span>{st === "ALL" ? "All" : st === "PENDING" ? "🟡 Pending" : st === "PROCESSING" ? "🔵 Processing" : st === "OUT_FOR_DELIVERY" ? "🚚 Out for Delivery" : st === "DELIVERED" ? "🟢 Delivered" : "🔴 Cancelled"}</span>
                    <span className="text-[10px] opacity-75 font-black">({count})</span>
                  </button>
                );
              })}
            </div>
          </div>

          {filteredDistrictOrders.length === 0 ? (
            <div className="text-center py-12 text-xs text-slate-500 font-medium">
              <p className="text-3xl mb-2">🛍️</p>
              <p className="text-sm font-bold text-navy-900">No {orderStatusFilter !== "ALL" ? orderStatusFilter : ""} orders found in {districtName}</p>
              <p className="text-xs text-slate-500 mt-1">Orders placed by customers for delivery within {districtName} will appear here live in real-time.</p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-black text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Order ID & Date</th>
                    <th className="py-3 px-4">Customer Info</th>
                    <th className="py-3 px-4">Delivery Address</th>
                    <th className="py-3 px-4">Ordered Items & Vendor</th>
                    <th className="py-3 px-4">Total Amount</th>
                    <th className="py-3 px-4">Status & Control</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredDistrictOrders.map((ord) => {
                    const displayAmt = Number(ord.totalAmount || ord.total || 0);
                    const custName = ord.customer?.name || ord.customerName || "Customer";
                    const custPhone = ord.customer?.phone || ord.customerPhone || "";
                    const rawAddr = ord.address;
                    const isObj = typeof rawAddr === "object" && rawAddr !== null;
                    const isStr = typeof rawAddr === "string" && rawAddr.trim().length > 0;

                    let streetAddr = isObj ? (rawAddr.street || rawAddr.line || rawAddr.address) : (isStr ? rawAddr : null);
                    let cityAddr = isObj ? rawAddr.city : (ord.districtName || ord.regionName || districtName);
                    let pincodeAddr = isObj ? rawAddr.pincode : "";

                    if (!streetAddr || streetAddr.includes("Site Delivery Address") || streetAddr.includes("Main Delivery Address")) {
                      if (ord.customer?.address && !ord.customer.address.includes("Site Delivery Address")) {
                        streetAddr = ord.customer.address;
                      } else if (custPhone) {
                        streetAddr = `Site Location for Mobile ${custPhone}`;
                      } else {
                        streetAddr = `Site Delivery Location (${cityAddr || districtName})`;
                      }
                    }

                    const dateStr = formatDateTimeIST(ord.createdAt || ord.date);
                    const statusKey = (ord.status || "PENDING").toUpperCase();
                    const statusStyle = ORDER_STATUS_STYLE[statusKey] || "bg-amber-50 text-amber-700 border-amber-200/80 font-bold";

                    return (
                      <tr key={ord.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4">
                          <span className="font-extrabold text-brand-700 block text-xs">{formatShortId(ord.id || ord.orderNumber, "ORD")}</span>
                          <span className="text-[11px] text-slate-400 font-medium">{dateStr}</span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-bold text-navy-900 block">👤 {custName}</span>
                          {custPhone && <span className="text-[11px] text-slate-500 font-semibold">📱 {custPhone}</span>}
                        </td>
                        <td className="py-3.5 px-4 min-w-[220px]">
                          <div className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                            <p className="font-bold text-navy-900 leading-snug whitespace-normal break-words">🏢 {streetAddr}</p>
                            <p className="text-[11px] text-slate-600 font-medium mt-0.5">
                              🏙️ <span className="font-bold text-brand-700">{cityAddr}</span> {pincodeAddr ? `- ${pincodeAddr}` : ""}
                            </p>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          {Array.isArray(ord.items) && ord.items.length > 0 ? (
                            <div className="space-y-1">
                              {ord.items.map((it, idx) => (
                                <div key={idx} className="text-[11px]">
                                  <span className="font-bold text-slate-800">• {it.productName || it.name}</span>
                                  <span className="text-slate-500 font-medium ml-1">x{it.quantity} (₹{it.priceAtPurchase || it.price})</span>
                                  {it.vendorName && <span className="text-[10px] text-brand-600 block pl-2 font-semibold">🏬 {it.vendorName}</span>}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-500 font-medium">Construction Materials Order</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-black text-navy-900 text-sm">₹{displayAmt.toLocaleString("en-IN")}</span>
                          <span className="block text-[10px] font-bold text-emerald-600 uppercase">💵 COD</span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <span className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold border ${statusStyle}`}>
                              {ord.status || "PENDING"}
                            </span>
                            {updateOrderStatus && (
                              <select
                                value={(ord.status || "PENDING").toUpperCase()}
                                onChange={(e) => updateOrderStatus(ord.id, e.target.value)}
                                className="text-[11px] font-bold bg-slate-100 border border-slate-200 rounded-lg px-2 py-1 outline-none text-navy-900 cursor-pointer hover:bg-slate-200 transition-colors"
                              >
                                <option value="PENDING">PENDING</option>
                                <option value="PROCESSING">PROCESSING</option>
                                <option value="OUT_FOR_DELIVERY">OUT FOR DELIVERY</option>
                                <option value="DELIVERED">DELIVERED</option>
                                <option value="CANCELLED">CANCELLED</option>
                              </select>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
      </main>

      {/*  Add Vendor Modal */}
      {showVendorModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="font-bold text-navy-900 text-base">Add Vendor to {districtName}</h3>
              <button
                onClick={() => setShowVendorModal(false)}
                className="text-slate-400 hover:text-navy-900 text-lg leading-none"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateVendor} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-navy-900 mb-1">
                  Shop / Business Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Gupta Building Materials"
                  value={vendorForm.shopName}
                  onChange={(e) => setVendorForm({ ...vendorForm, shopName: e.target.value })}
                  className="w-full bg-slate-50 text-xs border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-navy-900 mb-1">
                  Owner / Proprietor Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Gupta"
                  value={vendorForm.ownerName}
                  onChange={(e) => setVendorForm({ ...vendorForm, ownerName: e.target.value })}
                  className="w-full bg-slate-50 text-xs border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-navy-900 mb-1">
                  Mobile Number *
                </label>
                <input
                  type="tel"
                  required
                  maxLength={10}
                  placeholder="10-digit mobile number"
                  value={vendorForm.phone}
                  onChange={(e) =>
                    setVendorForm({ ...vendorForm, phone: e.target.value.replace(/\D/g, "") })
                  }
                  className="w-full bg-slate-50 text-xs border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-navy-900 mb-1">
                  Assigned District / Region
                </label>
                <input
                  type="text"
                  disabled
                  value={districtName}
                  className="w-full bg-slate-100 text-slate-500 text-xs border border-slate-200 rounded-xl px-3 py-2.5 cursor-not-allowed font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-navy-900 mb-1">
                  Set Vendor Login Password *
                </label>
                <input
                  type="text"
                  placeholder="Password (default: vendor123)"
                  value={vendorForm.password}
                  onChange={(e) =>
                    setVendorForm({ ...vendorForm, password: e.target.value })
                  }
                  className="w-full bg-slate-50 text-xs border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-brand-500 font-mono"
                />
              </div>



              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowVendorModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingVendor}
                  className="px-5 py-2 text-xs font-semibold text-white bg-brand-500 rounded-xl hover:bg-brand-600 shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmittingVendor ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      Saving Vendor to DB...
                    </>
                  ) : (
                    "Save Vendor"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Product Modal */}
      {showProductModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="font-bold text-navy-900 text-base">Add New Product ({districtName})</h3>
              <button
                onClick={() => setShowProductModal(false)}
                className="text-slate-400 hover:text-navy-900 text-lg leading-none"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-navy-900 mb-1">
                  Product Category *
                </label>
                <select
                  required
                  value={productForm.categoryId}
                  onChange={(e) => setProductForm({ ...productForm, categoryId: e.target.value })}
                  className="w-full bg-slate-50 text-xs border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-brand-500 font-bold"
                >
                  <option value="">-- Choose Category --</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-navy-900 mb-1">
                  Product Name / Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. UltraTech Super PPC Cement"
                  value={productForm.name}
                  onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                  className="w-full bg-slate-50 text-xs border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-brand-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-navy-900 mb-1">
                    Brand Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. UltraTech, Tata"
                    value={productForm.brand}
                    onChange={(e) => setProductForm({ ...productForm, brand: e.target.value })}
                    className="w-full bg-slate-50 text-xs border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-navy-900 mb-1">
                    Product Type
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. PPC Cement, TMT"
                    value={productForm.type}
                    onChange={(e) => setProductForm({ ...productForm, type: e.target.value })}
                    className="w-full bg-slate-50 text-xs border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-navy-900 mb-1">
                    Grade / Spec
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. OPC 53, Fe 550D"
                    value={productForm.grade}
                    onChange={(e) => setProductForm({ ...productForm, grade: e.target.value })}
                    className="w-full bg-slate-50 text-xs border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-navy-900 mb-1">
                    Unit Packaging
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 50kg Bag, Ton, Liter"
                    value={productForm.unit}
                    onChange={(e) => setProductForm({ ...productForm, unit: e.target.value })}
                    className="w-full bg-slate-50 text-xs border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-navy-900 mb-1">
                    Price (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="390"
                    value={productForm.price}
                    onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                    className="w-full bg-slate-50 text-xs border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-navy-900 mb-1">
                    Stock Quantity
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="100"
                    value={productForm.stockQty}
                    onChange={(e) => setProductForm({ ...productForm, stockQty: e.target.value })}
                    className="w-full bg-slate-50 text-xs border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-navy-900 mb-1">
                  Product Images (Add 1 to 3 Images for Interactive Slider)
                </label>
                <div className="flex gap-2 mb-2 overflow-x-auto pb-1 no-scrollbar">
                  {PRESET_IMAGES.map((img, i) => (
                    <button
                      type="button"
                      key={i}
                      onClick={() => {
                        const currentList = (productForm.imageUrl || "").split(",").map(s => s.trim()).filter(Boolean);
                        if (!currentList.includes(img.url)) {
                          const newList = [...currentList, img.url].slice(0, 3);
                          setProductForm({ ...productForm, imageUrl: newList.join(", ") });
                        }
                      }}
                      className="text-[11px] px-2.5 py-1 rounded-lg border border-slate-200 text-slate-700 bg-white hover:bg-brand-50 hover:border-brand-300 font-semibold shrink-0 cursor-pointer"
                    >
                      + 📷 {img.label}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="url"
                    placeholder="Main Image 1 URL *"
                    value={(productForm.imageUrl || "").split(",")[0]?.trim() || ""}
                    onChange={(e) => {
                      const parts = (productForm.imageUrl || "").split(",").map(s => s.trim());
                      parts[0] = e.target.value;
                      setProductForm({ ...productForm, imageUrl: parts.filter(Boolean).join(", ") });
                    }}
                    className="w-full bg-slate-50 text-xs border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-brand-500 font-mono text-[11px]"
                  />
                  <input
                    type="url"
                    placeholder="Image 2 URL (Optional)"
                    value={(productForm.imageUrl || "").split(",")[1]?.trim() || ""}
                    onChange={(e) => {
                      const parts = (productForm.imageUrl || "").split(",").map(s => s.trim());
                      parts[1] = e.target.value;
                      setProductForm({ ...productForm, imageUrl: parts.filter(Boolean).join(", ") });
                    }}
                    className="w-full bg-slate-50 text-xs border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-brand-500 font-mono text-[11px]"
                  />
                  <input
                    type="url"
                    placeholder="Image 3 URL (Optional)"
                    value={(productForm.imageUrl || "").split(",")[2]?.trim() || ""}
                    onChange={(e) => {
                      const parts = (productForm.imageUrl || "").split(",").map(s => s.trim());
                      parts[2] = e.target.value;
                      setProductForm({ ...productForm, imageUrl: parts.filter(Boolean).join(", ") });
                    }}
                    className="w-full bg-slate-50 text-xs border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-brand-500 font-mono text-[11px]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowProductModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingProduct}
                  className="px-5 py-2 text-xs font-bold text-white bg-brand-500 rounded-xl hover:bg-brand-600 shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isSubmittingProduct ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Saving Product...</span>
                    </>
                  ) : (
                    "Save Product"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT VENDOR MODAL (DR) */}
      {editingVendor && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="font-bold text-navy-900 text-base">Edit District Vendor Details</h3>
              <button onClick={() => setEditingVendor(null)} className="text-slate-400 hover:text-navy-900 text-lg leading-none">✕</button>
            </div>
            <form onSubmit={handleUpdateVendorSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-navy-900 mb-1">Shop / Business Name *</label>
                <input
                  type="text"
                  required
                  value={editingVendor.shopName}
                  onChange={(e) => setEditingVendor({ ...editingVendor, shopName: e.target.value })}
                  className="w-full bg-slate-50 text-xs border border-slate-200 rounded-xl px-3 py-2.5 outline-none font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-navy-900 mb-1">Owner Name *</label>
                <input
                  type="text"
                  required
                  value={editingVendor.ownerName}
                  onChange={(e) => setEditingVendor({ ...editingVendor, ownerName: e.target.value })}
                  className="w-full bg-slate-50 text-xs border border-slate-200 rounded-xl px-3 py-2.5 outline-none font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-navy-900 mb-1">Mobile Number *</label>
                <input
                  type="tel"
                  required
                  maxLength={10}
                  value={editingVendor.phone}
                  onChange={(e) => setEditingVendor({ ...editingVendor, phone: e.target.value.replace(/\D/g, "") })}
                  className="w-full bg-slate-50 text-xs border border-slate-200 rounded-xl px-3 py-2.5 outline-none font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-navy-900 mb-1">Vendor Login Password</label>
                <input
                  type="text"
                  placeholder="Set / Change Login Password"
                  value={editingVendor.password || ""}
                  onChange={(e) => setEditingVendor({ ...editingVendor, password: e.target.value })}
                  className="w-full bg-slate-50 text-xs border border-slate-200 rounded-xl px-3 py-2.5 outline-none font-bold font-mono"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button type="button" onClick={() => setEditingVendor(null)} className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 rounded-xl">Cancel</button>
                <button
                  type="submit"
                  disabled={isSubmittingEditVendor}
                  className="px-5 py-2 text-xs font-bold text-white bg-brand-500 rounded-xl hover:bg-brand-600 shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isSubmittingEditVendor ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Saving Changes...</span>
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT PRODUCT MODAL (DR) */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="font-bold text-navy-900 text-base">Edit Master Product</h3>
              <button onClick={() => setEditingProduct(null)} className="text-slate-400 hover:text-navy-900 text-lg leading-none">✕</button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); updateMasterProduct(editingProduct.id || editingProduct.masterProductId, editingProduct); setEditingProduct(null); alert("Product updated!"); }} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-navy-900 mb-1">Product Title *</label>
                <input
                  type="text"
                  required
                  value={editingProduct.name}
                  onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                  className="w-full bg-slate-50 text-xs border border-slate-200 rounded-xl px-3 py-2.5 outline-none font-bold"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-navy-900 mb-1">Brand</label>
                  <input
                    type="text"
                    value={editingProduct.brand}
                    onChange={(e) => setEditingProduct({ ...editingProduct, brand: e.target.value })}
                    className="w-full bg-slate-50 text-xs border border-slate-200 rounded-xl px-3 py-2.5 outline-none font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-navy-900 mb-1">Grade / Spec</label>
                  <input
                    type="text"
                    value={editingProduct.grade}
                    onChange={(e) => setEditingProduct({ ...editingProduct, grade: e.target.value })}
                    className="w-full bg-slate-50 text-xs border border-slate-200 rounded-xl px-3 py-2.5 outline-none font-bold"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-navy-900 mb-1">Price (₹) *</label>
                <input
                  type="number"
                  required
                  value={editingProduct.suggestedPrice || editingProduct.price}
                  onChange={(e) => setEditingProduct({ ...editingProduct, suggestedPrice: e.target.value, price: e.target.value })}
                  className="w-full bg-slate-50 text-xs border border-slate-200 rounded-xl px-3 py-2.5 outline-none font-bold"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button type="button" onClick={() => setEditingProduct(null)} className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 rounded-xl">Cancel</button>
                <button type="submit" className="px-5 py-2 text-xs font-bold text-white bg-brand-500 rounded-xl hover:bg-brand-600 shadow-xs">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
