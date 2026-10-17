# Staging: testing a change end to end

Design and reasons: [ADR 0002](adr/0002-staging-environment.md). This page is the how-to.

Status: items marked **(PR #32)** are in the open PR "e2e-staging and preview-isolation workflows, promote.sh" and work once it is merged.

## Environments

| | Production | Staging | Local E2E |
|---|---|---|---|
| Web | `www.buildcity.in` | `staging.buildcity.in` (branch `main`) | `vite preview` on loopback |
| API | `api.buildcity.cloud` | `api-staging.buildcity.cloud` | `APP_ENV=test` API on loopback |
| `APP_ENV` | `production` | `staging` | `test` |
| DB marker (`buildcity.env`) | `production` (`buildcity-db`) | `staging` (`buildcity-db-staging`) | `test` |
| Branch | `production` | `main` | PR branch |
| SMS / push | real | never sent, recorded in the outbox | never sent |

Every non-prod host (PR previews, staging) proxies `/api/v1` to `api-staging.buildcity.cloud`, never prod (`vercel.json`). The API refuses to boot if `APP_ENV` and the DB marker disagree.

## Flow

1. Open a PR. `ci` (lint, build, server tests) and `e2e-local` (full stack on a throwaway Postgres) must pass.
2. Merge to `main`. This deploys **staging only**; prod is untouched.
3. `e2e-staging` runs on the merged SHA against `staging.buildcity.in` **(PR #32)**.
4. When the owner says "ship", the Office Manager runs `scripts/promote.sh <40-char-sha>` **(PR #32)**. It refuses unless the SHA is on `main`, `e2e-staging` succeeded on it, and `production` can fast-forward to it. `--dry-run` runs the checks and prints the push. It then prints the read-only prod smoke commands.

Bots never run `promote.sh`, merge to `production`, or deploy.

## Test a PR preview

1. Confirm isolation first. This must print `"env":"staging","db":"staging"`:
   ```bash
   curl -fsS https://<preview-host>/api/v1/env
   ```
   If it says `production`, stop and tell the owner. (Previews are behind Vercel login; use a logged-in browser or the automation bypass header.)
2. Log in with a test number: `10000` + 5 digits, any such number, OTP `246810`. Only `10000xxxxx` numbers can log in on non-prod, so no real person is ever messaged.
3. Seeded partner accounts exist after a data refresh (passwords are held by the owner and in GitHub secrets, not here):
   - vendor `1000000001`
   - delivery rep (DR) `1000000002`
   - admin: the existing admin number's row, password only
   - product `E2E Test Cement 50kg`, region `E2E Varanasi`
4. Anything "sent" shows in the outbox (below).

## Run E2E locally

```bash
docker run -d --name bc-e2e-pg -p 127.0.0.1:5436:5432 -e POSTGRES_PASSWORD=DUMMYPASS -e POSTGRES_DB=buildcity_e2e postgres:17
npm ci && npm ci --prefix server
npx playwright install chromium
npm run e2e                  # extra args go to Playwright, e.g. -- --grep auth
npm run e2e:guard            # isolation guard unit tests
```

Chromium, one worker, serial. The DB must be on localhost; `npm run e2e` refuses one marked `production` or `staging`. The guard in `e2e/global-setup.mjs` aborts with 0 tests unless `/api/v1/env` reports `staging` or `test`. Stop the container when done. Details: [`e2e/README.md`](../e2e/README.md).

## Read the outbox

SMS and push that were not sent are kept in memory (last 200, lost on restart). ADMIN only; the route returns 404 in production:

```bash
curl -fsS -H "Authorization: Bearer <admin token>" https://api-staging.buildcity.cloud/api/v1/_staging/outbox
```

Entries have `kind` (`sms` or `push`) and `payload` (for SMS, the number and OTP).

## Request a data refresh

Staging data is an anonymised copy of prod, rebuilt only by the owner on the VPS: `bash scripts/staging/refresh.sh` from `server/`. It reads prod once, anonymises, verifies, seeds the test accounts, then swaps the database. Nothing flows from staging to prod. Until the first refresh, data routes on staging can return errors. To request one, ask the Office Manager. Steps and refusals: [`server/scripts/staging/README.md`](../server/scripts/staging/README.md).

## Roll back

- Staging: merge a `revert:` PR to `main`.
- Production: ask the Office Manager. `production` only moves forward by `promote.sh`; a rollback is a revert on `main`, verified on staging, then promoted. Emergency only (owner/Office Manager): Vercel Instant Rollback and a Coolify redeploy of the previous deployment. `production` is never force-pushed.
- After either, confirm with `/api/v1/env` on the host (`commit` is the running SHA).

## What staging never does

- Send SMS or push to real people. Sending needs `APP_ENV=production` **and** DB marker `production`.
- Accept real phone numbers, or tokens from prod (staging has its own `JWT_SECRET`).
- Write to prod. E2E aborts any request to a prod host.

## Mobile (phase 2, not built)

No staging Android build exists yet. Phase 1 covers the partner app through the website and the customer web build in Playwright. Plan: separate `*.staging` app IDs via Firebase App Distribution (ADR 0002, decision 6).

## Public-repo rules

The repo is public. `e2e-staging` runs with traces off and uploads nothing. Do not add artifact uploads, or print passwords or the bypass secret, in staging workflows.
