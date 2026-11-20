# BuildCity — Business-Logic Audit & Rebuild Brief

> Source audited: `/home/user/buildcity-web` at commit `ef00035` (shallow history, 50 commits).
> Target: TypeScript Next.js (App Router, Server Actions), self-hosted on a VPS with Coolify.
> Conventions: `file:line` references point at the current code. **(inferred)** marks conclusions drawn from reading code paths, not from running them.
> Out of scope: `.claude/skills/` (vendored tooling) and binary assets.

---

## 0. TL;DR

- BuildCity is a **multi-vendor construction-materials marketplace** (cement, steel/TMT, paints, tiles, aggregates, plumbing, hardware) for a few districts of eastern Uttar Pradesh, India (Varanasi, Mirzapur, Jaunpur, Prayagraj). Customers order by district, local vendor shops fulfil the orders, and payment is cash on delivery only.
- There are **four roles**: `CUSTOMER`, `VENDOR` (the "Partner"), `DR` (District Representative, a regional field manager) and `ADMIN`. There is **no delivery-agent role**: the vendor (or a DR/admin) marks the order delivered.
- Money features: flat-amount **coupons**, a **wallet** (cashback on delivered orders, lifetime referral commission, capped wallet redemption at checkout) and a **free-delivery threshold**. A per-vendor **commission rate is stored but never used**. There are no payouts, settlements, taxes or invoices.
- The server is one 4,242-line Express file (`server/src/index.js`) using Prisma on Supabase Postgres. The SPA is React 19 + Vite. One Capacitor Android project builds two apps. The **Partner app is a WebView of the live site**; the **customer app ships a frozen bundled frontend** (customer OTA is disabled), so any rebuild **must keep the old `/api/v1/*` contract working** until those installs are force-upgraded.
- Critical problems:
  - The **Android release keystore and its password are committed** (`android/app/build.gradle:41-46`).
  - Checkout **trusts the client-sent delivery fee** and **accepts any unknown coupon code with a client-chosen discount** (`server/src/index.js:3747-3781`).
  - The wallet and stock updates have **race conditions**.
  - Cancellations **do not refund** wallet, cashback or coupon.
  - Rewards are paid **fire-and-forget**.
  - The **referee welcome bonus is configured but never paid**.
  - **Bulk "pack" cart items cannot be ordered** (inferred).
  - The DR role can **rewrite the global catalog price** for every district.

---

## 1. Product summary

### 1.1 What it is
BuildCity (`www.buildcity.in`) is a hyper-local B2C/B2B marketplace for building materials. The customer:
1. picks a **district** (Region): Varanasi, Mirzapur, Jaunpur or Prayagraj (`src/context/RegionContext.jsx:9-14`);
2. browses products that **local vendor shops in that district** list from a central **master catalog**;
3. orders with **Cash on Delivery** (`paymentMode` is always `"COD"`, `server/src/index.js:3831`);
4. receives the material at the site, with deliveries 8 AM–8 PM, 7 days a week (`src/data/legalPolicies.js:229`).

The legal entity appears to be **Sonevalley Infra** (inferred). The legal pages use `sonevalleyinfra@gmail.com` (`src/data/legalPolicies.js:8`), and the OTP SMS text and sender are "Sonevalley"/`SNVLY` (`server/src/smsService.js:24, 29`).

### 1.2 Actors

| Role | How they log in | What they do |
|---|---|---|
| **CUSTOMER** | Phone + SMS OTP (no password) | Browse, cart, checkout (COD), addresses, order tracking, wallet/referrals, reviews |
| **VENDOR / Partner** (shop) | Phone + password (`/auth/vendor/login`). Created by Admin or DR; no self-signup | Add listings from the master catalog (need approval), set price/MRP/stock/bulk packs, pause listings, receive order push notifications, move order status through to delivered |
| **DR** (District Representative) | Phone + password | Onboard and manage vendors in their district, approve listings, create/edit master products, manage district orders |
| **ADMIN** (super admin, fixed phone `9999999999`) | Phone + password | Everything: users, DRs, vendors, catalog, categories, regions, coupons, banners, wallet/rewards settings, manual wallet adjustments, broadcast notifications, all orders |
| Delivery agent | — | **Does not exist.** The vendor delivers and marks the order delivered |

### 1.3 Value proposition (from UI and legal copy)
"Wholesale rates, zero middlemen", "direct site delivery", certified and genuine material, local shops, delivery within hours, bulk-pack pricing, cashback and referral commission paid into a wallet.

---

## 2. Domain model

The source of truth is `server/prisma/schema.prisma`, applied with **`prisma db push`**. There is **no migrations folder**, so schema history is unversioned. All money columns are Prisma `Decimal` (Postgres `numeric(65,30)` by default) but are converted to JS `Number` (float) in every calculation.

### 2.1 Enums

| Enum | Values | Notes |
|---|---|---|
| `Role` | CUSTOMER, VENDOR, DR, ADMIN | |
| `VendorStatus` | PENDING, APPROVED, SUSPENDED | Login code also checks the non-existent `"PENDING_REVIEW"` (`index.js:773`) |
| `ApprovalStatus` | PENDING_REVIEW, APPROVED, REJECTED | Listing approval |
| `OrderStatus` | PENDING, CONFIRMED, PROCESSING, SHIPPED, OUT_FOR_DELIVERY, DELIVERED, CANCELLED | The UI only uses PENDING, PROCESSING, OUT_FOR_DELIVERY, DELIVERED and CANCELLED. CONFIRMED and SHIPPED are only rendered |

### 2.2 Tables

**`users` (User)**

| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| phone | string **unique** | 10-digit Indian mobile, no `+91` |
| name, email | string? | Placeholder names like "Customer 1234" are auto-replaced later |
| password | string? | bcrypt; only for staff and vendors |
| role | Role, default CUSTOMER | |
| preferredRegionId / preferredRegionName | string? | Denormalized region; no FK |
| cartItems | Json? | Whole client cart blob, stored unvalidated |
| tokenVersion | int, default 1 | Put in the JWT but **never checked** |
| status | string, default "ACTIVE" | **Never enforced** |
| productCount | int | Incremented when a vendor listing is created, never decremented |
| walletBalance | Decimal, default 0 | Cached balance, not derived from the ledger |
| referralCode | string? unique | `BC` + 4 chars from `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (`index.js:1345-1356`) |
| referredBy | string? | **User id** of the referrer; no FK |
| createdAt, updatedAt | | index (createdAt, id) |

Relations: vendors[], drs[], addresses[], orders[], auditLogs[], notifications[], walletTransactions[].

**`otp_verifications`**: id, phone, otp (**plaintext**), isVerified (unused), expiresAt (+10 min), createdAt; index (phone, createdAt).

**`regions`**: id, name **unique**, state (default "Uttar Pradesh"), baseDeliveryCharge Decimal (default 49), isActive, createdAt.
- Seeds: Varanasi 49, Mirzapur 79 (`server/src/seed.js`).
- Frontend defaults: Varanasi 49, Jaunpur 78, Mirzapur 95, Prayagraj 49, with **hardcoded production UUIDs** (`RegionContext.jsx:9-14`).
- "District aliases" treat region rows such as Banaras/Kashi/VNS as Varanasi (`index.js:197-210`), which implies **duplicate region rows exist in production** (inferred).

**`district_representatives` (DR)**: id, userId → users (cascade), name, phone, password (bcrypt, **duplicated from users.password**), regionId → regions (required), status string "ACTIVE" (**not checked at login**), joinedOn.

**`vendors`**: id, userId → users (cascade), shopName, ownerName, phone (duplicated from user), password (bcrypt, duplicated), regionId → regions (required), status VendorStatus (default PENDING; API default APPROVED), commissionRate Decimal default 10 (**unused**), addedByDr string? (a name, not an FK), joinedOn.

**`categories`**: id, name unique, productCount int (manually typed by the admin, not computed), isActive (not enforced), createdAt.

**`product_masters` (ProductMaster)**: id, name, categoryId → categories, brand ("Generic"), type ("Standard"), grade ("Standard Grade"), unit ("Unit"), suggestedPrice Decimal (100), imageUrl (Unsplash default; **multiple images stored as a comma-separated string**, see `src/components/ProductImageSlider.jsx:9-11`), description?, mrp Decimal?, customPacks Json? (`custom_packs`), addedBy string ("Admin"), createdAt.

**`product_images`**: id, productMasterId, imageUrl, isPrimary. **Never read or written by the app (dead).** The relation is misnamed `vendorProducts` on ProductMaster.

**`vendor_products` (listing = a vendor's offer of a master product)**

| Field | Notes |
|---|---|
| masterProductId → product_masters (cascade), vendorId → vendors (cascade) | No unique constraint on (vendorId, masterProductId), so duplicate listings are possible |
| regionId?, regionName? ("Varanasi") | Denormalized; can disagree with vendor.regionId |
| name, categoryId, categoryName, brand, type, grade, unit, imageUrl, description | **Copied** from the master at creation (snapshot) |
| price Decimal, mrp Decimal? | Selling price. MRP defaults to `round(price*1.2)` when missing (`index.js:2681`) |
| stockQty int (100) | |
| customPacks Json? | `[{qty, label, unitName, price, mrp, stock}]` bulk packs (see §4.9) |
| approvalStatus (PENDING_REVIEW), isActive (false) | Listing is live iff APPROVED && isActive && vendor not SUSPENDED |
| addedBy string | "Admin" / "DR" / "Vendor" |
| submittedOn | |

**`addresses`**: id, userId (cascade), regionId → regions (required), fullName, phone, street, city ("Varanasi"; in practice **city = region name**), state, pincode (default "221001"), isDefault, createdAt.

**`orders`**

| Field | Notes |
|---|---|
| orderNumber | `cuid()` unique; displayed as `#ORD-*XXXX` (last 4 chars, `src/utils/formatId.js`), which can collide visually |
| customerId → users, addressId? → addresses | |
| totalAmount | = vendor-group subtotal + deliveryFee − discountAmount − walletDiscount |
| deliveryFee (49), discountAmount, walletDiscount, cashbackEarned | Decimal |
| couponCode?, paymentMode ("COD"), status (PENDING) | |
| idempotencyKey? unique | Split orders use `<key>__vN` |
| createdAt, updatedAt | |

**`order_items`**: orderId (cascade), vendorProductId? → vendor_products, vendorId → vendors (required), productName, priceAtPurchase, cgstAmount/sgstAmount (**always 0, never computed**), quantity, totalPrice.

**`audit_logs`**: id, userId?, action, details, ipAddress, createdAt. **Never written (dead).**

**`notifications`**: id, userId (cascade), title, message, isRead, createdAt. **A broadcast is stored as a row owned by an ADMIN user**, and every user reads all admin-owned rows (§4.13).

**`coupons`**: id, code unique, title, discountAmount Decimal (100), minOrder Decimal (1000), expiryDate **String** "YYYY-MM-DD" (default "2026-12-31"), desc, isActive, createdAt. There is no per-user limit, usage count, percentage type or max-discount.

**`reviews`**: id, productId (**free string**, usually a listing id; no FK), name, rating 1–5, comment ≤2000 chars, createdAt. There is no userId, so the API cannot verify that the reviewer bought the product.

**`banners`**: id (seed ids `b-1`..`b-3`), tag, title, imageUrl, targetUrl ("/categories"), isActive, displayOrder, timestamps.

**`wallet_transactions`** (ledger): id, userId (cascade), amount Decimal (signed), type string `REFERRAL_BONUS | ORDER_CASHBACK | ORDER_REDEMPTION | ADMIN_ADJUST`, status "COMPLETED", orderId? (no FK), description, createdAt. There is **no unique (orderId, type)**, which protects against double credits only by a check-then-insert.

**`app_settings`** (singleton id `"wallet_config"`): referralEnabled, cashbackEnabled, cashbackType (forced to PERCENTAGE), cashbackValue (2), minOrderForCashback (5000), maxCashbackCap (500), referralRewardType (forced to PERCENTAGE), referrerReward (2), maxReferralRewardCap (1000), refereeRewardType (FLAT), refereeReward (50; **never paid**), walletRedeemEnabled, maxWalletUsagePercent (10), maxWalletUsageFlat (500), freeDeliveryEnabled, freeDeliveryMinAmount (25000).

**`vendor_fcm_tokens`**: vendor_id TEXT PK, token, phone, updated_at. **vendor_id holds a vendor id or a user id**: rows are written for both (`pushService.js:144-166`). This allows one device per key.

### 2.3 ER summary
```
User 1─* Vendor *─1 Region 1─* DR *─1 User
User 1─* Address *─1 Region
Category 1─* ProductMaster 1─* VendorProduct *─1 Vendor
User 1─* Order 1─* OrderItem *─1 Vendor ;  OrderItem *─0..1 VendorProduct
User 1─* WalletTransaction (orderId soft link) ; User 1─* Notification
Review.productId → (soft) VendorProduct.id ; User.referredBy → (soft) User.id
```

### 2.4 Where the schema and the real code disagree

| # | Disagreement | Evidence |
|---|---|---|
| 1 | `vendor_fcm_tokens` is also created by raw SQL at runtime (`CREATE TABLE IF NOT EXISTS`) and accessed only through `$queryRawUnsafe`/`$executeRawUnsafe`, despite having a Prisma model | `pushService.js:61-76, 157-174, 298-361`; `index.js:2372` |
| 2 | `banners` table is created and seeded by a raw-SQL script | `server/scripts/migrate_banners.js:40-71` |
| 3 | `Region.priceFactor` is used by a script and the frontend but **does not exist in the schema**. The script would fail; the frontend always uses 1 | `server/scripts/fixExistingVendorProductRegions.js:14`; `CartContext.jsx:220`; `RegionContext.jsx:70` |
| 4 | Region delete sets `regionId: null` on DR/Vendor, but both columns are **required**. Errors are swallowed, then `region.delete` hits an FK violation (inferred: deletion of a used region is broken) | `index.js:3048-3061` |
| 5 | Login checks `vendor.status === "PENDING_REVIEW"`, which is not a VendorStatus | `index.js:773` |
| 6 | `OrderItem.cgstAmount/sgstAmount`, `OTPVerification.isVerified`, `AuditLog`, `ProductImage`, `User.status`, `Category.isActive`, `Vendor.commissionRate` exist but are unused or not enforced | grep |
| 7 | Free-string "enums": DR.status, User.status, WalletTransaction.type/status, AppSetting.*Type, Order.paymentMode, Coupon.expiryDate (date as string) | schema |
| 8 | The raw `pg` dependency is in root `package.json` but **never imported**; all DB access is Prisma | grep |
| 9 | Test fixture TRUNCATE list omits `wallet_transactions`, `app_settings`, `vendor_fcm_tokens` (the last is handled separately) | `server/tests/fixture.js:7-9` |
| 10 | Listing region (`vendor_products.regionId/regionName`) can diverge from `vendors.regionId`. Admin-created listings even **move the vendor** to the listing's region | `index.js:2651-2657` |

---

## 3. User flows

### 3.1 Customer

**A. First visit and district selection**
1. The app loads `/api/v1/public-catalog` once. This single payload holds categories, regions, **all** listings (including pending/rejected), coupons, master products and banners, server-cached for 15 min (`index.js:448-498`). The client filters it.
2. If no district has been chosen, `FirstTimeLocationModal` asks for one. It is stored in localStorage `buildcity_region` and, when logged in, PATCHed to `/users/preferred-region`.
3. Home shows the banner carousel, categories, products in the region (APPROVED listings whose regionId/regionName matches; `Home.jsx:232-254`), a "Deal of the Week" (5 listings shuffled deterministically by a date seed, `Home.jsx:262-285`) and **hardcoded testimonials** (`SiteReviewsSection.jsx`).

**B. Signup (OTP)** (`Register.jsx`)
1. The user enters name, 10-digit phone and an optional referral code.
2. `POST /auth/otp/request {phone, type:"register"}` returns `alreadyRegistered` if the phone exists. Staff numbers are blocked (403 `isStaffBlocked`), including the hardcoded `9999999999` and `7777777777` (`index.js:1606`).
3. A 6-digit OTP is created with `crypto.randomInt`. Older OTPs for the phone are deleted, the new one is stored (10 min) and the SMS is sent **in the background**. The API answers success immediately, even if the SMS fails.
4. `POST /auth/otp/verify {phone, otp, name, referralCode, preferredRegionId/Name}`:
   - the OTP must match and be unexpired;
   - **all OTPs for the phone are deleted** (single use);
   - a new CUSTOMER is created with name (≥2 chars, else `Customer <last4>`), a generated referralCode, and `referredBy` = the referrer's user id if the code is valid. An invalid code is silently ignored;
   - a JWT (7 days) is returned.

**C. Login (OTP)**: as above with `type:"login"`. An unregistered number returns `notRegistered` (this enumerates registered numbers). On verify, an existing customer gets name/region/referralCode back-filled if missing.

**D. Browse**: categories (`/categories`, `/category/:slug`; matching is fuzzy on category name/slug), search (`/search`, client-side), product detail (`/product/:id`, where id is the listing id or the product name).
- **Vendor auto-switch**: if the opened listing is from another district, the page swaps to a listing of the same master product (or exact same name) in the current district. If none exists, the product is shown as "Not deliverable" (`ProductDetail.jsx:186-224`).
- If nothing matches at all, a **fake product is generated** client-side (`generateProduct`, `ProductDetail.jsx:15-71`).

**E. Cart** (`CartContext.jsx`)
- The cart lives in localStorage (`buildcity_cart_<phone>` / `buildcity_cart_guest`) and is synced with debounce (1.2 s) to `PUT /cart` (stored in `users.cartItems`).
- On login, the guest cart, local user cart and DB cart are merged by item id, taking the max qty per id.
- Each item remembers `addedRegionId/Name`. Switching district raises `hasRegionMismatch`, and `updateCartToCurrentRegion` re-maps items to listings in the new district (by masterProductId, id or name) and drops unavailable ones. It calls the staff-only `/cloud-sync`, which **returns 403 for customers** (inferred), so it relies on the passed-in listings.
- Partners (admin/dr/vendor) have no cart.
- Bulk packs: choosing a pack adds an item with id `<listingId>-pack-<qty>`, name `"<name> (<label>)"` and the pack price (`ProductDetail.jsx:588-603`).

**F. Coupons (client side)**: Cart and Checkout validate a typed code against `/coupons` (falling back to three hardcoded coupons). Checks: exists, isActive, `expiryDate >= today` (string compare), `subtotal >= minOrder`. The applied coupon is kept in localStorage.

**G. Checkout** (`Checkout.jsx`, `OrderContext.placeOrder`)
1. Addresses come from AddressContext (`/addresses/me`). Only addresses whose city "matches" the active district (substring match) are deliverable. A new address can be added inline; the app **POSTs it twice** (`Checkout.jsx:305, 313`).
2. The client computes deliveryCharge = region.baseDeliveryCharge (default 49), or 0 if free delivery is enabled and subtotal ≥ threshold. It also computes the coupon discount and the wallet amount (§4.4), and shows MRP savings.
3. It blocks checkout if any item is suspended, inactive or out of stock, using client data.
4. `placeOrder` **groups items by vendor on the client and sends one `POST /orders/checkout` per vendor group, in parallel** (`OrderContext.jsx:283-337`). Each request carries the full `deliveryFee`. Coupon and wallet go only on group 0. Each request gets a fresh random idempotencyKey (`ord_idem_<ts>_<i>_<rand>`), so a retry after a timeout is **not** deduplicated.
5. The server re-splits each request by vendor again (§4.6), creates the orders, decrements stock and wallet, and sends an FCM push to each vendor.
6. On success the cart is cleared (unless Buy Now was used) and a local "Order confirmed" notification is added.

**H. Orders**: `/orders` (tabs: All, Pending, Processing, Out for Delivery, Delivered, Cancelled) and `/orders/:id` (progress tracker PENDING → PROCESSING → OUT_FOR_DELIVERY → DELIVERED). **Customers cannot cancel or request a return**, although the legal pages promise both (`legalPolicies.js:58, 154`).

**I. Profile and wallet** (`Profile.jsx`): name/email edit, wallet balance, passbook (last 50 transactions), referral code to share, coupons list. **Account deletion only by email** (`legalPolicies.js:115`).

**J. Addresses** (`/addresses`): CRUD and set-default. The server dedupes on read by (street, city, pincode) and forces exactly one default (`index.js:3371-3400`).

**K. Reviews**: on product detail. The client allows only customers whose loaded orders "contain" the product (`ProductDetail.jsx:528-548`); the **server only blocks staff roles**.

**L. Notifications**: bell panel. The client polls `/notifications/me`, merges local order notifications and keeps read/dismissed state in localStorage.

### 3.2 Vendor (Partner app / `/vendor/dashboard`)
1. **Onboarding**: no self-signup. An Admin or DR creates the vendor with shop name, owner, phone, password, region and commission rate (default status APPROVED). This also creates or updates a VENDOR user.
2. **Login**: `/vendor/login`, phone + password, plus an optional FCM token. Suspended or pending vendors get 403.
3. **Tabs** (`src/pages/vendor/sections/*`): Overview (delivered revenue, open orders, weekly activity), Orders, Products, Profile (support line `+91 99568 86527`/WhatsApp, `src/pages/vendor/support.js`).
4. **Add listing from catalog** (`CatalogSheet`, `useCatalogOffer`):
   - pick a master product;
   - set MRP ⇄ discount% ⇄ price (linked fields, `utils/pricing.js`), stock (default 100) and optional bulk packs (prefilled by category rules, §4.9);
   - submit `POST /vendor/listings`, which creates it as **PENDING_REVIEW / inactive** until a DR or Admin approves.
5. **Edit listing** (`EditListingSheet`): price, MRP, stock, packs, description and pause/resume through `PATCH /vendor/listings/:id`. A vendor can resume only an APPROVED listing. **Price changes do not require re-approval.**
6. **Orders**:
   - list from `GET /orders/vendor/:id` (only the vendor's own items), with a 60 s poll while visible and refresh on push;
   - new-order toast and alert sound (`utils/orderAlertSound.js`);
   - status control offers PENDING, PROCESSING, OUT_FOR_DELIVERY, DELIVERED and CANCELLED (`StatusControl.jsx:4`), with no transition rules;
   - a vendor may change status only if **every item** in the order is theirs (`index.js:3280-3291`). Since checkout splits orders per vendor, this normally holds.
7. **Push**: on native, FCM channel `vendor_order_alerts`. A push received in the foreground is re-shown as a local notification; tapping opens the order.
8. **Logout**: deregisters the FCM token.

### 3.3 DR (`/dr/dashboard`, `DrDashboard.jsx`)
Tabs: products (district listings), masterCatalog, vendors, listings (approvals), orders. Data is polled every 5 min plus on focus.

The district scope is every region whose name canonicalizes (via aliases) to the DR's region name (`index.js:219-247`). Within it a DR can:
- create, edit, suspend/approve and delete vendors in the district. **The DR chooses the status (default APPROVED) and the commission rate.**
- create listings for district vendors (auto-APPROVED) and approve or reject listings.
- **create and edit master products globally.** A price edit **overwrites the price of every vendor listing of that master product in every district** (`index.js:2491-2501`).
- view district orders and change their status (any status).
- `GET /drs` returns **all DRs nationwide** (not district-scoped, `index.js:1969-1980`).

### 3.4 Admin (`/admin/dashboard`, `AdminDashboard.jsx:21-33`)
Tabs:
1. **Overview**: total orders, open orders, revenue (= sum of `totalAmount` of all orders, any status; `index.js:168`), counts.
2. **Registered Customers**: paginated users list (100/page).
3. **District Reps**: create, edit (password reset), toggle active (only cosmetic, since login ignores status), delete.
4. **Vendors**: CRUD, status, commission rate.
5. **Products (master catalog)**: CRUD, up to 3 image URLs (comma-joined), description, packs.
6. **Listings & Approvals**: assign a master product to a vendor (auto-approved), approve or reject, edit.
7. **Orders**: all orders and a status dropdown (any → any).
8. **Categories**: CRUD. Deleting a category **deletes all its master products and, by cascade, all their listings**.
9. **Regions**: CRUD, base delivery charge, active flag; the free-delivery toggle and threshold are edited here too.
10. **Coupons**: CRUD.
11. **Banners**: CRUD and reorder.
12. **Wallet & Rewards** (`WalletSettingsTab.jsx`): settings, customer search with balance and last 5 transactions, manual credit/debit.
13. **Send Notifications**: broadcast types offer, price and info, stored as a DB row only (no push, no SMS).

---

## 4. Business rules and calculations

### 4.1 Prices
- The **listing price is the vendor's selling price, GST-inclusive** (inferred: no tax logic exists anywhere). MRP is display-only. Discount % = `round((mrp-price)/mrp*100)` (`src/pages/vendor/utils/pricing.js:4-8`).
- MRP fallback is `round(price*1.2)` (`index.js:2681`, `CartContext.jsx:383`, `productPacks.js:6`).
- Region `priceFactor` multiplies price in the cart (`CartContext.jsx:220`) but is always 1. **Drop it.**
- At checkout the **server re-prices** each item from the live listing (`priceAtPurchase = listing.price`; `index.js:3685-3700`). Client prices are ignored, except for the delivery fee and unknown coupons (see below).

### 4.2 Delivery fee (`index.js:3747-3790`)
```
fee = (client deliveryFee if numeric && >= 0) else (region.baseDeliveryCharge || 49)
if settings.freeDeliveryEnabled && itemsSubtotal(of THIS request) >= freeDeliveryMinAmount (default 25000): fee = 0
each vendor sub-order created by this request gets the full fee
```
- **Bug**: the client controls the fee and can send 0.
- **Bug**: in a multi-vendor cart the fee is charged **once per vendor order**, and the free-delivery threshold is evaluated **per request (one vendor group)** on the server but on the **whole cart** in the UI. A ₹30k cart split across two vendors at ₹15k each shows "Free delivery" but is charged 2× the client fee (inferred, from `OrderContext.jsx:307` and `index.js:3788`).
- Region is resolved from `regionId`, then `districtName` (substring), then **the first region in the DB**. The client falls back to a **hardcoded Varanasi UUID** (`Checkout.jsx:344`).
- **There is no server check that listings belong to the delivery region.**

### 4.3 Coupons (server, `index.js:3754-3781`)
```
code = upper(trim)
db = coupon where code && isActive
if db and (expiryDate null or expiryDate >= todayUTC 'YYYY-MM-DD'): discount = db.discountAmount
if NOT db and client discountAmount > 0: discount = client discountAmount   ← accepts any made-up coupon
minOrder is NOT checked server-side; no usage limits; no per-user limits
```
Allocation: the discount applies to the first vendor sub-order only, capped at that sub-order's subtotal (`index.js:3818`). The remainder is lost.

Default coupons, hardcoded in 3+ places: BUILDCITY100 (₹100, min ₹1000), SUPER500 (₹500, min ₹5000), WELCOME200 (₹200, min ₹1500), all expiring "2026-12-31".

### 4.4 Wallet redemption (`index.js:3783-3804`, UI `Checkout.jsx:219-232`)
```
if useWallet && settings.walletRedeemEnabled && balance > 0:
   maxAllowed = min(maxWalletUsageFlat(500), cartSubtotal * maxWalletUsagePercent(10)/100, balance)
   used = clamp(requested ?? balance, 0, maxAllowed), rounded to 2 dp
first vendor sub-order: walletPart = min(subtotal0 - discount0, used)
```
- The ledger row `ORDER_REDEMPTION` (−amount, no orderId) and `walletBalance decrement` run in the checkout transaction.
- **Bugs**:
  - When the first sub-order is smaller than `used`, the wallet is debited the full `used` but only `walletPart` reduces any order.
  - The UI floors the percent limit and caps by the remaining order total; the server does neither.
  - The balance is read before the transaction and the decrement has no `balance >= x` guard, so concurrent checkouts can drive the **balance negative**.
  - The ORDER_REDEMPTION row has **no orderId**.

### 4.5 Cashback and referral (on transition to DELIVERED; `index.js:1471-1590`, triggered at `3341-3345`)
```
eligible = round2(order.totalAmount - order.deliveryFee)          // after coupon & wallet
rawSubtotal = sum(items.totalPrice)
qualifies = rawSubtotal >= minOrderForCashback(5000) OR eligible >= minOrderForCashback
Cashback (if cashbackEnabled && qualifies && eligible>0 && no ORDER_CASHBACK tx for orderId):
   PERCENTAGE: min(maxCashbackCap(500) if >0, eligible*cashbackValue(2)/100) ; FLAT: cashbackValue
   → credit customer, ledger ORDER_CASHBACK(orderId), order.cashbackEarned
Referral (if referralEnabled && qualifies && customer.referredBy && no REFERRAL_BONUS tx for orderId):
   PERCENTAGE: min(maxReferralRewardCap(1000) if >0, eligible*referrerReward(2)/100) ; FLAT: referrerReward
   → credit REFERRER on EVERY qualifying delivered order (lifetime commission)
```
- The admin settings endpoint **forces both types to PERCENTAGE** (`index.js:1207, 1211`).
- It runs **after the response, fire-and-forget**. Errors are only logged, there is no retry, and the dedupe check is check-then-insert, so concurrent DELIVERED updates can double-credit.
- The **referee reward (`refereeReward`, ₹50 FLAT) is shown in admin settings and returned by `/wallet/validate-code`, but is never credited anywhere.**
- Self-referral and referral rings are not prevented beyond the code having to exist at signup.
- **Nothing is reversed** when an order goes DELIVERED → CANCELLED (cashback and referral stay).

### 4.6 Checkout algorithm (server, `index.js:3584-3947`)
1. Auth required (any role, including vendors and staff). 1–100 items.
2. **Idempotency**: if any order exists with `key` or `key__v*`, return those orders (409 if owned by someone else).
3. Load live listings: APPROVED, isActive, vendor not SUSPENDED, and (id ∈ ids **or name ∈ names, case-insensitive**).
4. For each item:
   - qty must be an integer in 1..10000;
   - match by id, else **by name across any vendor or region** (it can silently pick another vendor's listing);
   - price must be > 0;
   - line = qty × price.
5. Address: find the user's address with the same street+city (case-insensitive), else create one (pincode default "221001"). City is set to the **region name**, not the user's input.
6. Delivery fee, coupon and wallet as above.
7. Group by vendorId and create **one order per vendor** (status PENDING, COD).
8. **Stock**: `dec = min(listing.stockQty, requestedQty)`, then `updateMany where stockQty >= dec`. The requested qty is never compared to stock, so **overselling is accepted** and stock clamps at 0. `updateMany` silently affects 0 rows under a race. Pack stock is ignored.
9. One `$transaction` covers order creates, stock ops and wallet ops.
10. Response 201 `{success, order, orders}`. Then a background FCM push per vendor order.

**Bulk-pack orders appear unorderable (inferred).** The cart item id `<listingId>-pack-N` and name `"<name> (<label>)"` match no listing, so checkout throws "Product not available". Even if they matched, the server would charge `listing.price × qty` and lose the pack multiplier and pack price.

### 4.7 Order state machine
- **As implemented**: any of the 7 statuses can be set from any status by VENDOR (own orders), DR (district) or ADMIN (`index.js:3263-3351`). There are no transition rules and no history or timestamps per status.
- Side effects:
  - entering CANCELLED from non-CANCELLED increments stock for each item (legacy items are matched by name), in the same transaction;
  - entering DELIVERED from non-DELIVERED triggers rewards (async).
- **Not handled**: wallet refund, coupon restore, cashback/referral reversal, CANCELLED → other (stock is not re-decremented), notifications to the customer.
- **Recommended for the rebuild**:
```
PENDING ──accept──▶ CONFIRMED ──pack──▶ PROCESSING ──dispatch──▶ OUT_FOR_DELIVERY ──deliver──▶ DELIVERED
   │                    │                    │
   └──────cancel────────┴────────cancel──────┘ (customer: only PENDING/CONFIRMED; vendor/DR/admin: until dispatch)
DELIVERED ──(admin only) return/refund flow──▶ RETURNED/REFUNDED (new)
```

### 4.8 Region and service-area rules
- A listing is "in region" if the listing's regionId or regionName (or its vendor's) matches the active region by id, or by **name with substring match either way** (`Home.jsx:238-244`). "Varanasi" matching "Varanasi Cantt" is accidental fuzziness.
- **DR scope** uses canonical district aliases (`index.js:197-210`): varanasi = {varanasi, varnasi, banaras, kashi, vns}, mirzapur = {mirzapur, mzp}, prayagraj = {prayagraj, allahabad}, jaunpur.
- Order ↔ region: by the address region, or (no address) by a vendor in the region (`index.js:148-158`, `260-267`).
- Customer address deliverability: address.city fuzzy-equals the active region name (`Checkout.jsx:139-149`).
- `Region.isActive` only hides the region in the picker; the **server does not enforce it**.

### 4.9 Bulk packs
- Data: `customPacks` JSON on a listing (or master) `[{qty>1, label, unitName, price, mrp, stock}]`. With none, there are no packs.
- Display (`productPacks.generateProductPacks`, lines 243-301): base pack (qty 1, listing price) plus the bulk options; per-unit price = round(price/qty).
- Default suggestions for vendors (`getDefaultPacksForProduct`, lines 2-220) are detected from category or name keywords (paint, cement, steel, tile, aggregate):

  | Category | Unit | Pack quantities |
  |---|---|---|
  | Paint | 1 Litre | 5/10/20/50 |
  | Cement | 50 kg bag | 5/10/20/50/100 |
  | Steel | 1 Ton or 1 Piece | 5/10/20/50 (tons), 5/10/25/50/100 (pieces) |
  | Tiles | 1 Box | 5/10/25/50 |
  | Aggregate | 1 Ton or 100 CFT | 5/10/20/50 |

  Bulk discount on suggestions: 2% (<10), 3% (≥10), 4% (≥20), 6% (≥50), 8% (≥100).

### 4.10 Listing approval rules
- A vendor-created listing starts PENDING_REVIEW, isActive=false. One created by Admin or DR starts APPROVED and active (`index.js:2660, 2686-2688`).
- Approve sets isActive=true; reject or pending sets isActive=false (`index.js:2800-2807`).
- Vendor SUSPENDED sets all its listings inactive. Vendor APPROVED re-activates its APPROVED listings (`index.js:2267-2278`, `2319-2330`). Pauses made by the vendor before a suspension are lost.
- The vendor may toggle isActive only when APPROVED; a price edit by the vendor does not reset approval.

### 4.11 Revenue and summary numbers (`index.js:161-181`)
- Admin/DR revenue = Σ `order.totalAmount` over **all statuses** (including cancelled).
- Vendor revenue = Σ `orderItem.totalPrice` for the vendor's items on DELIVERED orders.
- Vendor order view: `totalAmount` = whole order total if the vendor owns all items, else only its items' subtotal (`index.js:3227-3251`).

### 4.12 Commission and payouts
- `vendors.commissionRate` (default 10%) is editable but **used in no calculation**. There are no payouts, settlements, ledgers or vendor statements. COD cash is collected by the vendor (inferred; `orderView.js` shows "Cash on delivery, collect").
- The rebuild needs an owner decision (§10).

### 4.13 Notifications
- In-app only.
  - A broadcast is `POST /notifications`, stored as a row with `userId` = target user, else the first ADMIN, else the first user. If there are no users at all, it **creates an ADMIN user with phone 7607650875, the seed customer's phone** (`index.js:4137-4145`).
  - `/notifications/me` for non-admins returns their own rows **plus every row owned by any ADMIN user**, which is how broadcasts work.
  - Read state for broadcasts is client localStorage only.
  - **Admin "clear all" (`DELETE /notifications`) deletes every notification in the DB** (`index.js:4182-4183`).
- Push: only vendors, only for new orders. There are no customer pushes, SMS or email for order updates.

### 4.14 Misc rules
- Address POST: if the name is a placeholder ("customer", "user", "Customer 1234", "verified customer"), it is replaced by the address fullName (`index.js:3422-3439`). Region is resolved by city name, else **the first region**.
- Reviews: rating rounded to 1..5 (default 5); author = given name, else the user's name, else "Verified Customer".
- The users list is cursor-paginated (keyset on createdAt, id). Order lists support `?limit` (1–100, default 50), `?cursor` and `?includeOpen=1`; without params they return a legacy plain array capped at 500 (`index.js:79-144`).

---

## 5. API inventory (Express, base `/api/v1`, JSON, `Authorization: Bearer <JWT>`)

Legend: 🌐 public, 🔑 any authenticated user, roles otherwise. Line = `server/src/index.js`.

| # | Method & path | Auth | Input | Output / side effects | Line |
|---|---|---|---|---|---|
| 1 | GET `/health`, `/api/v1/health` | 🌐 | — | `{status, timestamp, memoryUsage}` | 360 |
| 2 | GET `/db-check` | ADMIN | — | DB/env diagnostics (db host, flags, user count) | 365 |
| 3 | GET `/public-catalog` | 🌐 | — | `{categories, regions, listings(all, incl. pending/rejected, vendor+region+master), coupons(all), masterProducts, banners}`; 15-min cache; falls back to in-memory coupons/banners | 448 |
| 4 | GET `/cloud-sync` | ADMIN, DR, VENDOR | — | Role-scoped `{drs, vendors, masterProducts, categories, regions, orders(admin only), ordersPage, ordersSummary, listings, coupons, users(+usersPage), banners}`; 15 s cache | 511 |
| 5 | POST `/auth/vendor/login` | 🌐 (10 failed/15 min per ip+phone) | `{phone, password, fcmToken?}` | Admin (phone 9999999999) → DR → Vendor resolution; returns `{token, user, dr?/vendor?}`; saves the FCM token | 653 |
| 6 | GET `/coupons` | 🌐 | — | All coupons (incl. inactive) | 829 |
| 7 | POST `/coupons` | ADMIN | `{code,title,discountAmount,minOrder,expiryDate,desc,isActive}` | Creates (upper-cased code). On DB error returns a **fake in-memory coupon** | 838 |
| 8 | PATCH `/coupons/:idOrCode` | ADMIN | partial | Updates; falls back to the in-memory list | 880 |
| 9 | DELETE `/coupons/:idOrCode` | ADMIN | — | deleteMany by id or code; always `{success:true}` | 932 |
| 10 | GET `/banners?activeOnly=true` | 🌐 | — | Banners (15-min cache, fallback list) | 956 |
| 11 | POST `/banners` | ADMIN | `{tag,title,imageUrl*,targetUrl,isActive,displayOrder}` | Create (fallback in-memory) | 984 |
| 12 | PATCH `/banners/:id` | ADMIN | partial | **Upsert** (creates if missing, e.g. seed ids) | 1028 |
| 13 | DELETE `/banners/:id` | ADMIN | — | Delete | 1092 |
| 14 | GET `/settings/wallet` | 🌐 | — | Full AppSetting (creates the default row if missing) | 1172 |
| 15 | PUT `/admin/wallet-settings` | ADMIN | any AppSetting fields | Upsert; **missing fields fall back to the in-process cache** (defaults after restart, inferred overwrite risk); types forced to PERCENTAGE | 1183 |
| 16 | GET `/admin/wallet-users?search=` | ADMIN | — | ≤50 customers with balance and last 5 transactions | 1248 |
| 17 | POST `/admin/wallet-adjust` | ADMIN | `{userId, amount, action: CREDIT/DEBIT, reason}` | Sets an absolute `newBal = max(0, bal±amt)` (race-prone) plus ledger ADMIN_ADJUST(±amt). A clamped debit records a larger amount than was removed | 1300 |
| 18 | GET `/wallet` | 🔑 CUSTOMER only | — | `{balance, referralCode(auto-gen), referredBy, settings subset, transactions(50)}` | 1359 |
| 19 | POST `/wallet/validate-code` | 🌐 | `{code}` | `{valid, referrerName, rewardAmount}`; **unused by the frontend**; enumerates codes and names | 1440 |
| 20 | POST `/auth/otp/request` | 🌐 (5/h per phone, 30/h per IP) | `{phone(10 digits), type: login/register}` | Generates and stores the OTP, sends the SMS async; `{success, isRegistered}` or `notRegistered/alreadyRegistered`; 403 for staff | 1595 |
| 21 | POST `/auth/otp/verify` | 🌐 (10/15 min per phone) | `{phone, otp, name?, referralCode?, preferredRegionId/Name?}` | Consumes the OTP, upserts the CUSTOMER, `{token, user}` | 1686 |
| 22 | GET `/users/me` | 🔑 | — | Own user (auto-generates referralCode) | 1788 |
| 23 | GET `/cart` | 🔑 | — | `{cartItems}` | 1809 |
| 24 | PUT `/cart` | 🔑 | `{items: []}` | Stores the cart blob (unvalidated) | 1822 |
| 25 | PATCH `/users/preferred-region` | 🔑 | `{regionId?, regionName?}` | Update | 1842 |
| 26 | GET `/users/by-phone/:phone` | self or ADMIN | — | User | 1866 |
| 27 | PUT `/users/profile` | 🔑 | `{name, email, preferredRegionId/Name}` | Update self | 1878 |
| 28 | GET `/users` | ADMIN | `?limit&cursor` | Users with addresses and last 3 orders | 1909 |
| 29 | POST `/users` | ADMIN | `{phone, name, role, email}` | Create any role (incl. ADMIN) | 1944 |
| 30 | GET `/drs` | ADMIN, DR | — | All DRs (not scoped) | 1969 |
| 31 | POST `/drs` | ADMIN | `{name, phone, password, regionId}` | Create/upsert user (role DR) and DR row; invalid region → first region or auto-create Varanasi | 1982 |
| 32 | PATCH `/drs/:idOrPhone` | ADMIN | `{name, phone, password, regionId, status}` | Update DR and user | 2038 |
| 33 | DELETE `/drs/:idOrPhone` | ADMIN | — | Deletes the DR row (user keeps role DR) | 2086 |
| 34 | GET `/vendors` | ADMIN, DR (district) | — | Vendors with region and user | 2105 |
| 35 | POST `/vendors` | ADMIN, DR (own district) | `{shopName, ownerName, phone, password, regionId/regionName/districtName, commissionRate, addedByDr, status}` | Resolve or **auto-create region** (default name "Mirzapur"); create/upsert VENDOR user and vendor | 2121 |
| 36 | PATCH/PUT `/vendors/:idOrPhone` | ADMIN, DR | partial | Update vendor and user; status cascades to listings | 2211 |
| 37 | PATCH `/vendors/:idOrPhone/status` | ADMIN, DR | `{status}` | Status (no enum validation) and listing cascade; returns 200 even if not found | 2295 |
| 38 | DELETE `/vendors/:idOrPhone` | ADMIN, DR | — | Deletes FCM rows, listings, vendor and user(s); errors swallowed (FK failures inferred when orders exist) | 2342 |
| 39 | GET `/master-products` | 🌐 | — | All masters (15-min cache) | 2410 |
| 40 | POST `/master-products` | ADMIN, DR | master fields | Create (no category → first category) | 2430 |
| 41 | PATCH `/master-products/:id` | ADMIN, DR | fields, `suggestedPrice` or `price` | Update; **propagates price and description to all listings** | 2462 |
| 42 | DELETE `/master-products/:id` | ADMIN | — | Deletes listings and master | 2515 |
| 43 | GET `/vendor/listings?mine=1` | 🌐 / DR scoped with mine=1 | — | All listings (incl. unapproved) | 2528 |
| 44 | POST `/vendor/listings` | VENDOR, DR, ADMIN | `{masterProductId*, vendorId/vendorName, regionId/regionName, price, mrp, stockQty, customPacks}` | Create the listing (snapshot of master); VENDOR → pending; increments user.productCount; may move vendor region | 2562 |
| 45 | PATCH `/vendor/listings/:id` | VENDOR (own), DR (district), ADMIN | `{price, stockQty, approvalStatus(staff), isActive, description, mrp, customPacks}` | Update | 2707 |
| 46 | PATCH `/vendor/listings/:id/status` | ADMIN, DR | `{approvalStatus}` | Approve, reject or pending | 2780 |
| 47 | GET `/categories` | 🌐 | — | Categories (cached) | 2821 |
| 48 | POST `/categories` | ADMIN | `{name, productCount}` | Create (or return the existing one) | 2838 |
| 49 | PATCH `/categories/:idOrName` | ADMIN | `{name, productCount, isActive}` | Update | 2860 |
| 50 | DELETE `/categories/:idOrName` | ADMIN | — | **Deletes all masters (and cascaded listings)** | 2891 |
| 51 | GET `/regions` | 🌐 | — | Regions (cached) | 2932 |
| 52 | POST `/regions` | ADMIN | `{name, state, baseDeliveryCharge, isActive}` | Create | 2949 |
| 53 | PATCH `/regions/:idOrName` | ADMIN | partial | Update; a rename cascades to listing regionName | 2973 |
| 54 | DELETE `/regions/:idOrName` | ADMIN | — | Unlink and delete (broken, §2.4 #4) | 3024 |
| 55 | GET `/orders` | ADMIN, DR (district) | `?regionId=a,b&limit&cursor&includeOpen=1` | Orders with items, vendor, customer and address | 3118 |
| 56 | GET `/orders/summary` | 🔑 role-scoped | `?regionId` | `{totalOrders, openOrders, byStatus, totalRevenue, revenueBasis}` | 3137 |
| 57 | GET `/orders/me` | 🔑 | paging | Customer orders (incl. orders **delivered to an address with their phone**) | 3159 |
| 58 | GET `/orders/user/:userId` | self or ADMIN | paging | Same as above | 3171 |
| 59 | GET `/orders/vendor/:vendorId` | VENDOR (always own), DR, ADMIN | paging | Vendor-scoped orders and items with `isPartialOrder` and vendor totals | 3185 |
| 60 | PATCH `/orders/:id/status` | VENDOR (owns all items), DR (district), ADMIN | `{status}` | Status; stock restore on cancel; rewards on delivered | 3263 |
| 61 | GET `/addresses/me`, `/addresses/user/:userId`, `/addresses/:userId` | self or ADMIN | — | Deduped addresses | 3408-3410 |
| 62 | POST `/addresses` | 🔑 | `{fullName, phone, street, city, state, pincode, isDefault}` | Upsert by street+city; may rename the user | 3412 |
| 63 | PUT `/addresses/:id` | owner or ADMIN | partial | Update | 3519 |
| 64 | DELETE `/addresses/:id` | owner or ADMIN | — | Delete | 3562 |
| 65 | POST `/orders/checkout` | 🔑 | `{items[{id/productId,name,quantity}], idempotencyKey, couponCode, discountAmount, useWallet, walletDiscount/walletAmount, deliveryFee, regionId, districtName, address{...}}` | §4.6 | 3584 |
| 66 | POST `/vendor/fcm-token` | VENDOR (own), DR, ADMIN | `{token, vendorId?, phone?}` | Bind device to vendor | 3950 |
| 67 | DELETE `/vendor/fcm-token`, POST `/vendor/fcm-token/deregister` | optional auth | `{token?, vendorId?(admin)}` | Unbind | 3993-3994 |
| 68 | GET `/reviews?productId=` | 🌐 | — | Reviews | 3997 |
| 69 | POST `/reviews` | 🔑 non-staff | `{productId, name, rating, comment}` | Create | 4013 |
| 70 | GET `/notifications/me` | 🔑 | — | Own rows and admin-owned (broadcast) rows, ≤60 | 4060 |
| 71 | GET `/notifications?userId=` | ADMIN | — | ≤60 | 4095 |
| 72 | POST `/notifications` | ADMIN | `{title, message, userId?}` | Create (broadcast or targeted) | 4120 |
| 73 | PATCH `/notifications/:id/read` | 🔑 | — | Mark own read | 4164 |
| 74 | DELETE `/notifications` | 🔑 | — | Customer: delete own. **Admin: delete ALL** | 4178 |
| 75 | DELETE `/notifications/:id` | ADMIN | — | Delete | 4193 |

Vercel serverless functions (`api/`):

| Path | Purpose |
|---|---|
| GET `/api/sms?<aradhya query>` | SMS relay to Aradhya. Requires `x-relay-secret` only if `SMS_RELAY_SECRET` is set (**otherwise an open relay** using the caller's credentials). Validates `apirequest=Text` and a 10-digit mobile |
| POST `/api/ota-vendor` | Capgo self-hosted update check: reads `https://www.buildcity.in/ota/vendor/latest.json` and answers `{version,url,checksum}` or `{kind:"up_to_date"}` |
| `/api/ota-customer` | Always `up_to_date` (customer OTA disabled) |

`vercel.json` rewrites `/api/v1/*` to the Railway backend `https://buildcity-web-production-a5ca.up.railway.app` and everything else to `index.html`.

Global middleware (`index.js:22-49, 269-288`): compression; helmet with **CSP disabled**; CORS that is **open when `ALLOWED_ORIGINS` is unset** (Capacitor origins are always allowed); a JSON replacer that strips `password` keys from all responses; an in-memory cache that is fully cleared by any POST/PUT/PATCH/DELETE outside a short whitelist; JSON 404 for unknown `/api` routes. A **self-ping to `buildcity-web.onrender.com` runs every 8 min** (legacy Render keep-alive, `index.js:398-409`).

---

## 6. Integrations and environment

### 6.1 SMS: Aradhya Technologies (DLT, India)
- Endpoint: `GET {http|https}://sms.aradhyatechnologies.in/sms-panel/api/http/index.php?username&apikey&apirequest=Text&sender&mobile&message&route&TemplateID&peid&format=JSON` (`server/src/smsService.js:31-44`).
- Order of attempts: **plain HTTP first (API key in cleartext)**, then the Vercel relay `https://buildcity-web-part-2.vercel.app/api/sms` (hardcoded), then HTTPS with **`rejectUnauthorized:false`**.
- Success test: HTTP 2xx and (`status=="success"` or `"000"` or the body contains "successfully").
- DLT template (must match exactly): `Dear user, Thankyou for visiting Sonevalley. Your OTP for login is {#var#}. Please do not share this OTP with anyone.\nRegards SNVLY`.
- Defaults: sender `SNVLY`, TemplateID `1707175298595096991`, PE ID `1701175266640135857`, route `TRANS`.
- Env: `SMS_USERNAME`/`ARADHYA_SMS_USERNAME`, `SMS_APIKEY`/`ARADHYA_SMS_APIKEY`, `SMS_SENDER`, `SMS_TEMPLATE_ID`, `SMS_PEID`, `SMS_ROUTE`, `SMS_RELAY_SECRET`, `SMS_TIMEOUT_MS` (declared, unused).
- Branding issue: OTPs say "Sonevalley", not "BuildCity". A new DLT template is needed if the brand should change.

### 6.2 Firebase Cloud Messaging (vendors only)
- Server: `firebase-admin`, credentials from `FIREBASE_SERVICE_ACCOUNT` (JSON string) or `FIREBASE_SERVICE_ACCOUNT_PATH` / `server/firebase-service-account.json` (`pushService.js:9-37`).
- Message: title `New Order Received • ₹<amount>`, body `Order #ORD-*XXXX (<n> items) • Tap to review`, data `{orderId, orderNumber, type:"NEW_ORDER"}`, Android priority high, channel `vendor_order_alerts`, icon `ic_stat_order`, color `#EA580C`.
- Token store: an in-memory map, a **local JSON file `server/data/vendor-fcm-tokens.json`** (ephemeral in containers) and the DB table. Lookup falls back by vendor id, user id, then a phone `LIKE`. One token per key, and a device token is unbound from other vendors when rebound.
- Client: `@capacitor/push-notifications` + `@capacitor/local-notifications` (`src/utils/pushNotifications.js`). `android/app/google-services.json` (not committed) must contain both app ids.
- The `firebase` web SDK is in `package.json` but unused.

### 6.3 Android / Capacitor
- One project with two product flavors (`android/app/build.gradle:16-38`):
  - `customer`: `com.buildcity.app`, v1.2.4 (code 7). The **bundled** web build (`dist`) loads at runtime and calls the API at `https://www.buildcity.in` (`src/config/api.js`). **Customer OTA is disabled** (`api/ota-customer.js`), so installed customer apps run a **frozen frontend**.
  - `partner`: `com.buildcity.vendor`, v1.2 (code 3). By default `server.url = https://www.buildcity.in/vendor/login` (a live WebView) with `appendUserAgent: "BuildCityPartner"`. `src/config/appMode.js` detects that marker and renders the vendor UI. There is an offline page and capgo OTA (`/api/ota-vendor`). `--bundled` mode is also possible.
- `scripts/android.mjs`: builds vite, runs `cap sync` and patches `android/app/src/main/assets/capacitor.config.json` per flavor.
- `scripts/ota-bundle.mjs`: zips `dist/` to `dist/ota/vendor/<pkgver>-<sha7>.zip` and writes `latest.json {version,url,checksum(sha256),minNativeVersion:"1.1"}`. It packs the **default (customer-mode) build** as the vendor bundle and relies on the UA marker (inferred).
- Manifest: `usesCleartextTraffic=true`, `allowBackup=true`, permissions INTERNET, VIBRATE, POST_NOTIFICATIONS, WAKE_LOCK. The default FCM channel is `vendor_order_alerts` (it applies to the customer app too).
- `docs/android-release.md` says the **customer** app gets OTA and the partner app is a live WebView. The code disables customer OTA and gives OTA to the vendor app, so **the docs and the code disagree**.

### 6.4 Hosting today (inferred from config)
- Frontend and serverless functions: **Vercel** (`vercel.json`, region `bom1`), domain `www.buildcity.in`.
- API: **Railway** (`buildcity-web-production-a5ca.up.railway.app`). Earlier on **Render** (`buildcity-web.onrender.com`, still pinged). `Procfile`s for both.
- DB: **Supabase Postgres** (pooled `DATABASE_URL` on 6543, `DIRECT_URL` on 5432).
- Images: external URLs only (Cloudinary `res.cloudinary.com/lbwxvqmg`, Unsplash). **There is no upload feature.**
- The frontend falls back to Railway when the Vercel proxy fails (`src/config/authFetch.js:820-843`).

### 6.5 Environment variables (current)

| Var | Used by |
|---|---|
| `PORT`, `NODE_ENV` | server |
| `JWT_SECRET` (≥32 chars, required) | `middleware/auth.js:10-16` |
| `ALLOWED_ORIGINS` | CORS |
| `DATABASE_URL`, `DIRECT_URL` | Prisma |
| `SMS_*` / `ARADHYA_SMS_*`, `SMS_RELAY_SECRET` | SMS |
| `FIREBASE_SERVICE_ACCOUNT` / `FIREBASE_SERVICE_ACCOUNT_PATH` | push |
| `RENDER_EXTERNAL_URL` | keep-alive ping |
| `VITE_API_URL`, `VITE_BACKEND_URL`, `VITE_APP_MODE` (`.env.vendor`) | frontend |
| `VERCEL_GIT_COMMIT_SHA` | OTA bundle versioning |

---

## 7. Auth and security model

### 7.1 Model
- JWT HS256, 7-day expiry, payload `{sub, phone, role, tv}` (`middleware/auth.js:23-34`). Stored in **localStorage** (`buildcity_token`); the user object is in `buildcity_auth`.
- Middleware: `requireAuth`, `optionalAuth`, `requireRole(...)`, `requireSelfOrAdmin(getter)`. Self is matched by user id **or by phone digits** (`auth.js:133-136`).
- The `sub` differs by role: customer and admin = user id; **DR = DR row id** (`index.js:730`); vendor = linked user id (or the synthetic `u-vendor-<phone>`). The code compensates by searching `id OR userId` everywhere.
- Partner passwords are bcrypt (cost 10), stored **in up to two places** (users.password and vendors/DR.password).
- Super admin is identified by the hardcoded phone `9999999999`. Its password is set with `server/scripts/setAdminPassword.js`.
- The client-side role gate (`ProtectedRoute.jsx`) trusts the role in localStorage; the server enforces real authz.

### 7.2 Concrete problems

| Sev | Problem | Where |
|---|---|---|
| 🔴 Critical | **Release keystore committed with password** `buildcity123` (store and key). Anyone with repo access can sign APKs as BuildCity. Play App Signing may mitigate; the upload key must be rotated | `android/app/buildcity-release.keystore`, `android/app/build.gradle:41-46` |
| 🔴 Critical | **Client-controlled delivery fee** (send 0) | `index.js:3747-3752` |
| 🔴 Critical | **Arbitrary coupon accepted**: an unknown code plus a client `discountAmount` is honoured; minOrder is not checked server-side | `index.js:3774-3780` |
| 🔴 High | DR can edit master products, which **rewrites prices of all vendors' listings in all districts**; DR can create master products globally | `index.js:2430, 2462-2501` |
| 🔴 High | Wallet race: no balance guard in the decrement, so concurrent checkouts overspend. Admin adjust is read-modify-write | `index.js:3866-3880`, `1314-1332` |
| 🔴 High | Rewards double-credit race (check-then-insert, no unique key) and fire-and-forget (no retry, lost on crash) | `index.js:1499-1585`, `3341` |
| 🔴 High | No reversal on cancel: wallet redemption, coupon, cashback and referral commission all stay | `index.js:3313-3345` |
| 🔴 High | Customer order visibility includes **any order whose address phone or customer phone *contains* the user's phone**, exposing other customers' orders and PII | `index.js:3106-3115` |
| 🟠 Medium | `tokenVersion` never checked: no logout or password-change revocation. Suspended vendors and inactive DRs keep working until the token expires | `auth.js`, `index.js:769-775` |
| 🟠 Medium | DR `status` not checked at login; vendor without a vendor row is treated as APPROVED | `index.js:714-747, 769` |
| 🟠 Medium | Stock oversell (clamps instead of rejecting); a silent 0-row update under a race; pack stock ignored | `index.js:3857-3863` |
| 🟠 Medium | Product matched **by name across vendors and regions** at checkout and in stock restore | `index.js:3653, 3677-3679, 3323-3326` |
| 🟠 Medium | No server check that items are deliverable to the address region; region falls back to the first region | `index.js:3628-3638` |
| 🟠 Medium | Admin "clear notifications" wipes the whole table | `index.js:4182-4183` |
| 🟠 Medium | SMS API key sent over **plain HTTP** first; HTTPS with TLS verification disabled; relay is open if the secret is unset | `smsService.js:8, 97-107`; `api/sms.js:14-17` |
| 🟠 Medium | CORS open by default; CSP disabled; JWT in localStorage (XSS → account takeover) | `index.js:25, 31-44` |
| 🟠 Medium | Rate limiters and caches are in-memory: they reset on deploy and cannot scale beyond one instance | `index.js:291-357` |
| 🟠 Medium | OTP stored in plaintext; user enumeration via `notRegistered`/`alreadyRegistered` and `/wallet/validate-code` | `index.js:1633-1648, 1440` |
| 🟠 Medium | Public endpoints return **unapproved/rejected listings, vendor statuses and all coupons** | `index.js:448-498, 2528-2560, 829` |
| 🟡 Low | DRs see all DRs (phones) across districts | `index.js:1969` |
| 🟡 Low | DR can set vendor status to anything (no enum validation) and self-approve vendors | `index.js:2295-2317, 2196` |
| 🟡 Low | Reviews: "verified buyer" only client-side; no moderation or delete | `index.js:4013-4057` |
| 🟡 Low | `POST /users` lets an admin create other ADMINs with no password flow; no audit log | `index.js:1944` |
| 🟡 Low | Delete endpoints swallow errors and report success | `index.js:932-953, 2342-2407` |
| 🟡 Low | Android `usesCleartextTraffic`, `allowBackup=true` | `AndroidManifest.xml` |
| 🟡 Low | Vendor price edits skip re-approval | `index.js:2728-2732` |

**SQL injection:** no injection risk found. All raw SQL (`$executeRawUnsafe`/`$queryRawUnsafe`) is parameterized with `$1..`. The only interpolation is the fixed table list in the test fixture. The `pg` package is unused.

**Money as floats:** the DB uses `Decimal`, but all arithmetic is JS `Number` with ad-hoc `Math.round(x*100)/100`, and percentages are applied to floats. The frontend rounds pack prices to whole rupees.

**Secrets in the repo:** no `.env`, Firebase JSON or SMS keys are committed in the visible history (50 commits, shallow clone; older history is unverified). The keystore and its passwords **are committed**. A pre-commit hook (`.husky/pre-commit`) greps for obvious secrets.

---

## 8. Tech-debt and mess inventory

**Junk and committed artifacts**
- `git` (an empty file at the repo root), `scratch_push.bat` (a git add/commit/push script), `server/scratch_seed_coupons.js`.
- `BuildCity-Partner-Release.aab` (10 MB, committed despite `*.aab` in `.gitignore`), `android/app/buildcity-release.keystore`.
- Duplicate images: `buildcity-feature-graphic.png` and `play_store_assets/feature_graphic_1024x500.png`; `buildcity-icon-512.png` and `play_store_assets/app_icon_512x512.png`; `public/categories/paints.jpg` and `.png`.
- `README.md` is still the Vite template boilerplate. `skills-lock.json` and `.claude/` are tooling noise.

**Dead or unused code**
- `AuthContext.login()`: a mock email login that assigns the role from the email substring (`AuthContext.jsx:276-290`), never called.
- `generateProduct()` fake products (`ProductDetail.jsx:15-71`); `DEMO_NAMES` review filter; `SiteReviewsSection` **hardcoded testimonials marked `verified: true`**. This is a consumer-protection risk: fabricated reviews presented as real.
- Models `AuditLog`, `ProductImage`; columns `isVerified`, `cgst/sgst`, `commissionRate`, `User.status`, `Category.productCount/isActive` (semantics).
- `/wallet/validate-code` (unused by the UI); `refereeReward` (never paid).
- Deps: `pg`, `firebase` (web), `jsonwebtoken` and `dotenv` in the **frontend** package.json.
- Scripts: `testPostAddressApi.js` (posts without auth, would 401), `testSecurity.js` (assumes OTP `123456` exists), `fixExistingVendorProductRegions.js` (uses the non-existent `priceFactor`; force-moves all listings to Mirzapur and APPROVES them, dangerous), `clearAllVendors.js` (wipes **all order items**, vendors and listings with no confirmation).
- The Render keep-alive ping; the `couponsList`/`bannersList` in-memory "fallback DB" that fakes success on DB errors.

**Duplication**
- Default coupons hardcoded in 4 places (`index.js:411-415`, `scratch_seed_coupons.js`, `Cart.jsx:13-17`, `Checkout.jsx:242-246`).
- Default banners in 4 places (`index.js:417-445`, `migrate_banners.js`, `Home.jsx:177+`, `AdminContext.jsx:149+`).
- Default wallet settings in 3 places (`index.js:1111-1129`, `AdminContext.jsx:~260`, `WalletSettingsTab.jsx:~20`).
- Region defaults (`RegionContext.jsx`, server create paths "Varanasi"/"Mirzapur"/49).
- Vendor/DR/user field sync (password stored twice). The `vendor-by-id-or-phone` lookup is repeated in about 6 handlers.
- Order status label maps duplicated in `Orders.jsx`, `OrderDetail.jsx`, `DrDashboard.jsx`, `vendor/ui/format.js`, `AdminDashboard.jsx`.
- Vendor splitting done twice (client `OrderContext.placeOrder` and server checkout).

**Inconsistencies**
- Role casing (`"VENDOR"` server, `"vendor"` client), `qty` vs `quantity`, `price` vs `priceAtPurchase`, `districtName` vs `regionName` vs `city`, `vendorInfo` vs `vendorId`, `total` vs `totalAmount`.
- Approval and active flags are recomputed differently client vs server. The client shows **`stockQty: Number(l.stockQty) || 100`**, so **out-of-stock (0) listings show as 100 in stock** (`AdminContext.jsx:406, 768`).
- `docs/android-release.md` contradicts the OTA code. The SMS brand ("Sonevalley") differs from the product brand.
- Comments mix Hinglish and English; some log messages claim "Supabase" etc.

**Hardcoded values**
- Admin phone `9999999999` and DR phone `7777777777` (`index.js:664, 1606`).
- Support `+919956886527` (vendor), grievance `6291782061`, seed customer `7607650875` (also used as a phone fallback in checkout: `Checkout.jsx:295, 367`).
- Production region UUIDs in the frontend; the Railway URL in 3 places; the Vercel relay URL.
- Default pincode `221001`, delivery ₹49, MRP = price×1.2, default stock 100, default price 100, Unsplash placeholder images.

**Architecture smells**
- A 4,242-line single server file; 2,295-line `AdminContext`; 3,773-line `AdminDashboard`; 2,454-line `DrDashboard`.
- Whole-catalog payloads to every visitor (`public-catalog` returns all listings and masters); client-side filtering, search and pricing.
- localStorage used as a shadow DB for orders, products, custom packs, MRPs and notifications (`buildcity_custom_packs`, `buildcity_listing_mrps` override server data in `ProductDetail.jsx:228-235, 281-287`).
- Polling everywhere (60 s vendor, 5 min admin/DR/coupons) plus window events for sync.
- No TypeScript, no input validation library, no migrations, no structured logging, no error tracking. Tests are integration scripts only (they need a local Postgres, `server/tests/run.js`).

---

## 9. Rebuild recommendations (Next.js 15+ / TypeScript / Server Actions / Coolify)

### 9.1 Guiding decisions
1. **One Next.js app** (App Router) serves:
   - the storefront (SSR/ISR for SEO: home, categories, product pages, sitemap);
   - the customer account area;
   - `/partner` (vendor), `/dr` and `/admin` dashboards, as route groups with role layouts.
2. **Server Actions** handle all web mutations. **Route Handlers (`app/api/...`)** remain for:
   - (a) **legacy `/api/v1/*` compatibility**, because installed customer APKs run a frozen bundled SPA that calls `https://www.buildcity.in/api/v1/...` with Bearer JWTs (customer OTA is disabled), and older Partner installs may run bundled code. Keep the exact request and response shapes for the endpoints those builds use until a forced-upgrade release ships;
   - (b) Capgo OTA (`/api/ota-vendor`, `/api/ota-customer`);
   - (c) FCM token registration from native code;
   - (d) health checks;
   - (e) any webhook (a future payment gateway, SMS DLR).
3. **Mobile strategy**: make **both** Capacitor apps thin shells pointing at the live Next.js site (`server.url`), like the Partner app today, and drop bundled builds. Server Actions and cookies then work inside the WebView. Native bits (push, local notifications, status bar, back button) stay as Capacitor plugins called from client components. Ship one new native release per app and use a "minimum version" check to force-upgrade the old bundled customer app. Then retire the v1 compat layer.
4. **Database**: Postgres 16 as a Coolify service. **Drizzle ORM** is recommended (SQL-first migrations, simple row-level locking, `numeric` handling); Prisma is also fine if the team prefers it. **Store money as integer paise (`bigint`)** or `numeric(12,2)` with a decimal library. Never use JS floats for money.
5. **Validation**: zod schemas shared by Server Actions and Route Handlers. Use a `safe-action` wrapper with auth and role middleware.

### 9.2 Proposed module boundaries (`src/modules/*`)

| Module | Owns | Key server functions |
|---|---|---|
| `auth` | users, otp_challenges, sessions, partner credentials | requestOtp, verifyOtp, partnerLogin, logout, getSession, requireRole |
| `geo` | regions (+ `district` grouping, aliases table), service-area check | listActiveRegions, resolveRegion, assertDeliverable |
| `catalog` | categories, master products, product images, pack templates | CRUD and search (Postgres FTS / trigram) |
| `vendors` | vendors, vendor_users, DR assignments | onboard, suspend, scope checks |
| `listings` | vendor listings, pack offers (normalized table), stock | submitListing, approve/reject, updateOffer (re-approval on price change, configurable) |
| `cart` | carts, cart_items (DB, keyed by listing + pack) | add, update, merge guest cart |
| `pricing` | **one pure function** `quote(cart, region, coupon, walletUse, settings) → Quote` used by the cart UI and checkout | delivery fee, coupon, wallet cap, free delivery |
| `orders` | orders (one per vendor), order_items, order_status_history, checkout_sessions | placeOrder (transaction with locks), transition(state machine), cancel |
| `promotions` | coupons, coupon_redemptions | validate, redeem, restore |
| `wallet` | wallet_accounts, wallet_ledger (balance derived or locked), reward rules | credit, debit, reverse; jobs for cashback and referral |
| `notifications` | notifications, notification_reads, device_tokens (multi-device, multi-role) | inApp, push (FCM), sms (status updates) |
| `reviews` | reviews (userId, orderItemId FK = verified purchase), moderation | |
| `content` | banners, legal pages, settings | |
| `admin`/`reports` | dashboards, summaries, CSV exports, audit_log | |
| `settlements` (new, optional) | vendor commission ledger and payouts | depends on owner decision |

### 9.3 Target data model changes
- `users(id, phone unique, name, email, role, status, referral_code unique, referred_by_user_id fk, preferred_region_id fk, created_at)`. **Staff and vendor credentials live in one place** (`user_credentials` or `users.password_hash`). Never copy password hashes.
- `vendors(id, owner_user_id fk, shop_name, region_id fk not null, status enum, commission_bps int, onboarded_by_user_id fk)`; `vendor_members` if one shop has multiple logins.
- `dr_assignments(user_id, district_id)`. Introduce **`districts`** (canonical) with `regions`/`service_areas` beneath, which replaces the alias hack and fuzzy name matching. Optionally add `pincodes` per service area.
- `listings(id, vendor_id, master_product_id, unique(vendor_id, master_product_id), price_paise, mrp_paise, status enum(draft,pending,approved,rejected,paused), stock_qty int check >=0, version)`.
- `listing_packs(id, listing_id, qty, label, price_paise, mrp_paise, active)`. Order items reference `(listing_id, pack_id)`. Stock is decremented by `qty × pack.qty` (base-unit stock) unless packs need their own stock (owner question).
- `orders(id, order_number human-readable e.g. BC-2026-000123 via sequence, checkout_id fk, customer_id, vendor_id, region_id, address snapshot jsonb, subtotal, delivery_fee, coupon_discount, wallet_used, total, payment_mode enum, status enum, timestamps)`. Add `checkouts(id, idempotency_key unique, customer_id, totals…)` grouping the per-vendor orders, so coupon, wallet and free delivery are allocated at checkout level with an explicit per-order allocation.
- `order_status_events(order_id, from, to, actor_user_id, reason, at)`.
- `wallet_ledger(id, user_id, amount_paise signed, type enum, ref_type, ref_id, unique(type, ref_type, ref_id))`. Store the balance as `wallet_accounts.balance_paise` updated in the same transaction with `SELECT … FOR UPDATE` and a `check (balance_paise >= 0)`.
- `coupons(code unique, type flat|percent, value, max_discount, min_order, starts_at, ends_at timestamptz, usage_limit, per_user_limit, active)` + `coupon_redemptions(coupon_id, user_id, checkout_id unique)`.
- `notifications(id, audience enum(user,role,all), user_id?, …)` + `notification_reads(user_id, notification_id)`.
- `device_tokens(id, user_id, app enum(customer,partner), token unique, platform, last_seen)` for multi-device support.
- `reviews(id, user_id, listing_id/master_product_id, order_item_id unique, rating, comment, status)`.
- `audit_log` actually written for every staff mutation.
- Taxes: optional `hsn_code`, `gst_rate_bps` on master products and a per-item tax breakdown, if invoices are needed (owner question).

### 9.4 Endpoint → new home mapping

| Old | New (web) | Keep as Route Handler? |
|---|---|---|
| `/auth/otp/request`, `/auth/otp/verify` | `auth.requestOtp`/`verifyOtp` actions; session cookie (httpOnly, SameSite=Lax) | **Yes** in `/api/v1/auth/otp/*` (returns JWT) for legacy apps |
| `/auth/vendor/login` | `auth.partnerLogin` action | **Yes** (partner legacy) |
| `/public-catalog`, `/categories`, `/regions`, `/master-products`, `/vendor/listings`, `/banners`, `/coupons`, `/reviews` GET | RSC data loaders (server components) with `unstable_cache`/tags; paginated per region | **Yes** (legacy customer APK reads `/public-catalog`, `/vendor/listings`, `/coupons`, `/regions`, `/settings/wallet`, `/reviews`) — read-only, filtered to approved |
| `/cloud-sync` | Split into per-dashboard RSC loaders | Partner legacy only, if bundled partner builds exist |
| `/cart` GET/PUT | `cart.*` actions | **Yes** (legacy) |
| `/orders/checkout` | `orders.placeOrder` action (server computes everything) | **Yes** (legacy shape `{success, order, orders}`), but **ignore client fees and discounts** |
| `/orders/me`, `/orders/user/:id`, `/orders/summary` | RSC loaders | **Yes** (legacy) |
| `/orders/vendor/:id`, `/orders/:id/status` | partner and staff actions | Partner legacy, if needed |
| `/addresses*`, `/users/me`, `/users/profile`, `/users/preferred-region`, `/wallet`, `/notifications/me`, `/notifications/:id/read` | actions and loaders | **Yes** (legacy) |
| Admin/DR CRUD (drs, vendors, categories, regions, coupons, banners, master-products, listings status, wallet settings/adjust/users, notifications POST/DELETE, users) | Server Actions only | No (web-only dashboards) |
| `/vendor/fcm-token` (+deregister) | — | **Yes** (native plugin calls; generalize to `/api/devices`) |
| `/api/ota-vendor`, `/api/ota-customer`, `/api/sms` | OTA as Route Handlers; SMS relay **deleted** (call the gateway server-side over HTTPS) | OTA yes |
| `/health`, `/db-check` | `/api/health` (liveness + DB ping) | Yes |

Before retiring anything, capture real legacy traffic (Coolify proxy logs) to confirm which v1 endpoints the old APKs actually call (inferred list above).

### 9.5 Auth approach (phone OTP)
- OTP: store a **hash** (HMAC-SHA256 with a server secret) with expiry (5–10 min), attempt counter (max 5) and resend cooldown (30–60 s). Rate-limit per phone and per IP in **Postgres** (or Redis if added). Send through a provider abstraction (`SmsProvider` interface with an Aradhya implementation over HTTPS, TLS verified) and keep the DLT template id and PE id in env.
- Do not reveal registration status: use one combined "continue with phone" flow that creates the account on first verify. Collect the name after verify.
- Sessions: a DB `sessions` table with an opaque random token in an **httpOnly, Secure cookie** for web/WebView. For legacy Bearer clients, keep issuing JWTs signed with the **same `JWT_SECRET`** during transition so existing tokens stay valid, and **check `tokenVersion`/session revocation**.
- Partners: phone + password (argon2id/bcrypt) **plus OTP 2FA for ADMIN/DR** (recommended). No hardcoded admin phone; use a seed script that creates the first admin.
- Authorization: a single policy layer (`can(user, action, resource)`) with scoped queries (vendor → own vendor_id; DR → own district_ids). Status checks (user, vendor, DR) run on every request via the session lookup.

### 9.6 Checkout, done right
1. Server-side `quote()` from DB cart items (listing + pack) and the selected address.
2. In one DB transaction:
   - `SELECT … FOR UPDATE` the listing rows; check approved, active, vendor active, **listing region ∈ address district** and `stock >= qty`; reject otherwise;
   - lock the wallet account and check the balance;
   - validate the coupon (dates, min order, usage limits) and insert `coupon_redemptions`;
   - create the `checkout` and per-vendor `orders` with **explicit allocation** of coupon and wallet (pro-rata or the largest first, owner decision);
   - apply the delivery-fee policy (owner decision: once per checkout vs per vendor; free delivery evaluated on the checkout subtotal);
   - decrement stock and write ledger rows;
   - enqueue `order.placed` jobs (push to vendor, SMS/push to customer).
3. Idempotency key unique on `checkouts`, generated once per checkout attempt client-side and reused on retry.

### 9.7 Background jobs
Use **pg-boss** (Postgres-backed queue, no Redis needed) with a **separate worker process** (same image, different start command) in Coolify. Jobs:
- `order.placed` → FCM to vendor device(s); optional SMS/WhatsApp to customer.
- `order.status_changed` → customer push/SMS; on `DELIVERED` → `rewards.credit` (idempotent via the ledger unique key); on `CANCELLED` → `wallet.refund`, `coupon.restore`, `rewards.reverse`, `stock.restore`.
- `notifications.broadcast` → fan-out to device tokens (FCM topic per role/region).
- Cron (pg-boss schedules or Coolify Scheduled Tasks): purge expired OTPs and sessions, auto-cancel stale PENDING orders after N hours (owner decision), nightly vendor summary/settlement report, DB backup verification.

### 9.8 Coolify deployment
- **Resources**:
  1. `buildcity-web` (Next.js, Dockerfile, `output: "standalone"`);
  2. `buildcity-worker` (same image, `CMD node worker.js`);
  3. **PostgreSQL 16** service (Coolify one-click) with scheduled S3 backups enabled;
  4. optional MinIO/S3 for product image uploads (replaces pasting Cloudinary/Unsplash URLs).
- **Dockerfile sketch**: multi-stage `node:22-alpine` → `pnpm install --frozen-lockfile` → `next build` → copy `.next/standalone`, `.next/static` and `public` → `node server.js`. Run `drizzle-kit migrate` (or `prisma migrate deploy`) as a **pre-deploy command** or an init step, never `db push`.
- **Domains**: `www.buildcity.in` (and apex redirect) on the web app with Coolify's Traefik and Let's Encrypt. Keep `/api/v1/*` and `/api/ota-*` paths on the **same domain**, because old apps hardcode `https://www.buildcity.in`.
- **Health check**: `/api/health`.
- **Env (new)**: `DATABASE_URL`, `SESSION_SECRET`, `JWT_SECRET` (reuse the old value for legacy tokens), `OTP_HMAC_SECRET`, `SMS_PROVIDER=aradhya`, `SMS_USERNAME`, `SMS_APIKEY`, `SMS_SENDER`, `SMS_TEMPLATE_ID_OTP`, `SMS_PEID`, `SMS_ROUTE`, `FIREBASE_SERVICE_ACCOUNT` (JSON), `APP_URL=https://www.buildcity.in`, `OTA_BASE_URL`, `S3_*` (if uploads), `SENTRY_DSN` (recommended), `TZ=Asia/Kolkata` for reports (store timestamps in UTC).
- **OTA bundles**: produce them in CI (GitHub Actions) and upload them to S3/MinIO or the app's `public/ota`. With the "live URL shell" strategy, OTA becomes optional.
- **Single instance first**: the old code's in-memory caches and limiters disappear. If scaling to more than one replica, all state lives in Postgres.

### 9.9 Migration path for existing data (Supabase → Coolify Postgres)
1. Freeze writes (maintenance window), then `pg_dump` Supabase (`DIRECT_URL`) and restore into a **staging** schema `legacy` on the new server.
2. Run idempotent SQL/TS transforms from `legacy.*` into the new schema:
   - users: keep UUIDs and phones; build `user_credentials` from users.password, falling back to vendors/district_representatives.password; map `referredBy` to an FK (drop dangling values).
   - regions: build `districts` by applying the alias map (`index.js:197-202`) and merge duplicate region rows; keep the old region ids as `service_areas` for FK continuity.
   - vendors and DRs: link by userId; where userId is missing, match by phone.
   - master products: split comma-separated `imageUrl` into `product_images`.
   - listings: dedupe (vendor, master) by keeping the latest; convert prices to paise; turn `customPacks` JSON into `listing_packs`.
   - orders: create one `checkout` per idempotency-key family (`key`, `key__vN`), or one per order if the key is null; snapshot the address; build items, with `vendorProductId` null kept as is; turn the status into status events (only the current status is known, with `updatedAt`).
   - wallet: copy `wallet_transactions` to the ledger, recompute balances, and **report differences against `users.walletBalance`** for owner review.
   - coupons: parse the string expiry into timestamptz (end of day IST).
   - notifications: rows owned by admins become `audience=all` broadcasts.
   - reviews: attach to listings where `productId` matches; keep orphans as hidden.
   - `vendor_fcm_tokens`: map to `device_tokens` (app=partner).
   - Drop `otp_verifications` and `product_images` (empty, inferred).
3. Validation queries: counts per table, order totals, wallet sums.
4. Cut over DNS, keep the Supabase project read-only for 30 days.
5. Rotate every secret: JWT (after the legacy app retirement), SMS API key, Firebase key, Android upload key (keystore leak), Supabase credentials.

### 9.10 Phased plan
| Phase | Scope | Exit criteria |
|---|---|---|
| **0. Hygiene (now, on old code)** | Rotate the leaked keystore/upload key (Play Console upload-key reset); remove the `.aab`, `git` and scratch files; set `ALLOWED_ORIGINS` and `SMS_RELAY_SECRET`; hot-fix checkout to ignore client `deliveryFee`/`discountAmount` and enforce coupon minOrder; restrict DR master-product edits; check DR/vendor status in middleware | Critical holes closed while rebuilding |
| **1. Foundation** | Next.js + TS repo, Drizzle schema and migrations, auth (OTP + partner login + sessions), policy layer, Coolify (web + worker + Postgres + backups), CI | Staging deployed, login works |
| **2. Catalog and storefront** | Districts/regions, categories, master products, listings and packs (approval flow), SSR storefront, search, product page, banners, SEO (sitemap, robots, Search Console tag) | Parity browse on staging with migrated data |
| **3. Cart, checkout and orders** | DB cart, `quote()`, transactional checkout, per-vendor orders, state machine, cancellation and refunds, customer order pages | E2E tests for pricing, wallet, coupons, stock and races |
| **4. Partner, DR and admin** | Vendor dashboard (orders, listings, push), DR dashboard (scoped), admin (all tabs from §3.4 plus audit log, CSV export) | Staff UAT sign-off |
| **5. Wallet and rewards, notifications** | Ledger, cashback/referral jobs (+referee bonus if wanted), reversals, broadcast push, customer status SMS/push | Reconciliation report matches |
| **6. Legacy compat and mobile** | `/api/v1` compat Route Handlers for old APKs, OTA handlers, new Capacitor shells (live URL) for both apps, Play releases, force-upgrade gate | Old and new apps both work against the new backend |
| **7. Data migration and cutover** | Dry runs on staging, final migration, DNS switch, monitoring | Production on Coolify, Supabase read-only |
| **8. Cleanup** | Retire v1 compat after the upgrade threshold, delete the Vercel/Railway/Render/Supabase projects, rotate the JWT secret | — |

---

## 10. Open questions for the owner

1. **Delivery fee policy**: charge once per checkout, or once per vendor shipment? Is the free-delivery threshold (₹25,000) evaluated on the whole cart? Should the fee vary by distance or pincode within a district?
2. **Commission and payouts**: is `commissionRate` (10%) real? How do vendors pay BuildCity, given that COD cash is collected by the vendor? Do you need settlement statements, invoices or a vendor ledger?
3. **Taxes and invoicing**: are listing prices GST-inclusive? Do you need GST invoices (GSTIN of vendor and customer, HSN codes, CGST/SGST/IGST)? Who is the seller of record: BuildCity/Sonevalley or the vendor?
4. **Payments**: COD only, or add UPI and a payment gateway (Razorpay/PhonePe)? Partial advance for large orders?
5. **Cancellation and returns**: may customers cancel before dispatch (the legal pages say yes)? Is a return/refund flow needed in-app (the legal pages describe one)? Should wallet refunds be automatic?
6. **Order lifecycle**: should vendors explicitly **accept/reject** new orders (CONFIRMED)? Should stale PENDING orders auto-cancel? Is a delivery partner/driver role needed later?
7. **Rewards**: should the **referee ₹50 welcome bonus** be paid (it is configured but never credited)? Is lifetime referral commission intended without limit? Should cashback be reversed on cancellation/return? When does wallet money expire?
8. **Coupons**: need percentage coupons, per-user limits, first-order-only, region- or category-restricted coupons?
9. **Bulk packs**: is pack stock separate from unit stock? Can customers mix packs and units of the same listing? (Pack orders currently appear to fail.)
10. **Multiple vendors per product per district**: show the cheapest vendor, let the customer choose, or auto-assign?
11. **Listing price changes**: should vendor price edits require DR re-approval? Should DRs be allowed to edit the global master catalog?
12. **Districts**: confirm the canonical list (Varanasi, Mirzapur, Jaunpur, Prayagraj) and whether pincode-level serviceability is needed.
13. **Branding and SMS**: keep the "Sonevalley/SNVLY" DLT template, or register a BuildCity template and sender?
14. **Mobile**: OK to move the customer app to a live-URL shell (instant updates, Server Actions) and force-upgrade old installs? How many active installs of the old customer build exist?
15. **Image hosting**: allow uploads (S3/MinIO on the VPS) or keep pasting URLs?
16. **Hardcoded testimonials** (`SiteReviewsSection`) and the "Deal of the Week" logic: keep, replace with real reviews, or remove?
17. **Accounts**: in-app account deletion (Play Store requirement for apps with accounts)? Can admins block customers?
18. **Data**: is the Supabase wallet balance authoritative where it disagrees with the ledger? Can the test/seed users (`7607650875`, `9876543210`, `7777777777`) be deleted?
19. **Ops**: required backup RPO/RTO, who gets alerts, and should staff actions be audit-logged?
