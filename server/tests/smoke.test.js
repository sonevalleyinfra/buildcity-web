// Regression smoke test for admin / DR / customer flows that the security fixes must not break.
const path = require("path");
const { execFileSync } = require("child_process");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const BASE = `http://localhost:${process.env.TEST_PORT || 5055}/api/v1`;
// Fixture login credentials (local test data only)
const CREDS = { admin: "admin123", vendorA: "vendorA123", vendorB: "vendorB123", vendorC: "vendorC123", dr: "drpass1" };
const DEVICE_B = "device-b";
let pass = 0, fail = 0;
const ok = (c, n, x) => { if (c) { pass++; console.log("PASS", n); } else { fail++; console.log("FAIL", n, x !== undefined ? JSON.stringify(x).slice(0, 300) : ""); } };
const req = async (method, p, { token, body, raw } = {}) => {
  const r = await fetch(BASE + p, { method, headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: raw ?? (body ? JSON.stringify(body) : undefined) });
  const t = await r.text(); let j; try { j = JSON.parse(t); } catch { j = t; }
  return { status: r.status, body: j };
};

(async () => {
  const ids = JSON.parse(execFileSync("node", [path.join(__dirname, "fixture.js")]).toString().trim().split("\n").pop());
  const admin = (await req("POST", "/auth/vendor/login", { body: { phone: "9999999999", password: CREDS.admin } })).body.token;

  // Admin creates a DR and a vendor, then both log in
  const dr = await req("POST", "/drs", { token: admin, body: { name: "DR One", phone: "7000000001", password: CREDS.dr, regionId: ids.reg } });
  ok(dr.status === 201 && !JSON.stringify(dr.body).includes("password"), "admin creates DR (no hash in response)", dr.body);
  const drTok = (await req("POST", "/auth/vendor/login", { body: { phone: "7000000001", password: CREDS.dr } })).body.token;
  ok(!!drTok, "DR can log in");
  const nv = await req("POST", "/vendors", { token: drTok, body: { shopName: "Shop C", ownerName: "C", phone: "9000000003", password: CREDS.vendorC, regionName: "Varanasi" } });
  ok(nv.status === 201, "DR creates vendor", nv.body);
  const vc = (await req("POST", "/auth/vendor/login", { body: { phone: "9000000003", password: CREDS.vendorC } })).body.token;
  ok(!!vc, "new vendor can log in");

  // Admin assigns listing to vendor C: auto-approved
  const al = await req("POST", "/vendor/listings", { token: admin, body: { masterProductId: ids.mp, vendorId: nv.body.id, price: 420, stockQty: 5, addedBy: "Admin" } });
  ok(al.status === 201 && al.body.approvalStatus === "APPROVED" && al.body.isActive === true && al.body.vendorId === nv.body.id, "admin-assigned listing is auto-approved for chosen vendor", al.body);
  const noMp = await req("POST", "/vendor/listings", { token: admin, body: { vendorId: nv.body.id, price: 1 } });
  ok(noMp.status === 400, "listing without master product rejected (no junk product created)", noMp.status);

  // Vendor C submits listing -> DR approves via status endpoint -> vendor can pause/resume
  const vl = await req("POST", "/vendor/listings", { token: vc, body: { masterProductId: ids.mp, price: 430, stockQty: 0 } });
  ok(vl.status === 201 && vl.body.approvalStatus === "PENDING_REVIEW" && vl.body.stockQty === 0, "vendor submission pending; stock 0 respected", vl.body);
  const appr = await req("PATCH", `/vendor/listings/${vl.body.id}/status`, { token: drTok, body: { approvalStatus: "APPROVED" } });
  ok(appr.status === 200 && appr.body.isActive === true, "DR approves listing", appr.body);
  const pause = await req("PATCH", `/vendor/listings/${vl.body.id}`, { token: vc, body: { isActive: false } });
  const resume = await req("PATCH", `/vendor/listings/${vl.body.id}`, { token: vc, body: { isActive: true, stockQty: 7 } });
  ok(pause.body.isActive === false && resume.body.isActive === true && resume.body.stockQty === 7, "vendor pauses/resumes approved listing", resume.body);
  const badPrice = await req("PATCH", `/vendor/listings/${vl.body.id}`, { token: vc, body: { price: -5 } });
  ok(badPrice.status === 400, "negative price rejected", badPrice.status);

  // Admin edits vendor + suspends; suspended vendor can't log in
  const sus = await req("PATCH", `/vendors/${nv.body.id}/status`, { token: admin, body: { status: "SUSPENDED" } });
  ok(sus.status === 200, "admin suspends vendor");
  const susLogin = await req("POST", "/auth/vendor/login", { body: { phone: "9000000003", password: CREDS.vendorC } });
  ok(susLogin.status === 403, "suspended vendor login blocked", susLogin.status);

  // Customer (legacy repo test flow) + addresses + orders
  await prisma.oTPVerification.create({ data: { phone: "9988776655", otp: "123456", expiresAt: new Date(Date.now() + 600000) } });
  const cv = await req("POST", "/auth/otp/verify", { body: { phone: "9988776655", otp: "123456", name: "Legacy Test" } });
  ok(cv.status === 200 && cv.body.user?.name === "Legacy Test", "new customer registers via OTP", cv.body);
  const ct = cv.body.token, cid = cv.body.user?.id;
  ok((await req("GET", "/users", { token: ct })).status === 403, "customer blocked from /users");
  ok((await req("GET", "/cloud-sync", { token: ct })).status === 403, "customer blocked from cloud-sync");
  ok((await req("GET", "/users/by-phone/9988776655", { token: ct })).status === 200, "customer reads own profile by phone");
  ok((await req("GET", `/addresses/${cid}`, { token: ct })).status === 200, "customer reads own addresses");
  ok((await req("GET", "/addresses/some-other-user-uuid-999", { token: ct })).status === 403, "customer blocked from others' addresses");
  const addr = await req("POST", "/addresses", { token: ct, body: { fullName: "L T", phone: "9988776655", street: "5 Lane", city: "Varanasi", pincode: "221001" } });
  ok(addr.status === 201, "customer saves address", addr.body);
  const co = await req("POST", "/orders/checkout", { token: ct, body: { items: [{ id: ids.lb, quantity: 2 }], address: { street: "5 Lane", fullName: "L T", phone: "9988776655" }, regionId: ids.reg } });
  ok(co.status === 201 && Number(co.body.order.totalAmount) === 2 * 410 + 49, "checkout computes server-side total incl. delivery", co.body.order?.totalAmount);
  const my = await req("GET", "/orders/me", { token: ct });
  ok(Array.isArray(my.body) && my.body.some((o) => o.id === co.body.order.id) && !JSON.stringify(my.body).includes('"password"'), "customer sees own order in /orders/me");
  const inactive = await req("POST", "/orders/checkout", { token: ct, body: { items: [{ id: ids.laPending, quantity: 1 }] } });
  ok(inactive.status === 400 && /not available/.test(inactive.body.error), "unapproved listing can't be ordered, with clear message", inactive.body);

  // Admin/DR order views
  const adminVendorOrders = await req("GET", `/orders/vendor/${ids.vb}`, { token: admin });
  ok(adminVendorOrders.body.length === 2 && adminVendorOrders.body.every((o) => o.items.every((i) => i.vendorId === ids.vb)), "admin views vendor B orders by id", adminVendorOrders.body.length);
  const vbTok = (await req("POST", "/auth/vendor/login", { body: { phone: "9000000002", password: CREDS.vendorB } })).body.token;
  const vbOrders = await req("GET", `/orders/vendor/garbage-id`, { token: vbTok });
  ok(vbOrders.body.length === 2, "vendor B gets own orders regardless of path id", vbOrders.body.length);
  ok((await req("GET", "/orders", { token: drTok })).status === 200, "DR lists orders");
  const deliver = await req("PATCH", `/orders/${co.body.order.id}/status`, { token: vbTok, body: { status: "DELIVERED" } });
  ok(deliver.status === 200 && deliver.body.status === "DELIVERED", "vendor B delivers own order");

  // Notifications / broadcasts
  const bc = await req("POST", "/notifications", { token: admin, body: { title: "Sale", message: "10% off" } });
  ok(bc.status === 201, "admin broadcasts notification");
  const cn = await req("GET", "/notifications/me", { token: ct });
  ok(cn.body.some((n) => n.title === "Sale"), "customer receives broadcast");
  ok((await req("GET", "/notifications", { token: admin })).status === 200, "admin lists all notifications");

  // Catalog, coupons, banners, reviews
  for (const ep of ["categories", "regions", "master-products", "vendor/listings", "coupons", "reviews", "banners", "public-catalog"]) {
    ok((await req("GET", "/" + ep)).status === 200, `public GET /${ep}`);
  }
  const rv = await req("POST", "/reviews", { token: ct, body: { productId: ids.lb, rating: 9, comment: "x" } });
  ok(rv.status === 400, "review rating out of range rejected", rv.status);
  const rv2 = await req("POST", "/reviews", { token: ct, body: { productId: ids.lb, rating: 4, comment: "Good" } });
  ok(rv2.status === 201, "valid review saved");
  const cp = await req("POST", "/coupons", { token: admin, body: { code: "new10", discountAmount: 10 } });
  ok(cp.status === 201 && cp.body.code === "NEW10", "admin creates coupon");
  const cat = await req("POST", "/categories", { token: admin, body: { name: "Tiles" } });
  const cats = await req("GET", "/categories");
  ok(cats.body.some((c) => c.name === "Tiles"), "catalog cache invalidated after admin mutation", cat.status);

  // FCM token flow for vendor (own), logout with token only
  const fcm = await req("POST", "/vendor/fcm-token", { token: vbTok, body: { vendorId: "whatever", token: DEVICE_B } });
  const bound = await prisma.$queryRawUnsafe("SELECT vendor_id FROM vendor_fcm_tokens WHERE token = $1", DEVICE_B);
  ok(fcm.status === 200 && bound.some((r) => r.vendor_id === ids.vb), "vendor registers own device", bound);
  const dereg = await req("POST", "/vendor/fcm-token/deregister", { body: { token: DEVICE_B } });
  const left = await prisma.$queryRawUnsafe("SELECT vendor_id FROM vendor_fcm_tokens WHERE token = $1", DEVICE_B);
  ok(dereg.status === 200 && left.length === 0, "logout unlinks device by token (legacy anonymous call)", left);
  const anonByVendor = await req("POST", "/vendor/fcm-token/deregister", { body: { vendorId: ids.vb } });
  ok(anonByVendor.status === 400, "anonymous unlink by vendorId refused", anonByVendor.status);

  // Hygiene
  const bad = await req("POST", "/cart", { token: ct, raw: "{not json" });
  ok(bad.status === 400 && bad.body.error === "Invalid JSON body", "malformed JSON -> JSON 400", bad.body);
  const nf = await req("GET", "/does-not-exist");
  ok(nf.status === 404 && nf.body.error === "Not found", "unknown API route -> JSON 404");
  ok((await req("GET", "/db-check", { token: admin })).status === 200, "admin can use db-check");

  // OTP request path (SMS send happens in background; gateway unreachable in test env)
  const otpReq = await req("POST", "/auth/otp/request", { body: { phone: "9988776600", type: "register" } });
  ok(otpReq.status === 200 && otpReq.body.success === true, "OTP request succeeds", otpReq.body);
  await new Promise((r) => setTimeout(r, 300));
  const rec = await prisma.oTPVerification.findMany({ where: { phone: "9988776600" } });
  ok(rec.length === 1 && /^\d{6}$/.test(rec[0].otp), "single 6-digit OTP stored", rec.length);

  console.log(`\n${pass} passed, ${fail} failed`);
  await prisma.$disconnect();
  process.exit(fail ? 1 : 0);
})().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(2); });
