import { CloseIcon } from "../../vendor/ui/icons";
import { Spinner } from "../../vendor/ui/primitives";

export default function DrModals({
  districtName,
  categories,
  masterProducts,
  districtVendors,
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
  handleCreateListing,
  editingVendor,
  setEditingVendor,
  isSubmittingEditVendor,
  handleUpdateVendorSubmit,
}) {
  const masterProductGroups = (categories || [])
    .map((c) => ({
      id: c.id,
      name: c.name,
      items: (masterProducts || []).filter((p) => String(p.categoryId) === String(c.id)),
    }))
    .filter((g) => g.items.length > 0);
  const groupedIds = new Set(masterProductGroups.flatMap((g) => g.items.map((p) => String(p.id))));
  const ungroupedMasterProducts = (masterProducts || []).filter((p) => !groupedIds.has(String(p.id)));
  const canSubmitListing = (masterProducts || []).length > 0 && (districtVendors || []).length > 0;
  const masterProductLabel = (p) => [p.name, p.brand, p.unit].filter(Boolean).join(" · ");

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
                  type="text"
                  placeholder="Password (default: vendor123)"
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

      {/* 2. Add Listing Sheet / Modal */}
      {showProductModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
          <div
            onClick={() => setShowProductModal(false)}
            className="vd-scrim fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
          />
          <div className="vd-sheet relative z-10 w-full max-w-md rounded-t-3xl sm:rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-2xl max-h-[92dvh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-base font-semibold text-slate-900">Add Listing ({districtName})</h3>
              <button
                type="button"
                onClick={() => setShowProductModal(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
              >
                <CloseIcon className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateListing} className="space-y-3.5">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Master Product *
                </label>
                <select
                  required
                  value={productForm.masterProductId}
                  onChange={(e) => setProductForm({ ...productForm, masterProductId: e.target.value })}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-900 outline-none focus:border-brand-500"
                >
                  <option value="">-- Choose Product --</option>
                  {masterProductGroups.map((g) => (
                    <optgroup key={g.id} label={g.name}>
                      {g.items.map((p) => (
                        <option key={p.id} value={p.id}>
                          {masterProductLabel(p)}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                  {ungroupedMasterProducts.length > 0 && (
                    <optgroup label="Other">
                      {ungroupedMasterProducts.map((p) => (
                        <option key={p.id} value={p.id}>
                          {masterProductLabel(p)}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Vendor *
                </label>
                <select
                  required
                  value={productForm.vendorId}
                  onChange={(e) => setProductForm({ ...productForm, vendorId: e.target.value })}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-900 outline-none focus:border-brand-500"
                >
                  {(districtVendors || []).length === 0 && <option value="">No vendors in {districtName}</option>}
                  {(districtVendors || []).map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.shopName || v.name || v.id}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
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
                  disabled={isSubmittingProduct || !canSubmitListing}
                  className="inline-flex h-10 items-center gap-2 rounded-xl bg-brand-600 px-5 text-xs font-semibold text-white shadow-xs hover:bg-brand-700 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmittingProduct ? (
                    <>
                      <Spinner className="h-3.5 w-3.5" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    "Add Listing"
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
                  type="text"
                  placeholder="Set / Change Login Password"
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
    </>
  );
}
