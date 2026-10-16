#!/usr/bin/env bash
# Dump the public schema of a Postgres DB to a custom-format file.
# Usage: SOURCE_DATABASE_URL=... ./dump.sh <output.dump>
set -euo pipefail
umask 077   # the dump holds the whole DB: owner-only
here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=_lib.sh
. "$here/_lib.sh"

out="${1:-}"
if [ $# -ne 1 ] || [ -z "$out" ]; then echo "usage: SOURCE_DATABASE_URL=... $0 <output.dump>" >&2; exit 2; fi
[ -n "${SOURCE_DATABASE_URL:-}" ] || { echo "error: SOURCE_DATABASE_URL not set" >&2; exit 2; }
[ ! -e "$out" ] || { echo "error: $out already exists; refusing to overwrite" >&2; exit 1; }

# Word-split so wrappers work, e.g. PG_DUMP='docker run ... postgres:17 pg_dump'.
read -r -a pg_dump <<<"${PG_DUMP:-pg_dump}"; read -r -a psql <<<"${PSQL:-psql}"
need python3; need "${pg_dump[0]}"; need "${psql[0]}"
load_pg_env "$SOURCE_DATABASE_URL"

# pg_dump refuses (or worse, produces a partial dump) when older than the server.
server_num="$("${psql[@]}" -X -Atq -c 'show server_version_num')"
client_major="$("${pg_dump[@]}" --version | sed -E 's/^[^0-9]*([0-9]+).*/\1/')"
case "$server_num$client_major" in *[!0-9]*|"") echo "error: could not read server or pg_dump version" >&2; exit 2 ;; esac
server_major=$((server_num / 10000))
if [ "$client_major" -lt "$server_major" ]; then
  echo "error: pg_dump major $client_major is older than source server major $server_major; set PG_DUMP to a postgres:$server_major client (see README)" >&2
  exit 2
fi

tmp="$out.partial"
rm -f "$tmp"
trap 'rm -f "$tmp"' EXIT
echo "Dumping schema public from $PGHOST/$PGDATABASE to $out ..."
"${pg_dump[@]}" --no-owner --no-acl --schema=public -Fc >"$tmp"
mv "$tmp" "$out"
trap - EXIT
echo "Done: $out ($(wc -c <"$out") bytes)"
