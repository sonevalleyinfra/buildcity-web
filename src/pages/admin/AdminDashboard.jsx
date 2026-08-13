import { useState } from "react";
import Logo from "../../components/Logo";
import { useAuth } from "../../context/AuthContext";
import { useAdmin } from "../../context/AdminContext";

const TABS = [
  { id: "Overview", label: "📊 Overview" },
  { id: "District Reps (DR)", label: "📍 District Reps (DR)" },
  { id: "Vendors", label: "🏬 Vendors" },
  { id: "Products", label: "📦 Products" },
  { id: "Orders", label: "🛒 Orders" },
  { id: "Categories", label: "🏷️ Categories" },
  { id: "Regions", label: "🗺️ Regions" },
];

const STATUS_STYLE = {
  APPROVED: "bg-green-50 text-green-700 border-green-200",
  PENDING: "bg-amber-50 text-amber-700 border-amber-200",
  SUSPENDED: "bg-red-50 text-red-600 border-red-200",
  ACTIVE: "bg-green-50 text-green-700 border-green-200",
  INACTIVE: "bg-red-50 text-red-600 border-red-200",
  Delivered: "bg-green-50 text-green-700 border-green-200",
  Shipped: "bg-blue-50 text-brand-600 border-blue-200",
  Pending: "bg-amber-50 text-amber-700 border-amber-200",
  Cancelled: "bg-red-50 text-red-600 border-red-200",
};

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const {
    drs = [],
    vendors,
    orders,
    categories,
    regions,
    products,
    stats,
    addDr,
    toggleDrActive,
    setVendorStatus,
    addCategory,
    toggleCategoryActive,
    addRegion,
    toggleRegionActive,
    addProduct,
    toggleProductActive,
  } = useAdmin();

  const [tab, setTab] = useState("Overview");
  const [searchTerm, setSearchTerm] = useState("");

  // Modals
  const [showDrForm, setShowDrForm] = useState(false);
  const [showCatForm, setShowCatForm] = useState(false);
  const [showRegionForm, setShowRegionForm] = useState(false);
  const [showProductForm, setShowProductForm] = useState(false);

  // Forms
  const [drForm, setDrForm] = useState({ name: "", phone: "", regionId: "" });
  const [catForm, setCatForm] = useState({ name: "", gstRate: 18 });
  const [regionForm, setRegionForm] = useState({ name: "", state: "Uttar Pradesh", baseDeliveryCharge: 49 });
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

  const handleAddDr = (e) => {
    e.preventDefault();
    if (!drForm.name.trim() || !drForm.phone.trim() || !drForm.regionId) {
      alert("Please fill all DR details!");
      return;
    }
    addDr({
      name: drForm.name.trim(),
      phone: drForm.phone.trim(),
      regionId: drForm.regionId,
    });
    setDrForm({ name: "", phone: "", regionId: "" });
    setShowDrForm(false);
    alert("District Representative added successfully!");
  };

  const handleAddCategory = (e) => {
    e.preventDefault();
    if (!catForm.name.trim()) return;
    addCategory({ name: catForm.name, gstRate: Number(catForm.gstRate) });
    setCatForm({ name: "", gstRate: 18 });
    setShowCatForm(false);
  };

  const handleAddRegion = (e) => {
    e.preventDefault();
    if (!regionForm.name.trim()) return;
    addRegion({
      name: regionForm.name,
      state: regionForm.state,
      baseDeliveryCharge: Number(regionForm.baseDeliveryCharge),
    });
    setRegionForm({ name: "", state: "Uttar Pradesh", baseDeliveryCharge: 49 });
    setShowRegionForm(false);
  };

  const handleAddProduct = (e) => {
    e.preventDefault();
    if (!productForm.name.trim() || !productForm.categoryId || !productForm.vendorId) return;
    addProduct({
      name: productForm.name,
      categoryId: productForm.categoryId,
      vendorId: productForm.vendorId,
      brand: productForm.brand || "Generic",
      type: productForm.type || "Standard",
      grade: productForm.grade || "Standard Grade",
      unit: productForm.unit || "Unit",
      price: Number(productForm.price) || 0,
      stockQty: Number(productForm.stockQty) || 0,
      addedBy: "Admin",
    });
    setProductForm({ name: "", categoryId: "", vendorId: "", brand: "", type: "", grade: "", unit: "50kg Bag", price: "", stockQty: "" });
    setShowProductForm(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-navy-900 pb-16">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo size="sm" />
            <span className="bg-navy-900 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
              Super Admin
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-bold text-navy-900">{user?.name || "System Administrator"}</p>
              <p className="text-[11px] text-slate-500">Master Control Center</p>
            </div>
            <button
              onClick={logout}
              className="text-xs font-semibold text-red-600 bg-red-50 border border-red-200 px-3.5 py-1.5 rounded-xl hover:bg-red-100 transition-colors cursor-pointer"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Tabs Bar */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex gap-2 overflow-x-auto py-2 border-t border-slate-100">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap cursor-pointer ${
                tab === t.id
                  ? "bg-navy-900 text-white shadow-xs"
                  : "text-slate-600 hover:bg-slate-100 hover:text-navy-900"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 mt-6">
        {/* OVERVIEW TAB */}
        {tab === "Overview" && (
          <div className="space-y-6">
            {/* Top Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
                <p className="text-xs font-medium text-slate-500">Total Revenue</p>
                <p className="text-xl font-extrabold text-navy-900 mt-1">₹{stats.totalRevenue.toLocaleString("en-IN")}</p>
                <span className="text-[10px] text-green-600 font-semibold">From completed orders</span>
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
                <p className="text-xs font-medium text-slate-500">Approved Vendors</p>
                <p className="text-xl font-extrabold text-navy-900 mt-1">{stats.approvedVendors}</p>
                <span className="text-[10px] text-slate-500 font-semibold">{stats.pendingVendors} pending approval</span>
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
                <p className="text-xs font-medium text-slate-500">District Reps (DR)</p>
                <p className="text-xl font-extrabold text-navy-900 mt-1">{drs.length}</p>
                <span className="text-[10px] text-brand-600 font-semibold">Active ground agents</span>
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
                <p className="text-xs font-medium text-slate-500">Active Products</p>
                <p className="text-xl font-extrabold text-navy-900 mt-1">{products.length}</p>
                <span className="text-[10px] text-slate-500 font-semibold">{categories.length} categories</span>
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
                <p className="text-xs font-medium text-slate-500">Covered Regions</p>
                <p className="text-xl font-extrabold text-navy-900 mt-1">{regions.length}</p>
                <span className="text-[10px] text-slate-500 font-semibold">Uttar Pradesh</span>
              </div>
            </div>

            {/* Quick Action Banner */}
            <div className="bg-linear-to-r from-navy-900 to-slate-900 rounded-2xl p-6 text-white shadow-md flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold">Admin Management Shortcuts</h2>
                <p className="text-xs text-slate-300 mt-0.5">Quickly assign DRs, manage vendors, and inspect live marketplace transactions.</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => setTab("District Reps (DR)")} className="bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-xs">
                  + Add District Rep (DR)
                </button>
                <button onClick={() => setTab("Vendors")} className="bg-white text-navy-900 font-bold text-xs px-4 py-2.5 rounded-xl shadow-xs hover:bg-slate-100">
                  Manage Vendors
                </button>
              </div>
            </div>

            {/* Recent Orders List */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
              <h3 className="font-extrabold text-navy-900 text-sm mb-4">Recent Marketplace Transactions</h3>
              <div className="divide-y divide-slate-100">
                {orders.map((o) => (
                  <div key={o.id} className="py-3 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-navy-900">#{o.id}</span>
                      <span className="text-slate-600 ml-2 font-medium">Customer: {o.customer}</span>
                      <p className="text-[11px] text-slate-400 mt-0.5">Vendor: {o.vendor} · Date: {o.date}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-extrabold text-navy-900 text-sm">₹{o.amount.toLocaleString("en-IN")}</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${STATUS_STYLE[o.status]}`}>
                        {o.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* DISTRICT REPS (DR) TAB */}
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
              <form onSubmit={handleAddDr} className="p-5 border-b border-slate-200 bg-brand-50/30 space-y-4">
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
                      className="w-full bg-white text-xs border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-brand-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-navy-900 mb-1">Assign District / Region *</label>
                    <select
                      required
                      value={drForm.regionId}
                      onChange={(e) => setDrForm({ ...drForm, regionId: e.target.value })}
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
                </div>

                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setShowDrForm(false)} className="px-4 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl">
                    Cancel
                  </button>
                  <button type="submit" className="px-5 py-2 text-xs font-bold text-white bg-brand-500 rounded-xl shadow-xs hover:bg-brand-600">
                    Save DR Access
                  </button>
                </div>
              </form>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase">
                    <th className="py-3 px-4">DR Representative</th>
                    <th className="py-3 px-4">Assigned Mobile</th>
                    <th className="py-3 px-4">Assigned District</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Onboarded Stats</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {drs.map((d) => (
                    <tr key={d.id} className="hover:bg-slate-50">
                      <td className="py-3.5 px-4 font-bold text-navy-900">{d.name}</td>
                      <td className="py-3.5 px-4 font-semibold text-slate-700">📱 {d.phone}</td>
                      <td className="py-3.5 px-4">
                        <span className="bg-slate-100 text-slate-800 font-bold px-2.5 py-0.5 rounded text-[11px]">
                          📍 {d.regionName}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${STATUS_STYLE[d.status]}`}>
                          {d.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        {d.vendorCount || 0} Vendors · {d.productCount || 0} Products
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => toggleDrActive(d.id)}
                          className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${
                            d.status === "ACTIVE"
                              ? "bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100"
                              : "bg-green-500 text-white border-green-600 hover:bg-green-600"
                          }`}
                        >
                          {d.status === "ACTIVE" ? "Deactivate" : "Activate"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
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
                <p className="text-xs text-slate-500 mt-0.5">Approve or Suspend marketplace vendors. Approved vendors can log in via Mobile OTP.</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase">
                    <th className="py-3 px-4">Shop Name</th>
                    <th className="py-3 px-4">Owner & Mobile</th>
                    <th className="py-3 px-4">District</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Commission</th>
                    <th className="py-3 px-4 text-right">Approval Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {vendors.map((v) => (
                    <tr key={v.id} className="hover:bg-slate-50">
                      <td className="py-3.5 px-4 font-bold text-navy-900">{v.shopName}</td>
                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-slate-800">{v.ownerName}</p>
                        <p className="text-[11px] text-slate-500">📱 {v.phone}</p>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-700">{v.regionName || "Varanasi"}</td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${STATUS_STYLE[v.status]}`}>
                          {v.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-700">{v.commissionRate}%</td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {v.status !== "APPROVED" && (
                            <button
                              onClick={() => setVendorStatus(v.id, "APPROVED")}
                              className="text-[11px] font-bold bg-green-500 hover:bg-green-600 text-white rounded-lg px-2.5 py-1.5 shadow-xs cursor-pointer"
                            >
                              Approve
                            </button>
                          )}
                          {v.status !== "SUSPENDED" && (
                            <button
                              onClick={() => setVendorStatus(v.id, "SUSPENDED")}
                              className="text-[11px] font-semibold border border-red-300 text-red-600 hover:bg-red-50 rounded-lg px-2.5 py-1.5 cursor-pointer"
                            >
                              Suspend
                            </button>
                          )}
                          {v.status === "SUSPENDED" && (
                            <button
                              onClick={() => setVendorStatus(v.id, "APPROVED")}
                              className="text-[11px] font-semibold border border-brand-500 text-brand-500 hover:bg-brand-50 rounded-lg px-2.5 py-1.5 cursor-pointer"
                            >
                              Reinstate
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
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
                <p className="text-xs text-slate-500 mt-0.5">Manage all products listed across all districts and vendors.</p>
              </div>
              <button
                onClick={() => setShowProductForm((v) => !v)}
                className="bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                + Add Master Product
              </button>
            </div>

            {showProductForm && (
              <form onSubmit={handleAddProduct} className="p-5 border-b border-slate-200 bg-slate-50 space-y-3.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-navy-900 mb-1">Product Title *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. UltraTech Super PPC Cement"
                      value={productForm.name}
                      onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                      className="w-full bg-white text-xs border border-slate-200 rounded-xl px-3 py-2 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-navy-900 mb-1">Category *</label>
                    <select
                      required
                      value={productForm.categoryId}
                      onChange={(e) => setProductForm({ ...productForm, categoryId: e.target.value })}
                      className="w-full bg-white text-xs border border-slate-200 rounded-xl px-3 py-2 outline-none"
                    >
                      <option value="">-- Select Category --</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-navy-900 mb-1">Vendor *</label>
                    <select
                      required
                      value={productForm.vendorId}
                      onChange={(e) => setProductForm({ ...productForm, vendorId: e.target.value })}
                      className="w-full bg-white text-xs border border-slate-200 rounded-xl px-3 py-2 outline-none"
                    >
                      <option value="">-- Select Vendor --</option>
                      {vendors.map((v) => (
                        <option key={v.id} value={v.id}>{v.shopName}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-navy-900 mb-1">Brand</label>
                    <input
                      type="text"
                      placeholder="e.g. UltraTech"
                      value={productForm.brand}
                      onChange={(e) => setProductForm({ ...productForm, brand: e.target.value })}
                      className="w-full bg-white text-xs border border-slate-200 rounded-xl px-3 py-2 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-navy-900 mb-1">Grade</label>
                    <input
                      type="text"
                      placeholder="e.g. OPC 53 Grade"
                      value={productForm.grade}
                      onChange={(e) => setProductForm({ ...productForm, grade: e.target.value })}
                      className="w-full bg-white text-xs border border-slate-200 rounded-xl px-3 py-2 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-navy-900 mb-1">Price (₹) *</label>
                    <input
                      type="number"
                      required
                      placeholder="390"
                      value={productForm.price}
                      onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                      className="w-full bg-white text-xs border border-slate-200 rounded-xl px-3 py-2 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-navy-900 mb-1">Stock Qty</label>
                    <input
                      type="number"
                      placeholder="500"
                      value={productForm.stockQty}
                      onChange={(e) => setProductForm({ ...productForm, stockQty: e.target.value })}
                      className="w-full bg-white text-xs border border-slate-200 rounded-xl px-3 py-2 outline-none"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={() => setShowProductForm(false)} className="px-4 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl">
                    Cancel
                  </button>
                  <button type="submit" className="px-5 py-2 text-xs font-bold text-white bg-brand-500 rounded-xl shadow-xs hover:bg-brand-600">
                    Save Master Product
                  </button>
                </div>
              </form>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase">
                    <th className="py-3 px-4">Product</th>
                    <th className="py-3 px-4">Category & Brand</th>
                    <th className="py-3 px-4">Type & Grade</th>
                    <th className="py-3 px-4">Vendor</th>
                    <th className="py-3 px-4">Price / Unit</th>
                    <th className="py-3 px-4">Stock Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {products.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <img src={p.imageUrl} alt={p.name} className="w-10 h-10 object-cover rounded-lg border border-slate-200 shrink-0" />
                          <div>
                            <p className="font-bold text-navy-900">{p.name}</p>
                            <p className="text-[10px] text-slate-400">Added by: {p.addedBy || "Admin"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="bg-slate-100 text-slate-700 font-semibold px-2 py-0.5 rounded text-[11px]">
                          {p.categoryName || "General"}
                        </span>
                        <p className="text-slate-800 font-medium mt-0.5">🏷️ {p.brand}</p>
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-slate-800">{p.type}</p>
                        <span className="bg-amber-50 text-amber-700 text-[10px] font-semibold px-1.5 py-0.5 rounded border border-amber-200 inline-block mt-0.5">
                          Grade: {p.grade}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-navy-900">{p.vendorName}</td>
                      <td className="py-3.5 px-4">
                        <span className="font-extrabold text-navy-900 text-sm">₹{p.price}</span>
                        <span className="text-[11px] text-slate-500"> /{p.unit}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${p.stockQty > 0 ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
                          {p.stockQty} in stock
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ORDERS TAB */}
        {tab === "Orders" && (
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden p-5">
            <h2 className="text-base font-extrabold text-navy-900 mb-4">Customer Orders & Fulfillment</h2>
            <div className="divide-y divide-slate-100">
              {orders.map((o) => (
                <div key={o.id} className="py-3.5 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-navy-900 text-sm">#{o.id}</span>
                    <span className="text-slate-600 ml-2 font-medium">Customer: {o.customer}</span>
                    <p className="text-[11px] text-slate-500 mt-0.5">Vendor: {o.vendor} · Date: {o.date}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-extrabold text-navy-900 text-sm">₹{o.amount.toLocaleString("en-IN")}</span>
                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${STATUS_STYLE[o.status]}`}>
                      {o.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CATEGORIES TAB */}
        {tab === "Categories" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
              <div>
                <h2 className="text-base font-extrabold text-navy-900">Product Categories & GST Rates</h2>
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
                <input
                  type="number"
                  placeholder="GST Rate % (e.g. 18)"
                  value={catForm.gstRate}
                  onChange={(e) => setCatForm({ ...catForm, gstRate: e.target.value })}
                  className="bg-slate-50 text-xs border border-slate-200 rounded-xl px-3 py-2 w-32"
                />
                <button type="submit" className="bg-brand-500 text-white text-xs font-bold px-4 py-2 rounded-xl">Save</button>
              </form>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {categories.map((c) => (
                <div key={c.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-navy-900 text-sm">{c.name}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">{c.productCount} products listed</p>
                  </div>
                  <span className="bg-brand-50 text-brand-700 text-xs font-bold px-2.5 py-1 rounded-full border border-brand-200">
                    {c.gstRate}% GST
                  </span>
                </div>
              ))}
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
                <button type="submit" className="bg-brand-500 text-white text-xs font-bold px-4 py-2 rounded-xl">Save</button>
              </form>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {regions.map((r) => (
                <div key={r.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
                  <h3 className="font-bold text-navy-900 text-sm">📍 {r.name}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">{r.state}</p>
                  <p className="text-xs font-bold text-brand-600 mt-2">Base Delivery: ₹{r.baseDeliveryCharge}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}