import { CloseIcon } from "../../vendor/ui/icons";
import { Spinner } from "../../vendor/ui/primitives";

export default function DrModals({
  districtName,
  categories,
  presetImages,
  showVendorModal,
  setShowVendorModal,
  vendorForm,
  setVendorForm,
  isSubmittingVendor,
  handleCreateVendor,
  showProductModal,
  setShowProductModal,
  productForm,
  setProductForm,
  isSubmittingProduct,
  handleCreateProduct,
  editingVendor,
  setEditingVendor,
  isSubmittingEditVendor,
  handleUpdateVendorSubmit,
  editingProduct,
  setEditingProduct,
  editingImages,
  handleEditImageSlotChange,
  setEditImageSlotCount,
  onSaveEditedMasterProduct,
}) {
  return (
    <>
      {/* 1. Add Vendor Sheet / Modal */}
      {showVendorModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
          <div
            onClick={() => setShowVendorModal(false)}
            className="vd-scrim fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
          />
          <div className="vd-sheet relative z-10 w-full max-w-md rounded-t-3xl sm:rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-2xl max-h-[92dvh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div>
                <h3 className="text-base font-semibold text-slate-900">
                  Add Vendor to {districtName}
                </h3>
                <p className="text-xs text-slate-500">
                  Register a new supplier or trader in your jurisdiction
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowVendorModal(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
              >
                <CloseIcon className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateVendor} className="space-y-3.5">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Shop / Business Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Shree Cement & Steel Traders"
                  value={vendorForm.shopName}
                  onChange={(e) => setVendorForm({ ...vendorForm, shopName: e.target.value })}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-900 outline-none focus:border-brand-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Owner Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Kumar"
                  value={vendorForm.ownerName}
                  onChange={(e) => setVendorForm({ ...vendorForm, ownerName: e.target.value })}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-900 outline-none focus:border-brand-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
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
                  className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-medium tabular-nums text-slate-900 outline-none focus:border-brand-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Assigned District / Region
                </label>
                <input
                  type="text"
                  disabled
                  value={districtName}
                  className="h-10 w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-100 px-3 text-xs font-medium text-slate-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Set Vendor Login Password *
                </label>
                <input
                  type="password"
                  autoComplete="new-password"
                  placeholder="Password (min 8 characters)"
                  value={vendorForm.password}
                  onChange={(e) => setVendorForm({ ...vendorForm, password: e.target.value })}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 font-mono text-xs text-slate-900 outline-none focus:border-brand-500 focus:bg-white"
                />
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-3.5">
                <button
                  type="button"
                  onClick={() => setShowVendorModal(false)}
                  className="h-10 rounded-xl bg-slate-100 px-4 text-xs font-semibold text-slate-600 hover:bg-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingVendor}
                  className="inline-flex h-10 items-center gap-2 rounded-xl bg-brand-600 px-5 text-xs font-semibold text-white shadow-xs hover:bg-brand-700 cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingVendor ? (
                    <>
                      <Spinner className="h-3.5 w-3.5" />
                      <span>Saving Vendor...</span>
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

      {/* 2. Add Product Sheet / Modal */}
      {showProductModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
          <div
            onClick={() => setShowProductModal(false)}
            className="vd-scrim fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
          />
          <div className="vd-sheet relative z-10 w-full max-w-xl rounded-t-3xl sm:rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-2xl max-h-[92dvh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div>
                <h3 className="text-base font-semibold text-slate-900">
                  Add New Product ({districtName})
                </h3>
                <p className="text-xs text-slate-500">
                  Add a construction product to Master Catalog & {districtName} listings
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowProductModal(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
              >
                <CloseIcon className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="space-y-3.5">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Product Category *
                </label>
                <select
                  required
                  value={productForm.categoryId}
                  onChange={(e) => setProductForm({ ...productForm, categoryId: e.target.value })}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-900 outline-none focus:border-brand-500"
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
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Product Name / Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. UltraTech Super PPC Cement"
                  value={productForm.name}
                  onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-900 outline-none focus:border-brand-500 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Brand Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. UltraTech, Tata"
                    value={productForm.brand}
                    onChange={(e) => setProductForm({ ...productForm, brand: e.target.value })}
                    className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-900 outline-none focus:border-brand-500 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Product Type
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. PPC Cement, TMT"
                    value={productForm.type}
                    onChange={(e) => setProductForm({ ...productForm, type: e.target.value })}
                    className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-900 outline-none focus:border-brand-500 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Grade / Spec
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. OPC 53, Fe 550D"
                    value={productForm.grade}
                    onChange={(e) => setProductForm({ ...productForm, grade: e.target.value })}
                    className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-900 outline-none focus:border-brand-500 focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Unit Packaging
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 50kg Bag, Ton"
                    value={productForm.unit}
                    onChange={(e) => setProductForm({ ...productForm, unit: e.target.value })}
                    className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-900 outline-none focus:border-brand-500 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Price (INR) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="390"
                    value={productForm.price}
                    onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                    className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-medium tabular-nums text-slate-900 outline-none focus:border-brand-500 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Stock Quantity
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="100"
                    value={productForm.stockQty}
                    onChange={(e) => setProductForm({ ...productForm, stockQty: e.target.value })}
                    className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-medium tabular-nums text-slate-900 outline-none focus:border-brand-500 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Product Images (Add 1 to 3 Images)
                </label>
                <div className="mb-2 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                  {presetImages.map((img, i) => (
                    <button
                      type="button"
                      key={i}
                      onClick={() => {
                        const currentList = (productForm.imageUrl || "")
                          .split(",")
                          .map((s) => s.trim())
                          .filter(Boolean);
                        if (!currentList.includes(img.url)) {
                          const newList = [...currentList, img.url].slice(0, 3);
                          setProductForm({ ...productForm, imageUrl: newList.join(", ") });
                        }
                      }}
                      className="shrink-0 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:border-brand-300 hover:bg-brand-50 cursor-pointer"
                    >
                      + {img.label}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {[0, 1, 2].map((idx) => (
                    <input
                      key={idx}
                      type="url"
                      placeholder={idx === 0 ? "Main Image 1 URL *" : `Image ${idx + 1} URL (Optional)`}
                      value={(productForm.imageUrl || "").split(",")[idx]?.trim() || ""}
                      onChange={(e) => {
                        const parts = (productForm.imageUrl || "").split(",").map((s) => s.trim());
                        parts[idx] = e.target.value;
                        setProductForm({ ...productForm, imageUrl: parts.filter(Boolean).join(", ") });
                      }}
                      className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 font-mono text-[11px] text-slate-900 outline-none focus:border-brand-500 focus:bg-white"
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Product Description (Optional)
                </label>
                <textarea
                  rows={3}
                  placeholder="Enter product specifications, material grade, usage guidelines..."
                  value={productForm.description || ""}
                  onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                  className="w-full resize-y rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-900 outline-none focus:border-brand-500 focus:bg-white"
                />
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-3.5">
                <button
                  type="button"
                  onClick={() => setShowProductModal(false)}
                  className="h-10 rounded-xl bg-slate-100 px-4 text-xs font-semibold text-slate-600 hover:bg-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingProduct}
                  className="inline-flex h-10 items-center gap-2 rounded-xl bg-brand-600 px-5 text-xs font-semibold text-white shadow-xs hover:bg-brand-700 cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingProduct ? (
                    <>
                      <Spinner className="h-3.5 w-3.5" />
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

      {/* 3. Edit Vendor Sheet / Modal */}
      {editingVendor && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
          <div
            onClick={() => setEditingVendor(null)}
            className="vd-scrim fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
          />
          <div className="vd-sheet relative z-10 w-full max-w-md rounded-t-3xl sm:rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-base font-semibold text-slate-900">
                Edit District Vendor Details
              </h3>
              <button
                type="button"
                onClick={() => setEditingVendor(null)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
              >
                <CloseIcon className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleUpdateVendorSubmit} className="space-y-3.5">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Shop / Business Name *
                </label>
                <input
                  type="text"
                  required
                  value={editingVendor.shopName}
                  onChange={(e) => setEditingVendor({ ...editingVendor, shopName: e.target.value })}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-900 outline-none focus:border-brand-500 focus:bg-white"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Owner Name *
                </label>
                <input
                  type="text"
                  required
                  value={editingVendor.ownerName}
                  onChange={(e) => setEditingVendor({ ...editingVendor, ownerName: e.target.value })}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-900 outline-none focus:border-brand-500 focus:bg-white"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Mobile Number *
                </label>
                <input
                  type="tel"
                  required
                  maxLength={10}
                  value={editingVendor.phone}
                  onChange={(e) =>
                    setEditingVendor({ ...editingVendor, phone: e.target.value.replace(/\D/g, "") })
                  }
                  className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold tabular-nums text-slate-900 outline-none focus:border-brand-500 focus:bg-white"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Vendor Login Password
                </label>
                <input
                  type="password"
                  autoComplete="new-password"
                  placeholder="New password (min 8 characters)"
                  value={editingVendor.password || ""}
                  onChange={(e) => setEditingVendor({ ...editingVendor, password: e.target.value })}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 font-mono text-xs font-semibold text-slate-900 outline-none focus:border-brand-500 focus:bg-white"
                />
              </div>
              <div className="flex justify-end gap-2 border-t border-slate-100 pt-3.5">
                <button
                  type="button"
                  onClick={() => setEditingVendor(null)}
                  className="h-10 rounded-xl bg-slate-100 px-4 text-xs font-semibold text-slate-600 hover:bg-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEditVendor}
                  className="inline-flex h-10 items-center gap-2 rounded-xl bg-brand-600 px-5 text-xs font-semibold text-white shadow-xs hover:bg-brand-700 cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingEditVendor ? (
                    <>
                      <Spinner className="h-3.5 w-3.5" />
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

      {/* 4. Edit Master Product Sheet / Modal */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
          <div
            onClick={() => setEditingProduct(null)}
            className="vd-scrim fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
          />
          <div className="vd-sheet relative z-10 w-full max-w-xl rounded-t-3xl sm:rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-2xl max-h-[92dvh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-base font-semibold text-slate-900">Edit Master Product</h3>
              <button
                type="button"
                onClick={() => setEditingProduct(null)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
              >
                <CloseIcon className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={onSaveEditedMasterProduct} className="space-y-3.5">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Product Title *
                </label>
                <input
                  type="text"
                  required
                  value={editingProduct.name}
                  onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-900 outline-none focus:border-brand-500 focus:bg-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">Brand</label>
                  <input
                    type="text"
                    value={editingProduct.brand}
                    onChange={(e) => setEditingProduct({ ...editingProduct, brand: e.target.value })}
                    className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-900 outline-none focus:border-brand-500 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Grade / Spec
                  </label>
                  <input
                    type="text"
                    value={editingProduct.grade}
                    onChange={(e) => setEditingProduct({ ...editingProduct, grade: e.target.value })}
                    className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-900 outline-none focus:border-brand-500 focus:bg-white"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Suggested Price (INR) *
                  </label>
                  <input
                    type="number"
                    required
                    value={editingProduct.suggestedPrice || editingProduct.price}
                    onChange={(e) =>
                      setEditingProduct({
                        ...editingProduct,
                        suggestedPrice: e.target.value,
                      })
                    }
                    className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold tabular-nums text-slate-900 outline-none focus:border-brand-500 focus:bg-white"
                  />
                  <p className="mt-0.5 text-[10px] text-slate-400">Reference price for vendors adding this product</p>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Unit Packaging
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 50kg Bag, Box, 20L"
                    value={editingProduct.unit !== undefined ? editingProduct.unit : ""}
                    onChange={(e) => setEditingProduct({ ...editingProduct, unit: e.target.value })}
                    className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-900 outline-none focus:border-brand-500 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Product Images (1 to 6 Images)
                  </label>
                  <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                    {editingImages.filter(Boolean).length} / {editingImages.length} Slots Filled
                  </span>
                </div>
                <div className="mb-2 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                  {presetImages.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        const emptyIdx = editingImages.findIndex((s) => !s.trim());
                        if (emptyIdx !== -1) {
                          handleEditImageSlotChange(emptyIdx, preset.url);
                        } else if (editingImages.length < 6) {
                          const nextIdx = editingImages.length;
                          if (typeof setEditImageSlotCount === "function") {
                            setEditImageSlotCount(nextIdx + 1);
                          }
                          handleEditImageSlotChange(nextIdx, preset.url);
                        } else {
                          handleEditImageSlotChange(0, preset.url);
                        }
                      }}
                      className="shrink-0 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-semibold text-slate-700 hover:border-brand-300 hover:bg-brand-50 cursor-pointer"
                    >
                      + {preset.label}
                    </button>
                  ))}
                </div>

                <div className="space-y-2">
                  {editingImages.map((slotValue, slotIdx) => {
                    const isRequired = slotIdx === 0;
                    const placeholder =
                      slotIdx === 0 ? "Main Image 1 URL *" : `Image ${slotIdx + 1} URL (Optional)`;

                    return (
                      <div
                        key={slotIdx}
                        className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50 p-2"
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-white">
                          {slotValue && slotValue.trim() ? (
                            <img
                              src={slotValue}
                              alt={`Slot ${slotIdx + 1}`}
                              className="h-full w-full object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = "none";
                              }}
                            />
                          ) : (
                            <span className="text-[10px] font-bold text-slate-400">#{slotIdx + 1}</span>
                          )}
                        </div>

                        <div className="flex-1">
                          <input
                            type="url"
                            placeholder={placeholder}
                            required={isRequired}
                            value={slotValue}
                            onChange={(e) => handleEditImageSlotChange(slotIdx, e.target.value)}
                            className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2.5 font-mono text-[11px] text-slate-900 outline-none focus:border-brand-500"
                          />
                        </div>

                        {slotValue ? (
                          <button
                            type="button"
                            onClick={() => handleEditImageSlotChange(slotIdx, "")}
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 cursor-pointer"
                            title="Clear image"
                          >
                            <CloseIcon className="h-3.5 w-3.5" />
                          </button>
                        ) : null}
                      </div>
                    );
                  })}
                </div>

                {editingImages.length < 6 && (
                  <button
                    type="button"
                    onClick={() => {
                      if (typeof setEditImageSlotCount === "function") {
                        setEditImageSlotCount((c) => Math.min(6, Math.max(editingImages.length + 1, c + 1)));
                      }
                    }}
                    className="mt-2.5 w-full py-2 px-3 border border-dashed border-brand-300 hover:border-brand-500 bg-brand-50/50 hover:bg-brand-50 text-brand-700 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.99]"
                  >
                    <span>+ Add More Image ({editingImages.length}/6)</span>
                  </button>
                )}
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Product Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Enter detailed product description, specifications, usage guidelines..."
                  value={editingProduct.description || ""}
                  onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                  className="w-full resize-y rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-900 outline-none focus:border-brand-500 focus:bg-white"
                />
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-3.5">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="h-10 rounded-xl bg-slate-100 px-4 text-xs font-semibold text-slate-600 hover:bg-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="h-10 rounded-xl bg-brand-600 px-5 text-xs font-semibold text-white shadow-xs hover:bg-brand-700 cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
