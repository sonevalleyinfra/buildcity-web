import { useState } from "react";
import { withMrp, withDiscount, withPrice, discountFor } from "../utils/pricing";
import { getDefaultPacksForProduct, getDefaultMmRates, STEEL_DIAMETERS } from "../../../utils/productPacks";

/** "Edit listing" sheet: the listing being edited, MRP ⇄ discount ⇄ price sync, stock, and save. */
export default function useListingEditor({ updateVendorProductListing, showAlert }) {
  const [editingProduct, setEditingProduct] = useState(null);

  const open = (p) => {
    const price = Number(p.price) || 100;
    const mrp = Number(p.mrp || p.masterProduct?.mrp || p.masterProduct?.suggestedPrice || Math.round(price * 1.2));
    let customPacks = p.customPacks || p.custom_packs || null;
    if (typeof customPacks === "string") {
      try {
        customPacks = JSON.parse(customPacks);
      } catch {}
    }
    let isBulkOn = p.bulkEnabled !== undefined ? Boolean(p.bulkEnabled) : false;
    let isMmOn = p.mmPricingEnabled !== undefined
      ? Boolean(p.mmPricingEnabled)
      : (p.diameterPricingEnabled !== undefined ? Boolean(p.diameterPricingEnabled) : false);

    let validCustomPacks = null;
    let rawMmRates = null;
    if (customPacks && typeof customPacks === "object" && !Array.isArray(customPacks)) {
      if (customPacks.bulkEnabled !== undefined) isBulkOn = Boolean(customPacks.bulkEnabled);
      if (customPacks.mmPricingEnabled !== undefined) isMmOn = Boolean(customPacks.mmPricingEnabled);
      if (customPacks.mmRates) rawMmRates = customPacks.mmRates;
      if (Array.isArray(customPacks.packs)) {
        validCustomPacks = customPacks.packs.filter((pk) => Number(pk.qty) > 1);
      }
    } else if (Array.isArray(customPacks) && customPacks.length > 0) {
      validCustomPacks = customPacks.filter((pk) => Number(pk.qty) > 1);
      if (p.bulkEnabled !== undefined) {
        isBulkOn = Boolean(p.bulkEnabled);
      } else {
        isBulkOn = Boolean(validCustomPacks && validCustomPacks.length > 0);
      }
    }

    if (!rawMmRates && p.mmRates) {
      rawMmRates = p.mmRates;
    }

    try {
      const storedMm = JSON.parse(localStorage.getItem("buildcity_mm_pricing") || "{}");
      if (storedMm[p.id] !== undefined) isMmOn = Boolean(storedMm[p.id]);
      const storedBulk = JSON.parse(localStorage.getItem("buildcity_bulk_enabled") || "{}");
      if (storedBulk[p.id] !== undefined) isBulkOn = Boolean(storedBulk[p.id]);
      const storedMmRates = JSON.parse(localStorage.getItem("buildcity_mm_rates") || "{}");
      if (storedMmRates[p.id]) rawMmRates = storedMmRates[p.id];
    } catch {}

    const defaultMm = getDefaultMmRates(price, mrp, "10mm");
    const mergedMmRates = {};
    for (const dia of STEEL_DIAMETERS) {
      mergedMmRates[dia] = {
        active: rawMmRates?.[dia]?.active !== undefined ? Boolean(rawMmRates[dia].active) : true,
        price: (rawMmRates?.[dia]?.price !== undefined && rawMmRates[dia].price !== "") ? rawMmRates[dia].price : defaultMm[dia].price,
        mrp: (rawMmRates?.[dia]?.mrp !== undefined && rawMmRates[dia].mrp !== "") ? rawMmRates[dia].mrp : defaultMm[dia].mrp,
      };
    }

    setEditingProduct({
      ...p,
      mrp,
      price,
      discountPct: mrp > price ? discountFor(mrp, price) : 0,
      stockQty: p.stockQty !== undefined ? p.stockQty : 100,
      customPacks: validCustomPacks,
      bulkEnabled: isBulkOn,
      mmPricingEnabled: isMmOn,
      mmRates: mergedMmRates,
    });
  };

  // Close first and confirm, then save in the background
  const save = async (e) => {
    e.preventDefault();
    if (!editingProduct) return;
    const prod = { ...editingProduct };
    setEditingProduct(null);
    showAlert({
      title: "Listing updated",
      message: `Customers now see ₹${prod.price}${Number(prod.discountPct) > 0 ? ` (${prod.discountPct}% off)` : ""}.`,
      type: "success",
      buttonText: "Done",
    });
    try {
      const unitMrp = Number(prod.mrp) || Math.round((Number(prod.price) || 0) * 1.2);
      let sanitizedPacks = null;
      if (Array.isArray(prod.customPacks) && prod.customPacks.length > 0) {
        sanitizedPacks = prod.customPacks
          .filter((pk) => Number(pk.qty) > 1)
          .map((pk) => {
            const qty = Number(pk.qty) || 5;
            const packMrp = Math.round(unitMrp * qty);
            const numPrice = pk.price === "" || pk.price === undefined ? 0 : Number(pk.price);
            const numStock = pk.stock === "" || pk.stock === undefined ? 0 : Number(pk.stock);
            return {
              label: pk.label && String(pk.label).trim() ? String(pk.label).trim() : `${prod.unit || "Unit"}, Pack of ${qty}`,
              qty,
              price: numPrice >= 0 ? numPrice : 0,
              mrp: packMrp,
              stock: numStock >= 0 ? numStock : 0,
            };
          });
      }

      const isBulkActive = Boolean(prod.bulkEnabled && sanitizedPacks && sanitizedPacks.length > 0);
      const isMmActive = Boolean(prod.mmPricingEnabled);

      if (prod.mmRates) {
        try {
          const storedRates = JSON.parse(localStorage.getItem("buildcity_mm_rates") || "{}");
          storedRates[prod.id] = prod.mmRates;
          localStorage.setItem("buildcity_mm_rates", JSON.stringify(storedRates));
        } catch {}
      }

      const customPacksPayload = {
        bulkEnabled: isBulkActive,
        mmPricingEnabled: isMmActive,
        mmRates: isMmActive ? prod.mmRates : null,
        packs: isBulkActive ? sanitizedPacks : [],
      };

      await updateVendorProductListing(prod.id, {
        price: Number(prod.price),
        mrp: Number(prod.mrp),
        stockQty: Number(prod.stockQty),
        customPacks: customPacksPayload,
        bulkEnabled: isBulkActive,
        mmPricingEnabled: isMmActive,
        mmRates: isMmActive ? prod.mmRates : null,
      });
    } catch (err) {
      console.warn("Background update listing note:", err.message);
    }
  };

  return {
    editingProduct,
    open,
    close: () => setEditingProduct(null),
    save,
    onMrpChange: (v) => {
      const cleaned = typeof v === "string" ? v.replace(/^0+(?=\d)/, "") : v;
      setEditingProduct((p) => {
        const updated = withMrp(p, cleaned);
        if (Array.isArray(updated.customPacks) && updated.customPacks.length > 0) {
          const newUnitMrp = Number(updated.mrp) || Math.round((Number(updated.price) || 0) * 1.2);
          updated.customPacks = updated.customPacks.map((cp) => ({
            ...cp,
            mrp: Math.round(newUnitMrp * (Number(cp.qty) || 1)),
          }));
        }
        return updated;
      });
    },
    onDiscountChange: (v) => {
      const cleaned = typeof v === "string" ? v.replace(/^0+(?=\d)/, "") : v;
      setEditingProduct((p) => withDiscount(p, cleaned));
    },
    onPriceChange: (v) => {
      const cleaned = typeof v === "string" ? v.replace(/^0+(?=\d)/, "") : v;
      setEditingProduct((p) => {
        const updated = withPrice(p, cleaned);
        if (Array.isArray(updated.customPacks) && updated.customPacks.length > 0) {
          const newPrice = Number(updated.price) || 0;
          updated.customPacks = updated.customPacks.map((cp) => {
            if (cp.qty === 1) {
              return { ...cp, price: newPrice };
            }
            return cp;
          });
        }
        return updated;
      });
    },
    onStockChange: (v) => {
      const cleaned = typeof v === "string" ? v.replace(/^0+(?=\d)/, "") : v;
      setEditingProduct((p) => ({ ...p, stockQty: cleaned }));
    },
    onCustomPacksChange: (packs) => setEditingProduct((p) => ({ ...p, customPacks: packs })),
    onBulkChange: (val) => setEditingProduct((p) => ({ ...p, bulkEnabled: Boolean(val) })),
    onMmPricingChange: (val) => setEditingProduct((p) => ({ ...p, mmPricingEnabled: Boolean(val) })),
    onMmRateChange: (dia, field, val) => {
      setEditingProduct((p) => {
        if (!p) return p;
        const currentDia = p.mmRates?.[dia] || { active: true, price: 0, mrp: 0 };
        let updatedVal = val;
        if (field === "active") {
          updatedVal = Boolean(val);
        } else if (typeof val === "string") {
          updatedVal = val.replace(/^0+(?=\d)/, "");
        }
        return {
          ...p,
          mmRates: {
            ...p.mmRates,
            [dia]: {
              ...currentDia,
              [field]: updatedVal,
            },
          },
        };
      });
    },
    onAddCustomPack: () => {
      setEditingProduct((p) => {
        if (!p) return p;
        const currentPacks = Array.isArray(p.customPacks) ? [...p.customPacks] : getDefaultPacksForProduct(p);
        const lastQty = currentPacks.length > 0 ? Number(currentPacks[currentPacks.length - 1].qty) || 5 : 5;
        const newQty = lastQty >= 50 ? lastQty + 25 : lastQty * 2;
        const unitPrice = Number(p.price) || 100;
        const unitMrp = Number(p.mrp) || Math.round(unitPrice * 1.2);
        const suggestedPackPrice = Math.round(unitPrice * newQty * 0.95);
        const newPack = {
          label: `${p.unit || "Unit"}, Pack of ${newQty}`,
          qty: newQty,
          price: suggestedPackPrice,
          mrp: Math.round(unitMrp * newQty),
          stock: 20,
        };
        return {
          ...p,
          customPacks: [...currentPacks, newPack],
        };
      });
    },
    onRemoveCustomPack: (indexToRemove) => {
      setEditingProduct((p) => {
        if (!p) return p;
        const currentPacks = Array.isArray(p.customPacks) ? [...p.customPacks] : getDefaultPacksForProduct(p);
        const filtered = currentPacks.filter((_, idx) => idx !== indexToRemove);
        return {
          ...p,
          customPacks: filtered,
        };
      });
    },
    onPackFieldChange: (index, field, val) => {
      setEditingProduct((p) => {
        if (!p) return p;
        const currentPacks = Array.isArray(p.customPacks) ? [...p.customPacks] : getDefaultPacksForProduct(p);
        const unitMrp = Number(p.mrp) || Math.round((Number(p.price) || 100) * 1.2);
        const next = currentPacks.map((pk, idx) => {
          if (idx !== index) return pk;
          const updated = { ...pk };
          if (field === "qty") {
            const cleaned = typeof val === "string" ? val.replace(/^0+(?=\d)/, "") : val;
            updated.qty = cleaned;
            const numeric = Number(cleaned) || 1;
            updated.mrp = Math.round(unitMrp * numeric);
          } else if (field === "price" || field === "stock") {
            updated[field] = typeof val === "string" ? val.replace(/^0+(?=\d)/, "") : val;
          } else {
            updated[field] = val;
          }
          return updated;
        });
        return {
          ...p,
          customPacks: next,
        };
      });
    },
  };
}
