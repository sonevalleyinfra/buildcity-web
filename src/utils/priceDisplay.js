// Display-only price helpers for storefront cards and the cart. No money is calculated here for orders;
// these only decide what the customer *sees* (struck-through MRP, "x% off", count labels).

/** The MRP to show next to a price: only a real MRP that is above the price, otherwise 0 (show none). */
export function realMrp(price, mrp) {
  const p = Number(price) || 0;
  const m = Number(mrp) || 0;
  return m > p ? m : 0;
}

/** Whole-percent discount from a real MRP; 0 when there is no real MRP. */
export function discountPercent(price, mrp) {
  const m = realMrp(price, mrp);
  if (!m) return 0;
  return Math.round(((m - (Number(price) || 0)) / m) * 100);
}

/** "1 product", "3 products" (or a custom plural). */
export function countLabel(n, singular, plural = `${singular}s`) {
  const count = Number(n) || 0;
  return `${count} ${count === 1 ? singular : plural}`;
}
