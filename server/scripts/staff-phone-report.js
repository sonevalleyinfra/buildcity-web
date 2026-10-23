// Staff phone report (read-only).
//
// Purpose: before/after Security PR4, list what blocks the partial unique indexes vendors_phone_live_key and
// district_representatives_phone_live_key (two LIVE staff rows with the same phone), staff rows with malformed phones,
// and staff accounts that can no longer log in (row/user role mismatch, staff users without a live row).
// With --weak-passwords it also counts staff whose stored hash matches a deny-listed default password.
//
// Usage: DATABASE_URL=... node scripts/staff-phone-report.js [--weak-passwords]
//        (or: npm run report:staff-phones -- --weak-passwords)
//
// Read-only guarantee: every query runs inside ONE transaction that starts with SET TRANSACTION READ ONLY, so
// Postgres rejects any write. Phones are PII: only their last 4 digits are printed. Hashes are never printed.
//
// Manual dedupe procedure (never automatic, nothing here deletes anything):
//   1. Run this report. For every group in vendors/drs.duplicateGroups the owner decides which row stays live
//      (usually the one with orders/listings, or the newest joinedOn).
//   2. Resolve each extra row either by deleting it in the admin UI (a soft delete: disabled_at is set, history kept),
//      or, if the phone was simply typed wrong, by correcting the phone on that row in the admin UI.
//   3. Re-run this report until summary.uniqueIndexWillBuild is true for both tables; the next server boot then
//      creates the missing index (ensureStaffSchema in src/staff.js).
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const { PASSWORD_DENY_LIST } = require("../src/staff");

const TABLES = {
  vendors: { table: "vendors", role: "VENDOR", status: "status::text" },
  drs: { table: "district_representatives", role: "DR", status: "status" },
};

async function hasDisabledAt(tx, table) {
  const rows = await tx.$queryRawUnsafe(
    "SELECT 1 FROM pg_attribute WHERE attrelid = to_regclass($1) AND attname = 'disabled_at' AND NOT attisdropped",
    table
  );
  return rows.length > 0;
}

// Live rows grouped by an SQL key expression, only groups with more than one row
async function duplicateGroups(tx, { table, status }, live, keyExpr) {
  const rows = await tx.$queryRawUnsafe(
    `SELECT right(${keyExpr}, 4) AS "phoneLast4", count(*)::int AS count,
            json_agg(json_build_object('id', id, 'userId', "userId", 'status', ${status}, 'joinedOn', "joinedOn") ORDER BY "joinedOn") AS rows
       FROM ${table} ${live ? "WHERE disabled_at IS NULL" : ""}
      GROUP BY ${keyExpr} HAVING count(*) > 1 ORDER BY 1`
  );
  return rows;
}

async function report(tx, { weakPasswords }) {
  const out = { vendors: {}, drs: {}, invalidPhones: [], inconsistent: [], summary: {} };
  const hashes = [];
  for (const [key, t] of Object.entries(TABLES)) {
    const live = await hasDisabledAt(tx, t.table);
    const liveWhere = live ? "disabled_at IS NULL" : "TRUE";
    out[key].disabledAtColumn = live;
    out[key].liveRows = Number((await tx.$queryRawUnsafe(`SELECT count(*)::int AS n FROM ${t.table} WHERE ${liveWhere}`))[0].n);
    out[key].duplicateGroups = await duplicateGroups(tx, t, live, "phone");
    out[key].normalizedDuplicateGroups = await duplicateGroups(tx, t, live, "right(regexp_replace(phone, '\\D', '', 'g'), 10)");

    const invalid = await tx.$queryRawUnsafe(`SELECT id, right(phone, 4) AS "phoneLast4" FROM ${t.table} WHERE phone !~ '^[0-9]{10}$' ORDER BY id`);
    out.invalidPhones.push(...invalid.map((r) => ({ table: t.table, ...r })));

    // Rows whose login is not of the matching role, and staff users without any live row of their kind
    const wrongRole = await tx.$queryRawUnsafe(
      `SELECT s.id, s."userId", u.role::text AS "userRole" FROM ${t.table} s LEFT JOIN users u ON u.id = s."userId"
        WHERE ${live ? "s.disabled_at IS NULL AND " : ""}(u.id IS NULL OR u.role::text <> $1) ORDER BY s.id`,
      t.role
    );
    out.inconsistent.push(...wrongRole.map((r) => ({ kind: `${t.table} row whose user is not ${t.role}`, id: r.id, userId: r.userId, role: r.userRole })));
    const orphans = await tx.$queryRawUnsafe(
      `SELECT u.id, u.role::text AS role FROM users u
        WHERE u.role::text = $1 AND NOT EXISTS (SELECT 1 FROM ${t.table} s WHERE s."userId" = u.id AND ${live ? "s.disabled_at IS NULL" : "TRUE"})
        ORDER BY u.id`,
      t.role
    );
    out.inconsistent.push(...orphans.map((r) => ({ kind: `${t.role} user without a live ${t.table} row`, id: r.id, role: r.role })));

    if (weakPasswords) {
      const rows = await tx.$queryRawUnsafe(`SELECT id, password FROM ${t.table} WHERE ${liveWhere} AND password IS NOT NULL`);
      hashes.push(...rows.map((r) => ({ source: t.table, id: r.id, hash: r.password })));
    }
  }
  if (weakPasswords) {
    const rows = await tx.$queryRawUnsafe("SELECT id, password FROM users WHERE role::text IN ('VENDOR', 'DR') AND password IS NOT NULL");
    hashes.push(...rows.map((r) => ({ source: "users", id: r.id, hash: r.password })));
  }
  return { out, hashes };
}

// bcrypt is case-sensitive while the deny-list is stored lowercase, so mixed-case defaults are listed explicitly
const KNOWN_DEFAULTS = [...new Set([
  ...PASSWORD_DENY_LIST,
  "vendorA123", "vendorB123", "vendorC123", "Vendor123", "Dr123", "DR123", "Admin123", "Admin@123", "Vendor@123",
  "Password", "Password1", "Password123", "Password@123", "Buildcity123", "BuildCity123", "Buildcity@123", "BuildCity@123",
])];

async function findWeak(hashes) {
  const weak = { users: [], vendors: [], district_representatives: [] };
  for (const h of hashes) {
    for (const pw of KNOWN_DEFAULTS) {
      // Sequential on purpose: bcrypt is CPU heavy and this must not starve a shared host
      if (await bcrypt.compare(pw, h.hash).catch(() => false)) {
        weak[h.source].push(h.id);
        break;
      }
    }
  }
  return {
    counts: Object.fromEntries(Object.entries(weak).map(([k, v]) => [k, v.length])),
    ids: weak,
  };
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is required");
    process.exit(1);
  }
  const weakPasswords = process.argv.includes("--weak-passwords");
  const prisma = new PrismaClient();
  try {
    const { out, hashes } = await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe("SET TRANSACTION READ ONLY");
      return report(tx, { weakPasswords });
    }, { timeout: 120000, maxWait: 10000 });
    if (weakPasswords) out.weakPasswords = await findWeak(hashes);
    out.summary = {
      liveVendors: out.vendors.liveRows,
      liveDrs: out.drs.liveRows,
      vendorDuplicateGroups: out.vendors.duplicateGroups.length,
      drDuplicateGroups: out.drs.duplicateGroups.length,
      vendorNormalizedDuplicateGroups: out.vendors.normalizedDuplicateGroups.length,
      drNormalizedDuplicateGroups: out.drs.normalizedDuplicateGroups.length,
      invalidPhones: out.invalidPhones.length,
      inconsistent: out.inconsistent.length,
      ...(weakPasswords ? { weakPasswords: out.weakPasswords.counts } : {}),
      uniqueIndexWillBuild: { vendors: out.vendors.duplicateGroups.length === 0, drs: out.drs.duplicateGroups.length === 0 },
    };
    process.stdout.write(JSON.stringify(out, null, 2) + "\n");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error("staff-phone-report failed:", String((e && e.message) || e).replace(/\s+/g, " ").trim());
  process.exit(1);
});
