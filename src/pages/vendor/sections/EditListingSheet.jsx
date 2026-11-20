import { useMemo, useState } from "react";
import { ProductThumb } from "./ProductsTab";
import { Sheet, Field, Button, ApprovalBadge, Spinner } from "../ui/primitives";
import { inr } from "../ui/format";
import { getDefaultPacksForProduct, STEEL_DIAMETERS, getDiameterPrice } from "../../../utils/productPacks";
import { getCategorySpec } from "../../../utils/categoryAttributes";

export default function EditListingSheet(props) {
  if (!props.product) return null;
  return <EditListingSheetInner {...props} />;
}

function EditListingSheetInner({
  product,
  image,
  onClose,
  onSubmit,
  onMrpChange,
  onDiscountChange,
  onPriceChange,
  onStockChange,
  onCustomPacksChange,
  onBulkChange,
  onMmPricingChange,
  onMmRateChange,
  onAddCustomPack,
  onRemoveCustomPack,
  onPackFieldChange,
  isSaving,
}) {
  const price = Number(product.price || 0);
  const mrp = Number(product.mrp || 0);
  const discount = Number(product.discountPct || 0);

  // Check if product is Steel / TMT Rebar / Sariya
  const isSteelProduct = useMemo(() => {
    const cat = String(product.categoryName || product.category || "").toLowerCase();
    const name = String(product.name || "").toLowerCase();
    return (
      cat.includes("steel") ||
      cat.includes("rebar") ||
      cat.includes("tmt") ||
      cat.includes("sariya") ||
      name.includes("steel") ||
      name.includes("tiscon") ||
      name.includes("tmt") ||
      name.includes("rebar") ||
      name.includes("saria") ||
      name.includes("sariya")
    );
  }, [product]);

  // MM-wise pricing toggle state
  const [mmPricingEnabled, setMmPricingEnabled] = useState(() => {
    if (product.mmPricingEnabled !== undefined) return Boolean(product.mmPricingEnabled);
    if (product.diameterPricingEnabled !== undefined) return Boolean(product.diameterPricingEnabled);
    if (product.customPacks && typeof product.customPacks === "object" && !Array.isArray(product.customPacks)) {
      if (product.customPacks.mmPricingEnabled !== undefined) return Boolean(product.customPacks.mmPricingEnabled);
    }
    try {
      const stored = JSON.parse(localStorage.getItem("buildcity_mm_pricing") || "{}");
      if (stored[product.id] !== undefined) return Boolean(stored[product.id]);
    } catch {}
    return false;
  });

  const handleToggleMmPricing = () => {
    const next = !mmPricingEnabled;
    setMmPricingEnabled(next);
    onMmPricingChange?.(next);
  };

  // Standard rule-based packs for this product's category (starting from 5 units)
  const defaultPacks = useMemo(() => getDefaultPacksForProduct(product), [product]);

  // Saved or assigned custom packs for this listing
  const parsedCustomPacks = useMemo(() => {
    let raw = product.customPacks || product.custom_packs;
    if (typeof raw === "string") {
      try {
        raw = JSON.parse(raw);
      } catch {}
    }
    if (raw && typeof raw === "object" && !Array.isArray(raw)) {
      raw = raw.packs;
    }
    return Array.isArray(raw) && raw.length > 0 && raw.some((pk) => Number(pk.qty) > 1)
      ? raw.filter((pk) => Number(pk.qty) > 1)
      : null;
  }, [product.customPacks, product.custom_packs]);

  // Bulk rates toggle:
  const [bulkEnabled, setBulkEnabled] = useState(() => {
    if (product.bulkEnabled !== undefined) return Boolean(product.bulkEnabled);
    if (product.customPacks && typeof product.customPacks === "object" && !Array.isArray(product.customPacks)) {
      if (product.customPacks.bulkEnabled !== undefined) return Boolean(product.customPacks.bulkEnabled);
    }
    try {
      const stored = JSON.parse(localStorage.getItem("buildcity_bulk_enabled") || "{}");
      if (stored[product.id] !== undefined) return Boolean(stored[product.id]);
    } catch {}
    return Boolean(parsedCustomPacks && parsedCustomPacks.length > 0);
  });

  // Dynamic unit MRP: base unit MRP badalte hi turant update hoga
  const unitMrp = Number(product.mrp) || Math.round((Number(product.price) || 0) * 1.2);

  // Current active packs list: minimum 5 units se shuru hota hai
  const activePacks = useMemo(() => {
    if (parsedCustomPacks && parsedCustomPacks.length > 0) {
      return parsedCustomPacks.map((cp) => {
        const qty = Number(cp.qty) || 5;
        const packMrp = Math.round(unitMrp * qty);
        return {
          ...cp,
          qty,
          mrp: packMrp,
          price: cp.price !== undefined ? cp.price : Math.round(price * qty),
          stock: cp.stock !== undefined ? cp.stock : (product.stockQty !== undefined ? product.stockQty : 100),
        };
      });
    }
    return defaultPacks.map((dp) => ({
      label: dp.label,
      qty: dp.qty,
      price: dp.price,
      mrp: Math.round(unitMrp * dp.qty),
      stock: product.stockQty !== undefined ? product.stockQty : 100,
    }));
  }, [parsedCustomPacks, defaultPacks, unitMrp, price, product.stockQty]);

  const handleToggleBulk = () => {
    if (bulkEnabled) {
      setBulkEnabled(false);
      onCustomPacksChange?.(null);
      onBulkChange?.(false);
    } else {
      setBulkEnabled(true);
      const initialBulk = defaultPacks.map((dp) => ({
        label: dp.label,
        qty: dp.qty,
        price: dp.price,
        mrp: Math.round(unitMrp * dp.qty),
        stock: product.stockQty !== undefined ? product.stockQty : 100,
      }));
      onCustomPacksChange?.(initialBulk);
      onBulkChange?.(true);
    }
  };

  const handlePackLabelChange = (index, val) => {
    if (onPackFieldChange) {
      onPackFieldChange(index, "label", val);
      return;
    }
    const next = activePacks.map((pk, idx) => (idx === index ? { ...pk, label: val } : pk));
    onCustomPacksChange?.(next);
  };

  const handlePackQtyChange = (index, val) => {
    if (onPackFieldChange) {
      onPackFieldChange(index, "qty", val);
      return;
    }
    const cleaned = typeof val === "string" ? val.replace(/^0+(?=\d)/, "") : val;
    const numQty = Number(cleaned) || 1;
    const next = activePacks.map((pk, idx) => {
      if (idx !== index) return pk;
      const packMrp = Math.round(unitMrp * numQty);
      return { ...pk, qty: cleaned, mrp: packMrp };
    });
    onCustomPacksChange?.(next);
  };

  const handlePackPriceChange = (index, val) => {
    const cleaned = typeof val === "string" ? val.replace(/^0+(?=\d)/, "") : val;
    if (onPackFieldChange) {
      onPackFieldChange(index, "price", cleaned);
      return;
    }
    const next = activePacks.map((pk, idx) => {
      const packQty = Number(pk.qty) || 5;
      const packMrp = Math.round(unitMrp * packQty);
      if (idx !== index) return { ...pk, mrp: packMrp };
      return { ...pk, price: cleaned, mrp: packMrp };
    });
    onCustomPacksChange?.(next);
  };

  const handlePackStockChange = (index, val) => {
    const cleaned = typeof val === "string" ? val.replace(/^0+(?=\d)/, "") : val;
    if (onPackFieldChange) {
      onPackFieldChange(index, "stock", cleaned);
      return;
    }
    const next = activePacks.map((pk, idx) => {
      const packQty = Number(pk.qty) || 5;
      const packMrp = Math.round(unitMrp * packQty);
      if (idx !== index) return { ...pk, mrp: packMrp };
      return { ...pk, stock: cleaned, mrp: packMrp };
    });
    onCustomPacksChange?.(next);
  };

  const spec = getCategorySpec(product.categoryName || product.category);
  const gradeLabel = spec.gradeLabel ? spec.gradeLabel.split("/")[0].trim() : "Grade";
  const gradeMeta = product.grade ? `${gradeLabel}: ${product.grade}` : null;

  return (
    <Sheet
      open
      onClose={onClose}
      title={product.name}
      subtitle={[product.brand, gradeMeta, product.unit].filter(Boolean).join(" · ")}
      leading={<ProductThumb src={image.src} fallback={image.fallback} alt="" className="h-10 w-10" />}
      footer={
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onClose} disabled={isSaving} className="flex-1 sm:flex-none">
            Cancel
          </Button>
          <Button type="submit" form="vendor-edit-listing" disabled={isSaving} className="flex-1">
            {isSaving ? (
              <>
                <Spinner />
                Saving
              </>
            ) : (
              "Save changes"
            )}
          </Button>
        </div>
      }
    >
      <form id="vendor-edit-listing" onSubmit={onSubmit} className="space-y-5 px-4 py-5 sm:px-5">
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-500 font-medium">Listing status</span>
          <ApprovalBadge status={product.approvalStatus} />
        </div>

        {/* 1 Unit Base Rates */}
        <div>
          <p className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">Base Unit Pricing ({product.unit || "1 Unit"})</p>
          <div className="grid grid-cols-2 gap-3">
            <Field
              label="MRP"
              prefix="₹"
              type="number"
              inputMode="numeric"
              required
              min="1"
              value={product.mrp ?? ""}
              onChange={(e) => onMrpChange(e.target.value)}
            />
            <Field
              label="Discount"
              suffix="%"
              type="number"
              inputMode="numeric"
              min="0"
              max="90"
              placeholder="0"
              value={product.discountPct !== undefined && product.discountPct !== null ? product.discountPct : ""}
              onBlur={() => {
                if (product.discountPct === "" || product.discountPct === undefined) {
                  onDiscountChange("0");
                }
              }}
              onChange={(e) => onDiscountChange(e.target.value)}
            />
            <Field
              label="Selling price"
              prefix="₹"
              type="number"
              inputMode="numeric"
              required
              min="1"
              value={product.price ?? ""}
              onChange={(e) => onPriceChange(e.target.value)}
            />
            <Field
              label="Stock"
              type="number"
              inputMode="numeric"
              required
              min="0"
              value={product.stockQty ?? ""}
              onChange={(e) => onStockChange(e.target.value)}
            />
          </div>
        </div>

        {/* Customer Base Preview */}
        <div className="rounded-xl bg-gradient-to-br from-emerald-50 to-white px-4 py-3 ring-1 ring-inset ring-emerald-200/70">
          <p className="text-xs font-medium text-emerald-700">Customers see for 1 {product.unit || "unit"}</p>
          <p className="mt-1 flex flex-wrap items-baseline gap-x-2 text-sm">
            <span className="text-base font-semibold tabular-nums text-slate-900">{inr(price)}</span>
            <span className="text-slate-400">/ {product.unit || "unit"}</span>
            {mrp > price && <span className="tabular-nums text-slate-400 line-through">{inr(mrp)}</span>}
            {discount > 0 && (
              <span key={discount} className="vd-page rounded-md bg-emerald-600 px-1.5 py-0.5 text-xs font-semibold text-white">{discount}% off</span>
            )}
          </p>
        </div>

        {/* MM-Wise Rebar Sizes Section with Toggle (8mm - 20mm Max) */}
        {isSteelProduct && (
          <div className="pt-3 border-t border-slate-200">
            <div className="flex items-center justify-between mb-1.5">
              <div>
                <h4 className="text-xs font-extrabold text-navy-900 uppercase tracking-wider flex items-center gap-1.5">
                  <span>🔩</span> MM-Wise Rebar Sizes (8mm – 20mm)
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Allow customers to choose 8mm, 10mm, 12mm, 16mm, and 20mm thickness.
                </p>
              </div>

              {/* Toggle Switch */}
              <button
                type="button"
                role="switch"
                aria-checked={mmPricingEnabled}
                onClick={handleToggleMmPricing}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  mmPricingEnabled ? "bg-brand-500" : "bg-slate-300"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    mmPricingEnabled ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {mmPricingEnabled && (
              <div className="mt-3 space-y-2.5 bg-blue-50/70 p-3 rounded-xl border border-blue-200/90">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold text-blue-950 uppercase tracking-wide flex items-center gap-1.5">
                    <span>⚡</span> Set Diameter Rates & Stock
                  </span>
                  <span className="text-[10px] text-blue-700 font-medium">
                    Uncheck to disable unavailable sizes
                  </span>
                </div>

                <div className="space-y-2">
                  {STEEL_DIAMETERS.map((dia) => {
                    const rateData = product.mmRates?.[dia] || {
                      active: true,
                      price: getDiameterPrice(price, dia, "10mm"),
                      mrp: getDiameterPrice(mrp, dia, "10mm"),
                    };
                    const isActive = rateData.active !== false;
                    const diaPrice = rateData.price !== undefined ? rateData.price : "";
                    const diaMrp = rateData.mrp !== undefined ? rateData.mrp : "";
                    const diaDiscount = (Number(diaMrp) > Number(diaPrice) && Number(diaPrice) > 0)
                      ? Math.round(((Number(diaMrp) - Number(diaPrice)) / Number(diaMrp)) * 100)
                      : 0;

                    return (
                      <div
                        key={dia}
                        className={`p-2.5 rounded-lg border transition-all ${
                          isActive
                            ? "bg-white border-blue-200/80 shadow-2xs"
                            : "bg-slate-100/70 border-slate-200 opacity-60"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={isActive}
                              onChange={(e) => onMmRateChange?.(dia, "active", e.target.checked)}
                              className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500 border-slate-300"
                            />
                            <span className="text-xs font-black text-navy-900">{dia} Rebar</span>
                            {!isActive && (
                              <span className="text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.2 rounded border border-red-200">
                                Disabled / Out of Stock
                              </span>
                            )}
                          </label>
                          {isActive && diaDiscount > 0 && (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                              {diaDiscount}% OFF
                            </span>
                          )}
                        </div>

                        {isActive && (
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                                Selling Price (₹)
                              </label>
                              <div className="relative flex items-center">
                                <span className="absolute left-2 text-[11px] text-slate-400 font-bold">₹</span>
                                <input
                                  type="number"
                                  min="1"
                                  value={diaPrice}
                                  onChange={(e) => onMmRateChange?.(dia, "price", e.target.value)}
                                  placeholder="e.g. 680"
                                  className="w-full pl-5 pr-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded-md font-bold text-slate-900 focus:border-brand-500 focus:bg-white outline-none"
                                />
                              </div>
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                                Cut-off MRP (₹)
                              </label>
                              <div className="relative flex items-center">
                                <span className="absolute left-2 text-[11px] text-slate-400 font-bold">₹</span>
                                <input
                                  type="number"
                                  min="1"
                                  value={diaMrp}
                                  onChange={(e) => onMmRateChange?.(dia, "mrp", e.target.value)}
                                  placeholder="e.g. 750"
                                  className="w-full pl-5 pr-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded-md font-bold text-slate-900 focus:border-brand-500 focus:bg-white outline-none"
                                />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Pack Sizes & Bulk Rates Section with Toggle */}
        <div className="pt-3 border-t border-slate-200">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h4 className="text-xs font-extrabold text-navy-900 uppercase tracking-wider">Bulk Rates / Pack Sizes</h4>
            </div>

            {/* Toggle Switch */}
            <button
              type="button"
              role="switch"
              aria-checked={bulkEnabled}
              onClick={handleToggleBulk}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                bulkEnabled ? "bg-brand-500" : "bg-slate-300"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                  bulkEnabled ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {bulkEnabled ? (
            <div className="space-y-2.5 bg-slate-50/70 p-3 rounded-xl border border-slate-200">
              {activePacks.map((pack, idx) => {
                const packQty = Number(pack.qty) || 5;
                const packMrp = Math.round(unitMrp * packQty);
                const packPrice = Number(pack.price) || 0;
                const discountPct = (packMrp > packPrice && packPrice > 0)
                  ? Math.round(((packMrp - packPrice) / packMrp) * 100)
                  : 0;

                return (
                  <div key={idx} className="bg-white p-3 rounded-xl border border-slate-200/90 shadow-2xs space-y-2.5">
                    {/* Header Row: Tier number, discount badge, and delete button */}
                    <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                        Pack Tier #{idx + 1}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {discountPct > 0 ? (
                          <span className="text-[11px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/80">
                            {discountPct}% OFF
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-medium">No discount</span>
                        )}
                        {onRemoveCustomPack && (
                          <button
                            type="button"
                            onClick={() => onRemoveCustomPack(idx)}
                            className="p-1 text-slate-400 hover:text-red-600 rounded-md hover:bg-red-50 transition-colors cursor-pointer"
                            title="Remove pack"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Row 1: Editable Pack Name/Label and Base Quantity (Multiplier) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Pack Name / Label *
                        </label>
                        <input
                          type="text"
                          value={pack.label || ""}
                          onChange={(e) => handlePackLabelChange(idx, e.target.value)}
                          placeholder={`e.g. ${packQty} ${product.unit || "Units"} Bulk`}
                          className="w-full px-2.5 py-1.5 bg-slate-50 text-xs border border-slate-200 rounded-lg outline-none font-bold text-slate-900 focus:border-brand-500 focus:bg-white transition-colors"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Base Multiplier (Units / Qty) *
                        </label>
                        <div className="relative flex items-center">
                          <input
                            type="number"
                            min="2"
                            placeholder="e.g. 5"
                            value={pack.qty !== undefined ? pack.qty : ""}
                            onChange={(e) => handlePackQtyChange(idx, e.target.value)}
                            className="w-full pl-2.5 pr-14 py-1.5 bg-slate-50 text-xs border border-slate-200 rounded-lg outline-none font-bold text-slate-900 focus:border-brand-500 focus:bg-white transition-colors"
                          />
                          <span className="absolute right-2 text-[10px] text-slate-500 font-extrabold uppercase pointer-events-none">
                            × {product.unit || "unit"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Row 2: Selling Price & Stock Available */}
                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Selling Price (₹) *
                        </label>
                        <div className="relative flex items-center">
                          <span className="absolute left-2.5 text-xs text-slate-400 font-bold">₹</span>
                          <input
                            type="number"
                            min="1"
                            placeholder="e.g. 1850"
                            value={pack.price !== undefined ? pack.price : ""}
                            onChange={(e) => handlePackPriceChange(idx, e.target.value)}
                            className="w-full pl-6 pr-2.5 py-1.5 bg-slate-50 text-xs border border-slate-200 rounded-lg outline-none font-bold text-slate-900 focus:border-brand-500 focus:bg-white transition-colors"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Stock Available
                        </label>
                        <input
                          type="number"
                          min="0"
                          placeholder="e.g. 50"
                          value={pack.stock !== undefined ? pack.stock : ""}
                          onChange={(e) => handlePackStockChange(idx, e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-slate-50 text-xs border border-slate-200 rounded-lg outline-none font-bold text-slate-900 focus:border-brand-500 focus:bg-white transition-colors"
                        />
                      </div>
                    </div>

                    <p className="text-[10px] text-slate-400 font-medium flex items-center justify-between pt-1 border-t border-slate-100">
                      <span>Cut-off MRP: <strong className="font-semibold text-slate-600">{inr(packMrp)}</strong></span>
                      {packPrice > 0 && packQty > 1 && (
                        <span>₹{Math.round(packPrice / packQty)} / {product.unit || "unit"}</span>
                      )}
                    </p>
                  </div>
                );
              })}

              {onAddCustomPack && (
                <button
                  type="button"
                  onClick={onAddCustomPack}
                  className="w-full py-2.5 px-3 border border-dashed border-brand-300 bg-brand-50/60 hover:bg-brand-50 rounded-xl text-xs font-bold text-brand-700 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Custom Pack Size
                </button>
              )}
            </div>
          ) : (
            <div className="rounded-xl bg-slate-50 p-3 border border-dashed border-slate-200 text-center">
              <p className="text-xs font-semibold text-slate-600">Bulk rates are OFF</p>
            </div>
          )}
        </div>
      </form>
    </Sheet>
  );
}