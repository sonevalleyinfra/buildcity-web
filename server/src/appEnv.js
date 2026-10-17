// Boot guard: APP_ENV must match the database's own marker (ALTER DATABASE <db> SET buildcity.env = '<env>').
// Reasons are fixed strings: never the DATABASE_URL, password, host or raw APP_ENV value.
const APP_ENVS = ["production", "staging", "test", "development"];
const LOCAL_HOSTS = ["localhost", "127.0.0.1"];

const state = { env: null, db: null };

function evaluateBoot({ appEnv, databaseUrl, marker }) {
  if (!APP_ENVS.includes(appEnv)) {
    return { ok: false, reason: "APP_ENV must be one of production|staging|test|development" };
  }
  if (appEnv === "production" || appEnv === "staging") {
    if (marker !== appEnv) {
      return { ok: false, reason: `APP_ENV=${appEnv} but the database marker is not '${appEnv}'` };
    }
    return { ok: true, env: appEnv, db: appEnv };
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
  return { ok: true, env: appEnv, db: appEnv };
}

async function readMarker(prisma) {
  const rows = await prisma.$queryRaw`SELECT current_setting('buildcity.env', true) AS env`;
  return (rows && rows[0] && rows[0].env) || null;
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
    result = evaluateBoot({ appEnv, databaseUrl, marker: null });
  }
  if (!result.ok) {
    console.error("[boot] refusing to start: " + result.reason);
    exit(1);
    return result;
  }
  state.env = result.env;
  state.db = result.db;
  console.log(`[boot] env=${result.env} db=${result.db}`);
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
