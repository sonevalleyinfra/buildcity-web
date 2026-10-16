# shellcheck shell=bash
# Shared helpers. Never print connection URLs.

# Prisma-only query params (pgbouncer, connection_limit, schema) are rejected by libpq.
clean_url() {
  local u
  u="$(printf '%s' "$1" | sed -E 's/[?&](pgbouncer|connection_limit|pool_timeout|schema)=[^&]*//g')"
  case "$u" in *\?*) ;; *\&*) u="$(printf '%s' "$u" | sed -E 's/&/?/')" ;; esac
  printf '%s' "$u"
}

need() { command -v "$1" >/dev/null 2>&1 || { echo "error: '$1' not found in PATH" >&2; exit 2; }; }
