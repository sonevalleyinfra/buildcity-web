// `npm run e2e`: boots the full stack locally (test DB -> schema -> seed -> API -> built web) and runs Playwright.
// Same steps as the `e2e-local` CI job. Never touches anything but a loopback database:
//   DATABASE_URL=postgresql://postgres:DUMMYPASS@127.0.0.1:5436/buildcity_e2e npm run e2e
import { spawn, spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const serverDir = path.join(root, "server");
const require = createRequire(path.join(root, "package.json"));

const DEFAULT_DB = "postgresql://postgres:DUMMYPASS@127.0.0.1:5436/buildcity_e2e";
const dbUrl = process.env.DATABASE_URL || DEFAULT_DB;
const apiPort = process.env.E2E_API_PORT || "5056";
const webPort = process.env.E2E_WEB_PORT || "4173";
const apiURL = `http://127.0.0.1:${apiPort}`;
const baseURL = `http://127.0.0.1:${webPort}`;

function die(msg, code = 2) {
  console.error(`e2e refused: ${msg}`);
  process.exit(code);
}

// Fake, staging-only-style passwords for the seeded accounts (never real secrets).
const passwords = {
  E2E_VENDOR_PASSWORD: process.env.E2E_VENDOR_PASSWORD || "local-vendor-DUMMYPASS",
  E2E_DR_PASSWORD: process.env.E2E_DR_PASSWORD || "local-dr-DUMMYPASS",
  E2E_ADMIN_PASSWORD: process.env.E2E_ADMIN_PASSWORD || "local-admin-DUMMYPASS",
};

let host;
try {
  host = new URL(dbUrl).hostname;
} catch {
  die("DATABASE_URL is not a valid URL");
}
if (!["localhost", "127.0.0.1"].includes(host)) die("DATABASE_URL must point at a localhost database");

const children = [];
function stopAll() {
  // Kill whole process groups: npx leaves its node child behind otherwise.
  for (const c of children) {
    try { process.kill(-c.pid, "SIGTERM"); } catch {}
  }
}
process.on("SIGINT", () => { stopAll(); process.exit(130); });
process.on("SIGTERM", () => { stopAll(); process.exit(143); });

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { stdio: "inherit", cwd: root, ...opts });
  if (r.status !== 0) {
    stopAll();
    console.error(`e2e: step failed: ${cmd} ${args.slice(0, 2).join(" ")}`);
    process.exit(r.status || 1);
  }
}

async function waitFor(url, what, tries = 100) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url);
      if (r.ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 300));
  }
  stopAll();
  die(`${what} did not start`, 1);
}

// 1. Database marker (catalog only, see server/src/dbMarker.js): refuse a production/staging-marked DB
// (e.g. an ssh tunnel) BEFORE any schema push. A failed read refuses.
const { Client } = require("pg");
const { MARKER_SQL } = require(path.join(serverDir, "src", "dbMarker.js"));
const client = new Client({ connectionString: dbUrl });
try {
  await client.connect();
  let marker;
  try {
    const { rows } = await client.query(MARKER_SQL);
    marker = (rows[0] && rows[0].env) || null;
  } catch {
    die("could not read the database marker");
  }
  if (marker === "production" || marker === "staging") die("the database is marked production or staging");
  if (marker && marker !== "test") die("the database carries an unknown buildcity.env marker");
  if (!marker) {
    // Unmarked: only an empty database may be claimed as a test database.
    const { rows: tables } = await client.query("SELECT count(*)::int AS n FROM information_schema.tables WHERE table_schema = 'public'");
    if (tables[0].n > 0) die("the database is unmarked but already has tables; refusing to claim it as a test database");
  }
  // Mark it so /api/v1/env reports db=test (the isolation guard needs it).
  const dbName = (await client.query("SELECT current_database() AS n")).rows[0].n;
  await client.query(`ALTER DATABASE "${dbName.replace(/"/g, '""')}" SET buildcity.env = 'test'`);
} catch (err) {
  if (err && err.code === "ECONNREFUSED") die("cannot reach the database (is it running?)", 1);
  throw err;
} finally {
  await client.end().catch(() => null);
}

const apiEnv = {
  ...process.env,
  ...passwords,
  DATABASE_URL: dbUrl,
  DIRECT_URL: dbUrl,
  JWT_SECRET: process.env.JWT_SECRET || "local-e2e-secret-local-e2e-secret-000",
  PORT: apiPort,
  SMS_USERNAME: "test",
  SMS_APIKEY: "test",
  SMS_RELAY_SECRET: "",
  NODE_ENV: "test",
  APP_ENV: "test",
};

// 2. Schema + seed
run("npx", ["prisma", "db", "push", "--skip-generate"], { cwd: serverDir, env: apiEnv });
run("node", ["scripts/staging/seed-test-accounts.js"], { cwd: serverDir, env: apiEnv });

// 3. API
const api = spawn("node", ["src/index.js"], { cwd: serverDir, env: apiEnv, stdio: ["ignore", "ignore", "inherit"], detached: true });
children.push(api);
await waitFor(`${apiURL}/health`, "API");

// 4. Web: build against the local API, serve with vite preview
const outDir = path.join(root, "e2e", ".build");
if (!process.env.E2E_SKIP_BUILD) {
  run("npx", ["vite", "build", "--outDir", outDir, "--emptyOutDir"], {
    env: { ...process.env, VITE_API_URL: apiURL, BUILDCITY_TARGET: "staging" },
  });
}
const web = spawn("npx", ["vite", "preview", "--outDir", outDir, "--host", "127.0.0.1", "--port", webPort, "--strictPort"], {
  cwd: root,
  stdio: ["ignore", "ignore", "inherit"],
  detached: true,
  // vite preview reuses server.proxy: send /api to the local API so the web origin answers /api/v1/env too.
  env: { ...process.env, VITE_BACKEND_URL: apiURL },
});
children.push(web);
await waitFor(baseURL, "web preview");

// 5. Playwright (global setup re-checks /api/v1/env on both URLs before anything is written)
const pw = spawnSync("npx", ["playwright", "test", "-c", "e2e/playwright.config.mjs", ...process.argv.slice(2)], {
  cwd: root,
  stdio: "inherit",
  env: { ...process.env, ...passwords, E2E_BASE_URL: baseURL, E2E_API_URL: apiURL },
});
stopAll();
process.exit(pw.status ?? 1);
