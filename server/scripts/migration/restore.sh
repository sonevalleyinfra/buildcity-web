#!/usr/bin/env bash
# Restore a dump made by dump.sh into the target DB.
# Usage: TARGET_DATABASE_URL=... ./restore.sh [--clean] [--yes] <input.dump>
#   --clean  drop existing objects first (pg_restore --clean --if-exists). Destructive.
#   --yes    skip the typed confirmation (only asked when the target has existing tables)
# Refuses Supabase targets, and a target equal to SOURCE_DATABASE_URL when that is set.
set -euo pipefail
here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=_lib.sh
. "$here/_lib.sh"

clean=0; yes=0; file=""
for a in "$@"; do
  case "$a" in
    --clean) clean=1 ;;
    --yes) yes=1 ;;
    -*) echo "error: unknown flag $a" >&2; exit 2 ;;
    *) file="$a" ;;
  esac
done
[ -n "$file" ] || { echo "usage: TARGET_DATABASE_URL=... $0 [--clean] [--yes] <input.dump>" >&2; exit 2; }
[ -f "$file" ] || { echo "error: $file not found" >&2; exit 2; }
[ -n "${TARGET_DATABASE_URL:-}" ] || { echo "error: TARGET_DATABASE_URL not set" >&2; exit 2; }

# Word-split so wrappers work, e.g. PG_RESTORE='docker run ... postgres:17 pg_restore'.
read -r -a pg_restore <<<"${PG_RESTORE:-pg_restore}"; read -r -a psql <<<"${PSQL:-psql}"
need python3; need "${pg_restore[0]}"; need "${psql[0]}"
guard_target "$TARGET_DATABASE_URL" "${SOURCE_DATABASE_URL:-}"
load_pg_env "$TARGET_DATABASE_URL"

existing="$("${psql[@]}" -X -Atq -c "select count(*) from information_schema.tables where table_schema='public'")"
if [ "$existing" != "0" ]; then
  echo "Target $PGHOST:$PGPORT database '$PGDATABASE' already has $existing table(s) in schema public."
  [ "$clean" = 1 ] && echo "--clean will DROP and recreate them."
  if [ "$yes" != 1 ]; then
    [ -t 0 ] || { echo "error: non-interactive; pass --yes to proceed" >&2; exit 1; }
    read -r -p "Type the database name ($PGDATABASE) to continue: " ans
    [ "$ans" = "$PGDATABASE" ] || { echo "aborted"; exit 1; }
  fi
fi

# The dump contains "CREATE SCHEMA public", which already exists on any fresh DB; skip that entry.
# The list sits next to the dump so a docker PG_RESTORE with the dump dir mounted can read it.
list="$(mktemp "$file.list.XXXXXX")"; trap 'rm -f "$list"' EXIT
"${pg_restore[@]}" -l "$file" | grep -v -E '^[0-9]+; [0-9]+ [0-9]+ SCHEMA - public ' >"$list"

args=(--use-list="$list" --no-owner --no-acl --exit-on-error --dbname="$PGDATABASE")
[ "$clean" = 1 ] && args+=(--clean --if-exists --single-transaction)
echo "Restoring $file into $PGHOST/$PGDATABASE ..."
"${pg_restore[@]}" "${args[@]}" "$file"
echo "Done. Run verify.js next."
