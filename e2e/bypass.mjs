// Vercel Deployment Protection bypass for automation (ADR 0002). The secret is sent ONLY to the
// origin under test, never to third-party hosts the page loads from.
export function bypassHeadersFor(url, env = process.env) {
  const secret = env.VERCEL_AUTOMATION_BYPASS_SECRET;
  const base = env.E2E_BASE_URL;
  if (!secret || !base) return {};
  try {
    if (new URL(url).origin !== new URL(base).origin) return {};
  } catch {
    return {};
  }
  return { "x-vercel-protection-bypass": secret };
}

export function withBypass(fetchImpl = fetch, env = process.env) {
  return (url, opts = {}) =>
    fetchImpl(url, { ...opts, headers: { ...(opts.headers || {}), ...bypassHeadersFor(String(url), env) } });
}
