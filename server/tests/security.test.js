// Exploit + regression suite. Every assertion states the SECURE / CORRECT behaviour.
const path = require("path");
const fs = require("fs");
const os = require("os");
const crypto = require("crypto");
const { execFileSync, spawn } = require("child_process");
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
// OTP rows are stored as "h1$" + HMAC(pepper, "phone:code"); computed here independently of src/otp.js
const pepper = () => (process.env.OTP_PEPPER && process.env.OTP_PEPPER.trim().length >= 16)
  ? process.env.OTP_PEPPER.trim()
  : crypto.createHmac("sha256", process.env.JWT_SECRET.trim()).update("buildcity-otp-pepper-v1").digest("hex");
const otpHash = (phone, code) => "h1$" + crypto.createHmac("sha256", pepper()).update(`${phone}:${code}`).digest("hex");
const otpRow = (phone, otp) => prisma.oTPVerification.create({ data: { phone, otp, expiresAt: new Date(Date.now() + 600000) } });

async function otpLogin(phone) {
  await otpRow(phone, otpHash(phone, "123456"));
  const r = await req("POST", "/auth/otp/verify", { body: { phone, otp: "123456" } });
  return r;
}

// --- OTP hardening (Security PR1)
const scenario = async (name, fn) => {
  try { await fn(); } catch (e) { ok(false, name, e && e.message); }
};
const LEGACY_KEYS = ["isRegistered", "notRegistered", "alreadyRegistered", "isStaffBlocked"];
const FLAG0_PORT = String(Number(process.env.TEST_PORT || 5055) + 2);

function otpUnit() {
  let otp;
  try { otp = require("../src/otp"); } catch (e) { ok(false, "src/otp.js loads", e && e.message); return; }
  const { planOtpRequest, isValidPhoneInput, normalizePhone } = otp;
  const UNIFORM = { success: true, message: "OTP dispatched", gateway: "AradhyaSMS", smsStatus: "dispatched" };
  const cases = [
    { who: "customer", existingRole: "CUSTOMER", isSpecial: false, issue: true },
    { who: "unknown", existingRole: null, isSpecial: false, issue: true },
    { who: "vendor", existingRole: "VENDOR", isSpecial: false, issue: false },
    { who: "dr", existingRole: "DR", isSpecial: false, issue: false },
    { who: "admin", existingRole: "ADMIN", isSpecial: false, issue: false },
    { who: "special", existingRole: null, isSpecial: true, issue: false },
  ];
  let uniform = true;
  const bad = [];
  for (const c of cases) {
    for (const type of ["login", "register"]) {
      const p = planOtpRequest({ phone10: "1000000999", type, existingRole: c.existingRole, isSpecial: c.isSpecial, legacyHints: false });
      try { require("assert").deepStrictEqual(p.body, UNIFORM); } catch { uniform = false; bad.push({ who: c.who, type, body: p.body }); }
      if (p.status !== 200 || p.issue !== c.issue) { uniform = false; bad.push({ who: c.who, type, status: p.status, issue: p.issue }); }
    }
  }
  ok(uniform, "planOtpRequest(legacyHints:false): uniform 200 body; no OTP issued for staff/special", bad);

  const L = (o) => planOtpRequest({ phone10: "1000000999", type: "login", existingRole: null, isSpecial: false, legacyHints: true, ...o });
  const sp = L({ isSpecial: true });
  ok(sp.status === 403 && !sp.issue && sp.body.isStaffBlocked === true && /Special Admin and DR/.test(sp.body.error), "legacy: special number -> 403 isStaffBlocked", sp);
  const st = L({ existingRole: "VENDOR" });
  ok(st.status === 403 && !st.issue && st.body.isStaffBlocked === true && /Vendor, DR, and Admin/.test(st.body.error), "legacy: staff -> 403 isStaffBlocked", st);
  const nr = L({});
  ok(nr.status === 200 && !nr.issue && nr.body.success === false && nr.body.notRegistered === true, "legacy: login unknown -> notRegistered", nr);
  const ar = L({ type: "register", existingRole: "CUSTOMER" });
  ok(ar.status === 200 && !ar.issue && ar.body.success === false && ar.body.alreadyRegistered === true, "legacy: register existing -> alreadyRegistered", ar);
  const li = L({ existingRole: "CUSTOMER" });
  ok(li.status === 200 && li.issue && li.body.success === true && li.body.isRegistered === true && li.body.message === "OTP dispatched to +91 1000000999", "legacy: login customer -> issued, isRegistered", li);
  const ri = L({ type: "register" });
  ok(ri.status === 200 && ri.issue && ri.body.isRegistered === false && ri.body.gateway === "AradhyaSMS" && ri.body.smsStatus === "dispatched", "legacy: register unknown -> issued", ri);

  const valid = ["9876543210", "+91 98765 43210", "09876543210", " 9876543210", "919876543210", "+919876543210"];
  const invalid = ["98765", "", null, undefined, "123456789012345", "19876543210", "929876543210", "abc"];
  ok(valid.every(isValidPhoneInput) && !invalid.some(isValidPhoneInput), "isValidPhoneInput matrix", { valid: valid.map(isValidPhoneInput), invalid: invalid.map(isValidPhoneInput) });
  const norm = ["+91 98765 43210", "09876543210", " 9876543210", "+919876543210", "9876543210"].map(normalizePhone);
  ok(norm.every((n) => n === "9876543210") && normalizePhone(null) === "" && normalizePhone("98765") === "98765", "normalizePhone variants", norm);
}

async function startFlag0Server() {
  const stubLog = path.join(fs.mkdtempSync(path.join(process.env.TMPDIR || os.tmpdir(), "otpflag0-")), "net.log");
  const env = {
    ...process.env, PORT: FLAG0_PORT, TEST_PORT: FLAG0_PORT, APP_ENV: "test", NODE_ENV: "test",
    LEGACY_OTP_HINTS: "0", OTP_PLAINTEXT_COMPAT_MS: "0", SMS_RELAY_SECRET: "", STUB_LOG: stubLog,
    NODE_OPTIONS: `-r ${path.join(__dirname, "stubnet.js")}`,
  };
  const server = spawn("node", ["src/index.js"], { cwd: path.join(__dirname, ".."), env, stdio: ["ignore", "ignore", "inherit"] });
  let up = false;
  for (let i = 0; i < 60 && !up; i++) {
    try { up = (await fetch(`http://localhost:${FLAG0_PORT}/health`)).ok; } catch {}
    if (!up) await new Promise((r) => setTimeout(r, 200));
  }
  return { server, up };
}
const reqAt = (port) => async (method, p, opts = {}) => {
  const res = await fetch(`http://localhost:${port}/api/v1${p}`, { method, headers: { "Content-Type": "application/json" }, body: opts.body ? JSON.stringify(opts.body) : undefined });
  const text = await res.text();
  let json; try { json = JSON.parse(text); } catch { json = text; }
  return { status: res.status, body: json };
};
const rowsFor = (phone) => prisma.oTPVerification.findMany({ where: { phone } });

async function otpHardening() {
  otpUnit();

  await scenario("a) verify limiter keys on the normalized phone", async () => {
    const P = "8100000001";
    await otpRow(P, otpHash(P, "123456"));
    const variants = ["+91" + P, "0" + P, " " + P, "+91 " + P];
    let last;
    for (let i = 0; i < 11; i++) last = await req("POST", "/auth/otp/verify", { body: { phone: variants[i % 4], otp: String(200000 + i) } });
    ok(last.status === 429, "a) 11th verify across phone variants is rate limited (429)", last.status);
  });

  await scenario("b) attempt cap", async () => {
    const P = "8100000002";
    await otpRow(P, otpHash(P, "123456"));
    const st = [];
    for (let i = 0; i < 5; i++) st.push((await req("POST", "/auth/otp/verify", { body: { phone: P, otp: String(300000 + i) } })).status);
    ok(st.every((s) => s === 401), "b) 5 wrong codes -> 401", st);
    const right = await req("POST", "/auth/otp/verify", { body: { phone: P, otp: "123456" } });
    ok(right.status === 401 && !right.body.token, "b) correct code after 5 wrong attempts -> 401, no token", right);
    const rows = await rowsFor(P);
    ok(rows.length === 0 || rows[0].attempts === 5, "b) row attempts is 5 (or row gone)", rows.map((r) => r.attempts));
  });

  await scenario("c) parallel verify", async () => {
    const P = "8100000003";
    await prisma.user.create({ data: { phone: P, name: "Race Cust", role: "CUSTOMER" } });
    await otpRow(P, otpHash(P, "123456"));
    const rs = await Promise.all([0, 1].map(() => req("POST", "/auth/otp/verify", { body: { phone: P, otp: "123456" } })));
    const st = rs.map((r) => r.status).sort();
    ok(st[0] === 200 && st[1] === 401, "c) two parallel verifies with the right code -> exactly one 200", st);
    const replay = await req("POST", "/auth/otp/verify", { body: { phone: P, otp: "123456" } });
    ok(replay.status === 401, "d) replay after parallel verify -> 401", replay.status);
  });

  await scenario("e) request validation + limiter", async () => {
    const t1 = await req("POST", "/auth/otp/request", { body: { phone: "1000000301", type: "admin" } });
    const t2 = await req("POST", "/auth/otp/request", { body: { phone: "1000000301", type: 123 } });
    ok(t1.status === 400 && t2.status === 400, "e) unknown/non-string OTP type -> 400", [t1, t2]);
    const P = "1000000302";
    const variants = [P, "+91" + P, "0" + P, " " + P, "+91 " + P];
    const st = [];
    for (const v of variants) st.push((await req("POST", "/auth/otp/request", { body: { phone: v, type: "register" } })).status);
    ok(st.every((s) => s === 200), "e) request accepts phone variants", st);
    const sixth = await req("POST", "/auth/otp/request", { body: { phone: P, type: "register" } });
    ok(sixth.status === 429, "e) 6th request for the same normalized phone -> 429", sixth.status);
  });

  await scenario("g1) hashed OTP at rest", async () => {
    const P = "1000000303";
    const r = await req("POST", "/auth/otp/request", { body: { phone: P, type: "register" } });
    const rows = await rowsFor(P);
    ok(r.status === 200 && rows.length === 1 && !/^\d{6}$/.test(rows[0].otp) && !rows[0].otp.includes("654321") && rows[0].otp === otpHash(P, "654321"),
      "g1) OTP row is stored hashed", { s: r.status, rows: rows.map((x) => x.otp) });
    const v = await req("POST", "/auth/otp/verify", { body: { phone: P, otp: "654321" } });
    ok(v.status === 200 && !!v.body.token, "g1) hashed OTP verifies", v.status);
  });

  await scenario("g2) plaintext compat window open", async () => {
    const P = "8100000004";
    await otpRow(P, "123456");
    const v = await req("POST", "/auth/otp/verify", { body: { phone: P, otp: "123456" } });
    ok(v.status === 200, "g2) legacy plaintext row verifies inside the compat window", v.status);
  });

  let flag0;
  try {
    flag0 = await startFlag0Server();
    ok(flag0.up, "flag-0 server started");
    const r0 = reqAt(FLAG0_PORT);

    await scenario("f) no enumeration", async () => {
      await prisma.user.create({ data: { phone: "1000000401", name: "Enum Cust", role: "CUSTOMER" } });
      await prisma.user.create({ data: { phone: "1000000402", name: "Enum Vendor", role: "VENDOR" } });
      await prisma.user.create({ data: { phone: "1000000403", name: "Enum DR", role: "DR" } });
      const calls = [
        ["1000000401", "login"], ["1000000402", "login"], ["1000000403", "login"], ["1000000404", "login"],
        ["1000000401", "register"], ["1000000404", "register"],
      ];
      const out = [];
      for (const [phone, type] of calls) out.push(await r0("POST", "/auth/otp/request", { body: { phone, type } }));
      const bodies = out.map((r) => JSON.stringify(r.body));
      ok(out.every((r) => r.status === 200) && bodies.every((b) => b === bodies[0]), "f) identical 200 response for customer/staff/unknown, login/register", out);
      ok(out.every((r) => LEGACY_KEYS.every((k) => !(r.body && k in r.body))), "f) no registration/staff hints in the response", out.map((r) => r.body));
      const staffRows = [...(await rowsFor("1000000402")), ...(await rowsFor("1000000403"))];
      ok(staffRows.length === 0, "f) staff numbers get no OTP row", staffRows.length);
      const cRows = await rowsFor("1000000401"), uRows = await rowsFor("1000000404");
      ok(cRows.length === 1 && uRows.length === 1 && cRows[0].otp === otpHash("1000000401", "654321") && uRows[0].otp === otpHash("1000000404", "654321"),
        "f) customer and unknown each have one hashed row", { c: cRows.length, u: uRows.length });
      const v = await r0("POST", "/auth/otp/verify", { body: { phone: "1000000404", otp: "654321" } });
      const u = await prisma.user.findUnique({ where: { phone: "1000000404" } });
      ok(v.status === 200 && !!v.body.token && u && u.role === "CUSTOMER", "f) unknown number verifies and becomes a CUSTOMER", { s: v.status, role: u && u.role });
    });

    await scenario("f2) special numbers", async () => {
      const ref = await r0("POST", "/auth/otp/request", { body: { phone: "9876500000" } });
      const outs = [await r0("POST", "/auth/otp/request", { body: { phone: "9999999999" } }), await r0("POST", "/auth/otp/request", { body: { phone: "7777777777" } })];
      const rows = [...(await rowsFor("9999999999")), ...(await rowsFor("7777777777"))];
      ok(outs.every((o) => o.status === ref.status && JSON.stringify(o.body) === JSON.stringify(ref.body)) && rows.length === 0,
        "f2) special numbers look like any other non-test number off-prod, no row", { ref, outs, rows: rows.length });
    });

    await scenario("g3) plaintext compat window closed", async () => {
      const P = "8100000005";
      await otpRow(P, "123456");
      const v = await r0("POST", "/auth/otp/verify", { body: { phone: P, otp: "123456" } });
      ok(v.status === 401, "g3) plaintext row rejected once the compat window is closed", v.status);
    });
  } catch (e) {
    ok(false, "flag-0 server scenarios", e && e.message);
  } finally {
    if (flag0) flag0.server.kill("SIGTERM");
  }
}

// --- Push binding (Security PR2)
const custRows = (where, arg) => prisma.$queryRawUnsafe(`SELECT user_id, token FROM customer_fcm_tokens WHERE ${where}`, arg).catch(() => []);
const vendRows = (where, arg) => prisma.$queryRawUnsafe(`SELECT vendor_id, token FROM vendor_fcm_tokens WHERE ${where}`, arg).catch(() => []);

async function pushBinding(ids, { admin, vA, c1, c2 }) {
  const run = Date.now();
  const tok = (name) => `pr2-${name}-${run}`;
  const jwt = require("jsonwebtoken");

  // Vendor C in another district, and a DR for the fixture's Varanasi region
  const mzp = await prisma.region.create({ data: { name: `Mirzapur ${run}` } });
  const uc = await prisma.user.create({ data: { phone: "9000000003", name: "Vendor C", role: "VENDOR" } });
  const vc = await prisma.vendor.create({ data: { userId: uc.id, shopName: "Shop C", ownerName: "C", phone: "9000000003", regionId: mzp.id, status: "APPROVED" } });
  const drUser = await prisma.user.create({ data: { phone: "9100000001", name: "DR One", role: "DR" } });
  await prisma.dR.create({ data: { userId: drUser.id, name: "DR One", phone: "9100000001", regionId: ids.reg } });
  const dr = jwt.sign({ sub: drUser.id, phone: "9100000001", role: "DR", tv: 1 }, process.env.JWT_SECRET.trim(), { expiresIn: "1h" });

  const C2_DEVICE = tok("c2");
  await scenario("a) anonymous customer device-token registration", async () => {
    const seed = await req("POST", "/notifications/device-token", { token: c2, body: { token: C2_DEVICE } });
    ok(seed.status === 200, "c2 registers own device", seed.status);
    const T = tok("anon");
    const r = await req("POST", "/notifications/device-token", { body: { userId: ids.c2, phone: "8000000002", token: T } });
    ok(r.status === 401, "anonymous device-token registration rejected", r.status);
    ok((await custRows("token = $1", T)).length === 0, "anonymous device-token stores nothing");
    const own = await custRows("user_id = $1", ids.c2);
    ok(own.length === 1 && own[0].token === C2_DEVICE, "c2's device row unchanged after anonymous attempt", own);
  });

  await scenario("b) customer cannot bind a device to another customer", async () => {
    const T2 = tok("hijack");
    const r = await req("POST", "/notifications/device-token", { token: c1, body: { userId: ids.c2, phone: "8000000002", token: T2 } });
    const rows = await custRows("token = $1", T2);
    ok(r.status === 200 && rows.length === 1 && rows[0].user_id === ids.c1, "device-token binds to the JWT customer only", { s: r.status, rows });
    const own = await custRows("user_id = $1", ids.c2);
    ok(own.length === 1 && own[0].token === C2_DEVICE, "c2's device row survives c1's body userId", own);
  });

  await scenario("c) customer device-token deregister", async () => {
    const byId = await req("POST", "/notifications/device-token/deregister", { body: { userId: ids.c2 } });
    let own = await custRows("user_id = $1", ids.c2);
    ok((byId.status === 400 || byId.status === 401) && own.length === 1, "anonymous deregister by userId rejected", { s: byId.status, own });
    await req("POST", "/notifications/device-token/deregister", { body: { userId: ids.c2, token: tok("other") } });
    own = await custRows("user_id = $1", ids.c2);
    ok(own.length === 1 && own[0].token === C2_DEVICE, "anonymous deregister with another token leaves c2's row", own);
    const exact = await req("POST", "/notifications/device-token/deregister", { body: { token: C2_DEVICE } });
    own = await custRows("user_id = $1", ids.c2);
    ok(exact.status === 200 && own.length === 0, "anonymous deregister with the exact token unlinks the device", { s: exact.status, own });
    await req("POST", "/notifications/device-token", { token: c2, body: { token: C2_DEVICE } });
    const self = await req("POST", "/notifications/device-token/deregister", { token: c1, body: {} });
    const c1Rows = await custRows("user_id = $1", ids.c1);
    own = await custRows("user_id = $1", ids.c2);
    ok(self.status === 200 && c1Rows.length === 0 && own.length === 1, "authenticated deregister removes only own rows", { s: self.status, c1Rows, own });
    const long = await req("POST", "/notifications/device-token", { token: c1, body: { token: "x".repeat(4097) } });
    ok(long.status === 400, "over-long device token rejected", long.status);
  });

  await scenario("d) vendor fcm-token binding by role", async () => {
    const TC = tok("dr-c");
    const drC = await req("POST", "/vendor/fcm-token", { token: dr, body: { vendorId: vc.id, token: TC } });
    ok(drC.status === 403 && (await vendRows("token = $1", TC)).length === 0, "DR cannot bind a device to a vendor outside own district", drC.status);
    const TA = tok("dr-a");
    const drA = await req("POST", "/vendor/fcm-token", { token: dr, body: { vendorId: ids.va, token: TA } });
    const aRows = await vendRows("token = $1", TA);
    ok(drA.status === 200 && aRows.some((r) => r.vendor_id === ids.va), "DR binds a device to a vendor in own district", { s: drA.status, aRows });
    const TX = tok("dr-x");
    const drX = await req("POST", "/vendor/fcm-token", { token: dr, body: { vendorId: "no-such-vendor", token: TX } });
    ok(drX.status === 404 && (await vendRows("vendor_id = $1", "no-such-vendor")).length === 0, "DR cannot bind a device to a non-existent vendor", drX.status);
    const TV = tok("va-b");
    await req("POST", "/vendor/fcm-token", { token: vA, body: { vendorId: ids.vb, token: TV } });
    const vRows = await vendRows("token = $1", TV);
    ok(vRows.length > 0 && vRows.every((r) => r.vendor_id === ids.va || r.vendor_id === ids.ua), "vendor A's device binds to vendor A only", vRows);
    const TAD = tok("admin-c");
    const adC = await req("POST", "/vendor/fcm-token", { token: admin, body: { vendorId: vc.id, token: TAD } });
    ok(adC.status === 200 && (await vendRows("token = $1", TAD)).some((r) => r.vendor_id === vc.id), "admin binds a device to any vendor", adC.status);

    const drDeC = await req("POST", "/vendor/fcm-token/deregister", { token: dr, body: { vendorId: vc.id } });
    ok(drDeC.status === 403 && (await vendRows("vendor_id = $1", vc.id)).length === 1, "DR cannot unlink a vendor outside own district", drDeC.status);
    const drDeA = await req("POST", "/vendor/fcm-token/deregister", { token: dr, body: { vendorId: ids.va } });
    ok(drDeA.status === 200 && (await vendRows("vendor_id = $1", ids.va)).length === 0, "DR unlinks a vendor in own district", drDeA.status);
    const anon = await req("POST", "/vendor/fcm-token/deregister", { body: { vendorId: vc.id } });
    ok(anon.status === 400 && (await vendRows("vendor_id = $1", vc.id)).length === 1, "anonymous unlink by vendorId rejected", anon.status);
  });

  await scenario("e) push token lookups are exact", async () => {
    process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "pr2-push-"));
    const push = require("../src/pushService");
    push.setPrismaClient(prisma);
    const TB = tok("vb");
    await push.getTokenForVendor("warm-up-table"); // creates the token tables if missing
    await prisma.$executeRawUnsafe("DELETE FROM vendor_fcm_tokens WHERE vendor_id = ANY($1::text[])", [ids.vb, ids.ub]);
    await prisma.$executeRawUnsafe("INSERT INTO vendor_fcm_tokens (vendor_id, token, phone) VALUES ($1, $2, $3)", ids.vb, TB, "9000000002");
    ok(await push.getTokenForVendor("no-such-vendor", "0000002") === null, "vendor lookup ignores a 7-digit phone substring");
    ok(await push.getTokenForVendor("no-such-vendor", "900000000") === null, "vendor lookup ignores a 9-digit phone prefix");
    ok(await push.getTokenForVendor(ids.vb) === TB, "vendor lookup by id");
    ok(await push.getTokenForVendor("no-such-vendor", "9000000002") === TB, "vendor lookup by exact phone");
    ok(await push.getTokenForVendor("no-such-vendor", "+91 90000 00002") === TB, "vendor lookup by +91 formatted phone");

    const TCU = tok("cust");
    await prisma.$executeRawUnsafe("DELETE FROM customer_fcm_tokens WHERE phone = $1", "8000000002");
    await prisma.$executeRawUnsafe("INSERT INTO customer_fcm_tokens (user_id, token, phone) VALUES ($1, $2, $3)", `pr2-user-${run}`, TCU, "8000000002");
    ok(await push.getTokenForCustomer(null, "0000002") === null, "customer lookup ignores a phone substring");
    ok(await push.getTokenForCustomer(null, "8000000002") === TCU, "customer lookup by exact phone");

    const TS = tok("save");
    await push.saveToken("no-such-vendor", TS, "0000002");
    const sRows = await vendRows("token = $1", TS);
    ok(!sRows.some((r) => r.vendor_id === ids.vb || r.vendor_id === ids.ub), "saveToken does not resolve a vendor by phone substring", sRows);
  });

  return { dr, drUser, vc, mzp, run };
}

// --- DR scope (Security PR3): a DR never sees or changes more than its own district; scope failures fail closed
async function drScope(ids, { admin, dr, drUser, vc, mzp, run }) {
  const jwt = require("jsonwebtoken");
  const bcrypt = require("bcryptjs");
  const mint = (u) => jwt.sign({ sub: u.id, phone: u.phone, role: "DR", tv: 1 }, process.env.JWT_SECRET.trim(), { expiresIn: "1h" });
  const body = (r) => JSON.stringify(r.body);

  // Returns: one on vendor B's order (Varanasi), one on an order whose only vendor is C (Mirzapur)
  const orderC = await prisma.order.create({
    data: { customerId: ids.c2, totalAmount: 300, items: { create: [{ vendorId: vc.id, productName: "Cement Bag", priceAtPurchase: 300, quantity: 1, totalPrice: 300 }] } },
  });
  const retData = (orderId, customerPhone) => ({ orderId, customerPhone, returnAmount: 100, netRefundCash: 100, returnItems: [] });
  const retVar = await prisma.orderReturn.create({ data: retData(ids.orderB, "8000000001") });
  const retMzp = await prisma.orderReturn.create({ data: retData(orderC.id, "8000000002") });

  // A user whose role is DR but who has no district_representatives row
  const ghostUser = await prisma.user.create({ data: { phone: "9100000009", name: "Ghost DR", role: "DR" } });
  const ghost = mint(ghostUser);

  await scenario("a) DR without a district row fails closed on returns", async () => {
    const list = await req("GET", "/returns", { token: ghost });
    ok(list.status === 200 && Array.isArray(list.body) && list.body.length === 0, "ghost DR GET /returns -> 200 []", { s: list.status, n: list.body?.length });
    const search = await req("GET", "/returns/search?q=8000000001", { token: ghost });
    ok(search.status === 200 && Array.isArray(search.body) && search.body.length === 0, "ghost DR GET /returns/search -> empty result", { s: search.status, n: search.body?.length });
  });

  await scenario("a2) returns are district scoped for DRs, unscoped for admin", async () => {
    const mine = await req("GET", "/returns", { token: dr });
    const mineIds = (mine.body || []).map((r) => r.id);
    ok(mine.status === 200 && mineIds.includes(retVar.id) && !mineIds.includes(retMzp.id), "DR One sees the Varanasi return, not the Mirzapur one", mineIds);
    const all = await req("GET", "/returns", { token: admin });
    const allIds = (all.body || []).map((r) => r.id);
    ok(all.status === 200 && allIds.includes(retVar.id) && allIds.includes(retMzp.id), "admin sees every district's returns", allIds);
  });

  await scenario("c) district aliases match whole names only", async () => {
    const kas = await prisma.region.create({ data: { name: `Kashipur ${run}` } });
    const uk = await prisma.user.create({ data: { phone: "9000000011", name: "Vendor K", role: "VENDOR" } });
    const vk = await prisma.vendor.create({ data: { userId: uk.id, shopName: "Shop K", ownerName: "K", phone: "9000000011", regionId: kas.id, status: "APPROVED", commissionRate: 10 } });
    const ban = await prisma.region.findFirst({ where: { name: "Banaras" } }) || await prisma.region.create({ data: { name: "Banaras" } });
    const ubn = await prisma.user.create({ data: { phone: "9000000012", name: "Vendor Bn", role: "VENDOR" } });
    const vbn = await prisma.vendor.create({ data: { userId: ubn.id, shopName: "Shop Bn", ownerName: "Bn", phone: "9000000012", regionId: ban.id, status: "APPROVED" } });
    await req("POST", "/regions", { token: admin, body: { name: `noop-${run}` } }); // any admin write clears the DR scope cache

    const list = await req("GET", "/vendors", { token: dr });
    const vIds = (list.body || []).map((v) => v.id);
    ok(list.status === 200 && !vIds.includes(vk.id), "DR One (Varanasi) does not see a vendor in 'Kashipur'", vIds);
    ok(vIds.includes(vbn.id) && vIds.includes(ids.va), "DR One still sees vendors in the 'Banaras' alias region", vIds);
    const patch = await req("PATCH", `/vendors/${vk.id}`, { token: dr, body: { commissionRate: 1 } });
    const vkRow = await prisma.vendor.findUnique({ where: { id: vk.id } });
    ok(patch.status === 403 && Number(vkRow.commissionRate) === 10, "DR One cannot change a 'Kashipur' vendor's commission", { s: patch.status, c: vkRow.commissionRate });
  });

  await scenario("d) DR directory shows a DR only itself", async () => {
    const u2 = await prisma.user.create({ data: { phone: "9100000002", name: "DR Two", role: "DR", email: `dr2-${run}@example.test` } });
    const dr2 = await prisma.dR.create({ data: { userId: u2.id, name: "DR Two", phone: "9100000002", regionId: mzp.id } });
    // A co-DR in the same district (alias region) whose contact details must not reach DR One either
    const ban = await prisma.region.findFirst({ where: { name: "Banaras" } }) || await prisma.region.create({ data: { name: "Banaras" } });
    const u3 = await prisma.user.create({ data: { phone: "9100000003", name: "DR Three", role: "DR", email: `dr3-${run}@example.test` } });
    const dr3 = await prisma.dR.create({ data: { userId: u3.id, name: "DR Three", phone: "9100000003", regionId: ban.id } });
    await req("POST", "/regions", { token: admin, body: { name: `noop2-${run}` } });

    const own = await req("GET", "/drs", { token: dr });
    const leaked = ["9100000002", "9100000003", `dr2-${run}`, `dr3-${run}`].filter((x) => body(own).includes(x));
    ok(own.status === 200 && Array.isArray(own.body) && own.body.length === 1 && own.body[0].userId === drUser.id && leaked.length === 0, "DR One GET /drs -> only its own record, no co-DR contacts", { s: own.status, n: own.body?.length, leaked });
    const all = await req("GET", "/drs", { token: admin });
    const allIds = (all.body || []).map((d) => d.id);
    ok(all.status === 200 && allIds.includes(dr2.id) && allIds.includes(dr3.id) && allIds.length >= 3, "admin GET /drs lists every DR", allIds.length);
    const sync = await req("GET", "/cloud-sync", { token: dr });
    const syncDrs = sync.body?.drs || [];
    ok(sync.status === 200 && syncDrs.length === 1 && syncDrs[0].userId === drUser.id && !body({ body: syncDrs }).includes("9100000003"), "DR One cloud-sync drs -> only DR One", syncDrs.map((d) => d.name));
    const ghostDrs = await req("GET", "/drs", { token: ghost });
    ok(ghostDrs.status === 200 && Array.isArray(ghostDrs.body) && ghostDrs.body.length === 0, "ghost DR GET /drs -> []", { s: ghostDrs.status, n: ghostDrs.body?.length });
  });

  await scenario("e) master catalog writes are admin-only", async () => {
    const name = `DR MP ${run}`;
    const post = await req("POST", "/master-products", { token: dr, body: { name, suggestedPrice: 10 } });
    const made = await prisma.productMaster.count({ where: { name } });
    ok(post.status === 403 && made === 0, "DR POST /master-products -> 403, nothing created", { s: post.status, made });

    const mpBefore = await prisma.productMaster.findUnique({ where: { id: ids.mp } });
    const listBefore = await prisma.vendorProduct.findMany({ where: { masterProductId: ids.mp }, select: { id: true, description: true, imageUrl: true }, orderBy: { id: "asc" } });
    const patch = await req("PATCH", `/master-products/${ids.mp}`, { token: dr, body: { name: "Hijacked", description: "hijacked", imageUrl: "https://evil.example/x.png" } });
    const mpAfter = await prisma.productMaster.findUnique({ where: { id: ids.mp } });
    const listAfter = await prisma.vendorProduct.findMany({ where: { masterProductId: ids.mp }, select: { id: true, description: true, imageUrl: true }, orderBy: { id: "asc" } });
    ok(patch.status === 403 && mpAfter.name === mpBefore.name && mpAfter.description === mpBefore.description, "DR PATCH /master-products -> 403, master row unchanged", { s: patch.status, name: mpAfter.name });
    ok(JSON.stringify(listAfter) === JSON.stringify(listBefore), "DR PATCH /master-products leaves every vendor listing unchanged");

    const aPost = await req("POST", "/master-products", { token: admin, body: { name: `Admin MP ${run}`, suggestedPrice: 10 } });
    ok(aPost.status === 201, "admin POST /master-products -> 201", aPost.status);
    const aPatch = await req("PATCH", `/master-products/${ids.mp}`, { token: admin, body: { name: "Cement Bag Renamed" } });
    ok(aPatch.status === 200 && aPatch.body.name === "Cement Bag Renamed", "admin PATCH /master-products -> 200", aPatch.status);
    await req("PATCH", `/master-products/${ids.mp}`, { token: admin, body: { name: mpBefore.name } });

    const listing = await req("POST", "/vendor/listings", { token: dr, body: { masterProductId: ids.mp, vendorId: ids.va, price: 420, stockQty: 5 } });
    ok(listing.status === 201 && listing.body.vendorId === ids.va, "DR can still add a listing from the master catalog for an own-district vendor", { s: listing.status });
  });

  await scenario("f) DR keeps commission edits and password resets in own district only", async () => {
    const oldHash = await bcrypt.hash("OldPass#1", 4);
    const ud = await prisma.user.create({ data: { phone: "9000000013", name: "Vendor D", role: "VENDOR", password: oldHash } });
    const vd = await prisma.vendor.create({ data: { userId: ud.id, shopName: "Shop D", ownerName: "D", phone: "9000000013", password: oldHash, regionId: ids.reg, status: "APPROVED", commissionRate: 10 } });

    const com = await req("PATCH", `/vendors/${vd.id}`, { token: dr, body: { commissionRate: 7 } });
    const vdRow = await prisma.vendor.findUnique({ where: { id: vd.id } });
    ok(com.status === 200 && Number(vdRow.commissionRate) === 7, "DR sets commission of an own-district vendor", { s: com.status, c: vdRow.commissionRate });
    const pw = await req("PATCH", `/vendors/${vd.id}`, { token: dr, body: { password: "NewPass#123" } });
    const vdAfter = await prisma.vendor.findUnique({ where: { id: vd.id } });
    const udAfter = await prisma.user.findUnique({ where: { id: ud.id } });
    ok(pw.status === 200 && await bcrypt.compare("NewPass#123", vdAfter.password) && await bcrypt.compare("NewPass#123", udAfter.password), "DR resets an own-district vendor's password (vendor + user rows)", pw.status);

    const vcBefore = await prisma.vendor.findUnique({ where: { id: vc.id } });
    const ucBefore = await prisma.user.findUnique({ where: { id: vcBefore.userId } });
    const comC = await req("PATCH", `/vendors/${vc.id}`, { token: dr, body: { commissionRate: 7 } });
    const pwC = await req("PATCH", `/vendors/${vc.id}`, { token: dr, body: { password: "NewPass#123" } });
    const vcAfter = await prisma.vendor.findUnique({ where: { id: vc.id } });
    const ucAfter = await prisma.user.findUnique({ where: { id: vcBefore.userId } });
    ok(comC.status === 403 && pwC.status === 403, "DR cannot edit commission or password of an out-of-district vendor", { com: comC.status, pw: pwC.status });
    ok(String(vcAfter.commissionRate) === String(vcBefore.commissionRate) && vcAfter.password === vcBefore.password && ucAfter.password === ucBefore.password, "out-of-district vendor's commission and hash unchanged");
  });

  await scenario("g) scoped DR still sees own-district orders", async () => {
    const orders = await req("GET", "/orders", { token: dr });
    ok(orders.status === 200 && (orders.body || []).some((o) => o.id === ids.orderB) && !(orders.body || []).some((o) => o.id === orderC.id), "DR One GET /orders includes orderB, not the Mirzapur order", orders.status);
    const short = ids.orderB.slice(-6);
    const byId = await req("GET", `/returns/search?q=${short}`, { token: dr });
    ok(byId.status === 200 && byId.body.some((o) => o.id === ids.orderB), "DR One finds orderB by short id", byId.status);
    const byPhone = await req("GET", "/returns/search?q=8000000001", { token: dr });
    ok(byPhone.status === 200 && byPhone.body.some((o) => o.id === ids.orderB), "DR One finds orderB by customer phone", byPhone.status);
    const otherPhone = await req("GET", "/returns/search?q=8000000002", { token: dr });
    ok(otherPhone.status === 200 && !otherPhone.body.some((o) => o.id === orderC.id), "DR One search does not reach the Mirzapur order", otherPhone.status);
  });
}

// --- Staff lifecycle (Security PR4): no account takeover on create, soft delete revokes access, strong new passwords
const STRONG = "Str0ng-Test#Pass";
const SESSION_EXPIRED = { error: "Session expired. Please log in again.", invalidSession: true };
const PARTNER_LOGIN_TEXT = JSON.stringify({ error: "Invalid mobile number or password." });
const loginText = async (phone, password) => {
  const r = await fetch(`${BASE}/auth/vendor/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone, password }) });
  return { status: r.status, text: await r.text() };
};
const userSnap = async (phone) => {
  const u = await prisma.user.findUnique({ where: { phone } });
  return u && JSON.stringify({ id: u.id, role: u.role, password: u.password, tokenVersion: u.tokenVersion, status: u.status, name: u.name });
};
const deepEqual = (a, b) => { try { require("assert").deepStrictEqual(a, b); return true; } catch { return false; } };

function staffUnit() {
  let staff;
  try { staff = require("../src/staff"); } catch (e) { ok(false, "src/staff.js loads", e && e.message); return; }
  const { checkNewPassword, normalizeStaffPhone } = staff;
  const weak = ["vendor123", "VENDOR123", " Vendor@123 ", "Password123", "BuildCity@123", "IloveYou"].map((p) => checkNewPassword(p));
  ok(weak.every((r) => r.ok === false && r.error === "This password is too common. Choose another."), "checkNewPassword: deny-list is case-insensitive and trimmed", weak);
  const len = ["Ab3$xyz", "Ab3$" + "x".repeat(4), "Ab3$" + "x".repeat(124), "Ab3$" + "x".repeat(125), "  Ab3$xyzw  ", "   Ab3$xyz   "].map((p) => checkNewPassword(p));
  ok(len[0].ok === false && len[0].error === "Password must be 8-128 characters." && len[1].ok && len[2].ok && len[3].ok === false && len[3].error === len[0].error
    && len[4].ok && len[4].value === "Ab3$xyzw" && len[5].ok === false, "checkNewPassword: 7/8/128/129 lengths, trimmed value", len);
  const nonStr = [undefined, null, 12345678, {}].map((p) => checkNewPassword(p));
  ok(nonStr.every((r) => r.ok === false), "checkNewPassword: non-strings rejected", nonStr);
  const ph = [checkNewPassword("9876543210", { phone: "9876543210" }), checkNewPassword("ab9876543210cd", { phone: "9876543210" }), checkNewPassword("Str0ng-Test#Pass", { phone: "9876543210" })];
  ok(ph[0].ok === false && ph[0].error === "Password must not contain the mobile number." && ph[1].ok === false && ph[1].error === ph[0].error && ph[2].ok === true,
    "checkNewPassword: rejects passwords containing the phone", ph);
  const phones = ["+91 98765 43210", "09876543210", "9876543210", "98765", "123456789012345", "", null].map(normalizeStaffPhone);
  ok(JSON.stringify(phones) === JSON.stringify(["9876543210", "9876543210", "9876543210", null, null, null, null]), "normalizeStaffPhone matrix", phones);
}

async function staffLifecycle(ids, { admin, mzp }) {
  const bcrypt = require("bcryptjs");
  const strongHash = await bcrypt.hash(STRONG, 4);
  staffUnit();

  // A DR of Varanasi created through the API (so it can log in)
  const drMade = await req("POST", "/drs", { token: admin, body: { name: "DR Life", phone: "9300000001", password: STRONG, regionId: ids.reg } });
  const drTok = (await req("POST", "/auth/vendor/login", { body: { phone: "9300000001", password: STRONG } })).body.token;
  ok(drMade.status === 201 && !!drTok && !hasPasswordField(drMade.body), "setup: admin creates a DR with a strong password and it logs in", { s: drMade.status, b: drMade.body });

  await scenario("a) staff create never overwrites an existing staff account", async () => {
    await prisma.user.create({ data: { phone: "9200000001", name: "Other Admin", role: "ADMIN", password: strongHash } });
    await prisma.user.create({ data: { phone: "9200000002", name: "Bare DR", role: "DR", password: strongHash } });
    await prisma.user.create({ data: { phone: "9200000003", name: "Bare Vendor", role: "VENDOR", password: strongHash } });
    for (const phone of ["9999999999", "9200000001", "9200000002", "9200000003"]) {
      const before = await userSnap(phone);
      const r = await req("POST", "/drs", { token: admin, body: { name: "Takeover", phone, password: STRONG, regionId: ids.reg } });
      const after = await userSnap(phone);
      ok(r.status === 409 && r.body.code === "PHONE_IN_USE_STAFF" && before === after, `a) POST /drs on staff ${phone} -> 409 PHONE_IN_USE_STAFF, user unchanged`, { s: r.status, b: r.body, same: before === after });
    }
    const vcBefore = await userSnap("9000000003");
    const vcRowBefore = JSON.stringify(await prisma.vendor.findFirst({ where: { phone: "9000000003" } }));
    const drOther = await req("POST", "/vendors", { token: drTok, body: { shopName: "Takeover", ownerName: "T", phone: "9000000003", password: STRONG, regionName: "Varanasi" } });
    ok(drOther.status === 409 && vcBefore === await userSnap("9000000003") && vcRowBefore === JSON.stringify(await prisma.vendor.findFirst({ where: { phone: "9000000003" } })),
      "a) DR POST /vendors on another district's vendor phone -> 409, unchanged", { s: drOther.status, b: drOther.body });
    const adBefore = await userSnap("9999999999");
    const adV = await req("POST", "/vendors", { token: admin, body: { shopName: "Takeover", ownerName: "T", phone: "9999999999", password: STRONG, regionName: "Varanasi" } });
    ok(adV.status === 409 && adBefore === await userSnap("9999999999"), "a) admin POST /vendors on 9999999999 -> 409, admin unchanged", { s: adV.status, b: adV.body });
    ok((await prisma.vendor.count({ where: { phone: "9999999999" } })) === 0 && (await prisma.dR.count({ where: { phone: { in: ["9999999999", "9200000001", "9200000002", "9200000003"] } } })) === 0, "a) no staff rows created on refused phones");
  });

  // Customer with an order and a wallet, converted to a vendor by the Varanasi DR
  const conv = await prisma.user.create({ data: { phone: "9200000010", name: "Conv Customer", role: "CUSTOMER", walletBalance: 150 } });
  await prisma.walletTransaction.create({ data: { userId: conv.id, amount: 150, type: "ADMIN_ADJUST", description: "seed" } });
  const convOrder = await prisma.order.create({ data: { customerId: conv.id, totalAmount: 100, items: { create: [{ vendorId: ids.va, productName: "Cement Bag", priceAtPurchase: 100, quantity: 1, totalPrice: 100 }] } } });
  const convCustTok = (await otpLogin("9200000010")).body.token;
  let convVendorId = null;

  await scenario("b) customer -> vendor conversion needs an explicit confirm", async () => {
    const body = { shopName: "Conv Shop", ownerName: "Conv Owner", phone: "9200000010", password: STRONG, regionName: "Varanasi" };
    const before = await userSnap("9200000010");
    const noConfirm = await req("POST", "/vendors", { token: drTok, body });
    ok(noConfirm.status === 409 && noConfirm.body.code === "CONVERT_CONFIRM_REQUIRED" && /vendor/.test(noConfirm.body.error) && before === await userSnap("9200000010"),
      "b) POST /vendors on a customer without confirmConvert -> 409 CONVERT_CONFIRM_REQUIRED, unchanged", noConfirm.body);
    const other = await req("POST", "/vendors", { token: drTok, body: { ...body, regionName: mzp.name, regionId: mzp.id, confirmConvert: true } });
    ok(other.status === 403 && before === await userSnap("9200000010"), "b) DR converting into another district -> 403, unchanged", { s: other.status, b: other.body });
    const walletBefore = await prisma.walletTransaction.findMany({ where: { userId: conv.id }, orderBy: { id: "asc" } });
    const yes = await req("POST", "/vendors", { token: drTok, body: { ...body, confirmConvert: true } });
    convVendorId = yes.body && yes.body.id;
    const u = await prisma.user.findUnique({ where: { id: conv.id } });
    ok(yes.status === 201 && !hasPasswordField(yes.body) && u.role === "VENDOR" && u.tokenVersion === conv.tokenVersion + 1 && u.name === "Conv Customer",
      "b) with confirmConvert -> 201, same user is now VENDOR, tokenVersion +1, name kept", { s: yes.status, b: yes.body, role: u.role, tv: u.tokenVersion });
    const order = await prisma.order.findUnique({ where: { id: convOrder.id } });
    const walletAfter = await prisma.walletTransaction.findMany({ where: { userId: conv.id }, orderBy: { id: "asc" } });
    ok(order.customerId === conv.id && Number(u.walletBalance) === 150 && JSON.stringify(walletAfter) === JSON.stringify(walletBefore), "b) orders and wallet kept", { bal: u.walletBalance });
    const audit = await prisma.auditLog.findFirst({ where: { action: "STAFF_CONVERT", details: { contains: `"targetUserId":"${conv.id}"` } } });
    ok(!!audit, "b) STAFF_CONVERT audit row with targetUserId");
    const vl = await loginText("9200000010", STRONG);
    ok(vl.status === 200 && JSON.parse(vl.text).user?.role === "VENDOR", "b) converted vendor logs in with the new password", vl.status);

    const dc = await prisma.user.create({ data: { phone: "9200000012", name: "DR Customer", role: "CUSTOMER" } });
    const dBody = { name: "Conv DR", phone: "9200000012", password: STRONG, regionId: ids.reg };
    const dNo = await req("POST", "/drs", { token: admin, body: dBody });
    ok(dNo.status === 409 && dNo.body.code === "CONVERT_CONFIRM_REQUIRED" && /DR/.test(dNo.body.error), "b) POST /drs on a customer without confirmConvert -> 409", dNo.body);
    const dYes = await req("POST", "/drs", { token: admin, body: { ...dBody, confirmConvert: true } });
    const du = await prisma.user.findUnique({ where: { id: dc.id } });
    ok(dYes.status === 201 && du.role === "DR" && du.tokenVersion === dc.tokenVersion + 1 && dYes.body.userId === dc.id, "b) POST /drs with confirmConvert converts the same user", { s: dYes.status, role: du.role });
  });

  await scenario("c) customer token from before the conversion is revoked", async () => {
    const me = await req("GET", "/users/me", { token: convCustTok });
    ok(me.status === 401 && deepEqual(me.body, SESSION_EXPIRED), "c) old customer token -> 401 session expired", me);
  });

  await scenario("d) deleting a DR revokes access but keeps the rows", async () => {
    const made = await req("POST", "/drs", { token: admin, body: { name: "DR Gone", phone: "9300000002", password: STRONG, regionId: ids.reg } });
    const tok = (await req("POST", "/auth/vendor/login", { body: { phone: "9300000002", password: STRONG } })).body.token;
    const uBefore = await prisma.user.findUnique({ where: { phone: "9300000002" } });
    const del = await req("DELETE", `/drs/${made.body.id}`, { token: admin });
    ok(del.status === 200 && del.body.success === true && del.body.message === "DR deleted" && del.body.id === made.body.id, "d) DELETE /drs -> 200 DR deleted", del.body);
    const login = await loginText("9300000002", STRONG);
    ok(login.status === 401 && login.text === PARTNER_LOGIN_TEXT, "d) deleted DR cannot log in", login);
    const me = await req("GET", "/users/me", { token: tok });
    ok(me.status === 401 && deepEqual(me.body, SESSION_EXPIRED), "d) deleted DR's token -> /users/me 401", me);
    const row = await prisma.dR.findUnique({ where: { id: made.body.id } });
    const u = await prisma.user.findUnique({ where: { phone: "9300000002" } });
    ok(row && row.disabledAt instanceof Date && row.status === "DISABLED", "d) DR row kept, disabledAt set, status DISABLED", row);
    ok(u && u.status === "DISABLED" && u.tokenVersion === uBefore.tokenVersion + 1, "d) DR user kept, DISABLED, tokenVersion +1", u && { s: u.status, tv: u.tokenVersion });
    const list = await req("GET", "/drs", { token: admin });
    ok(list.status === 200 && !list.body.some((d) => d.id === made.body.id), "d) deleted DR not listed in GET /drs");
    const again = await req("DELETE", `/drs/${made.body.id}`, { token: admin });
    ok(again.status === 200 && again.body.success === true, "d) deleting again is idempotent", again.body);
    const nf = await req("DELETE", "/drs/no-such-dr", { token: admin });
    ok(nf.status === 404, "d) DELETE /drs unknown id -> 404", nf.status);
  });

  await scenario("d2) deleting a vendor revokes access, keeps rows, listings and orders", async () => {
    const made = await req("POST", "/vendors", { token: admin, body: { shopName: "Gone Shop", ownerName: "Gone", phone: "9200000020", password: STRONG, regionName: "Varanasi" } });
    const vid = made.body.id;
    const base = { categoryId: (await prisma.category.findFirst()).id, categoryName: "Cement", brand: "X", type: "T", grade: "G", unit: "Bag", imageUrl: "x", regionId: ids.reg, regionName: "Varanasi" };
    const listing = await prisma.vendorProduct.create({ data: { ...base, masterProductId: ids.mp, vendorId: vid, name: "Cement Bag", price: 400, stockQty: 5, approvalStatus: "APPROVED", isActive: true } });
    const order = await prisma.order.create({ data: { customerId: ids.c1, totalAmount: 400, items: { create: [{ vendorId: vid, vendorProductId: listing.id, productName: "Cement Bag", priceAtPurchase: 400, quantity: 1, totalPrice: 400 }] } }, include: { items: true } });
    const tok = (await req("POST", "/auth/vendor/login", { body: { phone: "9200000020", password: STRONG } })).body.token;
    const uBefore = await prisma.user.findUnique({ where: { phone: "9200000020" } });
    const del = await req("DELETE", `/vendors/${vid}`, { token: drTok });
    ok(del.status === 200 && del.body.success === true && del.body.message === "Vendor deleted" && del.body.id === vid, "d2) DR deletes own-district vendor -> 200", del.body);
    const login = await loginText("9200000020", STRONG);
    ok(login.status === 401 && login.text === PARTNER_LOGIN_TEXT, "d2) deleted vendor cannot log in", login);
    const me = await req("GET", "/users/me", { token: tok });
    ok(me.status === 401 && deepEqual(me.body, SESSION_EXPIRED), "d2) deleted vendor's token -> /users/me 401", me);
    const row = await prisma.vendor.findUnique({ where: { id: vid } });
    ok(row && row.status === "SUSPENDED" && row.disabledAt instanceof Date, "d2) vendor row kept, SUSPENDED + disabledAt", row);
    const l = await prisma.vendorProduct.findUnique({ where: { id: listing.id } });
    const items = await prisma.orderItem.findMany({ where: { orderId: order.id } });
    ok(l && l.isActive === false && items.length === 1 && items[0].vendorId === vid, "d2) listing kept but inactive; order item still references the vendor", { l, items });
    const u = await prisma.user.findUnique({ where: { phone: "9200000020" } });
    ok(u && u.status === "DISABLED" && u.role === "VENDOR" && u.tokenVersion === uBefore.tokenVersion + 1, "d2) vendor user DISABLED, tokenVersion +1", u && { s: u.status, tv: u.tokenVersion });
    const list = await req("GET", "/vendors", { token: admin });
    const sync = await req("GET", "/cloud-sync", { token: admin });
    ok(!list.body.some((v) => v.id === vid) && !sync.body.vendors.some((v) => v.id === vid), "d2) deleted vendor not in GET /vendors or cloud-sync");
    const re = await req("POST", "/vendors", { token: admin, body: { shopName: "Again", ownerName: "Again", phone: "9200000020", password: STRONG, regionName: "Varanasi" } });
    ok(re.status === 409 && re.body.code === "PHONE_IN_USE_STAFF", "d2) re-adding a deleted staff-only phone -> 409 PHONE_IN_USE_STAFF", re.body);
    const nf = await req("DELETE", "/vendors/no-such-vendor", { token: admin });
    ok(nf.status === 404, "d2) DELETE /vendors unknown id -> 404 (admin too)", nf.status);
  });

  await scenario("d3) deleting a converted vendor reverts the user to a customer", async () => {
    const del = await req("DELETE", `/vendors/${convVendorId}`, { token: admin });
    const u = await prisma.user.findUnique({ where: { phone: "9200000010" } });
    ok(del.status === 200 && u.role === "CUSTOMER" && u.status === "ACTIVE", "d3) converted vendor deleted -> user back to ACTIVE CUSTOMER", { s: del.status, role: u.role, st: u.status });
    const otp = await otpLogin("9200000010");
    ok(otp.status === 200 && !!otp.body.token && otp.body.user?.role === "CUSTOMER", "d3) reverted customer can OTP-login again", otp.status);
  });

  await scenario("d4) a failed delete rolls back completely", async () => {
    const made = await req("POST", "/vendors", { token: admin, body: { shopName: "Rollback Shop", ownerName: "Rb", phone: "9200000021", password: STRONG, regionName: "Varanasi" } });
    const vid = made.body.id;
    const base = { categoryId: (await prisma.category.findFirst()).id, categoryName: "Cement", brand: "X", type: "T", grade: "G", unit: "Bag", imageUrl: "x", regionId: ids.reg, regionName: "Varanasi" };
    await prisma.vendorProduct.create({ data: { ...base, masterProductId: ids.mp, vendorId: vid, name: "Cement Bag", price: 400, stockQty: 5, approvalStatus: "APPROVED", isActive: true } });
    const snap = async () => JSON.stringify([
      await prisma.vendor.findUnique({ where: { id: vid } }),
      await prisma.vendorProduct.findMany({ where: { vendorId: vid }, orderBy: { id: "asc" } }),
      await prisma.user.findUnique({ where: { phone: "9200000021" } }),
    ]);
    const before = await snap();
    try {
      await prisma.$executeRawUnsafe("CREATE FUNCTION pr4_fail_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'pr4 forced failure'; END $$");
      await prisma.$executeRawUnsafe("CREATE TRIGGER pr4_fail_audit BEFORE INSERT ON audit_logs FOR EACH ROW WHEN (NEW.action = 'STAFF_DELETE') EXECUTE FUNCTION pr4_fail_audit()");
      const del = await req("DELETE", `/vendors/${vid}`, { token: admin });
      ok(del.status >= 500 && before === await snap(), "d4) audit insert fails -> 5xx and vendor/listings/user unchanged", { s: del.status });
    } finally {
      await prisma.$executeRawUnsafe("DROP TRIGGER IF EXISTS pr4_fail_audit ON audit_logs");
      await prisma.$executeRawUnsafe("DROP FUNCTION IF EXISTS pr4_fail_audit()");
    }
  });

  await scenario("d5) old tokens of deleted or suspended DRs/vendors lose their data scope at once", async () => {
    // Fresh DR + vendor in the Mirzapur test district with one order on that vendor; tokens kept from before the change
    const makeDr = async (phone) => {
      const m = await req("POST", "/drs", { token: admin, body: { name: `DR Scope ${phone}`, phone, password: STRONG, regionId: mzp.id } });
      return { id: m.body.id, tok: (await req("POST", "/auth/vendor/login", { body: { phone, password: STRONG } })).body.token };
    };
    const makeVendor = async (phone) => {
      const m = await req("POST", "/vendors", { token: admin, body: { shopName: `Scope ${phone}`, ownerName: "Scope", phone, password: STRONG, regionName: mzp.name, regionId: mzp.id } });
      return { id: m.body.id, tok: (await req("POST", "/auth/vendor/login", { body: { phone, password: STRONG } })).body.token };
    };
    const orderFor = (vendorId) => prisma.order.create({ data: { customerId: ids.c1, totalAmount: 300, items: { create: [{ vendorId, productName: "Cement Bag", priceAtPurchase: 300, quantity: 1, totalPrice: 300 }] } } });
    const listIds = (r) => (Array.isArray(r.body) ? r.body : r.body?.orders || []).map((o) => o.id);

    const d = await makeDr("9300000010");
    const v = await makeVendor("9200000060");
    const order = await orderFor(v.id);
    ok(!!d.tok && !!v.tok, "d5) setup: fresh DR and vendor log in", { d, v });
    const drSees = await req("GET", "/orders", { token: d.tok });
    const vSees = await req("GET", `/orders/vendor/${v.id}`, { token: v.tok });
    ok(drSees.status === 200 && listIds(drSees).includes(order.id), "d5) sanity: DR token sees the district order", drSees.status);
    ok(vSees.status === 200 && listIds(vSees).includes(order.id), "d5) sanity: vendor token sees its order", vSees.status);

    const delDr = await req("DELETE", `/drs/${d.id}`, { token: admin });
    const delV = await req("DELETE", `/vendors/${v.id}`, { token: admin });
    ok(delDr.status === 200 && delV.status === 200, "d5) admin deletes the DR and the vendor", [delDr.status, delV.status]);

    const drList = await req("GET", "/orders", { token: d.tok });
    ok(drList.status === 200 && listIds(drList).length === 0, "d5) deleted DR's old token: GET /orders is empty", { s: drList.status, n: listIds(drList).length });
    const drPatch = await req("PATCH", `/orders/${order.id}/status`, { token: d.tok, body: { status: "CONFIRMED" } });
    ok(drPatch.status === 403, "d5) deleted DR's old token: PATCH /orders/:id/status -> 403", drPatch);
    const vList = await req("GET", `/orders/vendor/${v.id}`, { token: v.tok });
    ok(vList.status === 403, "d5) deleted vendor's old token: GET /orders/vendor/:id -> 403", { s: vList.status, n: listIds(vList).length });
    const vSum = await req("GET", "/orders/summary", { token: v.tok });
    ok(vSum.status === 403, "d5) deleted vendor's old token: GET /orders/summary -> 403", vSum);
    const vPatch = await req("PATCH", `/orders/${order.id}/status`, { token: v.tok, body: { status: "CONFIRMED" } });
    ok(vPatch.status === 403, "d5) deleted vendor's old token: PATCH /orders/:id/status -> 403", vPatch);
    ok((await prisma.order.findUnique({ where: { id: order.id } })).status === "PENDING", "d5) order status unchanged");

    // Suspend instead of delete: same immediate loss of scope
    const sd = await makeDr("9300000011");
    const sv = await makeVendor("9200000061");
    await orderFor(sv.id);
    ok(listIds(await req("GET", "/orders", { token: sd.tok })).length > 0 && (await req("GET", "/orders/summary", { token: sv.tok })).status === 200, "d5) sanity: fresh DR/vendor have scope before suspend");
    const susDr = await req("PATCH", `/drs/${sd.id}`, { token: admin, body: { status: "SUSPENDED" } });
    const susV = await req("PATCH", `/vendors/${sv.id}`, { token: admin, body: { status: "SUSPENDED" } });
    ok(susDr.status === 200 && susV.status === 200, "d5) admin suspends the DR and the vendor via the edit routes", [susDr.status, susV.status]);
    const sdList = await req("GET", "/orders", { token: sd.tok });
    ok(sdList.status === 200 && listIds(sdList).length === 0, "d5) suspended DR's old token: GET /orders is empty", { s: sdList.status, n: listIds(sdList).length });
    const svSum = await req("GET", "/orders/summary", { token: sv.tok });
    ok(svSum.status === 403, "d5) suspended vendor's old token: GET /orders/summary -> 403", svSum);
  });

  let suspendedVendorId = null, suspendedDrId = null;
  await scenario("e) partner login failures are indistinguishable", async () => {
    const sv = await req("POST", "/vendors", { token: admin, body: { shopName: "Sus Shop", ownerName: "Sus", phone: "9200000030", password: STRONG, regionName: "Varanasi" } });
    suspendedVendorId = sv.body.id;
    const svUser = await prisma.user.findUnique({ where: { phone: "9200000030" } });
    const sus = await req("PATCH", `/vendors/${sv.body.id}/status`, { token: admin, body: { status: "SUSPENDED" } });
    ok(sus.status === 200 && (await prisma.user.findUnique({ where: { phone: "9200000030" } })).tokenVersion === svUser.tokenVersion + 1, "j) PATCH /vendors/:id/status SUSPENDED bumps tokenVersion", sus.status);
    await req("POST", "/vendors", { token: admin, body: { shopName: "Pend Shop", ownerName: "Pend", phone: "9200000031", password: STRONG, regionName: "Varanasi", status: "PENDING" } });
    const sd = await req("POST", "/drs", { token: admin, body: { name: "DR Sus", phone: "9300000003", password: STRONG, regionId: ids.reg } });
    suspendedDrId = sd.body.id;
    const sdUser = await prisma.user.findUnique({ where: { phone: "9300000003" } });
    const sdr = await req("PATCH", `/drs/${sd.body.id}`, { token: admin, body: { status: "suspended" } });
    const sdAfter = await prisma.user.findUnique({ where: { phone: "9300000003" } });
    const sdRow = await prisma.dR.findUnique({ where: { id: sd.body.id } });
    ok(sdr.status === 200 && sdRow.status === "SUSPENDED" && sdAfter.tokenVersion === sdUser.tokenVersion + 1, "j) PATCH /drs/:id status SUSPENDED bumps tokenVersion", { s: sdr.status, st: sdRow.status });
    await prisma.user.create({ data: { phone: "9200000032", name: "Only User", role: "VENDOR", password: strongHash } });
    const dis = await prisma.user.create({ data: { phone: "9200000033", name: "Disabled", role: "VENDOR", status: "DISABLED", password: strongHash } });
    await prisma.vendor.create({ data: { userId: dis.id, shopName: "Dis", ownerName: "Dis", phone: "9200000033", password: strongHash, regionId: ids.reg, status: "APPROVED" } });

    const cases = [
      ["unknown phone", "9200000099", STRONG], ["wrong password", "9300000001", "Wrong-Pass#1"], ["deleted vendor", "9200000020", STRONG],
      ["suspended vendor", "9200000030", STRONG], ["pending vendor", "9200000031", STRONG], ["suspended DR", "9300000003", STRONG],
      ["user-only vendor", "9200000032", STRONG], ["disabled user", "9200000033", STRONG],
    ];
    for (const [name, phone, pw] of cases) {
      const r = await loginText(phone, pw);
      ok(r.status === 401 && r.text === PARTNER_LOGIN_TEXT, `e) partner login: ${name} -> 401 generic`, r);
    }
  });

  await scenario("e2) decidePartnerLogin always runs one compare", async () => {
    const { decidePartnerLogin, DUMMY_PASSWORD_HASH } = require("../src/staff");
    const calls = [];
    const compare = async (pw, hash) => { calls.push([pw, hash]); return true; };
    const unknown = await decidePartnerLogin({ phone10: "9200000099", password: "x", user: null, dr: null, vendor: null }, compare);
    ok(unknown.ok === false && calls.length === 1 && calls[0][1] === DUMMY_PASSWORD_HASH && /^\$2[aby]\$10\$/.test(DUMMY_PASSWORD_HASH), "e2) unknown phone: one compare against the dummy hash, denied", { unknown, calls });
    calls.length = 0;
    const disabled = await decidePartnerLogin({ phone10: "9200000033", password: "x", user: { id: "u", role: "VENDOR", status: "DISABLED", password: "h" }, dr: null, vendor: { id: "v", password: "vh" } }, compare);
    ok(disabled.ok === false && calls.length === 1, "e2) disabled user: one compare, denied", { disabled, calls });
    calls.length = 0;
    const live = await decidePartnerLogin({ phone10: "9200000034", password: "x", user: { id: "u", role: "VENDOR", status: "ACTIVE", password: "h" }, dr: null, vendor: { id: "v", password: "vh" } }, compare);
    ok(live.ok === true && live.kind === "VENDOR" && calls.length === 1 && calls[0][1] === "vh", "e2) live vendor: compared against the vendor hash, allowed", { live, calls });
  });

  await scenario("f) a disabled customer cannot complete OTP verify", async () => {
    await prisma.user.create({ data: { phone: "9200000040", name: "Disabled Cust", role: "CUSTOMER", status: "DISABLED" } });
    const r = await otpLogin("9200000040");
    ok(r.status === 401 && !r.body.token && r.body.error === require("../src/otp").OTP_GENERIC_ERROR, "f) disabled customer OTP verify -> 401, no token", r);
  });

  await scenario("g) one live staff row per phone", async () => {
    const dup = await req("POST", "/vendors", { token: admin, body: { shopName: "Dup", ownerName: "Dup", phone: "9000000001", password: STRONG, regionName: "Varanasi" } });
    ok(dup.status === 409, "g) POST /vendors with a live vendor's phone -> 409", dup);
    const idx = (await prisma.$queryRawUnsafe("SELECT indexname FROM pg_indexes WHERE indexname IN ('vendors_phone_live_key', 'district_representatives_phone_live_key')")).map((r) => r.indexname).sort();
    ok(JSON.stringify(idx) === JSON.stringify(["district_representatives_phone_live_key", "vendors_phone_live_key"]), "g) partial unique indexes exist", idx);
    let code = null;
    try {
      await prisma.$executeRawUnsafe(`INSERT INTO vendors (id, "userId", "shopName", "ownerName", phone, "regionId", status) VALUES ('pr4-dup', $1, 'Dup', 'Dup', '9000000001', $2, 'APPROVED')`, ids.ua, ids.reg);
    } catch (e) { code = (e.meta && e.meta.code) || (/23505/.test(String(e.message)) ? "23505" : e.code); }
    ok(code === "23505", "g) raw insert of a second live vendor with the same phone fails with 23505", code);
  });

  await scenario("h) weak passwords are refused for new accounts and resets", async () => {
    const pv = await req("POST", "/vendors", { token: admin, body: { shopName: "Pw Shop", ownerName: "Pw", phone: "9200000051", password: STRONG, regionName: "Varanasi" } });
    const pd = await req("POST", "/drs", { token: admin, body: { name: "DR Pw", phone: "9300000004", password: STRONG, regionId: ids.reg } });
    const vRow = await prisma.vendor.findUnique({ where: { id: pv.body.id } });
    const dRow = await prisma.dR.findUnique({ where: { id: pd.body.id } });
    for (const pw of ["vendor123", "dr123", "short1", "PASSWORD123"]) {
      const a = await req("POST", "/vendors", { token: admin, body: { shopName: "Weak", ownerName: "Weak", phone: "9200000050", password: pw, regionName: "Varanasi" } });
      const b = await req("POST", "/drs", { token: admin, body: { name: "Weak", phone: "9300000050", password: pw, regionId: ids.reg } });
      const c = await req("PATCH", `/vendors/${pv.body.id}`, { token: admin, body: { password: pw } });
      const d = await req("PATCH", `/drs/${pd.body.id}`, { token: admin, body: { password: pw } });
      ok([a, b, c, d].every((r) => r.status === 400 && r.body.code === "WEAK_PASSWORD"), `h) weak password "${pw}" -> 400 WEAK_PASSWORD on create and reset`, [a, b, c, d].map((r) => [r.status, r.body]));
    }
    const nothing = await prisma.user.count({ where: { phone: { in: ["9200000050", "9300000050"] } } });
    const vAfter = await prisma.vendor.findUnique({ where: { id: pv.body.id } });
    const dAfter = await prisma.dR.findUnique({ where: { id: pd.body.id } });
    ok(nothing === 0 && vAfter.password === vRow.password && dAfter.password === dRow.password, "h) nothing written for weak passwords", { nothing });
    const noPw = await req("POST", "/vendors", { token: admin, body: { shopName: "NoPw", ownerName: "NoPw", phone: "9200000052", regionName: "Varanasi" } });
    ok(noPw.status === 400 && noPw.body.code === "WEAK_PASSWORD", "h) password is required on create", noPw.body);
    const badPhone = await req("POST", "/drs", { token: admin, body: { name: "Bad", phone: "98765", password: STRONG, regionId: ids.reg } });
    ok(badPhone.status === 400 && badPhone.body.code === "INVALID_PHONE", "h) invalid phone on create -> 400 INVALID_PHONE", badPhone.body);
    const legacyA = await loginText("9000000001", CREDS.vendorA);
    const legacyAdmin = await loginText("9999999999", CREDS.admin);
    ok(legacyA.status === 200 && legacyAdmin.status === 200, "h) existing accounts with old passwords still log in", [legacyA.status, legacyAdmin.status]);
    const reset = await req("PATCH", `/vendors/${pv.body.id}`, { token: admin, body: { password: "An0ther#Strong-Pw" } });
    ok(reset.status === 200 && !hasPasswordField(reset.body), "h) strong password reset accepted", reset.status);
  });

  await scenario("j) status changes and deleted rows", async () => {
    const nf = await req("PATCH", "/vendors/no-such-vendor/status", { token: admin, body: { status: "APPROVED" } });
    ok(nf.status === 404, "j) PATCH /vendors/unknown/status -> 404", nf.status);
    const gone = await prisma.vendor.findFirst({ where: { phone: "9200000020" } });
    const p1 = await req("PATCH", `/vendors/${gone.id}/status`, { token: admin, body: { status: "APPROVED" } });
    const p2 = await req("PATCH", `/vendors/${gone.id}`, { token: admin, body: { status: "APPROVED" } });
    const goneDr = await prisma.dR.findFirst({ where: { phone: "9300000002" } });
    const p3 = await req("PATCH", `/drs/${goneDr.id}`, { token: admin, body: { status: "ACTIVE" } });
    ok([p1, p2, p3].every((r) => r.status === 409 && r.body.code === "STAFF_DISABLED"), "j) PATCH on a deleted vendor/DR -> 409 STAFF_DISABLED", [p1, p2, p3].map((r) => [r.status, r.body]));
    const badSt = await req("PATCH", `/vendors/${suspendedVendorId}/status`, { token: admin, body: { status: "DELETED" } });
    const badDr = await req("PATCH", `/drs/${suspendedDrId}`, { token: admin, body: { status: "DISABLED" } });
    ok(badSt.status === 400 && badDr.status === 400, "j) unknown status values -> 400", [badSt.status, badDr.status]);
  });

  await scenario("i) audit trail for every staff change", async () => {
    const rows = await prisma.auditLog.findMany({ where: { action: { startsWith: "STAFF_" } } });
    for (const action of ["STAFF_CREATE", "STAFF_CONVERT", "STAFF_PASSWORD_RESET", "STAFF_STATUS_CHANGE", "STAFF_DELETE"]) {
      const mine = rows.filter((r) => r.action === action).map((r) => JSON.parse(r.details));
      ok(mine.length > 0 && mine.every((d) => d.actorId && d.targetType && d.targetId && d.targetUserId), `i) ${action} audit rows carry actor and target`, mine.slice(0, 2));
    }
    ok(rows.length > 0 && rows.every((r) => !/password|\$2[aby]\$/i.test(r.details)), "i) no password or hash text in audit details");
    const del = rows.find((r) => r.action === "STAFF_DELETE" && JSON.parse(r.details).mode);
    const st = rows.find((r) => r.action === "STAFF_STATUS_CHANGE" && JSON.parse(r.details).from && JSON.parse(r.details).to);
    ok(!!del && !!st, "i) STAFF_DELETE has mode, STAFF_STATUS_CHANGE has from/to");
  });

  const adminStill = await loginText("9999999999", CREDS.admin);
  ok(adminStill.status === 200, "D4: shared admin still logs in after the staff scenarios", adminStill.status);
}

// --- Visibility cleanups (Security PR5)
const signAs = (claims) => require("jsonwebtoken").sign({ tv: 1, ...claims }, process.env.JWT_SECRET.trim(), { expiresIn: "15d" });

async function visibilityCleanups(ids, { admin, c1, c2 }) {
  const phantomAdmin = signAs({ sub: crypto.randomUUID(), phone: "9100000099", role: "ADMIN" });
  const phantomCustomer = signAs({ sub: crypto.randomUUID(), phone: "9100000098", role: "CUSTOMER" });
  const ownTitles = async (token) => (await req("GET", "/notifications/me", { token })).body;

  await scenario("PR5 a) /users/me with no user row is 401 SESSION_EXPIRED for every role", async () => {
    for (const [who, token] of [["ADMIN", phantomAdmin], ["CUSTOMER", phantomCustomer]]) {
      const r = await req("GET", "/users/me", { token });
      ok(r.status === 401 && deepEqual(r.body, SESSION_EXPIRED), `PR5 a) phantom ${who} token -> 401 SESSION_EXPIRED, no token`, { s: r.status, b: r.body });
    }
    const real = await req("GET", "/users/me", { token: admin });
    ok(real.status === 200 && real.body.id === ids.admin && typeof real.body.token === "string" && !hasPasswordField(real.body), "PR5 a) real admin still gets 200 + token", { s: real.status, b: real.body });
  });

  await scenario("PR5 b) POST /notifications never invents a recipient", async () => {
    const usersBefore = await prisma.user.count();
    const notesBefore = await prisma.notification.count();
    const r = await req("POST", "/notifications", { token: admin, body: { title: "PR5 ghost", message: "x", userId: crypto.randomUUID() } });
    ok(r.status === 404 && deepEqual(r.body, { error: "User not found" }), "PR5 b) unknown userId -> 404", { s: r.status, b: r.body });
    const p = await req("POST", "/notifications", { token: phantomAdmin, body: { title: "PR5 phantom", message: "x" } });
    ok(p.status === 404 && deepEqual(p.body, { error: "User not found" }), "PR5 b) phantom admin broadcast -> 404", { s: p.status, b: p.body });
    const bad = await req("POST", "/notifications", { token: admin, body: { title: "  ", message: "x" } });
    ok(bad.status === 400, "PR5 b) blank title -> 400", bad.status);
    ok(await prisma.user.count() === usersBefore && !(await prisma.user.findUnique({ where: { phone: "7607650875" } })), "PR5 b) no user created (no 7607650875 system user)");
    ok(await prisma.notification.count() === notesBefore, "PR5 b) no notification created");
  });

  await scenario("PR5 c) admin DELETE /notifications clears only the admin's own rows", async () => {
    const mk = (userId, title) => prisma.notification.create({ data: { userId, title, message: "x" } });
    const n1 = await mk(ids.c1, "PR5 c1 seed");
    const n2 = await mk(ids.c2, "PR5 c2 seed");
    const na = await mk(ids.admin, "PR5 admin seed");
    const r = await req("DELETE", "/notifications", { token: admin });
    const left = (await prisma.notification.findMany({ where: { id: { in: [n1.id, n2.id, na.id] } } })).map((n) => n.id);
    ok(r.status === 200 && left.includes(n1.id) && left.includes(n2.id) && !left.includes(na.id), "PR5 c) c1/c2 rows survive, admin row gone", { s: r.status, left });
    ok(await prisma.notification.count({ where: { userId: ids.admin } }) === 0, "PR5 c) no admin rows left");
  });

  await scenario("PR5 d) /notifications/me: own rows + explicit broadcasts only", async () => {
    const c2Row = await prisma.notification.create({ data: { userId: ids.c2, title: "PR5 c2 private", message: "x" } });
    const priv = await req("POST", "/notifications", { token: admin, body: { title: "PR5 admin private", message: "x", userId: ids.admin } });
    const bc = await req("POST", "/notifications", { token: admin, body: { title: "PR5 broadcast", message: "x", type: "info" } });
    ok(priv.status === 201 && priv.body.success === true && priv.body.notification?.isBroadcast === false && priv.body.notification?.userId === ids.admin, "PR5 d) targeted POST -> 201, private", priv.body);
    ok(bc.status === 201 && bc.body.success === true && bc.body.notification?.isBroadcast === true && bc.body.notification?.userId === ids.admin, "PR5 d) broadcast POST -> 201, stored on the caller", bc.body);
    const mine = await ownTitles(c1);
    ok(Array.isArray(mine) && mine.some((n) => n.title === "PR5 broadcast"), "PR5 d) customer sees the broadcast", mine);
    ok(Array.isArray(mine) && !mine.some((n) => n.title === "PR5 admin private"), "PR5 d) customer does not see a private admin row", mine);
    ok(Array.isArray(mine) && !mine.some((n) => n.userId === ids.c2 || n.id === c2Row.id), "PR5 d) customer does not see another customer's rows", mine);
    ok(Array.isArray(mine) && mine.some((n) => n.title === "PR5 c1 seed"), "PR5 d) customer still sees own rows", mine);
    const adm = await ownTitles(admin);
    ok(Array.isArray(adm) && adm.length > 0 && adm.every((n) => n.userId === ids.admin), "PR5 d) admin /notifications/me returns only admin's own rows", adm.map((n) => n.userId));
    const cust = await req("POST", "/notifications", { token: c1, body: { title: "PR5 cust", message: "x" } });
    ok(cust.status === 403, "PR5 d) customer cannot POST notifications", cust.status);
  });

  await scenario("PR5 e) customer order lists match customerId only", async () => {
    const c1User = await prisma.user.findUnique({ where: { id: ids.c1 } });
    const c2User = await prisma.user.findUnique({ where: { id: ids.c2 } });
    const addr = await prisma.address.create({ data: { userId: ids.c2, regionId: ids.reg, fullName: "Gift", phone: c1User.phone, street: "PR5 street", pincode: "221001" } });
    const order = await prisma.order.create({ data: { customerId: ids.c2, addressId: addr.id, totalAmount: 410, items: { create: [{ vendorId: ids.vb, productName: "Cement Bag", priceAtPurchase: 410, quantity: 1, totalPrice: 410 }] } } });
    const has = (body) => (Array.isArray(body) ? body : body?.orders || []).some((o) => o.id === order.id);
    try {
      const me = await req("GET", "/orders/me", { token: c1 });
      ok(me.status === 200 && Array.isArray(me.body) && !has(me.body), "PR5 e) c1 /orders/me excludes c2's order to c1's phone", me.body);
      const paged = await req("GET", "/orders/me?limit=50", { token: c1 });
      ok(paged.status === 200 && Array.isArray(paged.body.orders) && !has(paged.body), "PR5 e) c1 /orders/me?limit= excludes it", paged.body);
      const sum = await req("GET", "/orders/summary", { token: c1 });
      const c1Count = await prisma.order.count({ where: { customerId: ids.c1 } });
      ok(sum.status === 200 && sum.body.totalOrders === c1Count, "PR5 e) c1 /orders/summary counts only own orders", { got: sum.body, c1Count });
      const self = await req("GET", `/orders/user/${ids.c1}`, { token: c1 });
      ok(self.status === 200 && Array.isArray(self.body) && !has(self.body), "PR5 e) c1 /orders/user/<own id> excludes it", self.body);
      const selfPhone = await req("GET", `/orders/user/${c1User.phone}`, { token: c1 });
      ok(selfPhone.status === 200 && Array.isArray(selfPhone.body) && !has(selfPhone.body), "PR5 e) c1 /orders/user/<own phone> excludes it", selfPhone.body);
      const aById = await req("GET", `/orders/user/${ids.c2}`, { token: admin });
      ok(aById.status === 200 && has(aById.body) && aById.body.every((o) => o.customerId === ids.c2), "PR5 e) admin /orders/user/<c2 id> includes it", aById.body);
      const aByPhone = await req("GET", `/orders/user/${c2User.phone}`, { token: admin });
      ok(aByPhone.status === 200 && has(aByPhone.body) && aByPhone.body.every((o) => o.customerId === ids.c2), "PR5 e) admin /orders/user/<c2 phone> includes it", aByPhone.body);
      const aPaged = await req("GET", `/orders/user/+91${c2User.phone}?limit=50`, { token: admin });
      ok(aPaged.status === 200 && Array.isArray(aPaged.body.orders) && has(aPaged.body), "PR5 e) admin /orders/user/<+91 phone>?limit= includes it (paged shape)", aPaged.body);
      const aC1 = await req("GET", `/orders/user/${ids.c1}`, { token: admin });
      ok(aC1.status === 200 && Array.isArray(aC1.body) && !has(aC1.body) && aC1.body.every((o) => o.customerId === ids.c1), "PR5 e) admin /orders/user/<c1 id> excludes it", aC1.body);
      const aNone = await req("GET", `/orders/user/${crypto.randomUUID()}`, { token: admin });
      const aNonePaged = await req("GET", `/orders/user/${crypto.randomUUID()}?limit=10`, { token: admin });
      ok(deepEqual(aNone.body, []) && aNonePaged.status === 200 && deepEqual(aNonePaged.body.orders, []) && aNonePaged.body.hasMore === false, "PR5 e) admin /orders/user/<unknown> -> empty, same shapes", { a: aNone.body, b: aNonePaged.body });
      const c2Me = await req("GET", "/orders/me", { token: c2 });
      ok(c2Me.status === 200 && has(c2Me.body), "PR5 e) c2 /orders/me still includes it", c2Me.body);
    } finally {
      await prisma.order.delete({ where: { id: order.id } });
      await prisma.address.delete({ where: { id: addr.id } });
    }
  });

  await scenario("PR5 f) public catalog + public coupons show only live rows", async () => {
    const reg = ids.reg;
    const cat = await prisma.vendorProduct.findUnique({ where: { id: ids.la } });
    const base = { categoryId: cat.categoryId, categoryName: "Cement", brand: "X", type: "T", grade: "G", unit: "Bag", imageUrl: "x", regionId: reg, regionName: "Varanasi", masterProductId: ids.mp, name: "PR5 listing", price: 400, stockQty: 5 };
    const seededUsers = [], seededVendors = [], listings = {};
    const mkVendor = async (phone, data) => {
      const u = await prisma.user.create({ data: { phone, name: "PR5 " + phone, role: "VENDOR" } });
      seededUsers.push(u.id);
      const v = await prisma.vendor.create({ data: { userId: u.id, shopName: "PR5 " + phone, ownerName: "PR5", phone, regionId: reg, ...data } });
      seededVendors.push(v.id);
      return v;
    };
    const suspended = await mkVendor("9100000011", { status: "SUSPENDED" });
    const disabled = await mkVendor("9100000012", { status: "APPROVED", disabledAt: new Date() });
    listings.pending = await prisma.vendorProduct.create({ data: { ...base, vendorId: ids.va, approvalStatus: "PENDING_REVIEW", isActive: true } });
    listings.rejected = await prisma.vendorProduct.create({ data: { ...base, vendorId: ids.va, approvalStatus: "REJECTED", isActive: true } });
    listings.inactive = await prisma.vendorProduct.create({ data: { ...base, vendorId: ids.va, approvalStatus: "APPROVED", isActive: false } });
    listings.suspended = await prisma.vendorProduct.create({ data: { ...base, vendorId: suspended.id, approvalStatus: "APPROVED", isActive: true } });
    listings.disabled = await prisma.vendorProduct.create({ data: { ...base, vendorId: disabled.id, approvalStatus: "APPROVED", isActive: true } });
    const offCoupon = await prisma.coupon.create({ data: { code: "PR5OFF", title: "PR5 off", isActive: false } });
    const onCoupon = await prisma.coupon.create({ data: { code: "PR5ON", title: "PR5 on", isActive: true } });
    const excluded = Object.values(listings).map((l) => l.id);
    try {
      // Any non-neutral admin mutation empties the in-memory cache when its response finishes
      await req("PATCH", `/orders/${ids.orderB}/status`, { token: admin, body: { status: "NOT_A_STATUS" } });
      const r = await req("GET", "/public-catalog");
      ok(r.status === 200 && r.headers.get("x-cache") === "MISS", "PR5 f) catalog cache is cold", r.headers.get("x-cache"));
      const lids = (r.body.listings || []).map((l) => l.id);
      ok(!excluded.some((id) => lids.includes(id)), "PR5 f) catalog excludes pending/rejected/inactive/suspended-shop/disabled-shop listings", { lids, excluded });
      ok(lids.includes(ids.la) && (r.body.listings || []).every((l) => l.approvalStatus === "APPROVED" && l.isActive === true), "PR5 f) catalog still has approved active listings only", lids);
      const expected = await prisma.vendorProduct.findUnique({
        where: { id: ids.la },
        include: { vendor: { select: { id: true, shopName: true, status: true, regionId: true, region: true } }, masterProduct: true },
      });
      const got = r.body.listings.find((l) => l.id === ids.la);
      const keys = (o) => Object.keys(JSON.parse(JSON.stringify(o))).sort();
      ok(deepEqual(keys(got), keys(expected)) && deepEqual(keys(got.vendor), keys(expected.vendor)), "PR5 f) listing keeps the same field set", { got: keys(got), want: keys(expected) });
      const codes = (r.body.coupons || []).map((c) => c.code);
      ok(codes.includes("PR5ON") && !codes.includes("PR5OFF"), "PR5 f) catalog coupons: active in, inactive out", codes);
      ok(deepEqual(["categories", "regions", "listings", "coupons", "masterProducts", "banners"].sort(), Object.keys(r.body).sort()), "PR5 f) catalog top-level keys unchanged", Object.keys(r.body));
      const pub = await req("GET", "/coupons");
      const pubCodes = (pub.body || []).map((c) => c.code);
      ok(pub.status === 200 && pubCodes.includes("PR5ON") && !pubCodes.includes("PR5OFF"), "PR5 f) GET /coupons excludes inactive coupons", pubCodes);
      const hit = await req("GET", "/public-catalog");
      const hitIds = (hit.body.listings || []).map((l) => l.id);
      ok(hit.headers.get("x-cache") === "HIT" && !excluded.some((id) => hitIds.includes(id)) && !(hit.body.coupons || []).some((c) => c.code === "PR5OFF"), "PR5 f) cached catalog is still filtered", hit.headers.get("x-cache"));

      // Every DB coupon inactive: an empty list, not the hardcoded fallback
      await prisma.coupon.updateMany({ where: { id: onCoupon.id }, data: { isActive: false } });
      const othersActive = await prisma.coupon.count({ where: { isActive: true } });
      await req("PATCH", `/orders/${ids.orderB}/status`, { token: admin, body: { status: "NOT_A_STATUS" } });
      const none = await req("GET", "/public-catalog");
      ok(othersActive > 0 || deepEqual(none.body.coupons, []), "PR5 f) all DB coupons inactive -> no coupons (no fallback list)", none.body.coupons);
    } finally {
      await prisma.vendorProduct.deleteMany({ where: { id: { in: excluded } } });
      await prisma.vendor.deleteMany({ where: { id: { in: seededVendors } } });
      await prisma.user.deleteMany({ where: { id: { in: seededUsers } } });
      await prisma.coupon.deleteMany({ where: { id: { in: [offCoupon.id, onCoupon.id] } } });
      await req("PATCH", `/orders/${ids.orderB}/status`, { token: admin, body: { status: "NOT_A_STATUS" } });
    }
  });
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
  ok(cs.status === 200 && cs.body.listings.length > 0 && cs.body.listings.every((l) => l.vendorId === ids.va), "vendor cloud-sync returns only own listings", cs.body.listings?.map((l) => l.vendorId));
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

  const pb2 = await pushBinding(ids, { admin, vA, c1, c2 });

  // --- DR scope (Security PR3)
  await drScope(ids, { admin, ...pb2 });

  // --- Staff lifecycle (Security PR4)
  await staffLifecycle(ids, { admin, mzp: pb2.mzp });

  // --- Visibility cleanups (Security PR5)
  await visibilityCleanups(ids, { admin, c1, c2 });

  // --- Brute force protection on partner password login
  let last;
  for (let i = 0; i < 12; i++) last = await req("POST", "/auth/vendor/login", { body: { phone: "9000000099", password: "wrong" + i } });
  ok(last.status === 429, "partner password login is rate limited", last.status);

  await otpHardening();

  console.log(`\n${pass} passed, ${fail} failed`);
  await prisma.$disconnect();
  process.exit(fail ? 1 : 0);
})().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(2); });
