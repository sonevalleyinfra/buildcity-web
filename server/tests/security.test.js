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

  // --- Brute force protection on partner password login
  let last;
  for (let i = 0; i < 12; i++) last = await req("POST", "/auth/vendor/login", { body: { phone: "9000000099", password: "wrong" + i } });
  ok(last.status === 429, "partner password login is rate limited", last.status);

  await otpHardening();

  console.log(`\n${pass} passed, ${fail} failed`);
  await prisma.$disconnect();
  process.exit(fail ? 1 : 0);
})().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(2); });
