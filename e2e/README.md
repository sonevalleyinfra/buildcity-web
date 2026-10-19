# E2E (Playwright)

Chromium only, one worker, serial. Specs run in file order and share one run id (`e2e/.state/`).

## Run locally

```bash
docker run -d --name bc-e2e-pg -p 127.0.0.1:5436:5432 -e POSTGRES_PASSWORD=DUMMYPASS -e POSTGRES_DB=buildcity_e2e postgres:17
npm ci && npm ci --prefix server
npx playwright install chromium
npm run e2e                  # DB marker -> schema -> seed -> API (APP_ENV=test) -> vite build + preview -> Playwright
npm run e2e -- --grep auth   # extra args go to Playwright
E2E_SKIP_BUILD=1 npm run e2e # reuse e2e/.build
npm run e2e:guard            # guard unit tests, including "stub says production -> 0 tests run"
```

`DATABASE_URL` defaults to the container above and must be a localhost database. `npm run e2e` reads its
`buildcity.env` marker first and refuses `production` or `staging` (an ssh tunnel to a real DB) before any
`prisma db push`, then marks the DB `test`. The seeded accounts use fake local passwords unless
`E2E_VENDOR_PASSWORD`, `E2E_DR_PASSWORD`, `E2E_ADMIN_PASSWORD` are set. Report: `npx playwright show-report e2e/report`.

## Isolation guard

`e2e/global-setup.mjs` runs before any test. It sends one `GET /api/v1/env` to `E2E_BASE_URL` (and to
`E2E_API_URL` when it differs) and aborts the whole run, with 0 tests executed, unless `env` and `db` are both
`staging` or `test`. It also refuses a prod host (`www.buildcity.in`, `buildcity.in`, `api.buildcity.cloud`,
`buildcity-web-part-2.vercel.app`) without any request. The browser context additionally aborts every request to
those hosts. Do not weaken either.

| Variable | Meaning |
|---|---|
| `E2E_BASE_URL` | web origin under test (required) |
| `E2E_API_URL` | API origin, only if it differs from the web origin |
| `STAGING_OTP` | test-number OTP, default `654321` |

## Specs

1. `01-customer-auth`: register and log in as `10000` + 5 digits from the run id with the fixed OTP.
2. `02-browse-cart-cod`: home, category, `E2E Test Cement 50kg`, cart, checkout with a new address in `E2E Varanasi`, COD; the order id goes to the shared state.
3. `03-vendor-accepts`: vendor `1000000001` signs in with the partner user agent, accepts the order (Processing); the outbox holds the customer push.
4. `04-dr-delivers-returns`: DR `1000000002` sends it out, marks it delivered and records a 1-item return.
5. `05-wallet`: wallet card and passbook equal the `/api/v1/wallet` ledger, cashback entry when the settings call for it, order delivered with the return.

CI: `.github/workflows/e2e-local.yml` (check `e2e-local`). Trace is kept on failure only; the HTML report is an
artifact for 7 days (staging/test data only).
