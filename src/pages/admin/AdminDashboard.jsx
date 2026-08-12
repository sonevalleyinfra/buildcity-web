import { useState } from "react";
import Logo from "../../components/Logo";
import { useAuth } from "../../context/AuthContext";
import { useAdmin } from "../../context/AdminContext";

const TABS = ["Overview", "Vendors", "Products", "Orders", "Categories", "Regions"];

const STATUS_STYLE = {
  APPROVED: "bg-green-50 text-success",
  PENDING: "bg-amber-50 text-warning",
  SUSPENDED: "bg-red-50 text-red-600",
  Delivered: "bg-green-50 text-success",
  Shipped: "bg-blue-50 text-brand-500",
  Pending: "bg-amber-50 text-warning",
  Cancelled: "bg-red-50 text-red-600",
};

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const {
    vendors,
    orders,
    categories,
    regions,
    products,
    stats,
    setVendorStatus,
    addCategory,
    toggleCategoryActive,
    addRegion,
    toggleRegionActive,
    addProduct,
    toggleProductActive,
  } = useAdmin();

  const [tab, setTab] = useState("Overview");
  const [showCatForm, setShowCatForm] = useState(false);
  const [showRegionForm, setShowRegionForm] = useState(false);
  const [showProductForm, setShowProductForm] = useState(false);
  const [catForm, setCatForm] = useState({ name: "", gstRate: 18 });
  const [regionForm, setRegionForm] = useState({ name: "", state: "Uttar Pradesh", baseDeliveryCharge: 49 });
  const [productForm, setProductForm] = useState({
    name: "",
    categoryId: "",
    vendorId: "",
    price: "",
    stockQty: "",
  });

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
      price: Number(productForm.price) || 0,
      stockQty: Number(productForm.stockQty) || 0,
    });
    setProductForm({ name: "", categoryId: "", vendorId: "", price: "", stockQty: "" });
    setShowProductForm(false);
  };

  return (
    <div className="min-h-screen bg-surface">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <Logo size="sm" />
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-green-50 text-success">
              Admin
            </span>
            <span className="text-sm text-slate-600 hidden sm:inline">{user?.name}</span>
            <button
              onClick={logout}
              className="text-sm font-medium text-red-500 hover:underline"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex gap-6 overflow-x-auto border-t border-slate-100">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`pb-2.5 pt-2.5 text-sm font-medium shrink-0 border-b-2 ${
                tab === t
                  ? "text-brand-500 border-brand-500"
                  : "text-slate-500 border-transparent"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        {/*OVERVIEW */}
        {tab === "Overview" && (
          <div>
            <h1 className="text-xl font-bold text-navy-900 mb-5">Platform Overview</h1>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-8">
              <StatCard label="Total Orders" value={stats.totalOrders} icon="📦" />
              <StatCard
                label="Total Revenue"
                value={`₹${stats.totalRevenue.toLocaleString("en-IN")}`}
                icon="💰"
              />
              <StatCard label="Approved Vendors" value={stats.approvedVendors} icon="✅" />
              <StatCard label="Pending Approval" value={stats.pendingVendors} icon="⏳" highlight />
              <StatCard label="Active Products" value={stats.activeProducts} icon="🏷️" />
            </div>

            <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-3">
              Recent Orders
            </h2>
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden mb-8">
              {orders.slice(0, 5).map((o, i) => (
                <div
                  key={o.id}
                  className={`flex items-center justify-between px-4 py-3 text-sm ${
                    i !== 0 ? "border-t border-slate-100" : ""
                  }`}
                >
                  <div>
                    <span className="font-medium text-navy-900">#{o.id}</span>
                    <span className="text-slate-400 ml-2">{o.customer}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-navy-900 font-semibold">
                      ₹{o.amount.toLocaleString("en-IN")}
                    </span>
                    <span
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLE[o.status]}`}
                    >
                      {o.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {stats.pendingVendors > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between">
                <p className="text-sm text-navy-900">
                  <strong>{stats.pendingVendors} vendor(s)</strong> waiting for approval.
                </p>
                <button
                  onClick={() => setTab("Vendors")}
                  className="text-sm font-semibold text-brand-500 hover:underline"
                >
                  Review now →
                </button>
              </div>
            )}
          </div>
        )}

        {/*  VENDORS  */}
        {tab === "Vendors" && (
          <div>
            <h1 className="text-xl font-bold text-navy-900 mb-5">Vendor Management</h1>
            <div className="space-y-3">
              {vendors.map((v) => (
                <div
                  key={v.id}
                  className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-navy-900">{v.shopName}</span>
                      <span
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLE[v.status]}`}
                      >
                        {v.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      {v.ownerName} · {v.phone} · Joined {v.joinedOn}
                    </p>
                    <p className="text-xs text-slate-500">
                      {v.productCount} products · {v.commissionRate}% commission
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {v.status !== "APPROVED" && (
                      <button
                        onClick={() => setVendorStatus(v.id, "APPROVED")}
                        className="text-xs font-semibold bg-success text-white rounded-lg px-3 py-2"
                      >
                        Approve
                      </button>
                    )}
                    {v.status !== "SUSPENDED" && (
                      <button
                        onClick={() => setVendorStatus(v.id, "SUSPENDED")}
                        className="text-xs font-semibold border border-red-300 text-red-600 rounded-lg px-3 py-2"
                      >
                        Suspend
                      </button>
                    )}
                    {v.status === "SUSPENDED" && (
                      <button
                        onClick={() => setVendorStatus(v.id, "APPROVED")}
                        className="text-xs font-semibold border border-brand-500 text-brand-500 rounded-lg px-3 py-2"
                      >
                        Reinstate
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PRODUCTS*/}
        {tab === "Products" && (
          <div>
            <div className="flex items-center justify-between mb-5">
              <h1 className="text-xl font-bold text-navy-900">Products</h1>
              <button
                onClick={() => setShowProductForm((v) => !v)}
                className="text-sm font-semibold bg-brand-500 text-white rounded-lg px-4 py-2"
              >
                {showProductForm ? "Cancel" : "+ Add Product"}
              </button>
            </div>

            {showProductForm && (
              <form
                onSubmit={handleAddProduct}
                className="bg-white rounded-xl border border-slate-200 p-4 mb-4 grid sm:grid-cols-2 gap-3"
              >
                <input
                  value={productForm.name}
                  onChange={(e) => setProductForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Product name"
                  className="sm:col-span-2 text-sm border border-slate-200 rounded-lg px-3 py-2.5 outline-none focus:border-brand-500"
                />
                <select
                  value={productForm.categoryId}
                  onChange={(e) => setProductForm((f) => ({ ...f, categoryId: e.target.value }))}
                  className="text-sm border border-slate-200 rounded-lg px-3 py-2.5 outline-none focus:border-brand-500 bg-white"
                >
                  <option value="">Select Category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <select
                  value={productForm.vendorId}
                  onChange={(e) => setProductForm((f) => ({ ...f, vendorId: e.target.value }))}
                  className="text-sm border border-slate-200 rounded-lg px-3 py-2.5 outline-none focus:border-brand-500 bg-white"
                >
                  <option value="">Select Vendor</option>
                  {vendors.map((v) => (
                    <option key={v.id} value={v.id}>{v.shopName}</option>
                  ))}
                </select>
                <input
                  type="number"
                  value={productForm.price}
                  onChange={(e) => setProductForm((f) => ({ ...f, price: e.target.value }))}
                  placeholder="Price ₹"
                  className="text-sm border border-slate-200 rounded-lg px-3 py-2.5 outline-none focus:border-brand-500"
                />
                <input
                  type="number"
                  value={productForm.stockQty}
                  onChange={(e) => setProductForm((f) => ({ ...f, stockQty: e.target.value }))}
                  placeholder="Stock Qty"
                  className="text-sm border border-slate-200 rounded-lg px-3 py-2.5 outline-none focus:border-brand-500"
                />
                <button
                  type="submit"
                  className="sm:col-span-2 text-sm font-semibold bg-brand-500 text-white rounded-lg py-2.5"
                >
                  Add Product
                </button>
              </form>
            )}

            <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
              {products.map((p) => {
                const cat = categories.find((c) => c.id === p.categoryId);
                const vendor = vendors.find((v) => v.id === p.vendorId);
                return (
                  <div key={p.id} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <span className="text-sm font-medium text-navy-900">{p.name}</span>
                      <span className="text-xs text-slate-400 ml-2">
                        {cat?.name || "—"} · {vendor?.shopName || "—"} · ₹{p.price} · Stock {p.stockQty}
                      </span>
                    </div>
                    <button
                      onClick={() => toggleProductActive(p.id)}
                      className={`text-xs font-semibold px-3 py-1.5 rounded-lg shrink-0 ${
                        p.isActive
                          ? "border border-slate-200 text-slate-600"
                          : "bg-red-50 text-red-600"
                      }`}
                    >
                      {p.isActive ? "Active" : "Disabled"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ORDERS  */}
        {tab === "Orders" && (
          <div>
            <h1 className="text-xl font-bold text-navy-900 mb-5">All Orders</h1>
            <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500 border-b border-slate-100">
                    <th className="px-4 py-3 font-medium">Order ID</th>
                    <th className="px-4 py-3 font-medium">Customer</th>
                    <th className="px-4 py-3 font-medium">Vendor</th>
                    <th className="px-4 py-3 font-medium">Amount</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
                    <tr key={o.id} className="border-b border-slate-50 last:border-0">
                      <td className="px-4 py-3 font-medium text-navy-900">#{o.id}</td>
                      <td className="px-4 py-3 text-slate-600">{o.customer}</td>
                      <td className="px-4 py-3 text-slate-600">{o.vendor}</td>
                      <td className="px-4 py-3 font-semibold text-navy-900">
                        ₹{o.amount.toLocaleString("en-IN")}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLE[o.status]}`}
                        >
                          {o.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500">{o.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/*CATEGORIES */}
        {tab === "Categories" && (
          <div>
            <div className="flex items-center justify-between mb-5">
              <h1 className="text-xl font-bold text-navy-900">Categories</h1>
              <button
                onClick={() => setShowCatForm((v) => !v)}
                className="text-sm font-semibold bg-brand-500 text-white rounded-lg px-4 py-2"
              >
                {showCatForm ? "Cancel" : "+ Add Category"}
              </button>
            </div>

            {showCatForm && (
              <form
                onSubmit={handleAddCategory}
                className="bg-white rounded-xl border border-slate-200 p-4 mb-4 flex flex-col sm:flex-row gap-3"
              >
                <input
                  value={catForm.name}
                  onChange={(e) => setCatForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Category name"
                  className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-2.5 outline-none focus:border-brand-500"
                />
                <input
                  type="number"
                  value={catForm.gstRate}
                  onChange={(e) => setCatForm((f) => ({ ...f, gstRate: e.target.value }))}
                  placeholder="GST %"
                  className="w-full sm:w-28 text-sm border border-slate-200 rounded-lg px-3 py-2.5 outline-none focus:border-brand-500"
                />
                <button
                  type="submit"
                  className="text-sm font-semibold bg-brand-500 text-white rounded-lg px-4 py-2.5"
                >
                  Add
                </button>
              </form>
            )}

            <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
              {categories.map((c) => (
                <div key={c.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <span className="text-sm font-medium text-navy-900">{c.name}</span>
                    <span className="text-xs text-slate-400 ml-2">
                      GST {c.gstRate}% · {c.productCount} products
                    </span>
                  </div>
                  <button
                    onClick={() => toggleCategoryActive(c.id)}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-lg ${
                      c.isActive
                        ? "border border-slate-200 text-slate-600"
                        : "bg-red-50 text-red-600"
                    }`}
                  >
                    {c.isActive ? "Active" : "Disabled"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* REGIONS*/}
        {tab === "Regions" && (
          <div>
            <div className="flex items-center justify-between mb-5">
              <h1 className="text-xl font-bold text-navy-900">Delivery Regions</h1>
              <button
                onClick={() => setShowRegionForm((v) => !v)}
                className="text-sm font-semibold bg-brand-500 text-white rounded-lg px-4 py-2"
              >
                {showRegionForm ? "Cancel" : "+ Add Region"}
              </button>
            </div>

            {showRegionForm && (
              <form
                onSubmit={handleAddRegion}
                className="bg-white rounded-xl border border-slate-200 p-4 mb-4 flex flex-col sm:flex-row gap-3"
              >
                <input
                  value={regionForm.name}
                  onChange={(e) => setRegionForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Region name"
                  className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-2.5 outline-none focus:border-brand-500"
                />
                <input
                  value={regionForm.state}
                  onChange={(e) => setRegionForm((f) => ({ ...f, state: e.target.value }))}
                  placeholder="State"
                  className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-2.5 outline-none focus:border-brand-500"
                />
                <input
                  type="number"
                  value={regionForm.baseDeliveryCharge}
                  onChange={(e) =>
                    setRegionForm((f) => ({ ...f, baseDeliveryCharge: e.target.value }))
                  }
                  placeholder="Delivery ₹"
                  className="w-full sm:w-32 text-sm border border-slate-200 rounded-lg px-3 py-2.5 outline-none focus:border-brand-500"
                />
                <button
                  type="submit"
                  className="text-sm font-semibold bg-brand-500 text-white rounded-lg px-4 py-2.5"
                >
                  Add
                </button>
              </form>
            )}

            <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
              {regions.map((r) => (
                <div key={r.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <span className="text-sm font-medium text-navy-900">{r.name}</span>
                    <span className="text-xs text-slate-400 ml-2">
                      {r.state} · Base delivery ₹{r.baseDeliveryCharge}
                    </span>
                  </div>
                  <button
                    onClick={() => toggleRegionActive(r.id)}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-lg ${
                      r.isActive
                        ? "border border-slate-200 text-slate-600"
                        : "bg-red-50 text-red-600"
                    }`}
                  >
                    {r.isActive ? "Active" : "Disabled"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function StatCard({ label, value, icon, highlight }) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        highlight ? "bg-amber-50 border-amber-200" : "bg-white border-slate-200"
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-lg">{icon}</span>
      </div>
      <div className="text-xl font-bold text-navy-900">{value}</div>
      <div className="text-xs text-slate-500 mt-0.5">{label}</div>
    </div>
  );
}