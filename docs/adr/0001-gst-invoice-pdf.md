# ADR 0001 — GST / non-GST PDF invoice generation

- **Status:** Proposed (Phase 2, first item in `docs/task.md`)
- **Date:** 2026-10-16
- **Kanban:** t_ca0f3312
- **Scope:** One-click PDF invoice per order: a GST tax invoice for registered vendors, a bill of supply or non-GST invoice for the rest. Covers B2B builders (with recipient GSTIN) and B2C customers.
- **Out of scope:** WhatsApp delivery, online payments, credit notes for returns, GST e-invoicing (IRN/QR), e-way bills, GSTR-1 export. All are listed as follow-ups in §11.

---

## 1. Context

Facts from the code on `main` (697e704):

- **One order per vendor.** `POST /api/v1/orders/checkout` splits the cart by vendor (`vendorGroups`). Each `Order` has items from a single vendor, so **one invoice per order** maps to one supplier. Orders created before the split can hold several vendors (see §8).
- **Money is whole rupees.** `Order.totalAmount = Math.round(subtotal + deliveryFee − discountAmount − walletDiscount)`. Coupon and wallet sit only on the first order of a split checkout (`idx === 0`). `docs/rules.md` Rule 1.2 says no paise is ever shown to customers.
- **No tax data exists yet.** `OrderItem.cgstAmount`/`sgstAmount` exist but are always `0`. Nothing stores a vendor GSTIN, legal name, address or state, a product HSN or a GST rate, or a customer GSTIN.
- **Site address is linked to the order.** `Order.addressId → Address` holds `fullName, phone, street, city, state, pincode`. It is nullable, and legacy orders may have none.
- **Hosting.** The API runs on Railway (`vercel.json` rewrites `/api/v1/*` to it), where the filesystem is ephemeral. The database is Supabase Postgres via Prisma 5. Schema changes ship with `prisma db push`; there is no migrations folder.
- **Clients.** React SPA plus Capacitor Android. The app ships no `@capacitor/browser` or `@capacitor/filesystem` plugin.
- **Tests.** `server/tests/run.js` boots the API against a localhost DB (security, smoke and pagination suites). There is no unit-test runner and no CI.

> **Doc conflict found:** `docs/memory.md` §3.2 says "do not force integer `Math.round()`" for return settlements, which contradicts the hard-locked `docs/rules.md` Rule 1.2 and the shipped code. This ADR follows `rules.md`. pm should get `memory.md` fixed separately.

## 2. Decision summary

| Topic | Decision |
|---|---|
| Who issues | The **vendor is the supplier of record**: their legal name, GSTIN and invoice series. BuildCity appears as the marketplace in the footer. *(owner D1)* |
| Prices | Listed prices are **GST-inclusive**. Tax is backed out, so the customer's payable amount never changes. *(owner D2)* |
| Document type | Set by `Vendor.gstRegistrationType` at issue time: `REGULAR` → **Tax Invoice**; `COMPOSITION` → **Bill of Supply** with the composition declaration; `UNREGISTERED` → **Invoice (non-GST)** with "Supplier not registered under GST". |
| Where generated | **Server only.** The invoice number and data snapshot are created in a DB transaction, and the PDF is rendered server-side from that snapshot. |
| PDF library | **`pdfmake`** (server `PdfPrinter`, built on pdfkit) with a bundled Noto Sans TTF for the ₹ glyph. No headless browser. |
| Storage | Store the **immutable JSON snapshot plus its SHA-256** in a new `invoices` table and re-render the PDF on demand. No PDF blobs, no object storage. |
| Numbering | A consecutive series **per vendor per financial year**: `{vendorCode}/{FY}/{seq}`, for example `V012/2627/00045` (15 chars, Rule 46 allows ≤ 16). The counter row is incremented inside the same `$transaction`. |
| Rounding | Every printed amount is a whole rupee. Tax is computed per line with `Math.round`. CGST = SGST exactly. `taxable + tax == line amount` holds exactly on every line. See §5. |
| Trigger | "Invoice" button for the customer (own order), vendor (own shop), DR (district) and admin. The first click issues the invoice; later clicks re-download the same one. Allowed once status ∈ `SHIPPED, OUT_FOR_DELIVERY, DELIVERED, COMPLETED`. |

## 3. Data needed

### 3.1 Schema changes (Prisma, all additive)

```prisma
enum GstRegistrationType { REGULAR COMPOSITION UNREGISTERED }
enum InvoiceDocType      { TAX_INVOICE BILL_OF_SUPPLY NON_GST_INVOICE }
enum InvoiceStatus       { ISSUED CANCELLED }

model Vendor {
  // ...existing
  legalName           String?              // as on GST certificate / PAN
  gstRegistrationType GstRegistrationType  @default(UNREGISTERED)
  gstin               String?              @unique   // 15 chars, checksum-validated
  pan                 String?
  addressLine         String?
  city                String?
  stateName           String?              @default("Uttar Pradesh")
  stateCode           String?              @default("09")  // GST state code
  pincode             String?
  invoiceCode         String?              @unique   // e.g. "V012", 2-5 chars, set once, never edited after first invoice
  invoices            Invoice[]
}

model ProductMaster {
  // ...existing
  hsnCode        String?   // 4–8 digits; ≥4 required for B2B tax invoices (turnover ≤ ₹5 cr)
  gstRatePercent Decimal?  // one of 0, 5, 18, 40 (whatever the CA confirms), admin-set
}

model User {
  // ...existing (customer only)
  gstin        String?   // optional, for B2B builders
  businessName String?   // legal/trade name to print with the GSTIN
}

model Order {
  // ...existing
  invoice Invoice?
}

model Invoice {
  id              String         @id @default(uuid())
  orderId         String         @unique
  order           Order          @relation(fields: [orderId], references: [id], onDelete: Restrict)
  vendorId        String
  vendor          Vendor         @relation(fields: [vendorId], references: [id], onDelete: Restrict)
  docType         InvoiceDocType
  invoiceNumber   String         @unique
  financialYear   String         // "2627"
  seq             Int
  issuedAt        DateTime       @default(now())
  issuedByUserId  String?
  snapshot        Json           // everything printed, see 3.2
  snapshotSha256  String
  templateVersion Int            @default(1)
  grandTotal      Int            // whole rupees; denormalised for lists/reports
  taxTotal        Int
  status          InvoiceStatus  @default(ISSUED)
  cancelledAt     DateTime?
  cancelReason    String?

  @@unique([vendorId, financialYear, seq])
  @@index([vendorId, issuedAt])
  @@map("invoices")
}

model InvoiceCounter {
  vendorId      String
  financialYear String
  lastSeq       Int     @default(0)
  @@id([vendorId, financialYear])
  @@map("invoice_counters")
}
```

Notes:
- Product tax data belongs on `ProductMaster`, because every `VendorProduct` points at one master through `masterProductId` and HSN is a property of the goods, not the shop. The snapshot reads it through `OrderItem → VendorProduct → ProductMaster`. If a line has no `vendorProductId` (deleted listing), issuing a tax invoice fails with 422 and the line is named.
- `onDelete: Restrict` on `Invoice → Order` and `Invoice → Vendor` stops the existing `Cascade` chains (`User → Vendor`, `Order → items`) from silently deleting a statutory record. A vendor or order with an invoice cannot be hard-deleted. Check `server/scripts/clearAllVendors.js` before it is ever run again.
- Checkout is **not** changed: the existing module-boundary rule in `memory.md` §3.9 applies. `OrderItem.cgstAmount`/`sgstAmount` stay unused; tax lives only in the invoice snapshot.
- Rollout: `prisma db push` on production is an owner-approved action, run by the Office Manager. Every column is nullable or defaulted, so existing rows stay valid.

### 3.2 Snapshot (frozen at issue)

```jsonc
{
  "v": 1,
  "docType": "TAX_INVOICE",
  "invoiceNumber": "V012/2627/00045", "issuedAt": "2026-10-16T10:22:00+05:30",
  "orderNumber": "…", "orderDate": "…",
  "supplier":  { "legalName", "shopName", "gstin", "pan", "address", "stateName", "stateCode", "phone" },
  "recipient": { "name", "businessName", "gstin|null", "phone" },
  "site":      { "fullName", "phone", "street", "city", "state", "pincode" },   // ship-to = customer site address
  "placeOfSupply": { "stateName": "Uttar Pradesh", "stateCode": "09" },
  "interState": false, "reverseCharge": false,
  "lines": [ { "description", "hsn", "qty", "unit", "rate", "gross", "discount", "net", "gstRate", "taxable", "cgst", "sgst", "igst" } ],
  "totals": { "goods", "delivery", "discount", "taxable", "cgst", "sgst", "igst", "roundOff", "invoiceTotal", "walletPaid", "amountPayable", "amountInWords" },
  "platform": { "name": "BuildCity", "legalName", "gstin|null" }        // footer only
}
```

The snapshot holds everything printed, so later edits to a vendor profile, product master or address never change an issued invoice. `snapshotSha256` (canonical JSON) is printed in small type on the PDF so a copy can be checked.

### 3.3 Field rules for each document type (Rule 46 / 49 of the CGST Rules; the CA confirms before go-live)

| Field | Tax Invoice | Bill of Supply (composition) | Non-GST invoice |
|---|---|---|---|
| Supplier legal name, address, GSTIN | required | required | name + address; no GSTIN |
| Consecutive number ≤ 16 chars, date | required | required | required |
| Recipient name + site address | required | required | required |
| Recipient GSTIN | if the customer has one | if the customer has one | – |
| HSN per line (≥ 4 digits) | required | required | optional (printed if present) |
| Taxable value, rate, CGST/SGST or IGST | required | **must not** show tax | no tax |
| Place of supply (state + code) | required | required | – |
| Declaration | "Tax payable on reverse charge: No" | "Composition taxable person, not eligible to collect tax on supplies" | "Supplier not registered under GST" |
| Signature line | "Authorised signatory, <legal name>" + "computer-generated" note (owner/CA D6) | same | same |

If a required field is missing, issuing fails with `422 { error: "invoice_incomplete", missing: ["vendor.gstin", "line[2].hsn", …] }` and the UI shows who must fix it (DR or admin). **Nothing is issued and no number is used.**

## 4. Where it is generated, and the PDF approach

**Decision: server-side `pdfmake`, rendered from the stored snapshot.**

| Option | Verdict | Why |
|---|---|---|
| **A. Server `pdfmake`** (pure JS, about 2 MB, declarative tables) | **Chosen** | Runs on Railway with no system deps, renders in under 100 ms, and table layout fits an invoice. Output is deterministic from snapshot + `templateVersion`. One renderer serves web and Android. |
| B. Server `pdfkit` directly | Rejected | Same engine with no table layout, so the invoice grid means far more hand-written positioning code. |
| C. Puppeteer / headless Chromium HTML → PDF | Rejected | Adds about 300 MB of Chromium and 200–400 MB RAM per render on a small Railway box, cold starts and font/sandbox issues. Overkill for one fixed template. |
| D. Client-side `jsPDF` / `@react-pdf/renderer` | Rejected | Totals, tax and numbering would be computed where the user can tamper with them, and the bundle grows for every customer. The number still has to come from the server, and the Capacitor WebView cannot save blob downloads without a new plugin. |
| E. Third-party invoicing API (Zoho Invoice, ClearTax, etc.) | Rejected for now | Costs money, needs per-vendor onboarding and sends customer PII to a third party. Only worth it once e-invoicing (IRN) is mandatory for a vendor (turnover > ₹5 cr). Revisit then. |

**Fonts:** bundle `server/assets/fonts/NotoSans-{Regular,Bold}.ttf` (OFL). pdfmake's default Roboto build may lack ₹ (U+20B9). Devanagari names are a known gap in v1 (see §10).

## 5. Whole-rupee tax rounding

All inputs come from the order, which is already in whole rupees. All outputs are integers. Implement as a **pure module** `server/src/invoice/tax.js` with no Prisma import, so it can be unit-tested.

```
Inputs per order: lines[i] = { qty, price, gstRate r_i }, deliveryFee F, coupon C (=discountAmount), wallet W (=walletDiscount)

1. gross_i   = Math.round(qty_i × price_i)
2. Coupon C is spread over the goods lines in proportion to gross_i by the largest-remainder
   method: floor each share, then give the leftover rupees to the largest fractional parts
   (ties go to the lower index). Σ d_i = C exactly.
3. Delivery is one more line ("Delivery charges", HSN = principal line's HSN,
   r = rate of the highest-gross goods line, i.e. composite supply follows principal supply; D3), d = 0.
4. net_i     = gross_i − d_i                                 (GST-inclusive, whole ₹)
5. REGULAR, intra-state (supplier stateCode == site state code):
     cgst_i = sgst_i = Math.round(net_i × (r_i/2) / (100 + r_i))
     taxable_i = net_i − cgst_i − sgst_i
   REGULAR, inter-state:
     igst_i = Math.round(net_i × r_i / (100 + r_i));  taxable_i = net_i − igst_i
   COMPOSITION / UNREGISTERED: no tax columns; taxable_i = net_i
6. invoiceTotal = Σ net_i
   roundOff     = (order.totalAmount + W) − invoiceTotal    // normally 0; |roundOff| ≤ 1 only if an old order stored paise
   amountPayable = order.totalAmount                          // what the customer pays on delivery
```

Invariants, each enforced by a unit test: every value is an `Integer`; `taxable_i + cgst_i + sgst_i + igst_i == net_i`; `cgst_i == sgst_i`; `Σ d_i == C`; `invoiceTotal − W + roundOff == order.totalAmount`; per-component tax error < ₹0.50 per line against the exact value. Use JS `Math.round` (half-up for positives); never port this to a language whose `round` is banker's rounding.

**Worked example** (Varanasi vendor, intra-state, coupon ₹100, wallet ₹500, delivery ₹49):

| Line | HSN | Gross | Coupon share | Net | Rate | Taxable | CGST | SGST |
|---|---|---|---|---|---|---|---|---|
| Cement 50 kg × 50 @ ₹380 | 2523 | 19,000 | 84 | 18,916 | 18% | 16,030 | 1,443 | 1,443 |
| Sand × 3 @ ₹1,250 | 2505 | 3,750 | 16 | 3,734 | 5% | 3,556 | 89 | 89 |
| Delivery charges | 2523 | 49 | 0 | 49 | 18% | 41 | 4 | 4 |
| **Invoice total** | | | **100** | **22,699** | | **19,627** | **1,536** | **1,536** |
| Paid via BuildCity Wallet (D4) | | | | −500 | | | | |
| **Amount payable (COD)** | | | | **₹22,199** = `order.totalAmount` | | | | |

Coupon split: 100 × 19000/22750 = 83.52 and 100 × 3750/22750 = 16.48, floored to 83 + 16 = 99, and the leftover ₹1 goes to the larger fraction (cement). Rates and HSNs here are illustrative only; the CA must confirm the real ones, and admins enter them per master product.

## 6. API

All routes live in `server/src/index.js` next to the order routes and use the existing `requireAuth` and `authFetch` patterns.

| Method & path | Who | Behaviour |
|---|---|---|
| `POST /api/v1/orders/:id/invoice` | customer (own order), vendor (`resolveOwnVendor` = order's vendor), DR (`drCanManageVendor`), admin | Idempotent. If an invoice exists, return it (200). Otherwise check eligibility (status, single vendor, data complete), then in one `$transaction`: upsert `InvoiceCounter` with `lastSeq: { increment: 1 }`, build the snapshot, create `Invoice`, and write an `AuditLog` entry `INVOICE_ISSUED`. Returns 201 `{ invoice: { id, invoiceNumber, docType, grandTotal, issuedAt }, pdfUrl }`. A unique-violation race (P2002 on `orderId`) is caught and the existing row is returned. |
| `GET /api/v1/orders/:id/invoice` | same | 200 with metadata + `pdfUrl`, or 404 `not_issued`. Never issues. |
| `GET /api/v1/invoices/:id/pdf?t=<token>` | anyone holding a valid token | Renders from the snapshot. `t` is an HMAC-SHA256 (`JWT_SECRET`-derived key) over `invoiceId + exp`, valid for **5 minutes**, so it can be opened in the system browser / Android download manager without the bearer header. Sends `Content-Type: application/pdf`, `Content-Disposition: attachment; filename="<invoiceNumber with / → ->.pdf"`, `Cache-Control: private, no-store`. Also accepts a normal bearer token with the same authz as the POST. |
| `PATCH /api/v1/vendors/:id` (existing) | admin, DR (district) | Accepts the new legal/GST fields. Validates GSTIN format + checksum, checks that GSTIN chars 3–12 equal the PAN when both are set, and that chars 1–2 equal `stateCode`. `invoiceCode` is set-once (409 after the vendor's first invoice). |
| `PATCH /api/v1/master-products/:id` (existing) | admin, DR | Accepts `hsnCode` (`^\d{4}(\d{2}){0,2}$`) and `gstRatePercent` (whitelist set in config). |
| `PATCH /api/v1/users/me` (existing or new) | customer | Accepts `gstin` + `businessName` with the same GSTIN validation. |

Financial year: `FY = issuedAt` in **IST** (Apr–Mar), e.g. 16 Oct 2026 → `2627`. Compute it in `Asia/Kolkata`, not server UTC, so invoices issued just after midnight on 1 April land in the new FY.

## 7. UI (React SPA; designer review required by office rules)

- **Customer `OrderDetail.jsx`:** an "Invoice" button (≥ 44 px) once the status is eligible. If the order has no invoice yet and the user has no GSTIN, a one-line inline prompt reads "Buying for a business? Add GSTIN first", linking to Profile. Then: POST → open `pdfUrl`.
- **Vendor order card** (`src/pages/vendor/sections/…`) and **DR `DrOrdersTab.jsx`:** the same button. If the response is 422 `invoice_incomplete`, show the missing fields through `useAlert()` (never `window.alert`).
- **DR `DrVendorsTab.jsx` / Admin vendor edit:** a "Legal & GST" field group with Registration type (select), Legal name, GSTIN, PAN, Address, City, State, Pincode and Invoice code.
- **DR `DrCatalogTab.jsx` / Admin master product edit:** HSN code and GST rate (select).
- **Customer `Profile.jsx`:** GSTIN and Business name.
- **Android:** open `pdfUrl` with an `<a href target="_blank" rel="noopener">` on the absolute API origin. A Capacitor WebView sends off-origin navigations to the system browser, which downloads the file. The dev task must verify this on a device. If it fails, the fallback is adding `@capacitor/browser` (a new native dep, which means an app release rather than OTA).

## 8. Edge cases

| Case | Behaviour |
|---|---|
| Two clicks or two devices issue at once | `orderId @unique` + counter increment inside one transaction; the loser catches P2002 and returns the winner's invoice. A counter bump rolled back by a failed transaction is never committed, so no gaps. |
| Legacy order with items from several vendors | 422 `multi_vendor_order_unsupported`. v1 does not split these. |
| Order has no `addressId` | 422 `site_address_missing`. No invoice. |
| Vendor changes GSTIN or registration type after an invoice | Issued invoices are unchanged (snapshot); new ones use the new data. |
| Customer adds a GSTIN after the invoice was issued | The invoice is not changed. Admin cancel-and-reissue is a follow-up (§11). The UI prompt in §7 reduces how often this happens. |
| Order `CANCELLED` (or an `OrderReturn` filed) after issue | v1 keeps the invoice `ISSUED`. Credit notes and cancellation are a follow-up (§11). Issuing is refused for an order that is already cancelled. |
| Return processed before issue | The invoice shows the original supply. The return is settled by `rules.md` §1, and a credit note (follow-up) offsets it. |
| Line has `vendorProductId = null` or a master with no HSN/rate | Tax invoice → 422 naming the line. Non-GST invoice → issued with HSN left blank. |
| Rate change (government notification) between order and issue | Rate is read **at issue time** from `ProductMaster`. The CA should confirm whether the time-of-supply rules mean the dispatch date instead (D7). |
| FY rollover | Counter key includes the FY, so numbering restarts at 00001 every 1 April (IST). |
| Interstate (site outside UP) | IGST branch. Place of supply = site state. Every live district is in UP today. |

## 9. Security

- The authz matrix in §6 reuses the existing guards. A test checks that vendor B cannot issue or download vendor A's invoice, that a DR cannot reach another district, and that customer X cannot reach customer Y.
- The PDF link token is bound to the invoice id, expires after 5 minutes, and is checked with `crypto.timingSafeEqual`. It is never logged (strip `t` from request logs).
- Invoices contain PII (name, phone, site address, GSTIN): `no-store`, no public bucket, no CDN caching.
- No update or delete route exists for `Invoice`. Issued rows change only through the future cancel flow (`status`, `cancelledAt`, `cancelReason`).
- `onDelete: Restrict` keeps statutory records (retention is 72 months from the annual-return due date; already promised in `src/data/legalPolicies.js`).
- Rate-limit `POST …/invoice` and `GET …/pdf` with the existing `express-rate-limit` (e.g. 30/min/user), because rendering costs CPU.

## 10. Test plan

1. **Unit, pure** (`server/tests/unit/invoice-tax.test.js` with `node --test`, new script `test:unit`): the worked example in §5, coupon largest-remainder ties, zero coupon, coupon > goods (clamped by checkout), 0 % rate, all rates in the whitelist, the IGST branch, a composition/unregistered vector with no tax, randomised property test (1,000 orders) on every §5 invariant, and FY boundaries at 31 Mar 23:59 IST and 1 Apr 00:00 IST.
2. **GSTIN validator unit tests:** valid checksum, bad checksum, PAN mismatch, state-code mismatch, lowercase normalised.
3. **API** (extend `server/tests/smoke.test.js` + `security.test.js` with `fixture.js`): issue → 201; second call → same number; 20 parallel POSTs → one invoice and `seq` contiguous; 422 for missing GSTIN/HSN/address and multi-vendor; status gating; the authz matrix above; expired or tampered token → 403.
4. **PDF:** render the fixture, assert `%PDF-` header, size < 200 KB, render < 500 ms. Extract the text (`pdf-parse` as a devDependency) and assert the invoice number, GSTIN, HSN, ₹ totals and declaration text for each of the 3 doc types.
5. **Manual / QA:** open on Chrome desktop, Android Chrome and the Capacitor app; check the ₹ glyph, a 40-line order paginates with repeated table headers, and the totals match the order screen.

## 11. Risks and follow-ups

| Risk | Mitigation |
|---|---|
| Legal correctness (formats, rates, delivery treatment) | Owner's CA signs off on a sample PDF of each doc type before go-live (owner input O5). |
| `db push` on prod with no migration history | Additive only. Office Manager runs it after owner approval; snapshot the DB first. |
| Devanagari customer or shop names render as boxes | v1 transliteration is not attempted; add Noto Sans Devanagari as a pdfmake fallback in a follow-up if QA sees it. |
| Wrong customer GSTIN frozen on an invoice | Profile prompt before first issue; cancel/reissue follow-up. |
| `index.js` is 4.8k lines (hotspot) | New code lives in `server/src/invoice/{tax,snapshot,render,numbering,gstin}.js`; `index.js` only gets thin route handlers. |

**Follow-ups (not in this slice):** credit notes linked to `OrderReturn`; admin cancel/reissue; GSTR-1-friendly CSV export per vendor per month; e-invoicing (IRN/QR) for vendors over ₹5 cr turnover; e-way bill for consignments over ₹50,000 (vendor's obligation, today done outside the app); WhatsApp delivery of the PDF (Phase 2, item 2).

## 12. Owner inputs

### Decisions (merging this ADR accepts the recommended default; comment on the PR to change one)

| # | Question | Options | Recommended |
|---|---|---|---|
| D1 | Who is the supplier on the invoice? | (a) Vendor (marketplace model) · (b) Sone Valley Infra buys and resells · (c) Vendor, plus a separate BuildCity invoice for delivery | **(a)**. Matches the per-vendor orders and stock today. (b) changes GST liability and accounting for the whole business. |
| D2 | Are listed prices GST-inclusive? | (a) Inclusive, back out tax · (b) Exclusive, add tax on top | **(a)**. Customer totals stay exactly as today and checkout is untouched. (b) changes every price shown. |
| D3 | How is the delivery charge treated? | (a) A line on the vendor invoice at the principal goods rate · (b) BuildCity's own service invoice (SAC 9965) | **(a)**, if D1 = (a), because the vendor's order carries the fee. |
| D4 | How is the wallet redemption shown? | (a) As a payment ("Paid via BuildCity Wallet"), taxable value unchanged · (b) As a discount that lowers taxable value | **(a)**. BuildCity funds the wallet and the vendor supplied the full value. **CA to confirm.** |
| D5 | Who may click to issue? | (a) Customer, vendor, DR, admin · (b) Vendor/DR/admin only; customer can download only after issue | **(a)**, which is the one-click ask. Issuing is deterministic, so whoever clicks first changes nothing but the time. |
| D6 | Signature on the PDF | (a) "Authorised signatory" text + computer-generated note · (b) Uploaded signature image per vendor | **(a)** for v1. |
| D7 | Rate date | (a) Rate at issue · (b) Rate at order date | **(a)**, simpler. The CA may override. |

### Data to supply before go-live (not needed for dev, which uses fixtures)

- **O1** For every live vendor: legal name, registration type, GSTIN (or confirmation of composition/unregistered), PAN, registered address with pincode, and a 2–5 char invoice code. DRs can enter these through the new form.
- **O2** For every master product: HSN code and GST rate, confirmed by the CA under the rates in force after the Sept 2025 rationalisation.
- **O3** BuildCity footer details: Sone Valley Infra Pvt. Ltd. legal name, CIN, GSTIN (if registered as an e-commerce operator), registered address, support phone/email.
- **O4** Logo approval for the PDF header (existing `public/buildcity-roof-logo.png` assumed).
- **O5** CA sign-off on one sample PDF of each doc type (QA will produce them from fixtures).

## 13. Dev slice (8 steps; each ≤ half a day, with a QA task after each)

| # | Task | Depends on | Acceptance (summary) |
|---|---|---|---|
| 1 | Schema: Vendor legal/GST fields, ProductMaster HSN/rate, User GSTIN, `Invoice`, `InvoiceCounter`, enums | ADR merged | `prisma validate` + `db push` on a local DB passes; existing smoke/security suites green; no change to checkout. |
| 2 | Pure modules `invoice/tax.js` + `invoice/gstin.js` + `test:unit` script | 1 | All §10.1–2 tests pass, including the worked example to the rupee and the 1,000-case property test. |
| 3 | Vendor Legal & GST fields: API validation on `PATCH /vendors/:id` + DR/Admin form | 1, 2 | Invalid GSTIN → 400 with a message; `invoiceCode` set-once (409); DR district scope enforced; form uses `useAlert`. |
| 4 | Master product HSN + GST rate: API + DR/Admin form; customer GSTIN/business name in Profile | 1, 2 | HSN regex + rate whitelist enforced; customer can set and clear GSTIN; a staff user cannot set their own customer GSTIN. |
| 5 | Issuing service: `invoice/numbering.js`, `invoice/snapshot.js`, `POST`/`GET /orders/:id/invoice` | 2, 3, 4 | §10.3 passes: idempotent, 20-way race gives one invoice, contiguous seq, 422 lists of missing fields, authz matrix, FY in IST, AuditLog row. |
| 6 | Renderer: `invoice/render.js` (pdfmake + Noto Sans), `GET /invoices/:id/pdf` with signed token, rate limits | 5 | §10.4 passes for all 3 doc types; token expiry/tamper → 403; `no-store` header; 40-line order paginates. |
| 7 | UI buttons: customer OrderDetail, vendor order card, DR orders tab; GSTIN prompt; 422 handling | 6 | Button only on eligible statuses; first click issues, second re-downloads the same number; verified in browser **and** on the Capacitor app (download works, or the fallback is documented). |
| 8 | Docs + fixtures: three sample PDFs in the PR for CA review, update `architecture.md` + `task.md`, add `docs/runbooks/invoice-rollout.md` (db push, backfill vendor data, go-live checklist O1–O5) | 7 | Samples attached; docs updated; runbook reviewed by qa. |
