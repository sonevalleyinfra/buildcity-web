// Build target (production | staging) and guards, shared by vite.config.js and tests.
// Rule: a non-production build must never name a production host, and vice versa.
export const PROD_HOSTS = ["api.buildcity.cloud", "www.buildcity.in", "buildcity.in", "buildcity-web-part-2.vercel.app"];
export const STAGING_HOSTS = ["api-staging.buildcity.cloud", "staging.buildcity.in"];

export function resolveTarget(env, mode) {
  if (env.VERCEL) {
    const v = env.VERCEL_ENV;
    if (v === "production") return "production";
    if (v === "preview" || v === "development") return "staging";
    throw new Error(`[buildcity] VERCEL=1 but VERCEL_ENV is "${v || ""}" (expected production, preview or development). Refusing to guess the build target.`);
  }
  return mode === "staging" || env.BUILDCITY_TARGET === "staging" ? "staging" : "production";
}

const hostOf = (url) => {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return "";
  }
};

export function assertOverrides(target, overrides) {
  const forbidden = target === "staging" ? PROD_HOSTS : STAGING_HOSTS;
  for (const [name, value] of Object.entries(overrides)) {
    if (!value) continue;
    const host = hostOf(value);
    if (forbidden.includes(host)) {
      throw new Error(`[buildcity] ${name}=${value} names a ${target === "staging" ? "production" : "staging"} host, but this is a ${target} build.`);
    }
  }
}
