// Runs before any test. A thrown error aborts the whole run with 0 tests executed and no
// writing request sent (the only request is GET /api/v1/env).
import fs from "node:fs";
import { assertSafeRun } from "./guard.mjs";
import { withBypass } from "./bypass.mjs";
import { STATE_DIR, newRunId } from "./state.mjs";

export default async function globalSetup() {
  const baseURL = process.env.E2E_BASE_URL;
  const apiURL = process.env.E2E_API_URL || baseURL;
  await assertSafeRun({ baseURL, apiURL }, withBypass());

  fs.rmSync(STATE_DIR, { recursive: true, force: true });
  fs.mkdirSync(STATE_DIR, { recursive: true });
  const runId = newRunId();
  process.env.E2E_RUN_ID = runId; // inherited by workers
  fs.writeFileSync(`${STATE_DIR}/run.json`, JSON.stringify({ runId }));
}
