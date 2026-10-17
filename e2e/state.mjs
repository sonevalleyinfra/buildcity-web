// Shared state between specs (they run serially in one worker, in file order).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const STATE_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), ".state");
export const OTP = process.env.STAGING_OTP || "246810";
export const PRODUCT_NAME = "E2E Test Cement 50kg";
export const REGION_NAME = "E2E Region";

export function newRunId() {
  return Date.now().toString(36);
}

export function runId() {
  return process.env.E2E_RUN_ID || JSON.parse(fs.readFileSync(path.join(STATE_DIR, "run.json"), "utf8")).runId;
}

// Test-number range: 10000 + 5 digits derived from the run id (the OTP sandbox accepts 10000xxxxx only).
export function customerPhone() {
  const digits = String(parseInt(runId(), 36) % 100000).padStart(5, "0");
  return `10000${digits}`;
}

export function readState() {
  try {
    return JSON.parse(fs.readFileSync(path.join(STATE_DIR, "state.json"), "utf8"));
  } catch {
    return {};
  }
}

export function writeState(patch) {
  fs.mkdirSync(STATE_DIR, { recursive: true });
  fs.writeFileSync(path.join(STATE_DIR, "state.json"), JSON.stringify({ ...readState(), ...patch }, null, 2));
}
