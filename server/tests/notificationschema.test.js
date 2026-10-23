// ensureNotificationSchema: adds notifications.is_broadcast and backfills existing admin broadcasts exactly once
// (fatal on failure, like ensureOtpSchema). Unit table with a fake prisma, then real `node src/index.js` boots
// against a throwaway database created from the PREVIOUS schema (fd3e8fa); the main test DB is never altered.
const fs = require("fs");
const path = require("path");
const net = require("net");
const { spawn, execFileSync } = require("child_process");
const { PrismaClient } = require("@prisma/client");

let pass = 0, fail = 0;
const ok = (cond, name, extra) => {
  if (cond) { pass++; console.log("PASS", name); }
  else { fail++; console.log("FAIL", name, extra !== undefined ? JSON.stringify(extra).slice(0, 300) : ""); }
};

const LOCAL_URL = process.env.DATABASE_URL || "";
const root = path.join(__dirname, "..");
// Committed copy of server/prisma/schema.prisma at fd3e8fa (CI checks out shallow, so no `git show`)
const PREVIOUS_SCHEMA = path.join(__dirname, "fixtures", "schema-pre-pr5.prisma");

// ---- Unit

function fakePrisma({ hasColumn = false, tx = [] } = {}) {
  // tx: per-attempt outcomes of the ALTER transaction (an Error rejects); past the end the last entry repeats.
  const pick = (list, i) => (list.length ? list[Math.min(i, list.length - 1)] : undefined);
  return {
    sql: [],
    txs: [],
    async $queryRawUnsafe(sql) {
      this.sql.push(sql);
      if (sql.includes("pg_attribute")) return hasColumn ? [{ "?column?": 1 }] : [];
      return [];
    },
    $executeRawUnsafe(sql) { return sql; },
    async $transaction(ops) {
      this.sql.push(...ops);
      const r = pick(tx, this.txs.length);
      this.txs.push(ops);
      if (r instanceof Error) throw r;
      return ops.map(() => 0);
    },
  };
}

function harness(extra = {}) {
  const sleeps = [], logs = [], errors = [];
  const opts = { sleep: async (ms) => { sleeps.push(ms); }, log: { log: (m) => logs.push(m), error: (m) => errors.push(m) }, ...extra };
  return { sleeps, logs, errors, opts };
}

const lockErr = () => Object.assign(new Error("canceling statement due to lock timeout"), { code: "55P03" });
const CHECK = "SELECT 1 FROM pg_attribute WHERE attrelid = to_regclass('notifications') AND attname = 'is_broadcast' AND NOT attisdropped";

async function unitTests() {
  let mod;
  try { mod = require("../src/notifications"); } catch (e) { ok(false, "src/notifications.js loads", e && e.message); return; }
  const { ensureNotificationSchema } = mod;

  let p = fakePrisma({ hasColumn: true });
  let h = harness();
  await ensureNotificationSchema(p, h.opts);
  ok(p.sql.length === 1 && p.sql[0] === CHECK && p.txs.length === 0 && h.sleeps.length === 0 && h.errors.length === 0,
    "unit: column present -> only the pg_attribute check, no ALTER", { sql: p.sql, h });

  p = fakePrisma();
  h = harness();
  await ensureNotificationSchema(p, h.opts);
  const ops = p.txs[0] || [];
  ok(p.txs.length === 1 && ops.length === 3, "unit: column missing -> one transaction of three statements", p.txs);
  ok(ops[0] === "SET LOCAL lock_timeout = '5s'" && ops[1] === "LOCK TABLE notifications IN SHARE ROW EXCLUSIVE MODE", "unit: lock_timeout, then LOCK TABLE", ops);
  const doBlock = String(ops[2] || "");
  ok(/^DO \$\$/.test(doBlock) && doBlock.includes(`IF NOT EXISTS (${CHECK}) THEN`) && doBlock.includes("ALTER TABLE notifications ADD COLUMN is_broadcast BOOLEAN NOT NULL DEFAULT false"),
    "unit: DO block re-checks the column, then ADD COLUMN", doBlock);
  ok(/UPDATE notifications SET is_broadcast = true\s+WHERE "userId" IN \(SELECT id FROM users WHERE role = 'ADMIN'::"Role"\) AND title NOT LIKE '📦%'/.test(doBlock)
    && doBlock.indexOf("UPDATE") > doBlock.indexOf("ADD COLUMN") && doBlock.indexOf("UPDATE") < doBlock.indexOf("END IF"),
    "unit: backfill of admin rows (not 📦) runs inside the IF, after the ALTER", doBlock);
  ok(h.logs.length === 1 && h.logs[0].startsWith("[notifications] "), "unit: one log line", h.logs);

  p = fakePrisma({ tx: [lockErr(), lockErr(), null] });
  h = harness();
  await ensureNotificationSchema(p, h.opts);
  ok(p.txs.length === 3 && JSON.stringify(h.sleeps) === "[1000,2000]" && h.errors[0] === "[notifications] ensure schema attempt 1/5 failed: 55P03 canceling statement due to lock timeout",
    "unit: 55P03 twice then success -> 3 attempts, sleeps [1000,2000]", { txs: p.txs.length, h });

  p = fakePrisma({ tx: [lockErr()] });
  h = harness();
  let thrown = null;
  try { await ensureNotificationSchema(p, h.opts); } catch (e) { thrown = e; }
  ok(thrown && p.txs.length === 5 && JSON.stringify(h.sleeps) === "[1000,2000,4000,8000]" && !thrown.message.includes("\n") && /after 5 attempts/.test(thrown.message),
    "unit: fails 5x -> throws a single-line error after 5 attempts", { txs: p.txs.length, msg: thrown && thrown.message });

  p = fakePrisma({ tx: [lockErr()] });
  h = harness({ delaysMs: [5] });
  thrown = null;
  try { await ensureNotificationSchema(p, h.opts); } catch (e) { thrown = e; }
  ok(thrown && p.txs.length === 2 && JSON.stringify(h.sleeps) === "[5]", "unit: opts.delaysMs bounds the attempts", { txs: p.txs.length, sleeps: h.sleeps });

  let stop = false;
  p = fakePrisma({ tx: [lockErr()] });
  h = harness({ shouldStop: () => stop });
  h.opts.log.error = () => { stop = true; };
  thrown = null;
  try { await ensureNotificationSchema(p, h.opts); } catch (e) { thrown = e; }
  ok(!thrown && p.txs.length === 1 && h.sleeps.length === 0, "unit: shouldStop after first failure -> resolves, no further attempts", { txs: p.txs.length, thrown: thrown && thrown.message });

  p = fakePrisma();
  h = harness({ shouldStop: () => true });
  await ensureNotificationSchema(p, h.opts);
  ok(p.sql.length === 0, "unit: shouldStop before start -> no queries", p.sql);
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

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const timeout = (ms) => new Promise((resolve) => setTimeout(() => resolve("timeout"), ms));

async function bootHealthy(url) {
  const s = await startServer(url);
  let up = false;
  for (let i = 0; i < 100 && !up; i++) {
    if (s.child.exitCode !== null) break;
    try { up = (await fetch(`http://127.0.0.1:${s.port}/health`)).ok; } catch { up = false; }
    if (!up) await sleep(200);
  }
  return { s, up };
}

async function stopServer(s) {
  if (s.child.exitCode !== null || s.child.signalCode !== null) return;
  s.child.kill("SIGTERM");
  if ((await Promise.race([s.exited, timeout(12000)])) === "timeout") s.child.kill("SIGKILL");
}

async function seed(db) {
  const users = [["ns-admin", "9999999999", "ADMIN"], ["ns-c1", "9400000004", "CUSTOMER"]];
  for (const [id, phone, role] of users) {
    await db.$executeRawUnsafe(`INSERT INTO users (id, phone, name, role, "updatedAt") VALUES ($1, $2, $3, $4::"Role", now())`, id, phone, `Seed ${id}`, role);
  }
  const notes = [
    ["ns-bc", "ns-admin", "Sale", "10% off"],
    ["ns-bc2", "ns-admin", "Monsoon offer", "Free delivery"],
    ["ns-order", "ns-admin", "📦 Order Confirmed!", "Your order was placed"],
    ["ns-cust", "ns-c1", "Welcome", "Hi"],
  ];
  for (const [id, userId, title, message] of notes) {
    await db.$executeRawUnsafe(`INSERT INTO notifications (id, "userId", title, message) VALUES ($1, $2, $3, $4)`, id, userId, title, message);
  }
}

const flags = async (db) => Object.fromEntries(
  (await db.$queryRawUnsafe("SELECT id, is_broadcast FROM notifications ORDER BY id")).map((r) => [r.id, r.is_broadcast])
);

async function processTests() {
  const name = `buildcity_notifschema_${process.pid}`;
  const admin = new PrismaClient({ datasources: { db: { url: dbUrl("postgres") } } });
  const tmpDir = path.join(__dirname, ".tmp-notif");
  let db = null;
  try {
    fs.mkdirSync(tmpDir, { recursive: true });
    // Copied next to a scratch path so prisma resolves nothing else from the fixtures dir
    const oldSchema = path.join(tmpDir, "schema-pre-pr5.prisma");
    fs.copyFileSync(PREVIOUS_SCHEMA, oldSchema);
    ok(!fs.readFileSync(oldSchema, "utf8").includes("is_broadcast"), "previous schema has no is_broadcast column");

    await admin.$executeRawUnsafe(`CREATE DATABASE "${name}"`);
    const url = dbUrl(name);
    execFileSync("npx", ["prisma", "db", "push", "--skip-generate", "--schema", oldSchema], { cwd: root, env: { ...process.env, DATABASE_URL: url, DIRECT_URL: url }, stdio: "ignore" });
    await admin.$executeRawUnsafe(`ALTER DATABASE "${name}" SET ${["buildcity", "env"].join(".")} = 'test'`);
    db = new PrismaClient({ datasources: { db: { url } } });
    await seed(db);

    // Boot 1: column added, admin broadcasts backfilled, the 📦 row and customer rows stay private
    let { s, up } = await bootHealthy(url);
    try {
      ok(up, "boot 1 (previous schema): server becomes healthy", { stdout: s.out.stdout, stderr: s.out.stderr });
      const cols = await db.$queryRawUnsafe(
        "SELECT format_type(a.atttypid, a.atttypmod) AS type, a.attnotnull, pg_get_expr(d.adbin, d.adrelid) AS def FROM pg_attribute a LEFT JOIN pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum WHERE a.attrelid = to_regclass('notifications') AND a.attname = 'is_broadcast' AND NOT a.attisdropped"
      );
      ok(cols.length === 1 && cols[0].type === "boolean" && cols[0].attnotnull === true && cols[0].def === "false", "boot 1: is_broadcast BOOLEAN NOT NULL DEFAULT false", cols);
      const f = await flags(db);
      ok(f["ns-bc"] === true && f["ns-bc2"] === true, "boot 1: admin broadcast rows backfilled to true", f);
      ok(f["ns-order"] === false, "boot 1: admin 📦 order notice stays private", f);
      ok(f["ns-cust"] === false, "boot 1: customer row stays false", f);
      ok(s.out.stdout.includes("[notifications] "), "boot 1: logs the schema change", s.out.stdout);
      ok(!/postgres(ql)?:\/\//.test(s.out.stdout + s.out.stderr), "boot 1: no connection string in output");
    } finally {
      await stopServer(s);
    }

    // An admin un-flags a row by hand; the next boot must not backfill again
    await db.$executeRawUnsafe("UPDATE notifications SET is_broadcast = false WHERE id = 'ns-bc2'");
    await db.$executeRawUnsafe(`INSERT INTO notifications (id, "userId", title, message) VALUES ('ns-new', 'ns-admin', 'Later private', 'x')`);
    const before = await flags(db);
    ({ s, up } = await bootHealthy(url));
    try {
      ok(up, "boot 2: server becomes healthy", { stderr: s.out.stderr });
      const after = await flags(db);
      ok(JSON.stringify(after) === JSON.stringify(before) && after["ns-bc2"] === false && after["ns-new"] === false, "boot 2: values unchanged (backfill did not re-run)", { before, after });
      ok(!s.out.stdout.includes("[notifications] ") && !s.out.stderr.includes("[notifications]"), "boot 2: no schema change, no errors", { out: s.out.stdout, err: s.out.stderr });
    } finally {
      await stopServer(s);
    }

    // Two boots racing on a fresh column: one adds + backfills, the other is a no-op
    await db.$executeRawUnsafe("ALTER TABLE notifications DROP COLUMN is_broadcast");
    const { ensureNotificationSchema } = require("../src/notifications");
    const racers = [new PrismaClient({ datasources: { db: { url } } }), new PrismaClient({ datasources: { db: { url } } })];
    try {
      await Promise.all(racers.map((c) => c.$connect()));
      const hs = racers.map(() => harness());
      await Promise.all(racers.map((c, i) => ensureNotificationSchema(c, hs[i].opts)));
      ok(hs.every((x) => x.errors.length === 0), "parallel ensureNotificationSchema: no errors", hs.map((x) => x.errors));
      const f = await flags(db);
      ok(f["ns-bc"] === true && f["ns-bc2"] === true && f["ns-new"] === true && f["ns-order"] === false && f["ns-cust"] === false, "parallel ensureNotificationSchema: column present, backfilled once", f);
    } finally {
      await Promise.all(racers.map((c) => c.$disconnect()));
    }
  } finally {
    if (db) await db.$disconnect();
    await admin.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`).catch((e) => { fail++; console.log("FAIL drop", name, e.message); });
    await admin.$disconnect();
    fs.rmSync(tmpDir, { recursive: true, force: true });
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
