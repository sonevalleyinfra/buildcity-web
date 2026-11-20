// node scripts/ci/wait-for-staging.mjs <sha>
// Blocks until the Vercel deployment for <sha> reports success (GitHub deployments API) AND
// api-staging reports commit == <sha> (/api/v1/env). Exit 1 on timeout. Public reads only, plus
// GITHUB_TOKEN for the deployments API; no Coolify or Vercel token.
// If api-staging reports commit=null (SOURCE_COMMIT not injected) it falls back to a settle delay
// after the Vercel deployment succeeds.
import { pathToFileURL } from "node:url";

const API_ENV = process.env.STAGING_API_URL || "https://api-staging.buildcity.cloud";

export async function vercelSucceeded(sha, ghGet) {
  const deps = await ghGet(`/deployments?sha=${sha}&per_page=20`);
  for (const d of deps) {
    const sts = await ghGet(`/deployments/${d.id}/statuses?per_page=1`);
    if (sts[0] && sts[0].state === "success") return true;
  }
  return false;
}

export async function apiCommit(fetchImpl = fetch, base = API_ENV) {
  try {
    const res = await fetchImpl(`${base}/api/v1/env`, { redirect: "error", headers: { accept: "application/json" } });
    if (!res.ok) return { reachable: false };
    const j = await res.json();
    return { reachable: true, env: j.env, db: j.db, commit: j.commit || null };
  } catch {
    return { reachable: false };
  }
}

// One poll. Returns { done, reason }.
export async function pollOnce(sha, { ghGet, fetchImpl, settleMs, state, now = Date.now }) {
  const web = await vercelSucceeded(sha, ghGet);
  const api = await apiCommit(fetchImpl);
  if (api.reachable && (api.env !== "staging" || api.db !== "staging")) {
    throw new Error(`api-staging reports env=${api.env} db=${api.db}; refusing to continue`);
  }
  if (!web) return { done: false, reason: "vercel deployment not successful yet" };
  if (api.reachable && api.commit === sha) return { done: true, reason: "both hosts at sha" };
  if (api.reachable && api.commit === null) {
    state.settleFrom ??= now();
    if (now() - state.settleFrom >= settleMs) return { done: true, reason: "SOURCE_COMMIT absent; settled" };
    return { done: false, reason: "api commit null; settling" };
  }
  return { done: false, reason: `api commit ${api.commit ?? "unreachable"} != sha` };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const sha = process.argv[2];
  if (!/^[0-9a-f]{40}$/.test(sha || "")) {
    console.error("usage: wait-for-staging.mjs <40-char sha>");
    process.exit(2);
  }
  const repo = process.env.GITHUB_REPOSITORY;
  const token = process.env.GITHUB_TOKEN;
  const timeoutMs = Number(process.env.WAIT_TIMEOUT_MS || 20 * 60_000);
  const intervalMs = Number(process.env.WAIT_INTERVAL_MS || 15_000);
  const settleMs = Number(process.env.WAIT_SETTLE_MS || 5 * 60_000);
  const ghGet = async (p) => {
    const r = await fetch(`https://api.github.com/repos/${repo}${p}`, {
      headers: { accept: "application/vnd.github+json", authorization: `Bearer ${token}` },
    });
    if (!r.ok) throw new Error(`GitHub API ${p.split("?")[0]} -> HTTP ${r.status}`);
    return r.json();
  };
  const start = Date.now();
  const state = {};
  let last = "";
  while (Date.now() - start < timeoutMs) {
    let r;
    try {
      r = await pollOnce(sha, { ghGet, fetchImpl: fetch, settleMs, state });
    } catch (err) {
      console.error(`FAIL ${err.message}`);
      process.exit(1);
    }
    if (r.reason !== last) console.log(`${new Date().toISOString()} ${r.reason}`);
    last = r.reason;
    if (r.done) {
      console.log(`READY ${r.reason}`);
      process.exit(0);
    }
    await new Promise((res) => setTimeout(res, intervalMs));
  }
  console.error(`FAIL timeout after ${timeoutMs / 1000}s waiting for ${sha}: ${last}`);
  process.exit(1);
}
