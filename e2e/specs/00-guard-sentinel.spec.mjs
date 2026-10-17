import fs from "node:fs";
import { test } from "../fixtures.mjs";

// Proves whether any test ran: used by guard.test.mjs. Does nothing else.
test("sentinel", async () => {
  test.skip(!process.env.E2E_SENTINEL_FILE, "guard test only");
  if (process.env.E2E_SENTINEL_FILE) fs.writeFileSync(process.env.E2E_SENTINEL_FILE, "ran");
});
