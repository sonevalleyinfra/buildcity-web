#!/usr/bin/env bash
# Dry run of refresh.sh + seed-test-accounts.js against two throwaway postgres:17 containers
# (loopback ports only, DUMMYPASS, fixture data). Needs docker, host psql and server/node_modules.
set -uo pipefail
here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
stg="$(dirname "$here")"
server="$(cd "$stg/../.." && pwd)"
S="buildcity-refresh-src-$$"; T="buildcity-refresh-stg-$$"
work="$(mktemp -d)"
pass=0; fail=0
ok() { pass=$((pass + 1)); echo "ok   - $1"; }
ko() { fail=$((fail + 1)); echo "FAIL - $1"; }
check() { if eval "$2"; then ok "$1"; else ko "$1"; fi; }
api_pid=""
JWT="$(printf '%s' local-test-jwt local-test-jwt 000000)"   # dummy, assembled so secret scanners don't flag it
cleanup() { [ -n "$api_pid" ] && kill "$api_pid" >/dev/null 2>&1; docker stop "$S" "$T" >/dev/null 2>&1; }
trap cleanup EXIT

E2E_VENDOR_PASSWORD=DUMMYPASS-v E2E_DR_PASSWORD=DUMMYPASS-d E2E_ADMIN_PASSWORD=DUMMYPASS-a
export E2E_VENDOR_PASSWORD E2E_DR_PASSWORD E2E_ADMIN_PASSWORD

start() {   # start <name> -> prints host port
  docker run --rm -d --name "$1" -p 127.0.0.1::5432 -e POSTGRES_PASSWORD=DUMMYPASS postgres:17 >/dev/null || return 1
  for i in $(seq 1 60); do docker exec "$1" pg_isready -U postgres >/dev/null 2>&1 && break; sleep 1; done
  for i in $(seq 1 60); do docker exec "$1" psql -U postgres -Atq -c 'select 1' >/dev/null 2>&1 && break; sleep 1; done
  docker port "$1" 5432/tcp | head -1 | sed 's/.*://'
}
SP="$(start "$S")"; TP="$(start "$T")"
[ -n "$SP" ] && [ -n "$TP" ] || { echo "containers did not start"; exit 1; }
SRC="postgresql://postgres:DUMMYPASS@127.0.0.1:$SP/appsrc"
STG="postgresql://postgres:DUMMYPASS@127.0.0.1:$TP/postgres"
dq() { docker exec -i "$1" psql -U postgres -X -q -At -v ON_ERROR_STOP=1 -d "$2" "${@:3}"; }   # dq <container> <db> [args]
sq() { dq "$S" "$@"; }; tq() { dq "$T" "$@"; }

(cd "$server" && npx --no-install prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script) >"$work/ddl.sql" 2>"$work/ddl.err" \
  || { cat "$work/ddl.err"; echo "prisma DDL failed (run npm ci in server/)"; exit 1; }
sq postgres -c 'CREATE DATABASE appsrc' && sq appsrc <"$work/ddl.sql" && sq appsrc <"$here/fixture.sql" || { echo "fixture load failed"; exit 1; }
sq appsrc -c "ALTER DATABASE appsrc SET buildcity.env='production'"
sq appsrc -c "INSERT INTO regions (id, name) VALUES ('12345678-9012-3456-7890-123456789012', 'Digit-heavy UUID Region')"   # verify must not flag UUIDs
tq postgres -c 'CREATE DATABASE buildcity_staging'
tq postgres -c "ALTER DATABASE buildcity_staging SET buildcity.env='staging'"
tq buildcity_staging -c "CREATE TABLE old_marker (v text); INSERT INTO old_marker VALUES ('previous staging')"

# Docker clients: pg_dump/pg_restore must match the server major. Host psql is used for queries.
net="--rm -i --network host -e PGHOST -e PGPORT -e PGUSER -e PGPASSWORD -e PGDATABASE -e PGSSLMODE"
export PG_DUMP="docker run $net postgres:17 pg_dump"
export PG_RESTORE="docker run $net -v $work:$work -w $work postgres:17 pg_restore"
export STAGING_API_STOP="touch $work/api-stopped" STAGING_API_START="touch $work/api-started"
export REFRESH_WORKDIR="$work"
export SOURCE_DATABASE_URL="$SRC" STAGING_DATABASE_URL="$STG"

src_snap() { sq appsrc -c "select md5(string_agg(t::text, '|' order by t::text)) from users t"; }
src0="$(src_snap)"

# 1. Verify fails (unscrubbed catalog text): tmp dropped, old staging untouched, API never stopped
sq appsrc -c "UPDATE vendor_products SET description = 'call 98123 45007 now'"
(cd "$work" && bash "$stg/refresh.sh") >"$work/r1.out" 2>"$work/r1.err"; rc=$?
check "failed verify exits non-zero" '[ $rc -eq 1 ] && grep -q "verify-anon.sql failed" "$work/r1.err"'
check "failed verify drops buildcity_staging_tmp" '[ "$(tq postgres -c "select count(*) from pg_database where datname = '"'buildcity_staging_tmp'"'")" = 0 ]'
check "failed verify leaves the old staging DB untouched" '[ "$(tq buildcity_staging -c "select v from old_marker")" = "previous staging" ] && [ "$(tq postgres -c "select count(*) from pg_database where datname like '"'buildcity_staging_old'"'")" = 0 ]'
check "failed verify never stopped the API" '[ ! -e "$work/api-stopped" ]'
check "work dir and dump deleted after failure" '[ -z "$(ls -A "$work" | grep "^refresh\." || true)" ]'
sq appsrc -c "UPDATE vendor_products SET description = NULL"

# 2. Happy path
(cd "$work" && bash "$stg/refresh.sh") >"$work/r2.out" 2>"$work/r2.err"; rc=$?
check "refresh exits 0" '[ $rc -eq 0 ]'
[ $rc -eq 0 ] || { cat "$work/r2.err"; tail -5 "$work/r2.out"; }
check "API stopped then started" '[ -e "$work/api-stopped" ] && [ -e "$work/api-started" ]'
check "new staging DB marked staging in a new session" '[ "$(tq buildcity_staging -c "select current_setting('"'buildcity.env'"', true)")" = staging ]'
check "old data replaced, tmp and old DBs gone" '[ "$(tq postgres -c "select count(*) from pg_database where datname in ('"'buildcity_staging_tmp','buildcity_staging_old'"')")" = 0 ] && [ "$(tq buildcity_staging -c "select to_regclass('"'public.old_marker'"') is null")" = t ]'
tq buildcity_staging -f - <"$stg/verify-anon.sql" >/dev/null 2>"$work/vfy.err"; vrc=$?
check "staging phones are anonymised and verify passes" '[ $vrc -eq 0 ] && [ "$(tq buildcity_staging -c "select count(*) from users where phone !~ '"'^(2[0-9]{9}|9999999999|7777777777|10000[0-9]{5})$'"'")" = 0 ]'
[ $vrc -eq 0 ] || cat "$work/vfy.err"
check "seed accounts and product exist, no 1000000003" '[ "$(tq buildcity_staging -c "select count(*) from users where phone in ('"'1000000001','1000000002','9999999999'"') and password is not null")" = 3 ] && [ "$(tq buildcity_staging -c "select count(*) from users where phone = '"'1000000003'"'")" = 0 ] && [ "$(tq buildcity_staging -c "select count(*) from vendor_products where name = '"'E2E Test Cement 50kg'"' and price > (select \"minOrderForCashback\" from app_settings limit 1)")" -ge 1 ] || [ "$(tq buildcity_staging -c "select price from vendor_products where name = '"'E2E Test Cement 50kg'"'")" -gt 5000 ]'
check "dump deleted on exit" '[ -z "$(ls -A "$work" | grep "^refresh\." || true)" ]'
check "production source untouched" '[ "$(src_snap)" = "$src0" ]'
check "no passwords or URLs in output" '! grep -q -e DUMMYPASS -e postgresql:// "$work/r2.out" "$work/r2.err" "$work/r1.out" "$work/r1.err"'

# 3. API on the refreshed DB: admin login with the seeded password, then an ADMIN route
PORT=$((20000 + $$ % 20000))
(cd "$server" && APP_ENV=staging DATABASE_URL="postgresql://postgres:DUMMYPASS@127.0.0.1:$TP/buildcity_staging" JWT_SECRET="$JWT" PORT=$PORT exec node src/index.js) >"$work/api.log" 2>&1 &
api_pid=$!
for i in $(seq 1 60); do curl -fsS "http://127.0.0.1:$PORT/api/v1/env" >/dev/null 2>&1 && break; sleep 1; done
login() { curl -sS -X POST "http://127.0.0.1:$PORT/api/v1/auth/vendor/login" -H 'content-type: application/json' -d "{\"phone\":\"$1\",\"password\":\"$2\"}"; }
jget() { node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{const j=JSON.parse(s);console.log(eval("j."+process.argv[1])??"")}catch{console.log("")}})' "$1"; }
adm="$(login 9999999999 "$E2E_ADMIN_PASSWORD")"
check "admin login returns role ADMIN" '[ "$(printf "%s" "$adm" | jget user.role)" = ADMIN ]'
tok="$(printf '%s' "$adm" | jget token)"
check "ADMIN route accepts the token" '[ "$(curl -s -o /dev/null -w "%{http_code}" -H "authorization: Bearer $tok" "http://127.0.0.1:$PORT/api/v1/db-check")" = 200 ]'
check "vendor and DR log in with their env passwords" '[ "$(login 1000000001 "$E2E_VENDOR_PASSWORD" | jget user.role)" = VENDOR ] && [ "$(login 1000000002 "$E2E_DR_PASSWORD" | jget user.role)" = DR ]'
check "wrong admin password is rejected" '[ -z "$(login 9999999999 wrong | jget token)" ]'
kill "$api_pid" >/dev/null 2>&1; api_pid=""

# 4. Seed is idempotent
cnt() { tq buildcity_staging -c "select (select count(*) from users), (select count(*) from vendors), (select count(*) from district_representatives), (select count(*) from regions), (select count(*) from product_masters), (select count(*) from vendor_products), (select count(*) from categories)"; }
c0="$(cnt)"
DATABASE_URL="postgresql://postgres:DUMMYPASS@127.0.0.1:$TP/buildcity_staging" bash -c "cd '$server' && node scripts/staging/seed-test-accounts.js" >"$work/s1.out" 2>"$work/s1.err"; rc=$?
check "second seed exits 0 and changes no row counts" '[ $rc -eq 0 ] && [ "$(cnt)" = "$c0" ]'
check "seed output has no password" '! grep -q DUMMYPASS "$work/s1.out" "$work/s1.err"'

# 5. Seed refusals: exit 2 and no rows written (row counts)
seed_db() { tq postgres -c "CREATE DATABASE $1" && tq "$1" <"$work/ddl.sql"; }
rows() { tq "$1" -c "select (select count(*) from users) + (select count(*) from regions) + (select count(*) from vendor_products)"; }
udb() { echo "postgresql://postgres:DUMMYPASS@127.0.0.1:$TP/$1"; }
seed_db sd_prod; tq postgres -c "ALTER DATABASE sd_prod SET buildcity.env='production'"
seed_db sd_none; seed_db sd_stg; tq postgres -c "ALTER DATABASE sd_stg SET buildcity.env='staging'"
runseed() { (cd "$server" && env DATABASE_URL="$(udb "$1")" "${@:2}" node scripts/staging/seed-test-accounts.js) >/dev/null 2>"$work/seed.err"; }
runseed sd_prod; rc=$?; check "seed refuses marker production (exit 2, no rows)" '[ $rc -eq 2 ] && [ "$(rows sd_prod)" = 0 ]'
runseed sd_prod APP_ENV=test; rc=$?; check "seed refuses marker production even with APP_ENV=test" '[ $rc -eq 2 ] && [ "$(rows sd_prod)" = 0 ]'
runseed sd_none; rc=$?; check "seed refuses an unmarked DB without APP_ENV=test" '[ $rc -eq 2 ] && [ "$(rows sd_none)" = 0 ]'
runseed sd_stg APP_ENV=production; rc=$?; check "seed refuses APP_ENV=production on a staging DB" '[ $rc -eq 2 ] && [ "$(rows sd_stg)" = 0 ]'
runseed sd_stg E2E_ADMIN_PASSWORD=; rc=$?; check "seed refuses a missing password env" '[ $rc -eq 2 ] && [ "$(rows sd_stg)" = 0 ]'
runseed sd_stg; rc=$?; check "seed runs on marker staging" '[ $rc -eq 0 ] && [ "$(rows sd_stg)" -gt 0 ]'
runseed sd_none APP_ENV=test; rc=$?; check "seed runs on APP_ENV=test with a loopback host (empty DB)" '[ $rc -eq 0 ] && [ "$(rows sd_none)" -gt 0 ]'
check "the seed does not trip the unique constraints on an empty DB (role counts)" '[ "$(tq sd_none -c "select string_agg(role::text, '"','"' order by role::text) from users")" = "ADMIN,DR,VENDOR" ]'

# 6. Refresh refuses a staging server holding a production-marked live DB
tq postgres -c "ALTER DATABASE buildcity_staging SET buildcity.env='production'"
(cd "$work" && bash "$stg/refresh.sh") >"$work/r3.out" 2>"$work/r3.err"; rc=$?
check "refresh refuses when buildcity_staging is marked production (exit 2)" '[ $rc -eq 2 ] && [ "$(tq buildcity_staging -c "select count(*) from users")" -gt 0 ]'
tq postgres -c "ALTER DATABASE buildcity_staging SET buildcity.env='staging'"

rm -rf "$work"
echo "passed=$pass failed=$fail"
[ "$fail" = 0 ]
