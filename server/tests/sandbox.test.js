// S3: fail-closed SMS/FCM sandbox, test-number OTP, outbox. Spawns its own API with all outbound network stubbed to throw.
const path = require("path");
const fs = require("fs");
const os = require("os");
const { spawn, execFileSync } = require("child_process");

let pass = 0, fail = 0;
const ok = (cond, name, extra) => {
  if (cond) { pass++; console.log("PASS", name); }
  else { fail++; console.log("FAIL", name, extra !== undefined ? JSON.stringify(extra).slice(0, 300) : ""); }
};
const root = path.join(__dirname, "..");
const PORT = String(Number(process.env.TEST_PORT || 5055) + 1);
const BASE = `http://localhost:${PORT}/api/v1`;
const STUB_LOG = path.join(fs.mkdtempSync(path.join(process.env.TMPDIR || os.tmpdir(), "sandbox-")), "net.log");

const req = async (method, p, { token, body } = {}) => {
  const res = await fetch(BASE + p, {
    method,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json; try { json = JSON.parse(text); } catch { json = text; }
  return { status: res.status, body: json };
};
const stubCalls = () => (fs.existsSync(STUB_LOG) ? fs.readFileSync(STUB_LOG, "utf8").trim() : "");

// ---- unit: sms + push + outbox with injected env (in-process, network stubbed here too) ----
async function unit() {
  process.env.APP_ENV = "test";
  delete process.env.FIREBASE_SERVICE_ACCOUNT;
  process.env.FIREBASE_SERVICE_ACCOUNT_PATH = path.join(os.tmpdir(), "does-not-exist.json");
  process.env.SMS_USERNAME = "u"; process.env.SMS_APIKEY = "k";
  const http = require("http"), https = require("https");
  const calls = [];
  const orig = { h: http.request, s: https.request, f: globalThis.fetch };
  http.request = (...a) => { calls.push("http"); throw new Error("stub"); };
  https.request = (...a) => { calls.push("https"); throw new Error("stub"); };
  globalThis.fetch = (...a) => { calls.push("fetch"); throw new Error("stub"); };

  const appEnv = require("../src/appEnv");
  const outbox = require("../src/outbox");
  const sms = require("../src/smsService");
  const push = require("../src/pushService");
  outbox._resetForTests();

  appEnv._resetForTests();
  ok(appEnv.isProduction() === false, "unset env is not production (fail closed)");
  const r = await sms.sendRealSMSOTP("1000012345", "654321");
  ok(r.success === true && r.sandbox === true && calls.length === 0, "SMS non-prod: sandbox result, no network even with creds set", { r, calls });
  ok(outbox.list().length === 1 && outbox.list()[0].kind === "sms", "SMS lands in outbox");

  const msg = { token: "t", notification: { title: "a", body: "b" } };
  let p = await push.dispatchFcm("vendor_order", msg, "v1");
  ok(p.sandbox === true && outbox.list()[0].kind === "push", "push with no service account: not sent, in outbox", p);

  process.env.FIREBASE_SERVICE_ACCOUNT = JSON.stringify({ project_id: "buildcity-prod", client_email: "x@y", private_key: "k" });
  p = await push.dispatchFcm("vendor_order", msg, "v2");
  ok(p.sandbox === true && outbox.list().filter((e) => e.kind === "push").length === 2, "push with non -staging project_id: not sent, in outbox", p);
  ok(push.initFirebase() === false, "initFirebase refuses a non -staging account off-prod");

  // ring buffer cap
  for (let i = 0; i < 250; i++) outbox.record("sms", { i });
  ok(outbox.list().length === outbox.MAX && outbox.MAX === 200, "outbox keeps the last 200", outbox.list().length);
  ok(outbox.list()[0].payload.i === 249, "outbox newest first");

  // outbox route guard with injected env
  const mk = () => { const o = { code: null, json(b) { o.body = b; return o; }, status(c) { o.code = c; return o; } }; return o; };
  let nexted = false; let res = mk();
  outbox.notInProduction(() => true)({}, res, () => { nexted = true; });
  ok(res.code === 404 && !nexted, "outbox route 404 when isProduction()");
  nexted = false; res = mk();
  outbox.notInProduction(() => false)({}, res, () => { nexted = true; });
  ok(nexted && res.code === null, "outbox route passes through when not production");

  // prod path unchanged: with isProduction() true the gateway IS called
  const before = outbox.list().length;
  const realIsProd = appEnv.isProduction;
  appEnv.isProduction = () => true;
  calls.length = 0;
  const sr = await sms.sendRealSMSOTP("9876543210", "123456");
  ok(calls.includes("http") && calls.includes("fetch") && calls.includes("https"), "isProduction() true: gateway, relay and https fallback are all attempted", calls);
  ok(sr.success === false && !sr.sandbox && outbox.list().length === before, "isProduction() true: no sandbox, no outbox entry", sr);
  calls.length = 0;
  let threw = false;
  try { await push.dispatchFcm("vendor_order", msg, "v3"); } catch { threw = true; }
  ok(outbox.list().length === before, "isProduction() true: push is not sandboxed", outbox.list().length);
  appEnv.isProduction = realIsProd;

  // staging service account is allowed through (initFirebase would run); check the gate only
  process.env.FIREBASE_SERVICE_ACCOUNT = JSON.stringify({ project_id: "buildcity-staging" });
  const n = outbox.list().length;
  await push.dispatchFcm("vendor_order", msg, "v4").catch(() => null);
  ok(outbox.list().length === n, "-staging project_id is not sandboxed (would be sent)");

  http.request = orig.h; https.request = orig.s; globalThis.fetch = orig.f;
  delete process.env.FIREBASE_SERVICE_ACCOUNT;
}

// ---- integration: real API, APP_ENV=test, outbound network stubbed to throw ----
async function integration() {
  const dbUrl = process.env.DATABASE_URL;
  const env = {
    ...process.env, PORT, TEST_PORT: PORT, APP_ENV: "test", NODE_ENV: "production",
    SMS_USERNAME: "u", SMS_APIKEY: "k", STUB_LOG,
    NODE_OPTIONS: `-r ${path.join(__dirname, "stubnet.js")}`,
  };
  delete env.FIREBASE_SERVICE_ACCOUNT;
  const server = spawn("node", ["src/index.js"], { cwd: root, env, stdio: ["ignore", "ignore", "inherit"] });
  try {
    let up = false;
    for (let i = 0; i < 60 && !up; i++) {
      try { up = (await fetch(`http://localhost:${PORT}/health`)).ok; } catch {}
      if (!up) await new Promise((r) => setTimeout(r, 200));
    }
    ok(up, "sandbox server started");
    execFileSync("node", [path.join(__dirname, "fixture.js")], { env: { ...process.env } });

    const reqOk = await req("POST", "/auth/otp/request", { body: { phone: "1000012345", type: "register" } });
    ok(reqOk.status === 200 && reqOk.body.success === true, "OTP request for test number succeeds", reqOk);
    ok(stubCalls() === "", "no http/https/fetch call was made", stubCalls());

    const real = await req("POST", "/auth/otp/request", { body: { phone: "9876543210", type: "register" } });
    ok(real.status === 403 && real.body.error === "Staging: use a test number", "real-looking number -> 403", real);
    const staff = await req("POST", "/auth/otp/request", { body: { phone: "9999999999" } });
    ok(staff.status === 403 && staff.body.error === "Staging: use a test number", "staff number off-prod follows the test-number rule", staff);

    const bad = await req("POST", "/auth/otp/verify", { body: { phone: "1000012345", otp: "000000" } });
    ok(bad.status === 401, "wrong OTP rejected", bad.status);
    const good = await req("POST", "/auth/otp/verify", { body: { phone: "1000012345", otp: "654321" } });
    ok(good.status === 200 && !!good.body.token, "1000012345 + 654321 -> token", good.status);
    ok(stubCalls() === "", "still no outbound call after verify", stubCalls());

    const anon = await req("GET", "/_staging/outbox");
    ok(anon.status === 401 || anon.status === 403, "outbox needs auth", anon.status);
    const cust = await req("GET", "/_staging/outbox", { token: good.body.token });
    ok(cust.status === 403, "outbox needs ADMIN", cust.status);
    const admin = (await req("POST", "/auth/vendor/login", { body: { phone: "9999999999", password: "admin123" } })).body.token;
    const box = await req("GET", "/_staging/outbox", { token: admin });
    ok(box.status === 200 && box.body.entries.some((e) => e.kind === "sms" && e.payload.to === "1000012345"), "ADMIN sees the sandboxed SMS", box.body);
  } finally {
    server.kill("SIGTERM");
  }
}

// ---- unit (D11): staging with NO SMS / Firebase credentials still sandboxes cleanly ----
const NO_CREDS_KEYS = ["APP_ENV", "SMS_USERNAME", "SMS_APIKEY", "ARADHYA_SMS_USERNAME", "ARADHYA_SMS_APIKEY", "FIREBASE_SERVICE_ACCOUNT", "FIREBASE_SERVICE_ACCOUNT_PATH"];
async function unitNoCreds() {
  const saved = Object.fromEntries(NO_CREDS_KEYS.map((k) => [k, process.env[k]]));
  const http = require("http"), https = require("https");
  const calls = [], errors = [];
  const orig = { h: http.request, s: https.request, f: globalThis.fetch, e: console.error };
  try {
    process.env.APP_ENV = "staging";
    for (const k of ["SMS_USERNAME", "SMS_APIKEY", "ARADHYA_SMS_USERNAME", "ARADHYA_SMS_APIKEY", "FIREBASE_SERVICE_ACCOUNT"]) delete process.env[k];
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH = path.join(os.tmpdir(), "does-not-exist-stgsbx.json");
    http.request = () => { calls.push("http"); throw new Error("stub"); };
    https.request = () => { calls.push("https"); throw new Error("stub"); };
    globalThis.fetch = () => { calls.push("fetch"); throw new Error("stub"); };
    console.error = (...a) => { errors.push(a.map(String).join(" ")); };

    const appEnv = require("../src/appEnv");
    const outbox = require("../src/outbox");
    const sms = require("../src/smsService");
    const push = require("../src/pushService");
    appEnv._resetForTests();
    outbox._resetForTests();

    const r = await sms.sendRealSMSOTP("1000012347", "654321");
    ok(r.success === true && r.sandbox === true, "no creds, staging: SMS sandbox result", r);
    ok(outbox.list().some((e) => e.kind === "sms" && e.payload.to === "1000012347"), "no creds, staging: SMS in outbox");

    // The send* helpers need a registered device token; dispatchFcm is their single send point.
    const msg = { token: "t", notification: { title: "a", body: "b" } };
    const pc = await push.dispatchFcm("customer_order_status", msg, "c1");
    const pv = await push.dispatchFcm("vendor_order", msg, "v1");
    ok(pc.sandbox === true && pv.sandbox === true, "no creds, staging: push sandboxed", { pc, pv });
    ok(outbox.list().filter((e) => e.kind === "push").length === 2, "no creds, staging: push in outbox");
    ok(calls.length === 0, "no creds, staging: zero network calls", calls);
    ok(errors.length === 0, "no creds, staging: zero console.error calls", errors);
  } finally {
    http.request = orig.h; https.request = orig.s; globalThis.fetch = orig.f; console.error = orig.e;
    for (const [k, v] of Object.entries(saved)) { if (v === undefined) delete process.env[k]; else process.env[k] = v; }
    require("../src/appEnv")._resetForTests();
  }
}

// ---- integration (D11): APP_ENV=staging API with NO SMS / Firebase env, on its own staging-marked local DB ----
const STG_DB = "buildcity_test_stgsbx";
const STG_ADMIN_PW = "stgsbx-admin-pw";
async function integrationNoCreds() {
  const base = new URL(process.env.DATABASE_URL || "");
  if (!["localhost", "127.0.0.1"].includes(base.hostname)) throw new Error("refusing: DATABASE_URL is not localhost");
  const stgUrl = new URL(base.href);
  stgUrl.pathname = "/" + STG_DB;
  const url = stgUrl.href;
  // psql gets the connection via PG* env (never argv), so a failure message cannot leak the URL.
  const pgEnv = {
    ...process.env, PGHOST: base.hostname, PGPORT: base.port || "5432",
    PGUSER: decodeURIComponent(base.username), PGPASSWORD: decodeURIComponent(base.password),
    PGDATABASE: decodeURIComponent(base.pathname.slice(1)) || "postgres",
  };
  const psql = (sql) => {
    try { execFileSync("psql", ["-v", "ON_ERROR_STOP=1", "-q", "-c", sql], { env: pgEnv, stdio: "ignore" }); }
    catch { throw new Error(`psql failed: ${sql}`); }
  };
  const PORT3 = String(Number(process.env.TEST_PORT || 5055) + 3);
  const B3 = `http://localhost:${PORT3}/api/v1`;
  const LOG3 = path.join(fs.mkdtempSync(path.join(process.env.TMPDIR || os.tmpdir(), "sandbox-stg-")), "net.log");
  const req3 = async (method, p, { token, body } = {}) => {
    const res = await fetch(B3 + p, {
      method,
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    let json; try { json = JSON.parse(text); } catch { json = text; }
    return { status: res.status, body: json };
  };
  const calls3 = () => (fs.existsSync(LOG3) ? fs.readFileSync(LOG3, "utf8").trim() : "");

  let server = null, client = null;
  let stderr = "";
  try {
    psql(`DROP DATABASE IF EXISTS ${STG_DB} WITH (FORCE)`);
    psql(`CREATE DATABASE ${STG_DB}`);
    psql(`ALTER DATABASE ${STG_DB} SET buildcity.env = 'staging'`);
    try {
      execFileSync("npx", ["prisma", "db", "push", "--skip-generate"], { cwd: root, env: { ...process.env, DATABASE_URL: url, DIRECT_URL: url }, stdio: "ignore" });
    } catch { throw new Error("prisma db push on the staging test DB failed"); }

    const { PrismaClient } = require("@prisma/client");
    const bcrypt = require("bcryptjs");
    client = new PrismaClient({ datasources: { db: { url } } });
    // /auth/vendor/login grants ADMIN only to the super-admin phone 9999999999.
    await client.user.create({ data: { phone: "9999999999", name: "Staging Admin", role: "ADMIN", password: await bcrypt.hash(STG_ADMIN_PW, 10) } });

    const env = {
      ...process.env, PORT: PORT3, TEST_PORT: PORT3, APP_ENV: "staging", NODE_ENV: "production",
      DATABASE_URL: url, DIRECT_URL: url, STUB_LOG: LOG3,
      NODE_OPTIONS: `-r ${path.join(__dirname, "stubnet.js")}`,
      FIREBASE_SERVICE_ACCOUNT_PATH: path.join(os.tmpdir(), "does-not-exist-stgsbx.json"),
    };
    for (const k of ["SMS_USERNAME", "SMS_APIKEY", "ARADHYA_SMS_USERNAME", "ARADHYA_SMS_APIKEY", "SMS_RELAY_SECRET", "FIREBASE_SERVICE_ACCOUNT"]) delete env[k];
    server = spawn("node", ["src/index.js"], { cwd: root, env, stdio: ["ignore", "ignore", "pipe"] });
    server.stderr.on("data", (d) => { stderr += d; });

    let up = false;
    for (let i = 0; i < 60 && !up; i++) {
      try { up = (await fetch(`http://localhost:${PORT3}/health`)).ok; } catch {}
      if (!up) await new Promise((r) => setTimeout(r, 200));
    }
    ok(up, "staging no-creds server started");
    const envInfo = await req3("GET", "/env");
    ok(envInfo.status === 200 && envInfo.body.env === "staging" && envInfo.body.db === "staging", "staging no-creds: /env reports staging", envInfo.body);

    const otpReq = await req3("POST", "/auth/otp/request", { body: { phone: "1000012348", type: "register" } });
    ok(otpReq.status === 200 && otpReq.body.success === true, "staging no-creds: OTP request succeeds", otpReq);
    const admin = (await req3("POST", "/auth/vendor/login", { body: { phone: "9999999999", password: STG_ADMIN_PW } })).body.token;
    const box = await req3("GET", "/_staging/outbox", { token: admin });
    ok(box.status === 200 && box.body.entries.some((e) => e.kind === "sms" && e.payload.to === "1000012348"), "staging no-creds: SMS in outbox", box.body);
    const good = await req3("POST", "/auth/otp/verify", { body: { phone: "1000012348", otp: "654321" } });
    ok(good.status === 200 && !!good.body.token, "staging no-creds: 1000012348 + 654321 -> token", good.status);
    ok(calls3() === "", "staging no-creds: no outbound call", calls3());
    ok(!stderr.includes("Gateway credentials missing") && !stderr.includes("Firebase Admin initialization error"), "staging no-creds: no SMS/Firebase credential errors on stderr", stderr.slice(-300));
  } finally {
    if (server) {
      const exited = new Promise((r) => server.once("exit", r));
      server.kill("SIGTERM");
      await Promise.race([exited, new Promise((r) => setTimeout(r, 3000))]);
    }
    if (client) await client.$disconnect().catch(() => {});
    try { psql(`DROP DATABASE IF EXISTS ${STG_DB} WITH (FORCE)`); } catch (e) { console.log("WARN", e.message); }
  }
}

(async () => {
  try { await unit(); } catch (e) { fail++; console.log("FAIL unit threw", e && e.stack); }
  try { await unitNoCreds(); } catch (e) { fail++; console.log("FAIL unitNoCreds threw", e && e.stack); }
  try { await integration(); } catch (e) { fail++; console.log("FAIL integration threw", e && e.stack); }
  try { await integrationNoCreds(); } catch (e) { fail++; console.log("FAIL integrationNoCreds threw", e && e.stack); }
  console.log(`\nsandbox: passed=${pass} failed=${fail}`);
  process.exit(fail ? 1 : 0);
})();
