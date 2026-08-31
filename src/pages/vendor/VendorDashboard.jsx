import { useState, useEffect } from "react";
import DashboardShell from "../../components/DashboardShell";
import { useAuth } from "../../context/AuthContext";
import { useAdmin } from "../../context/AdminContext";
import { useOrders } from "../../context/OrderContext";
import { useAlert } from "../../context/AlertContext";
import { formatShortId, formatDateTimeIST } from "../../utils/formatId";

// Vendor Dashboard component — Vendor partner ka main portal (Master Catalog selection, Custom Price & Stock setting, Orders management)
export default function VendorDashboard() {
  const { user } = useAuth();
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

  // Tabs navigation state: "products" -> My Shop Items, "orders" -> Customer Orders, "overview" -> Store Info & Sales
  const [activeTab, setActiveTab] = useState("products");
  const [vendorOrders, setVendorOrders] = useState([]);

  // Master Catalog — Admin/DR dwara banaye gaye Master Products select karne ke liye
  const [showCatalogModal, setShowCatalogModal] = useState(false);
  const [selectedMasterProd, setSelectedMasterProd] = useState(null);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("ALL");
  const [catalogSearch, setCatalogSearch] = useState("");

  // Selling Price (₹) & Stock Qty State — Master Product dukan me add karte waqt vendor ka custom price
  const [vendorSellingPrice, setVendorSellingPrice] = useState("");
  const [vendorStockQty, setVendorStockQty] = useState(100);

  // Edit Listing - Custom selling price aur stock modify karne ke liye
  const [editingProduct, setEditingProduct] = useState(null);

  // Logged-in Vendor Info details extraction matching DB Vendors
  const matchedVendorObj = (vendors || []).find((v) => {
    const userPhoneClean = user?.phone ? user.phone.replace(/\D/g, "") : "";
    const vPhoneClean = v.phone ? v.phone.replace(/\D/g, "") : "";
    const vUserPhoneClean = v.user?.phone ? v.user.phone.replace(/\D/g, "") : "";

    const phoneMatches = userPhoneClean && (vPhoneClean === userPhoneClean || vUserPhoneClean === userPhoneClean);
    const idMatches = (user?.vendorInfo?.id && v.id === user.vendorInfo.id) || (user?.vendorId && v.id === user.vendorId);

    return phoneMatches || idMatches;
  }) || user?.vendorInfo || {};

  const shopName = matchedVendorObj.shopName || user?.vendorInfo?.shopName || user?.shopName || user?.name || "Distributor Store";
  const ownerName = matchedVendorObj.ownerName || user?.vendorInfo?.ownerName || user?.name || "Vendor Owner";
  const vendorPhone = matchedVendorObj.phone || user?.phone || user?.vendorInfo?.phone || "9876543210";
  const districtName = matchedVendorObj.region?.name || matchedVendorObj.regionName || matchedVendorObj.districtName || user?.vendorInfo?.region?.name || user?.vendorInfo?.regionName || "Mirzapur";
  const vendorId = matchedVendorObj.id || user?.vendorInfo?.id || user?.vendorId || user?.id || (user?.phone ? `v-${user.phone}` : `v-${Date.now()}`);

  // vendor isolated orders fetch - no flash on refresh
  useEffect(() => {
    let isMounted = true;
    fetchVendorOrders(vendorId).then((vOrds) => {
      if (!isMounted) return;
      const sourceOrds = Array.isArray(vOrds) && vOrds.length > 0 ? vOrds : orders;
      const filtered = (sourceOrds || []).filter((o) => {
        const matchesVendor = o.items && o.items.some((it) => it.vendorId === vendorId || (it.vendorName || "").toLowerCase().trim() === shopName.toLowerCase().trim());
        return matchesVendor;
      });
      setVendorOrders(filtered);
    }).catch(() => {});
    return () => { isMounted = false; };
  }, [vendorId, shopName]);

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
    setVendorSellingPrice(mp.suggestedPrice || 390);
    setVendorStockQty(100);
  };

  const handleAddMasterProductToStore = (e) => {
    e.preventDefault();
    if (!selectedMasterProd || !vendorSellingPrice) return;

    assignMasterProductToVendor({
      masterProductId: selectedMasterProd.id,
      vendorId: vendorId,
      vendorName: shopName,
      regionId: matchedVendorObj.regionId || user?.vendorInfo?.regionId,
      regionName: districtName || matchedVendorObj.regionName || "Mirzapur",
      districtName: districtName || matchedVendorObj.regionName || "Mirzapur",
      price: Number(vendorSellingPrice),
      stockQty: Number(vendorStockQty) || 0,
      addedBy: `Vendor (${shopName})`,
    });

    setSelectedMasterProd(null);
    setShowCatalogModal(false);
    showAlert({
      title: "Submitted for Review",
      message: `"${selectedMasterProd.name}" has been submitted for review!\n\nStatus: ⏳ Under Admin & DR Review\nOnce approved by Admin or DR, this product will go live on the customer store.`,
      type: "info",
      buttonText: "Understood",
    });
  };

  const handleUpdateListing = (e) => {
    e.preventDefault();
    if (!editingProduct) return;

    updateVendorProductListing(editingProduct.id, {
      price: Number(editingProduct.price),
      stockQty: Number(editingProduct.stockQty),
    });

    setEditingProduct(null);
    showAlert({ title: "Listing Updated", message: "Product price and stock updated successfully!", type: "success" });
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

  // Real DB stats calculation
  const totalRevenue = vendorOrders.reduce((sum, ord) => {
    return sum + Number(ord.totalAmount || ord.total || 0);
  }, 0);

  const activeOrdersCount = vendorOrders.filter((o) => {
    const st = (o.status || "").toUpperCase();
    return st === "PENDING" || st === "PROCESSING" || st === "OUT_FOR_DELIVERY";
  }).length;

  return (
    <DashboardShell badge="Vendor Partner" badgeColor="#10B981">
      {/* Vendor Hero Banner */}
      <div className="bg-gradient-to-r from-navy-950 via-navy-900 to-slate-900 border border-navy-800/60 rounded-2xl p-6 text-white shadow-md mb-6 relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-extrabold px-3 py-0.5 rounded-full flex items-center gap-1.5 backdrop-blur-md">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                STORE STATUS: APPROVED
              </span>
              <span className="bg-white/10 text-slate-300 text-[11px] font-bold px-3 py-0.5 rounded-full border border-white/10">
                📍 {districtName}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">{shopName}</h1>
            <p className="text-xs text-slate-300 font-medium mt-1">
              Owner: <strong>{ownerName}</strong> · Mobile: <strong>{vendorPhone}</strong> · Commission Rate: <strong>{matchedVendorObj.commissionRate || user?.vendorInfo?.commissionRate || 10}%</strong>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowCatalogModal(true)}
              className="bg-brand-500 hover:bg-brand-600 active:scale-[0.98] text-white font-extrabold text-xs px-4.5 py-2.5 rounded-xl transition-all duration-200 shadow-xs hover:shadow-md flex items-center gap-2 cursor-pointer"
            >
              🔍 Choose from Master Catalog
            </button>
          </div>
        </div>

        {/* Quick Metrics Bar - Interactive Clickable Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-700/60 relative z-10">
          <button
            type="button"
            onClick={() => setActiveTab("overview")}
            className="text-left bg-white/10 hover:bg-white/20 backdrop-blur-xs rounded-xl p-3.5 border border-white/10 hover:border-emerald-400/40 active:scale-[0.98] transition-all duration-200 cursor-pointer group"
          >
            <p className="text-[11px] font-medium text-slate-300 group-hover:text-white transition-colors">Total Store Revenue</p>
            <p className="text-lg font-black text-white mt-0.5 tracking-tight">₹{totalRevenue.toLocaleString()}</p>
            <span className="text-[10px] text-emerald-400 font-extrabold flex items-center gap-1 mt-0.5">
              <span>Real-time DB Sales</span>
              <span className="group-hover:translate-x-0.5 transition-transform">→</span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("orders")}
            className="text-left bg-white/10 hover:bg-white/20 backdrop-blur-xs rounded-xl p-3.5 border border-white/10 hover:border-amber-400/40 active:scale-[0.98] transition-all duration-200 cursor-pointer group"
          >
            <p className="text-[11px] font-medium text-slate-300 group-hover:text-white transition-colors">Active Orders</p>
            <p className="text-lg font-black text-white mt-0.5 tracking-tight">{activeOrdersCount} Orders</p>
            <span className="text-[10px] text-amber-300 font-extrabold flex items-center gap-1 mt-0.5">
              <span>Live Orders in DB</span>
              <span className="group-hover:translate-x-0.5 transition-transform">→</span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("products")}
            className="text-left bg-white/10 hover:bg-white/20 backdrop-blur-xs rounded-xl p-3.5 border border-white/10 hover:border-brand-400/40 active:scale-[0.98] transition-all duration-200 cursor-pointer group"
          >
            <p className="text-[11px] font-medium text-slate-300 group-hover:text-white transition-colors">My Store Products</p>
            <p className="text-lg font-black text-white mt-0.5 tracking-tight">{vendorProducts.length} Items</p>
            <span className="text-[10px] text-brand-300 font-extrabold flex items-center gap-1 mt-0.5">
              <span>Picked from Master Catalog</span>
              <span className="group-hover:translate-x-0.5 transition-transform">→</span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => setShowCatalogModal(true)}
            className="text-left bg-white/10 hover:bg-white/20 backdrop-blur-xs rounded-xl p-3.5 border border-white/10 hover:border-amber-400/40 active:scale-[0.98] transition-all duration-200 cursor-pointer group"
          >
            <p className="text-[11px] font-medium text-slate-300 group-hover:text-white transition-colors">Master Catalog Available</p>
            <p className="text-lg font-black text-amber-300 mt-0.5 tracking-tight">{masterProducts.length} Pre-built Products</p>
            <span className="text-[10px] text-slate-300 font-medium flex items-center gap-1 mt-0.5">
              <span>Click to Open Catalog</span>
              <span className="group-hover:translate-x-0.5 transition-transform">→</span>
            </span>
          </button>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex items-center gap-2 mb-6 bg-white p-1.5 rounded-xl border border-slate-200/90 shadow-2xs overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab("products")}
          className={`px-4 py-2 text-xs font-bold rounded-lg active:scale-[0.98] transition-all duration-200 cursor-pointer shrink-0 ${
            activeTab === "products" ? "bg-emerald-600 text-white shadow-xs font-extrabold" : "text-slate-600 hover:text-navy-900 hover:bg-slate-100/80 font-bold"
          }`}
        >
          📦 My Store Products ({vendorProducts.length})
        </button>
        <button
          onClick={() => setActiveTab("orders")}
          className={`px-4 py-2 text-xs font-bold rounded-lg active:scale-[0.98] transition-all duration-200 cursor-pointer shrink-0 ${
            activeTab === "orders" ? "bg-emerald-600 text-white shadow-xs font-extrabold" : "text-slate-600 hover:text-navy-900 hover:bg-slate-100/80 font-bold"
          }`}
        >
          🛍️ Customer Orders ({vendorOrders.length})
        </button>
        <button
          onClick={() => setActiveTab("overview")}
          className={`px-4 py-2 text-xs font-bold rounded-lg active:scale-[0.98] transition-all duration-200 cursor-pointer shrink-0 ${
            activeTab === "overview" ? "bg-emerald-600 text-white shadow-xs font-extrabold" : "text-slate-600 hover:text-navy-900 hover:bg-slate-100/80 font-bold"
          }`}
        >
          📊 Sales & Store Info
        </button>
      </div>

      {/* : OVERVIEW */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Store Products List Preview */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <div>
                  <h3 className="font-extrabold text-navy-900 text-sm">Products Active in My Store</h3>
                  <p className="text-[11px] text-slate-500">Items you selected from the Master Catalog with your custom price & stock.</p>
                </div>
                <button
                  onClick={() => setShowCatalogModal(true)}
                  className="text-xs font-bold bg-brand-500 hover:bg-brand-600 text-white px-3 py-1.5 rounded-lg shadow-xs"
                >
                  + Add from Master Catalog
                </button>
              </div>

              {productsLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 animate-pulse">
                  {[1, 2, 3, 4].map((n) => (
                    <div key={n} className="border border-slate-200 rounded-xl p-3 flex gap-3 items-center bg-slate-50/50">
                      <div className="w-12 h-12 rounded-lg bg-slate-200 shrink-0" />
                      <div className="overflow-hidden flex-1 space-y-1.5">
                        <div className="h-3.5 bg-slate-200 rounded w-3/4" />
                        <div className="h-2.5 bg-slate-200 rounded w-1/2" />
                        <div className="flex items-center justify-between pt-1">
                          <div className="h-3.5 bg-slate-200 rounded w-16" />
                          <div className="h-3 bg-green-100 rounded w-12" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : vendorProducts.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-2xl mb-1">📦</p>
                  <p className="text-xs font-bold text-navy-900">Your store has no products yet!</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Click &apos;Choose from Master Catalog&apos; to pick products created by Admin & DR.</p>
                  <button
                    onClick={() => setShowCatalogModal(true)}
                    className="mt-3 bg-brand-500 text-white text-xs font-bold px-4 py-2 rounded-xl"
                  >
                    Open Master Catalog
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {vendorProducts.map((p) => (
                    <div key={p.id} className="border border-slate-200 rounded-xl p-3 flex gap-3 items-center bg-slate-50/50">
                      <img src={p.imageUrl} alt={p.name} className="w-12 h-12 rounded-lg object-cover border border-slate-200 shrink-0" />
                      <div className="overflow-hidden flex-1">
                        <p className="font-bold text-xs text-navy-900 truncate">{p.name}</p>
                        <span className="text-[10px] bg-slate-100 text-slate-700 font-semibold px-1.5 py-0.5 rounded inline-block mt-0.5">
                          {p.brand} · {p.grade}
                        </span>
                        <div className="flex items-center justify-between mt-1">
                          <p className="text-xs font-extrabold text-navy-900">₹{p.price} <span className="text-[10px] font-normal text-slate-400">/{p.unit}</span></p>
                          <span className="text-[10px] font-bold text-green-700 bg-green-50 px-1.5 py-0.5 rounded">Stock: {p.stockQty}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Orders List - Real DB Orders */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-extrabold text-navy-900 text-sm">Recent Customer Orders</h3>
                <button
                  onClick={() => setActiveTab("orders")}
                  className="text-xs font-bold text-brand-600 hover:underline"
                >
                  View All ({vendorOrders.length}) →
                </button>
              </div>
              {vendorOrders.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-500 font-medium">
                  📦 No orders placed for {shopName} in {districtName} yet.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {vendorOrders.slice(0, 5).map((ord) => {
                    const orderTotal = ord.totalAmount || ord.total || 0;
                    const itemsSummary = Array.isArray(ord.items)
                      ? ord.items.map((i) => `${i.productName || i.name} (x${i.quantity})`).join(", ")
                      : ord.items || "Order Items";
                    const custName = typeof ord.customer === "object" ? (ord.customer?.name || "Customer") : (typeof ord.customer === "string" && !ord.customer.includes("cmt") && !ord.customer.includes("usr") ? ord.customer : "Customer");

                    return (
                      <div key={ord.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                        <div>
                          <span className="font-bold text-navy-900">{formatShortId(ord.id, "ORD")}</span>
                          <span className="ml-2 px-2 py-0.5 rounded text-[10px] font-bold border bg-blue-50 text-blue-700 border-blue-200">
                            {ord.status || "Pending"}
                          </span>
                          <p className="text-slate-600 mt-0.5">👤 {custName} · {itemsSummary}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-extrabold text-navy-900 text-sm">₹{orderTotal}</p>
                          <p className="text-[10px] text-slate-400">📍 {ord.districtName || districtName}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
              <h3 className="font-extrabold text-navy-900 text-sm mb-3">Quick Actions</h3>
              <div className="space-y-2">
                <button
                  onClick={() => setShowCatalogModal(true)}
                  className="w-full bg-brand-50 hover:bg-brand-100 border border-brand-200 text-brand-700 text-xs font-bold p-3 rounded-xl flex items-center justify-between transition-colors cursor-pointer"
                >
                  <span>🔍 Pick from Master Catalog ({masterProducts.length} Items)</span>
                  <span>→</span>
                </button>
                <button
                  onClick={() => setActiveTab("products")}
                  className="w-full bg-slate-50 hover:bg-slate-100 border border-slate-200 text-navy-900 text-xs font-semibold p-3 rounded-xl flex items-center justify-between transition-colors cursor-pointer"
                >
                  <span>🏷️ Manage My Prices & Stock</span>
                  <span>→</span>
                </button>
              </div>
            </div>

            <div className="bg-linear-to-br from-navy-900 to-slate-800 rounded-2xl p-5 text-white shadow-xs">
              <span className="bg-amber-400 text-navy-900 text-[10px] font-extrabold px-2 py-0.5 rounded inline-block mb-2">
                CATALOG POLICY
              </span>
              <h4 className="font-bold text-sm">Pre-verified Master Products</h4>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                All product titles, images, categories, brands & grades are verified by Admin and District Representatives (DR) to ensure standardization for customers in {districtName}.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* : MY STORE PRODUCTS */}
      {activeTab === "products" && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
            <div>
              <h3 className="font-extrabold text-navy-900 text-sm">Products Listed in My Store</h3>
              <p className="text-xs text-slate-500">Edit your selling price (₹) and stock quantity for products added from the Master Catalog.</p>
            </div>
            <button
              onClick={() => setShowCatalogModal(true)}
              className="bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-xs transition-colors cursor-pointer shrink-0"
            >
              🔍 Choose from Master Catalog
            </button>
          </div>

          {vendorProducts.length === 0 ? (
            <div className="text-center py-12 px-4">
              <p className="text-3xl mb-2">📦</p>
              <p className="text-sm font-bold text-navy-900">No products added to your store</p>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                Admin aur DRs dwara banayi gayi Master Product List se apni zaroorat ke mutabiq products choose karke apna price aur stock set karein.
              </p>
              <button
                onClick={() => setShowCatalogModal(true)}
                className="mt-4 bg-brand-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl"
              >
                Browse Master Catalog
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200/90 bg-slate-50/90 text-[11px] font-black text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Product Details</th>
                    <th className="py-3 px-4">Category & Brand</th>
                    <th className="py-3 px-4">Type & Grade</th>
                    <th className="py-3 px-4">Approval Status</th>
                    <th className="py-3 px-4">My Selling Price</th>
                    <th className="py-3 px-4">Stock Qty</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {vendorProducts.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <img src={p.imageUrl} alt={p.name} className="w-11 h-11 object-cover rounded-lg border border-slate-200 shrink-0" />
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
                        ₹{p.price} <span className="text-[10px] font-normal text-slate-400">/{p.unit}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${p.stockQty > 0 ? "bg-emerald-50 text-emerald-700 border border-emerald-200/80" : "bg-rose-50 text-rose-700 border border-rose-200/80"}`}>
                          {p.stockQty} in stock
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setEditingProduct({ ...p })}
                            className="text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg px-2.5 py-1.5 active:scale-[0.98] transition-all duration-200 cursor-pointer"
                          >
                            ✏️ Edit Price/Stock
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

      {/* CUSTOMER ORDERS (ISOLATED FOR THIS VENDOR ONLY) */}
      {activeTab === "orders" && (
        <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-navy-900 text-sm">Customer Orders for {shopName}</h3>
              <p className="text-[11px] text-slate-500">Only orders assigned to your shop ({shopName}) are visible here.</p>
            </div>
            <span className="bg-brand-50 text-brand-700 text-xs font-bold px-3 py-1 rounded-full border border-brand-200/80 shadow-2xs">
              {vendorOrders.length} Shop Orders
            </span>
          </div>
          {vendorOrders.length === 0 ? (
            <div className="text-center py-12 px-4">
              <p className="text-3xl mb-2">🛍️</p>
              <p className="text-sm font-bold text-navy-900">No orders for your store yet</p>
              <p className="text-xs text-slate-500 mt-1">When customers order products from {shopName}, they will appear here in real-time.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200/90 bg-slate-50/90 text-[11px] font-black text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Order ID</th>
                    <th className="py-3 px-4 min-w-[220px]">Customer Details & Delivery Address</th>
                    <th className="py-3 px-4">Ordered Items</th>
                    <th className="py-3 px-4">Total Amount</th>
                    <th className="py-3 px-4">Change Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {vendorOrders.map((ord) => {
                    const orderTotal = ord.totalAmount || ord.total || 0;
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
                    let pincodeAddr = isObj ? rawAddr.pincode : "";
                    let stateAddr = (isObj && rawAddr.state) || "Uttar Pradesh";

                    // Fallback only if no address object is present on older order records
                    if (!streetAddr) {
                      if (ord.customer?.address) {
                        streetAddr = ord.customer.address;
                      } else if (custPhone) {
                        streetAddr = `Site Delivery Location (Mobile: ${custPhone})`;
                      } else {
                        streetAddr = `Site Delivery Location (${cityAddr || 'Mirzapur'})`;
                      }
                    }

                    if (!cityAddr || cityAddr.toLowerCase() === "district") {
                      cityAddr = ord.districtName || ord.regionName || "Mirzapur";
                    }

                    const formattedOrderId = formatShortId(ord.id || ord.orderNumber, "ORD");

                    return (
                      <tr key={ord.id} className="hover:bg-slate-50/80 transition-colors duration-150">
                        <td className="py-3.5 px-4">
                          <span className="font-extrabold text-brand-700 tracking-wide text-xs block">{formattedOrderId}</span>
                          <span className="text-[11px] text-slate-400 font-medium block mt-0.5">{formatDateTimeIST(ord.createdAt || ord.date)}</span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-800 min-w-[260px]">
                          <p className="font-extrabold text-navy-900 text-xs">👤 Recipient: {custFullName}</p>
                          {custPhone && (
                            <p className="text-[11px] text-slate-700 font-bold mt-0.5">📱 Contact: {custPhone}</p>
                          )}
                          <div className="mt-2 p-2.5 bg-brand-50/50 border border-brand-200/80 rounded-xl text-xs text-navy-900 leading-relaxed shadow-2xs">
                            <div className="flex items-center justify-between border-b border-brand-200/60 pb-1 mb-1 font-extrabold text-[10px] text-brand-800 uppercase tracking-wider">
                              <span>📍 FULL DELIVERY ADDRESS</span>
                              {pincodeAddr && <span className="bg-brand-600 text-white px-1.5 py-0.5 rounded text-[10px]">PIN: {pincodeAddr}</span>}
                            </div>
                            <p className="font-extrabold text-navy-900 text-xs mt-1 whitespace-normal break-words">🏢 {streetAddr}</p>
                            <p className="font-semibold text-slate-700 text-[11px] mt-1 whitespace-normal">🏙️ {cityAddr}, {stateAddr} {pincodeAddr ? `- ${pincodeAddr}` : ""}</p>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 max-w-xs">{itemsSummary}</td>
                        <td className="py-3.5 px-4 font-extrabold text-navy-900">₹{orderTotal}</td>
                        <td className="py-3.5 px-4">
                          <select
                            value={ord.status || "PENDING"}
                            onChange={async (e) => {
                              const newSt = e.target.value;
                              await updateOrderStatus(ord.id, newSt);
                              setVendorOrders((prev) =>
                                prev.map((o) => (o.id === ord.id ? { ...o, status: newSt } : o))
                              );
                            }}
                            className="bg-slate-50 border border-slate-200/90 font-extrabold text-xs text-navy-900 rounded-lg px-2.5 py-1.5 outline-none focus:border-brand-500 cursor-pointer shadow-2xs"
                          >
                            <option value="PENDING">⏳ PENDING</option>
                            <option value="PROCESSING">⚙️ PROCESSING</option>
                            <option value="OUT_FOR_DELIVERY">🚚 OUT FOR DELIVERY</option>
                            <option value="DELIVERED">✅ DELIVERED</option>
                            <option value="CANCELLED">❌ CANCELLED</option>
                          </select>
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

      {/* MODAL 1: CHOOSE FROM MASTER CATALOG MODAL */}
      {showCatalogModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-4 sm:p-6 shadow-2xl border border-slate-100 my-auto max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div>
                <h3 className="font-extrabold text-navy-900 text-base">Choose from Master Product Catalog</h3>
                <p className="text-xs text-slate-500">Products pre-configured by Admin & DR with Category, Brand, Type, Grade & Images.</p>
              </div>
              <button
                onClick={() => {
                  setShowCatalogModal(false);
                  setSelectedMasterProd(null);
                }}
                className="text-slate-400 hover:text-navy-900 text-lg leading-none"
              >
                ✕
              </button>
            </div>

            {/* Filter controls */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                <button
                  onClick={() => setSelectedCategoryFilter("ALL")}
                  className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-all duration-200 cursor-pointer active:scale-[0.98] ${
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
                    className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-all duration-200 cursor-pointer whitespace-nowrap active:scale-[0.98] ${
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
                className="bg-slate-50 text-xs border border-slate-200/90 rounded-xl px-3.5 py-2 outline-none focus:border-brand-500 w-full sm:w-60 shadow-2xs"
              />
            </div>

            {/* Master Products List */}
            <div className="max-h-96 overflow-y-auto divide-y divide-slate-100 border border-slate-200/90 rounded-xl mb-4">
              {filteredMasterProducts.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-xs text-slate-500 font-semibold">No master products found in this filter.</p>
                </div>
              ) : (
                filteredMasterProducts.map((mp) => {
                  const alreadyInStore = vendorProducts.some(
                    (vp) => vp.masterProductId === mp.id || vp.name === mp.name
                  );

                  return (
                    <div key={mp.id} className="p-3.5 flex items-center justify-between gap-3 hover:bg-slate-50/80 transition-colors duration-150">
                      <div className="flex items-center gap-3">
                        <img src={mp.imageUrl} alt={mp.name} className="w-12 h-12 object-cover rounded-lg border border-slate-200 shrink-0" />
                        <div>
                          <p className="font-bold text-xs text-navy-900">{mp.name}</p>
                          <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                            <span className="bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded text-[10px]">
                              {mp.categoryName}
                            </span>
                            <span className="text-[11px] font-semibold text-brand-600">🏷️ {mp.brand}</span>
                            <span className="bg-amber-50 text-amber-700 text-[10px] font-semibold px-1.5 py-0.5 rounded border border-amber-200">
                              {mp.grade}
                            </span>
                            <span className="text-[10px] text-slate-400">Unit: {mp.unit}</span>
                          </div>
                          <p className="text-[10px] text-slate-400 mt-0.5">Configured by: {mp.addedBy}</p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <p className="text-xs font-semibold text-slate-500">Suggested Price</p>
                        <p className="font-extrabold text-navy-900 text-sm">₹{mp.suggestedPrice}</p>
                        {alreadyInStore ? (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2.5 py-1 rounded-lg inline-block mt-1">
                            ✓ In Your Store
                          </span>
                        ) : (
                          <button
                            onClick={() => handleOpenMasterProductSelect(mp)}
                            className="mt-1 bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs px-3 py-1.5 rounded-lg shadow-xs active:scale-[0.98] transition-all duration-200 cursor-pointer"
                          >
                            + Add to My Store
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Sub-M / Form for Price & Stock when Master Product selected */}
            {selectedMasterProd && (
              <form onSubmit={handleAddMasterProductToStore} className="bg-brand-50/50 border border-brand-200/80 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-brand-200/60 pb-2">
                  <p className="text-xs font-bold text-brand-900">Set Your Price & Stock for &quot;{selectedMasterProd.name}&quot;</p>
                  <button type="button" onClick={() => setSelectedMasterProd(null)} className="text-xs font-semibold text-slate-500">Cancel selection</button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-navy-900 mb-1">
                      Your Selling Price (₹) *
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      placeholder="e.g. 390"
                      value={vendorSellingPrice}
                      onChange={(e) => setVendorSellingPrice(e.target.value)}
                      className="w-full bg-white text-xs border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-brand-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-navy-900 mb-1">
                      Initial Stock Quantity *
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      placeholder="100"
                      value={vendorStockQty}
                      onChange={(e) => setVendorStockQty(e.target.value)}
                      className="w-full bg-white text-xs border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-brand-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="submit"
                    className="bg-brand-500 hover:bg-brand-600 active:scale-[0.98] transition-all duration-200 text-white font-bold text-xs px-5 py-2 rounded-xl shadow-xs"
                  >
                    Confirm & Add to My Store Listing
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* M 2: EDIT LISTING PRICE & STOCK */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="font-bold text-navy-900 text-base">Edit Selling Price & Stock</h3>
              <button onClick={() => setEditingProduct(null)} className="text-slate-400 hover:text-navy-900 text-lg leading-none">✕</button>
            </div>

            <form onSubmit={handleUpdateListing} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Product Name</label>
                <input type="text" disabled value={editingProduct.name} className="w-full bg-slate-100 text-slate-600 text-xs border border-slate-200 rounded-xl px-3 py-2.5 font-bold cursor-not-allowed" />
              </div>

              <div>
                <label className="block text-xs font-bold text-navy-900 mb-1">My Selling Price (₹) *</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={editingProduct.price}
                  onChange={(e) => setEditingProduct({ ...editingProduct, price: e.target.value })}
                  className="w-full bg-slate-50 text-xs border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-brand-500 font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-navy-900 mb-1">Available Stock Qty *</label>
                <input
                  type="number"
                  required
                  min="0"
                  value={editingProduct.stockQty}
                  onChange={(e) => setEditingProduct({ ...editingProduct, stockQty: e.target.value })}
                  className="w-full bg-slate-50 text-xs border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-brand-500 font-bold"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button type="button" onClick={() => setEditingProduct(null)} className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 rounded-xl">Cancel</button>
                <button type="submit" className="px-5 py-2 text-xs font-bold text-white bg-brand-500 rounded-xl hover:bg-brand-600 shadow-xs">Update Listing</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}