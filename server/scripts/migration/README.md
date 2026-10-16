# DB migration scripts (Supabase → Coolify Postgres)

Owner-run. Plain Postgres, schema `public`, no Supabase auth/storage. Needs `pg_dump`, `pg_restore`, `psql`
(client major >= source server major; override with `PG_DUMP`, `PG_RESTORE`, `PSQL`, e.g. a `postgres:17` docker wrapper)
and `npm ci` in `server/` (verify.js uses the generated Prisma client).

URLs are read from env or args and never printed. Use the Supabase **direct** connection (port 5432), not the pooler.
Prisma-only params (`pgbouncer`, `connection_limit`, `schema`) are stripped automatically.

## 1. Dump (read-only on source)
```bash
export SOURCE_DATABASE_URL='postgresql://...'
./dump.sh buildcity.dump        # refuses to overwrite; same as: ./dump.sh buildcity.dump '<url>'
```

## 2. Restore into the target
Target should be an empty database (do **not** run `prisma db push` first; the dump creates the tables).
```bash
export TARGET_DATABASE_URL='postgresql://...'
./restore.sh buildcity.dump                 # prompts if target already has tables in public
./restore.sh --clean buildcity.dump         # drop + recreate existing objects (destructive, prompts)
./restore.sh --yes ...                      # skip the prompt (non-interactive)
```

## 3. Verify
```bash
SOURCE_DATABASE_URL=... TARGET_DATABASE_URL=... node verify.js
```
Compares per Prisma model (from the DMMF): row count, latest `createdAt`/`updatedAt`; all sequences in `public`;
serial ids vs `max(id)`. Exit 0 = PASS, 1 = mismatch (table printed), 2 = usage/connection error.
Run it during a write freeze, otherwise live traffic causes expected mismatches.
