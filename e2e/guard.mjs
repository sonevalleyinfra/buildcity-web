// Isolation guard (ADR 0002 section 2/7). Pure and dependency-free so it can be unit tested.
// The suite writes data (registers users, places orders), so it must only ever run against
// staging or a local test stack. Every rule here fails closed.
export const PROD_HOSTS = [
  "www.buildcity.in",
  "buildcity.in",
  "api.buildcity.cloud",
  "buildcity-web-part-2.vercel.app",
];
export const SAFE_ENVS = ["staging", "test"];

export class GuardError extends Error {}

export function hostOf(url) {
  let u;
  try {
    u = new URL(url);
  } catch {
    throw new GuardError("isolation guard: not a valid URL");
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") {
    throw new GuardError("isolation guard: URL must be http or https");
  }
  return u.hostname.toLowerCase().replace(/\.$/, "");
}

export function assertNotProdHost(url, label = "URL") {
  const host = hostOf(url);
  if (PROD_HOSTS.includes(host)) {
    throw new GuardError(`isolation guard: ${label} host ${host} is a production host`);
  }
  return host;
}

// GET <origin>/api/v1/env; throws unless env AND db are staging|test.
export async function assertSafeTarget(url, label = "target", fetchImpl = fetch) {
  assertNotProdHost(url, label);
  const endpoint = new URL("/api/v1/env", url).toString();
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 10_000);
  let info;
  try {
    const res = await fetchImpl(endpoint, { method: "GET", signal: ctl.signal, headers: { accept: "application/json" } });
    if (!res.ok) throw new GuardError(`isolation guard: ${label} /api/v1/env returned HTTP ${res.status}`);
    info = await res.json();
  } catch (err) {
    if (err instanceof GuardError) throw err;
    throw new GuardError(`isolation guard: could not read ${label} /api/v1/env`);
  } finally {
    clearTimeout(timer);
  }
  const env = info && info.env;
  const db = info && info.db;
  if (!SAFE_ENVS.includes(env) || !SAFE_ENVS.includes(db)) {
    throw new GuardError(
      `isolation guard: ${label} reports env=${JSON.stringify(env)} db=${JSON.stringify(db)}; need staging or test for both`
    );
  }
  return { env, db, commit: info.commit || null };
}

// Every origin the run may write to: the web base URL and the API URL (defaults to the base URL).
export async function assertSafeRun({ baseURL, apiURL }, fetchImpl = fetch) {
  if (!baseURL) throw new GuardError("isolation guard: E2E_BASE_URL is not set");
  const targets = [["base URL", baseURL]];
  if (apiURL && new URL(apiURL).origin !== new URL(baseURL).origin) targets.push(["API URL", apiURL]);
  const out = {};
  for (const [label, url] of targets) out[label] = await assertSafeTarget(url, label, fetchImpl);
  return out;
}
