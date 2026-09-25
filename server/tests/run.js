// Boots the API against a LOCAL test database, then runs the security + smoke suites.
// Usage: DATABASE_URL=postgresql://postgres@localhost:5432/buildcity_test npm run test:security
const { spawn, execFileSync } = require("child_process");
const path = require("path");

const dbUrl = process.env.DATABASE_URL || "";
if (!/@(localhost|127\.0\.0\.1)[:/]/.test(dbUrl)) {
  console.error("Refusing to run: tests TRUNCATE tables, so DATABASE_URL must point at a localhost database.");
  process.exit(1);
}

const port = process.env.TEST_PORT || "5055";
const env = {
  ...process.env,
  DIRECT_URL: process.env.DIRECT_URL || dbUrl,
  JWT_SECRET: process.env.JWT_SECRET || "local-test-secret-local-test-secret-000",
  PORT: port,
  TEST_PORT: port,
  SMS_USERNAME: "test",
  SMS_APIKEY: "test",
  SMS_RELAY_SECRET: "",
  NODE_ENV: "test",
};
const root = path.join(__dirname, "..");

execFileSync("npx", ["prisma", "db", "push", "--skip-generate"], { cwd: root, env, stdio: "ignore" });

const server = spawn("node", ["src/index.js"], { cwd: root, env, stdio: ["ignore", "ignore", "inherit"] });

async function waitForHealth() {
  for (let i = 0; i < 50; i++) {
    try {
      const r = await fetch(`http://localhost:${port}/health`);
      if (r.ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error("Server did not start");
}

(async () => {
  let failed = false;
  try {
    await waitForHealth();
    for (const suite of ["security.test.js", "smoke.test.js", "pagination.test.js"]) {
      console.log(`\n=== ${suite} ===`);
      try {
        execFileSync("node", [path.join(__dirname, suite)], { env, stdio: "inherit" });
      } catch {
        failed = true;
      }
    }
  } finally {
    server.kill("SIGTERM");
  }
  process.exit(failed ? 1 : 0);
})();
