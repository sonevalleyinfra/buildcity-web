import { useState } from "react";
import DashboardShell from "../../components/DashboardShell";
import { useAuth } from "../../context/AuthContext";
import { useAdmin } from "../../context/AdminContext";

export default function VendorDashboard() {
  const { user } = useAuth();
  const {
    masterProducts = [],
    products = [],
    categories = [],
    assignMasterProductToVendor,
    updateVendorProductListing,
    removeVendorProductListing,
  } = useAdmin();

  const [activeTab, setActiveTab] = useState("overview"); // "overview" | "products" | "orders"

  // Master Catalog Modal State
  const [showCatalogModal, setShowCatalogModal] = useState(false);
  const [selectedMasterProd, setSelectedMasterProd] = useState(null);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("ALL");
  const [catalogSearch, setCatalogSearch] = useState("");

  // Price & Stock Input for adding chosen master product
  const [vendorSellingPrice, setVendorSellingPrice] = useState("");
  const [vendorStockQty, setVendorStockQty] = useState(100);

  // Edit Listing Modal State
  const [editingProduct, setEditingProduct] = useState(null);

  // Vendor Profile Info
  const vendorInfo = user?.vendorInfo || {};
  const shopName = vendorInfo.shopName || user?.name || "Shree Cement Traders";
  const ownerName = vendorInfo.ownerName || "Vendor Owner";
  const vendorPhone = user?.phone || vendorInfo.phone || "9876543210";
  const districtName = vendorInfo.regionName || "Varanasi";
  const vendorId = vendorInfo.id || "v1";

  // Filter products listed in this vendor's shop
  const vendorProducts = products.filter(
    (p) => p.vendorId === vendorId || p.vendorName?.toLowerCase() === shopName.toLowerCase()
  );

  // Filter master products by category & search term
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
      price: Number(vendorSellingPrice),
      stockQty: Number(vendorStockQty) || 0,
      addedBy: `Vendor (${shopName})`,
    });

    setSelectedMasterProd(null);
    setShowCatalogModal(false);
    alert(`"${selectedMasterProd.name}" has been added to your store!`);
  };

  const handleUpdateListing = (e) => {
    e.preventDefault();
    if (!editingProduct) return;

    updateVendorProductListing(editingProduct.id, {
      price: Number(editingProduct.price),
      stockQty: Number(editingProduct.stockQty),
    });

    setEditingProduct(null);
    alert("Product price and stock updated!");
  };

  const handleRemoveListing = (id, name) => {
    if (confirm(`Remove "${name}" from your store listings?`)) {
      removeVendorProductListing(id);
    }
  };

  const sampleOrders = [
    { id: "ORD-9081", customer: "Rahul Kumar", items: "UltraTech Cement x5", total: "₹1,950", status: "Pending", date: "Today, 02:30 PM", color: "bg-amber-50 text-amber-700 border-amber-200" },
    { id: "ORD-9080", customer: "Amit Singh", items: "Asian Paints 20L x1", total: "₹2,250", status: "Ready for Pickup", date: "Today, 11:15 AM", color: "bg-blue-50 text-blue-700 border-blue-200" },
    { id: "ORD-9079", customer: "Neha Sharma", items: "TMT Steel Bar x10", total: "₹6,500", status: "Delivered", date: "Yesterday", color: "bg-green-50 text-green-700 border-green-200" },
  ];

  return (
    <DashboardShell badge="Vendor Partner" badgeColor="#10B981">
      {/* Vendor Hero Banner */}
      <div className="bg-linear-to-r from-navy-900 via-navy-800 to-slate-900 rounded-2xl p-6 text-white shadow-md mb-6 relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="bg-green-500/20 text-green-300 border border-green-500/30 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
                STORE STATUS: APPROVED
              </span>
              <span className="bg-white/10 text-slate-300 text-[11px] font-semibold px-2.5 py-0.5 rounded-full">
                📍 {districtName}
              </span>
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">{shopName}</h1>
            <p className="text-xs text-slate-300 mt-1">
              Owner: <strong>{ownerName}</strong> · Mobile: <strong>{vendorPhone}</strong> · Commission Rate: <strong>{vendorInfo.commissionRate || 10}%</strong>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowCatalogModal(true)}
              className="bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-sm flex items-center gap-2 cursor-pointer"
            >
              🔍 Choose from Master Catalog
            </button>
          </div>
        </div>

        {/* Quick Metrics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-700/60 relative z-10">
          <div className="bg-white/10 backdrop-blur-xs rounded-xl p-3">
            <p className="text-[11px] font-medium text-slate-300">Today&apos;s Revenue</p>
            <p className="text-lg font-bold text-white mt-0.5">₹14,850</p>
            <span className="text-[10px] text-green-400 font-semibold">↑ +18% vs yesterday</span>
          </div>
          <div className="bg-white/10 backdrop-blur-xs rounded-xl p-3">
            <p className="text-[11px] font-medium text-slate-300">Active Orders</p>
            <p className="text-lg font-bold text-white mt-0.5">3 Orders</p>
            <span className="text-[10px] text-amber-300 font-semibold">Ready for pickup</span>
          </div>
          <div className="bg-white/10 backdrop-blur-xs rounded-xl p-3">
            <p className="text-[11px] font-medium text-slate-300">My Store Products</p>
            <p className="text-lg font-bold text-white mt-0.5">{vendorProducts.length} Items</p>
            <span className="text-[10px] text-brand-300 font-semibold">Picked from Master Catalog</span>
          </div>
          <div className="bg-white/10 backdrop-blur-xs rounded-xl p-3">
            <p className="text-[11px] font-medium text-slate-300">Master Catalog Available</p>
            <p className="text-lg font-bold text-amber-300 mt-0.5">{masterProducts.length} Pre-built Products</p>
            <span className="text-[10px] text-slate-300 font-semibold">Created by Admin & DR</span>
          </div>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex items-center gap-2 mb-6 bg-white p-1.5 rounded-xl border border-slate-200 shadow-xs w-fit">
        <button
          onClick={() => setActiveTab("overview")}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
            activeTab === "overview" ? "bg-navy-900 text-white shadow-xs" : "text-slate-600 hover:text-navy-900"
          }`}
        >
          📊 Store Overview
        </button>
        <button
          onClick={() => setActiveTab("products")}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
            activeTab === "products" ? "bg-navy-900 text-white shadow-xs" : "text-slate-600 hover:text-navy-900"
          }`}
        >
          📦 My Store Products ({vendorProducts.length})
        </button>
        <button
          onClick={() => setActiveTab("orders")}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
            activeTab === "orders" ? "bg-navy-900 text-white shadow-xs" : "text-slate-600 hover:text-navy-900"
          }`}
        >
          🛍️ Customer Orders ({sampleOrders.length})
        </button>
      </div>

      {/* TAB 1: OVERVIEW */}
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

              {vendorProducts.length === 0 ? (
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

            {/* Recent Orders List */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
              <h3 className="font-extrabold text-navy-900 text-sm mb-3">Recent Customer Orders</h3>
              <div className="divide-y divide-slate-100">
                {sampleOrders.map((ord) => (
                  <div key={ord.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                    <div>
                      <span className="font-bold text-navy-900">{ord.id}</span>
                      <span className={`ml-2 px-2 py-0.5 rounded text-[10px] font-bold border ${ord.color}`}>{ord.status}</span>
                      <p className="text-slate-600 mt-0.5">👤 {ord.customer} · {ord.items}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-extrabold text-navy-900 text-sm">{ord.total}</p>
                      <p className="text-[10px] text-slate-400">{ord.date}</p>
                    </div>
                  </div>
                ))}
              </div>
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

      {/* TAB 2: MY STORE PRODUCTS */}
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
                  <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase">
                    <th className="py-3 px-4">Product Details</th>
                    <th className="py-3 px-4">Category & Brand</th>
                    <th className="py-3 px-4">Type & Grade</th>
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
                      <td className="py-3.5 px-4 font-extrabold text-navy-900 text-sm">
                        ₹{p.price} <span className="text-[10px] font-normal text-slate-400">/{p.unit}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${p.stockQty > 0 ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-600 border border-red-200"}`}>
                          {p.stockQty} in stock
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setEditingProduct({ ...p })}
                            className="text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg px-2.5 py-1.5 transition-colors cursor-pointer"
                          >
                            ✏️ Edit Price/Stock
                          </button>
                          <button
                            onClick={() => handleRemoveListing(p.id, p.name)}
                            className="text-[11px] font-semibold text-red-600 hover:bg-red-50 rounded-lg px-2.5 py-1.5 transition-colors cursor-pointer"
                          >
                            Remove
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

      {/* TAB 3: CUSTOMER ORDERS */}
      {activeTab === "orders" && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200">
            <h3 className="font-extrabold text-navy-900 text-sm">Customer Orders for {shopName}</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase">
                  <th className="py-3 px-4">Order ID</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Ordered Items</th>
                  <th className="py-3 px-4">Total Amount</th>
                  <th className="py-3 px-4">Order Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sampleOrders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-slate-50">
                    <td className="py-3.5 px-4 font-bold text-navy-900">{ord.id}</td>
                    <td className="py-3.5 px-4 font-semibold text-slate-800">{ord.customer}</td>
                    <td className="py-3.5 px-4 text-slate-600">{ord.items}</td>
                    <td className="py-3.5 px-4 font-extrabold text-navy-900">{ord.total}</td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${ord.color}`}>
                        {ord.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL 1: CHOOSE FROM MASTER CATALOG MODAL */}
      {showCatalogModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-slate-100 my-8">
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
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                <button
                  onClick={() => setSelectedCategoryFilter("ALL")}
                  className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-colors cursor-pointer ${
                    selectedCategoryFilter === "ALL"
                      ? "bg-navy-900 text-white border-navy-900"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  All Categories ({masterProducts.length})
                </button>
                {categories.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedCategoryFilter(c.id)}
                    className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-colors cursor-pointer whitespace-nowrap ${
                      selectedCategoryFilter === c.id
                        ? "bg-navy-900 text-white border-navy-900"
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
                className="bg-slate-50 text-xs border border-slate-200 rounded-xl px-3.5 py-2 outline-none focus:border-brand-500 w-full sm:w-60"
              />
            </div>

            {/* Master Products List */}
            <div className="max-h-96 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl mb-4">
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
                    <div key={mp.id} className="p-3.5 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors">
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
                          <span className="text-[10px] font-bold text-green-700 bg-green-50 border border-green-200 px-2.5 py-1 rounded-lg inline-block mt-1">
                            ✓ In Your Store
                          </span>
                        ) : (
                          <button
                            onClick={() => handleOpenMasterProductSelect(mp)}
                            className="mt-1 bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs px-3 py-1.5 rounded-lg shadow-xs transition-colors cursor-pointer"
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

            {/* Sub-Modal / Form for Price & Stock when Master Product selected */}
            {selectedMasterProd && (
              <form onSubmit={handleAddMasterProductToStore} className="bg-brand-50/50 border border-brand-200 rounded-xl p-4 space-y-3">
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
                    className="bg-brand-500 text-white font-bold text-xs px-5 py-2 rounded-xl shadow-xs hover:bg-brand-600"
                  >
                    Confirm & Add to My Store Listing
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* MODAL 2: EDIT LISTING PRICE & STOCK */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
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