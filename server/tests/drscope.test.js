// Unit tests for src/drScope.js (pure: fake prisma, no server, no database).
let pass = 0, fail = 0;
const ok = (cond, name, extra) => {
  if (cond) { pass++; console.log("PASS", name); }
  else { fail++; console.log("FAIL", name, extra !== undefined ? JSON.stringify(extra).slice(0, 300) : ""); }
};
const scenario = async (name, fn) => {
  try { await fn(); } catch (e) { ok(false, name, e && e.message); }
};
const sorted = (a) => [...a].sort();
const same = (a, b) => JSON.stringify(sorted(a)) === JSON.stringify(sorted(b));

const DEFAULT_DRS = [{ id: "dr1", regionId: "r-var", status: "ACTIVE", disabledAt: null, region: { id: "r-var", name: "Varanasi" } }];

// Applies only the resolver's live/ACTIVE filters (the identity part is the caller's own row here)
function liveActive(where, row) {
  const parts = where?.AND || [];
  const wantsLive = parts.some((p) => p && "disabledAt" in p && p.disabledAt === null);
  const st = parts.find((p) => p && p.status)?.status;
  if (wantsLive && row.disabledAt) return false;
  if (st && String(row.status).toLowerCase() !== String(st.equals).toLowerCase()) return false;
  return true;
}

function fakePrisma({ failDrsTimes = 0, failRegionsTimes = 0, drs = DEFAULT_DRS } = {}) {
  const calls = { drs: 0, regions: 0, lastDrWhere: null };
  const prisma = {
    dR: {
      findMany: async (args) => {
        calls.drs++;
        calls.lastDrWhere = args?.where;
        if (calls.drs <= failDrsTimes) throw new Error("connection reset");
        return drs.filter((row) => liveActive(args?.where, row));
      },
    },
    region: {
      findMany: async () => {
        calls.regions++;
        if (calls.regions <= failRegionsTimes) throw new Error("pool timeout");
        return [
          { id: "r-var", name: "Varanasi" },
          { id: "r-ban", name: "Banaras" },
          { id: "r-kas", name: "Kashipur" },
          { id: "r-vc", name: "Vns Colony" },
          { id: "r-mzp", name: "Mirzapur" },
        ];
      },
    },
  };
  return { prisma, calls };
}

const AUTH = { userId: "u-dr1", phone: "+91 91000 00001", role: "DR" };
const EXPECTED = ["r-var", "r-ban"];

(async () => {
  let mod;
  try { mod = require("../src/drScope"); } catch (e) {
    ok(false, "src/drScope.js loads", e && e.message);
    console.log(`\n${pass} passed, ${fail} failed`);
    process.exit(1);
  }
  const { canonicalDistrict, drSelfWhere, createDrRegionResolver, DrScopeUnavailableError } = mod;

  await scenario("canonicalDistrict", async () => {
    const cases = [
      ["Varanasi", "varanasi"], [" varanasi ", "varanasi"], ["VARANASI", "varanasi"], ["Banaras", "varanasi"],
      ["Kashi", "varanasi"], ["vns", "varanasi"], ["Varnasi", "varanasi"], ["Allahabad", "prayagraj"], ["MZP", "mirzapur"],
      ["Kashipur", "kashipur"], ["Vns Colony", "vns colony"], ["E2E Varanasi", "e2e varanasi"],
      ["Varanasi Rural", "varanasi rural"], ["Mirzapur 123", "mirzapur 123"], ["kashi-vishwanath", "kashi vishwanath"],
      ["", ""], [null, ""], [undefined, ""],
    ];
    const bad = cases.filter(([inp, want]) => canonicalDistrict(inp) !== want).map(([inp, want]) => ({ inp, want, got: canonicalDistrict(inp) }));
    ok(bad.length === 0, "canonicalDistrict: whole-name alias equality only (no substring widening)", bad);
  });

  await scenario("drSelfWhere", async () => {
    const w = drSelfWhere(AUTH);
    ok(w && JSON.stringify(w.OR) === JSON.stringify([{ id: "u-dr1" }, { userId: "u-dr1" }, { phone: { endsWith: "9100000001" } }]), "drSelfWhere matches id, userId and last-10 phone", w);
    ok(drSelfWhere({ phone: "123" }) === null, "drSelfWhere: short phone alone matches nothing", drSelfWhere({ phone: "123" }));
    ok(drSelfWhere({}) === null && drSelfWhere(null) === null, "drSelfWhere: no identity -> null");
  });

  await scenario("resolver: success is cached, copies returned, clear() empties", async () => {
    const { prisma, calls } = fakePrisma();
    const r = createDrRegionResolver(prisma);
    const a = await r.resolve(AUTH);
    ok(same(a, EXPECTED), "resolver returns only exact alias-district regions", a);
    a.push("r-mzp");
    const b = await r.resolve(AUTH);
    ok(same(b, EXPECTED) && calls.drs === 1 && calls.regions === 1, "second call within TTL is cached and unaffected by caller mutation", { b, calls });
    r.clear();
    await r.resolve(AUTH);
    ok(calls.drs === 2, "clear() forces a re-query", calls);
  });

  await scenario("resolver: TTL expiry re-queries", async () => {
    const { prisma, calls } = fakePrisma();
    const r = createDrRegionResolver(prisma, { ttlMs: 1 });
    await r.resolve(AUTH);
    await new Promise((res) => setTimeout(res, 10));
    await r.resolve(AUTH);
    ok(calls.drs === 2, "expired entry is re-queried", calls);
  });

  for (const which of ["drs", "regions"]) {
    await scenario(`resolver: ${which} query failure fails closed`, async () => {
      const { prisma, calls } = fakePrisma(which === "drs" ? { failDrsTimes: 1 } : { failRegionsTimes: 1 });
      const r = createDrRegionResolver(prisma);
      let got, err;
      try { got = await r.resolve(AUTH); } catch (e) { err = e; }
      ok(got === undefined && err instanceof DrScopeUnavailableError && err.status === 503, `${which} failure rejects with DrScopeUnavailableError (503), never [] or ids`, { got, err: err && err.message });
      ok(err && err.message === "District scope is temporarily unavailable. Please try again.", `${which} failure message is the safe client message`, err && err.message);
      const before = calls.drs;
      const next = await r.resolve(AUTH);
      ok(calls.drs === before + 1 && same(next, EXPECTED), `failure is not cached; next call re-queries and succeeds`, { calls, next });
    });
  }

  await scenario("resolver: concurrent callers share a failure but nothing is stored", async () => {
    const { prisma, calls } = fakePrisma({ failDrsTimes: 1 });
    const r = createDrRegionResolver(prisma);
    const results = await Promise.allSettled([r.resolve(AUTH), r.resolve(AUTH)]);
    ok(results.every((x) => x.status === "rejected") && calls.drs === 1, "concurrent callers both reject from one query", { results: results.map((x) => x.status), calls });
    const next = await r.resolve(AUTH);
    ok(same(next, EXPECTED) && calls.drs === 2, "next call after shared failure re-queries", calls);
  });

  await scenario("resolver: deleted or non-ACTIVE DR rows give no scope", async () => {
    for (const [label, row] of [
      ["deleted", { ...DEFAULT_DRS[0], disabledAt: new Date() }],
      ["SUSPENDED", { ...DEFAULT_DRS[0], status: "SUSPENDED" }],
      ["INACTIVE", { ...DEFAULT_DRS[0], status: "INACTIVE" }],
    ]) {
      const { prisma, calls } = fakePrisma({ drs: [row] });
      const r = createDrRegionResolver(prisma);
      const ids = await r.resolve(AUTH);
      ok(Array.isArray(ids) && ids.length === 0, `${label} DR row resolves to []`, { ids, where: calls.lastDrWhere });
    }
    const { prisma } = fakePrisma({ drs: [{ ...DEFAULT_DRS[0], status: "active" }] });
    ok(same(await createDrRegionResolver(prisma).resolve(AUTH), EXPECTED), "status match is case-insensitive (legacy 'active')");
  });

  await scenario("resolver: no identity -> [] without querying", async () => {
    const { prisma, calls } = fakePrisma();
    const r = createDrRegionResolver(prisma);
    const ids = await r.resolve({ role: "DR" });
    ok(Array.isArray(ids) && ids.length === 0 && calls.drs === 0, "no identity resolves to [] (callers fail closed)", { ids, calls });
  });

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
