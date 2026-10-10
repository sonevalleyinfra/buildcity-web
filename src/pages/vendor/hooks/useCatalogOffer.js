import { useMemo, useState } from "react";
import { withMrp, withDiscount, withPrice } from "../utils/pricing";
import { getDefaultPacksForProduct } from "../../../utils/productPacks";

const DEFAULT_DISCOUNT = 10;
const EMPTY_OFFER = { mrp: "", discountPct: DEFAULT_DISCOUNT, price: "" };

/**
 * "Add from catalogue" sheet: open state, category/search filters, the selected master product,
 * its MRP ⇄ discount ⇄ price offer, stock, optional bulk rates, and submission.
 */
export default function useCatalogOffer({ masterProducts, submitListing, showAlert }) {
  const [open, setOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [offer, setOffer] = useState(EMPTY_OFFER);
  const [stockQty, setStockQty] = useState(100);
  const [bulkEnabled, setBulkEnabled] = useState(false);
  const [customPacks, setCustomPacks] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const q = search.toLowerCase();
  const filteredProducts = masterProducts.filter(
    (mp) =>
      (categoryFilter === "ALL" || mp.categoryId === categoryFilter) &&
      [mp.name, mp.brand, mp.categoryName, mp.type].some((f) => (f || "").toLowerCase().includes(q))
  );

  const toggleSelect = (mp) => {
    if (selected?.id === mp.id) {
      setSelected(null);
      setBulkEnabled(false);
      setCustomPacks([]);
      return;
    }
    setSelected(mp);
    setOffer(withMrp(EMPTY_OFFER, Number(mp.suggestedPrice) || 390));
    setStockQty(100);
    setBulkEnabled(false);
    setCustomPacks([]);
  };

  const close = () => {
    setOpen(false);
    setSelected(null);
    setBulkEnabled(false);
    setCustomPacks([]);
  };

  const unitMrp = Number(offer.mrp) || Math.round((Number(offer.price) || 100) * 1.2);

  const activePacks = useMemo(() => {
    if (!selected) return [];
    const baseP = Number(offer.price) || Number(selected.suggestedPrice) || 100;
    const def = getDefaultPacksForProduct({ ...selected, price: baseP, mrp: unitMrp });
    if (customPacks.length > 0) {
      return customPacks.map((cp) => {
        const qty = Number(cp.qty) || 5;
        return {
          ...cp,
          qty,
          mrp: Math.round(unitMrp * qty),
          price: cp.price !== undefined ? cp.price : Math.round(baseP * qty),
          stock: cp.stock !== undefined ? cp.stock : stockQty,
        };
      });
    }
    return def.map((dp) => ({
      label: dp.label,
      qty: dp.qty,
      price: dp.price,
      mrp: Math.round(unitMrp * dp.qty),
      stock: stockQty,
    }));
  }, [selected, offer.price, unitMrp, customPacks, stockQty]);

  const toggleBulkEnabled = () => {
    if (bulkEnabled) {
      setBulkEnabled(false);
      setCustomPacks([]);
    } else {
      setBulkEnabled(true);
      if (selected) {
        const baseP = Number(offer.price) || Number(selected.suggestedPrice) || 100;
        const def = getDefaultPacksForProduct({ ...selected, price: baseP, mrp: unitMrp });
        setCustomPacks(def);
      }
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!selected || !offer.price) return;
    setIsSubmitting(true);
    try {
      let sanitizedPacks = null;
      if (bulkEnabled && activePacks.length > 0) {
        sanitizedPacks = activePacks
          .filter((pk) => Number(pk.qty) > 1)
          .map((pk) => {
            const qty = Number(pk.qty) || 5;
            const packMrp = Math.round(unitMrp * qty);
            const numPrice = pk.price === "" || pk.price === undefined ? 0 : Number(pk.price);
            const numStock = pk.stock === "" || pk.stock === undefined ? 0 : Number(pk.stock);
            return {
              label: pk.label && String(pk.label).trim() ? String(pk.label).trim() : `${selected.unit || "Unit"}, Pack of ${qty}`,
              qty,
              price: numPrice >= 0 ? numPrice : 0,
              mrp: packMrp,
              stock: numStock >= 0 ? numStock : 0,
            };
          });
      }

      await submitListing({
        masterProduct: selected,
        price: Number(offer.price),
        mrp: Number(offer.mrp) || Number(selected.suggestedPrice) || Number(offer.price),
        stockQty: Number(stockQty) || 0,
        customPacks: sanitizedPacks,
      });
      const name = selected.name;
      setSelected(null);
      setBulkEnabled(false);
      setCustomPacks([]);
      showAlert({
        title: "Submitted for review",
        message: `${name} will go live once your district team approves it.\n\nPrice ₹${offer.price}${Number(offer.discountPct) > 0 ? ` (${offer.discountPct}% off)` : ""} · Stock ${stockQty}`,
        type: "success",
        buttonText: "Done",
      });
    } catch (err) {
      showAlert({ title: "Couldn't submit", message: err.message || "Please try again.", type: "warning" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    open,
    openSheet: () => setOpen(true),
    close,
    categoryFilter,
    setCategoryFilter,
    search,
    setSearch,
    filteredProducts,
    selectedId: selected?.id,
    toggleSelect,
    form: {
      mrp: offer.mrp,
      discountPct: offer.discountPct,
      sellingPrice: offer.price,
      stockQty,
      bulkEnabled,
      toggleBulkEnabled,
      activePacks,
      onPackPriceChange: (index, val) => {
        setCustomPacks((prev) => {
          const list = prev.length > 0 ? [...prev] : [...activePacks];
          const packQty = Number(list[index]?.qty) || 5;
          const numPrice = val === "" ? "" : Number(val);
          list[index] = { ...list[index], price: numPrice, mrp: Math.round(unitMrp * packQty) };
          return list;
        });
      },
      onPackStockChange: (index, val) => {
        const cleaned = typeof val === "string" ? val.replace(/^0+(?=\d)/, "") : val;
        setCustomPacks((prev) => {
          const list = prev.length > 0 ? [...prev] : [...activePacks];
          const packQty = Number(list[index]?.qty) || 5;
          const numStock = cleaned === "" ? "" : Number(cleaned);
          list[index] = { ...list[index], stock: numStock, mrp: Math.round(unitMrp * packQty) };
          return list;
        });
      },
      onMrpChange: (v) => {
        const cleaned = typeof v === "string" ? v.replace(/^0+(?=\d)/, "") : v;
        setOffer((o) => withMrp(o, cleaned));
      },
      onDiscountChange: (v) => {
        const cleaned = typeof v === "string" ? v.replace(/^0+(?=\d)/, "") : v;
        setOffer((o) => withDiscount(o, cleaned));
      },
      onSellingPriceChange: (v) => {
        const cleaned = typeof v === "string" ? v.replace(/^0+(?=\d)/, "") : v;
        setOffer((o) => withPrice(o, cleaned));
      },
      onStockChange: (v) => {
        const cleaned = typeof v === "string" ? v.replace(/^0+(?=\d)/, "") : v;
        setStockQty(cleaned);
      },
    },
    submit,
    isSubmitting,
  };
}
