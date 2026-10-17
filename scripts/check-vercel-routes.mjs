#!/usr/bin/env node
// Guard: only the listed production hosts may be rewritten to the production API.
import { readFileSync } from "node:fs";
import { PROD_HOSTS } from "./bc-target.mjs";

const PROD_API = "https://api.buildcity.cloud/api/v1/:path*";
const STAGING_API = "https://api-staging.buildcity.cloud/api/v1/:path*";
const cfg = JSON.parse(readFileSync(new URL("../vercel.json", import.meta.url), "utf8"));
const rules = (cfg.rewrites || []).filter((r) => r.source === "/api/v1/:path*");
const errors = [];

const hostsOf = (r) => (r.has || []).filter((h) => h.type === "host").map((h) => h.value);
const first = (host) => rules.find((r) => !r.has || hostsOf(r).includes(host));

for (const host of PROD_HOSTS.filter((h) => h !== "api.buildcity.cloud")) {
  const r = first(host);
  if (!r || r.destination !== PROD_API) errors.push(`${host} must route to ${PROD_API}, got ${r && r.destination}`);
}
for (const host of ["staging.buildcity.in", "buildcity-web-git-x-sonevalleyinfra.vercel.app", "random.example.com"]) {
  const r = first(host);
  if (!r || r.destination !== STAGING_API) errors.push(`${host} must route to ${STAGING_API}, got ${r && r.destination}`);
}
const last = rules[rules.length - 1];
if (!last || last.has || last.destination !== STAGING_API) errors.push("last /api/v1 rule must be the staging default with no `has`");
for (const r of rules) {
  if (r.destination.startsWith("https://api.buildcity.cloud")) {
    const hs = hostsOf(r);
    if (hs.length !== 1 || !PROD_HOSTS.includes(hs[0])) errors.push(`prod API rule must be scoped to one listed host: ${JSON.stringify(r.has)}`);
  }
}
if (rules.length !== 4) errors.push(`expected 4 /api/v1 rules, found ${rules.length}`);
for (const r of cfg.rewrites || []) {
  if (r.source !== "/api/v1/:path*" && String(r.destination).includes("api.buildcity.cloud")) errors.push(`non-/api/v1 rule reaches prod API: ${r.source}`);
}
const noindex = (cfg.headers || []).some((h) => hostsOf(h).includes("staging.buildcity.in") && h.headers.some((x) => x.key === "X-Robots-Tag" && x.value === "noindex"));
if (!noindex) errors.push("missing X-Robots-Tag noindex for staging.buildcity.in");

if (errors.length) {
  console.error("check-vercel-routes FAILED:\n- " + errors.join("\n- "));
  process.exit(1);
}
console.log("check-vercel-routes OK");
