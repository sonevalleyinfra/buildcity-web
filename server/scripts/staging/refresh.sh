#!/usr/bin/env bash
# Refresh the staging database from an anonymised copy of production (ADR 0002 section 4).
#
#   SOURCE_DATABASE_URL=...   production DB, read-only (dump only)
#   STAGING_DATABASE_URL=...  staging Postgres server; the database name in it is ignored
#   E2E_VENDOR_PASSWORD, E2E_DR_PASSWORD, E2E_ADMIN_PASSWORD   staging-only test passwords
#   STAGING_API_STOP / STAGING_API_START   commands that stop / start buildcity-api-staging
#   optional: PROD_DB_HOSTS (comma list of extra prod host names/IPs to refuse), PG_DUMP, PG_RESTORE,
#             PSQL (docker wrappers, see ../migration/README.md; PSQL needs -i), REFRESH_WORKDIR, SEED_NODE
#
# Steps: dump prod -> new DB buildcity_staging_tmp (marker staging) -> restore -> anonymise.sql ->
# verify-anon.sql -> seed -> stop API, swap, start API. Any failure before the swap drops the tmp DB and
# leaves the current staging DB untouched. There is no script in the staging -> production direction.
# The real guard is the buildcity.env database markers: the source must be marked production and no database
# on the staging server may be. Exit 2 = refused before touching anything (no dump, create, drop, rename or
# API stop); exit 1 = any failure after that, psql errors included; a signal keeps its own code.
set -euo pipefail
umask 077   # the dump holds the whole prod DB: owner-only
here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
mig="$here/../migration"
server="$(cd "$here/../.." && pwd)"
# shellcheck source=../migration/_lib.sh
. "$mig/_lib.sh"

TMP_DB=buildcity_staging_tmp
LIVE_DB=buildcity_staging
OLD_DB=buildcity_staging_old

refuse() { echo "refused: $*" >&2; exit 2; }
fail() { echo "error: $*" >&2; exit 1; }

[ $# -eq 0 ] || { echo "usage: SOURCE_DATABASE_URL=... STAGING_DATABASE_URL=... E2E_*_PASSWORD=... $0" >&2; exit 2; }
for v in SOURCE_DATABASE_URL STAGING_DATABASE_URL E2E_VENDOR_PASSWORD E2E_DR_PASSWORD E2E_ADMIN_PASSWORD \
         STAGING_API_STOP STAGING_API_START; do
  [ -n "${!v:-}" ] || refuse "$v is not set"
done

read -r -a psql <<<"${PSQL:-psql}"
read -r -a api_stop <<<"$STAGING_API_STOP"; read -r -a api_start <<<"$STAGING_API_START"
read -r -a seed_node <<<"${SEED_NODE:-node}"
need python3; need "${psql[0]}"; need "${seed_node[0]}"

# --- helpers: URLs only travel in variables and libpq env vars, never argv ---
with_db() { U="$1" D="$2" python3 -c 'import os; from urllib.parse import urlsplit, urlunsplit, quote; u = urlsplit(os.environ["U"]); print(urlunsplit(u._replace(path="/" + quote(os.environ["D"]))))'; }
host_port() { (load_pg_env "$1"; echo "$(printf '%s' "$PGHOST" | tr 'A-Z' 'a-z' | sed 's/\.$//'):$PGPORT"); }
psql_url() { local u="$1"; shift; (load_pg_env "$u"; "${psql[@]}" -X -Atq -v ON_ERROR_STOP=1 "$@") || return 1; }

src_hp="$(host_port "$SOURCE_DATABASE_URL")" || exit 2
tgt_hp="$(host_port "$STAGING_DATABASE_URL")" || exit 2
src_host="${src_hp%:*}"; tgt_host="${tgt_hp%:*}"
tmp_url="$(with_db "$STAGING_DATABASE_URL" "$TMP_DB")"
maint_url="$(with_db "$STAGING_DATABASE_URL" postgres)"

# --- refusals (before any connection) ---
[ "$src_hp" != "$tgt_hp" ] || refuse "the staging server is the same host:port as the source"
deny="buildcity-db,${PROD_DB_HOSTS:-}"
IFS=',' read -r -a denied <<<"$deny"
for d in "${denied[@]}"; do
  d="$(printf '%s' "$d" | tr 'A-Z' 'a-z' | sed 's/\.$//; s/^ *//; s/ *$//')"
  [ -n "$d" ] || continue
  case "$tgt_host" in "$d"|"$d".*) refuse "the staging host matches a production host name or IP ($d)" ;; esac
done
guard_target "$tmp_url" "$SOURCE_DATABASE_URL"

# --- refusals that need the staging server ---
msql() { psql_url "$maint_url" "$@"; }
sysid() { psql_url "$1" -c 'select system_identifier from pg_control_system()'; }
src_id="$(sysid "$SOURCE_DATABASE_URL")" || refuse "could not identify the source server"
tgt_id="$(sysid "$maint_url")" || refuse "could not identify the staging server"
[ -n "$src_id" ] && [ -n "$tgt_id" ] || refuse "could not identify the servers"
[ "$src_id" != "$tgt_id" ] || refuse "the staging server is the same Postgres server as the source"

# Marker guard: no database on the staging server may be marked production (any role, any database, any case),
# and the source must be. A query that fails refuses: never fail open.
prod_dbs="$(msql -c "select coalesce(string_agg(distinct coalesce(d.datname, '(all databases)'), ',' order by coalesce(d.datname, '(all databases)')), '') from pg_db_role_setting r cross join unnest(r.setconfig) s left join pg_database d on d.oid = r.setdatabase where lower(s) = 'buildcity.env=production'")" \
  || refuse "could not read database markers on the staging server"
[ -z "$prod_dbs" ] || refuse "the staging server has a database marked production ($prod_dbs); refusing"
src_marker="$(psql_url "$SOURCE_DATABASE_URL" -c "select coalesce((select substr(s, 15) from pg_db_role_setting r cross join unnest(r.setconfig) s where r.setdatabase = (select oid from pg_database where datname = current_database()) and r.setrole = 0 and s like 'buildcity.env=%' limit 1), '')")" \
  || refuse "could not read the source marker"
[ "$src_marker" = production ] || refuse "the source database is marked '${src_marker:-none}', expected production (are the URLs swapped?)"

on_err=refuse   # a failed catalog query refuses here, and fails once anything has been touched
db_exists() {   # 0 = exists, 1 = absent
  local n; n="$(msql -c "select count(*) from pg_database where datname = '$1'")" || n=error
  case "$n" in 1) return 0 ;; 0) return 1 ;; *) "$on_err" "could not check whether $1 exists" ;; esac
}
db_marker() { msql -c "select coalesce((select substr(s, 15) from pg_db_role_setting r cross join unnest(r.setconfig) s where r.setdatabase = d.oid and r.setrole = 0 and s like 'buildcity.env=%' limit 1), '') from pg_database d where d.datname = '$1'"; }
check_marker() {   # any existing database we may drop or replace must not be production
  db_exists "$1" || return 0
  local m; m="$(db_marker "$1")" || refuse "could not read the marker of $1"
  case "$m" in staging|"") ;; *) refuse "database $1 has marker '$m' (production?); only staging or unmarked may be replaced" ;; esac
}
for d in "$LIVE_DB" "$TMP_DB" "$OLD_DB"; do check_marker "$d"; done
if db_exists "$OLD_DB" && ! db_exists "$LIVE_DB"; then
  refuse "$OLD_DB exists but $LIVE_DB does not (a previous run stranded it); rename it back by hand: ALTER DATABASE $OLD_DB RENAME TO $LIVE_DB"
fi
on_err=fail

# --- run state and cleanup ---
workdir="$(mktemp -d "${REFRESH_WORKDIR:-$PWD}/refresh.XXXXXX")"
dump="$workdir/prod.dump"
tmp_exists=0; api_stopped=0; aside=0; swapped=0; finished=0
cleanup() {
  local rc=$?
  trap - EXIT
  rm -f "$dump" "$dump".list.* 2>/dev/null || true
  rmdir "$workdir" 2>/dev/null || true
  if [ "$finished" != 1 ]; then
    if [ "$swapped" = 0 ]; then
      local stranded=0
      if [ "$aside" = 1 ]; then msql -c "ALTER DATABASE $OLD_DB RENAME TO $LIVE_DB" >/dev/null 2>&1 || stranded=1; fi
      [ "$tmp_exists" = 1 ] && msql -c "DROP DATABASE IF EXISTS $TMP_DB WITH (FORCE)" >/dev/null 2>&1 || true
      if [ "$stranded" = 1 ]; then
        echo "refresh failed and $OLD_DB could not be renamed back: the previous staging data is in $OLD_DB, $LIVE_DB does not exist, the staging API was NOT restarted. Fix by hand: ALTER DATABASE $OLD_DB RENAME TO $LIVE_DB" >&2
      else
        if [ "$api_stopped" = 1 ] && ! "${api_start[@]}" >/dev/null 2>&1; then
          echo "warning: the staging API could not be restarted; start it by hand" >&2
        fi
        echo "refresh failed; the previous staging database is untouched" >&2
      fi
    else
      echo "refresh failed after the swap: $LIVE_DB is the new database, the API was NOT restarted, the old one is kept as $OLD_DB" >&2
    fi
  fi
  exit "$rc"
}
trap cleanup EXIT

# 1. dump (read-only on prod)
echo "[1/6] dumping production"
bash "$mig/dump.sh" "$dump" || fail "dump failed"

# 2. new temp DB with the staging marker, then restore
echo "[2/6] restoring into $TMP_DB"
if db_exists "$TMP_DB"; then msql -c "DROP DATABASE $TMP_DB WITH (FORCE)"; fi
tmp_exists=1
msql -c "CREATE DATABASE $TMP_DB"
msql -c "ALTER DATABASE $TMP_DB SET buildcity.env = 'staging'"
[ "$(db_marker "$TMP_DB")" = staging ] || fail "could not mark $TMP_DB as staging"
TARGET_DATABASE_URL="$tmp_url" SOURCE_DATABASE_URL="$SOURCE_DATABASE_URL" bash "$mig/restore.sh" --yes "$dump" || fail "restore failed"
rm -f "$dump"   # the raw dump is not needed past this point

# 3-4. anonymise (one transaction) and verify
echo "[3/6] anonymising"
psql_url "$tmp_url" -f - <"$here/anonymise.sql" >/dev/null || fail "anonymise.sql failed"
echo "[4/6] verifying"
psql_url "$tmp_url" -f - <"$here/verify-anon.sql" >/dev/null || fail "verify-anon.sql failed; staging not changed"

# 5. seed the E2E accounts
echo "[5/6] seeding test accounts"
( cd "$server" && env -u APP_ENV DATABASE_URL="$tmp_url" "${seed_node[@]}" scripts/staging/seed-test-accounts.js ) || fail "seed failed"

# 6. swap: the old database is renamed aside first and dropped only after the new one is live
echo "[6/6] swapping (stopping the staging API)"
api_stopped=1   # set first: a stop that half-failed still gets a restart attempt
"${api_stop[@]}" || fail "stopping the staging API failed"
for d in "$LIVE_DB" "$TMP_DB" "$OLD_DB"; do
  if db_exists "$d"; then msql -c "select pg_terminate_backend(pid) from pg_stat_activity where datname = '$d' and pid <> pg_backend_pid()" >/dev/null; fi
done
if db_exists "$OLD_DB"; then msql -c "DROP DATABASE $OLD_DB WITH (FORCE)"; fi
if db_exists "$LIVE_DB"; then msql -c "ALTER DATABASE $LIVE_DB RENAME TO $OLD_DB"; aside=1; fi
msql -c "ALTER DATABASE $TMP_DB RENAME TO $LIVE_DB"; swapped=1; tmp_exists=0
msql -c "ALTER DATABASE $LIVE_DB SET buildcity.env = 'staging'"
live_url="$(with_db "$STAGING_DATABASE_URL" "$LIVE_DB")"
marker="$(psql_url "$live_url" -c "select coalesce((select substr(s, 15) from pg_db_role_setting r cross join unnest(r.setconfig) s where r.setdatabase = (select oid from pg_database where datname = current_database()) and r.setrole = 0 and s like 'buildcity.env=%' limit 1), '')")" || fail "could not read the marker of $LIVE_DB"
[ "$marker" = staging ] || fail "$LIVE_DB marker reads '${marker:-none}', expected staging"
"${api_start[@]}" || fail "starting the staging API failed"
finished=1
if db_exists "$OLD_DB"; then msql -c "DROP DATABASE $OLD_DB WITH (FORCE)" || echo "warning: could not drop $OLD_DB; drop it by hand" >&2; fi
echo "Done: $LIVE_DB refreshed (marker staging) and the staging API started. The dump is deleted."
