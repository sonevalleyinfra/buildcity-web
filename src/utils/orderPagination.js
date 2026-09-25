// Shared helpers for cursor-paginated order lists (see GET /api/v1/orders*)

export const ORDERS_PAGE_SIZE = 50;

// Query string for a paginated order list. The first page also carries every still-open order,
// so pending work never hides behind "Load more".
export const ordersPageQuery = (cursor, extra = "") =>
  `?limit=${ORDERS_PAGE_SIZE}&includeOpen=1${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}${extra}`;

// Paginated endpoints return { orders, nextCursor, hasMore }; older servers return a plain array
export const readOrdersPage = (data) =>
  Array.isArray(data)
    ? { orders: data, nextCursor: null, hasMore: false }
    : { orders: Array.isArray(data?.orders) ? data.orders : [], nextCursor: data?.nextCursor || null, hasMore: Boolean(data?.hasMore) };

// Merges order lists by id (entries from `fresh` win) and sorts newest first
export const mergeOrderLists = (fresh, existing) => {
  const map = new Map();
  [...(fresh || []), ...(existing || [])].forEach((o) => {
    if (o && o.id && !map.has(o.id)) map.set(o.id, o);
  });
  return Array.from(map.values()).sort(
    (a, b) => new Date(b.createdAt || b.date || 0) - new Date(a.createdAt || a.date || 0)
  );
};
