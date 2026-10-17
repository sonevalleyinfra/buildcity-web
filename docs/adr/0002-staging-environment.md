# ADR 0002: Staging environment and full-app test gate

- Status: Proposed
- Date: 2026-10-17
- Kanban: t_9b3a4725 (plan t_06b42ebc)
- Owner request: "setup staging and testing setup, so that we test full app before deployment"

## Context

Today every merge to `main` goes straight to production: Vercel builds www.buildcity.in, and the Coolify app
`buildcity-api` (api.buildcity.cloud, `/server`, Dockerfile, DB `buildcity-db`) does a rolling deploy. Nothing tests
the web app, the partner app and the API together before that happens.

Code facts this design depends on:

| Fact | Where | Why it matters |
|---|---|---|
| Static rewrite `/api/v1/:path*` → `https://api.buildcity.cloud` | `vercel.json` | Every Vercel PR preview talks to the **production** API and DB. |
| `API_BASE_URL = VITE_API_URL \|\| (native ? www.buildcity.in : "")` | `src/config/api.js` | Browser uses the relative path, so the rewrite decides the backend. |
| `BACKEND_DIRECT_URL` defaults to `https://api.buildcity.cloud`; network-error failover and a 401 retry go to it, or to the hardcoded `PRODUCTION_WEB_URL` | `src/config/authFetch.js` | Setting `VITE_API_URL` alone does **not** isolate a build. A failed or 401 request falls back to prod. |
| SMS: direct gateway, then a relay at the hardcoded `https://buildcity-web-part-2.vercel.app/api/sms`, then HTTPS | `server/src/smsService.js`, `api/sms.js` | The relay is the prod Vercel project, so a staging API with gateway creds would still send real SMS. |
| FCM: credentials come from `FIREBASE_SERVICE_ACCOUNT`; tokens are stored in `vendor_fcm_tokens`, `customer_fcm_tokens` and the `DATA_DIR` JSON file | `server/src/pushService.js` | A prod copy carries real device tokens. |
| No other outbound side effects (`KEEP_ALIVE_URL` is unset; no mail, no payments) | `server/src/index.js` | SMS and FCM are the only things to neutralise. |
| OTP accepts any `^\d{10}$`; real Indian mobiles start with 6-9; `9999999999` / `7777777777` are hardcoded staff numbers | `index.js:1622`, `Login.jsx:168` | Numbers starting with `1` are valid input but can never be real phones, so they work as a test range. |
| PII columns: `users.phone/name/email/password`, `vendors.ownerName/phone/password`, `district_representatives.name/phone/password`, `addresses.fullName/phone/street`, `order_returns.customerPhone/customerName/drPhone`, `reviews.name`, `audit_logs.details`, `notifications.message`, `otp_verifications`, both FCM token tables | `server/prisma/schema.prisma`, `pushService.js` | This is the anonymiser's scope. |
| Android: one project, flavours `customer` (`com.buildcity.app`, bundled) and `partner` (`com.buildcity.vendor`, webview of `www.buildcity.in/vendor/login`, OTA from `www.buildcity.in/api/ota-vendor`) | `scripts/android.mjs`, `src/utils/otaUpdater.js` | Staging app builds need their own IDs and URLs. |
| Shipped Android apps call `www.buildcity.in` | `api.js` | The API must stay backward compatible with the current web and app builds. |
| Repo is **public**, user-owned; no `.github/workflows`; no branch protection on `main` | `gh api` | Actions minutes are free. Artifacts are publicly downloadable, so they may only contain staging data. |
| VPS: 8 GB RAM, ~5 GB free; Coolify 4.3.23; wildcard `*.buildcity.cloud`. API needs ~300-500 MB, Postgres ~300 MB, a build briefly 1 GB+ | task brief, `docs/MIGRATION-VPS.md` | Sizing for decision 1. |

## Decision summary

1. **One long-lived staging environment** (`buildcity-api-staging` + `buildcity-db-staging` + `staging.buildcity.in`).
   No per-PR backends.
2. **Host-scoped rewrites in `vercel.json`**: only the production hosts proxy to the prod API. Every other host
   (previews, staging) proxies to `api-staging.buildcity.cloud`. The build target comes from `VERCEL_ENV`, and a
   build that mixes targets fails. The API refuses to boot if `APP_ENV` and the database's own env marker disagree.
3. **`main` becomes staging, and a new `production` branch is prod.** A PR merges to `main` after `ci` + `e2e-local`
   (full stack in CI). `main` auto-deploys staging, and `e2e-staging` runs on that SHA. Production moves only by
   fast-forwarding `production` to a SHA whose `e2e-staging` check passed.
4. **Staging data is an anonymised prod copy**, refreshed on demand by one script that can only write to the staging
   server. Catalog tables are copied as they are; people tables are rewritten; tokens, OTPs, logs and passwords are
   dropped. Verification queries must return 0, or the refresh aborts.
5. **Side effects are off unless the API is provably prod**: `APP_ENV=production` **and** DB marker `production`.
   Anywhere else, SMS never leaves the process, only test numbers `10000xxxxx` can log in (fixed OTP), and FCM runs
   only with a Firebase project whose id ends in `-staging`.
6. **Mobile is phase 2**: separate `*.staging` app IDs, distributed with Firebase App Distribution, not Play tracks.
   In phase 1, Playwright covers the partner app (it is the website plus a UA marker) and the customer web build.
7. **Playwright**: `e2e-local` runs on every PR (required on `main`) and `e2e-staging` on every staging deploy
   (required on `production`). Both run the same smoke suite.
8. One batched owner-actions list, in [§8](#8-owner-actions-one-batch).

---

## 1. Environment shape

| Option | Extra RAM | DB | Frontend ↔ backend wiring | Verdict |
|---|---|---|---|---|
| **A. Single long-lived staging** (API + Postgres) | API 300-500 MB (cap 768 MB) + Postgres ~300 MB (cap 512 MB) ≈ **0.6-0.8 GB steady**; builds ~1 GB transient, one per merge to `main` (prod builds move to promotions, so the build count barely changes) | 1 extra DB, roughly prod size ×2 on disk during a refresh, no R2 backups (disposable) | Static: every non-prod host → `api-staging` | **Chosen** |
| B. Coolify per-PR preview deployments of the API | +300-500 MB **per open PR**, unbounded on ~5 GB free | Coolify previews share the parent's env, so they all share one staging DB anyway; a DB per PR is manual | The Vercel preview cannot know its PR's API URL (`vercel.json` is static; branch-specific env vars are manual), so it needs custom routing code | Rejected: RAM is unbounded, the "isolation" is fake because the DB is shared, and the wiring is fragile |
| C. Both | A + B | A + B | A + B | Rejected: B's cost with no gain over A + `e2e-local` (decision 3), which already tests each PR's backend and frontend together |

Money: ₹0 extra. Existing VPS; Vercel preview domain on the existing project; Actions free on a public repo; Firebase
Spark (phase 2).

Resource caps (Coolify "Resource limits") keep staging from starving prod: API 768 MB, DB 512 MB
(`shared_buffers=128MB`). If VPS `available` RAM drops under 1.5 GB, stop `buildcity-api-staging` first; it is
disposable.

Names:

| | Production | Staging |
|---|---|---|
| Web | `https://www.buildcity.in` (+ `buildcity.in`, `buildcity-web-part-2.vercel.app`) | `https://staging.buildcity.in` (Vercel domain bound to git branch `main`) + PR previews `*-sone-valley.vercel.app` |
| API | Coolify `buildcity-api`, `https://api.buildcity.cloud`, branch `production` | Coolify `buildcity-api-staging`, `https://api-staging.buildcity.cloud`, branch `main` |
| DB | `buildcity-db`, database `buildcity`, marker `production` | `buildcity-db-staging`, database `buildcity_staging`, marker `staging` |
| `APP_ENV` | `production` | `staging` |

## 2. Previews and staging never reach prod

The guarantee has three independent layers. Each one alone blocks the preview → prod path.

**Layer 1: routing (`vercel.json`).** Rewrites are matched in order, and `has` limits a rule to one host:

```json
{ "source": "/api/v1/:path*", "has": [{ "type": "host", "value": "www.buildcity.in" }], "destination": "https://api.buildcity.cloud/api/v1/:path*" },
{ "source": "/api/v1/:path*", "has": [{ "type": "host", "value": "buildcity.in" }], "destination": "https://api.buildcity.cloud/api/v1/:path*" },
{ "source": "/api/v1/:path*", "has": [{ "type": "host", "value": "buildcity-web-part-2.vercel.app" }], "destination": "https://api.buildcity.cloud/api/v1/:path*" },
{ "source": "/api/v1/:path*", "destination": "https://api-staging.buildcity.cloud/api/v1/:path*" }
```

The default rule goes to staging, so it fails closed: a host nobody listed can never reach prod. Before
`api-staging` exists, previews get a gateway error instead of prod data, which is the intended state.
Preview hosts (`buildcity-web-part-2-<hash>-sone-valley.vercel.app`, `...-git-<branch>-...`) never equal the
production alias exactly. Also add `X-Robots-Tag: noindex` for `staging.buildcity.in`. Make `api/sms.js` return 404
unless `VERCEL_ENV === "production"`.

**Layer 2: build target (frontend).** `vite.config.js` derives `__BC_TARGET__`:

- `VERCEL_ENV=production` → `production`
- `VERCEL_ENV` = `preview` or `development` → `staging`
- `VERCEL=1` with `VERCEL_ENV` missing → **build fails**
- no `VERCEL` (local, Android): `--mode staging` / `BUILDCITY_TARGET=staging` → `staging`, otherwise `production`.
  This keeps today's Android release builds unchanged; staging app builds pass `--staging` explicitly.

`src/config/api.js` picks `{ webUrl, apiDirectUrl }` from a two-row table by target. `authFetch.js` failover and the
401 retry use only that table, never a hardcoded prod URL. `VITE_API_URL` / `VITE_BACKEND_DIRECT_URL` overrides stay
allowed, but the build **fails** if a `staging` build names a prod host or a `production` build names a staging host.
`localhost` is allowed for both. No Vercel env vars are needed.

**Layer 3: API boot guard (backend).** New required env `APP_ENV` ∈ `production | staging | test | development`.
At boot the API reads the database's own marker: `SELECT current_setting('buildcity.env', true)`, set once per
database with `ALTER DATABASE ... SET buildcity.env = '<env>'`. A database-level setting is **not** copied by
`pg_dump`/`pg_restore` without `--create`, which restore.sh doesn't use (checked on a local postgres:17: the restored
database returned no marker while the source returned `production`). A raw prod dump restored anywhere therefore
arrives without a `production` marker.

| `APP_ENV` | Required marker | Otherwise |
|---|---|---|
| `production` | `production` | `process.exit(1)` |
| `staging` | `staging` | `process.exit(1)`. Staging pointed at the prod DB can't start. |
| `test` / `development` | none, but `DATABASE_URL` host must be `localhost`/`127.0.0.1` (as `server/tests/run.js` already does) | `process.exit(1)` |
| missing or other | | `process.exit(1)` |

A failed boot is safe: Coolify's rolling deploy keeps the old container when the new one is unhealthy. The guard ships
only after `APP_ENV=production` and the prod marker are set ([§8](#8-owner-actions-one-batch) items 1-2).

New public endpoint `GET /api/v1/env` → `{ "env": APP_ENV, "db": <marker or "test">, "commit": SOURCE_COMMIT|null }`.
It holds no secrets (the repo is public anyway).

**Proof that a preview write lands only in staging:**

1. Every Playwright run starts with a global setup that calls `<baseURL>/api/v1/env` and **aborts the whole run before
   any request that writes** unless it gets `env ∈ {staging, test}` and `db ∈ {staging, test}`. It also refuses a
   base URL whose host is a prod host.
2. `preview-isolation` check on every PR preview (`deployment_status`): `GET <preview>/api/v1/env` must return
   `staging/staging`.
3. Write probe in the suite: register test customer `10000NNNNN` (unique per run) through the preview or staging web,
   then read it back with the staging admin API.
4. Read-only prod check (Office Manager, after the first green preview and after any change to `vercel.json`):
   `SELECT count(*) FROM users WHERE phone LIKE '1%';` on `buildcity-db` must return `0`.
   No test number can exist in prod unless a test wrote to prod.

Rejected:
- *Vercel Preview env `VITE_API_URL` + staging CORS only*: the static rewrite still proxies relative calls to prod,
  and the `authFetch` failover still falls back to prod. It depends on one dashboard setting with no test.
- *Edge/routing middleware choosing the backend*: adds an invocation and latency to **every** prod API call, puts new
  code on the prod hot path, and gives no extra safety over a static host match.
- *Generated `vercel.json` / Build Output API at build time*: Vercel reads rewrites before the build. The Build
  Output API means owning the whole output config, which is a big blast radius.
- *Prod API rejecting preview `Origin`s*: proxied requests are same-origin to the browser, and the `cors` package
  doesn't block on the server. A real block needs new prod middleware with a log-only phase. Layers 1-3 already
  cover it. Revisit only if a hole appears.

## 3. Promotion flow and required checks

```
PR ──ci + e2e-local + preview-isolation (required)──▶ main ══auto══▶ staging (web + API)
                                                         └─ e2e-staging on that SHA (commit check)
production ◀── fast-forward to a SHA with green e2e-staging (owner-approved, Office Manager runs it) ══auto══▶ prod
```

- **Backend and frontend change together, in one PR.** `e2e-local` (a required check on `main`) builds that PR's web
  app and API in CI, with Postgres 17, `APP_ENV=test` and the seed accounts, then runs the full Playwright smoke suite.
  This is the pre-merge "full app" test, and it needs no shared environment.
- **Staging** tests what CI can't: the real Coolify image, Vercel rewrites, the anonymised real catalog, and
  migrations against real data shapes. It runs on the merged SHA, which is exactly the code that would ship.
- **Required checks:** `main`: PR required + `ci`, `e2e-local`, `preview-isolation`. `production`: status `e2e-staging`
  required, admins included, no force push, no deletion. GitHub enforces required checks on direct pushes, so an
  untested SHA can't land on `production`. Bots never push to `production` (office rule, like "never merge").
- **Promotion:** `scripts/promote.sh <sha>` (Office Manager, after the owner says ship): checks that the SHA is on
  `main`, that `e2e-staging` passed on it and that the fast-forward is possible, then runs
  `git push origin <sha>:refs/heads/production`. Vercel (production branch = `production`) and Coolify `buildcity-api`
  (branch = `production`) both deploy that SHA. Afterwards, read-only prod smoke: `/health`, `/api/v1/env` =
  `production/production`, home page 200.
- **Rollback:** `revert:` PR on `main` → staging → promote. Emergency: Vercel Instant Rollback and Coolify redeploy
  of the previous deployment (owner/Office Manager). `production` is never force-pushed.
- **Red `main`:** if `e2e-staging` fails, the last green SHA is still promotable. Fix forward or revert. The monitor
  reports a red `e2e-staging` on `main` HEAD.
- **Compatibility rule:** the API must stay backward compatible with the deployed web build and the shipped Android
  apps (already required by the shipped APKs). Remove anything in a later PR (expand/contract).

Rejected:
- *Brief's flow, staging deploys the PR head before merge*: one shared staging means queueing PRs and a Coolify write
  token in a public repo's CI. Worse, two PRs that pass alone are never tested **merged**, which is exactly what
  ships. It needs a merge queue to be correct.
- *Long-lived `staging` branch that PRs merge into, then staging → main*: two merges per change, drift and
  back-merge conflicts. A fast-forward-only `production` branch can't drift.
- *Tags/releases as the prod trigger*: Vercel's production deploy follows a branch, not tags. That would need a CLI
  deploy and a Vercel token in CI.

Effect on office rules: merging to `main` no longer touches prod. Promotion becomes the owner-approved deploy step.
Merges to `main` keep today's approval rule until the owner changes it.

## 4. Staging data

**Shape:** anonymised prod copy, on demand (suggested monthly, or before a big release). Never staging → prod: no
script exists for that direction, and the staging DB has no R2 backup, so a staging dump can't be restored to prod by
mistake.

**Pipeline** (`server/scripts/staging/refresh.sh`, run on the VPS by the Office Manager or owner. Raw data never
leaves the VPS):
1. `migration/dump.sh` from `buildcity-db` (read-only).
2. Restore into a **new temporary database** `buildcity_staging_tmp` on `buildcity-db-staging`. This reuses
   `restore.sh`'s guards. It also refuses when the target host is `buildcity-db`'s service name or IP, when the
   target server is the source server, or when the target database has marker `production`.
3. `anonymise.sql` in one transaction.
4. `verify-anon.sql`: every check must return 0, or the tmp database is dropped and the refresh exits non-zero.
5. `seed-test-accounts.js`: E2E accounts and catalog (below).
6. Swap: stop `buildcity-api-staging`, drop `buildcity_staging`, rename tmp → `buildcity_staging`,
   `ALTER DATABASE buildcity_staging SET buildcity.env='staging'`, start the API. Delete the dump file.

**Rules (`anonymise.sql`):**

| Data | Treatment |
|---|---|
| Regions, categories, product_master, product_images, vendor_products, banners, coupons, app_settings | copied as is (catalog/public) |
| `vendors.shopName` | kept (public storefront names) |
| All phones (users, vendors, DRs, addresses, order_returns.customerPhone/drPhone) | one mapping table over distinct normalised 10-digit numbers: `'2' \|\| lpad(n, 9, '0')`. Updates join on `right(regexp_replace(phone,'\D','','g'),10)`, so links across tables survive (vendor↔user by phone). `9999999999`, `7777777777` kept (hardcoded fake staff numbers). |
| `users.name` → `Test User <n>`; `users.email` → `u<n>@example.invalid` or null; `users.password` → null | |
| `vendors.ownerName` → `Owner <n>`; `district_representatives.name` → `DR <n>`; all staff `password` → null (only seeded test staff can log in) | |
| `addresses.fullName` → `Customer <n>`, `street` → `Street <n>` (city, state, pincode kept) | |
| `order_returns.customerName` → mapped name; `reviews.name` → `Reviewer <n>` | |
| `otp_verifications`, `vendor_fcm_tokens`, `customer_fcm_tokens`, `audit_logs`, `notifications` | `TRUNCATE` |
| Orders, items, wallet ledger, returns amounts | kept (no PII after the mappings above) |

Staging's `DATA_DIR` volume is its own, so it never holds prod's `vendor-fcm-tokens.json`.

**Seed (`seed-test-accounts.js`, idempotent; also used by `e2e-local` on an empty DB):** region `E2E Region`; vendor
`1000000001` (approved, password `E2E_VENDOR_PASSWORD`) with product `E2E Test Cement 50kg` priced above
`minOrderForCashback`; DR `1000000002` (`E2E_DR_PASSWORD`) in the same region; admin `1000000003`
(`E2E_ADMIN_PASSWORD`). Customers are registered by the tests themselves.

**"No real phone" verification (`verify-anon.sql`), must return 0 rows:**

```sql
-- 1. Known phone columns: anything that isn't an anonymised, test or hardcoded-staff number
WITH p(t, v) AS (
  SELECT 'users', phone FROM users
  UNION ALL SELECT 'vendors', phone FROM vendors
  UNION ALL SELECT 'district_representatives', phone FROM district_representatives
  UNION ALL SELECT 'addresses', phone FROM addresses
  UNION ALL SELECT 'order_returns.customer', "customerPhone" FROM order_returns
  UNION ALL SELECT 'order_returns.dr', "drPhone" FROM order_returns
)
SELECT t, v FROM p
WHERE v IS NOT NULL
  AND right(regexp_replace(v, '\D', '', 'g'), 10) !~ '^(2[0-9]{9}|10000[0-9]{5}|9999999999|7777777777)$';

-- 2. Every text/varchar/json/jsonb column in public: no 10-digit 6-9 mobile and no real-looking email anywhere
DO $$
DECLARE r record; n bigint; bad bigint := 0;
BEGIN
  FOR r IN SELECT table_name, column_name FROM information_schema.columns
           WHERE table_schema = 'public' AND data_type IN ('text','character varying','json','jsonb') LOOP
    EXECUTE format(
      $q$SELECT count(*) FROM %I WHERE (%I)::text ~ '(^|[^0-9])[6-9][0-9]{9}([^0-9]|$)'
           AND (%I)::text !~ '^(9999999999|7777777777)$'$q$, r.table_name, r.column_name, r.column_name) INTO n;
    IF n > 0 THEN RAISE WARNING 'phone-like value: %.% (% rows)', r.table_name, r.column_name, n; bad := bad + n; END IF;
    EXECUTE format(
      $q$SELECT count(*) FROM %I WHERE (%I)::text ~* '[a-z0-9._%%+-]+@[a-z0-9-]+\.[a-z.]{2,}'
           AND (%I)::text !~* '@example\.invalid'$q$, r.table_name, r.column_name, r.column_name) INTO n;
    IF n > 0 THEN RAISE WARNING 'email-like value: %.% (% rows)', r.table_name, r.column_name, n; bad := bad + n; END IF;
  END LOOP;
  IF bad > 0 THEN RAISE EXCEPTION 'anonymisation check failed: % values', bad; END IF;
END $$;

-- 3. Tables that must be empty
SELECT 'otp' t, count(*) FROM otp_verifications HAVING count(*) > 0
UNION ALL SELECT 'vendor_fcm', count(*) FROM vendor_fcm_tokens HAVING count(*) > 0
UNION ALL SELECT 'customer_fcm', count(*) FROM customer_fcm_tokens HAVING count(*) > 0;
```

The generic scan was run on a local postgres:17 with a 6-9 phone in `users.phone` and in a free-text column: both were
reported and the block raised. It may also flag a catalog value (e.g. a GSTIN or a product code with 10 digits). Fix those cases with
explicit rules in `anonymise.sql`, never by loosening the regex.

Rejected:
- *Synthetic seed only*: no PII risk, but it misses bugs that only show up with real catalog and order shapes. It is
  still what `e2e-local` uses.
- *Raw prod copy*: PII leaves the prod DB, and real FCM tokens plus phones make "never message a real user"
  depend on config alone.
- *Anonymising during `pg_dump` (masking extension, or a dump filter)*: needs an extension on prod
  (`postgresql_anonymizer`), or tooling we'd have to build and trust. SQL on an isolated tmp DB is simpler to review
  and test.

Cost: one dump/restore per refresh (minutes), plus disk ≈ prod size ×2 on the staging server during the swap.

## 5. Side-effect safety (fail closed)

New `server/src/appEnv.js` exports `isProduction()`. It returns true only after the boot guard has confirmed
`APP_ENV=production` **and** marker `production`. Every side effect asks it. Nothing reads `NODE_ENV` for this.

| Side effect | Production | Anything else (staging, test, dev, misconfigured) |
|---|---|---|
| SMS (`sendRealSMSOTP`, including the hardcoded relay) | unchanged | returns `{ success: true, sandbox: true }` **before** any network call. Gateway creds are ignored even if set. |
| OTP request | unchanged | phone must match `^10000\d{5}$`, else `403 "Staging: use a test number"`. The OTP is the code constant `STAGING_OTP = "246810"` (not env, so a misconfig can't change it). |
| FCM | unchanged | sent only if a service account is set **and** its `project_id` ends with `-staging`. Otherwise logged as sandboxed. |
| Outbox | none | in-memory ring buffer (last 200) of sandboxed SMS/push payloads. `GET /api/v1/_staging/outbox` (ADMIN), **registered only when not production**, lets E2E assert that "vendor was notified". |

Why a misconfiguration can't message a real user: prod gateway creds pasted into staging are ignored (not
production). `APP_ENV=production` pasted into staging can't boot (marker `staging`). A staging API pointed at the prod
DB can't boot (marker `production` ≠ `staging`). Copied FCM tokens don't exist (truncated), and the prod Firebase
project doesn't end with `-staging`. Real phones don't exist in staging data, and OTP refuses them.

Rejected:
- *Fake creds or an empty `SMS_*` on staging*: depends on config, and that is the thing that fails.
- *A separate staging SMS sender account*: costs money and DLT template work, and still messages whoever is in
  the data.
- *An allow-list of real tester phones that get real SMS*: a real phone number in staging config is a step towards
  "message a real user". Real SMS delivery is checked in the prod smoke after promotion.

## 6. Mobile (phase 2)

- Add a second flavour dimension `env` (`prod`, `staging`). Staging variants: `com.buildcity.app.staging`
  ("BuildCity STG") and `com.buildcity.vendor.staging` ("Partner STG"), so they install next to the real apps.
- `scripts/android.mjs <app> --staging`: Vite target `staging`. Partner `server.url` =
  `https://staging.buildcity.in/vendor/login`, `allowNavigation` = staging host, OTA `updateUrl` from the target
  table (the hardcoded `www.buildcity.in` in `otaUpdater.js` moves into the table).
- Push: Firebase project `buildcity-staging` (Spark, free) with both staging app IDs; its `google-services.json` per
  flavour (`android/app/src/<flavour>Staging/`). The staging API gets that project's service account (it passes the
  `-staging` rule).
- Distribution: Firebase App Distribution to named testers.
- Rejected: *Play internal track of the prod app IDs*: a staging build would replace the real app on a tester's phone,
  and one click promotes it to production. *New Play listings for `.staging` IDs*: store setup and review for
  throwaway apps.

Phase-1 coverage: the partner app is the website with UA marker `BuildCityPartner`. Playwright sets that UA to render
vendor mode, and runs the customer flow at a mobile viewport. Not covered until phase 2: native push delivery, OTA,
status bar and the back button.

## 7. Automated E2E (Playwright)

- `e2e/` at the repo root, `@playwright/test` (devDependency, root `package.json`, npm), Chromium only, one worker,
  serial, budget < 8 min. `trace: retain-on-failure`, HTML report artifact kept 7 days (public repo: staging/test
  data only, never prod).
- Global setup = the isolation guard from §2 (aborts unless `env/db ∈ {staging,test}`; refuses prod hosts).
- Smoke specs, in order, sharing one run id:
  1. `customer-auth`: register and log in with OTP as `10000` + 5 digits from the run id, using `STAGING_OTP`.
  2. `browse-cart-cod`: home → category → `E2E Test Cement 50kg` → cart → checkout with a new address in `E2E Region`
     → COD → order placed. Writes the order id to the shared state.
  3. `vendor-accepts`: `/vendor/login` with the partner UA, as vendor `1000000001` → order visible → accept. The
     outbox has a push for that order.
  4. `dr-delivers-returns`: DR `1000000002` → out for delivery → delivered → records a 1-item return.
  5. `wallet`: the customer's wallet page balance equals the `/api/v1/wallet` ledger sum, and a cashback entry exists
     if `/api/v1/settings/wallet` says it should. The order page shows delivered plus the return.
- Workflows:
  - `ci.yml` (PR + push `main`): `npm ci`, `npm run lint`, `npm run build`, `server` tests
    (`npm run test:security` against a `postgres:17` service, `APP_ENV=test`), `npm run test:migration`.
  - `e2e-local` job (PR): Postgres service → `prisma db push` → seed → API (`APP_ENV=test`) + `vite preview`
    (with `VITE_API_URL` pointing at the local API) → Playwright.
  - `preview-isolation.yml` (`deployment_status`, Preview, success, not `main`): curl `/api/v1/env` = `staging`.
  - `e2e-staging.yml` (push `main`, concurrency `staging`, cancel-in-progress): wait until the Vercel deployment
    for that SHA succeeds and `api-staging /api/v1/env.commit == SHA` (timeout 20 min), then run Playwright on
    `https://staging.buildcity.in`. The job check `e2e-staging` lands on the merge commit, so it shows on the merged
    PR.
- No Coolify or Vercel tokens in GitHub. CI only reads public endpoints and the GitHub deployments API. Secrets: the
  three E2E passwords (staging-only accounts).
- Test data piles up in staging until the next refresh. That's acceptable at this volume.

Rejected: *Cypress* (slower, no multi-context partner/customer in one run); *E2E against PR previews as the gate*
(previews use main's backend, so a PR that changes both sides fails for the wrong reason. `e2e-local` tests the PR's
own backend); *E2E on prod* (writes real orders, which office rules forbid).

## 8. Owner actions (one batch)

Ordered by when they are needed. Nothing here is done by bots.

**Batch A: before the backend guard PRs merge (prod, small):**
1. Coolify `buildcity-api` → Environment: add `APP_ENV=production`. No redeploy needed until the next merge.
2. Prod DB marker (the Office Manager can run it with delegated access, or the owner):
   `ALTER DATABASE buildcity SET buildcity.env = 'production';`, then check it with
   `SELECT current_setting('buildcity.env', true);` in a new session → `production`.

**Batch B: staging resources (no prod impact):**
3. Coolify: new **Postgres 17** `buildcity-db-staging`, database `buildcity_staging`, memory limit 512 MB, **no**
   S3 backup. Then `ALTER DATABASE buildcity_staging SET buildcity.env = 'staging';`.
4. Coolify: new **application** `buildcity-api-staging` (new resource, **not "Clone"**, because a clone copies
   prod env). Repo `sonevalleyinfra/buildcity-web`, branch `main`, base dir `/server`, Dockerfile, domain
   `https://api-staging.buildcity.cloud`, healthcheck as prod, memory limit 768 MB, persistent volume `/data`,
   **Include Source Commit in Build: on**. Env: `APP_ENV=staging`, `DATABASE_URL` + `DIRECT_URL` = the internal URL
   of `buildcity-db-staging`, `JWT_SECRET` = **new** random value (never prod's: with the same secret, a staging
   token would work on prod, because user IDs are copied), `PORT=5000`, `DATA_DIR=/data`. **Do not add** `SMS_*`,
   `SMS_RELAY_SECRET`, `FIREBASE_SERVICE_ACCOUNT` or `KEEP_ALIVE_URL`.
5. GitHub repo secrets: `E2E_VENDOR_PASSWORD`, `E2E_DR_PASSWORD`, `E2E_ADMIN_PASSWORD` (random). Give the same values
   to whoever runs the refresh (env on the VPS, never in chat).
6. Data refresh access: either (a) the Office Manager runs `refresh.sh` with scoped delegated SSH (prod read +
   staging write) for that run only, or (b) the owner runs one command. Pick one.
7. DNS: `staging.buildcity.in` CNAME `cname.vercel-dns.com` (at the buildcity.in DNS host). Vercel → project →
   Domains: add `staging.buildcity.in`, git branch `main`. Settings → Environment Variables: confirm "Automatically
   expose System Environment Variables" is on. No new env vars.
8. GitHub branch protection `main`: require a PR, required checks `ci`, `e2e-local`, `preview-isolation`.

**Batch C: the flip (once staging is green on previews; one sitting, same minutes):**
9. Create branch `production` at the current green `main` SHA. Protection: required check `e2e-staging`, include
   administrators, block force pushes and deletion.
10. Vercel → Settings → Git → Production Branch: `main` → `production`.
11. Coolify `buildcity-api` → Git branch: `main` → `production`.
12. Afterwards, the Office Manager verifies: a merge to `main` deploys only staging; `www.buildcity.in/api/v1/env` =
    `production/production`; `staging.buildcity.in/api/v1/env` = `staging/staging`; a staging JWT gets 401 on prod
    `/api/v1/orders/me`; the prod query from §2 step 4 returns 0.

**Phase 2 (mobile):**
13. Firebase project `buildcity-staging` with Android apps `com.buildcity.app.staging` and
    `com.buildcity.vendor.staging`; App Distribution testers; staging service account → `buildcity-api-staging`
    `FIREBASE_SERVICE_ACCOUNT`.

SMS: nothing to configure. Staging never sends SMS.

## Risks

- **Flip ordering:** if Coolify is switched to `production` but Vercel isn't (or the reverse), web and API ship from
  different branches. Do items 10-11 together and verify with item 12.
- **Previews lose their API** between task S1 and staging going live (gateway error). This is intended (fail closed),
  but anyone looking at UI on previews meanwhile sees empty data.
- **`buildcity-web-part-2.vercel.app` is used as the production alias** by the SMS relay. It is listed as a prod host
  in layer 1. If Vercel adds another prod alias, it falls to staging (fail closed), and the prod smoke catches it.
- **Generic PII scan false positives** can block a refresh. That is by design; add an explicit rule.
- **RAM:** staging builds overlapping prod builds on the VPS. Limits in §1; stop staging first under pressure.
- **Push-time enforcement of required checks:** prove it once at setup (push an untested commit to `production` → must
  be rejected) before relying on it.
- **"Include Source Commit in Build"**: if Coolify 4.3.23 doesn't set `SOURCE_COMMIT`, `e2e-staging` instead waits for
  the Coolify deploy via `/api/v1/env.commit` being null plus a 5-min settle. S8 must check this first.

## Task split

Each task is under half a day. Each needs a qa task after it (key `buildcity-web-qa-pr<N>`). **GK** = gatekeeper
(risky path). Titles start with `Staging:`. Order = dependency order.

**S1. `Staging: cut preview→prod API path (host-scoped rewrites, build target)`** (GK: prod routing, env handling)
- Goal: no non-prod build or host can reach `api.buildcity.cloud` (§2 layers 1-2).
- Context: `vercel.json`, `vite.config.js`, `src/config/api.js`, `src/config/authFetch.js`, `api/sms.js`.
- Acceptance:
  - [ ] `vercel.json` has the 4 `/api/v1` rules from §2 in that order, the SPA and `/api/sms` rules unchanged, plus
        `X-Robots-Tag: noindex` for host `staging.buildcity.in`.
  - [ ] `node scripts/check-vercel-routes.mjs` (new, run in `npm run lint`) asserts: prod hosts → prod API, any
        other host → staging API, and no rule sends an unlisted host to `api.buildcity.cloud`.
  - [ ] `VERCEL=1 VERCEL_ENV=preview npm run build` passes, and `grep -r "api.buildcity.cloud\|https://www.buildcity.in" dist/assets/*.js` finds nothing.
  - [ ] `VERCEL=1 VERCEL_ENV=preview VITE_API_URL=https://api.buildcity.cloud npm run build` **fails** with a clear
        message, and so does `VERCEL=1` without `VERCEL_ENV`.
  - [ ] Plain `npm run build` (no `VERCEL`) still embeds the prod hosts (Android release builds unchanged).
  - [ ] `authFetch` failover and 401 retry use only the target table (no `PRODUCTION_WEB_URL` literal left in it).
  - [ ] `api/sms.js` returns 404 unless `VERCEL_ENV === "production"`.
  - [ ] After merge, the Office Manager checks: www API calls work; a preview's `/api/v1/...` doesn't reach prod
        (gateway error until staging exists).
- Out of scope: backend, staging resources, Android.

**S2. `Staging: APP_ENV + DB marker boot guard and /api/v1/env`** (GK: env handling). Merge gated on owner Batch A
items 1-2 being done.
- Goal: the API refuses to boot unless `APP_ENV` matches the DB marker (§2 layer 3).
- Context: `server/src/index.js` boot, new `server/src/appEnv.js`, `server/tests/run.js` (set `APP_ENV=test`).
- Acceptance:
  - [ ] Table in §2 implemented. Tests start the server for each row (production+no marker, staging+production
        marker, test+remote host, missing `APP_ENV`), and each exits 1 with a one-line reason and no secret printed.
  - [ ] `GET /api/v1/env` returns `{env, db, commit}`. Test env returns `test/test`.
  - [ ] `isProduction()` is exported, and is true only after a successful production boot check.
  - [ ] `npm run test:security` and `npm run test:migration` pass. The README env table and `.env.example` list
        `APP_ENV`.
- Out of scope: SMS/FCM changes (S3).

**S3. `Staging: fail-closed SMS/FCM sandbox, test-number OTP, outbox`** (GK: auth/OTP, env). Depends on S2.
- Goal: §5 table.
- Context: `server/src/smsService.js`, `server/src/pushService.js`, OTP routes `index.js:1622-1760`.
- Acceptance:
  - [ ] With `APP_ENV=test`, a test stubs `http.request`, `https.request` and `fetch` to throw, then calls an OTP
        request for `1000012345`: success, nothing called. `9876543210` → 403. `1000012345` + `246810` → token.
  - [ ] Push with no service account, or with a `project_id` not ending in `-staging`, is not sent and appears in
        the outbox. `/api/v1/_staging/outbox` needs ADMIN and is 404 when `isProduction()`. Unit test with injected
        env.
  - [ ] Production code path unchanged: a diff review plus a unit test with `isProduction()` stubbed true show the
        gateway is called.
- Out of scope: staging Firebase project (phase 2).

**S4a. `Staging: anonymiser + verification SQL`** (GK: DB tooling, PII). Independent of S2/S3.
- Goal: `server/scripts/staging/anonymise.sql` and `verify-anon.sql` per §4.
- Acceptance:
  - [ ] Test fixture: local Postgres (docker `postgres:17`, loopback port, `DUMMYPASS`) loaded with fake "real" rows
        (phones 6-9 in every phone column, a phone inside `notifications.message` and `audit_logs.details`, emails,
        FCM rows). After `anonymise.sql`, `verify-anon.sql` passes. Before it, `verify-anon.sql` fails, naming each
        column.
  - [ ] Phone links survive: a vendor whose phone equalled its user's phone still matches after mapping. `users.phone`
        stays unique.
  - [ ] Catalog row counts are unchanged, and the order/wallet sums are unchanged.
  - [ ] Runs in one transaction. Re-running it on anonymised data is a no-op that still passes verification.
- Out of scope: orchestration (S4b).

**S4b. `Staging: refresh.sh + seed-test-accounts.js`** (GK: DB tooling, destructive). Depends on S4a and S2.
- Goal: §4 pipeline steps 1-6 and the seed.
- Context: reuse `server/scripts/migration/_lib.sh`, `dump.sh`, `restore.sh` and their test shim style.
- Acceptance:
  - [ ] Refuses (exit 2): target host equal to the source host, a target database with marker `production`, target
        service name `buildcity-db`, or a missing `E2E_*` password env. Shim tests cover each case.
  - [ ] Dry run against two local containers: the tmp DB is created, anonymised, verified, swapped and marked
        `staging`. A failed verify drops tmp and leaves the old staging DB untouched.
  - [ ] The seed is idempotent and creates the §4 accounts and product. Passwords come only from env, never printed.
  - [ ] README: an owner-runnable single command; the dump file is deleted on exit (trap).
- Out of scope: running it against prod (Office Manager/owner after Batch B).

**S5. `Staging: CI workflow (ci check)`** (GK: workflows). Independent; can run in parallel with S1.
- Goal: `.github/workflows/ci.yml` per §7.
- Acceptance:
  - [ ] Green on its own PR: lint, build, `test:security` against a `postgres:17` service, `test:migration`.
  - [ ] Node version pinned to the Dockerfile's (22). `permissions: contents: read`. No secrets used.
- Out of scope: Playwright.

**S6a. `Staging: Playwright harness + e2e-local + customer specs`** (GK: workflows). Depends on S2, S3, S5, and the
S4b seed (or a local copy of it).
- Goal: `e2e/` harness, global isolation guard, specs 1-2, and the `e2e-local` job.
- Acceptance:
  - [ ] Global setup aborts before any test if `/api/v1/env` isn't staging/test, or if the host is a prod host
        (test: point it at a stub that returns `production` → the run fails with 0 tests executed).
  - [ ] `e2e-local` is green on the PR and runs under 8 min. Report artifact retention 7 days, trace on failure only.
  - [ ] `npm run e2e` runs locally against the same stack (documented in `e2e/README.md`).
- Out of scope: partner specs (S6b), staging workflow (S7).

**S6b. `Staging: partner E2E specs (vendor accept, DR deliver/return, wallet)`**. Depends on S6a.
- Acceptance:
  - [ ] Specs 3-5 from §7 pass in `e2e-local`. The vendor spec uses the `BuildCityPartner` UA and asserts the outbox
        push.
  - [ ] The whole suite is stable: 3 consecutive green runs.

**S7. `Staging: e2e-staging + preview-isolation workflows, promote.sh`** (GK: workflows, deploy path). Depends on
S6b, owner Batch B, and the first refresh.
- Acceptance:
  - [ ] `preview-isolation` is green on its own PR preview (needs staging live). A deliberately wrong expected value
        fails it.
  - [ ] `e2e-staging` is triggered from a test push to `main`, waits for the SHA on both hosts, and posts the check on
        the commit. Run it in `workflow_dispatch` mode first, before Batch C.
  - [ ] `scripts/promote.sh` refuses a SHA that isn't on `main`, a SHA without green `e2e-staging`, and a
        non-fast-forward. It prints the push command it would run in `--dry-run`. Tested with `gh` stubbed.
- Out of scope: running the flip (owner Batch C).

**S8 (phase 2). `Staging: Android staging flavours (customer + partner)`** (GK: build/signing config). Depends on S1
and owner item 13.
- Acceptance: `npm run android:customer -- --staging` / `android:partner -- --staging` produce `.staging` app IDs.
  The partner app opens `staging.buildcity.in/vendor/login`. OTA points at staging. Prod builds are byte-identical in
  config to before (diff the generated `capacitor.config.json`).

**Office Manager / non-dev steps (not dev tasks):** Batch A/B/C owner asks (one message). First refresh run. The §2
step 4 prod check. Lifting the preview hard rule after `preview-isolation` is green.

### dev-office skill changes (task `Staging: update dev-office skill`, Office Manager)

- buildcity-web row: prod deploys from branch `production` (Vercel + Coolify `buildcity-api`). `main` deploys staging
  (`staging.buildcity.in`, `buildcity-api-staging`, `buildcity-db-staging`).
- qa verifies UI and flows on **PR previews or `staging.buildcity.in` only**, after checking that `/api/v1/env` says
  `staging`. Never on prod, never on a preview whose `/api/v1/env` isn't `staging`. Test logins use `10000xxxxx` +
  OTP `246810` and the seeded partner accounts.
- Remove "Hard rule until staging exists" only after `preview-isolation` is green and the §2 step 4 prod query returns 0.
- Approval/release: "ship it" on buildcity-web = `scripts/promote.sh <sha>` (green `e2e-staging` required). After
  that, the read-only prod smoke. `gh pr merge` to `main` no longer deploys prod.
- Bots never push to `production`, never run `refresh.sh` against prod, and never copy prod env into a staging
  resource.
- Gatekeeper risky paths add `vercel.json`, `server/src/appEnv.js`, `server/scripts/staging/`, `e2e/global-setup.*`.
- Monitor: report a red `e2e-staging` on `main` HEAD. Uptime adds `https://api-staging.buildcity.cloud/health`
  (non-paging).
