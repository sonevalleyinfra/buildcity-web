import { useState } from "react";
import { withMrp, withDiscount, withPrice, discountFor } from "../utils/pricing";
import { getDefaultPacksForProduct } from "../../../utils/productPacks";

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
    // Puraane products ke liye by default customPacks null rahega (Bulk rates OFF)
    const validCustomPacks =
      Array.isArray(customPacks) && customPacks.length > 0 && customPacks.some((pk) => Number(pk.qty) > 1)
        ? customPacks.filter((pk) => Number(pk.qty) > 1)
        : null;

    setEditingProduct({
      ...p,
      mrp,
      price,
      discountPct: mrp > price ? discountFor(mrp, price) : 0,
      stockQty: p.stockQty !== undefined ? p.stockQty : 100,
      customPacks: validCustomPacks,
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
      await updateVendorProductListing(prod.id, {
        price: Number(prod.price),
        mrp: Number(prod.mrp),
        stockQty: Number(prod.stockQty),
        customPacks: sanitizedPacks,
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
  };
}
