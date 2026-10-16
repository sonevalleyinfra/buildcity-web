# shellcheck shell=bash
# Shared helpers. Never print connection URLs or passwords, never put them in argv.
# URLs reach python via the MIG_URL / MIG_SOURCE_URL env vars; clients connect with libpq PG* env vars only.

_PGURL_PY=$(cat <<'PY'
import os, shlex, sys
from urllib.parse import urlsplit, parse_qsl, unquote

def die(msg):
    sys.stderr.write("error: " + msg + "\n")
    sys.exit(2)

# Prisma-only query params are rejected by libpq; drop them.
PRISMA = {"pgbouncer", "connection_limit", "pool_timeout", "schema"}
PARAMS = {"sslmode": "PGSSLMODE", "sslrootcert": "PGSSLROOTCERT", "sslcert": "PGSSLCERT",
          "sslkey": "PGSSLKEY", "connect_timeout": "PGCONNECT_TIMEOUT", "application_name": "PGAPPNAME"}
MANAGED = ["PGHOST", "PGPORT", "PGUSER", "PGPASSWORD", "PGDATABASE"] + list(PARAMS.values())

def parse(var, label):
    try:
        u = urlsplit(os.environ.get(var, ""))
        port = u.port
    except ValueError:
        die(label + " URL could not be parsed")
    if u.scheme not in ("postgres", "postgresql"):
        die(label + " URL must start with postgresql://")
    env = {"PGHOST": unquote(u.hostname or ""), "PGPORT": str(port or 5432),
           "PGUSER": unquote(u.username or ""), "PGPASSWORD": unquote(u.password or ""),
           "PGDATABASE": unquote(u.path.lstrip("/"))}
    if not env["PGHOST"] or not env["PGDATABASE"]:
        die(label + " URL needs a host and a database name")
    for k, v in parse_qsl(u.query, keep_blank_values=True):
        if k in PRISMA:
            continue
        if k in PARAMS:
            env[PARAMS[k]] = v
        else:
            sys.stderr.write("warning: ignoring URL parameter '%s'\n" % k)
    return env

def key(env):
    host = env["PGHOST"].lower().rstrip(".")
    if host in ("127.0.0.1", "::1"):
        host = "localhost"
    return (host, env["PGPORT"], env["PGDATABASE"])

mode = sys.argv[1]
env = parse("MIG_URL", "connection")
if mode == "export":
    unset = [k for k in MANAGED if not env.get(k)]
    if unset:
        print("unset " + " ".join(unset))
    print("export " + " ".join("%s=%s" % (k, shlex.quote(env[k])) for k in MANAGED if env.get(k)))
elif mode == "guard":
    host = key(env)[0]
    if any(host == d or host.endswith("." + d) for d in ("supabase.co", "supabase.com")):
        die("refusing to restore into a Supabase host (%s); the target must be the new database" % host)
    if os.environ.get("MIG_SOURCE_URL"):
        os.environ["MIG_URL"] = os.environ["MIG_SOURCE_URL"]
        if key(parse("MIG_URL", "source")) == key(env):
            die("TARGET_DATABASE_URL points at the same host/port/database as SOURCE_DATABASE_URL; refusing")
else:
    die("unknown mode")
PY
)

# load_pg_env <url>: export PGHOST/PGPORT/PGUSER/PGPASSWORD/PGDATABASE/PGSSLMODE... for libpq.
load_pg_env() {
  local s
  s="$(MIG_URL="$1" python3 -c "$_PGURL_PY" export)" || exit 2
  eval "$s"
}

# guard_target <target-url> [source-url]: exit 2 if the target is Supabase or the same DB as the source.
guard_target() {
  MIG_URL="$1" MIG_SOURCE_URL="${2:-}" python3 -c "$_PGURL_PY" guard || exit 2
}

need() { command -v "$1" >/dev/null 2>&1 || { echo "error: '$1' not found in PATH" >&2; exit 2; }; }
