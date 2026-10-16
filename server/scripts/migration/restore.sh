#!/usr/bin/env bash
# Restore a dump made by dump.sh into the target DB.
# Usage: TARGET_DATABASE_URL=... ./restore.sh [--clean] [--yes] <input.dump>
#   --clean  drop existing objects first (pg_restore --clean --if-exists). Destructive.
#   --yes    skip the confirmation prompt (only when the target has existing tables)
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
url="${TARGET_DATABASE_URL:-}"
[ -n "$file" ] || { echo "usage: TARGET_DATABASE_URL=... $0 [--clean] [--yes] <input.dump>" >&2; exit 2; }
[ -f "$file" ] || { echo "error: $file not found" >&2; exit 2; }
[ -n "$url" ] || { echo "error: TARGET_DATABASE_URL not set" >&2; exit 2; }

PG_RESTORE="${PG_RESTORE:-pg_restore}"; PSQL="${PSQL:-psql}"
need "$PG_RESTORE"; need "$PSQL"
url="$(clean_url "$url")"

existing="$("$PSQL" "$url" -X -Atq -c "select count(*) from information_schema.tables where table_schema='public'")"
if [ "$existing" != "0" ]; then
  echo "Target already has $existing table(s) in schema public."
  [ "$clean" = 1 ] && echo "--clean will DROP and recreate them."
  if [ "$yes" != 1 ]; then
    [ -t 0 ] || { echo "error: non-interactive; pass --yes to proceed" >&2; exit 1; }
    read -r -p "Type 'yes' to continue: " ans
    [ "$ans" = "yes" ] || { echo "aborted"; exit 1; }
  fi
fi

# The dump contains "CREATE SCHEMA public", which already exists on any fresh DB; skip that entry.
list="$(mktemp)"; trap 'rm -f "$list"' EXIT
"$PG_RESTORE" -l "$file" | grep -v -E '^[0-9]+; [0-9]+ [0-9]+ SCHEMA - public ' >"$list"

args=(--use-list="$list" --no-owner --no-acl --exit-on-error --dbname="$url")
[ "$clean" = 1 ] && args+=(--clean --if-exists)
echo "Restoring $file ..."
"$PG_RESTORE" "${args[@]}" "$file"
echo "Done. Run verify.js next."
