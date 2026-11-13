import { defineConfig, devices } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  testDir: path.join(dir, "specs"),
  outputDir: path.join(dir, "results"),
  globalSetup: path.join(dir, "global-setup.mjs"),
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  forbidOnly: !!process.env.CI,
  reporter: [["list"], ["html", { open: "never", outputFolder: path.join(dir, "report") }]],
  use: {
    baseURL: process.env.E2E_BASE_URL,
    // e2e-staging sets E2E_TRACE=off: staging traces would hold real passwords and the bypass header.
    trace: process.env.E2E_TRACE === "off" ? "off" : "retain-on-failure",
    screenshot: "off",
    video: "off",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
