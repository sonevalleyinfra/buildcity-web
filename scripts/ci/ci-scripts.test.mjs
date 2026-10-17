// node --test scripts/ci/ci-scripts.test.mjs
import assert from "node:assert/strict";
import { test } from "node:test";
import { checkEnv } from "./check-env.mjs";
import { pollOnce } from "./wait-for-staging.mjs";
import { bypassHeadersFor } from "../../e2e/bypass.mjs";

const json = (body, status = 200) => async () => ({ ok: status < 400, status, json: async () => body });
const SHA = "a".repeat(40);

test("check-env passes on staging/staging", async () => {
  const r = await checkEnv("https://x.test", "staging", "staging", { fetchImpl: json({ env: "staging", db: "staging", commit: SHA }) });
  assert.equal(r.ok, true);
});
test("check-env fails on a wrong expected value", async () => {
  const r = await checkEnv("https://x.test", "production", "production", { fetchImpl: json({ env: "staging", db: "staging" }) });
  assert.equal(r.ok, false);
});
test("check-env fails on production, redirect/HTTP error, bad JSON, missing fields", async () => {
  assert.equal((await checkEnv("https://x.test", "staging", "staging", { fetchImpl: json({ env: "production", db: "production" }) })).ok, false);
  assert.equal((await checkEnv("https://x.test", "staging", "staging", { fetchImpl: json({}, 401) })).ok, false);
  assert.equal((await checkEnv("https://x.test", "staging", "staging", { fetchImpl: async () => { throw new TypeError("redirect"); } })).ok, false);
  assert.equal((await checkEnv("https://x.test", "staging", "staging", { fetchImpl: async () => ({ ok: true, json: async () => { throw new SyntaxError("x"); } }) })).ok, false);
  assert.equal((await checkEnv("https://x.test", "staging", "staging", { fetchImpl: json({}) })).ok, false);
});
test("check-env sends the bypass header only when a secret is set", async () => {
  let seen;
  const f = async (u, o) => { seen = o.headers; return { ok: true, json: async () => ({ env: "staging", db: "staging" }) }; };
  await checkEnv("https://x.test", "staging", "staging", { fetchImpl: f, secret: "" });
  assert.equal(seen["x-vercel-protection-bypass"], undefined);
  await checkEnv("https://x.test", "staging", "staging", { fetchImpl: f, secret: "s" });
  assert.equal(seen["x-vercel-protection-bypass"], "s");
});

const gh = (deps, statuses) => async (p) => (p.startsWith("/deployments?") ? deps : statuses);
const st = () => ({ settleFrom: undefined });
test("wait: needs both hosts", async () => {
  const ok = gh([{ id: 1 }], [{ state: "success" }]);
  assert.equal((await pollOnce(SHA, { ghGet: ok, fetchImpl: json({ env: "staging", db: "staging", commit: "b".repeat(40) }), settleMs: 1, state: st() })).done, false);
  assert.equal((await pollOnce(SHA, { ghGet: gh([{ id: 1 }], [{ state: "pending" }]), fetchImpl: json({ env: "staging", db: "staging", commit: SHA }), settleMs: 1, state: st() })).done, false);
  assert.equal((await pollOnce(SHA, { ghGet: gh([], []), fetchImpl: json({ env: "staging", db: "staging", commit: SHA }), settleMs: 1, state: st() })).done, false);
  assert.equal((await pollOnce(SHA, { ghGet: ok, fetchImpl: json({ env: "staging", db: "staging", commit: SHA }), settleMs: 1, state: st() })).done, true);
});
test("wait: refuses an api that is not staging/staging", async () => {
  await assert.rejects(pollOnce(SHA, { ghGet: gh([{ id: 1 }], [{ state: "success" }]), fetchImpl: json({ env: "production", db: "production", commit: SHA }), settleMs: 1, state: st() }));
});
test("wait: commit null settles after the delay", async () => {
  let t = 0;
  const state = st();
  const o = { ghGet: gh([{ id: 1 }], [{ state: "success" }]), fetchImpl: json({ env: "staging", db: "staging", commit: null }), settleMs: 1000, state, now: () => t };
  assert.equal((await pollOnce(SHA, o)).done, false);
  t = 1500;
  assert.equal((await pollOnce(SHA, o)).done, true);
});
test("bypass header goes to the origin under test only", () => {
  const env = { VERCEL_AUTOMATION_BYPASS_SECRET: "s", E2E_BASE_URL: "https://staging.buildcity.in" };
  assert.deepEqual(bypassHeadersFor("https://staging.buildcity.in/api/v1/env", env), { "x-vercel-protection-bypass": "s" });
  assert.deepEqual(bypassHeadersFor("https://fonts.googleapis.com/x", env), {});
  assert.deepEqual(bypassHeadersFor("https://staging.buildcity.in/", { E2E_BASE_URL: env.E2E_BASE_URL }), {});
});
