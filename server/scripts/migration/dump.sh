#!/usr/bin/env bash
# Dump the public schema of a Postgres DB to a custom-format file.
# Usage: SOURCE_DATABASE_URL=... ./dump.sh <output.dump>
#        ./dump.sh <output.dump> <source-url>
set -euo pipefail
here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=_lib.sh
. "$here/_lib.sh"

out="${1:-}"
url="${2:-${SOURCE_DATABASE_URL:-}}"
[ -n "$out" ] || { echo "usage: [SOURCE_DATABASE_URL=...] $0 <output.dump> [source-url]" >&2; exit 2; }
[ -n "$url" ] || { echo "error: source URL missing (arg 2 or SOURCE_DATABASE_URL)" >&2; exit 2; }
[ ! -e "$out" ] || { echo "error: $out already exists; refusing to overwrite" >&2; exit 1; }

PG_DUMP="${PG_DUMP:-pg_dump}"
need "$PG_DUMP"

tmp="$out.partial"
rm -f "$tmp"
trap 'rm -f "$tmp"' EXIT
echo "Dumping schema public to $out ..."
"$PG_DUMP" --no-owner --no-acl --schema=public -Fc --dbname="$(clean_url "$url")" --file="$tmp"
mv "$tmp" "$out"
trap - EXIT
echo "Done: $out ($(wc -c <"$out") bytes)"
