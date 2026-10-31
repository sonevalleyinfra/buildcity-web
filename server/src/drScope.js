// District Representative (DR) scope: which regions a DR may see and manage.
// Every failure here must fail CLOSED: callers turn a rejection into a 503, never into "no scope".

// Same district aliases as the DR dashboard, so "Banaras" and "Varanasi" region rows count as one district
const DISTRICT_ALIASES = {
  varanasi: ["varanasi", "varnasi", "banaras", "kashi", "vns"],
  mirzapur: ["mirzapur", "mzp"],
  prayagraj: ["prayagraj", "allahabad"],
  jaunpur: ["jaunpur"],
};

// Lowercase, collapse every run of non-alphanumerics into one space, trim
function normaliseDistrictName(name) {
  return String(name || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

// Whole-name equality only: "Kashipur" or "Vns Colony" must not widen the Varanasi district
function canonicalDistrict(name) {
  const clean = normaliseDistrictName(name);
  if (!clean) return "";
  for (const [district, aliases] of Object.entries(DISTRICT_ALIASES)) {
    if (aliases.includes(clean)) return district;
  }
  return clean;
}

// Prisma `where` for the caller's own DR row(s), or null when the token carries no usable identity
function drSelfWhere(auth) {
  const last10 = String(auth?.phone || "").replace(/\D/g, "").slice(-10);
  const or = [];
  if (auth?.userId) or.push({ id: auth.userId }, { userId: auth.userId });
  if (last10.length === 10) or.push({ phone: { endsWith: last10 } });
  return or.length > 0 ? { OR: or } : null;
}

class DrScopeUnavailableError extends Error {
  constructor(cause) {
    super("District scope is temporarily unavailable. Please try again.");
    this.name = "DrScopeUnavailableError";
    this.status = 503;
    this.cause = cause;
  }
}

// Region IDs covering the logged-in DR's assigned district(s).
// A DR dashboard load sends several requests at once (cloud-sync, orders, summary, vendors,
// listings) that each need this, so successful results are cached briefly; any mutation clears the
// cache (see invalidateCache), so a DR reassignment still applies immediately. Failures are never cached.
// Only live, ACTIVE DR rows count (same rule as the partner login and /users/me), so an old token of a
// deleted (disabledAt set) or suspended DR loses its scope as soon as that change clears the cache.
function createDrRegionResolver(prisma, { ttlMs = 30000 } = {}) {
  const cache = new Map();

  function resolve(auth) {
    const where = drSelfWhere(auth);
    if (!where) return Promise.resolve([]);

    const last10 = String(auth?.phone || "").replace(/\D/g, "").slice(-10);
    const key = `${auth?.userId || ""}|${last10}`;
    const cached = cache.get(key);
    // Callers get their own copy so none can alter the cached list
    if (cached && cached.expiresAt > Date.now()) return cached.promise.then((ids) => ids.slice());

    const promise = (async () => {
      // Both reads in parallel: the region list is small, and this saves a sequential round trip
      const [drs, regions] = await Promise.all([
        prisma.dR.findMany({
          where: { AND: [where, { disabledAt: null }, { status: { equals: "ACTIVE", mode: "insensitive" } }] },
          include: { region: true },
        }),
        prisma.region.findMany({ select: { id: true, name: true } }),
      ]);
      const regionIds = new Set(drs.map((d) => d.regionId).filter(Boolean));
      const districts = new Set(drs.map((d) => canonicalDistrict(d.region?.name)).filter(Boolean));
      for (const r of regions) {
        if (districts.has(canonicalDistrict(r.name))) regionIds.add(r.id);
      }
      return Array.from(regionIds);
    })().catch((err) => {
      // Drop only our own entry: a newer lookup may already have replaced it
      if (cache.get(key)?.promise === promise) cache.delete(key);
      throw new DrScopeUnavailableError(err);
    });
    cache.set(key, { promise, expiresAt: Date.now() + ttlMs });
    return promise.then((ids) => ids.slice());
  }

  return { resolve, clear: () => cache.clear() };
}

module.exports = {
  DISTRICT_ALIASES,
  canonicalDistrict,
  drSelfWhere,
  createDrRegionResolver,
  DrScopeUnavailableError,
};
