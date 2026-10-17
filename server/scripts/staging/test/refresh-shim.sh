#!/usr/bin/env bash
# Shim-based refusal tests for refresh.sh. No network, no real DB: pg_dump / pg_restore / psql are stubs
# that log their calls. Every refusal must exit 2 before dump, create or drop anything.
set -uo pipefail
stg="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
t="$(mktemp -d)"; trap 'rm -rf "$t"' EXIT
mkdir -p "$t/bin" "$t/work" "$t/out"
PW=$(printf '%s' 'Dummy' 'Pw1')   # dummy sentinel, assembled so secret scanners don't flag it
SRC="postgresql://user:$PW@prod.example.com:5432/app"
STG="postgresql://user:$PW@stg.example.com:5432/postgres"
export SHIM_LOG="$t/shim.log"

for c in pg_dump pg_restore psql; do
  cat >"$t/bin/$c" <<'SH'
#!/usr/bin/env bash
name="$(basename "$0")"
printf '%s PGHOST=%s PGPORT=%s ARGS:' "$name" "${PGHOST:-}" "${PGPORT:-}" >>"$SHIM_LOG"
printf ' %q' "$@" >>"$SHIM_LOG"; echo >>"$SHIM_LOG"
if [ -n "${SHIM_FAIL_ON:-}" ]; then case "$*" in *"$SHIM_FAIL_ON"*) exit 2 ;; esac; fi   # connection lost
case "$name:$*" in
  pg_dump:--version) echo "pg_dump (PostgreSQL) 17.4" ;;
  psql:*server_version_num*) echo 170004 ;;
  psql:*system_identifier*) echo "${SHIM_SYSID:-id-$PGHOST-$PGPORT}" ;;
  psql:*"buildcity.env=production"*) echo "${SHIM_SERVER_PROD-}" ;;
  psql:*"current_database()"*) echo "${SHIM_SRC_MARKER-production}" ;;
  psql:*"count(*) from pg_database where datname = 'buildcity_staging'"*) echo "${SHIM_EXISTS_LIVE:-${SHIM_EXISTS:-1}}" ;;
  psql:*"count(*) from pg_database where datname = 'buildcity_staging_old'"*) echo "${SHIM_EXISTS_OLD:-${SHIM_EXISTS:-1}}" ;;
  psql:*"count(*) from pg_database"*) echo "${SHIM_EXISTS:-1}" ;;
  psql:*"d.datname = 'buildcity_staging'"*) echo "${SHIM_MARKER_LIVE-staging}" ;;
  psql:*"d.datname = 'buildcity_staging_tmp'"*) echo "${SHIM_MARKER_TMP-}" ;;
  psql:*"d.datname = 'buildcity_staging_old'"*) echo "${SHIM_MARKER_OLD-}" ;;
esac
exit 0
SH
  chmod +x "$t/bin/$c"
done
cat >"$t/bin/node" <<'SH'
#!/usr/bin/env bash
echo "node $*" >>"$SHIM_LOG"
SH
chmod +x "$t/bin/node"
export PATH="$t/bin:$PATH"
unset PG_DUMP PG_RESTORE PSQL SOURCE_DATABASE_URL STAGING_DATABASE_URL PROD_DB_HOSTS APP_ENV

pass=0; fail=0
ok() { pass=$((pass + 1)); echo "ok   - $1"; }
ko() { fail=$((fail + 1)); echo "FAIL - $1"; }
check() { if eval "$2"; then ok "$1"; else ko "$1"; fi; }

base=(SOURCE_DATABASE_URL="$SRC" STAGING_DATABASE_URL="$STG" E2E_VENDOR_PASSWORD=DUMMYPASS-v E2E_DR_PASSWORD=DUMMYPASS-d
      E2E_ADMIN_PASSWORD=DUMMYPASS-a STAGING_API_STOP="echo stop" STAGING_API_START="echo start" REFRESH_WORKDIR="$t/work")
# refuse <name> <expected stderr fragment> [VAR=value ...]  (later assignments override the base ones)
refuse() {
  local n="$1" frag="$2"; shift 2
  : >"$SHIM_LOG"
  env "${base[@]}" "$@" bash "$stg/refresh.sh" >"$t/out/$n.out" 2>"$t/out/$n.err" </dev/null; local rc=$?
  check "$n: exit 2" '[ $rc -eq 2 ]'
  check "$n: says why" 'grep -q -- "$frag" "$t/out/$n.err"'
  check "$n: no dump, restore, create, drop, rename or stop" '! grep -q -E "^(pg_dump|pg_restore) |CREATE DATABASE|DROP DATABASE|RENAME TO" "$SHIM_LOG" && [ ! -e "$t/work/stopped" ]'
  check "$n: nothing left in the work dir" '[ -z "$(ls -A "$t/work")" ]'
  check "$n: no password or URL printed" '! grep -q -e "$PW" -e DUMMYPASS -e postgresql:// "$t/out/$n.out" "$t/out/$n.err"'
}

for v in E2E_VENDOR_PASSWORD E2E_DR_PASSWORD E2E_ADMIN_PASSWORD SOURCE_DATABASE_URL STAGING_DATABASE_URL STAGING_API_STOP STAGING_API_START; do
  refuse "missing $v" "$v is not set" "$v="
done
refuse "same host:port as source" "same host:port" STAGING_DATABASE_URL="postgresql://user:$PW@PROD.example.com.:5432/postgres"
refuse "service name buildcity-db" "production host name" STAGING_DATABASE_URL="postgresql://user:$PW@buildcity-db:5432/postgres"
refuse "service name buildcity-db.<suffix>" "production host name" STAGING_DATABASE_URL="postgresql://user:$PW@buildcity-db.internal:5432/postgres"
refuse "listed prod IP" "production host name" PROD_DB_HOSTS="10.0.0.9" STAGING_DATABASE_URL="postgresql://user:$PW@10.0.0.9:5433/postgres"
refuse "same Postgres server behind another name" "same Postgres server" SHIM_SYSID=same-server
refuse "live DB marked production" "marker 'production'" SHIM_MARKER_LIVE=production
refuse "leftover tmp DB marked production" "marker 'production'" SHIM_MARKER_TMP=production
refuse "unknown marker on live DB" "marker 'test'" SHIM_MARKER_LIVE=test
refuse "Supabase target" "Supabase" STAGING_DATABASE_URL="postgresql://user:$PW@db.abc.supabase.co:5432/postgres"
refuse "staging server has a production DB" "database marked production (buildcity)" SHIM_SERVER_PROD=buildcity
refuse "server marker query fails" "could not read database markers on the staging server" SHIM_FAIL_ON=buildcity.env=production
refuse "source marked staging (URLs swapped)" "marked 'staging', expected production (are the URLs swapped?)" SHIM_SRC_MARKER=staging
refuse "source unmarked" "marked 'none', expected production" SHIM_SRC_MARKER=
refuse "source marker query fails" "could not read the source marker" "SHIM_FAIL_ON=current_database()"
refuse "existence query fails (no fail-open)" "could not check whether" "SHIM_FAIL_ON=count(*) from pg_database"
refuse "stranded old DB" "buildcity_staging_old exists but buildcity_staging does not" SHIM_EXISTS_LIVE=0 SHIM_EXISTS_OLD=1

: >"$SHIM_LOG"
env "${base[@]}" bash "$stg/refresh.sh" extra >"$t/out/arg.out" 2>"$t/out/arg.err" </dev/null; rc=$?
check "extra argument: exit 2" '[ $rc -eq 2 ]'

# seed-test-accounts.js: refusals decided before any DB access
nr="$(PATH="${PATH#"$t/bin:"}" command -v node)"; node_real() { "$nr" "$@"; }
seed_rc() { node_real "$stg/seed-test-accounts.js" >/dev/null 2>&1; echo $?; }
check "seed: no E2E passwords -> exit 2" '[ "$(unset E2E_VENDOR_PASSWORD E2E_DR_PASSWORD E2E_ADMIN_PASSWORD; DATABASE_URL=postgresql://x@localhost/x seed_rc)" = 2 ]'
check "seed: no DATABASE_URL -> exit 2" '[ "$(unset DATABASE_URL; E2E_VENDOR_PASSWORD=a E2E_DR_PASSWORD=b E2E_ADMIN_PASSWORD=c seed_rc)" = 2 ]'
cat >"$t/decide.js" <<JS
const { decide } = require("$stg/seed-test-accounts.js");
const p = { E2E_VENDOR_PASSWORD: "a", E2E_DR_PASSWORD: "b", E2E_ADMIN_PASSWORD: "c" };
const cases = [
  ["marker production", { appEnv: undefined, marker: "production", databaseUrl: "postgresql://u@db.example.com/x", passwords: p }, false],
  ["marker production + APP_ENV=test on loopback", { appEnv: "test", marker: "production", databaseUrl: "postgresql://u@localhost/x", passwords: p }, false],
  ["unmarked, remote host", { appEnv: undefined, marker: null, databaseUrl: "postgresql://u@db.example.com/x", passwords: p }, false],
  ["unmarked, remote host, APP_ENV=test", { appEnv: "test", marker: null, databaseUrl: "postgresql://u@db.example.com/x", passwords: p }, false],
  ["unmarked, loopback, no APP_ENV", { appEnv: undefined, marker: null, databaseUrl: "postgresql://u@localhost/x", passwords: p }, false],
  ["APP_ENV=production, marker staging", { appEnv: "production", marker: "staging", databaseUrl: "postgresql://u@localhost/x", passwords: p }, false],
  ["marker staging", { appEnv: undefined, marker: "staging", databaseUrl: "postgresql://u@db.example.com/x", passwords: p }, true],
  ["APP_ENV=test, 127.0.0.1", { appEnv: "test", marker: null, databaseUrl: "postgresql://u@127.0.0.1:5432/x", passwords: p }, true],
  ["APP_ENV=test, localhost.evil.com", { appEnv: "test", marker: null, databaseUrl: "postgresql://u@localhost.evil.com/x", passwords: p }, false],
  ["missing password", { appEnv: "test", marker: "staging", databaseUrl: "postgresql://u@localhost/x", passwords: { ...p, E2E_DR_PASSWORD: "" } }, false],
];
let bad = 0;
for (const [n, i, want] of cases) { const r = decide(i); if (r.ok !== want) { bad++; console.log("FAIL - seed decide: " + n); } }
console.log(bad === 0 ? "ok" : "bad");
process.exit(bad === 0 ? 0 : 1);
JS
check "seed guard table (production, unmarked remote, APP_ENV=production, lookalike host, staging, test+loopback)" '[ "$(node_real "$t/decide.js")" = ok ]'

echo "passed=$pass failed=$fail"
[ "$fail" = 0 ]
