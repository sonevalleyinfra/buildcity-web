import { useState, useRef } from "react";
import Logo from "../../components/Logo";
import { useAuth } from "../../context/AuthContext";
import { useAdmin } from "../../context/AdminContext";
import { useAlert } from "../../context/AlertContext";
import { useNotifications } from "../../context/NotificationContext";
import { formatShortId, formatDateTimeIST } from "../../utils/formatId";

const PRESET_IMAGES = [
  { label: "Cement Bag", url: "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=400&q=80" },
  { label: "Paint Bucket", url: "https://images.unsplash.com/photo-1562259949-e8e7689d7828?auto=format&fit=crop&w=400&q=80" },
  { label: "Steel Rebars", url: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=400&q=80" },
  { label: "Pipes & Plumbing", url: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=400&q=80" },
  { label: "Electrical / Wire", url: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=400&q=80" },
];

const TABS = [
  { id: "Overview", label: "📊 Overview" },
  { id: "Users", label: "👥 Registered Customers" },
  { id: "District Reps (DR)", label: "📍 District Reps (DR)" },
  { id: "Vendors", label: "🏬 Vendors" },
  { id: "Products", label: "📦 Products" },
  { id: "Listings", label: "📋 Listings & Approvals" },
  { id: "Orders", label: "🛒 Orders" },
  { id: "Categories", label: "🏷️ Categories" },
  { id: "Regions", label: "🗺️ Regions" },
  { id: "Coupons", label: "🎟️ Coupons" },
  { id: "Notifications", label: "📢 Send Notifications" },
];

const STATUS_STYLE = {
  APPROVED: "bg-emerald-50 text-emerald-700 border border-emerald-200/80 font-bold",
  PENDING: "bg-amber-50 text-amber-700 border border-amber-200/80 font-bold",
  SUSPENDED: "bg-rose-50 text-rose-700 border border-rose-200/80 font-bold",
  ACTIVE: "bg-emerald-50 text-emerald-700 border border-emerald-200/80 font-bold",
  INACTIVE: "bg-rose-50 text-rose-700 border border-rose-200/80 font-bold",
  Delivered: "bg-emerald-50 text-emerald-700 border border-emerald-200/80 font-bold",
  Shipped: "bg-blue-50 text-blue-700 border border-blue-200/80 font-bold",
  Pending: "bg-amber-50 text-amber-700 border border-amber-200/80 font-bold",
  Cancelled: "bg-rose-50 text-rose-700 border border-rose-200/80 font-bold",
};

// Super Admin Dashboard component — Master Control Center for platform operations
// Admin yahan se DRs assign karta hai, Vendors approve/suspend karta hai, Master Product Catalog manage karta hai, aur Categories/Regions configure karta hai.
export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const { showAlert, showConfirm } = useAlert();
  const {
    drs = [],
    vendors,
    users = [],
    orders,
    categories,
    regions,
    coupons = [],
    masterProducts = [],
    products = [],
    productsLoading,
    stats,
    addDr,
    updateDr,
    removeDr,
    toggleDrActive,
    addVendor,
    updateVendor,
    setVendorStatus,
    removeVendor,
    clearAllVendorsAndProducts,
    addCategory,
    updateCategory,
    removeCategory,
    toggleCategoryActive,
    addRegion,
    updateRegion,
    removeRegion,
    toggleRegionActive,
    addCoupon,
    updateCoupon,
    removeCoupon,
    toggleCouponActive,
    addMasterProduct,
    updateMasterProduct,
    updateVendorProductListing,
    updateListingApprovalStatus,
    updateOrderStatus,
    fetchCloudData,
  } = useAdmin();

  // Tab State: Overview, District Reps, Vendors, Products, Listings, Orders, Categories, Regions
  const [tab, setTab] = useState("Overview");
  const tabsContainerRef = useRef(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [listingFilter, setListingFilter] = useState("ALL");

  // Modals state (Naya DR, Vendor, Category, Region, Product add karne ke liye)
  const [showDrForm, setShowDrForm] = useState(false);
  const [showVendorForm, setShowVendorForm] = useState(false);
  const [showCatForm, setShowCatForm] = useState(false);
  const [showRegionForm, setShowRegionForm] = useState(false);
  const [showProductForm, setShowProductForm] = useState(false);

  // Modals state (Existing DR, Vendor, Product, Category, Region EDIT karne ke liye)
  const [editingDr, setEditingDr] = useState(null);
  const [editingVendor, setEditingVendor] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);
  const [editingCategory, setEditingCategory] = useState(null);
  const [editingRegion, setEditingRegion] = useState(null);
  const [editingCoupon, setEditingCoupon] = useState(null);

  // Forms
  const [drForm, setDrForm] = useState({ name: "", phone: "", regionId: "" });
  const [vendorForm, setVendorForm] = useState({ shopName: "", ownerName: "", phone: "", password: "", regionId: "", commissionRate: 10 });
  const [catForm, setCatForm] = useState({ name: "" });
  const [regionForm, setRegionForm] = useState({ name: "", state: "Uttar Pradesh", baseDeliveryCharge: 49 });
  const [couponForm, setCouponForm] = useState({
    code: "",
    title: "",
    discountAmount: 100,
    minOrder: 1000,
    expiryDate: "2026-12-31",
    desc: "",
  });
  const [showCouponForm, setShowCouponForm] = useState(false);
  const [isSubmittingCoupon, setIsSubmittingCoupon] = useState(false);
  const [deletingCouponId, setDeletingCouponId] = useState(null);

  // Admin Real-Time Customer Notification Broadcast State
  const {
    notifications: adminNotifs = [],
    sendBroadcastNotification,
    isSending: isSendingNotif,
    isLoadingNotifs,
    fetchDbNotifications,
    removeNotification: removeAdminNotif,
    clearAllNotifications: clearAllAdminNotifs,
  } = useNotifications();
  const [notifTitle, setNotifTitle] = useState("");
  const [notifMessage, setNotifMessage] = useState("");
  const [notifCategory, setNotifCategory] = useState("offer");
  const [notifStatusMsg, setNotifStatusMsg] = useState("");
  const [deletingNotifId, setDeletingNotifId] = useState(null);
  const [isClearingAllNotifs, setIsClearingAllNotifs] = useState(false);

  const handleSendBroadcast = async (e) => {
    e.preventDefault();
    if (!notifTitle.trim() || !notifMessage.trim()) {
      showAlert({ title: "Missing Information", message: "Please provide both a Title and Message for the broadcast.", type: "warning" });
      return;
    }

    try {
      const ok = await sendBroadcastNotification({
        title: notifTitle.trim(),
        message: notifMessage.trim(),
        type: notifCategory,
      });

      if (ok) {
        setNotifStatusMsg("✓ Broadcast notification sent & saved to Supabase Database in real-time!");
        setNotifTitle("");
        setNotifMessage("");
        showAlert({
          title: "📢 Broadcast Sent Successfully!",
          message: "Notification has been saved to Supabase Database and delivered to all customer devices in real-time.",
          type: "success",
        });
        setTimeout(() => setNotifStatusMsg(""), 5000);
      }
    } catch (err) {
      showAlert({ title: "Broadcast Error", message: err.message || "Failed to send broadcast.", type: "error" });
    }
  };

  const handleAddCoupon = async (e) => {
    e.preventDefault();
    if (!couponForm.code.trim()) {
      showAlert({ title: "Coupon Code Required", message: "Please enter a valid coupon code.", type: "warning" });
      return;
    }
    setIsSubmittingCoupon(true);
    try {
      await addCoupon({
        code: couponForm.code.trim(),
        title: couponForm.title.trim() || `Flat ₹${couponForm.discountAmount} OFF`,
        discountAmount: Number(couponForm.discountAmount) || 100,
        minOrder: Number(couponForm.minOrder) || 1000,
        expiryDate: couponForm.expiryDate || "2026-12-31",
        desc: couponForm.desc.trim() || `Valid on orders above ₹${couponForm.minOrder || 1000}`,
      });
      setCouponForm({ code: "", title: "", discountAmount: 100, minOrder: 1000, expiryDate: "2026-12-31", desc: "" });
      setShowCouponForm(false);
      showAlert({ title: "Coupon Created", message: `Coupon "${couponForm.code.trim().toUpperCase()}" created & activated successfully!`, type: "success" });
    } catch (err) {
      showAlert({ title: "Error", message: "Error adding coupon: " + (err.message || err), type: "error" });
    } finally {
      setIsSubmittingCoupon(false);
    }
  };

  const handleUpdateCouponSubmit = async (e) => {
    e.preventDefault();
    if (!editingCoupon) return;
    setIsSubmittingCoupon(true);
    try {
      await updateCoupon(editingCoupon.id, editingCoupon);
      setEditingCoupon(null);
      showAlert({ title: "Coupon Updated", message: "Coupon updated in Database successfully!", type: "success" });
    } catch (err) {
      showAlert({ title: "Error", message: "Error updating coupon: " + (err.message || err), type: "error" });
    } finally {
      setIsSubmittingCoupon(false);
    }
  };

  const handleDeleteCoupon = async (c) => {
    showConfirm({
      title: "Delete Coupon?",
      message: `Are you sure you want to delete coupon "${c.code}"?`,
      type: "warning",
      confirmText: "Delete",
      onConfirm: async () => {
        setDeletingCouponId(c.id);
        try {
          await removeCoupon(c);
          showAlert({ title: "Coupon Deleted", message: `Coupon "${c.code}" has been removed.`, type: "success" });
        } finally {
          setDeletingCouponId(null);
        }
      },
    });
  };
  const [productForm, setProductForm] = useState({
    name: "",
    categoryId: "",
    vendorId: "",
    brand: "",
    type: "",
    grade: "",
    unit: "50kg Bag",
    price: "",
    stockQty: "",
  });

  const [isSubmittingVendor, setIsSubmittingVendor] = useState(false);
  const [isSubmittingEditVendor, setIsSubmittingEditVendor] = useState(false);
  const [deletingVendorId, setDeletingVendorId] = useState(null);
  const [deletingCatId, setDeletingCatId] = useState(null);
  const [deletingRegionId, setDeletingRegionId] = useState(null);
  const [busyListingId, setBusyListingId] = useState(null);

  // Vendor Delete Handler — Live spinner animation aur double-click protection ke sath vendor remove karein
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

  // Admin Add Vendor Handler — Direct APPROVED status aur submission spinner ke sath Naya Vendor save karein
  const handleAddVendorSubmit = async (e) => {
    e.preventDefault();
    if (!vendorForm.shopName.trim() || !vendorForm.ownerName.trim() || !vendorForm.phone.trim()) {
      showAlert({ title: "Validation Error", message: "Please fill all Vendor details!", type: "warning" });
      return;
    }
    if (isSubmittingVendor) return;

    setIsSubmittingVendor(true);
    try {
      const selectedReg = regions.find((r) => r.id === vendorForm.regionId || (r.name || "").toLowerCase() === (vendorForm.regionId || "").toLowerCase());
      const finalRegId = selectedReg ? selectedReg.id : (vendorForm.regionId || undefined);
      const finalRegName = selectedReg ? selectedReg.name : "Mirzapur";

      await addVendor({
        shopName: vendorForm.shopName.trim(),
        ownerName: vendorForm.ownerName.trim(),
        phone: vendorForm.phone.trim(),
        password: vendorForm.password.trim() || "vendor123",
        regionId: finalRegId,
        regionName: finalRegName,
        districtName: finalRegName,
        commissionRate: Number(vendorForm.commissionRate) || 10,
        status: "APPROVED",
        addedByDr: "Super Admin",
      });
      setVendorForm({ shopName: "", ownerName: "", phone: "", password: "", regionId: "", commissionRate: 10 });
      setShowVendorForm(false);
      showAlert({ title: "Vendor Added", message: `Vendor "${vendorForm.shopName.trim()}" successfully added to Supabase Cloud Database!`, type: "success" });
    } catch (err) {
      showAlert({ title: "Error", message: "Failed to add vendor: " + err.message, type: "error" });
    } finally {
      setIsSubmittingVendor(false);
    }
  };

  const [isSubmittingDr, setIsSubmittingDr] = useState(false);
  const [deletingDrId, setDeletingDrId] = useState(null);

  const handleDeleteDr = async (d) => {
    showConfirm({
      title: "Delete District Representative?",
      message: `Are you sure you want to permanently delete DR "${d.name}" (${d.phone}) from Database?`,
      type: "error",
      confirmText: "Delete DR",
      onConfirm: async () => {
        setDeletingDrId(d.id);
        try {
          await removeDr(d.id);
          showAlert({ title: "DR Deleted", message: `District Representative "${d.name}" removed successfully.`, type: "success" });
        } finally {
          setDeletingDrId(null);
        }
      },
    });
  };

  const handleCreateDr = async (e) => {
    e.preventDefault();
    if (!drForm.name.trim() || !drForm.phone.trim() || !drForm.regionId) {
      showAlert({ title: "Validation Error", message: "Please fill all District Rep details!", type: "warning" });
      return;
    }
    if (isSubmittingDr) return;

    setIsSubmittingDr(true);
    try {
      await addDr({
        name: drForm.name.trim(),
        phone: drForm.phone.trim(),
        password: drForm.password ? drForm.password.trim() : "dr123",
        regionId: drForm.regionId,
      });
      setDrForm({ name: "", phone: "", password: "", regionId: "" });
      setShowDrForm(false);
      showAlert({ title: "DR Added", message: "District Representative & Password added to Database successfully!", type: "success" });
    } catch (err) {
      showAlert({ title: "Error", message: "Failed to add DR: " + err.message, type: "error" });
    } finally {
      setIsSubmittingDr(false);
    }
  };

  const [isSubmittingEditDr, setIsSubmittingEditDr] = useState(false);

  const handleUpdateDrSubmit = async (e) => {
    e.preventDefault();
    if (!editingDr) return;
    setIsSubmittingEditDr(true);
    try {
      await updateDr(editingDr.id, editingDr);
      setEditingDr(null);
      showAlert({ title: "DR Updated", message: "DR details updated in Database successfully!", type: "success" });
    } catch (err) {
      showAlert({ title: "Error", message: "Failed to update DR: " + (err.message || err), type: "error" });
    } finally {
      setIsSubmittingEditDr(false);
    }
  };

  const handleUpdateVendorSubmit = async (e) => {
    e.preventDefault();
    if (!editingVendor) return;
    setIsSubmittingEditVendor(true);
    try {
      await updateVendor(editingVendor.id, editingVendor);
      setEditingVendor(null);
      showAlert({ title: "Vendor Updated", message: "Vendor details & password updated in Database successfully!", type: "success" });
    } catch (err) {
      showAlert({ title: "Error", message: "Failed to update vendor: " + (err.message || err), type: "error" });
    } finally {
      setIsSubmittingEditVendor(false);
    }
  };

  const [isSubmittingProduct, setIsSubmittingProduct] = useState(false);
  const [isSubmittingEditProduct, setIsSubmittingEditProduct] = useState(false);

  const handleAddProduct = async (e) => {
    e.preventDefault();
    if (!productForm.name.trim() || !productForm.categoryId) {
      showAlert({ title: "Validation Error", message: "Please select Category and enter Product Title!", type: "warning" });
      return;
    }
    if (isSubmittingProduct) return;

    setIsSubmittingProduct(true);
    try {
      await addMasterProduct({
        name: productForm.name.trim(),
        categoryId: productForm.categoryId,
        brand: productForm.brand.trim() || "Generic",
        type: productForm.type.trim() || "Standard",
        grade: productForm.grade.trim() || "Standard Grade",
        unit: productForm.unit.trim() || "Piece",
        suggestedPrice: Number(productForm.price || productForm.suggestedPrice) || 100,
        imageUrl: productForm.imageUrl || "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=400&q=80",
        addedBy: "Admin",
      });

      setProductForm({ name: "", categoryId: "", brand: "", type: "", grade: "", unit: "50kg Bag", price: "", stockQty: "" });
      setShowProductForm(false);
      showAlert({ title: "Master Product Created", message: `Master product "${productForm.name.trim()}" saved to Database successfully!`, type: "success" });
    } catch (err) {
      showAlert({ title: "Error", message: "Failed to create master product: " + (err.message || err), type: "error" });
    } finally {
      setIsSubmittingProduct(false);
    }
  };

  const handleUpdateProductSubmit = async (e) => {
    e.preventDefault();
    if (!editingProduct) return;
    setIsSubmittingEditProduct(true);
    try {
      const targetPrice = Number(editingProduct.suggestedPrice || editingProduct.price || 100);
      const prodId = editingProduct.id || editingProduct.masterProductId;

      await updateMasterProduct(prodId, {
        ...editingProduct,
        suggestedPrice: targetPrice,
        price: targetPrice,
      });

      if (editingProduct.vendorId || editingProduct.masterProductId) {
        await updateVendorProductListing(editingProduct.id, {
          name: editingProduct.name,
          brand: editingProduct.brand,
          grade: editingProduct.grade,
          unit: editingProduct.unit,
          price: targetPrice,
        }).catch(() => null);
      }

      setEditingProduct(null);
      showAlert({ title: "Product Updated", message: "Product details and price updated successfully in Database!", type: "success" });
    } catch (err) {
      showAlert({ title: "Error", message: "Failed to update product: " + (err.message || err), type: "error" });
    } finally {
      setIsSubmittingEditProduct(false);
    }
  };

  const [isSubmittingCat, setIsSubmittingCat] = useState(false);

  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!catForm.name.trim()) return;
    setIsSubmittingCat(true);
    try {
      await addCategory({ name: catForm.name });
      setCatForm({ name: "" });
      setShowCatForm(false);
      showAlert({ title: "Category Added", message: `Category "${catForm.name}" created successfully!`, type: "success" });
    } catch (err) {
      showAlert({ title: "Error", message: "Error adding category: " + (err.message || err), type: "error" });
    } finally {
      setIsSubmittingCat(false);
    }
  };

  const handleUpdateCategorySubmit = async (e) => {
    e.preventDefault();
    if (!editingCategory) return;
    setIsSubmittingCat(true);
    try {
      await updateCategory(editingCategory.id, editingCategory);
      setEditingCategory(null);
      showAlert({ title: "Category Updated", message: `Category "${editingCategory.name}" updated in Database successfully!`, type: "success" });
    } catch (err) {
      showAlert({ title: "Error", message: "Error updating category: " + (err.message || err), type: "error" });
    } finally {
      setIsSubmittingCat(false);
    }
  };

  const [isSubmittingRegion, setIsSubmittingRegion] = useState(false);

  const handleAddRegion = async (e) => {
    e.preventDefault();
    if (!regionForm.name.trim()) return;
    setIsSubmittingRegion(true);
    try {
      await addRegion({
        name: regionForm.name.trim(),
        state: regionForm.state || "Uttar Pradesh",
        baseDeliveryCharge: Number(regionForm.baseDeliveryCharge) || 49,
      });
      setRegionForm({ name: "", state: "Uttar Pradesh", baseDeliveryCharge: 49 });
      setShowRegionForm(false);
      showAlert({ title: "Region Added", message: `District Region "${regionForm.name.trim()}" saved to Database successfully!`, type: "success" });
    } catch (err) {
      showAlert({ title: "Error", message: "Error adding district region: " + (err.message || err), type: "error" });
    } finally {
      setIsSubmittingRegion(false);
    }
  };

  const handleUpdateRegionSubmit = async (e) => {
    e.preventDefault();
    if (!editingRegion) return;
    setIsSubmittingRegion(true);
    try {
      await updateRegion(editingRegion.id, editingRegion);
      setEditingRegion(null);
      showAlert({ title: "Region Updated", message: "District Region updated in Database successfully!", type: "success" });
    } catch (err) {
      showAlert({ title: "Error", message: "Error updating district region: " + (err.message || err), type: "error" });
    } finally {
      setIsSubmittingRegion(false);
    }
  };

  const filteredListings = products.filter((p) => {
    const st = p.approvalStatus || (p.isActive ? "APPROVED" : "PENDING_REVIEW");
    if (listingFilter === "ALL") return true;
    return st === listingFilter;
  });

  const renderTableSkeleton = (cols = 5) => (
    <tbody className="divide-y divide-slate-100 animate-pulse">
      {[1, 2, 3, 4].map((n) => (
        <tr key={n}>
          {Array.from({ length: cols }).map((_, i) => (
            <td key={i} className="py-4 px-4">
              <div className="h-3.5 bg-slate-200 rounded w-3/4" />
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-navy-900 pb-16 font-sans">
      {/* Admin Sticky Header hai  */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo size="sm" />
            <span className="bg-brand-50 text-brand-700 border border-brand-200 text-xs font-bold px-2.5 py-1 rounded-full">
              🟢 Super Admin Control Center
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-bold text-navy-900">{user?.name || "System Administrator"}</p>
              <p className="text-[11px] text-slate-500">Master Platform Operations</p>
            </div>
            <button
              onClick={logout}
              className="text-xs font-bold text-red-600 bg-red-50 border border-red-200 px-3.5 py-1.5 rounded-xl hover:bg-red-100 transition-colors cursor-pointer"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Tabs Bar with Smooth Horizontal Scroll & Quick Nav Controls */}
        <div className="border-t border-slate-100 bg-slate-50/50">
          <div className="max-w-7xl mx-auto px-2 sm:px-6 flex items-center gap-1.5">
            <button
              onClick={() => {
                if (tabsContainerRef.current) {
                  tabsContainerRef.current.scrollBy({ left: -220, behavior: "smooth" });
                }
              }}
              aria-label="Scroll tabs left"
              className="hidden sm:flex items-center justify-center h-7 w-7 rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-navy-900 hover:bg-slate-100 shadow-2xs shrink-0 cursor-pointer active:scale-95 transition-all text-sm font-bold"
            >
              ‹
            </button>

            <div
              ref={tabsContainerRef}
              className="flex-1 flex gap-2 overflow-x-auto py-2.5 custom-scrollbar scroll-smooth"
            >
              {TABS.map((t) => {
                const pendingCount = products.filter(
                  (p) => (p.approvalStatus || (p.isActive ? "APPROVED" : "PENDING_REVIEW")) === "PENDING_REVIEW"
                ).length;

                return (
                  <button
                    key={t.id}
                    onClick={() => setTab(t.id)}
                    className={`px-3.5 py-2 text-xs font-bold rounded-xl active:scale-[0.98] transition-all duration-200 whitespace-nowrap cursor-pointer flex items-center gap-1.5 shrink-0 ${
                      tab === t.id
                        ? "bg-navy-900 text-white shadow-xs"
                        : "text-slate-600 bg-white hover:bg-slate-100 border border-slate-200/80 hover:text-navy-900"
                    }`}
                  >
                    <span>{t.label}</span>
                    {t.id === "Users" && (
                      <span className="bg-brand-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-2xs">
                        {users.filter((u) => !u.role || u.role === "CUSTOMER").length}
                      </span>
                    )}
                    {t.id === "Listings" && pendingCount > 0 && (
                      <span className="bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full animate-pulse">
                        {pendingCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => {
                if (tabsContainerRef.current) {
                  tabsContainerRef.current.scrollBy({ left: 220, behavior: "smooth" });
                }
              }}
              aria-label="Scroll tabs right"
              className="hidden sm:flex items-center justify-center h-7 w-7 rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-navy-900 hover:bg-slate-100 shadow-2xs shrink-0 cursor-pointer active:scale-95 transition-all text-sm font-bold"
            >
              ›
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 mt-6">
        {/* OVERVIEW TAB */}
        {tab === "Overview" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="bg-white border border-slate-200/90 rounded-2xl p-4.5 shadow-2xs hover:shadow-md hover:border-brand-300 transition-all duration-200 relative overflow-hidden group">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-brand-500 to-brand-600" />
                <p className="text-xs font-semibold text-slate-500 tracking-tight">Total Revenue</p>
                <p className="text-2xl font-black text-navy-900 tracking-tight mt-1">₹{stats.totalRevenue.toLocaleString("en-IN")}</p>
                <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-bold inline-block mt-1">From completed orders</span>
              </div>
              <div className="bg-white border border-slate-200/90 rounded-2xl p-4.5 shadow-2xs hover:shadow-md hover:border-brand-300 transition-all duration-200 relative overflow-hidden group">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
                <p className="text-xs font-semibold text-slate-500 tracking-tight">Approved Vendors</p>
                <p className="text-2xl font-black text-navy-900 tracking-tight mt-1">
                  {stats?.approvedVendors ?? vendors.filter((v) => v.status === "APPROVED").length}
                </p>
                <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-bold inline-block mt-1">Active & Ready to Login</span>
              </div>
              <div className="bg-white border border-slate-200/90 rounded-2xl p-4.5 shadow-2xs hover:shadow-md hover:border-brand-300 transition-all duration-200 relative overflow-hidden group">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 to-orange-500" />
                <p className="text-xs font-semibold text-slate-500 tracking-tight">District Reps (DR)</p>
                <p className="text-2xl font-black text-navy-900 tracking-tight mt-1">{drs.length}</p>
                <span className="text-[10px] text-brand-700 bg-brand-50 px-2 py-0.5 rounded-full font-bold inline-block mt-1">Active ground agents</span>
              </div>
              <div className="bg-white border border-slate-200/90 rounded-2xl p-4.5 shadow-2xs hover:shadow-md hover:border-brand-300 transition-all duration-200 relative overflow-hidden group">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-600" />
                <p className="text-xs font-semibold text-slate-500 tracking-tight">Active Products</p>
                <p className="text-2xl font-black text-navy-900 tracking-tight mt-1">{products.length}</p>
                <span className="text-[10px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full font-bold inline-block mt-1">{categories.length} categories</span>
              </div>
              <div className="bg-white border border-slate-200/90 rounded-2xl p-4.5 shadow-2xs hover:shadow-md hover:border-brand-300 transition-all duration-200 relative overflow-hidden group">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-pink-500" />
                <p className="text-xs font-semibold text-slate-500 tracking-tight">Covered Regions</p>
                <p className="text-2xl font-black text-navy-900 tracking-tight mt-1">{regions.length}</p>
                <span className="text-[10px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full font-bold inline-block mt-1">Uttar Pradesh</span>
              </div>
            </div>

            <div className="bg-gradient-to-r from-navy-950 via-navy-900 to-slate-900 border border-navy-800/60 rounded-2xl p-6 text-white shadow-md flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-black tracking-tight">Admin Management Shortcuts</h2>
                <p className="text-xs text-slate-300 font-medium mt-0.5">Quickly assign DRs, manage vendors, and inspect live marketplace transactions.</p>
              </div>
              <div className="flex gap-2.5 shrink-0">
                <button onClick={() => setTab("District Reps (DR)")} className="bg-brand-500 hover:bg-brand-600 active:scale-[0.98] transition-all duration-200 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-xs cursor-pointer">
                  + Add District Rep (DR)
                </button>
                <button onClick={() => setTab("Vendors")} className="bg-white text-navy-950 hover:bg-slate-100 active:scale-[0.98] transition-all duration-200 font-bold text-xs px-4 py-2.5 rounded-xl shadow-xs cursor-pointer">
                  Manage Vendors
                </button>
              </div>
            </div>
          </div>
        )}

        {/* USERS & CUSTOMERS TRACKING TAB */}
        {tab === "Users" && (
          <div className="space-y-4 font-sans">
            {/* Header & Quick Stats */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-base sm:text-lg font-black text-navy-900 flex items-center gap-2 tracking-tight">
                  <span>👥 Registered Customer Database & Addresses</span>
                  <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 font-extrabold text-[10px] px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                    🟢 Live Supabase DB
                  </span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  View all registered customer accounts, mobile numbers, delivery site addresses, and purchase activity.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    fetchCloudData();
                    alert("Syncing latest customer profiles and addresses from Supabase Database...");
                  }}
                  className="bg-brand-50 hover:bg-brand-100 text-brand-700 font-bold text-xs px-3.5 py-2 rounded-xl border border-brand-200 shadow-2xs active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  🔄 Refresh Customers DB
                </button>
              </div>
            </div>

            {/* Customer Stats Breakdown */}
            {(() => {
              const customerUsers = users.filter((u) => !u.role || u.role === "CUSTOMER");
              const withAddresses = customerUsers.filter((u) => (u.addresses && u.addresses.length > 0) || u.address).length;
              const withOrders = customerUsers.filter((u) => (u.orders && u.orders.length > 0) || (u.ordersCount > 0)).length;

              return (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-white border border-slate-200/90 rounded-xl p-3.5 shadow-2xs">
                    <p className="text-[11px] font-bold text-slate-500">Total Registered Customers</p>
                    <p className="text-xl font-black text-navy-900 mt-0.5 tabular-nums">{customerUsers.length}</p>
                  </div>
                  <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-xl p-3.5 shadow-2xs">
                    <p className="text-[11px] font-bold text-emerald-800">📍 Saved Site Delivery Addresses</p>
                    <p className="text-xl font-black text-emerald-900 mt-0.5 tabular-nums">{withAddresses}</p>
                  </div>
                  <div className="bg-brand-50/60 border border-brand-200/80 rounded-xl p-3.5 shadow-2xs">
                    <p className="text-[11px] font-bold text-brand-800">🛒 Active Purchasing Customers</p>
                    <p className="text-xl font-black text-brand-900 mt-0.5 tabular-nums">{withOrders}</p>
                  </div>
                </div>
              );
            })()}

            {/* Search Input */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">🔍</span>
                <input
                  type="text"
                  placeholder="Search customer by name, mobile phone, address, city, or pincode..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-50 text-xs font-medium border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 outline-none focus:border-brand-500 focus:bg-white transition-all"
                />
              </div>
            </div>

            {/* Customers Table */}
            <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-black text-slate-500 uppercase tracking-wider">
                    <tr>
                      <th className="p-3.5 pl-4">Customer Details</th>
                      <th className="p-3.5">Mobile Phone</th>
                      <th className="p-3.5">📍 Full Delivery Address</th>
                      <th className="p-3.5">Orders & Activity</th>
                      <th className="p-3.5">Registered Date</th>
                      <th className="p-3.5 pr-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {users
                      .filter((u) => !u.role || u.role === "CUSTOMER")
                      .filter((u) => {
                        const query = searchTerm.toLowerCase().trim();
                        if (!query) return true;
                        const uName = (u.name || "").toLowerCase();
                        const uPhone = (u.phone || "").toLowerCase();
                        const uDist = (u.district || u.city || "").toLowerCase();
                        const uAddr = (
                          Array.isArray(u.addresses)
                            ? u.addresses.map((a) => `${a.streetAddress || ""} ${a.area || ""} ${a.city || ""} ${a.pincode || ""}`).join(" ")
                            : u.address || ""
                        ).toLowerCase();
                        return uName.includes(query) || uPhone.includes(query) || uDist.includes(query) || uAddr.includes(query);
                      })
                      .map((u, idx) => {
                        const resolvedAddress = (() => {
                          if (Array.isArray(u.addresses) && u.addresses.length > 0) {
                            const addr = u.addresses[0];
                            const parts = [
                              addr.houseNo || addr.streetAddress || addr.address,
                              addr.area || addr.landmark,
                              addr.city || addr.district || u.district,
                              addr.state || "Uttar Pradesh",
                              addr.pincode,
                            ].filter(Boolean);
                            if (parts.length > 0) return parts.join(", ");
                          }
                          if (Array.isArray(u.orders) && u.orders.length > 0) {
                            const lastOrder = u.orders[0];
                            if (lastOrder.address) {
                              if (typeof lastOrder.address === "string") return lastOrder.address;
                              if (typeof lastOrder.address === "object") {
                                const a = lastOrder.address;
                                return [a.street || a.address, a.city || a.district, a.pincode].filter(Boolean).join(", ");
                              }
                            }
                          }
                          if (u.address) return u.address;
                          if (u.district) return `${u.district}, Uttar Pradesh`;
                          return "Address Not Added Yet";
                        })();

                        const orderCount = Array.isArray(u.orders) ? u.orders.length : (u.ordersCount || 0);

                        return (
                          <tr key={u.id || idx} className="hover:bg-slate-50/80 transition-colors">
                            <td className="p-3.5 pl-4">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 font-black text-xs flex items-center justify-center border border-brand-200 shrink-0">
                                  {(u.name || u.phone || "C").charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <p className="font-extrabold text-navy-900 text-xs tracking-tight">{u.name || "Customer Account"}</p>
                                  <p className="text-[10px] font-medium text-slate-400 font-mono">ID: {formatShortId(u.id)}</p>
                                </div>
                              </div>
                            </td>
                            <td className="p-3.5 font-bold text-slate-800 font-mono">
                              📱 {u.phone}
                            </td>
                            <td className="p-3.5 max-w-xs">
                              <div className="flex items-start gap-1.5 text-xs text-navy-900 font-medium leading-snug">
                                <span className="text-sm shrink-0">📍</span>
                                <span className={resolvedAddress === "Address Not Added Yet" ? "text-slate-400 italic" : "font-bold text-slate-800"}>
                                  {resolvedAddress}
                                </span>
                              </div>
                            </td>
                            <td className="p-3.5">
                              <div className="flex items-center gap-2 text-[10px] font-bold">
                                <span className="bg-emerald-50 text-emerald-800 px-2.5 py-0.5 rounded border border-emerald-200">
                                  🛒 {orderCount} Orders
                                </span>
                              </div>
                            </td>
                            <td className="p-3.5 text-slate-500 font-medium text-[11px]">
                              {u.createdAt ? new Date(u.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "Recently"}
                            </td>
                            <td className="p-3.5 pr-4 text-right">
                              <a
                                href={`tel:${u.phone}`}
                                className="inline-flex items-center gap-1 bg-brand-50 hover:bg-brand-100 text-brand-700 font-bold text-[11px] px-3 py-1.5 rounded-lg border border-brand-200 transition-colors"
                              >
                                📞 Call Customer
                              </a>
                            </td>
                          </tr>
                        );
                      })}
                    {users.filter((u) => !u.role || u.role === "CUSTOMER").length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-500 text-xs font-bold">
                          📦 No registered customer accounts found in database.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* DISTRICT REPS (DR) TAB  hai ye */}
        {tab === "District Reps (DR)" && (
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
              <div>
                <h2 className="text-base font-extrabold text-navy-900">District Representatives (DR) Management</h2>
                <p className="text-xs text-slate-500 mt-0.5">Assign mobile numbers to DR ground agents to manage vendor and product onboarding by district.</p>
              </div>
              <button
                onClick={() => setShowDrForm((v) => !v)}
                className="bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                + Assign New DR
              </button>
            </div>

            {showDrForm && (
              <form onSubmit={handleCreateDr} className="p-5 border-b border-slate-200 bg-brand-50/30 space-y-4">
                <h4 className="font-bold text-navy-900 text-xs uppercase tracking-wider">Assign District Representative Credentials</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-navy-900 mb-1">DR Full Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Ramesh Sharma"
                      value={drForm.name}
                      onChange={(e) => setDrForm({ ...drForm, name: e.target.value })}
                      className="w-full bg-white text-xs border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-brand-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-navy-900 mb-1">Assigned Mobile Number *</label>
                    <input
                      type="tel"
                      required
                      maxLength={10}
                      placeholder="10-digit mobile number"
                      value={drForm.phone}
                      onChange={(e) => setDrForm({ ...drForm, phone: e.target.value.replace(/\D/g, "") })}
                      className="w-full bg-white text-xs border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-brand-500 font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-navy-900 mb-1">Set DR Login Password</label>
                    <input
                      type="text"
                      placeholder="Login Password (default: dr123)"
                      value={drForm.password || ""}
                      onChange={(e) => setDrForm({ ...drForm, password: e.target.value })}
                      className="w-full bg-white text-xs border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-brand-500 font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-navy-900 mb-1">Assign District / Region *</label>
                    <select
                      required
                      value={drForm.regionId}
                      onChange={(e) => setDrForm({ ...drForm, regionId: e.target.value })}
                      className="w-full bg-white text-xs border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-brand-500 font-bold"
                    >
                      <option value="">-- Select District --</option>
                      {regions.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name} ({r.state})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setShowDrForm(false)} className="px-4 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl">Cancel</button>
                  <button
                    type="submit"
                    disabled={isSubmittingDr}
                    className="px-5 py-2 text-xs font-bold text-white bg-brand-500 rounded-xl shadow-xs hover:bg-brand-600 flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmittingDr ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                        Saving DR Access...
                      </>
                    ) : (
                      "Save DR Access"
                    )}
                  </button>
                </div>
              </form>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200/90 bg-slate-50/90 text-[11px] font-black text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">DR Representative</th>
                    <th className="py-3 px-4">Assigned Mobile</th>
                    <th className="py-3 px-4">Assigned District</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Onboarded Stats</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                {productsLoading ? (
                  renderTableSkeleton(6)
                ) : (
                  <tbody className="divide-y divide-slate-100">
                    {drs.map((d) => (
                      <tr key={d.id} className="hover:bg-slate-50/80 transition-colors duration-150">
                        <td className="py-3.5 px-4 font-bold text-navy-900">{d.name}</td>
                        <td className="py-3.5 px-4 font-semibold text-slate-700">📱 {d.phone}</td>
                        <td className="py-3.5 px-4">
                          <span className="bg-slate-100 text-slate-800 font-bold px-2.5 py-0.5 rounded text-[11px]">
                            📍 {d.regionName}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${STATUS_STYLE[d.status]}`}>
                            {d.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-600">
                          {d.vendorCount || 0} Vendors · {d.productCount || 0} Products
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setEditingDr({ ...d })}
                              className="text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg px-2.5 py-1.5 active:scale-[0.98] transition-all duration-200 cursor-pointer"
                            >
                              ✏️ Edit
                            </button>
                            <button
                              onClick={() => toggleDrActive(d.id)}
                              className={`text-xs font-semibold px-3 py-1.5 rounded-lg border active:scale-[0.98] transition-all duration-200 cursor-pointer ${
                                d.status === "ACTIVE"
                                  ? "bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100"
                                  : "bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700 shadow-2xs"
                              }`}
                            >
                              {d.status === "ACTIVE" ? "Deactivate" : "Activate"}
                            </button>
                            <button
                              disabled={deletingDrId === d.id}
                              onClick={() => handleDeleteDr(d)}
                              className="text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-lg px-2.5 py-1.5 active:scale-[0.98] transition-all duration-200 cursor-pointer disabled:opacity-50 flex items-center gap-1"
                            >
                              {deletingDrId === d.id ? (
                                <>
                                  <span className="w-3 h-3 border-2 border-rose-600 border-t-transparent rounded-full animate-spin" />
                                  <span>Deleting...</span>
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
                )}
              </table>
            </div>
          </div>
        )}

        {/* VENDORS TAB */}
        {tab === "Vendors" && (
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
              <div>
                <h2 className="text-base font-extrabold text-navy-900">Vendor Management</h2>
                <p className="text-xs text-slate-500 mt-0.5">Approve, Edit, Suspend, or Delete marketplace vendors. Approved vendors can log in via Mobile OTP.</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowVendorForm(true)}
                  className="bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl active:scale-[0.98] transition-all duration-200 cursor-pointer shadow-xs hover:shadow-md"
                >
                  + Add Vendor
                </button>
              </div>
            </div>

            {/* Admin Add Vendor Modal / Form */}
            {showVendorForm && (
              <form onSubmit={handleAddVendorSubmit} className="p-5 bg-slate-50 border-b border-slate-200 space-y-4">
                <h3 className="font-extrabold text-navy-900 text-xs uppercase tracking-wider">Add New Vendor Partner</h3>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-navy-900 mb-1">Shop / Business Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Shree Cement Traders"
                      value={vendorForm.shopName}
                      onChange={(e) => setVendorForm({ ...vendorForm, shopName: e.target.value })}
                      className="w-full bg-white text-xs border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-brand-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-navy-900 mb-1">Owner Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Rakesh Gupta"
                      value={vendorForm.ownerName}
                      onChange={(e) => setVendorForm({ ...vendorForm, ownerName: e.target.value })}
                      className="w-full bg-white text-xs border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-brand-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-navy-900 mb-1">Mobile Phone *</label>
                    <input
                      type="tel"
                      required
                      maxLength={10}
                      placeholder="10-digit mobile number"
                      value={vendorForm.phone}
                      onChange={(e) => setVendorForm({ ...vendorForm, phone: e.target.value.replace(/\D/g, "") })}
                      className="w-full bg-white text-xs border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-brand-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-navy-900 mb-1">Assign District *</label>
                    <select
                      required
                      value={vendorForm.regionId}
                      onChange={(e) => setVendorForm({ ...vendorForm, regionId: e.target.value })}
                      className="w-full bg-white text-xs border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-brand-500"
                    >
                      <option value="">-- Select District --</option>
                      {regions.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name} ({r.state})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-navy-900 mb-1">Set Login Password *</label>
                    <input
                      type="text"
                      placeholder="Password (default: vendor123)"
                      value={vendorForm.password}
                      onChange={(e) => setVendorForm({ ...vendorForm, password: e.target.value })}
                      className="w-full bg-white text-xs border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-brand-500 font-mono"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setShowVendorForm(false)} className="px-4 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl active:scale-[0.98] transition-all duration-200 cursor-pointer">Cancel</button>
                  <button
                    type="submit"
                    disabled={isSubmittingVendor}
                    className="px-5 py-2 text-xs font-bold text-white bg-brand-600 rounded-xl shadow-xs hover:bg-brand-700 active:scale-[0.98] transition-all duration-200 flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmittingVendor ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                        Saving Vendor...
                      </>
                    ) : (
                      "Save Vendor Partner"
                    )}
                  </button>
                </div>
              </form>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200/90 bg-slate-50/90 text-[11px] font-black text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Shop Name</th>
                    <th className="py-3 px-4">Owner & Mobile</th>
                    <th className="py-3 px-4">District</th>
                    <th className="py-3 px-4">Products Added</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Commission Rate</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                {productsLoading ? (
                  renderTableSkeleton(7)
                ) : (
                  <tbody className="divide-y divide-slate-100">
                    {vendors.map((v) => {
                      const vItemCount = products.filter(
                        (p) => p.vendorId === v.id || (p.vendorName || "").toLowerCase() === (v.shopName || "").toLowerCase()
                      ).length;

                      return (
                        <tr key={v.id} className="hover:bg-slate-50/80 transition-colors duration-150">
                          <td className="py-3.5 px-4 font-bold text-navy-900">{v.shopName}</td>
                          <td className="py-3.5 px-4">
                            <p className="font-semibold text-slate-800">{v.ownerName}</p>
                            <p className="text-[11px] text-slate-500">📱 {v.phone}</p>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px] font-semibold">
                              📍 {v.regionName}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-extrabold text-navy-900">
                            <span className="bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded text-[11px]">
                              📦 {vItemCount} Items
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${STATUS_STYLE[v.status]}`}>
                              {v.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-bold text-navy-900">{v.commissionRate || 10}%</td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => setEditingVendor({ ...v })}
                                className="text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg px-2.5 py-1.5 active:scale-[0.98] transition-all duration-200 cursor-pointer"
                              >
                                ✏️ Edit
                              </button>
                              {v.status !== "APPROVED" && (
                                <button
                                  onClick={() => setVendorStatus(v.id, "APPROVED")}
                                  className="text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg px-2.5 py-1.5 shadow-2xs active:scale-[0.98] transition-all duration-200 cursor-pointer"
                                >
                                  Approve
                                </button>
                              )}
                              {v.status !== "SUSPENDED" && (
                                <button
                                  onClick={() => setVendorStatus(v.id, "SUSPENDED")}
                                  className="text-[11px] font-semibold border border-amber-300 text-amber-700 hover:bg-amber-50 rounded-lg px-2.5 py-1.5 active:scale-[0.98] transition-all duration-200 cursor-pointer"
                                >
                                  Suspend
                                </button>
                              )}
                              <button
                                disabled={deletingVendorId === v.id}
                                onClick={() => handleDeleteVendor(v)}
                                className="text-[11px] font-bold bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-lg px-2.5 py-1.5 active:scale-[0.98] transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                              >
                                {deletingVendorId === v.id ? (
                                  <>
                                    <span className="w-3 h-3 border-2 border-rose-600 border-t-transparent rounded-full animate-spin"></span>
                                    Deleting...
                                  </>
                                ) : (
                                  "🗑️ Delete"
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                )}
              </table>
            </div>
          </div>
        )}

        {/* PRODUCTS TAB */}
        {tab === "Products" && (
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
              <div>
                <h2 className="text-base font-extrabold text-navy-900">Master Product Catalog</h2>
                <p className="text-xs text-slate-500 mt-0.5">Platform master products created by Admin & DRs for vendor store selection.</p>
              </div>
              <button onClick={() => setShowProductForm((v) => !v)} className="bg-brand-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs">
                + Create Master Product
              </button>
            </div>

            {showProductForm && (
              <form onSubmit={handleAddProduct} className="p-5 border-b border-slate-200 bg-brand-50/30 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-navy-900 mb-1">Product Category *</label>
                    <select
                      required
                      value={productForm.categoryId}
                      onChange={(e) => setProductForm({ ...productForm, categoryId: e.target.value })}
                      className="w-full bg-white text-xs border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-brand-500 font-medium"
                    >
                      <option value="">-- Select Category --</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-navy-900 mb-1">Product Title / Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. UltraTech Super PPC Cement"
                      value={productForm.name}
                      onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                      className="w-full bg-white text-xs border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-brand-500 font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-navy-900 mb-1">Brand Name</label>
                    <input type="text" placeholder="e.g. UltraTech" value={productForm.brand} onChange={(e) => setProductForm({ ...productForm, brand: e.target.value })} className="w-full bg-white text-xs border border-slate-200 rounded-xl px-3 py-2.5 outline-none font-medium" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-navy-900 mb-1">Product Type</label>
                    <input type="text" placeholder="e.g. PPC Cement" value={productForm.type} onChange={(e) => setProductForm({ ...productForm, type: e.target.value })} className="w-full bg-white text-xs border border-slate-200 rounded-xl px-3 py-2.5 outline-none font-medium" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-navy-900 mb-1">Grade / Spec</label>
                    <input type="text" placeholder="e.g. OPC 53 Grade" value={productForm.grade} onChange={(e) => setProductForm({ ...productForm, grade: e.target.value })} className="w-full bg-white text-xs border border-slate-200 rounded-xl px-3 py-2.5 outline-none font-medium" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-navy-900 mb-1">Unit Packaging</label>
                    <input type="text" placeholder="e.g. 50kg Bag / Piece" value={productForm.unit || "50kg Bag"} onChange={(e) => setProductForm({ ...productForm, unit: e.target.value })} className="w-full bg-white text-xs border border-slate-200 rounded-xl px-3 py-2.5 outline-none font-medium" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-navy-900 mb-1">Suggested Price (₹) *</label>
                    <input
                      type="number"
                      required
                      placeholder="e.g. 390"
                      value={productForm.suggestedPrice || productForm.price || ""}
                      onChange={(e) => setProductForm({ ...productForm, suggestedPrice: e.target.value, price: e.target.value })}
                      className="w-full bg-white text-xs border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-brand-500 font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-navy-900 mb-1">Stock Quantity</label>
                    <input type="number" placeholder="e.g. 100" value={productForm.stockQty || ""} onChange={(e) => setProductForm({ ...productForm, stockQty: e.target.value })} className="w-full bg-white text-xs border border-slate-200 rounded-xl px-3 py-2.5 outline-none font-bold" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-navy-900 mb-1">Product Images (Add 1 to 3 Images for Interactive Slider)</label>
                  <div className="flex gap-2 overflow-x-auto pb-2 mb-2 no-scrollbar">
                    {PRESET_IMAGES.map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          const currentList = (productForm.imageUrl || "").split(",").map(s => s.trim()).filter(Boolean);
                          if (!currentList.includes(preset.url)) {
                            const newList = [...currentList, preset.url].slice(0, 3);
                            setProductForm({ ...productForm, imageUrl: newList.join(", ") });
                          }
                        }}
                        className="px-3 py-1 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-brand-50 hover:border-brand-300 text-[11px] font-semibold shrink-0 cursor-pointer"
                      >
                        + {preset.label}
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
                      className="w-full bg-white text-xs border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-brand-500 font-mono text-[11px]"
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
                      className="w-full bg-white text-xs border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-brand-500 font-mono text-[11px]"
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
                      className="w-full bg-white text-xs border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-brand-500 font-mono text-[11px]"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                  <button type="button" onClick={() => setShowProductForm(false)} className="px-4 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50">Cancel</button>
                  <button
                    type="submit"
                    disabled={isSubmittingProduct}
                    className="px-5 py-2 text-xs font-bold text-white bg-brand-500 rounded-xl shadow-xs hover:bg-brand-600 disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
                  >
                    {isSubmittingProduct ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Saving Master Product...</span>
                      </>
                    ) : (
                      "Save Master Product"
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* MASTER PRODUCT CATALOG */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200/90 bg-slate-50/90 text-[11px] font-black text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Product Details</th>
                    <th className="py-3 px-4">Category & Brand</th>
                    <th className="py-3 px-4">Type & Grade</th>
                    <th className="py-3 px-4">Suggested Price</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                {productsLoading ? (
                  renderTableSkeleton(5)
                ) : (
                  <tbody className="divide-y divide-slate-100">
                    {masterProducts.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50">
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
                            {p.categoryName}
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
                            className="text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg px-2.5 py-1.5 cursor-pointer"
                          >
                            ✏️ Edit
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                )}
              </table>
            </div>
          </div>
        )}

        {/* LISTINGS & APPROVALS TAB */}
        {tab === "Listings" && (
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden p-5 space-y-4 font-sans">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-base font-extrabold text-navy-900 flex items-center gap-2">
                  Vendor Listings & Approvals
                  <span className="bg-brand-50 text-brand-700 text-xs font-bold px-2.5 py-0.5 rounded-full border border-brand-200">
                    {products.length} Total Offerings
                  </span>
                </h2>
                <p className="text-xs text-slate-500">Review, approve, or reject vendor custom product price & stock offerings across all districts.</p>
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

            {/* Listings Table */}
            {filteredListings.length === 0 ? (
              <div className="text-center py-10 text-xs text-slate-500 font-medium">No product listings found for selected filter status ({listingFilter}).</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase">
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
                    {filteredListings.map((p) => {
                      const st = p.approvalStatus || (p.isActive ? "APPROVED" : "PENDING_REVIEW");
                      const stBadge =
                        st === "APPROVED"
                          ? "bg-green-50 text-green-700 border-green-200"
                          : st === "REJECTED"
                          ? "bg-red-50 text-red-600 border-red-200"
                          : "bg-amber-50 text-amber-700 border-amber-200";

                      return (
                        <tr key={p.id} className="hover:bg-slate-50">
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
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${stBadge}`}>
                              {st === "APPROVED" ? "APPROVED" : st === "REJECTED" ? "REJECTED" : "PENDING REVIEW"}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                disabled={busyListingId === p.id || st === "APPROVED"}
                                onClick={async (e) => {
                                  e.preventDefault();
                                  if (busyListingId) return;
                                  setBusyListingId(p.id);
                                  try {
                                    await updateListingApprovalStatus(p.id, "APPROVED");
                                  } finally {
                                    setTimeout(() => setBusyListingId(null), 300);
                                  }
                                }}
                                className={`min-w-[95px] text-[11px] font-extrabold px-3 py-1.5 rounded-xl transition-all duration-200 flex items-center justify-center gap-1.5 select-none ${
                                  st === "APPROVED"
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-default opacity-90 pointer-events-none"
                                    : busyListingId === p.id
                                    ? "bg-emerald-600/90 text-white cursor-wait pointer-events-none"
                                    : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs active:scale-[0.98] cursor-pointer"
                                }`}
                              >
                                {busyListingId === p.id ? (
                                  <>
                                    <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    <span>...</span>
                                  </>
                                ) : st === "APPROVED" ? (
                                  "✓ Approved"
                                ) : (
                                  "✓ Approve"
                                )}
                              </button>

                              <button
                                disabled={busyListingId === p.id || st === "REJECTED"}
                                onClick={async (e) => {
                                  e.preventDefault();
                                  if (busyListingId) return;
                                  setBusyListingId(p.id);
                                  try {
                                    await updateListingApprovalStatus(p.id, "REJECTED");
                                  } finally {
                                    setTimeout(() => setBusyListingId(null), 300);
                                  }
                                }}
                                className={`min-w-[90px] text-[11px] font-extrabold px-3 py-1.5 rounded-xl transition-all duration-200 flex items-center justify-center gap-1.5 select-none ${
                                  st === "REJECTED"
                                    ? "bg-rose-50 text-rose-600 border border-rose-200 cursor-default opacity-90 pointer-events-none"
                                    : busyListingId === p.id
                                    ? "bg-rose-100 text-rose-700 cursor-wait pointer-events-none"
                                    : "bg-white text-rose-600 border border-rose-200 hover:bg-rose-50 active:scale-[0.98] cursor-pointer"
                                }`}
                              >
                                {busyListingId === p.id ? (
                                  <>
                                    <span className="w-3 h-3 border-2 border-rose-600 border-t-transparent rounded-full animate-spin" />
                                    <span>...</span>
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

        {/* ORDERS TAB — Super Admin Master View */}
        {tab === "Orders" && (
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden p-5 space-y-4 font-sans">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-base font-extrabold text-navy-900 flex items-center gap-2">
                  <span>🛒 All Platform Customer Orders</span>
                  <span className="bg-brand-50 text-brand-700 border border-brand-200 text-xs font-extrabold px-2.5 py-0.5 rounded-full">
                    {orders.length} Total Orders
                  </span>
                </h2>
                <p className="text-xs text-slate-500">Super Admin Overview: Real-time tracking of all construction material orders across all district vendors.</p>
              </div>
            </div>

            {orders.length === 0 ? (
              <div className="text-center py-12 text-xs text-slate-500 font-medium">
                No customer orders recorded in system yet.
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
                    {orders.map((o) => {
                      const displayAmt = Number(o.totalAmount || o.total || o.amount || 0);
                      const custName = o.customer?.name || o.customerName || "Verified Customer";
                      const custPhone = o.customer?.phone || o.customerPhone || "7607650875";
                      const rawAddr = o.address;
                      const isObj = typeof rawAddr === "object" && rawAddr !== null;
                      const isStr = typeof rawAddr === "string" && rawAddr.trim().length > 0;

                      let streetAddr = isObj ? (rawAddr.street || rawAddr.line || rawAddr.address) : (isStr ? rawAddr : null);
                      let cityAddr = isObj ? rawAddr.city : (o.districtName || o.regionName || "");
                      let pincodeAddr = isObj ? rawAddr.pincode : "";

                      if (!streetAddr || streetAddr.includes("Site Delivery Address") || streetAddr.includes("Main Delivery Address")) {
                        if (o.customer?.address && !o.customer.address.includes("Site Delivery Address")) {
                          streetAddr = o.customer.address;
                        } else if (custPhone) {
                          streetAddr = `Site Location for Mobile ${custPhone}`;
                        } else {
                          streetAddr = `Site Delivery Location (${cityAddr || 'Mirzapur'})`;
                        }
                      }

                      if (!cityAddr || cityAddr.toLowerCase() === "district") {
                        cityAddr = o.districtName || o.regionName || "Mirzapur";
                      }

                      const dateStr = formatDateTimeIST(o.createdAt || o.date);
                      const statusStyle = STATUS_STYLE[o.status] || "bg-amber-50 text-amber-700 border-amber-200";

                      return (
                        <tr key={o.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3.5 px-4">
                            <span className="font-extrabold text-brand-700 block text-xs">{formatShortId(o.id || o.orderNumber, "ORD")}</span>
                            <span className="text-[11px] text-slate-400 font-medium">{dateStr}</span>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="font-bold text-navy-900 block">👤 {custName}</span>
                            <span className="text-[11px] text-slate-500 font-semibold">📱 {custPhone}</span>
                          </td>
                          <td className="py-3.5 px-4 min-w-[220px]">
                            <div className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                              <p className="font-bold text-navy-900 leading-snug whitespace-normal break-words">🏢 {streetAddr}</p>
                              <p className="text-[11px] text-slate-600 font-medium mt-0.5">🏙️ {cityAddr} {pincodeAddr ? `- ${pincodeAddr}` : ""}</p>
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            {Array.isArray(o.items) && o.items.length > 0 ? (
                              <div className="space-y-1">
                                {o.items.map((it, idx) => (
                                  <div key={idx} className="text-[11px]">
                                    <span className="font-bold text-slate-800">• {it.productName || it.name}</span>
                                    <span className="text-slate-500 font-medium ml-1">x{it.quantity} (₹{it.priceAtPurchase || it.price})</span>
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
                                {o.status || "PENDING"}
                              </span>
                              {updateOrderStatus && (
                                <select
                                  value={o.status || "PENDING"}
                                  onChange={(e) => updateOrderStatus(o.id, e.target.value)}
                                  className="text-[11px] font-bold bg-slate-100 border border-slate-200 rounded-lg px-2 py-1 outline-none text-navy-900 cursor-pointer"
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

        {/* CATEGORIES TAB */}
        {tab === "Categories" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
              <div>
                <h2 className="text-base font-extrabold text-navy-900">Product Categories</h2>
                <p className="text-xs text-slate-500">Configure tax rates and product count by category.</p>
              </div>
              <button onClick={() => setShowCatForm((v) => !v)} className="bg-brand-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs">
                + Add Category
              </button>
            </div>

            {showCatForm && (
              <form onSubmit={handleAddCategory} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex gap-3">
                <input
                  type="text"
                  required
                  placeholder="Category Name (e.g. Tiles & Flooring)"
                  value={catForm.name}
                  onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
                  className="bg-slate-50 text-xs border border-slate-200 rounded-xl px-3 py-2 flex-1"
                />
                <button type="submit" className="bg-brand-500 text-white text-xs font-bold px-4 py-2 rounded-xl">Save</button>
              </form>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {Array.from(new Map(categories.map((c) => [c.name.toLowerCase().trim(), c])).values()).map((c) => {
                const isActive = c.isActive !== false;
                const realCount = masterProducts.filter(
                  (m) =>
                    m.categoryId === c.id ||
                    (m.categoryName && m.categoryName.toLowerCase().trim() === c.name.toLowerCase().trim())
                ).length + products.filter(
                  (p) =>
                    p.categoryId === c.id ||
                    (p.categoryName && p.categoryName.toLowerCase().trim() === c.name.toLowerCase().trim())
                ).length;

                return (
                  <div key={c.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col justify-between space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-navy-900 text-sm">{c.name}</h3>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${isActive ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-rose-50 text-rose-600 border border-rose-200"}`}>
                            {isActive ? "ACTIVE" : "INACTIVE"}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">{realCount} products listed</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-slate-100">
                      <button
                        onClick={() => toggleCategoryActive(c)}
                        className={`text-[11px] font-extrabold px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${isActive ? "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100" : "bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700"}`}
                      >
                        {isActive ? "Deactivate" : "Activate"}
                      </button>
                      <button
                        onClick={() => setEditingCategory({ ...c })}
                        className="text-[11px] font-extrabold bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg px-2.5 py-1 cursor-pointer"
                      >
                        ✏️ Edit
                      </button>
                      <button
                        disabled={deletingCatId === c.id}
                        onClick={async () => {
                          if (!confirm(`Are you sure you want to delete category "${c.name}"?`)) return;
                          setDeletingCatId(c.id);
                          try {
                            await removeCategory(c);
                          } finally {
                            setDeletingCatId(null);
                          }
                        }}
                        className="text-[11px] font-extrabold bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-lg px-2.5 py-1 cursor-pointer disabled:opacity-50 flex items-center gap-1"
                      >
                        {deletingCatId === c.id ? (
                          <>
                            <span className="w-3 h-3 border-2 border-rose-600 border-t-transparent rounded-full animate-spin" />
                            <span>Deleting...</span>
                          </>
                        ) : (
                          "🗑️ Delete"
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* REGIONS TAB */}
        {tab === "Regions" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
              <div>
                <h2 className="text-base font-extrabold text-navy-900">Covered Districts & Delivery Charges</h2>
                <p className="text-xs text-slate-500">Serviceable areas for DR and Vendor operations.</p>
              </div>
              <button onClick={() => setShowRegionForm((v) => !v)} className="bg-brand-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs">
                + Add District Region
              </button>
            </div>

            {showRegionForm && (
              <form onSubmit={handleAddRegion} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex gap-3">
                <input
                  type="text"
                  required
                  placeholder="District Name (e.g. Gazipur)"
                  value={regionForm.name}
                  onChange={(e) => setRegionForm({ ...regionForm, name: e.target.value })}
                  className="bg-slate-50 text-xs border border-slate-200 rounded-xl px-3 py-2 flex-1"
                />
                <input
                  type="number"
                  placeholder="Delivery Charge (₹)"
                  value={regionForm.baseDeliveryCharge}
                  onChange={(e) => setRegionForm({ ...regionForm, baseDeliveryCharge: e.target.value })}
                  className="bg-slate-50 text-xs border border-slate-200 rounded-xl px-3 py-2 w-36"
                />
                <button type="submit" disabled={isSubmittingRegion} className="bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold px-4 py-2 rounded-xl disabled:opacity-50 flex items-center gap-1.5 cursor-pointer">
                  {isSubmittingRegion ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    "Save"
                  )}
                </button>
              </form>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from(new Map(regions.map((r) => [r.name.toLowerCase().trim(), r])).values()).map((r) => {
                const isActive = r.isActive !== false;
                return (
                  <div key={r.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col justify-between space-y-3">
                    <div>
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-navy-900 text-sm flex items-center gap-1">📍 {r.name}</h3>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${isActive ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-rose-50 text-rose-600 border border-rose-200"}`}>
                          {isActive ? "ACTIVE" : "INACTIVE"}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{r.state || "Uttar Pradesh"}</p>
                      <p className="text-xs font-bold text-brand-600 mt-1">Delivery Charge: ₹{r.baseDeliveryCharge || 49}</p>
                    </div>

                    <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-slate-100">
                      <button
                        onClick={() => toggleRegionActive(r)}
                        className={`text-[11px] font-extrabold px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${isActive ? "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100" : "bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700"}`}
                      >
                        {isActive ? "Deactivate" : "Activate"}
                      </button>
                      <button
                        onClick={() => setEditingRegion({ ...r })}
                        className="text-[11px] font-extrabold bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg px-2.5 py-1 cursor-pointer"
                      >
                        ✏️ Edit
                      </button>
                      <button
                        disabled={deletingRegionId === r.id}
                        onClick={async () => {
                          if (!confirm(`Are you sure you want to delete district region "${r.name}"?`)) return;
                          setDeletingRegionId(r.id);
                          try {
                            await removeRegion(r);
                          } finally {
                            setDeletingRegionId(null);
                          }
                        }}
                        className="text-[11px] font-extrabold bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-lg px-2.5 py-1 cursor-pointer disabled:opacity-50 flex items-center gap-1"
                      >
                        {deletingRegionId === r.id ? (
                          <>
                            <span className="w-3 h-3 border-2 border-rose-600 border-t-transparent rounded-full animate-spin" />
                            <span>Deleting...</span>
                          </>
                        ) : (
                          "🗑️ Delete"
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* COUPONS TAB */}
        {tab === "Coupons" && (
          <div className="space-y-4 font-sans">
            <div className="flex items-center justify-between bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
              <div>
                <h2 className="text-base font-extrabold text-navy-900">Discount Coupons & Offers</h2>
                <p className="text-xs text-slate-500">Create promotional discount codes and manage coupon expiry for cart checkout.</p>
              </div>
              <button onClick={() => setShowCouponForm((v) => !v)} className="bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs transition-colors cursor-pointer">
                + Create New Coupon
              </button>
            </div>

            {showCouponForm && (
              <form onSubmit={handleAddCoupon} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
                <h4 className="font-bold text-navy-900 text-xs uppercase tracking-wider">Create New Promotional Coupon</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-navy-900 mb-1">Coupon Code *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. SUMMER200"
                      value={couponForm.code}
                      onChange={(e) => setCouponForm({ ...couponForm, code: e.target.value.toUpperCase() })}
                      className="w-full bg-slate-50 text-xs border border-slate-200 rounded-xl px-3 py-2.5 outline-none font-bold uppercase"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-navy-900 mb-1">Discount Amount (₹) *</label>
                    <input
                      type="number"
                      required
                      placeholder="200"
                      value={couponForm.discountAmount}
                      onChange={(e) => setCouponForm({ ...couponForm, discountAmount: e.target.value })}
                      className="w-full bg-slate-50 text-xs border border-slate-200 rounded-xl px-3 py-2.5 outline-none font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-navy-900 mb-1">Minimum Order Value (₹) *</label>
                    <input
                      type="number"
                      required
                      placeholder="1500"
                      value={couponForm.minOrder}
                      onChange={(e) => setCouponForm({ ...couponForm, minOrder: e.target.value })}
                      className="w-full bg-slate-50 text-xs border border-slate-200 rounded-xl px-3 py-2.5 outline-none font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-navy-900 mb-1">Expiry Date *</label>
                    <input
                      type="date"
                      required
                      value={couponForm.expiryDate}
                      onChange={(e) => setCouponForm({ ...couponForm, expiryDate: e.target.value })}
                      className="w-full bg-slate-50 text-xs border border-slate-200 rounded-xl px-3 py-2.5 outline-none font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-navy-900 mb-1">Offer Title / Heading</label>
                    <input
                      type="text"
                      placeholder="e.g. Flat ₹200 OFF on Construction Materials"
                      value={couponForm.title}
                      onChange={(e) => setCouponForm({ ...couponForm, title: e.target.value })}
                      className="w-full bg-slate-50 text-xs border border-slate-200 rounded-xl px-3 py-2.5 outline-none font-bold"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button type="button" onClick={() => setShowCouponForm(false)} className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 rounded-xl">Cancel</button>
                  <button type="submit" disabled={isSubmittingCoupon} className="px-5 py-2 text-xs font-bold text-white bg-brand-500 hover:bg-brand-600 rounded-xl shadow-xs disabled:opacity-50 flex items-center gap-1.5 cursor-pointer">
                    {isSubmittingCoupon ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Saving Coupon...</span>
                      </>
                    ) : (
                      "Save & Activate Coupon"
                    )}
                  </button>
                </div>
              </form>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {(coupons || []).map((cp) => {
                const todayStr = new Date().toISOString().split("T")[0];
                const isExpired = cp.expiryDate && cp.expiryDate < todayStr;
                const isActive = cp.isActive !== false && !isExpired;

                return (
                  <div key={cp.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-4 relative overflow-hidden">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-brand-500" />
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="bg-brand-50 text-brand-700 font-extrabold px-3 py-1 rounded-xl text-xs border border-brand-200 flex items-center gap-1 tracking-wider">
                          🎟️ {cp.code}
                        </span>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${isActive ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-rose-50 text-rose-600 border border-rose-200"}`}>
                          {isExpired ? "EXPIRED" : isActive ? "ACTIVE" : "INACTIVE"}
                        </span>
                      </div>
                      <h3 className="font-extrabold text-navy-900 text-sm mt-3">{cp.title || `Flat ₹${cp.discountAmount} OFF`}</h3>
                      <p className="text-xs font-bold text-emerald-600 mt-1">Discount: ₹{cp.discountAmount} OFF</p>
                      <p className="text-xs text-slate-500 mt-0.5">Min Order: ₹{cp.minOrder?.toLocaleString("en-IN") || 1000}</p>
                      <p className="text-[11px] text-slate-400 mt-1">Expires On: {cp.expiryDate || "Never"}</p>
                    </div>

                    <div className="flex items-center justify-end gap-1.5 pt-3 border-t border-slate-100">
                      <button
                        onClick={() => toggleCouponActive(cp)}
                        className={`text-[11px] font-extrabold px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${isActive ? "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100" : "bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700"}`}
                      >
                        {isActive ? "Expire / Deactivate" : "Activate"}
                      </button>
                      <button
                        onClick={() => setEditingCoupon({ ...cp })}
                        className="text-[11px] font-extrabold bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg px-2.5 py-1 cursor-pointer"
                      >
                        ✏️ Edit
                      </button>
                      <button
                        disabled={deletingCouponId === cp.id}
                        onClick={() => handleDeleteCoupon(cp)}
                        className="text-[11px] font-extrabold bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-lg px-2.5 py-1 cursor-pointer disabled:opacity-50 flex items-center gap-1"
                      >
                        {deletingCouponId === cp.id ? (
                          <>
                            <span className="w-3 h-3 border-2 border-rose-600 border-t-transparent rounded-full animate-spin" />
                            <span>Deleting...</span>
                          </>
                        ) : (
                          "🗑️ Delete"
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* NOTIFICATIONS BROADCAST TAB */}
        {tab === "Notifications" && (
          <div className="space-y-5 font-sans">
            {notifStatusMsg && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold px-4 py-3 rounded-2xl shadow-2xs flex items-center gap-2 animate-in fade-in duration-200">
                <span>✓</span>
                <span>{notifStatusMsg}</span>
              </div>
            )}

            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-5">
                <span className="h-10 w-10 rounded-2xl bg-brand-50 border border-brand-200 flex items-center justify-center text-xl shadow-2xs">
                  📢
                </span>
                <div>
                  <h2 className="text-base font-extrabold text-navy-900">
                    Send Real-Time Notification to Customers
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Broadcast instant site alerts, price drop notices, or festival offers directly to all customer devices and Supabase database.
                  </p>
                </div>
              </div>

              <form onSubmit={handleSendBroadcast} className="space-y-4 max-w-2xl">
                <div>
                  <label className="block text-xs font-bold text-navy-900 mb-1.5">
                    Notification Category / Section *
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { id: "offer", label: "🎁 Offer & Discounts", color: "border-emerald-300 bg-emerald-50 text-emerald-800" },
                      { id: "price", label: "🏷️ Price Drop / Rates", color: "border-blue-300 bg-blue-50 text-blue-800" },
                      { id: "info", label: "📢 General Announcement", color: "border-slate-300 bg-slate-50 text-slate-800" },
                    ].map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setNotifCategory(cat.id)}
                        className={`text-xs font-bold px-3.5 py-2 rounded-xl border transition-all cursor-pointer ${
                          notifCategory === cat.id
                            ? `${cat.color} ring-2 ring-brand-500 font-black shadow-xs`
                            : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-navy-900 mb-1.5">
                    Notification Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 🏗️ Special Cement Rates Live Today!"
                    value={notifTitle}
                    onChange={(e) => setNotifTitle(e.target.value)}
                    className="w-full bg-slate-50 text-xs border border-slate-200 rounded-xl px-3.5 py-3 outline-none font-bold focus:border-brand-500 focus:bg-white transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-navy-900 mb-1.5">
                    Notification Message / Body *
                  </label>
                  <textarea
                    required
                    rows={3}
                    placeholder="e.g. UltraTech & Ambuja Cement available at wholesale rates with same-day site delivery across Mirzapur & Varanasi."
                    value={notifMessage}
                    onChange={(e) => setNotifMessage(e.target.value)}
                    className="w-full bg-slate-50 text-xs border border-slate-200 rounded-xl p-3.5 outline-none font-medium focus:border-brand-500 focus:bg-white transition-all leading-relaxed"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSendingNotif}
                    className="bg-brand-600 hover:bg-brand-700 active:scale-[0.98] text-white text-xs font-extrabold px-6 py-3 rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-60 flex items-center gap-2"
                  >
                    {isSendingNotif ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Sending Broadcast...</span>
                      </>
                    ) : (
                      <>
                        <span>🚀</span>
                        <span>Broadcast to All Customers</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Broadcast History */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <div className="flex items-center gap-3">
                  <h3 className="text-xs font-black text-navy-900 uppercase tracking-wider">
                    Active Live Notifications ({adminNotifs.length})
                  </h3>
                  <button
                    type="button"
                    onClick={() => fetchDbNotifications(true)}
                    disabled={isLoadingNotifs}
                    className="text-[11px] font-bold text-slate-500 hover:text-brand-600 bg-slate-50 hover:bg-brand-50 border border-slate-200 px-2 py-0.5 rounded-md transition-all cursor-pointer inline-flex items-center gap-1"
                  >
                    <span>{isLoadingNotifs ? "⌛ Refreshing..." : "🔄 Refresh"}</span>
                  </button>
                </div>
                {adminNotifs.length > 0 && (
                  <button
                    type="button"
                    disabled={isClearingAllNotifs}
                    onClick={async () => {
                      if (confirm("Are you sure you want to clear all active broadcast notifications?")) {
                        setIsClearingAllNotifs(true);
                        try {
                          await clearAllAdminNotifs();
                        } finally {
                          setIsClearingAllNotifs(false);
                        }
                      }
                    }}
                    className="text-xs font-bold text-rose-600 hover:text-rose-700 hover:underline cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
                  >
                    {isClearingAllNotifs ? (
                      <>
                        <svg className="animate-spin h-3.5 w-3.5 text-rose-600" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Clearing all...</span>
                      </>
                    ) : (
                      <span>Clear All Notifications</span>
                    )}
                  </button>
                )}
              </div>

              {isLoadingNotifs && adminNotifs.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400 animate-pulse">
                  Loading active notifications from Supabase DB...
                </div>
              ) : adminNotifs.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  No active broadcast notifications sent yet. Use the form above to send your first real-time alert!
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {adminNotifs.map((n) => (
                    <div key={n.id} className="py-3 flex items-center justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-navy-900">{n.title}</span>
                          <span className="text-[10px] text-slate-400 font-medium">
                            {new Date(n.timestamp || Date.now()).toLocaleString("en-IN")}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 mt-0.5 leading-snug">{n.message}</p>
                      </div>
                      <button
                        type="button"
                        disabled={deletingNotifId === n.id || isClearingAllNotifs}
                        onClick={async () => {
                          setDeletingNotifId(n.id);
                          try {
                            await removeAdminNotif(n.id);
                          } finally {
                            setDeletingNotifId(null);
                          }
                        }}
                        className="text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 disabled:opacity-50 border border-rose-200/80 px-3 py-1.5 rounded-xl transition-all cursor-pointer shrink-0 inline-flex items-center gap-1.5 shadow-2xs active:scale-[0.98]"
                      >
                        {deletingNotifId === n.id ? (
                          <>
                            <svg className="animate-spin h-3.5 w-3.5 text-rose-600" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span>Deleting...</span>
                          </>
                        ) : (
                          <span>🗑️ Delete</span>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* EDIT MODAL: COUPON */}
      {editingCoupon && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="font-bold text-navy-900 text-base">Edit Coupon Details</h3>
              <button onClick={() => setEditingCoupon(null)} className="text-slate-400 hover:text-navy-900 text-lg leading-none">✕</button>
            </div>
            <form onSubmit={handleUpdateCouponSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-navy-900 mb-1">Coupon Code *</label>
                <input
                  type="text"
                  required
                  value={editingCoupon.code}
                  onChange={(e) => setEditingCoupon({ ...editingCoupon, code: e.target.value.toUpperCase() })}
                  className="w-full bg-slate-50 text-xs border border-slate-200 rounded-xl px-3 py-2.5 outline-none font-bold uppercase"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-navy-900 mb-1">Discount Amount (₹) *</label>
                <input
                  type="number"
                  required
                  value={editingCoupon.discountAmount}
                  onChange={(e) => setEditingCoupon({ ...editingCoupon, discountAmount: e.target.value })}
                  className="w-full bg-slate-50 text-xs border border-slate-200 rounded-xl px-3 py-2.5 outline-none font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-navy-900 mb-1">Minimum Order Value (₹) *</label>
                <input
                  type="number"
                  required
                  value={editingCoupon.minOrder}
                  onChange={(e) => setEditingCoupon({ ...editingCoupon, minOrder: e.target.value })}
                  className="w-full bg-slate-50 text-xs border border-slate-200 rounded-xl px-3 py-2.5 outline-none font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-navy-900 mb-1">Expiry Date *</label>
                <input
                  type="date"
                  required
                  value={editingCoupon.expiryDate}
                  onChange={(e) => setEditingCoupon({ ...editingCoupon, expiryDate: e.target.value })}
                  className="w-full bg-slate-50 text-xs border border-slate-200 rounded-xl px-3 py-2.5 outline-none font-bold"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button type="button" onClick={() => setEditingCoupon(null)} className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 rounded-xl">Cancel</button>
                <button type="submit" disabled={isSubmittingCoupon} className="px-5 py-2 text-xs font-bold text-white bg-brand-500 rounded-xl hover:bg-brand-600 shadow-xs disabled:opacity-50 flex items-center gap-1.5 cursor-pointer">
                  {isSubmittingCoupon ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Saving Changes...</span>
                    </>
                  ) : (
                    "Save Coupon"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL: DR */}
      {editingDr && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="font-bold text-navy-900 text-base">Edit District Representative (DR)</h3>
              <button onClick={() => setEditingDr(null)} className="text-slate-400 hover:text-navy-900 text-lg leading-none">✕</button>
            </div>
            <form onSubmit={handleUpdateDrSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-navy-900 mb-1">DR Full Name *</label>
                <input
                  type="text"
                  required
                  value={editingDr.name}
                  onChange={(e) => setEditingDr({ ...editingDr, name: e.target.value })}
                  className="w-full bg-slate-50 text-xs border border-slate-200 rounded-xl px-3 py-2.5 outline-none font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-navy-900 mb-1">Assigned Mobile Number *</label>
                <input
                  type="tel"
                  required
                  maxLength={10}
                  value={editingDr.phone}
                  onChange={(e) => setEditingDr({ ...editingDr, phone: e.target.value.replace(/\D/g, "") })}
                  className="w-full bg-slate-50 text-xs border border-slate-200 rounded-xl px-3 py-2.5 outline-none font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-navy-900 mb-1">DR Login Password</label>
                <input
                  type="text"
                  placeholder="Set / Change Login Password (default: dr123)"
                  value={editingDr.password || ""}
                  onChange={(e) => setEditingDr({ ...editingDr, password: e.target.value })}
                  className="w-full bg-slate-50 text-xs border border-slate-200 rounded-xl px-3 py-2.5 outline-none font-bold font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-navy-900 mb-1">Assigned District Region *</label>
                <select
                  value={editingDr.regionId}
                  onChange={(e) => setEditingDr({ ...editingDr, regionId: e.target.value })}
                  className="w-full bg-slate-50 text-xs border border-slate-200 rounded-xl px-3 py-2.5 outline-none font-bold"
                >
                  {regions.map((r) => (
                    <option key={r.id} value={r.id}>{r.name} ({r.state})</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button type="button" onClick={() => setEditingDr(null)} className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 rounded-xl">Cancel</button>
                <button
                  type="submit"
                  disabled={isSubmittingEditDr}
                  className="px-5 py-2 text-xs font-bold text-white bg-brand-500 rounded-xl hover:bg-brand-600 shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isSubmittingEditDr ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Saving Changes...</span>
                    </>
                  ) : (
                    "Save DR Changes"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL: VENDOR */}
      {editingVendor && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="font-bold text-navy-900 text-base">Edit Vendor Details</h3>
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
                <label className="block text-xs font-bold text-navy-900 mb-1">Mobile Phone Number *</label>
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
                <label className="block text-xs font-bold text-navy-900 mb-1">Commission Rate (%)</label>
                <input
                  type="number"
                  value={editingVendor.commissionRate}
                  onChange={(e) => setEditingVendor({ ...editingVendor, commissionRate: e.target.value })}
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
                    "Save Vendor Changes"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL: MASTER PRODUCT */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="font-bold text-navy-900 text-base">Edit Master Product Catalog</h3>
              <button onClick={() => setEditingProduct(null)} className="text-slate-400 hover:text-navy-900 text-lg leading-none">✕</button>
            </div>
            <form onSubmit={handleUpdateProductSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-navy-900 mb-1">Product Name *</label>
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
                <label className="block text-xs font-bold text-navy-900 mb-1">Suggested Price (₹) *</label>
                <input
                  type="number"
                  required
                  value={editingProduct.suggestedPrice || editingProduct.price}
                  onChange={(e) => setEditingProduct({ ...editingProduct, suggestedPrice: e.target.value, price: e.target.value })}
                  className="w-full bg-slate-50 text-xs border border-slate-200 rounded-xl px-3 py-2.5 outline-none font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-navy-900 mb-1">Product Image URL</label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/..."
                  value={editingProduct.imageUrl || ""}
                  onChange={(e) => setEditingProduct({ ...editingProduct, imageUrl: e.target.value })}
                  className="w-full bg-slate-50 text-xs border border-slate-200 rounded-xl px-3 py-2.5 outline-none font-medium"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button type="button" onClick={() => setEditingProduct(null)} className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 rounded-xl">Cancel</button>
                <button
                  type="submit"
                  disabled={isSubmittingEditProduct}
                  className="px-5 py-2 text-xs font-bold text-white bg-brand-500 rounded-xl hover:bg-brand-600 shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isSubmittingEditProduct ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Saving Changes...</span>
                    </>
                  ) : (
                    "Save Product Changes"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL: CATEGORY hai ye  */}
      {editingCategory && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="font-bold text-navy-900 text-base">Edit Category</h3>
              <button onClick={() => setEditingCategory(null)} className="text-slate-400 hover:text-navy-900 text-lg leading-none">✕</button>
            </div>
            <form onSubmit={handleUpdateCategorySubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-navy-900 mb-1">Category Name *</label>
                <input
                  type="text"
                  required
                  value={editingCategory.name}
                  onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                  className="w-full bg-slate-50 text-xs border border-slate-200 rounded-xl px-3 py-2.5 outline-none font-bold"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button type="button" onClick={() => setEditingCategory(null)} className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 rounded-xl">Cancel</button>
                <button type="submit" disabled={isSubmittingCat} className="px-5 py-2 text-xs font-bold text-white bg-brand-500 rounded-xl hover:bg-brand-600 shadow-xs disabled:opacity-50 flex items-center gap-1.5 cursor-pointer">
                  {isSubmittingCat ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Saving Changes...</span>
                    </>
                  ) : (
                    "Save Category"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL: REGION */}
      {editingRegion && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="font-bold text-navy-900 text-base">Edit District Region</h3>
              <button onClick={() => setEditingRegion(null)} className="text-slate-400 hover:text-navy-900 text-lg leading-none">✕</button>
            </div>
            <form onSubmit={handleUpdateRegionSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-navy-900 mb-1">District Name *</label>
                <input
                  type="text"
                  required
                  value={editingRegion.name}
                  onChange={(e) => setEditingRegion({ ...editingRegion, name: e.target.value })}
                  className="w-full bg-slate-50 text-xs border border-slate-200 rounded-xl px-3 py-2.5 outline-none font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-navy-900 mb-1">Base Delivery Charge (₹)</label>
                <input
                  type="number"
                  value={editingRegion.baseDeliveryCharge}
                  onChange={(e) => setEditingRegion({ ...editingRegion, baseDeliveryCharge: e.target.value })}
                  className="w-full bg-slate-50 text-xs border border-slate-200 rounded-xl px-3 py-2.5 outline-none font-bold"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button type="button" onClick={() => setEditingRegion(null)} className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 rounded-xl">Cancel</button>
                <button type="submit" disabled={isSubmittingRegion} className="px-5 py-2 text-xs font-bold text-white bg-brand-500 rounded-xl hover:bg-brand-600 shadow-xs disabled:opacity-50 flex items-center gap-1.5 cursor-pointer">
                  {isSubmittingRegion ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Saving Changes...</span>
                    </>
                  ) : (
                    "Save District Region"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}