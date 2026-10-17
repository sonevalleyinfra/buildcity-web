"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { decide, PASSWORD_VARS } = require("../seed-test-accounts.js");

const passwords = { E2E_VENDOR_PASSWORD: "DUMMY-v", E2E_DR_PASSWORD: "DUMMY-d", E2E_ADMIN_PASSWORD: "DUMMY-a" };
const LOCAL = "postgresql://u:DUMMYPASS@127.0.0.1/db";
const reasons = [];
const run = (o) => {
  const v = decide({ databaseUrl: LOCAL, passwords, ...o });
  if (v.reason) reasons.push({ reason: v.reason, url: o.databaseUrl || LOCAL });
  return v;
};

test("unmarked database is refused even with APP_ENV=test on loopback", () => {
  for (const marker of [null, undefined, ""]) {
    const v = run({ appEnv: "test", marker });
    assert.equal(v.ok, false);
    assert.match(v.reason, /not marked/);
  }
});

test("marker test with APP_ENV=test on a loopback host is ok", () => {
  for (const host of ["127.0.0.1", "localhost", "[::1]"]) {
    assert.equal(run({ appEnv: "test", marker: "test", databaseUrl: `postgresql://u:x@${host}/db` }).ok, true, host);
  }
});

test("marker test without APP_ENV=test is refused", () => {
  for (const appEnv of [undefined, "staging", "development"]) {
    assert.equal(run({ appEnv, marker: "test" }).ok, false, String(appEnv));
  }
});

test("marker test on a non-loopback host is refused", () => {
  assert.equal(run({ appEnv: "test", marker: "test", databaseUrl: "postgresql://u:x@db.example.com/db" }).ok, false);
});

test("?host= override: the marker read from the connected DB is the guard", () => {
  // node-pg would connect to prod.example.com, but the hostname check still sees 127.0.0.1. That is fine: the
  // marker 'test' was read from the database actually connected to, so a prod DB (marked production or unmarked)
  // is refused regardless of the URL.
  const databaseUrl = "postgresql://u:x@127.0.0.1/db?host=prod.example.com";
  assert.equal(run({ appEnv: "test", marker: "test", databaseUrl }).ok, true);
  assert.equal(run({ appEnv: "test", marker: null, databaseUrl }).ok, false);
});

test("marker staging is ok without APP_ENV=test", () => {
  for (const appEnv of [undefined, "staging", "test"]) {
    assert.equal(run({ appEnv, marker: "staging", databaseUrl: "postgresql://u:x@db.example.com/db" }).ok, true);
  }
});

test("marker production in any case is refused", () => {
  for (const marker of ["production", "Production", "PRODUCTION"]) {
    for (const appEnv of [undefined, "staging", "test", "production"]) {
      const v = run({ appEnv, marker });
      assert.equal(v.ok, false, `${marker}/${appEnv}`);
      assert.match(v.reason, /production/);
    }
  }
});

test("APP_ENV=production is refused on staging and test markers", () => {
  for (const marker of ["staging", "test"]) {
    const v = run({ appEnv: "production", marker });
    assert.equal(v.ok, false);
    assert.equal(v.reason, "APP_ENV=production");
  }
});

test("APP_ENV=production in any case is refused", () => {
  for (const appEnv of ["Production", "PRODUCTION", " production "]) {
    for (const marker of ["staging", "test"]) {
      const v = run({ appEnv, marker });
      assert.equal(v.ok, false, `${appEnv}/${marker}`);
      assert.equal(v.reason, "APP_ENV=production");
    }
  }
});

test("unknown marker is refused", () => {
  assert.equal(run({ appEnv: "test", marker: "dev" }).ok, false);
});

test("each missing password var is refused", () => {
  for (const k of PASSWORD_VARS) {
    const v = run({ appEnv: "test", marker: "staging", passwords: { ...passwords, [k]: "" } });
    assert.equal(v.ok, false);
    assert.equal(v.reason, `${k} is not set`);
  }
  assert.equal(run({ appEnv: "test", marker: "staging", passwords: undefined }).ok, false);
});

test("unparsable URL with marker test is refused", () => {
  assert.equal(run({ appEnv: "test", marker: "test", databaseUrl: "not a url" }).ok, false);
  assert.equal(run({ appEnv: "test", marker: "test", databaseUrl: undefined }).ok, false);
});

test("no reason contains a URL or a password value", () => {
  assert.ok(reasons.length > 0);
  for (const { reason, url } of reasons) {
    for (const pw of Object.values(passwords)) assert.ok(!reason.includes(pw), reason);
    assert.ok(!reason.includes("postgresql://"), reason);
    if (url) assert.ok(!reason.includes(url), reason);
  }
});
