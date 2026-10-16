# DB migration scripts (Supabase → Coolify Postgres)

Owner-run. Plain Postgres, schema `public`, no Supabase auth/storage. Needs `pg_dump`, `pg_restore`, `psql`, `python3`
and `npm ci` in `server/` (verify.js uses the generated Prisma client).

URLs are read from env only and never printed or passed on a command line: `_lib.sh` parses them into libpq
`PGHOST`/`PGPORT`/`PGUSER`/`PGPASSWORD`/`PGDATABASE`/`PGSSLMODE` env vars. Use the Supabase **direct** connection
(port 5432), not the pooler. Prisma-only params (`pgbouncer`, `connection_limit`, `schema`) are stripped automatically.

## Client version
`pg_dump` must be the same major as the source server or newer; `dump.sh` checks `server_version_num` and refuses
otherwise. Use a docker client for `<major>` (env vars are passed by name, so nothing secret lands in argv):
```bash
export PG_DUMP='docker run --rm --network host -e PGHOST -e PGPORT -e PGUSER -e PGPASSWORD -e PGDATABASE -e PGSSLMODE postgres:<major> pg_dump'
export PG_RESTORE="docker run --rm --network host -v $PWD:$PWD -w $PWD -e PGHOST -e PGPORT -e PGUSER -e PGPASSWORD -e PGDATABASE -e PGSSLMODE postgres:<major> pg_restore"
```
`PG_RESTORE` mounts the current directory: run `restore.sh` from the directory holding the dump. `PSQL` can be
overridden the same way.

## 1. Dump (read-only on source)
```bash
export SOURCE_DATABASE_URL='postgresql://...'
./dump.sh buildcity.dump        # refuses to overwrite
```

## 2. Restore into the target
Target should be an empty database (do **not** run `prisma db push` first; the dump creates the tables).
Refused (exit 2): any `supabase.co` / `supabase.com` host, and a target with the same host, port and database as
`SOURCE_DATABASE_URL` when that is set.
```bash
export TARGET_DATABASE_URL='postgresql://...'
./restore.sh buildcity.dump                 # if public has tables: shows host + db, asks you to type the db name
./restore.sh --clean buildcity.dump         # drop + recreate existing objects (destructive, same prompt)
./restore.sh --yes ...                      # skip the prompt; required when non-interactive
```

## 3. Verify
```bash
SOURCE_DATABASE_URL=... TARGET_DATABASE_URL=... node verify.js
```
Compares per Prisma model (from the DMMF): row count, latest `createdAt`/`updatedAt`; all sequences in `public`;
serial ids vs `max(id)`. Exit 0 = PASS, 1 = mismatch (table printed), 2 = usage/connection error.
Run it during a write freeze, otherwise live traffic causes expected mismatches.

## Tests
`npm run test:migration` (from `server/`): shim-based, no network or DB.
