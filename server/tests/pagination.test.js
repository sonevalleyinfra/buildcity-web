// Pagination + summary correctness for orders, cloud-sync and users.
const path = require("path");
const { execFileSync } = require("child_process");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const BASE = `http://localhost:${process.env.TEST_PORT || 5055}/api/v1`;

// Fixture login credentials (local test data only)
const CREDS = { admin: "admin123", vendorA: "vendorA123" };
let pass = 0, fail = 0;
const ok = (c, n, x) => { if (c) { pass++; console.log("PASS", n); } else { fail++; console.log("FAIL", n, x !== undefined ? JSON.stringify(x).slice(0, 300) : ""); } };
const get = async (p, token) => {
  const r = await fetch(BASE + p, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  return { status: r.status, body: await r.json() };
};
const login = async (phone, password) => (await fetch(`${BASE}/auth/vendor/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone, password }) }).then((r) => r.json())).token;

// Walks every page of a paginated order endpoint and returns all orders in order
async function walk(p, token, limit) {
  const all = [];
  let cursor = null, pages = 0;
  do {
    const sep = p.includes("?") ? "&" : "?";
    const r = await get(`${p}${sep}limit=${limit}${cursor ? `&cursor=${cursor}` : ""}`, token);
    all.push(...r.body.orders);
    cursor = r.body.nextCursor;
    pages++;
  } while (cursor && pages < 100);
  return { all, pages };
}

(async () => {
  const ids = JSON.parse(execFileSync("node", [path.join(__dirname, "fixture.js")]).toString().trim().split("\n").pop());

  // 130 extra orders spread over 130 minutes, alternating vendors and statuses.
  // The OLDEST one stays PENDING to prove open orders never hide on a later page.
  const reg2 = await prisma.region.create({ data: { name: "Mirzapur" } });
  const addr = await prisma.address.create({ data: { userId: ids.c1, regionId: ids.reg, fullName: "C1", phone: "8000000001", street: "1 Road", pincode: "221001" } });
  const addr2 = await prisma.address.create({ data: { userId: ids.c2, regionId: reg2.id, fullName: "C2", phone: "8000000002", street: "2 Road", pincode: "231001" } });
  const statuses = ["DELIVERED", "CANCELLED", "DELIVERED", "PROCESSING"];
  const base = Date.now() - 200 * 60000;
  for (let i = 0; i < 130; i++) {
    const vendorId = i % 2 ? ids.va : ids.vb;
    const status = i === 0 ? "PENDING" : statuses[i % statuses.length];
    await prisma.order.create({
      data: {
        customerId: i % 3 ? ids.c1 : ids.c2,
        addressId: i % 3 ? addr.id : addr2.id,
        totalAmount: 100 + i,
        status,
        createdAt: new Date(base + i * 60000),
        items: { create: [{ vendorId, productName: "Cement Bag", priceAtPurchase: 10 + i, quantity: 1, totalPrice: 10 + i }] },
      },
    });
  }
  const oldestPending = await prisma.order.findFirst({ where: { status: "PENDING", totalAmount: 100 } });

  const admin = await login("9999999999", CREDS.admin);
  const vA = await login("9000000001", CREDS.vendorA);
  const dbCount = await prisma.order.count();
  const dbSum = Number((await prisma.order.aggregate({ _sum: { totalAmount: true } }))._sum.totalAmount);

  // Legacy (no params): plain array, backwards compatible
  const legacy = await get("/orders", admin);
  ok(Array.isArray(legacy.body) && legacy.body.length === dbCount, "legacy /orders still returns a plain array", legacy.body.length);

  // Paginated walk: every order exactly once, newest first
  const first = await get("/orders?limit=50", admin);
  ok(first.body.orders.length === 50 && first.body.hasMore === true && typeof first.body.nextCursor === "string", "first page has 50 orders + cursor");
  const { all, pages } = await walk("/orders", admin, 50);
  const unique = new Set(all.map((o) => o.id));
  ok(all.length === dbCount && unique.size === dbCount && pages === Math.ceil(dbCount / 50), "walking pages returns every order exactly once", { got: all.length, unique: unique.size, dbCount, pages });
  const sorted = all.every((o, i) => i === 0 || new Date(all[i - 1].createdAt) >= new Date(o.createdAt));
  ok(sorted, "pages are newest-first across page boundaries");
  ok(!JSON.stringify(first.body).includes('"password"'), "paginated orders leak no password field");

  // New order arriving between pages must not shift or duplicate the next page (keyset cursor)
  const p1 = await get("/orders?limit=20", admin);
  await prisma.order.create({ data: { customerId: ids.c1, totalAmount: 5, items: { create: [{ vendorId: ids.va, productName: "X", priceAtPurchase: 5, quantity: 1, totalPrice: 5 }] } } });
  const p2 = await get(`/orders?limit=20&cursor=${p1.body.nextCursor}`, admin);
  const overlap = p2.body.orders.filter((o) => p1.body.orders.some((q) => q.id === o.id));
  ok(overlap.length === 0 && p2.body.orders.length === 20, "new orders between page loads cause no duplicates/skips", overlap.length);

  // includeOpen: the oldest PENDING order is on the first page
  const withOpen = await get("/orders?limit=10&includeOpen=1", admin);
  ok(withOpen.body.orders.some((o) => o.id === oldestPending.id), "includeOpen puts old open orders on the first page");
  const withoutOpen = await get("/orders?limit=10", admin);
  ok(!withoutOpen.body.orders.some((o) => o.id === oldestPending.id), "without includeOpen the page is strictly the newest N");

  // Limits
  const big = await get("/orders?limit=5000", admin);
  ok(big.body.orders.length === 100, "limit is capped at 100", big.body.orders.length);
  const bogus = await get("/orders?limit=10&cursor=does-not-exist", admin);
  ok(bogus.status === 200 && Array.isArray(bogus.body.orders), "unknown cursor is handled without error", bogus.status);

  // Summary: exact totals regardless of paging
  const dbCount2 = await prisma.order.count();
  const dbSum2 = Number((await prisma.order.aggregate({ _sum: { totalAmount: true } }))._sum.totalAmount);
  const sum = await get("/orders/summary", admin);
  ok(sum.body.totalOrders === dbCount2 && Math.abs(sum.body.totalRevenue - dbSum2) < 0.001, "admin summary matches DB count and revenue", { sum: sum.body, dbCount2, dbSum2 });
  const dbOpen = await prisma.order.count({ where: { status: { notIn: ["DELIVERED", "CANCELLED"] } } });
  ok(sum.body.openOrders === dbOpen && sum.body.byStatus.DELIVERED > 0, "summary open/byStatus counts are exact", sum.body);

  // Region filter (DR district view)
  const regWalk = await walk(`/orders?regionId=${reg2.id}`, admin, 20);
  const regDb = await prisma.order.count({ where: { address: { regionId: reg2.id } } });
  ok(regWalk.all.length === regDb && regWalk.all.every((o) => o.address?.regionId === reg2.id), "regionId filter returns only that district's orders", { got: regWalk.all.length, regDb });
  const regSum = await get(`/orders/summary?regionId=${reg2.id}`, admin);
  ok(regSum.body.totalOrders === regDb, "region summary count is exact", regSum.body.totalOrders);

  // Vendor: pages cover only own orders; summary revenue = delivered own item subtotals
  const vWalk = await walk(`/orders/vendor/${ids.va}`, vA, 25);
  const vDb = await prisma.order.count({ where: { items: { some: { vendorId: ids.va } } } });
  ok(vWalk.all.length === vDb && vWalk.all.every((o) => o.items.every((i) => i.vendorId === ids.va)), "vendor pages contain only own orders/items", { got: vWalk.all.length, vDb });
  const vLegacy = await get(`/orders/vendor/${ids.va}`, vA);
  ok(Array.isArray(vLegacy.body) && vLegacy.body.length === vDb, "legacy vendor endpoint (installed APKs) still returns an array");
  const vSum = await get("/orders/summary", vA);
  const vRev = Number((await prisma.orderItem.aggregate({ where: { vendorId: ids.va, order: { status: "DELIVERED" } }, _sum: { totalPrice: true } }))._sum.totalPrice);
  ok(vSum.body.totalOrders === vDb && Math.abs(vSum.body.totalRevenue - vRev) < 0.001, "vendor summary: own order count + delivered revenue", { s: vSum.body, vDb, vRev });

  // Customer
  await prisma.oTPVerification.create({ data: { phone: "8000000002", otp: "123456", expiresAt: new Date(Date.now() + 600000) } });
  const c2 = (await fetch(`${BASE}/auth/otp/verify`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone: "8000000002", otp: "123456" }) }).then((r) => r.json())).token;
  const cWalk = await walk("/orders/me", c2, 10);
  const cDb = await prisma.order.count({ where: { customerId: ids.c2 } });
  ok(cWalk.all.length === cDb && cWalk.all.every((o) => o.customerId === ids.c2), "customer /orders/me pages only own orders", { got: cWalk.all.length, cDb });
  const cSum = await get("/orders/summary", c2);
  ok(cSum.body.totalOrders === cDb, "customer summary is scoped to own orders", cSum.body.totalOrders);

  // cloud-sync: bounded orders + exact summary + paginated users
  const cs = await get("/cloud-sync", admin);
  const csOpen = cs.body.orders.filter((o) => !["DELIVERED", "CANCELLED"].includes(o.status)).length;
  ok(cs.body.orders.length <= 50 + dbOpen && cs.body.orders.length >= 50, "cloud-sync returns newest page + open orders only", cs.body.orders.length);
  ok(cs.body.orders.some((o) => o.id === oldestPending.id) && csOpen >= dbOpen, "cloud-sync includes every open order");
  ok(cs.body.ordersPage?.hasMore === true && typeof cs.body.ordersPage.nextCursor === "string", "cloud-sync exposes an orders cursor", cs.body.ordersPage);
  ok(cs.body.ordersSummary?.totalOrders === dbCount2, "cloud-sync ordersSummary is exact", cs.body.ordersSummary);
  const next = await get(`/orders?limit=50&cursor=${cs.body.ordersPage.nextCursor}`, admin);
  ok(next.body.orders.length > 0 && !next.body.orders.some((o) => cs.body.orders.slice(0, 50).some((q) => q.id === o.id)), "cloud-sync cursor continues seamlessly via /orders");
  const userCount = await prisma.user.count();
  ok(cs.body.usersPage?.total === userCount && cs.body.users.length === Math.min(userCount, 100), "cloud-sync users are paginated with exact total", cs.body.usersPage);
  const vcs = await get("/cloud-sync", vA);
  ok(vcs.body.users.length === 0 && vcs.body.usersPage === null && vcs.body.ordersSummary?.totalOrders === vDb, "vendor cloud-sync: no users, own summary");

  // Users endpoint
  const u1 = await get("/users?limit=3", admin);
  ok(u1.body.users.length === 3 && u1.body.hasMore === true, "users endpoint paginates", u1.body.users?.length);
  let uAll = [...u1.body.users], uc = u1.body.nextCursor;
  while (uc) { const r = await get(`/users?limit=3&cursor=${uc}`, admin); uAll.push(...r.body.users); uc = r.body.nextCursor; }
  ok(uAll.length === userCount && new Set(uAll.map((u) => u.id)).size === userCount && !JSON.stringify(uAll).includes('"password"'), "walking users returns each user once, no hashes");
  const uLegacy = await get("/users", admin);
  ok(Array.isArray(uLegacy.body) && uLegacy.body.length === userCount, "legacy /users still returns an array");

  console.log(`\n${pass} passed, ${fail} failed`);
  await prisma.$disconnect();
  process.exit(fail ? 1 : 0);
})().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(2); });
