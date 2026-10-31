// ensureOtpSchema: bounded retry, then the boot refuses to start. Unit table with a fake prisma, then real
// `node src/index.js` boots against throwaway databases on the same localhost server; the main test DB is never altered.
// Adds ~45 s to the suite: boot A waits out every retry (5 x 5 s lock_timeout + 15 s of sleeps) and boot B one retry.
const path = require("path");
const net = require("net");
const { spawn, execFileSync } = require("child_process");
const { PrismaClient } = require("@prisma/client");
const { ensureOtpSchema } = require("../src/otp");

let pass = 0, fail = 0;
const ok = (cond, name, extra) => {
  if (cond) { pass++; console.log("PASS", name); }
  else { fail++; console.log("FAIL", name, extra !== undefined ? JSON.stringify(extra).slice(0, 300) : ""); }
};

const LOCAL_URL = process.env.DATABASE_URL || "";
const root = path.join(__dirname, "..");
const BOOT_FAIL = /^\[boot\] refusing to start: .+$/;

// ---- Unit

function fakePrisma({ hasColumn = false, probe = [], alter = [] } = {}) {
  // probe/alter: per-call outcomes; an Error rejects, anything else resolves. Past the end, the last entry repeats.
  const pick = (list, i) => (list.length ? list[Math.min(i, list.length - 1)] : undefined);
  return {
    probes: 0,
    txs: 0,
    async $queryRawUnsafe() {
      const r = pick(probe, this.probes++);
      if (r instanceof Error) throw r;
      return hasColumn ? [{ "?column?": 1 }] : [];
    },
    $executeRawUnsafe(sql) { return sql; },
    async $transaction(ops) {
      const r = pick(alter, this.txs++);
      if (r instanceof Error) throw r;
      return ops.map(() => 0);
    },
  };
}

function harness(extra = {}) {
  const sleeps = [];
  const logs = [];
  const errors = [];
  const opts = {
    sleep: async (ms) => { sleeps.push(ms); },
    log: { log: (m) => logs.push(m), error: (m) => errors.push(m) },
    ...extra,
  };
  return { sleeps, logs, errors, opts };
}

const lockErr = () => Object.assign(new Error("canceling statement due to lock timeout"), { code: "55P03" });

async function unitTests() {
  let p = fakePrisma({ hasColumn: true });
  let h = harness();
  await ensureOtpSchema(p, h.opts);
  ok(p.probes === 1 && p.txs === 0 && h.sleeps.length === 0 && h.logs.length === 0 && h.errors.length === 0,
    "unit: column present -> 1 probe, 0 transactions, 0 sleeps", { p, h });

  p = fakePrisma();
  h = harness();
  await ensureOtpSchema(p, h.opts);
  ok(p.probes === 1 && p.txs === 1 && h.sleeps.length === 0 && h.logs[0] === "[otp] added otp_verifications.attempts",
    "unit: column missing, ALTER succeeds -> 1 transaction, logs added", { p, h });

  p = fakePrisma({ alter: [lockErr(), lockErr(), null] });
  h = harness();
  await ensureOtpSchema(p, h.opts);
  ok(p.txs === 3 && JSON.stringify(h.sleeps) === "[1000,2000]", "unit: 55P03 twice then success -> 3 transactions, sleeps [1000,2000]", { p, h });
  ok(h.errors.length === 2 && h.errors[0] === "[otp] ensure schema attempt 1/5 failed: 55P03 canceling statement due to lock timeout",
    "unit: each failed attempt logs code and message", h.errors);

  p = fakePrisma({ probe: [new Error("connection refused")] });
  h = harness();
  let thrown = null;
  try { await ensureOtpSchema(p, h.opts); } catch (e) { thrown = e; }
  ok(thrown && p.probes === 5 && p.txs === 0 && JSON.stringify(h.sleeps) === "[1000,2000,4000,8000]",
    "unit: probe always rejects -> throws after 5 attempts, sleeps [1000,2000,4000,8000]", { p, h, msg: thrown && thrown.message });
  ok(thrown && thrown.message === "otp_verifications.attempts is missing and could not be added after 5 attempts: connection refused"
    && thrown.cause instanceof Error, "unit: thrown message mentions attempts and keeps cause", thrown && thrown.message);

  p = fakePrisma({ alter: [lockErr()] });
  h = harness();
  thrown = null;
  try { await ensureOtpSchema(p, h.opts); } catch (e) { thrown = e; }
  ok(thrown && p.txs === 5 && h.errors.length === 5 && h.errors[4].startsWith("[otp] ensure schema attempt 5/5 failed: 55P03"),
    "unit: ALTER always rejects -> throws after 5 attempts", { p, h });
  ok(thrown && !thrown.message.includes("\n"), "unit: thrown message is single-line");

  let stop = false;
  p = fakePrisma({ alter: [lockErr()] });
  h = harness({ shouldStop: () => stop });
  h.opts.log.error = () => { stop = true; }; // a SIGTERM lands while the first attempt fails
  thrown = null;
  try { await ensureOtpSchema(p, h.opts); } catch (e) { thrown = e; }
  ok(!thrown && p.txs === 1 && h.sleeps.length === 0, "unit: shouldStop after first failure -> resolves, no further attempts", { p, h, thrown: thrown && thrown.message });
}

// ---- Process level

const freePort = () => new Promise((resolve, reject) => {
  const s = net.createServer();
  s.unref();
  s.on("error", reject);
  s.listen(0, "127.0.0.1", () => { const { port } = s.address(); s.close(() => resolve(port)); });
});

function dbUrl(name) {
  const u = new URL(LOCAL_URL);
  u.pathname = "/" + name;
  u.search = "";
  return u.toString();
}

async function startServer(url) {
  const port = await freePort();
  const env = {
    PATH: process.env.PATH,
    JWT_SECRET: process.env.JWT_SECRET || ["local", "test", "jwt", "value", "local", "test", "jwt", "value", "000000"].join("-"),
    PORT: String(port),
    SMS_USERNAME: "test",
    SMS_APIKEY: "test",
    APP_ENV: "test",
    DATABASE_URL: url,
    DIRECT_URL: url,
  };
  const child = spawn("node", ["src/index.js"], { cwd: root, env, stdio: ["ignore", "pipe", "pipe"] });
  const out = { stdout: "", stderr: "" };
  child.stdout.on("data", (d) => { out.stdout += d; });
  child.stderr.on("data", (d) => { out.stderr += d; });
  const exited = new Promise((resolve) => child.on("exit", (code) => resolve(code)));
  return { child, port, out, exited };
}

async function healthy(port) {
  try {
    const r = await fetch(`http://127.0.0.1:${port}/health`);
    return r.ok;
  } catch {
    return false;
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const timeout = (ms) => new Promise((resolve) => setTimeout(() => resolve("timeout"), ms));

async function stopServer(s) {
  if (s.child.exitCode !== null || s.child.signalCode !== null) return;
  s.child.kill("SIGTERM");
  if ((await Promise.race([s.exited, timeout(12000)])) === "timeout") s.child.kill("SIGKILL");
}

// Throwaway DB with the current schema and the test marker. dropColumn simulates a prod DB from before PR #43.
async function createDb(admin, name, { dropColumn }) {
  await admin.$executeRawUnsafe(`CREATE DATABASE "${name}"`);
  const url = dbUrl(name);
  execFileSync("npx", ["prisma", "db", "push", "--skip-generate"], { cwd: root, env: { ...process.env, DATABASE_URL: url, DIRECT_URL: url }, stdio: "ignore" });
  await admin.$executeRawUnsafe(`ALTER DATABASE "${name}" SET buildcity.env = 'test'`);
  const db = new PrismaClient({ datasources: { db: { url } } });
  if (dropColumn) await db.$executeRawUnsafe("ALTER TABLE otp_verifications DROP COLUMN attempts");
  await db.$executeRawUnsafe("INSERT INTO otp_verifications (id, phone, otp, \"expiresAt\") VALUES ('otpschema-row', '9999999999', 'x', now() + interval '5 minutes')");
  return { url, db };
}

// Holds ACCESS SHARE on otp_verifications (what pg_dump takes) until release() or maxMs.
async function holdLock(db, maxMs) {
  let release;
  const released = new Promise((r) => { release = r; });
  let locked;
  const isLocked = new Promise((r) => { locked = r; });
  const done = db.$transaction(async (tx) => {
    await tx.$executeRawUnsafe("LOCK TABLE otp_verifications IN ACCESS SHARE MODE");
    locked();
    await Promise.race([released, sleep(maxMs)]);
  }, { maxWait: 10000, timeout: maxMs + 10000 }).catch((e) => { fail++; console.log("FAIL lock holder", e.message); locked(); });
  await isLocked;
  return { release: async () => { release(); await done; } };
}

async function bootA(admin, name) {
  const { url, db } = await createDb(admin, name, { dropColumn: true });
  const lock = await holdLock(db, 60000);
  let s = null;
  try {
    const started = Date.now();
    s = await startServer(url);
    let everHealthy = false;
    let code = "timeout";
    while (Date.now() - started < 55000) {
      if (await healthy(s.port)) everHealthy = true;
      const r = await Promise.race([s.exited, sleep(250).then(() => "running")]);
      if (r !== "running") { code = r; break; }
    }
    const lines = s.out.stderr.split("\n").filter(Boolean);
    ok(typeof code === "number" && code !== 0, `boot A (lock held): exits non-zero within 55 s (${Date.now() - started} ms)`, { code, stderr: s.out.stderr });
    ok(!everHealthy, "boot A: /health never answered");
    const refusal = lines.filter((l) => l.startsWith("[boot] refusing to start:"));
    ok(refusal.length === 1 && BOOT_FAIL.test(refusal[0]) && refusal[0].includes("after 5 attempts"), "boot A: one single-line [boot] refusing line", lines);
    ok(lines.some((l) => l.startsWith("[otp] ensure schema attempt 5/5 failed:")), "boot A: logs each failed attempt", lines);
    ok(!/postgres(ql)?:\/\//.test(s.out.stdout + s.out.stderr), "boot A: no connection string in output");
  } finally {
    if (s) await stopServer(s);
    await lock.release();
    await db.$disconnect();
  }
}

async function bootB(admin, name) {
  const { url, db } = await createDb(admin, name, { dropColumn: true });
  const lock = await holdLock(db, 7000);
  let s = null;
  try {
    s = await startServer(url);
    let up = false;
    for (let i = 0; i < 160 && !up; i++) {
      if (s.child.exitCode !== null) break;
      up = await healthy(s.port);
      if (!up) await sleep(250);
    }
    ok(up, "boot B (lock released mid-retry): server becomes healthy", { stdout: s.out.stdout, stderr: s.out.stderr });
    ok(s.out.stdout.includes("[otp] added otp_verifications.attempts") && s.out.stderr.includes("[otp] ensure schema attempt 1/5 failed:"),
      "boot B: retried, then added the column", { stdout: s.out.stdout, stderr: s.out.stderr });
    const cols = await db.$queryRawUnsafe(
      "SELECT is_nullable, column_default FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'otp_verifications' AND column_name = 'attempts'"
    );
    ok(cols.length === 1 && cols[0].is_nullable === "NO" && cols[0].column_default === "0", "boot B: attempts is NOT NULL DEFAULT 0", cols);
    const rows = await db.$queryRawUnsafe("SELECT attempts FROM otp_verifications WHERE id = 'otpschema-row'");
    ok(rows.length === 1 && rows[0].attempts === 0, "boot B: pre-existing row kept with attempts = 0", rows);
  } finally {
    if (s) await stopServer(s);
    await lock.release();
    await db.$disconnect();
  }
}

async function bootC(admin, name) {
  const { url, db } = await createDb(admin, name, { dropColumn: false });
  let s = null;
  try {
    s = await startServer(url);
    let up = false;
    for (let i = 0; i < 75 && !up; i++) {
      if (s.child.exitCode !== null) break;
      up = await healthy(s.port);
      if (!up) await sleep(200);
    }
    ok(up, "boot C (column present): server becomes healthy", { stderr: s.out.stderr });
    const all = s.out.stdout + s.out.stderr;
    ok(!all.includes("[otp] added") && !all.includes("attempt"), "boot C: no ALTER and no attempt failure lines", all);
  } finally {
    if (s) await stopServer(s);
    await db.$disconnect();
  }
}

async function processTests() {
  const dbs = ["a", "b", "c"].map((x) => `buildcity_otpschema_${process.pid}_${x}`);
  const admin = new PrismaClient({ datasources: { db: { url: dbUrl("postgres") } } });
  try {
    await bootA(admin, dbs[0]);
    await bootB(admin, dbs[1]);
    await bootC(admin, dbs[2]);
  } finally {
    for (const db of dbs) {
      await admin.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${db}" WITH (FORCE)`).catch((e) => { fail++; console.log("FAIL drop", db, e.message); });
    }
    await admin.$disconnect();
  }
}

(async () => {
  await unitTests();
  if (!/^postgres(ql)?:\/\/[^@]*@(localhost|127\.0\.0\.1)[:/]/.test(LOCAL_URL)) {
    fail++;
    console.log("FAIL process-level tests need a localhost DATABASE_URL");
  } else {
    await processTests();
  }
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
