// Sandbox outbox: in-memory ring buffer of SMS/push payloads that were NOT sent because the API is not production.
// Lost on restart by design. Nothing is stored in production (callers only record when sandboxed).
const MAX = 200;
const entries = [];
let seq = 0;

function record(kind, payload) {
  const entry = { id: ++seq, at: new Date().toISOString(), kind, payload };
  entries.push(entry);
  if (entries.length > MAX) entries.shift();
  return entry;
}

function list() {
  return entries.slice().reverse();
}

function _resetForTests() {
  entries.length = 0;
  seq = 0;
}

// 404 in production (the route must look absent), otherwise falls through to auth + role checks.
function notInProduction(isProduction) {
  return (req, res, next) => {
    if (isProduction()) return res.status(404).json({ error: "Not found" });
    return next();
  };
}

function listHandler(req, res) {
  res.json({ max: MAX, entries: list() });
}

module.exports = { MAX, record, list, notInProduction, listHandler, _resetForTests };
