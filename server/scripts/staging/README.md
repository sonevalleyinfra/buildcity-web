# Staging data refresh

Owner-run on the VPS. Rebuilds the staging database from an anonymised copy of production. Production is only
read (one `pg_dump`); nothing flows from staging to production, and no script exists for that direction.
Needs `psql`, `pg_dump`, `pg_restore`, `python3`, `node` and `npm ci` in `server/`. Docker clients for the dump and
restore, and the `PG*` handling, are described in `../migration/README.md`.

## Run

Set the variables in your shell (never on the command line; URLs and passwords are never printed or put in argv):

```bash
export SOURCE_DATABASE_URL='postgresql://...'      # buildcity-db (prod), read-only use
export STAGING_DATABASE_URL='postgresql://...'     # the buildcity-db-staging server; its database name is ignored
export E2E_VENDOR_PASSWORD=... E2E_DR_PASSWORD=... E2E_ADMIN_PASSWORD=...   # staging-only test passwords
export STAGING_API_STOP='docker stop <buildcity-api-staging container>'
export STAGING_API_START='docker start <buildcity-api-staging container>'
export PG_DUMP='docker run --rm --network host -e PGHOST -e PGPORT -e PGUSER -e PGPASSWORD -e PGDATABASE -e PGSSLMODE postgres:17 pg_dump'
export PG_RESTORE="docker run --rm --network host -v $PWD:$PWD -w $PWD -e PGHOST -e PGPORT -e PGUSER -e PGPASSWORD -e PGDATABASE -e PGSSLMODE postgres:17 pg_restore"
export PSQL='docker run --rm -i --network host -e PGHOST -e PGPORT -e PGUSER -e PGPASSWORD -e PGDATABASE -e PGSSLMODE postgres:17 psql'
bash scripts/staging/refresh.sh
```

Run it from a directory without spaces in its path (the `$PWD` mount). `PSQL` needs `-i`: SQL files are piped in.

## What it does

1. `migration/dump.sh` dumps `buildcity-db` into a private temp dir (`refresh.XXXXXX`, mode 0700).
2. Creates `buildcity_staging_tmp` on the staging server, marks it `buildcity.env = 'staging'`, restores into it
   (`migration/restore.sh` guards apply), and deletes the dump.
3. `anonymise.sql`, then 4. `verify-anon.sql` (both with `ON_ERROR_STOP`). A failure drops the tmp DB, exits 1, and
   the current staging DB and API are untouched.
5. `seed-test-accounts.js` seeds the E2E accounts and the test product.
6. Stops the staging API, renames `buildcity_staging` to `buildcity_staging_old`, renames the tmp DB to
   `buildcity_staging`, sets and re-reads the marker in a new session, starts the API, then drops the old DB.
   If anything fails before the swap completes, the old DB is renamed back and the API is restarted. If the
   rename-back itself fails, the API stays stopped and it prints: `the previous staging data is in
   buildcity_staging_old, buildcity_staging does not exist ... Fix by hand: ALTER DATABASE buildcity_staging_old
   RENAME TO buildcity_staging`.

The dump is deleted by an exit trap on every path (success, failure, Ctrl-C).

Exit codes: 2 = refused before touching anything (no dump, create, drop, rename or API stop); 1 = any failure after
that, including psql, dump, restore and API stop/start errors; a signal keeps its own code.

## Refusals (exit 2)

The database markers are the real guard; the host-name checks are best-effort (Coolify hostnames are UUIDs).

- any database on the staging server is marked `buildcity.env = 'production'` (any role or database, any case)
- the source database is not marked `production` (unmarked or `staging`: the URLs are probably swapped)
- a marker or existence query fails (never fails open)
- `buildcity_staging_old` exists but `buildcity_staging` does not (a previous run stranded it; rename it back by hand)
- a missing `SOURCE_DATABASE_URL`, `STAGING_DATABASE_URL`, `STAGING_API_STOP`, `STAGING_API_START` or `E2E_*` password
- the staging host:port equals the source host:port, or both URLs reach the same Postgres server (same
  `system_identifier`, so a name and an IP of one server are caught)
- the staging host is `buildcity-db` (or `buildcity-db.<suffix>`) or listed in `PROD_DB_HOSTS` (comma list; put prod's IP there)
- `buildcity_staging`, `buildcity_staging_tmp` or `buildcity_staging_old` already exists with a marker other than
  `staging`
- a Supabase host (from `_lib.sh`)

## Seed (`seed-test-accounts.js`)

Idempotent. Creates region `E2E Varanasi`; approved vendor `1000000001` and DR `1000000002` (same region) with
`E2E_VENDOR_PASSWORD` / `E2E_DR_PASSWORD`; the super-admin row `9999999999` (role ADMIN, `E2E_ADMIN_PASSWORD`, the only
phone the admin login accepts); and `E2E Test Cement 50kg`, priced above `minOrderForCashback`. Passwords are read from
env only and never printed. It writes only to a database marked `staging`, or marked `test` with `APP_ENV=test` on a
loopback `DATABASE_URL`; otherwise it exits 2 with no writes. An unmarked database is always refused (a plain
`pg_dump` restore drops the marker). For `e2e-local`, `npm run e2e` marks the DB `test` first; to seed by hand run
`ALTER DATABASE <db> SET buildcity.env = 'test'` first, then
`APP_ENV=test DATABASE_URL=postgresql://...@localhost/... node scripts/staging/seed-test-accounts.js`.

## Tests

`npm run test:staging` runs `seed-decide.test.js` (the seed's refusal rules, no DB), the anonymiser tests, `refresh-shim.sh` (every refusal, no DB) and `refresh-dryrun.sh`
(two throwaway `postgres:17` containers on loopback: failed verify, full swap, admin login on the result, seed
idempotency and refusals, swapped URLs, a stray production DB, a failed rename-back). The dry run needs docker and host `psql`.
