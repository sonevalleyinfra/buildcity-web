// node --test e2e/guard.test.mjs
// Unit tests for the guard plus an end-to-end proof: pointed at a stub that reports production,
// `playwright test` aborts in global setup, executes 0 tests, and the stub sees only GET /api/v1/env.
import assert from "node:assert/strict";
import http from "node:http";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { assertSafeRun, assertSafeTarget, assertNotProdHost, GuardError } from "./guard.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

function stub(body, status = 200) {
  const seen = [];
  const server = http.createServer((req, res) => {
    seen.push(`${req.method} ${req.url}`);
    res.writeHead(status, { "content-type": "application/json" });
    res.end(typeof body === "string" ? body : JSON.stringify(body));
  });
  return new Promise((resolve) =>
    server.listen(0, "127.0.0.1", () => resolve({ url: `http://127.0.0.1:${server.address().port}`, seen, close: () => server.close() }))
  );
}

test("refuses every prod host without a network call", async () => {
  const never = () => { throw new Error("network call"); };
  for (const h of ["https://www.buildcity.in", "https://buildcity.in/", "https://api.buildcity.cloud", "https://buildcity-web-part-2.vercel.app", "https://API.BuildCity.Cloud./x", "https://www.buildcity.in:443"]) {
    await assert.rejects(assertSafeTarget(h, "t", never), GuardError, h);
  }
  assert.throws(() => assertNotProdHost("ftp://x"), GuardError);
  assert.throws(() => assertNotProdHost("nonsense"), GuardError);
});

test("accepts staging/test, refuses everything else", async () => {
  for (const [body, ok] of [
    [{ env: "test", db: "test" }, true],
    [{ env: "staging", db: "staging" }, true],
    [{ env: "test", db: "staging" }, true],
    [{ env: "production", db: "production" }, false],
    [{ env: "staging", db: "production" }, false],
    [{ env: "production", db: "staging" }, false],
    [{ env: "test", db: null }, false],
    [{ env: "development", db: "test" }, false],
    [{}, false],
    ["not json", false],
    [[], false],
  ]) {
    const s = await stub(body);
    try {
      if (ok) await assertSafeTarget(s.url);
      else await assert.rejects(assertSafeTarget(s.url), GuardError, JSON.stringify(body));
    } finally { s.close(); }
  }
});

test("refuses HTTP errors and unreachable hosts", async () => {
  const s = await stub({ env: "test", db: "test" }, 500);
  await assert.rejects(assertSafeTarget(s.url), GuardError);
  s.close();
  await assert.rejects(assertSafeTarget("http://127.0.0.1:1"), GuardError);
});

test("checks the API URL too when it differs from the base URL", async () => {
  const ok = await stub({ env: "test", db: "test" });
  const bad = await stub({ env: "production", db: "production" });
  try {
    await assertSafeRun({ baseURL: ok.url, apiURL: ok.url });
    await assert.rejects(assertSafeRun({ baseURL: ok.url, apiURL: bad.url }), GuardError);
    await assert.rejects(assertSafeRun({ baseURL: bad.url }), GuardError);
    await assert.rejects(assertSafeRun({}), GuardError);
  } finally { ok.close(); bad.close(); }
});

// Async spawn: the in-process stubs must keep answering while Playwright runs.
function runPlaywright(env) {
  const sentinel = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "e2e-guard-")), "sentinel");
  return new Promise((resolve) => {
    const child = spawn("npx", ["playwright", "test", "-c", "e2e/playwright.config.mjs", "00-guard-sentinel", "--reporter=list"], {
      cwd: root, env: { ...process.env, E2E_SENTINEL_FILE: sentinel, ...env },
    });
    let stdout = "", stderr = "";
    child.stdout.on("data", (d) => (stdout += d));
    child.stderr.on("data", (d) => (stderr += d));
    child.on("close", (status) => resolve({ r: { status, stdout, stderr }, ran: fs.existsSync(sentinel) }));
  });
}

test("playwright aborts with 0 tests when the stub reports production", async () => {
  const s = await stub({ env: "production", db: "production" });
  try {
    const { r, ran } = await runPlaywright({ E2E_BASE_URL: s.url });
    assert.notEqual(r.status, 0);
    assert.equal(ran, false, "no test may execute");
    assert.match(r.stdout + r.stderr, /isolation guard/);
    assert.doesNotMatch(r.stdout, /1 passed/);
    assert.deepEqual(s.seen, ["GET /api/v1/env"], "only the read-only env probe may reach the target");
  } finally { s.close(); }
});

test("playwright aborts with 0 tests on a prod host", async () => {
  const { r, ran } = await runPlaywright({ E2E_BASE_URL: "https://www.buildcity.in" });
  assert.notEqual(r.status, 0);
  assert.equal(ran, false);
  assert.match(r.stdout + r.stderr, /production host/);
});

test("playwright aborts when the API url is production behind a safe web url", async () => {
  const ok = await stub({ env: "test", db: "test" });
  const bad = await stub({ env: "production", db: "production" });
  try {
    const { r, ran } = await runPlaywright({ E2E_BASE_URL: ok.url, E2E_API_URL: bad.url });
    assert.notEqual(r.status, 0);
    assert.equal(ran, false);
  } finally { ok.close(); bad.close(); }
});

test("playwright runs when the stub reports test", async () => {
  const s = await stub({ env: "test", db: "test" });
  try {
    const { r, ran } = await runPlaywright({ E2E_BASE_URL: s.url });
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.equal(ran, true);
  } finally { s.close(); }
});
