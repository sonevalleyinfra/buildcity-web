# BuildCity — Product Requirements Document (PRD)

<div align="center">
  <img src="../public/buildcity-roof-logo.png" alt="BuildCity Logo" width="220" />
  <p><em>Smart Construction Materials Hyperlocal Marketplace</em></p>
</div>

**Project Name:** BuildCity (Building Material Hyperlocal B2B/B2C Marketplace)  
**Parent Entity:** Sone Valley Infra Pvt. Ltd. (`sonevalleyinfra`)  
**Platform:** Web App (PWA / Mobile-Optimized) + Capacitor Android APK/AAB  
**Target Market:** Tier-2/Tier-3 Construction Material Ecosystem in India (Starting with Eastern UP: Varanasi, Mirzapur, Sonbhadra, Chandauli, Prayagraj, Bhadohi, Ghazipur, Jaunpur)

---

## 1. Executive Summary & Ecosystem Stakeholder Model

```
[ Super Admin ] ──▶ Sets Policies & Assigns Districts ──▶ [ District Rep (DR) ]
                                                                     │
                                                       Approves Shop & Listings
                                                                     │
                                                                     ▼
[ Customer / Builder ] ◀── Dispatches Materials to Site ◀── [ Local Verified Vendors ]
          │
          └──▶ Requests Site Material Return ──▶ Handled by [ District Rep (DR) ]
```

| Stakeholder | Role in Ecosystem | Key Responsibilities |
| :--- | :--- | :--- |
| **Super Admin** | Master Platform Controller | Platform policies, multi-district revenue, wallet/cashback rule engine |
| **District Rep (DR)**| Hyperlocal Ground Manager | Vendor onboarding, product catalog verification, site returns & refund desk |
| **Local Vendors** | District Material Suppliers | Managing local inventory stock, pricing, packing & dispatching orders |
| **Customers / Builders**| Buyers & Project Contractors| COD order placement, site material acceptance, cashback wallet earning |

BuildCity is an on-demand, hyperlocal marketplace designed to modernize the fragmented building materials supply chain in India. It connects:
1. **End Customers & Builders:** Homeowners, contractors, masons, and project managers who need fast site delivery of cement, steel/TMT, bricks, sand, aggregate, plumbing, electrical, and finishing goods at transparent wholesale-linked prices.
2. **Local Verified Vendors (Suppliers):** District-based material traders, stockists, and hardware shop owners who list inventory, set localized pricing, and fulfill dispatches.
3. **District Representatives (DRs):** Hyperlocal ground operations managers appointed by BuildCity per district who onboard vendors, approve listings, monitor dispatches, resolve escalations, and handle physical material returns & refunds.
4. **Super Admin:** Master platform controller monitoring cross-district revenue, setting cashback and referral policies, managing DRs and catalog masters, and overseeing settlements.

---

## 2. Target Personas & Core Problem Solved

### A. Customer / Builder
- **Pain Point:** Opaque pricing, delayed deliveries, manual phone negotiations, lack of digital receipt/warranty, high transport friction.
- **BuildCity Solution:** Transparent district prices, password-free instant Mobile OTP login, verified stock from nearby district suppliers, non-refundable scheduled site delivery, digital wallet cashback, and flexible return desk.

### B. Vendor (Shop Owner / Stockist)
- **Pain Point:** Lack of digital distribution, slow payment collection, customer credit default risks, competition against unorganized players.
- **BuildCity Solution:** Dedicated mobile-first Vendor Dashboard, password-protected shop login, master catalog picker (add inventory in 2 taps), instant order alerts, order-level status dispatch tracking (`PENDING` -> `DELIVERED`), and zero-risk stock reservations.

### C. District Representative (DR)
- **Pain Point:** Ground-level logistics and returned material handling often cause dispute between customer and shop owner.
- **BuildCity Solution:** Unified DR Desk with full district visibility, Vendor stock management, Master Catalog additions, and a mathematically locked **DR Return & Refund Desk** with automated customer wallet credit and physical vendor stock restoration.

### D. Super Admin
- **Pain Point:** Multi-district leakage, margin control, referral fraud, manual reconciliations.
- **BuildCity Solution:** Real-time platform KPI cards, user management with direct Supabase PostgreSQL sync, dynamic wallet rules (cashback % / cap / min order), multi-district DR assignment, and master product governance.

---

## 3. Key Feature Modules & Scope

### 3.1 Storefront & Customer Experience
- **Location & District Picker:** Header pill with persistent district selector (`Varanasi`, `Mirzapur`, etc.). All products, delivery fees, and vendors strictly filter by active district.
- **Master Product Catalog & Browsing:** Fast client-side searching, category carousels, responsive product grids (max 10 on desktop, 6 on mobile), multi-image sliders, technical specs, and verified customer reviews.
- **Smart Cart & Regional Safeguards:**
  - Dynamic delivery charge calculation based on district base rate (e.g. ₹49/₹56) with auto-free delivery threshold (e.g. orders > ₹25,000).
  - Multi-item checkout grouped by vendor.
  - Cart automatic price-adjustment or item-removal if user switches districts.
- **Customer Checkout:**
  - Saved addresses with default selection and inline new address modal.
  - Single-click coupon validation (`BUILDCITY100`, `SUPER500`, etc.).
  - Wallet balance redemption (capped by super admin safety limits e.g. 10% or ₹500).
  - Cash on Delivery (COD) payment mode with server-side stock decrement locking.
- **Customer Orders & Passbook:**
  - Real-time order tracking (`PENDING`, `CONFIRMED`, `PROCESSING`, `SHIPPED`, `OUT_FOR_DELIVERY`, `DELIVERED`, `COMPLETED`, `CANCELLED`).
  - Dedicated BuildCity Wallet screen with Referral code sharing and full ledger passbook history.

### 3.2 Vendor Dashboard (`/vendor`)
- **Login:** Password-based authentication (Strictly blocked from Customer Mobile OTP for security).
- **Navigation:** Bottom-bar / tabbed architecture (`Orders`, `Products`, `Profile`).
- **Product Management:** Master catalog picker, custom price overrides, stock quantities, and instant activate/deactivate toggles.
- **Order Dispatch Pipeline:** Order acceptance, status progressions, customer address & phone view, and item quantities.

### 3.3 District Representative (DR) Dashboard (`/dr`)
- **District Scoping:** DR accounts are hard-bound to their assigned district. They cannot see or mutate data from other districts.
- **KPI Summary:** Active district orders count, total delivered revenue, active vendor count, and returned orders count.
- **Vendor Onboarding & Approval:** Add/edit district vendors, set passwords, and approve/reject newly submitted vendor products.
- **DR Return & Refund Desk:**
  - Search delivered orders by Order ID or last 4 digits.
  - Step 1: Select returned quantities with `[-]` `[+]` controls.
  - Step 2: Select return reason and auto-detect order cashback.
  - Step 3: Transparent 3-box settlement calculating Net Cash Refund, Customer Wallet Credit, and Total Value Settled.
  - Confirm return commits atomically: restores physical vendor stock, credits wallet, and archives return record.

### 3.4 Super Admin Dashboard (`/admin`)
- **Master Metrics:** Platform GMV, orders breakdown, registered customers, active vendors, active DRs.
- **Master Catalog Governance:** Create/edit master products with suggested prices, brand, grade, and unit specifications.
- **Wallet & Referral Policy Engine:** Real-time toggles for cashback enablement, cashback type (flat vs percentage), max cap, minimum order threshold, referee reward, and max wallet redemption limit.
- **Broadcast Notifications:** Push site-wide alerts and updates to all registered customers in real-time.

---

## 4. Non-Functional Requirements (NFRs)
- **Zero-Flicker Performance:** LocalStorage caching layer preceding every network fetch to prevent layout shifts.
- **Mobile First:** Optimized for sub-₹10,000 Android phones used by masons and vendors on site; tactile active states (`active:scale-[0.98]`), touch targets $\ge 44\text{px}$.
- **Network Resilience:** Fast exponential-backoff fetch retry mechanism (`authFetch`) handling flaky 3G/4G site connections.
- **Atomic Operations:** Critical business transactions (order placement, returns, wallet credits) execute via `prisma.$transaction`.
