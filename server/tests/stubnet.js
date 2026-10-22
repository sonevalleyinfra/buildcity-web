// Preloaded (node -r) into a test server: every outbound http/https/fetch call is logged to STUB_LOG and throws.
const fs = require("fs");
const http = require("http");
const https = require("https");
const log = (what, args) => {
  try { fs.appendFileSync(process.env.STUB_LOG, what + " " + String((args[0] && (args[0].hostname || args[0].host)) || args[0]).slice(0, 80) + "\n"); } catch {}
};
for (const [name, mod] of [["http", http], ["https", https]]) {
  for (const fn of ["request", "get"]) {
    mod[fn] = (...args) => { log(`${name}.${fn}`, args); throw new Error("network stubbed"); };
  }
}
globalThis.fetch = (...args) => { log("fetch", args); throw new Error("network stubbed"); };
