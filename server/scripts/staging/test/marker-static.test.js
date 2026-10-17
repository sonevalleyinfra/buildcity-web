"use strict";
// Static guard: the buildcity.env marker is read from the catalog only, never from a spoofable session GUC.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { MARKER_SQL } = require("../../../src/dbMarker");

const server = path.join(__dirname, "..", "..", "..");
const repo = path.join(server, "..");
const SKIP_DIRS = new Set(["node_modules", "test", "tests", "__tests__", ".git"]);

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) {
      if (!SKIP_DIRS.has(e.name)) walk(path.join(dir, e.name), out);
    } else if (e.isFile()) {
      out.push(path.join(dir, e.name));
    }
  }
  return out;
}

test("no non-test code reads current_setting('buildcity.env')", () => {
  const files = [path.join(server, "src"), path.join(server, "scripts"), path.join(repo, "scripts")].flatMap((d) => walk(d));
  assert.ok(files.length > 0);
  const re = /current_setting\s*\(\s*['"`\\]*buildcity\.env/i;
  const hits = files.filter((f) => re.test(fs.readFileSync(f, "utf8"))).map((f) => path.relative(repo, f));
  assert.deepEqual(hits, []);
});

test("every marker guard uses the catalog read", () => {
  const guards = [
    "server/src/appEnv.js",
    "server/scripts/staging/seed-test-accounts.js",
    "scripts/e2e-local.mjs",
    "server/scripts/staging/anonymise.sql",
    "server/scripts/staging/refresh.sh",
    "server/scripts/migration/restore.sh",
  ];
  for (const f of guards) {
    const src = fs.readFileSync(path.join(repo, f), "utf8");
    assert.ok(/pg_db_role_setting|dbMarker/.test(src), f);
  }
});

test("MARKER_SQL reads only the database-level row of the current database", () => {
  assert.match(MARKER_SQL, /setrole = 0/);
  assert.match(MARKER_SQL, /current_database\(\)/);
  assert.match(MARKER_SQL, /pg_db_role_setting/);
  assert.doesNotMatch(MARKER_SQL, /current_setting/);
});
