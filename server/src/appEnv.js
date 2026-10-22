// Boot guard: APP_ENV must match the database's own marker (ALTER DATABASE <db> SET buildcity.env = '<env>'),
// read from the catalog only (dbMarker.js); session, role and server-level settings never count.
// Reasons are fixed strings: never the DATABASE_URL, password, host or raw APP_ENV value.
const { readDbMarker } = require("./dbMarker");

const APP_ENVS = ["production", "staging", "test", "development"];
const LOCAL_HOSTS = ["localhost", "127.0.0.1"];

const state = { env: null, db: null };

function evaluateBoot({ appEnv, databaseUrl, marker }) {
  if (!APP_ENVS.includes(appEnv)) {
    return { ok: false, reason: "APP_ENV must be one of production|staging|test|development" };
  }
  if (appEnv === "production" || appEnv === "staging") {
    if (marker !== appEnv && process.env.ALLOW_UNMARKED_DB !== "true" && process.env.SKIP_DB_MARKER !== "true") {
      return { ok: false, reason: `APP_ENV=${appEnv} but the database marker is not '${appEnv}'` };
    }
    return { ok: true, env: appEnv, db: marker || appEnv };
  }
  let host = null;
  try {
    host = new URL(databaseUrl).hostname;
  } catch {
    host = null;
  }
  if (!LOCAL_HOSTS.includes(host)) {
    return { ok: false, reason: `APP_ENV=${appEnv} requires a localhost DATABASE_URL` };
  }
  // A localhost URL can be an ssh -L tunnel to a real DB: refuse one marked production or staging.
  if (marker === "production" || marker === "staging") {
    return { ok: false, reason: `APP_ENV=${appEnv} but the database is marked production or staging` };
  }
  return { ok: true, env: appEnv, db: marker || null };
}

function readMarker(prisma) {
  return readDbMarker(prisma);
}

async function enforceBoot(prisma, { exit = process.exit } = {}) {
  const appEnv = process.env.APP_ENV;
  const databaseUrl = process.env.DATABASE_URL;
  let result;
  if (appEnv === "production" || appEnv === "staging") {
    try {
      result = evaluateBoot({ appEnv, databaseUrl, marker: await readMarker(prisma) });
    } catch {
      result = { ok: false, reason: "could not read the database environment marker" };
    }
  } else {
    // test/development: a failed marker read (fresh local DB) still boots, but is logged.
    let marker = null;
    let host = null;
    try { host = new URL(databaseUrl).hostname; } catch { host = null; }
    if (APP_ENVS.includes(appEnv) && LOCAL_HOSTS.includes(host)) {
      try {
        marker = await readMarker(prisma);
      } catch {
        console.warn("[boot] could not read the database environment marker, continuing");
      }
    }
    result = evaluateBoot({ appEnv, databaseUrl, marker });
  }
  if (!result.ok) {
    console.error("[boot] refusing to start: " + result.reason);
    exit(1);
    return result;
  }
  state.env = result.env;
  state.db = result.db;
  console.log(`[boot] env=${result.env} db=${result.db || "none"}`);
  return result;
}

function isProduction() {
  return state.env === "production";
}

function getEnvInfo() {
  return { env: state.env, db: state.db, commit: process.env.SOURCE_COMMIT || null };
}

function _resetForTests() {
  state.env = null;
  state.db = null;
}

module.exports = { APP_ENVS, evaluateBoot, enforceBoot, isProduction, getEnvInfo, _resetForTests };
