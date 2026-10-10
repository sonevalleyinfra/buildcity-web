import { useMemo, useState } from "react";
import { ProductThumb } from "./ProductsTab";
import { Sheet, Field, Button, ApprovalBadge, Spinner } from "../ui/primitives";
import { inr } from "../ui/format";
import { getDefaultPacksForProduct } from "../../../utils/productPacks";

export default function EditListingSheet({
  product,
  image,
  onClose,
  onSubmit,
  onMrpChange,
  onDiscountChange,
  onPriceChange,
  onStockChange,
  onCustomPacksChange,
  isSaving,
}) {
  if (!product) return null;

  const price = Number(product.price || 0);
  const mrp = Number(product.mrp || 0);
  const discount = Number(product.discountPct || 0);

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
    return Array.isArray(raw) && raw.length > 0 && raw.some((pk) => Number(pk.qty) > 1)
      ? raw.filter((pk) => Number(pk.qty) > 1)
      : null;
  }, [product.customPacks, product.custom_packs]);

  // Bulk rates toggle: puraane products ke liye by default OFF rahega
  const [bulkEnabled, setBulkEnabled] = useState(() => Boolean(parsedCustomPacks && parsedCustomPacks.length > 0));

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
    }
  };

  const handlePackPriceChange = (index, val) => {
    const cleaned = typeof val === "string" ? val.replace(/^0+(?=\d)/, "") : val;
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
    const next = activePacks.map((pk, idx) => {
      const packQty = Number(pk.qty) || 5;
      const packMrp = Math.round(unitMrp * packQty);
      if (idx !== index) return { ...pk, mrp: packMrp };
      return { ...pk, stock: cleaned, mrp: packMrp };
    });
    onCustomPacksChange?.(next);
  };

  return (
    <Sheet
      open
      onClose={onClose}
      title={product.name}
      subtitle={[product.brand, product.unit].filter(Boolean).join(" · ")}
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
              onFocus={(e) => e.target.select()}
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
              onFocus={(e) => e.target.select()}
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
              onFocus={(e) => e.target.select()}
              onChange={(e) => onPriceChange(e.target.value)}
            />
            <Field
              label="Stock"
              type="number"
              inputMode="numeric"
              required
              min="0"
              value={product.stockQty ?? ""}
              onFocus={(e) => e.target.select()}
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
                  <div key={idx} className="bg-white p-3 rounded-xl border border-slate-200/90 shadow-2xs space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-extrabold text-slate-900">{pack.label}</span>
                        <span className="text-[10px] text-slate-400 font-mono">({pack.qty}x base)</span>
                      </div>
                      {discountPct > 0 ? (
                        <span className="text-[11px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/80">
                          {discountPct}% OFF
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-medium">No discount</span>
                      )}
                    </div>

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
                            onFocus={(e) => e.target.select()}
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
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => handlePackStockChange(idx, e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-slate-50 text-xs border border-slate-200 rounded-lg outline-none font-bold text-slate-900 focus:border-brand-500 focus:bg-white transition-colors"
                        />
                      </div>
                    </div>

                    <p className="text-[10px] text-slate-400 font-medium flex items-center justify-between pt-1 border-t border-slate-100">
                      <span>Cut-off MRP: <strong className="font-semibold text-slate-600">{inr(packMrp)}</strong></span>
                      {packPrice > 0 && pack.qty > 1 && (
                        <span>₹{Math.round(packPrice / pack.qty)} / unit</span>
                      )}
                    </p>
                  </div>
                );
              })}
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