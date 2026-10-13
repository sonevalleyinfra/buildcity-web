# BuildCity — Task Roadmap & Execution History

**Document Owner:** Sone Valley Infra Engineering Team  
**Last Updated:** October 2026

---

## 1. Recently Completed Milestones (Production Ready ✅)

### Core Dashboards & Authentication
- [x] **DR Dashboard Overhaul (`v1.2.4`):** Redesigned with Vendor-influenced mobile architecture. Separate Account tab with dedicated profile view, top-right mobile avatar trigger, and isolated district order filtering.
- [x] **Auto-Logout Bug Fix:** Eliminated abrupt session expirations across Customer, Vendor, and DR portals by separating Customer token keys from Staff tokens in `AuthContext.jsx` and `server/src/index.js`.
- [x] **Dual Authentication Architecture:**
  - Customers: 6-digit OTP dispatched via Aradhya DLT SMS Gateway (`SONVLY` DLT Sender ID).
  - Staff (Vendors, DRs, Admin): Password-based authentication. Strictly blocked from Customer OTP login to prevent privilege escalation.
- [x] **Live SMS Gateway Integration:** Direct HTTP/HTTPS transport to Aradhya SMS API with DLT template matching, timeout safety, and direct mobile delivery.

### DR Return & Refund Desk (`DrReturnsTab.jsx`)
- [x] **Customer Phone Number & Order ID Search:** Search delivered orders by customer 10-digit mobile number, partial number, or Order ID (`#ORD-*83F2` / `83F2`).
- [x] **Delivered Orders Selectable Card Grid:** Displays all matching delivered orders with Order ID, status badge, customer name, phone, item summary, and total amount, enabling one-click selection for returns.
- [x] **Automated Stock Restoration:** Returned item quantities atomically credited back into `vendorProduct.stockQty` on return completion.
- [x] **Whole Rupee Standard:** Converted all return calculations and display fields from fractional paise (`.4`, `.18`, `.22`) into clean whole rupees (`Math.round`).
- [x] **3-Box Return Settlement System:**
  - Box 1: Material Value minus Delivery Charge, minus Wallet Added Back, minus Cashback = Net Cash Refund.
  - Box 2: Cashback Already in Wallet + Wallet Used Added Back Now = Total in Customer Wallet.
  - Box 3: Net Cash + Total Wallet = Returned Product Value.
- [x] **Automated Customer Wallet Increment:** `POST /api/v1/returns` automatically increments `user.walletBalance` and appends a passbook ledger entry in `prisma.$transaction`.

### Storefront & Regional Logistics
- [x] **District Isolation Engine:** District selector hard-filters vendors, product catalog, and delivery charges.
- [x] **Dynamic Delivery Fees:** Configurable base delivery fee per district (e.g. ₹49 in Varanasi, ₹56 in Mirzapur) with automated free delivery on qualifying orders.
- [x] **Cart Regional Safeguards:** Auto-purges unavailable items and recalculates supplier prices when switching regions.

---

## 2. In-Progress & Active Work

- [x] **Cross-Device Sync Verification:** Verified local environment on newly migrated laptop (`C:\Users\Dell\Downloads\buildcity-web(Part 2 )`) with Git credentials and Node.js runtime.
- [x] **Comprehensive Documentation Suite:** Created `prd.md`, `architecture.md`, `rules.md`, `design.md`, `task.md`, and `memory.md` in `docs/` for human team and AI onboarding.

---

## 3. Future Roadmap & Upcoming Features

### Phase 2: Operations & Invoicing
- [ ] **Automated GST & Non-GST Invoice Generation:** One-click PDF invoice generation with vendor details, customer site address, and HSN codes for B2B builders.
- [ ] **WhatsApp Business Dispatch Notifications:** Automated WhatsApp alerts sent to customer and vendor upon order confirmation, out-for-delivery dispatch, and delivery completion.

### Phase 3: Logistics & Fleet Tracking
- [ ] **Driver / Transporter App Integration:** Assigning district delivery trucks/tractors with real-time site arrival timestamps and OTP-verified physical handover.
- [ ] **Online Payment Gateway (UPI / NetBanking):** Adding Razorpay/Cashfree alongside COD for upfront digital payments with instant webhook verification.

### Phase 4: Vendor & Inventory Intelligence
- [ ] **Low Stock Alerts:** Automated notifications to vendors when `stockQty` falls below safety threshold.
- [ ] **Bulk CSV Product Upload:** Enabling large hardware stockists to import hundreds of SKU prices and grades in a single upload.
