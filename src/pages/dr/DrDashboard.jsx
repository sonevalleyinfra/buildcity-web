import { useState } from "react";
import Logo from "../../components/Logo";
import { useAuth } from "../../context/AuthContext";
import { useAdmin } from "../../context/AdminContext";

const PRESET_IMAGES = [
  { label: "Cement Bag", url: "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=400&q=80" },
  { label: "Paint Bucket", url: "https://images.unsplash.com/photo-1562259949-e8e7689d7828?auto=format&fit=crop&w=400&q=80" },
  { label: "Steel Rebars", url: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=400&q=80" },
  { label: "Pipes & Plumbing", url: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=400&q=80" },
  { label: "Electrical / Wire", url: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=400&q=80" },
];

export default function DrDashboard() {
  const { user, logout } = useAuth();
  const { masterProducts = [], vendors, products, categories, regions, addVendor, addMasterProduct, addProduct, setVendorStatus } = useAdmin();

  const [activeTab, setActiveTab] = useState("products"); // "products" | "vendors"
  const [searchTerm, setSearchTerm] = useState("");

  // Modals
  const [showVendorModal, setShowVendorModal] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);

  // Forms
  const [vendorForm, setVendorForm] = useState({
    shopName: "",
    ownerName: "",
    phone: "",
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

  // DR Assigned Region info
  const drInfo = user?.drInfo || {};
  const districtName = drInfo.regionName || "Varanasi";
  const drRegionId = drInfo.regionId || "r1";

  // Filter vendors & products for this DR's district
  const districtVendors = vendors.filter(
    (v) => v.regionId === drRegionId || v.regionName?.toLowerCase() === districtName.toLowerCase()
  );

  const districtProducts = products.filter((p) => {
    const belongsToDistrictVendor = districtVendors.some((v) => v.id === p.vendorId);
    return belongsToDistrictVendor || p.addedBy?.includes(user?.name);
  });

  // Filtered by search
  const filteredVendors = districtVendors.filter(
    (v) =>
      v.shopName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.ownerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.phone.includes(searchTerm)
  );

  const filteredProducts = districtProducts.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.categoryName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.vendorName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateVendor = (e) => {
    e.preventDefault();
    if (!vendorForm.shopName.trim() || !vendorForm.ownerName.trim() || !vendorForm.phone.trim()) {
      alert("Please fill all required vendor details!");
      return;
    }

    addVendor({
      shopName: vendorForm.shopName.trim(),
      ownerName: vendorForm.ownerName.trim(),
      phone: vendorForm.phone.trim(),
      regionId: drRegionId,
      regionName: districtName,
      status: vendorForm.status || "APPROVED",
      commissionRate: Number(vendorForm.commissionRate) || 10,
      addedByDr: `${user?.name || "DR"} (${districtName})`,
      drId: drInfo.id,
    });

    setVendorForm({ shopName: "", ownerName: "", phone: "", status: "APPROVED", commissionRate: 10 });
    setShowVendorModal(false);
    alert("Vendor added successfully!");
  };

  const handleCreateProduct = (e) => {
    e.preventDefault();
    if (!productForm.name.trim() || !productForm.categoryId) {
      alert("Please select Category and enter Product Name!");
      return;
    }

    addMasterProduct({
      name: productForm.name.trim(),
      categoryId: productForm.categoryId,
      brand: productForm.brand.trim() || "Generic",
      type: productForm.type.trim() || "Standard",
      grade: productForm.grade.trim() || "Standard Grade",
      unit: productForm.unit.trim() || "Piece",
      price: Number(productForm.price) || 100,
      stockQty: Number(productForm.stockQty) || 100,
      vendorId: productForm.vendorId || null,
      imageUrl: productForm.imageUrl || PRESET_IMAGES[0].url,
      addedBy: `DR: ${user?.name || "DR"} (${districtName})`,
      drId: drInfo.id,
    });

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
    alert("Product added successfully!");
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
        <div className="bg-linear-to-r from-navy-900 to-navy-800 rounded-2xl p-6 text-white shadow-md mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-brand-300">
                District Representative Dashboard
              </span>
              <h1 className="text-2xl font-extrabold mt-1">{districtName} District Portal</h1>
              <p className="text-xs text-slate-300 mt-1">
                Manage vendors, add construction products, category, brands, grade & images for {districtName}.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowVendorModal(true)}
                className="bg-white text-navy-900 font-semibold text-xs px-4 py-2.5 rounded-xl hover:bg-slate-100 transition-colors flex items-center gap-2 shadow-xs cursor-pointer"
              >
                <span>➕</span> Add New Vendor
              </button>
              <button
                onClick={() => setShowProductModal(true)}
                className="bg-brand-500 text-white font-semibold text-xs px-4 py-2.5 rounded-xl hover:bg-brand-600 transition-colors flex items-center gap-2 shadow-xs cursor-pointer"
              >
                <span>📦</span> Add New Product
              </button>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-5 border-t border-slate-700/60">
            <div className="bg-white/10 rounded-xl p-3.5 backdrop-blur-xs">
              <p className="text-xs text-slate-300 font-medium">Assigned District</p>
              <p className="text-lg font-bold mt-0.5">{districtName}</p>
            </div>
            <div className="bg-white/10 rounded-xl p-3.5 backdrop-blur-xs">
              <p className="text-xs text-slate-300 font-medium">Active Vendors</p>
              <p className="text-lg font-bold mt-0.5">{districtVendors.length}</p>
            </div>
            <div className="bg-white/10 rounded-xl p-3.5 backdrop-blur-xs">
              <p className="text-xs text-slate-300 font-medium">Total Products</p>
              <p className="text-lg font-bold mt-0.5">{districtProducts.length}</p>
            </div>
            <div className="bg-white/10 rounded-xl p-3.5 backdrop-blur-xs">
              <p className="text-xs text-slate-300 font-medium">Assigned Mobile</p>
              <p className="text-lg font-bold mt-0.5">{user?.phone}</p>
            </div>
          </div>
        </div>

        {/* Navigation Tabs & Search */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-2 bg-white p-1.5 rounded-xl border border-slate-200 shadow-xs">
            <button
              onClick={() => setActiveTab("products")}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                activeTab === "products"
                  ? "bg-brand-500 text-white shadow-xs"
                  : "text-slate-600 hover:text-navy-900"
              }`}
            >
              📦 Products ({districtProducts.length})
            </button>
            <button
              onClick={() => setActiveTab("vendors")}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                activeTab === "vendors"
                  ? "bg-brand-500 text-white shadow-xs"
                  : "text-slate-600 hover:text-navy-900"
              }`}
            >
              🏬 Vendors ({districtVendors.length})
            </button>
          </div>

          <div className="relative w-full sm:w-72">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={`Search ${activeTab}...`}
              className="w-full bg-white text-xs border border-slate-200 rounded-xl px-3.5 py-2.5 pl-9 outline-none focus:border-brand-500 shadow-xs"
            />
            <span className="absolute left-3 top-2.5 text-slate-400 text-xs">🔍</span>
          </div>
        </div>

        {/* Tab 1: Products Section */}
        {activeTab === "products" && (
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
              <h2 className="text-sm font-bold text-navy-900">
                Products in {districtName}
              </h2>
              <button
                onClick={() => setShowProductModal(true)}
                className="text-xs bg-brand-500 hover:bg-brand-600 text-white font-semibold px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
              >
                + Add Product
              </button>
            </div>

            {filteredProducts.length === 0 ? (
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
                              <p className="font-bold text-navy-900">{p.name}</p>
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
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Vendors Section */}
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
            )}
          </div>
        )}
      </main>

      {/* Modal 1: Add Vendor Modal */}
      {showVendorModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
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
                  Vendor Initial Status
                </label>
                <select
                  value={vendorForm.status}
                  onChange={(e) => setVendorForm({ ...vendorForm, status: e.target.value })}
                  className="w-full bg-slate-50 text-xs border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-brand-500 font-semibold text-navy-900"
                >
                  <option value="APPROVED">✅ APPROVED (Can Login via Mobile OTP immediately)</option>
                  <option value="PENDING">⏳ PENDING (Awaiting verification/approval)</option>
                </select>
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
                  className="px-5 py-2 text-xs font-semibold text-white bg-brand-500 rounded-xl hover:bg-brand-600 shadow-xs"
                >
                  Save Vendor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Add Product Modal */}
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-navy-900 mb-1">
                    Select Vendor *
                  </label>
                  <select
                    required
                    value={productForm.vendorId}
                    onChange={(e) => setProductForm({ ...productForm, vendorId: e.target.value })}
                    className="w-full bg-slate-50 text-xs border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-brand-500"
                  >
                    <option value="">-- Choose Vendor --</option>
                    {districtVendors.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.shopName} ({v.ownerName})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-navy-900 mb-1">
                    Category *
                  </label>
                  <select
                    required
                    value={productForm.categoryId}
                    onChange={(e) => setProductForm({ ...productForm, categoryId: e.target.value })}
                    className="w-full bg-slate-50 text-xs border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-brand-500"
                  >
                    <option value="">-- Choose Category --</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
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
                  Product Image URL or Select Preset
                </label>
                <div className="flex gap-2 mb-2 overflow-x-auto pb-1">
                  {PRESET_IMAGES.map((img, i) => (
                    <button
                      type="button"
                      key={i}
                      onClick={() => setProductForm({ ...productForm, imageUrl: img.url })}
                      className={`text-[11px] px-2.5 py-1 rounded-lg border shrink-0 transition-colors ${
                        productForm.imageUrl === img.url
                          ? "bg-brand-50 border-brand-500 text-brand-600 font-bold"
                          : "border-slate-200 text-slate-600 bg-white"
                      }`}
                    >
                      📷 {img.label}
                    </button>
                  ))}
                </div>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/..."
                  value={productForm.imageUrl}
                  onChange={(e) => setProductForm({ ...productForm, imageUrl: e.target.value })}
                  className="w-full bg-slate-50 text-xs border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-brand-500"
                />
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
                  className="px-5 py-2 text-xs font-semibold text-white bg-brand-500 rounded-xl hover:bg-brand-600 shadow-xs"
                >
                  Save Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
