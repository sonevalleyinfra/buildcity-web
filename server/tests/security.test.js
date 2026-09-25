// Exploit + regression suite. Every assertion states the SECURE / CORRECT behaviour.
const path = require("path");
const { execFileSync } = require("child_process");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const BASE = `http://localhost:${process.env.TEST_PORT || 5055}/api/v1`;

// Fixture login credentials (local test data only)
const CREDS = { admin: "admin123", vendorA: "vendorA123", vendorB: "vendorB123", vendorC: "vendorC123", dr: "drpass1" };
const ATTACKER_DEVICE = "attacker-device";
let pass = 0, fail = 0;
const ok = (cond, name, extra) => {
  if (cond) { pass++; console.log("PASS", name); }
  else { fail++; console.log("FAIL", name, extra !== undefined ? JSON.stringify(extra).slice(0, 300) : ""); }
};
const req = async (method, p, { token, body, headers = {} } = {}) => {
  const res = await fetch(BASE + p, {
    method,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json; try { json = JSON.parse(text); } catch { json = text; }
  return { status: res.status, body: json, headers: res.headers };
};
const hasPasswordField = (obj) => JSON.stringify(obj).includes('"password"');

async function otpLogin(phone) {
  await prisma.oTPVerification.create({ data: { phone, otp: "123456", expiresAt: new Date(Date.now() + 600000) } });
  const r = await req("POST", "/auth/otp/verify", { body: { phone, otp: "123456" } });
  return r;
}

(async () => {
  const ids = JSON.parse(execFileSync("node", [path.join(__dirname, "fixture.js")]).toString().trim().split("\n").pop());

  const admin = (await req("POST", "/auth/vendor/login", { body: { phone: "9999999999", password: CREDS.admin } })).body.token;
  const vaLogin = await req("POST", "/auth/vendor/login", { body: { phone: "9000000001", password: CREDS.vendorA } });
  const vA = vaLogin.body.token;
  ok(!!admin && !!vA, "admin + vendor login work");
  ok(!hasPasswordField(vaLogin.body), "vendor login response has no password hashes", vaLogin.body);

  const c1r = await otpLogin("8000000001");
  const c1 = c1r.body.token;
  ok(!!c1, "customer OTP login works");
  ok(!hasPasswordField(c1r.body), "OTP login response has no password field");
  const replay = await req("POST", "/auth/otp/verify", { body: { phone: "8000000001", otp: "123456" } });
  ok(replay.status === 401, "OTP cannot be replayed after successful use", replay.status);

  // --- Data leaks
  const nme = await req("GET", "/notifications/me", { token: c1 });
  ok(nme.status === 200 && !hasPasswordField(nme.body), "customer notifications/me leaks no password hash", nme.body);
  ok(nme.status === 200 && !JSON.stringify(nme.body).includes("For C2 only"), "customer can't see other customer's private notification");
  const nall = await req("GET", "/notifications", { token: c1 });
  ok(nall.status === 403, "customer cannot list ALL notifications", nall.status);
  const dbc = await req("GET", "/db-check");
  ok(dbc.status === 401, "db-check diagnostics require auth", dbc.status);

  // --- Profile IDOR
  await req("PUT", "/users/profile", { token: c1, body: { phone: "8000000002", name: "HACKED" } });
  const c2row = await prisma.user.findUnique({ where: { id: ids.c2 } });
  ok(c2row.name === "Cust Two", "customer cannot rename another user via /users/profile", c2row.name);
  const selfUpd = await req("PUT", "/users/profile", { token: c1, body: { phone: "8000000001", name: "Cust One Updated" } });
  ok(selfUpd.status === 200 && selfUpd.body.user?.name === "Cust One Updated", "customer can still update own profile", selfUpd.body);

  // --- Checkout impersonation + stock
  const co = await req("POST", "/orders/checkout", { token: c1, body: { customerId: ids.c2, items: [{ id: ids.la, name: "Cement Bag", quantity: 3 }], address: { street: "1 Road", fullName: "X", phone: "8000000001" }, regionId: ids.reg, idempotencyKey: "k-1" } });
  ok(co.status === 201, "checkout succeeds", co.body);
  const orderId = co.body.order?.id;
  const created = orderId && await prisma.order.findUnique({ where: { id: orderId }, include: { items: true } });
  ok(created && created.customerId === ids.c1, "checkout cannot place order on another customer's account", created?.customerId);
  ok(created && created.items[0].vendorProductId === ids.la, "order item is linked to its listing (vendorProductId)", created?.items?.[0]);
  const laAfter = await prisma.vendorProduct.findUnique({ where: { id: ids.la } });
  ok(Number(laAfter.stockQty) === 47, "checkout decremented stock of the right listing", laAfter.stockQty);
  const dup = await req("POST", "/orders/checkout", { token: c1, body: { items: [{ id: ids.la, quantity: 3 }], idempotencyKey: "k-1" } });
  ok(dup.body.isDuplicate === true && !hasPasswordField(dup.body), "idempotent replay returns same order, no password field");
  const c2 = (await otpLogin("8000000002")).body.token;
  const dupOther = await req("POST", "/orders/checkout", { token: c2, body: { items: [{ id: ids.la, quantity: 1 }], idempotencyKey: "k-1" } });
  ok(!(dupOther.body.isDuplicate && dupOther.body.order?.customerId === ids.c1), "idempotency key can't be used to read another customer's order", dupOther.body);
  const badQty = await req("POST", "/orders/checkout", { token: c1, body: { items: [{ id: ids.la, quantity: 2 }, { id: ids.lb, quantity: -1 }] } });
  const laAfterBad = await prisma.vendorProduct.findUnique({ where: { id: ids.la } });
  ok(badQty.status === 400 && Number(laAfterBad.stockQty) === 47, "failed checkout does not leak stock decrements", { s: badQty.status, stock: laAfterBad.stockQty });

  // --- Vendor isolation
  const pb = await req("PATCH", `/vendor/listings/${ids.lb}`, { token: vA, body: { price: 1 } });
  const lbRow = await prisma.vendorProduct.findUnique({ where: { id: ids.lb } });
  ok(pb.status === 403 && Number(lbRow.price) === 410, "vendor A cannot edit vendor B's listing", { s: pb.status, p: lbRow.price });
  const selfApprove = await req("PATCH", `/vendor/listings/${ids.laPending}`, { token: vA, body: { approvalStatus: "APPROVED", isActive: true, price: 950 } });
  const pend = await prisma.vendorProduct.findUnique({ where: { id: ids.laPending } });
  ok(pend.approvalStatus === "PENDING_REVIEW" && pend.isActive === false, "vendor cannot self-approve / activate a pending listing", pend);
  ok(selfApprove.status === 200 && Number(pend.price) === 950, "vendor can still edit own listing price", selfApprove.status);
  const newL = await req("POST", "/vendor/listings", { token: vA, body: { masterProductId: ids.mp, vendorId: ids.vb, price: 500, addedBy: "Admin" } });
  ok(newL.status === 201 && newL.body.vendorId === ids.va && newL.body.approvalStatus === "PENDING_REVIEW", "vendor-created listing is bound to own shop and needs approval", newL.body);

  const vob = await req("GET", `/orders/vendor/${ids.vb}`, { token: vA });
  ok(Array.isArray(vob.body) && !vob.body.some((o) => o.id === ids.orderB), "vendor A cannot read vendor B's orders", vob.body);
  const voa = await req("GET", `/orders/vendor/${ids.va}`, { token: vA });
  ok(Array.isArray(voa.body) && voa.body.some((o) => o.id === orderId), "vendor A still sees own orders", voa.body);
  const stB = await req("PATCH", `/orders/${ids.orderB}/status`, { token: vA, body: { status: "CANCELLED" } });
  const obRow = await prisma.order.findUnique({ where: { id: ids.orderB } });
  ok(stB.status === 403 && obRow.status === "PENDING", "vendor A cannot change status of vendor B's order", stB.status);
  const stA = await req("PATCH", `/orders/${orderId}/status`, { token: vA, body: { status: "CANCELLED" } });
  ok(stA.status === 200 && !hasPasswordField(stA.body), "vendor A can update own order; no password in response", stA.body);
  const laRestored = await prisma.vendorProduct.findUnique({ where: { id: ids.la } });
  const lbRestored = await prisma.vendorProduct.findUnique({ where: { id: ids.lb } });
  ok(Number(laRestored.stockQty) === 50 && Number(lbRestored.stockQty) === 50, "cancel restores stock to the exact listing only", { la: laRestored.stockQty, lb: lbRestored.stockQty });
  const badStatus = await req("PATCH", `/orders/${orderId}/status`, { token: admin, body: { status: "NOT_A_STATUS" } });
  ok(badStatus.status === 400, "invalid order status rejected with 400", badStatus.status);

  const cs = await req("GET", "/cloud-sync", { token: vA });
  ok(cs.status === 200 && !cs.body.orders.some((o) => o.id === ids.orderB), "vendor cloud-sync excludes other vendors' orders");
  ok(cs.status === 200 && cs.body.drs.length === 0 && cs.body.vendors.every((v) => v.id === ids.va), "vendor cloud-sync excludes DR/other-vendor directory", { drs: cs.body.drs?.length, v: cs.body.vendors?.map((v) => v.id) });
  const csAdmin = await req("GET", "/cloud-sync", { token: admin });
  ok(csAdmin.status === 200 && csAdmin.body.orders.length >= 2 && csAdmin.body.vendors.length === 2, "admin cloud-sync still returns everything");

  // --- FCM token endpoints
  const fcmAnon = await req("POST", "/vendor/fcm-token", { body: { vendorId: ids.vb, token: ATTACKER_DEVICE } });
  ok(fcmAnon.status === 401, "anonymous FCM token registration rejected", fcmAnon.status);
  const fcmHijack = await req("POST", "/vendor/fcm-token", { token: vA, body: { vendorId: ids.vb, token: ATTACKER_DEVICE } });
  const rows = await prisma.$queryRawUnsafe("SELECT vendor_id FROM vendor_fcm_tokens WHERE token = $1", ATTACKER_DEVICE).catch(() => []);
  ok(!rows.some((r) => r.vendor_id === ids.vb || r.vendor_id === ids.ub), "vendor A cannot bind a device to vendor B", { s: fcmHijack.status, rows });

  // --- Error hygiene
  const boom = await req("POST", "/users", { token: admin, body: { name: "no phone" } });
  ok(boom.status >= 400 && !/prisma|invocation|Argument/i.test(JSON.stringify(boom.body)), "server errors don't leak Prisma internals", boom.body);

  // --- Cache: cart writes must not bust the public catalog cache
  await req("GET", "/public-catalog");
  await req("PUT", "/cart", { token: c1, body: { items: [{ id: "x" }] } });
  const pc = await req("GET", "/public-catalog");
  ok(pc.headers.get("x-cache") === "HIT", "public catalog stays cached across cart writes", pc.headers.get("x-cache"));
  const cart = await req("GET", "/cart", { token: c1 });
  ok(cart.body.cartItems?.length === 1, "cart persisted", cart.body);

  // --- Brute force protection on partner password login
  let last;
  for (let i = 0; i < 12; i++) last = await req("POST", "/auth/vendor/login", { body: { phone: "9000000099", password: "wrong" + i } });
  ok(last.status === 429, "partner password login is rate limited", last.status);

  console.log(`\n${pass} passed, ${fail} failed`);
  await prisma.$disconnect();
  process.exit(fail ? 1 : 0);
})().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(2); });
