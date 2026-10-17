// APP_ENV boot guard: unit table for evaluateBoot/enforceBoot, then real `node src/index.js` boots per row.
// Rows that need a DB marker use throwaway databases on the same localhost server; the main test DB is never altered.
const path = require("path");
const net = require("net");
const { spawn } = require("child_process");
const { PrismaClient } = require("@prisma/client");
const appEnv = require("../src/appEnv");

let pass = 0, fail = 0;
const ok = (cond, name, extra) => {
  if (cond) { pass++; console.log("PASS", name); }
  else { fail++; console.log("FAIL", name, extra !== undefined ? JSON.stringify(extra).slice(0, 300) : ""); }
};

const SENTINEL = ["SENTINEL", "pw", "7731"].join("_"); // dummy password, assembled so secret scanners don't flag it
const REMOTE_URL = `postgresql://u:${SENTINEL}@db.example.com:5432/secretdb`;
const LOCAL_URL = process.env.DATABASE_URL || "";
const root = path.join(__dirname, "..");
const BOOT_FAIL = /^\[boot\] refusing to start: .+$/;

function unitTests() {
  const R = (appEnv, databaseUrl, marker) => ({ appEnv, databaseUrl, marker });
  const rows = [
    ["missing APP_ENV", { databaseUrl: "postgresql://u@localhost/x" }, null],
    ["unknown APP_ENV", R("SENTINELENV", "postgresql://u@localhost/x", "production"), null],
    ["production + marker production", R("production", REMOTE_URL, "production"), "production"],
    ["production + no marker", R("production", REMOTE_URL, null), null],
    ["production + empty marker", R("production", REMOTE_URL, ""), null],
    ["production + marker staging", R("production", REMOTE_URL, "staging"), null],
    ["staging + marker staging", R("staging", REMOTE_URL, "staging"), "staging"],
    ["staging + marker production", R("staging", REMOTE_URL, "production"), null],
    ["staging + no marker", R("staging", REMOTE_URL, null), null],
    ["test + localhost", R("test", "postgresql://u:p@localhost:5432/x", null), "test"],
    ["test + 127.0.0.1", R("test", "postgresql://u:p@127.0.0.1:5432/x", null), "test"],
    ["test + remote host", R("test", REMOTE_URL, null), null],
    ["test + remote host even with marker", R("test", REMOTE_URL, "test"), null],
    ["test + missing URL", R("test", undefined, null), null],
    ["test + unparseable URL", R("test", "not a url", null), null],
    ["development + localhost", R("development", "postgresql://u@localhost/x", null), "development"],
    ["development + remote host", R("development", REMOTE_URL, null), null],
  ];
  for (const [name, input, db] of rows) {
    const r = appEnv.evaluateBoot(input);
    if (db) {
      ok(r.ok === true && r.env === input.appEnv && r.db === db, `evaluateBoot: ${name} -> ok db=${db}`, r);
    } else {
      const text = String(r.reason);
      ok(r.ok === false && typeof r.reason === "string" && !text.includes("\n"), `evaluateBoot: ${name} -> fail`, r);
      ok(!text.includes(SENTINEL) && !text.includes("db.example.com") && !text.includes("secretdb") && !text.includes("SENTINELENV"),
        `evaluateBoot: ${name} reason has no secret/host/raw value`, r.reason);
    }
  }
  ok(appEnv.evaluateBoot({}).reason === "APP_ENV must be one of production|staging|test|development", "invalid APP_ENV reason is fixed");
  ok(appEnv.evaluateBoot(R("production", REMOTE_URL, null)).reason === "APP_ENV=production but the database marker is not 'production'", "production reason is fixed");
}

async function withEnv(vars, fn) {
  const saved = {};
  for (const k of Object.keys(vars)) { saved[k] = process.env[k]; if (vars[k] === undefined) delete process.env[k]; else process.env[k] = vars[k]; }
  const errors = [], logs = [];
  const origErr = console.error, origLog = console.log;
  console.error = (...a) => errors.push(a.join(" "));
  console.log = (...a) => logs.push(a.join(" "));
  try { return await fn({ errors, logs }); }
  finally {
    console.error = origErr; console.log = origLog;
    for (const k of Object.keys(saved)) { if (saved[k] === undefined) delete process.env[k]; else process.env[k] = saved[k]; }
  }
}

async function enforceTests() {
  const fakePrisma = (env) => ({ calls: 0, async $queryRaw() { this.calls++; return [{ env }]; } });
  const boot = async (vars, prisma) => withEnv(vars, async (out) => {
    const exits = [];
    await appEnv.enforceBoot(prisma, { exit: (c) => exits.push(c) });
    return { exits, ...out };
  });

  appEnv._resetForTests();
  ok(appEnv.isProduction() === false, "isProduction() false initially");

  let r = await boot({ APP_ENV: "production", DATABASE_URL: REMOTE_URL }, fakePrisma(null));
  ok(r.exits.length === 1 && r.exits[0] === 1, "enforceBoot: production without marker exits 1", r.exits);
  ok(r.errors.length === 1 && r.errors[0] === "[boot] refusing to start: APP_ENV=production but the database marker is not 'production'", "enforceBoot: one fixed stderr line", r.errors);
  ok(appEnv.isProduction() === false, "isProduction() false after failed production check");

  const stg = fakePrisma("staging");
  r = await boot({ APP_ENV: "staging", DATABASE_URL: REMOTE_URL }, stg);
  ok(r.exits.length === 0 && stg.calls === 1 && r.logs[0] === "[boot] env=staging db=staging", "enforceBoot: staging + marker staging boots", r);
  ok(appEnv.isProduction() === false, "isProduction() false after successful staging check");

  r = await boot({ APP_ENV: "production", DATABASE_URL: REMOTE_URL }, fakePrisma("production"));
  ok(r.exits.length === 0 && r.logs.length === 1 && r.logs[0] === "[boot] env=production db=production", "enforceBoot: production + marker production boots", r);
  ok(appEnv.isProduction() === true, "isProduction() true after successful production check");
  ok(JSON.stringify(withEnvSync({ SOURCE_COMMIT: undefined }, appEnv.getEnvInfo)) === JSON.stringify({ env: "production", db: "production", commit: null }), "getEnvInfo() after production boot");
  ok(withEnvSync({ SOURCE_COMMIT: "abc123" }, appEnv.getEnvInfo).commit === "abc123", "getEnvInfo() commit from SOURCE_COMMIT");

  appEnv._resetForTests();
  const throwing = { async $queryRaw() { throw new Error(`connect failed ${REMOTE_URL}`); } };
  r = await boot({ APP_ENV: "production", DATABASE_URL: REMOTE_URL }, throwing);
  ok(r.exits[0] === 1 && r.errors.length === 1 && r.errors[0] === "[boot] refusing to start: could not read the database environment marker", "enforceBoot: query error -> fixed reason", r.errors);
  ok(!r.errors.join("").includes(SENTINEL), "enforceBoot: query error message (with URL) never printed");

  const untouched = fakePrisma("production");
  r = await boot({ APP_ENV: "test", DATABASE_URL: REMOTE_URL }, untouched);
  ok(r.exits[0] === 1 && untouched.calls === 0, "enforceBoot: test + remote host exits without querying", { exits: r.exits, calls: untouched.calls });
  r = await boot({ APP_ENV: "test", DATABASE_URL: "postgresql://u@localhost/x" }, untouched);
  ok(r.exits.length === 0 && untouched.calls === 0 && r.logs[0] === "[boot] env=test db=test", "enforceBoot: test + localhost boots without querying", r);
  ok(appEnv.isProduction() === false, "isProduction() false after test boot");
  appEnv._resetForTests();
}

function withEnvSync(vars, fn) {
  const saved = {};
  for (const k of Object.keys(vars)) { saved[k] = process.env[k]; if (vars[k] === undefined) delete process.env[k]; else process.env[k] = vars[k]; }
  try { return fn(); }
  finally { for (const k of Object.keys(saved)) { if (saved[k] === undefined) delete process.env[k]; else process.env[k] = saved[k]; } }
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
  return u.toString();
}

async function startServer(extra) {
  const port = await freePort();
  const env = {
    PATH: process.env.PATH,
    JWT_SECRET: process.env.JWT_SECRET || ["local", "test", "jwt", "value", "local", "test", "jwt", "value", "000000"].join("-"),
    PORT: String(port),
    SMS_USERNAME: "test",
    SMS_APIKEY: "test",
    ...extra,
  };
  env.DIRECT_URL = env.DATABASE_URL;
  for (const k of Object.keys(env)) if (env[k] === undefined) delete env[k];
  const child = spawn("node", ["src/index.js"], { cwd: root, env, stdio: ["ignore", "pipe", "pipe"] });
  const out = { stdout: "", stderr: "" };
  child.stdout.on("data", (d) => { out.stdout += d; });
  child.stderr.on("data", (d) => { out.stderr += d; });
  const exited = new Promise((resolve) => child.on("exit", (code) => resolve(code)));
  return { child, port, out, exited };
}

const timeout = (ms) => new Promise((resolve) => setTimeout(() => resolve("timeout"), ms));

async function expectRefusal(name, extra, secrets) {
  const s = await startServer(extra);
  const code = await Promise.race([s.exited, timeout(15000)]);
  if (code === "timeout") s.child.kill("SIGKILL");
  const lines = s.out.stderr.split("\n").filter(Boolean);
  ok(code === 1, `${name}: exits 1`, { code, stderr: s.out.stderr });
  ok(lines.length === 1 && BOOT_FAIL.test(lines[0]), `${name}: stderr is one [boot] refusing line`, lines);
  const all = s.out.stdout + s.out.stderr;
  ok(secrets.filter(Boolean).every((x) => !all.includes(x)), `${name}: no password or DB name in output`);
}

async function expectBoot(name, extra, expected) {
  const s = await startServer(extra);
  let body = null;
  try {
    for (let i = 0; i < 75 && body === null; i++) {
      if (s.child.exitCode !== null) break;
      try {
        const r = await fetch(`http://127.0.0.1:${s.port}/api/v1/env`);
        if (r.ok) body = await r.json();
      } catch {}
      if (body === null) await new Promise((r) => setTimeout(r, 200));
    }
    ok(body !== null && JSON.stringify(body) === JSON.stringify(expected), `${name}: boots and /api/v1/env = ${JSON.stringify(expected)}`, { body, stderr: s.out.stderr });
    ok(s.out.stdout.includes(`[boot] env=${expected.env} db=${expected.db}`), `${name}: logs the [boot] line`, s.out.stdout);
  } finally {
    s.child.kill("SIGTERM");
    if ((await Promise.race([s.exited, timeout(12000)])) === "timeout") s.child.kill("SIGKILL");
  }
}

async function processTests() {
  const main = new URL(LOCAL_URL);
  const mainDb = main.pathname.slice(1);
  const localPw = decodeURIComponent(main.password || "");
  const prodDb = `buildcity_appenv_${process.pid}_prod`;
  const stgDb = `buildcity_appenv_${process.pid}_stg`;
  const admin = new PrismaClient({ datasources: { db: { url: dbUrl("postgres") } } });
  try {
    for (const [db, marker] of [[prodDb, "production"], [stgDb, "staging"]]) {
      await admin.$executeRawUnsafe(`CREATE DATABASE "${db}"`);
      await admin.$executeRawUnsafe(`ALTER DATABASE "${db}" SET buildcity.env = '${marker}'`);
    }

    await expectRefusal("production + DB without marker", { APP_ENV: "production", DATABASE_URL: LOCAL_URL }, [localPw, mainDb]);
    await expectRefusal("staging + DB marked production", { APP_ENV: "staging", DATABASE_URL: dbUrl(prodDb) }, [localPw, prodDb]);
    await expectRefusal("test + remote DATABASE_URL", { APP_ENV: "test", DATABASE_URL: REMOTE_URL }, [SENTINEL, "secretdb", "db.example.com"]);
    await expectRefusal("missing APP_ENV", { DATABASE_URL: LOCAL_URL }, [localPw, mainDb]);

    await expectBoot("production + marker production", { APP_ENV: "production", DATABASE_URL: dbUrl(prodDb) }, { env: "production", db: "production", commit: null });
    await expectBoot("staging + marker staging", { APP_ENV: "staging", DATABASE_URL: dbUrl(stgDb) }, { env: "staging", db: "staging", commit: null });
    await expectBoot("test + localhost", { APP_ENV: "test", DATABASE_URL: LOCAL_URL, SOURCE_COMMIT: "abc123" }, { env: "test", db: "test", commit: "abc123" });
  } finally {
    for (const db of [prodDb, stgDb]) {
      await admin.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${db}" WITH (FORCE)`).catch((e) => { fail++; console.log("FAIL drop", db, e.message); });
    }
    await admin.$disconnect();
  }
}

(async () => {
  unitTests();
  await enforceTests();
  if (!/^postgres(ql)?:\/\/[^@]*@(localhost|127\.0\.0\.1)[:/]/.test(LOCAL_URL)) {
    fail++;
    console.log("FAIL process-level tests need a localhost DATABASE_URL");
  } else {
    await processTests();
  }
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
