// The database environment marker, read ONLY from the catalog row set by ALTER DATABASE <db> SET buildcity.env = '<env>'.
// current_setting() returns the session GUC instead: ?options=-c, PGOPTIONS, ALTER ROLE ... SET and server-level
// settings all override it, so it must never satisfy a guard. Errors propagate: callers refuse, never fall back.
"use strict";

const MARKER_SQL = `SELECT (SELECT substr(s, 15) FROM pg_db_role_setting r CROSS JOIN LATERAL unnest(r.setconfig) s
        WHERE r.setdatabase = (SELECT oid FROM pg_database WHERE datname = current_database())
          AND r.setrole = 0 AND s LIKE 'buildcity.env=%' LIMIT 1) AS env`;

async function readDbMarker(prisma) {
  const rows = await prisma.$queryRawUnsafe(MARKER_SQL);
  return (rows && rows[0] && rows[0].env) || null;
}

module.exports = { MARKER_SQL, readDbMarker };
