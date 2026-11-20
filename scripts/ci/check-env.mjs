// node scripts/ci/check-env.mjs <base-url> <expected-env> <expected-db>
// GET <base-url>/api/v1/env and exit 1 unless env and db match. Fails closed: any error, redirect,
// non-JSON body or missing field is a failure. Used by the `preview-isolation` workflow.
import { pathToFileURL } from "node:url";

export async function checkEnv(base, wantEnv, wantDb, { fetchImpl = fetch, secret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET } = {}) {
  const url = new URL("/api/v1/env", base).toString();
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 15_000);
  try {
    const res = await fetchImpl(url, {
      redirect: "error",
      signal: ctl.signal,
      headers: { accept: "application/json", ...(secret ? { "x-vercel-protection-bypass": secret } : {}) },
    });
    if (!res.ok) return { ok: false, msg: `HTTP ${res.status} from ${url}` };
    const info = await res.json();
    if (info.env !== wantEnv || info.db !== wantDb) {
      return { ok: false, msg: `expected env=${wantEnv} db=${wantDb}, got env=${JSON.stringify(info.env)} db=${JSON.stringify(info.db)}` };
    }
    return { ok: true, msg: `env=${info.env} db=${info.db} commit=${info.commit ?? null}` };
  } catch (err) {
    return { ok: false, msg: `could not read ${url}: ${err.name}` };
  } finally {
    clearTimeout(timer);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [base, wantEnv, wantDb] = process.argv.slice(2);
  if (!base || !wantEnv || !wantDb) {
    console.error("usage: check-env.mjs <base-url> <expected-env> <expected-db>");
    process.exit(2);
  }
  const r = await checkEnv(base, wantEnv, wantDb);
  console.log(r.ok ? `OK ${r.msg}` : `FAIL ${r.msg}`);
  process.exit(r.ok ? 0 : 1);
}
