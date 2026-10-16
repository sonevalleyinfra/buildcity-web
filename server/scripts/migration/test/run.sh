#!/usr/bin/env bash
# Shim-based tests for dump.sh / restore.sh. No network, no real DB.
set -uo pipefail
mig="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
t="$(mktemp -d)"; trap 'rm -rf "$t"' EXIT
mkdir -p "$t/bin" "$t/work"
SECRET=$(printf '%s' 'S3cret' 'DummyPw')  # dummy sentinel, assembled so secret scanners don't flag it
URL="postgresql://user:$SECRET@db.example.com:5432/app?sslmode=require&pgbouncer=true&connection_limit=1"
DST="postgresql://user:$SECRET@db2.example.com:5432/app"
export SHIM_LOG="$t/shim.log"

for c in pg_dump pg_restore psql; do
  cat >"$t/bin/$c" <<'SH'
#!/usr/bin/env bash
name="$(basename "$0")"
printf '%s PGPASSWORD=%s PGHOST=%s PGDATABASE=%s PGSSLMODE=%s ARGS:' "$name" "${PGPASSWORD:+set}" "${PGHOST:-}" "${PGDATABASE:-}" "${PGSSLMODE:-}" >>"$SHIM_LOG"
printf ' %q' "$@" >>"$SHIM_LOG"; echo >>"$SHIM_LOG"
case "$name:$*" in
  pg_dump:--version) echo "pg_dump (PostgreSQL) ${SHIM_PGDUMP_MAJOR:-16}.4" ;;
  pg_dump:*) echo FAKEDUMP ;;
  psql:*server_version_num*) echo 160004 ;;
  psql:*count*) echo "${SHIM_TABLES:-0}" ;;
  pg_restore:-l*) printf '1; 2615 2200 SCHEMA - public owner\n2; 1259 1 TABLE public users owner\n' ;;
esac
for a in "$@"; do case "$a" in --use-list=*) cp "${a#--use-list=}" "$SHIM_LOG.list" ;; esac; done
exit 0
SH
  chmod +x "$t/bin/$c"
done
export PATH="$t/bin:$PATH"
unset PG_DUMP PG_RESTORE PSQL SOURCE_DATABASE_URL TARGET_DATABASE_URL

pass=0; fail=0
ok() { pass=$((pass + 1)); echo "ok   - $1"; }
ko() { fail=$((fail + 1)); echo "FAIL - $1"; }
check() { if eval "$2"; then ok "$1"; else ko "$1"; fi; }
# run <name> <cmd...>: captures stdout/stderr/exit into $t/out/<name>.*
mkdir -p "$t/out"
run() {
  local n="$1"; shift
  (cd "$t/work" && "$@") >"$t/out/$n.out" 2>"$t/out/$n.err" </dev/null
  echo $? >"$t/out/$n.rc"
}
rc() { cat "$t/out/$1.rc"; }
err_has() { grep -q -- "$2" "$t/out/$1.err"; }
shim_calls() { grep -c "^$1 " "$SHIM_LOG" 2>/dev/null || true; }

# dump happy path
: >"$SHIM_LOG"
run dump env SOURCE_DATABASE_URL="$URL" bash "$mig/dump.sh" a.dump
check "dump exits 0" '[ "$(rc dump)" = 0 ]'
check "dump writes stdout of pg_dump to file" 'grep -q FAKEDUMP "$t/work/a.dump"'
check "dump passes PG env (host, db, sslmode)" 'grep -q "^pg_dump PGPASSWORD=set PGHOST=db.example.com PGDATABASE=app PGSSLMODE=require ARGS: --no-owner" "$SHIM_LOG"'
check "dump strips prisma params" '! grep -q -e pgbouncer -e connection_limit "$SHIM_LOG" "$t/out/dump.err"'
check "dump refuses URL in argv" '! (cd "$t/work" && SOURCE_DATABASE_URL= bash "$mig/dump.sh" b.dump x >/dev/null 2>&1)'

# pg_dump too old
: >"$SHIM_LOG"
run old env SOURCE_DATABASE_URL="$URL" SHIM_PGDUMP_MAJOR=14 bash "$mig/dump.sh" old.dump
check "old pg_dump exits non-zero" '[ "$(rc old)" != 0 ]'
check "old pg_dump message names both majors" 'err_has old "pg_dump major 14 is older than source server major 16"'
check "old pg_dump never dumps" '! grep "^pg_dump " "$SHIM_LOG" | grep -vq -- "--version"'
check "old pg_dump leaves no file" '[ ! -e "$t/work/old.dump" ] && [ ! -e "$t/work/old.dump.partial" ]'

# restore --yes into empty target
: >"$SHIM_LOG"
run restore env TARGET_DATABASE_URL="$DST" SOURCE_DATABASE_URL="$URL" bash "$mig/restore.sh" --yes a.dump
check "restore --yes exits 0" '[ "$(rc restore)" = 0 ]'
check "restore calls pg_restore with db name only" 'grep -q "^pg_restore PGPASSWORD=set PGHOST=db2.example.com PGDATABASE=app .*--dbname=app a.dump" "$SHIM_LOG"'
check "restore list skips CREATE SCHEMA public" '! grep -q "SCHEMA - public" "$SHIM_LOG.list" && grep -q "TABLE public users" "$SHIM_LOG.list"'
check "restore removes its list file" '! ls "$t/work" | grep -q list'

# restore non-interactive with existing tables and no --yes
: >"$SHIM_LOG"
run busy env TARGET_DATABASE_URL="$DST" SHIM_TABLES=3 bash "$mig/restore.sh" a.dump
check "existing tables without --yes fails" '[ "$(rc busy)" != 0 ] && err_has busy "non-interactive"'
check "existing tables prints host and db" 'grep -q "Target db2.example.com:5432 database '"'"'app'"'"'" "$t/out/busy.out"'
check "existing tables never restores" '[ "$(shim_calls pg_restore)" = 0 ]'

# Supabase refusals, even with --yes --clean
for h in db.abcd.supabase.co aws-0-eu-west-1.pooler.supabase.com; do
  : >"$SHIM_LOG"
  run supa env TARGET_DATABASE_URL="postgresql://postgres:$SECRET@$h:5432/postgres" bash "$mig/restore.sh" --yes --clean a.dump
  check "refuses Supabase target $h (exit 2)" '[ "$(rc supa)" = 2 ] && err_has supa "refusing to restore into a Supabase host"'
  check "Supabase refusal calls no client ($h)" '[ ! -s "$SHIM_LOG" ]'
done

# SOURCE == TARGET refusal (different user/password/params, same host/port/db)
: >"$SHIM_LOG"
run same env SOURCE_DATABASE_URL="$URL" TARGET_DATABASE_URL="postgresql://other:pw@DB.example.com/app" bash "$mig/restore.sh" --yes a.dump
check "refuses target == source (exit 2)" '[ "$(rc same)" = 2 ] && err_has same "same host/port/database as SOURCE_DATABASE_URL"'
check "same-target refusal calls no client" '[ ! -s "$SHIM_LOG" ]'

# Secret never leaks: outputs, shim logs, written files
check "password never in output, argv logs or files" '! grep -rqF "$SECRET" "$t"'

echo "# $pass passed, $fail failed"
[ "$fail" = 0 ]
