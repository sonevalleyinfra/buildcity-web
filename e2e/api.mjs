// Node-side API helpers for the partner and wallet specs: partner logins and read-only checks.
// Same isolation rules as the browser: a production host is refused before any request.
import fs from "node:fs";
import path from "node:path";
import { assertNotProdHost } from "./guard.mjs";
import { bypassHeadersFor } from "./bypass.mjs";
import { REGION_NAME, STATE_DIR } from "./state.mjs";

// Seeded accounts (server/scripts/staging/seed-test-accounts.js). The ADMIN row is the hardcoded super-admin
// phone: it is the only phone the admin login accepts.
export const VENDOR = { phone: "1000000001", passwordEnv: "E2E_VENDOR_PASSWORD" };
export const DR = { phone: "1000000002", passwordEnv: "E2E_DR_PASSWORD" };
export const ADMIN = { phone: "9999999999", passwordEnv: "E2E_ADMIN_PASSWORD" };

export { REGION_NAME };

export function apiURL() {
  const url = process.env.E2E_API_URL || process.env.E2E_BASE_URL;
  if (!url) throw new Error("E2E_BASE_URL is not set");
  assertNotProdHost(url, "API URL");
  return url.replace(/\/+$/, "");
}

export function passwordFor(account) {
  const value = process.env[account.passwordEnv];
  if (!value) throw new Error(`${account.passwordEnv} is not set`);
  return value;
}

export async function apiFetch(pathname, { token, method = "GET", body } = {}) {
  const res = await fetch(`${apiURL()}${pathname}`, {
    method,
    redirect: "error",
    headers: {
      ...bypassHeadersFor(apiURL()),
      accept: "application/json",
      ...(body ? { "content-type": "application/json" } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return { ok: res.ok, status: res.status, json };
}

// Partner (vendor, DR, admin) password login. One call per account per run: the endpoint is rate limited.
export async function partnerToken(account) {
  const res = await apiFetch("/api/v1/auth/vendor/login", {
    method: "POST",
    body: { phone: account.phone, password: passwordFor(account) },
  });
  if (!res.ok || !res.json?.token) throw new Error(`partner login failed for ${account.phone} (HTTP ${res.status})`);
  return res.json.token;
}

// The customer session saved by spec 1.
export function customerToken() {
  const file = path.join(STATE_DIR, "customer.json");
  const state = JSON.parse(fs.readFileSync(file, "utf8"));
  for (const origin of state.origins || []) {
    const item = (origin.localStorage || []).find((i) => i.name === "buildcity_token");
    if (item?.value) return item.value;
  }
  throw new Error("customer token not found in e2e/.state/customer.json (did spec 1 run?)");
}
