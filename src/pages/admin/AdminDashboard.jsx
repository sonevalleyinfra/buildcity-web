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

// Super Admin Dashboard component — Master Control Center for platform operations
// Admin yahan se DRs assign karta hai, Vendors approve/suspend karta hai, Master Product Catalog manage karta hai, aur Categories/Regions configure karta hai.
export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const {
    drs = [],
    vendors,
    orders,
    categories,
    regions,
    masterProducts = [],
    products,
    stats,
    addDr,
    updateDr,
    toggleDrActive,
    addVendor,
    updateVendor,
    setVendorStatus,
    addCategory,
    updateCategory,
    addRegion,
    updateRegion,
    addMasterProduct,
    updateMasterProduct,
  } = useAdmin();

  // Tab State: Overview, District Reps, Vendors, Products, Orders, Categories, Regions
  const [tab, setTab] = useState("Overview");
  const [searchTerm, setSearchTerm] = useState("");

  // Modals state (Naya DR, Category, Region, Product add karne ke liye)
  const [showDrForm, setShowDrForm] = useState(false);
  const [showCatForm, setShowCatForm] = useState(false);
  const [showRegionForm, setShowRegionForm] = useState(false);
  const [showProductForm, setShowProductForm] = useState(false);

  // Modals state (Existing DR, Vendor, Product, Category, Region EDIT karne ke liye)
  const [editingDr, setEditingDr] = useState(null);
  const [editingVendor, setEditingVendor] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);
  const [editingCategory, setEditingCategory] = useState(null);
  const [editingRegion, setEditingRegion] = useState(null);

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

  const handleUpdateDrSubmit = (e) => {
    e.preventDefault();
    if (!editingDr) return;
    updateDr(editingDr.id, editingDr);
    setEditingDr(null);
    alert("DR details updated!");
  };

  const handleUpdateVendorSubmit = (e) => {
    e.preventDefault();
    if (!editingVendor) return;
    updateVendor(editingVendor.id, editingVendor);
    setEditingVendor(null);
    alert("Vendor details updated!");
  };

  const handleUpdateProductSubmit = (e) => {
    e.preventDefault();
    if (!editingProduct) return;
    updateMasterProduct(editingProduct.id || editingProduct.masterProductId, editingProduct);
    setEditingProduct(null);
    alert("Product details updated!");
  };

  const handleAddCategory = (e) => {
    e.preventDefault();
    if (!catForm.name.trim()) return;
    addCategory({ name: catForm.name, gstRate: Number(catForm.gstRate) });
    setCatForm({ name: "", gstRate: 18 });
    setShowCatForm(false);
  };

  const handleUpdateCategorySubmit = (e) => {
    e.preventDefault();
    if (!editingCategory) return;
    updateCategory(editingCategory.id, editingCategory);
    setEditingCategory(null);
    alert("Category updated!");
  };

  const handleAddRegion = (e) => {
    e.preventDefault();
    if (!regionForm.name.trim()) return;
    addRegion({ name: regionForm.name, state: regionForm.state, baseDeliveryCharge: Number(regionForm.baseDeliveryCharge) });
    setRegionForm({ name: "", state: "Uttar Pradesh", baseDeliveryCharge: 49 });
    setShowRegionForm(false);
  };

  const handleUpdateRegionSubmit = (e) => {
    e.preventDefault();
    if (!editingRegion) return;
    updateRegion(editingRegion.id, editingRegion);
    setEditingRegion(null);
    alert("District Region updated!");
  };

  const handleAddProduct = (e) => {
    e.preventDefault();
    if (!productForm.name.trim() || !productForm.categoryId) {
      alert("Please select Category and enter Product Name!");
      return;
    }
    addMasterProduct({
      name: productForm.name.trim(),
      categoryId: productForm.categoryId,
      vendorId: productForm.vendorId || null,
      brand: productForm.brand.trim() || "Generic",
      type: productForm.type.trim() || "Standard",
      grade: productForm.grade.trim() || "Standard Grade",
      unit: productForm.unit.trim() || "Unit",
      price: Number(productForm.price) || 100,
      stockQty: Number(productForm.stockQty) || 100,
      addedBy: "Super Admin",
    });
    setProductForm({ name: "", categoryId: "", vendorId: "", brand: "", type: "", grade: "", unit: "50kg Bag", price: "", stockQty: "" });
    setShowProductForm(false);
    alert("Master Product created successfully!");
  };

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

        {/* Tabs Bar hai  */}
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
                  <button type="button" onClick={() => setShowDrForm(false)} className="px-4 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl">Cancel</button>
                  <button type="submit" className="px-5 py-2 text-xs font-bold text-white bg-brand-500 rounded-xl shadow-xs hover:bg-brand-600">Save DR Access</button>
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
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setEditingDr({ ...d })}
                            className="text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg px-2.5 py-1.5 cursor-pointer"
                          >
                            ✏️ Edit
                          </button>
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
                        </div>
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
                <p className="text-xs text-slate-500 mt-0.5">Approve, Edit, or Suspend marketplace vendors. Approved vendors can log in via Mobile OTP.</p>
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
                    <th className="py-3 px-4">Commission Rate</th>
                    <th className="py-3 px-4 text-right">Actions</th>
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
                      <td className="py-3.5 px-4">
                        <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px] font-semibold">
                          📍 {v.regionName}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${STATUS_STYLE[v.status]}`}>
                          {v.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-navy-900">{v.commissionRate || 10}%</td>
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
                <p className="text-xs text-slate-500 mt-0.5">Platform master products created by Admin & DRs for vendor store selection.</p>
              </div>
              <button onClick={() => setShowProductForm((v) => !v)} className="bg-brand-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs">
                + Create Master Product
              </button>
            </div>

            {showProductForm && (
              <form onSubmit={handleAddProduct} className="p-5 border-b border-slate-200 bg-brand-50/30 space-y-3">
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
                    <label className="block text-xs font-bold text-navy-900 mb-1">Brand</label>
                    <input type="text" placeholder="e.g. UltraTech" value={productForm.brand} onChange={(e) => setProductForm({ ...productForm, brand: e.target.value })} className="w-full bg-white text-xs border border-slate-200 rounded-xl px-3 py-2 outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-navy-900 mb-1">Type</label>
                    <input type="text" placeholder="e.g. PPC Cement" value={productForm.type} onChange={(e) => setProductForm({ ...productForm, type: e.target.value })} className="w-full bg-white text-xs border border-slate-200 rounded-xl px-3 py-2 outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-navy-900 mb-1">Grade</label>
                    <input type="text" placeholder="e.g. OPC 53 Grade" value={productForm.grade} onChange={(e) => setProductForm({ ...productForm, grade: e.target.value })} className="w-full bg-white text-xs border border-slate-200 rounded-xl px-3 py-2 outline-none" />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={() => setShowProductForm(false)} className="px-4 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl">Cancel</button>
                  <button type="submit" className="px-5 py-2 text-xs font-bold text-white bg-brand-500 rounded-xl shadow-xs hover:bg-brand-600">Save Master Product</button>
                </div>
              </form>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase">
                    <th className="py-3 px-4">Product Details</th>
                    <th className="py-3 px-4">Category & Brand</th>
                    <th className="py-3 px-4">Type & Grade</th>
                    <th className="py-3 px-4">Suggested Price</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {masterProducts.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <img src={p.imageUrl} alt={p.name} className="w-10 h-10 object-cover rounded-lg border border-slate-200 shrink-0" />
                          <div>
                            <p className="font-bold text-navy-900">{p.name}</p>
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
                    <span className="font-extrabold text-navy-900">{o.id}</span>
                    <span className={`ml-2 px-2 py-0.5 rounded text-[10px] font-bold border ${STATUS_STYLE[o.status]}`}>{o.status}</span>
                    <p className="text-slate-500 mt-0.5">Vendor: {o.vendorName} · Total Amount: ₹{o.amount.toLocaleString()}</p>
                  </div>
                  <span className="text-slate-400 text-[11px]">{o.date}</span>
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
                  <div className="flex items-center gap-2">
                    <span className="bg-brand-50 text-brand-700 text-xs font-bold px-2.5 py-1 rounded-full border border-brand-200">
                      {c.gstRate}% GST
                    </span>
                    <button
                      onClick={() => setEditingCategory({ ...c })}
                      className="text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg px-2.5 py-1 cursor-pointer"
                    >
                      ✏️
                    </button>
                  </div>
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
                <div key={r.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-navy-900 text-sm">📍 {r.name}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">{r.state}</p>
                    <p className="text-xs font-bold text-brand-600 mt-1">Delivery: ₹{r.baseDeliveryCharge}</p>
                  </div>
                  <button
                    onClick={() => setEditingRegion({ ...r })}
                    className="text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg px-2.5 py-1.5 cursor-pointer"
                  >
                    ✏️ Edit
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

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
                <button type="submit" className="px-5 py-2 text-xs font-bold text-white bg-brand-500 rounded-xl hover:bg-brand-600 shadow-xs">Save DR Changes</button>
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
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button type="button" onClick={() => setEditingVendor(null)} className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 rounded-xl">Cancel</button>
                <button type="submit" className="px-5 py-2 text-xs font-bold text-white bg-brand-500 rounded-xl hover:bg-brand-600 shadow-xs">Save Vendor Changes</button>
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
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button type="button" onClick={() => setEditingProduct(null)} className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 rounded-xl">Cancel</button>
                <button type="submit" className="px-5 py-2 text-xs font-bold text-white bg-brand-500 rounded-xl hover:bg-brand-600 shadow-xs">Save Product Changes</button>
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
              <div>
                <label className="block text-xs font-bold text-navy-900 mb-1">GST Rate (%)</label>
                <input
                  type="number"
                  value={editingCategory.gstRate}
                  onChange={(e) => setEditingCategory({ ...editingCategory, gstRate: e.target.value })}
                  className="w-full bg-slate-50 text-xs border border-slate-200 rounded-xl px-3 py-2.5 outline-none font-bold"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button type="button" onClick={() => setEditingCategory(null)} className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 rounded-xl">Cancel</button>
                <button type="submit" className="px-5 py-2 text-xs font-bold text-white bg-brand-500 rounded-xl hover:bg-brand-600 shadow-xs">Save Category</button>
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
                <button type="submit" className="px-5 py-2 text-xs font-bold text-white bg-brand-500 rounded-xl hover:bg-brand-600 shadow-xs">Save District Region</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}