# Moving the backend to our own server (the easy guide)

## What are we doing?

Today the **backend** (the `server/` folder) runs on **Railway** and the **database** lives on **Supabase**.
We are moving both to our own VPS, managed by **Coolify** (https://coolify.buildcity.cloud), where cement, frnd and
wishesapp already run.

| Part       | Now                          | After                                   |
|------------|------------------------------|-----------------------------------------|
| Website    | Vercel (www.buildcity.in)    | Vercel (no change)                      |
| Backend    | Railway                      | Coolify app `buildcity-api`             |
| Database   | Supabase Postgres            | Coolify Postgres `buildcity-db`         |
| API address| `www.buildcity.in/api/v1`    | same address, new destination behind it |

The new backend gets its own address, **`https://api.buildcity.cloud`**. The `*.buildcity.cloud` wildcard already
exists, so there is **no DNS change**.

## Why the apps keep working

Our shipped apps (customer 1.2.4, partner 1.2) call **`www.buildcity.in/api/v1`**. Vercel forwards that to the
backend through one line in `vercel.json` (the `/api/v1/:path*` rewrite). At cutover we change **only the
destination of that line**. The apps never notice, and **no app update is needed**.

One catch: the old apps also have the Railway address built in as a fallback. So **Railway stays stopped (not deleted) for about 14
days** after the move (Phase C). The old apps' Railway fallback then just fails, and their primary path
`www.buildcity.in` keeps working.

The move has three phases:

- **Phase A**: rehearsal. Build everything on Coolify and copy the data. No downtime, nobody notices.
- **Phase B**: cutover. About 10 minutes, late at night.
- **Phase C**: clean up and backups.

> **Invoices work must wait.** Do not start the Invoices tasks (the parked chain, PDF invoices, GST) until
> this migration has landed and Phase C step 1 is done. Schema changes during the move would break the copy.

> The UI labels below are from memory of Coolify, Railway and Vercel. If a button is named slightly differently,
> look for the closest one. Nothing in Phase A can hurt production, so click around freely there.

---

## Step 0: Prerequisites

### 0.1 Is the VPS big enough?

SSH into the VPS and run:

```sh
free -h          # RAM: you want at least 1.5 GB "available" after the existing apps
df -h /          # disk: you want at least 10 GB free
docker system df # how much space Docker already uses
```

The API needs about 300-500 MB RAM, Postgres about 300 MB, plus room for the Docker build (a build can briefly use
1 GB+). If "available" RAM is under 1.5 GB, add swap or upsize the VPS **before** starting. Do not build the API
while another build is running.

### 0.2 Which Postgres version is Supabase running?

Open the Supabase dashboard → **SQL Editor** and run:

```sql
SHOW server_version;
```

Write down the **major** number (for example `15` from `15.8`). `buildcity-db` must use the **same major** (or newer,
never older). **Ours: 17** (Supabase reports 17.6), so use `postgres:17` everywhere below. `server/scripts/migration/dump.sh` refuses to run if your `pg_dump` is older than the source.

### 0.3 Tools on the machine that runs the scripts

Run the migration scripts **on the VPS** (over SSH): it has Docker, and it is close to the new database. You need
`bash`, `python3`, `node` (22) and `git`. For the Postgres client tools use Docker (see step A4), so the version is
always right.

### 0.4 Pick an off-site backup bucket (for Phase C)

Backups on the same VPS die with the VPS. Pick one S3-compatible bucket now:

- **Cloudflare R2** (recommended: 10 GB free, no download fees), or
- AWS S3, Backblaze B2, or Wasabi.

Create an empty bucket (e.g. `buildcity-backups`) and an access key limited to that bucket. Keep the access key ID,
secret and endpoint ready. Do not paste them in chat or in this repo.

### 0.5 Get the code in the right order

Merge order matters:

1. PRs **#11** (Coolify-ready backend), **#14** (`/health` hardening) and **#13** (migration scripts): **already
   merged**. Nothing to do.
2. PR **#12** (the app uses one `BACKEND_DIRECT_URL` constant) **plus the `vercel.json` rewrite**: merge them
   **only at cutover**, step B5.
3. PR **#15** (this guide): docs only, merge any time.

> **Railway does not redeploy by itself when `main` changes.** On 16 Oct it was still serving the old code 7
> minutes after #11 merged (and #13, #14 changed nothing there either). Merging to `main` has not changed
> production on Railway. That is fine for this plan: Phase A builds a fresh copy on Coolify, and we never depend on
> Railway picking up new code.
>
> **"Redeploy" on Railway rebuilds the same commit it was built from, not `main`.** Redeploying a removed or old
> deployment brings back the old, known-good code. That is exactly what we want for rollback. Do not expect it to
> pick up the merged PRs.

Before anything else, check **Railway → your service → Settings → Healthcheck Path**. The new `/health` returns
**503 when the database is unreachable**. If that path is set to `/health` and you ever redeploy Railway from a build
that has the new `/health`, a Supabase blip could make Railway restart in a loop. Either clear the path (empty is
fine) or accept the risk knowingly.

---

## Phase A: Rehearsal (no downtime)

Goal: a complete copy running on Coolify with a copy of the data, tested end to end, **while production stays on
Railway**. You can repeat Phase A as many times as you like.

### A1. Create the database `buildcity-db`

1. Coolify → **Projects** → pick the project you use for BuildCity apps (or **+ Add** a project called `buildcity`)
   → environment `production`.
2. **+ New** → **Database** → **PostgreSQL**.
3. Set:
   - **Name**: `buildcity-db`
   - **Image**: `postgres:17` (ours is 17; if step 0.2 ever shows a newer major, use that; `postgres:17-alpine` is fine).
   - **Initial database**: `buildcity`
   - Leave the generated username and password. Coolify creates them.
4. **Persistent storage**: leave the default volume on. This is where the data lives.
5. Click **Start**.
6. Open the database page and copy the **Postgres URL (internal)**. It looks like
   `postgres://<user>:<password>@<internal-host>:5432/buildcity`. The internal host is a long generated name that
   only other Coolify apps can reach. Keep it somewhere private. You will paste it into the API's env below and
   into your shell as `TARGET_DATABASE_URL`.

### A2. Reach the database from the VPS shell (keep it private)

The migration scripts run on the VPS shell, outside Coolify's private network. **Do not open the production
database to the internet.** Instead, run the Postgres tools and `verify.js` in Docker containers joined to Coolify's
private Docker network, called `coolify`. (Check it exists: `docker network ls | grep coolify`.)

That means `TARGET_DATABASE_URL` is simply the **internal URL from A1.6**, with its long internal host name. The
scripts accept internal host names; only `supabase.co`/`supabase.com` and the source's own host are refused.

> **Fallback only if the private network does not work** (for example the `coolify` network name differs and you
> cannot find it): on the `buildcity-db` page → **Make it publicly available** with a port such as `54329`, and use
> the VPS public IP + that port in `TARGET_DATABASE_URL`, with plain `--network host` wrappers. Then **first** limit
> that port to your own IP in the Hostinger firewall, and **turn it off again in step B9 (mandatory)**. A database
> open to the internet is a real risk.

> The restore script refuses to copy into a `supabase.co`/`supabase.com` address, or into the same host/port/database
> as the source. It compares them as text, so a name and an IP of the same database are not seen as equal. Always
> use the **new** database's address as the target. Never point `TARGET_DATABASE_URL` at Supabase, even by IP.

### A3. Create the API app `buildcity-api`

1. In the same project/environment: **+ New** → **Application** → **Public Repository** (or **Private Repository
   (with GitHub App)** if the repo is private and the Coolify GitHub app has access to `sonevalleyinfra/buildcity-web`).
2. Repository: `https://github.com/sonevalleyinfra/buildcity-web`, branch **`main`**.
3. **Build Pack**: **Dockerfile**.
4. **Base Directory**: `/server`
5. **Dockerfile Location**: `/Dockerfile`
6. **Ports Exposes**: `5000`
7. **Name**: `buildcity-api`
8. Save, and go to the application's **Configuration** page for the settings below. Do **not** deploy yet.

**Domain.** Configuration → **General** → **Domains**: `https://api.buildcity.cloud` → **Save**. Coolify issues the
HTTPS certificate on its own.

**Health check.** Configuration → **Healthcheck**: turn it on.

| Field         | Value     |
|---------------|-----------|
| Path          | `/health` |
| Port          | `5000`    |
| Method / Scheme | `GET` / `http` |
| Interval      | `30` s    |
| Timeout       | `5` s     |
| Retries       | `3`       |
| Start period  | `30` s    |

The image already carries the same check. `/health` runs a quick database query (cached for 5 s) and returns
`200` when fine, `503` when the database is down.

**Restart policy.** Docker restarts the container only when the app **crashes**, not when a health check fails.
Leave Coolify's default (`unless-stopped`). That is exactly what we want: if the database blips, `/health` turns
`503` and the app shows unhealthy, but the container is **not** restarted over and over. When the database comes
back, it recovers by itself. Do not add any "restart on unhealthy" automation.

**Persistent volume (important).** The server keeps a small file, `vendor-fcm-tokens.json` (vendor push tokens
backup), in `DATA_DIR`. The image uses `/data`. Without a volume it is wiped on every deploy.

1. Configuration → **Persistent Storage** → **+ Add** → **Volume Mount**.
2. **Name**: `buildcity-api-data`, **Destination Path**: `/data`.
3. Save.

After the first deploy, check **Logs** for `EACCES` (permission denied on `/data`). If it appears, the volume is
not writable by the app user; tell the Office Manager before cutover, since vendor push tokens would not be saved.

**Environment variables.** Configuration → **Environment Variables** → add each one. Names only here; get the values
from the places in the table. Never write the values into this repo or into chat.

| Name | Value / where to get it |
|------|-------------------------|
| `DATABASE_URL` | The **internal** Postgres URL of `buildcity-db` from A1 (step A1.6). |
| `DIRECT_URL` | The same internal URL (we have no pooler). |
| `JWT_SECRET` | **Must be the exact same value as Railway**, or every logged-in user is logged out. Railway → service → **Variables** → `JWT_SECRET` → copy. |
| `ALLOWED_ORIGINS` | Copy from Railway **Variables**. It is the comma-separated list of allowed websites (it must include `https://www.buildcity.in`). |
| `NODE_ENV` | `production` (the image sets it too). |
| `PORT` | `5000` |
| `DATA_DIR` | `/data` (the image sets it too). |
| `FIREBASE_SERVICE_ACCOUNT` | Push notifications. Copy from Railway **Variables**. (If Railway uses `FIREBASE_SERVICE_ACCOUNT_PATH` instead, ask a teammate for the service-account file and paste its JSON contents into `FIREBASE_SERVICE_ACCOUNT`.) |
| `ARADHYA_SMS_USERNAME`, `ARADHYA_SMS_APIKEY`, `ARADHYA_SMS_SENDER`, `ARADHYA_SMS_TEMPLATE_ID`, `ARADHYA_SMS_PE_ID`, `ARADHYA_SMS_ROUTE` | OTP SMS. Copy whichever of these Railway has. |
| `SMS_USERNAME`, `SMS_APIKEY`, `SMS_SENDER`, `SMS_TEMPLATE_ID`, `SMS_PEID`, `SMS_ROUTE` | Fallback names for the same thing. Copy only the ones Railway has. |
| `SMS_RELAY_SECRET` | Copy from Railway. It must match the one in Vercel (Vercel → Project → Settings → Environment Variables). |
| `KEEP_ALIVE_URL` | **Leave unset.** It only exists for free hosts that go to sleep. |

Check the list against Railway's **Variables** tab: any variable that exists there but not in this table is
probably still needed. Also see `server/.env.example` in the repo, which lists every name.

> **SMS gateway IP allow-list.** If the SMS provider only accepts calls from known IP addresses (some Indian SMS
> providers do), add the VPS public IP in their panel **before** you cut over, or OTP login stops working. The
> OTP smoke test in A8 will tell you.

Now click **Deploy**. The first build takes a few minutes. When it finishes, the application status should show
**Running (healthy)**.

Quick check from your laptop:

```sh
curl -fsS https://api.buildcity.cloud/health
```

Expected: `{"status":"ok", ...}`. At this stage it can also be `503` / "db unavailable" if the database is still
empty or unreachable; if so, check the logs (Configuration → **Logs**) and `DATABASE_URL`.

### A4. Get the migration scripts and the right Postgres tools

On the VPS:

```sh
git clone https://github.com/sonevalleyinfra/buildcity-web.git
cd buildcity-web/server
npm ci
cd scripts/migration
```

Run the next commands from a path **without spaces**. The image is `postgres:17`, the major from step 0.2 (the
same one `buildcity-db` uses; if 0.2 shows a different major, replace `17` below):

```sh
export PG_DUMP='docker run --rm --network coolify -e PGHOST -e PGPORT -e PGUSER -e PGPASSWORD -e PGDATABASE -e PGSSLMODE postgres:17 pg_dump'
export PSQL='docker run --rm --network coolify -e PGHOST -e PGPORT -e PGUSER -e PGPASSWORD -e PGDATABASE -e PGSSLMODE postgres:17 psql'
export PG_RESTORE="docker run --rm --network coolify -v $PWD:$PWD -w $PWD -e PGHOST -e PGPORT -e PGUSER -e PGPASSWORD -e PGDATABASE -e PGSSLMODE postgres:17 pg_restore"
```

The `coolify` network can still reach the internet, so `pg_dump` reaches Supabase too. `verify.js` also needs to
see the private network, so it runs in a `node:22` container on it. Define a helper once (from
`server/scripts/migration`):

```sh
export VERIFY="docker run --rm --network coolify -v $PWD/../..:/app -w /app/scripts/migration -e SOURCE_DATABASE_URL -e TARGET_DATABASE_URL node:22 node verify.js"
```

(Fallback with a public port: use `--network host` instead of `--network coolify` everywhere, or just `node verify.js`.)

The passwords stay in environment variables; they are never printed or put in a command line.

### A5. Copy the data (rehearsal copy)

Paste the two URLs into your shell. The leading space keeps them out of shell history on most setups, but better,
type `unset HISTFILE` first:

```sh
unset HISTFILE
read -rs SOURCE_DATABASE_URL && export SOURCE_DATABASE_URL     # Supabase SESSION POOLER (port 5432), paste, Enter
read -rs TARGET_DATABASE_URL && export TARGET_DATABASE_URL     # buildcity-db, INTERNAL URL from A1.6, paste, Enter
```

Use the **Session pooler** URL: Supabase dashboard → **Connect** → **Session pooler**
(`postgres://postgres.<ref>:***@aws-0-<region>.pooler.supabase.com:5432/postgres`, user `postgres.<ref>`). It supports
`pg_dump` and works over IPv4. The **direct** host `db.<ref>.supabase.co` is IPv6-only unless the paid IPv4 add-on is
on, and containers on the `coolify` network have no IPv6, so the dump fails with "Network is unreachable". Use the
direct URL only if the test below works with it. **Never** the transaction pooler (port 6543): it breaks `pg_dump`.

Test the source from the same network the dump uses (it must print `1`):

```sh
docker run --rm --network coolify -e SOURCE_DATABASE_URL postgres:17 sh -c 'psql "$SOURCE_DATABASE_URL" -c "select 1"'
```

Dump (this only reads from Supabase), then restore:

```sh
./dump.sh buildcity.dump
./restore.sh buildcity.dump
```

`dump.sh` refuses to overwrite an existing file. `restore.sh` creates the tables itself, so **do not run
`prisma db push` before it**. If the target already has tables (say, from an earlier rehearsal), it shows the
host and database name and asks you to type the database name to continue; use `./restore.sh --clean buildcity.dump`
to replace them. Use the typed prompt as the "am I sure this is the NEW database?" check. If the host shown is
not your VPS, type nothing and press Ctrl+C.

### A6. Is `prisma db push` needed?

**Normally not.** The dump contains the whole schema, and the server does not run `db push` on start. But the
code in `main` may have a newer schema than Supabase has. Check for differences (read-only on the target):

```sh
cd ../..       # back to server/
docker run --rm --network coolify -v "$PWD":/app -w /app -e DATABASE_URL="$TARGET_DATABASE_URL" -e DIRECT_URL="$TARGET_DATABASE_URL" node:22 \
  npx prisma migrate diff --from-schema-datasource prisma/schema.prisma --to-schema-datamodel prisma/schema.prisma --exit-code
echo "exit code: $?"
```

- exit code **0**: the new DB matches the code. Done, nothing to do.
- exit code **2**: the database differs from `prisma/schema.prisma`. Do **not** fix it yourself. Copy the printed
  difference to the Office Manager. (Production on Railway ran with the same schema, so this normally means a column
  was added by `db push` in code that has not reached production yet.)
- exit code **1**: error, usually a wrong URL.

Never use `--accept-data-loss`.

### A7. Check the copy

```sh
cd scripts/migration
$VERIFY
```

It compares both databases: row count and newest row for every table, all sequences, and the highest id of each
numbered table. Result:

- Exit **0** and `PASS`: good.
- Exit **1**: mismatch table printed. During the rehearsal, small differences are normal because Railway is live and
  taking orders. Re-run the dump and restore (`rm buildcity.dump`, then A5 with `--clean`) to see them shrink. The
  real check is in the cutover, when writes are paused.

### A8. Smoke test on the new backend

Do this on a browser first, using the **new** backend directly. Use a **test build** of the website pointed at
`https://api.buildcity.cloud` (set `VITE_API_URL=https://api.buildcity.cloud` and run the site locally with
`npm run dev`), or use `curl` for the API checks. The new backend allows the origins in `ALLOWED_ORIGINS`, so add
`http://localhost:5173` temporarily if you test from localhost, and remove it afterwards.

Tick each box:

- [ ] `curl https://api.buildcity.cloud/health` returns 200
- [ ] **Login OTP**: request an OTP with a test phone number; the SMS arrives; login works. (Fails with SMS errors →
      check the SMS env vars and the IP allow-list note above.)
- [ ] An existing user stays logged in (JWT_SECRET is the same).
- [ ] **Catalogue**: categories and products load with images, prices look right.
- [ ] **Cart**: add and remove items; coupon codes apply.
- [ ] **COD order**: place a Cash on Delivery order as a test customer. It appears in the customer's orders.
- [ ] **Wallet**: balance shows; a wallet-paid order or top-up changes it correctly.
- [ ] **Vendor dashboard**: vendor login, the new order appears, change its status.
- [ ] **DR return desk**: DR login, open the return desk, the district-scoped list loads.
- [ ] **Push**: the vendor/customer gets a notification when the order status changes. Check the logs
      (Configuration → **Logs**) for Firebase errors.
- [ ] No red errors in the **Logs** page.

The rehearsal copy is thrown away: orders made here exist only on the new DB, which is overwritten by the
cutover restore (`--clean`). That is expected.

---

## Phase B: Cutover (about 10 minutes, late at night)

Pick a quiet time (after midnight). Have this guide, the Railway dashboard, Coolify and Vercel open. Do not hurry.

### Before the night

- [ ] Phase A fully passed.
- [ ] PRs #11, #13 and #14 are merged (nothing to do). Only #12 + the rewrite wait for B5.
- [ ] Prepare, **but do not merge**, a branch with the `vercel.json` change: in the line with
      `"source": "/api/v1/:path*"` change the `destination` to
      `https://api.buildcity.cloud/api/v1/:path*`. Ask the Office Manager to open it as a PR together with PR #12.
      Keeping the rewrite in the same merge as #12 means one merge does both.
- [ ] Know how to bring Railway back: Railway → service → **Deployments** → **Redeploy** the last good one. This
      rebuilds the **same commit** it was built from (not `main`), which is the known-good code. Railway does not
      auto-deploy from `main`, so there is no surprise new code.
- [ ] Pick the quietest hour: Railway → service → **Metrics** → request graph, look at the last 2 weeks and choose the
      lowest-traffic hour (probably 1-3 am).
- [ ] Send a one-line notice to customers and vendors/DRs a day ahead, with the downtime window, for example:
      "BuildCity will be briefly unavailable on <date> between <start> and <start + 30 min> for maintenance."
      (The work itself takes about 10 minutes; the window leaves room.)

### B1. Pause writes

Stop the Railway backend so nobody can write to Supabase:

1. Railway → the backend service → **Deployments** → the active deployment → **⋯** → **Remove** (this stops it).
2. Check: `curl -sS -o /dev/null -w "%{http_code}\n" https://www.buildcity.in/api/v1/health` no longer returns `200`.

Railway stays stopped, not deleted, and the removed deployment can be redeployed later. From now until B6 the website and apps show errors. That is the ~10 minute downtime. Old apps' direct-to-Railway
fallback fails too, for the same reason.

### B2. Final dump and restore

On the VPS, in `buildcity-web/server/scripts/migration` with the env vars from A4 and A5:

```sh
rm -f buildcity.dump                      # delete the rehearsal dump
./dump.sh buildcity.dump
./restore.sh --clean buildcity.dump       # asks you to type the database name: check the host is the new VPS
```

### B3. Verify with writes paused

```sh
$VERIFY
```

It must say **PASS** (exit 0). **If it does not, stop**: go to Rollback, and tell the Office Manager.

### B4. Restart the API

Coolify → `buildcity-api` → **Restart** (so it reconnects to the fresh data and clears caches). Wait for
**Running (healthy)**, then:

```sh
curl -fsS https://api.buildcity.cloud/health
```

It must return `200` before you go on.

### B5. Switch the website to the new backend

Only after the `/health` check above passes:

1. Merge the PR that has **#12 plus the `vercel.json` rewrite change**.
2. Vercel → the project → **Deployments**: wait for the new production deployment to be **Ready**
   (about 1 minute). If it did not start by itself, **⋯** → **Redeploy**.

### B6. Smoke test

```sh
curl -fsS https://www.buildcity.in/api/v1/health
```

Then repeat the checklist from **A8** on the **real site** `https://www.buildcity.in`, and then on the apps:

- [ ] **Web**: login with one real customer OTP (a real phone, a real SMS), catalogue, cart, one COD order, wallet.
- [ ] **Customer app** (the installed APK, the old version 1.2.4): open it, log in, browse, place a COD order.
- [ ] **Partner app** (installed, 1.2): log in as a vendor, see the new order, change status; check the push arrives.
- [ ] Coolify → `buildcity-api` → **Logs**: orders and requests are coming in, no repeated errors.
  For the first hour also watch for **429** responses: behind Vercel and Traefik, `trust proxy 1` can make the OTP
  IP limiter key on the Vercel edge IP, so many customers would share one limit.

### B7. Watch for 30 minutes

Keep the Coolify logs open. If real customers are placing orders and everything looks normal, you are done.

### B8. Say it worked

Tell the Office Manager "cutover done". Railway stays **stopped but not deleted** (see Phase C).

### B9. Close any temporary hole

If you used the public-port fallback in A2: Coolify → `buildcity-db` → turn **Make it publicly available**
**off** → **Save**, and remove the Hostinger firewall rule. **This is mandatory then.** With the private network you
never opened it, so just confirm the toggle is off. Then on the VPS:

```sh
rm -f ~/buildcity-web/server/scripts/migration/buildcity.dump
unset SOURCE_DATABASE_URL TARGET_DATABASE_URL
```

(The dump holds the whole database. Do not leave it lying around. Keep a copy only in your private backup bucket.)

---

## Rollback (if something is wrong in Phase B)

**Before B5** (the rewrite not yet merged): just bring Railway back. Railway → **Deployments** → **Redeploy** the last
good one (it rebuilds the same commit as before, not `main`; that is the known-good code). Supabase still has all the data; nothing was changed there. Total downtime: a few minutes.

**After B5** (the rewrite is live):

1. Revert the rewrite: on GitHub open the merged PR → **Revert**, and merge the revert PR. Wait for the Vercel
   deployment to be Ready. (Faster alternative: Vercel → **Deployments** → the last deployment before the switch
   → **⋯** → **Promote to Production** / **Instant Rollback**.)
2. Bring Railway back: **Redeploy** as above (same old commit, not `main`). It still points at Supabase. Remember
   Railway has no auto-deploy from `main`, so it will not pick up newer code on its own. If its Healthcheck Path is
   `/health`, see the pre-check in step 0.5.
3. Smoke test `https://www.buildcity.in` again.

**Orders written on the new database in the meantime are not on Supabase.** Before you go back, list them:

Coolify → `buildcity-db` → **Terminal**, then:

```sh
psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "select \"orderNumber\", \"createdAt\", status from orders where \"createdAt\" > '<time>' order by \"createdAt\";"
```

Replace `<time>` with the cutover time, like `2026-10-18 00:30+05:30`. If the command says the table or column is not found, check the names in `server/prisma/schema.prisma` (`@@map`). Then:

- A few orders: re-enter them by hand in the admin panel after rollback, and message those customers.
- Many orders, wallet top-ups, or new users: **do not guess**. Keep the new database as is (do not wipe it), and ask
  the Office Manager for a one-off script to copy those rows back to Supabase.

Never run `restore.sh` into Supabase; it refuses to anyway.

---

## Phase C: Clean up

### C1. Nightly backups to the cloud bucket (do it the same week)

1. Coolify → **Storages** (or **Settings** → **S3 Storages**) → **+ Add** → fill in the bucket details from step 0.4
   (endpoint, bucket, region, access key ID, secret) → **Validate Connection** → **Save**.
2. Coolify → `buildcity-db` → **Backups** → **+ New Scheduled Backup**:
   - **Frequency**: `0 2 * * *` (every night at 2:00)
   - **Save to S3**: on, choose the storage from the step above.
   - **Retention**: keep 14 days locally and 30 days in S3 (the retention fields on that page).
3. Click **Backup Now** once and see the file appear in the bucket.

**Restore test (do not skip: a backup you never restored is a hope, not a backup).**

1. Create a throwaway database in Coolify (`+ New` → Database → PostgreSQL, name `restore-test`) with the same
   major version.
2. Download the newest backup from the bucket, then restore it into `restore-test` with `restore.sh`
   (use its own URL as `TARGET_DATABASE_URL`).
3. Run `$VERIFY` with `SOURCE_DATABASE_URL` = `buildcity-db` and `TARGET_DATABASE_URL` = `restore-test`.
   It should say PASS (small differences are fine if orders came in since the backup).
4. Delete `restore-test` in Coolify.

Once C1 is done, the **Invoices work can start**.

### C2. Turn Railway off after about 14 days

Keep Railway **stopped** and **do not delete** it, for about 14 days. **Never run Railway against Supabase after B2**:
old apps would write to the stale database (split-brain, silent data loss). Its only use is a full rollback (see the
Rollback section). During this time:

- Coolify → `buildcity-api` → **Logs**: look for errors every day or two.
- Old apps with Railway built in as a fallback will only use it if `www.buildcity.in` fails. If you see no problems
  for 14 days, delete the Railway service.

### C3. Pause Supabase, do not delete it, for 30 days

Supabase dashboard → the project → **Settings** → **General** → **Pause project**. Keep it paused for **30 days**
as a last copy of the old data, then delete it. The final dump from B2 is also in your off-site bucket (upload it
there once, privately).

### C4. Update the notes

Tell the Office Manager when each is done, so `docs` and the monitor stop mentioning Railway and Supabase.

---

## Cheat sheet

| Thing | Where |
|-------|-------|
| Coolify | https://coolify.buildcity.cloud |
| New API | https://api.buildcity.cloud (health: `/health`) |
| Website | https://www.buildcity.in (Vercel) |
| Scripts | `server/scripts/migration/` (`dump.sh`, `restore.sh`, `verify.js`, `README.md`) |
| Merge order | #11, #14, #13 merged (done) → A → B5: #12 + `vercel.json` rewrite; #15 (this guide) any time |
| Time budget | Phase A: 1-2 hours, Phase B: ~10 minutes of downtime, Phase C: spread over 30 days |
