// ensureStaffSchema: adds the disabled_at soft-delete columns (fatal on failure, like ensureOtpSchema) and the partial
// unique phone indexes (non-fatal: duplicates only log a warning). Unit table with a fake prisma, then real
// `node src/index.js` boots against a throwaway database created from the PREVIOUS schema (146a7d5); the main test
// DB is never altered.
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
// Committed copy of server/prisma/schema.prisma at 146a7d5 (CI checks out shallow, so no `git show`)
const PREVIOUS_SCHEMA = path.join(__dirname, "fixtures", "schema-pre-pr4.prisma");
const WARN = (name, code) => `[staff] unique index ${name} not created (${code}): duplicate live phones; run node scripts/staff-phone-report.js`;

// ---- Unit

function fakePrisma({ hasColumns = false, alter = [], index = {}, invalid = [], raced = [], recheckFails = false } = {}) {
  // alter: per-attempt outcomes (an Error rejects); past the end the last entry repeats.
  // index: { [indexName]: Error } makes that CREATE INDEX reject (the index is then absent unless listed in raced,
  // i.e. a racing boot built it). invalid: index names whose pg_index row is not valid. recheckFails: the pg_index
  // query after a failed CREATE rejects.
  const pick = (list, i) => (list.length ? list[Math.min(i, list.length - 1)] : undefined);
  return {
    sql: [],
    alters: 0,
    async $queryRawUnsafe(sql, ...args) {
      this.sql.push(sql);
      if (sql.includes("pg_attribute")) return hasColumns ? [{ tbl: "vendors" }, { tbl: "district_representatives" }] : [];
      if (sql.includes("pg_index")) {
        if (index[args[0]] && recheckFails) throw new Error("connection reset");
        if (index[args[0]] && !raced.includes(args[0])) return [];
        return [{ indisvalid: !invalid.includes(args[0]) }];
      }
      return [];
    },
    $executeRawUnsafe(sql) { return sql; },
    async $transaction(ops) {
      this.sql.push(...ops);
      if (ops.some((s) => /ALTER TABLE/.test(s))) {
        const r = pick(alter, this.alters++);
        if (r instanceof Error) throw r;
      }
      for (const [name, err] of Object.entries(index)) {
        if (ops.some((s) => s.includes(`CREATE UNIQUE INDEX IF NOT EXISTS ${name} `))) throw err;
      }
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
const dupErr = () => Object.assign(new Error("Raw query failed. Code: `23505`. Message: `could not create unique index`"), { code: "P2010", meta: { code: "23505" } });
const noWrites = (p) => !p.sql.some((s) => /\b(DELETE|UPDATE|DROP|TRUNCATE|CONCURRENTLY)\b/i.test(s));

async function unitTests() {
  let staff;
  try { staff = require("../src/staff"); } catch (e) { ok(false, "src/staff.js loads", e && e.message); return; }
  const { ensureStaffSchema } = staff;

  let p = fakePrisma({ hasColumns: true });
  let h = harness();
  let r = await ensureStaffSchema(p, h.opts);
  ok(!p.sql.some((s) => /ALTER TABLE/.test(s)) && h.sleeps.length === 0 && h.errors.length === 0, "unit: columns present -> no ALTER, no sleeps, no errors", { sql: p.sql, h });
  ok(r && r.indexes && r.indexes.vendors === true && r.indexes.drs === true, "unit: both indexes ensured -> { vendors: true, drs: true }", r);
  ok(p.sql.filter((s) => /^CREATE UNIQUE INDEX IF NOT EXISTS (vendors|district_representatives)_phone_live_key ON (vendors|district_representatives) \(phone\) WHERE disabled_at IS NULL$/.test(s)).length === 2,
    "unit: partial unique index statements", p.sql);
  ok(p.sql.filter((s) => s === "SET LOCAL lock_timeout = '5s'").length === 2 && noWrites(p), "unit: each index in its own lock_timeout transaction; no data writes", p.sql);

  p = fakePrisma();
  h = harness();
  r = await ensureStaffSchema(p, h.opts);
  const alterTx = p.sql.filter((s) => /ADD COLUMN IF NOT EXISTS disabled_at TIMESTAMP\(3\)/.test(s));
  ok(alterTx.length === 2 && alterTx.some((s) => s.startsWith("ALTER TABLE vendors ")) && alterTx.some((s) => s.startsWith("ALTER TABLE district_representatives ")) && r.indexes.vendors && r.indexes.drs,
    "unit: columns missing -> ALTER both tables, then indexes", p.sql);

  p = fakePrisma({ alter: [lockErr(), lockErr(), null] });
  h = harness();
  await ensureStaffSchema(p, h.opts);
  ok(p.alters === 3 && JSON.stringify(h.sleeps) === "[1000,2000]" && h.errors[0] === "[staff] ensure schema attempt 1/5 failed: 55P03 canceling statement due to lock timeout",
    "unit: 55P03 twice then success -> 3 attempts, sleeps [1000,2000]", { alters: p.alters, h });

  p = fakePrisma({ alter: [lockErr()] });
  h = harness();
  let thrown = null;
  try { await ensureStaffSchema(p, h.opts); } catch (e) { thrown = e; }
  ok(thrown && p.alters === 5 && JSON.stringify(h.sleeps) === "[1000,2000,4000,8000]" && !thrown.message.includes("\n") && /after 5 attempts/.test(thrown.message),
    "unit: ALTER fails 5x -> throws a single-line error after 5 attempts", { alters: p.alters, msg: thrown && thrown.message });
  ok(thrown && !p.sql.some((s) => /CREATE UNIQUE INDEX/.test(s)), "unit: no index attempt when the columns are missing");

  p = fakePrisma({ hasColumns: true, index: { vendors_phone_live_key: dupErr() } });
  h = harness();
  thrown = null;
  try { r = await ensureStaffSchema(p, h.opts); } catch (e) { thrown = e; }
  ok(!thrown && r.indexes.vendors === false && r.indexes.drs === true, "unit: vendors index 23505 -> resolves with vendors false, drs true", { r, thrown: thrown && thrown.message });
  ok(h.errors.length === 1 && h.errors[0] === WARN("vendors_phone_live_key", "23505"), "unit: exactly one warning line for the failed index", h.errors);
  ok(noWrites(p), "unit: never issues DELETE/UPDATE/DROP", p.sql);

  p = fakePrisma({ hasColumns: true, index: { vendors_phone_live_key: dupErr() }, raced: ["vendors_phone_live_key"] });
  h = harness();
  r = await ensureStaffSchema(p, h.opts);
  ok(r.indexes.vendors === true && r.indexes.drs === true && h.errors.length === 0, "unit: CREATE fails but a racing boot left a valid index -> true, no warning", { r, e: h.errors });

  p = fakePrisma({ hasColumns: true, index: { vendors_phone_live_key: dupErr() }, raced: ["vendors_phone_live_key"], invalid: ["vendors_phone_live_key"] });
  h = harness();
  r = await ensureStaffSchema(p, h.opts);
  ok(r.indexes.vendors === false && h.errors.length === 1 && h.errors[0] === WARN("vendors_phone_live_key", "23505"), "unit: CREATE fails and the index is invalid -> false + warning", { r, e: h.errors });

  p = fakePrisma({ hasColumns: true, index: { vendors_phone_live_key: dupErr() }, recheckFails: true });
  h = harness();
  thrown = null;
  try { r = await ensureStaffSchema(p, h.opts); } catch (e) { thrown = e; }
  ok(!thrown && r.indexes.vendors === false && h.errors.length === 1 && h.errors[0] === WARN("vendors_phone_live_key", "23505"), "unit: re-check query fails -> original error path", { r, e: h.errors, thrown: thrown && thrown.message });

  p = fakePrisma({ hasColumns: true, invalid: ["district_representatives_phone_live_key"] });
  h = harness();
  r = await ensureStaffSchema(p, h.opts);
  ok(r.indexes.vendors === true && r.indexes.drs === false && h.errors.length === 1 && h.errors[0].startsWith("[staff] unique index district_representatives_phone_live_key not created ("),
    "unit: existing but invalid index -> false + warning", { r, e: h.errors });

  let stop = false;
  p = fakePrisma({ alter: [lockErr()] });
  h = harness({ shouldStop: () => stop });
  h.opts.log.error = () => { stop = true; };
  thrown = null;
  try { await ensureStaffSchema(p, h.opts); } catch (e) { thrown = e; }
  ok(!thrown && p.alters === 1 && h.sleeps.length === 0, "unit: shouldStop after first failure -> resolves, no further attempts", { alters: p.alters, thrown: thrown && thrown.message });
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

const TABLES = ["regions", "users", "vendors", "district_representatives", "orders", "order_items"];
async function snapshot(db) {
  const out = {};
  for (const t of TABLES) {
    out[t] = (await db.$queryRawUnsafe(`SELECT (to_jsonb(t) - 'disabled_at')::text AS j FROM ${t} t ORDER BY id`)).map((r) => r.j);
  }
  return out;
}

async function seed(db) {
  const now = "now()";
  await db.$executeRawUnsafe(`INSERT INTO regions (id, name) VALUES ('ss-reg', 'Varanasi')`);
  const users = [
    ["ss-admin", "9999999999", "ADMIN"], ["ss-u1", "9400000001", "VENDOR"], ["ss-u2", "9400000002", "VENDOR"],
    ["ss-u3", "9400000003", "DR"], ["ss-c1", "9400000004", "CUSTOMER"],
  ];
  for (const [id, phone, role] of users) {
    await db.$executeRawUnsafe(`INSERT INTO users (id, phone, name, password, role, "walletBalance", "updatedAt") VALUES ($1, $2, $3, '$2a$04$abcdefghijklmnopqrstuuu', $4::"Role", 12.5, ${now})`, id, phone, `Seed ${id}`, role);
  }
  // Two LIVE vendors with the same phone: blocks vendors_phone_live_key until one is soft-deleted
  for (const [id, userId] of [["ss-v1", "ss-u1"], ["ss-v2", "ss-u2"]]) {
    await db.$executeRawUnsafe(`INSERT INTO vendors (id, "userId", "shopName", "ownerName", phone, "regionId", status) VALUES ($1, $2, 'Dup Shop', 'Dup', '9400000001', 'ss-reg', 'APPROVED')`, id, userId);
  }
  await db.$executeRawUnsafe(`INSERT INTO district_representatives (id, "userId", name, phone, "regionId") VALUES ('ss-dr', 'ss-u3', 'Seed DR', '9400000003', 'ss-reg')`);
  await db.$executeRawUnsafe(`INSERT INTO orders (id, "orderNumber", "customerId", "totalAmount", "updatedAt") VALUES ('ss-o1', 'ss-on1', 'ss-c1', 450, ${now})`);
  await db.$executeRawUnsafe(`INSERT INTO order_items (id, "orderId", "vendorId", "productName", "priceAtPurchase", quantity, "totalPrice") VALUES ('ss-oi1', 'ss-o1', 'ss-v1', 'Cement', 400, 1, 400)`);
}

const indexes = async (db) => (await db.$queryRawUnsafe(
  "SELECT indexname FROM pg_indexes WHERE indexname IN ('vendors_phone_live_key', 'district_representatives_phone_live_key')"
)).map((r) => r.indexname).sort();

async function processTests() {
  const name = `buildcity_staffschema_${process.pid}`;
  const admin = new PrismaClient({ datasources: { db: { url: dbUrl("postgres") } } });
  const tmpDir = path.join(__dirname, ".tmp");
  let db = null;
  try {
    fs.mkdirSync(tmpDir, { recursive: true });
    // Copied next to a scratch path so prisma resolves nothing else from the fixtures dir
    const oldSchema = path.join(tmpDir, "schema-pre-pr4.prisma");
    fs.copyFileSync(PREVIOUS_SCHEMA, oldSchema);
    ok(!fs.readFileSync(oldSchema, "utf8").includes("disabled_at"), "previous schema has no disabled_at column");

    await admin.$executeRawUnsafe(`CREATE DATABASE "${name}"`);
    const url = dbUrl(name);
    execFileSync("npx", ["prisma", "db", "push", "--skip-generate", "--schema", oldSchema], { cwd: root, env: { ...process.env, DATABASE_URL: url, DIRECT_URL: url }, stdio: "ignore" });
    await admin.$executeRawUnsafe(`ALTER DATABASE "${name}" SET ${["buildcity", "env"].join(".")} = 'test'`);
    db = new PrismaClient({ datasources: { db: { url } } });
    await seed(db);
    const before = await snapshot(db);

    // Boot 1: columns get added, the DR index builds, the vendors index is skipped with one warning line
    let { s, up } = await bootHealthy(url);
    try {
      ok(up, "boot 1 (previous schema, duplicate vendor phones): server becomes healthy", { stdout: s.out.stdout, stderr: s.out.stderr });
      const cols = await db.$queryRawUnsafe(
        "SELECT c.relname AS tbl, format_type(a.atttypid, a.atttypmod) AS type, a.attnotnull FROM pg_attribute a JOIN pg_class c ON c.oid = a.attrelid WHERE a.attname = 'disabled_at' AND NOT a.attisdropped AND c.relname IN ('vendors', 'district_representatives') ORDER BY c.relname"
      );
      ok(cols.length === 2 && cols.every((c) => c.type === "timestamp(3) without time zone" && c.attnotnull === false), "boot 1: nullable TIMESTAMP(3) disabled_at on vendors and DRs", cols);
      const after = await snapshot(db);
      ok(JSON.stringify(after) === JSON.stringify(before), "boot 1: every seeded row survives with identical values", { before, after });
      const nulls = await db.$queryRawUnsafe("SELECT (SELECT count(*) FROM vendors WHERE disabled_at IS NOT NULL) + (SELECT count(*) FROM district_representatives WHERE disabled_at IS NOT NULL) AS n");
      ok(Number(nulls[0].n) === 0, "boot 1: existing rows stay live (disabled_at NULL)", nulls);
      ok(JSON.stringify(await indexes(db)) === JSON.stringify(["district_representatives_phone_live_key"]), "boot 1: DR index built, vendors index absent", await indexes(db));
      const warns = s.out.stderr.split("\n").filter((l) => l.startsWith("[staff] unique index"));
      ok(warns.length === 1 && warns[0] === WARN("vendors_phone_live_key", "23505"), "boot 1: one warning line for the vendors index", s.out.stderr);
      ok(!/postgres(ql)?:\/\//.test(s.out.stdout + s.out.stderr), "boot 1: no connection string in output");
    } finally {
      await stopServer(s);
    }

    // Owner resolves the duplicate (test setup only), next boot builds the vendors index
    await db.$executeRawUnsafe("UPDATE vendors SET disabled_at = now() WHERE id = 'ss-v2'");
    ({ s, up } = await bootHealthy(url));
    try {
      ok(up, "boot 2 (duplicate resolved): server becomes healthy", { stderr: s.out.stderr });
      ok(JSON.stringify(await indexes(db)) === JSON.stringify(["district_representatives_phone_live_key", "vendors_phone_live_key"]), "boot 2: both partial unique indexes present", await indexes(db));
      ok(!s.out.stderr.includes("[staff]") && !s.out.stdout.includes("[staff] added"), "boot 2: no staff schema warnings or ALTERs", { out: s.out.stdout, err: s.out.stderr });
    } finally {
      await stopServer(s);
    }

    // Two boots racing on the index build (test setup drops them first): neither logs a duplicate-phone error
    await db.$executeRawUnsafe("DROP INDEX vendors_phone_live_key");
    await db.$executeRawUnsafe("DROP INDEX district_representatives_phone_live_key");
    const { ensureStaffSchema } = require("../src/staff");
    const racers = [new PrismaClient({ datasources: { db: { url } } }), new PrismaClient({ datasources: { db: { url } } })];
    try {
      await Promise.all(racers.map((c) => c.$connect()));
      const hs = racers.map(() => harness());
      const results = await Promise.all(racers.map((c, i) => ensureStaffSchema(c, hs[i].opts)));
      ok(results.every((x) => x.indexes.vendors === true && x.indexes.drs === true), "parallel ensureStaffSchema: both report both indexes", results);
      ok(hs.every((x) => !x.errors.some((m) => m.includes("duplicate live phones"))), "parallel ensureStaffSchema: no duplicate-phone error", hs.map((x) => x.errors));
      ok(JSON.stringify(await indexes(db)) === JSON.stringify(["district_representatives_phone_live_key", "vendors_phone_live_key"]), "parallel ensureStaffSchema: both indexes present", await indexes(db));
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
