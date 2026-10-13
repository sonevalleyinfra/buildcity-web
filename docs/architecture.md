# BuildCity — Technical Architecture & System Design

**Version:** 1.2.4  
**Stack:** React 19 + Vite 8 + Tailwind CSS 4 + Node.js Express + Prisma ORM + Supabase PostgreSQL  
**Mobile Packaging:** Capacitor 8 (Android Studio APK / Play Store AAB)  
**Authentication:** Dual-Auth (Customer Mobile OTP via Aradhya DLT SMS Gateway; Staff Password JWT for Vendor, DR & Admin)

---

## 1. High-Level Architecture Flow

```
[ Client Application ]
  ├── React 19 SPA (Web / PWA)
  └── Capacitor 8 Shell (Android APK / AAB)
          │
          ▼ (HTTPS / JWT Authorization)
[ Security & Routing Layer ]
  ├── requireAuth & requireRole Guards (Admin / DR / Vendor / Customer)
  ├── District Scope Guard (drCanManageVendor)
  └── Zero-Flicker LocalStorage + In-Memory Caching
          │
          ▼
[ Express.js Backend Services ]
  ├── Orders & Atomic Checkout Engine
  ├── DR Return & Wallet Settlement Desk
  ├── Master Product Catalog & Vendor Listings
  └── Wallet Ledger & Cashback Rewards Engine
          │
          ▼ (Prisma $transaction - Atomic Commits)
[ Database & External Integrations ]
  ├── Supabase PostgreSQL (Core Data & Ledger)
  ├── Aradhya DLT SMS Gateway (Customer OTP Dispatch)
  ├── Firebase FCM (Vendor & Order Notifications)
  └── Capgo Updater (Instant Live OTA App Updates)
```

---

## 2. Order & Return Settlement Lifecycle

```
[1. Order Placement]
  Customer Checkouts COD (with Delivery Fee + Wallet Discount)
        │
        ▼
  Backend Locks & Decrements Vendor Product Stock
        │
        ▼
  Vendor Accepts & Dispatches Material to Site
        │
        ▼
  DR marks order DELIVERED  ──▶  Cashback Credited to Customer Wallet

[2. Return & Refund Settlement]
  Customer requests return of excess/damaged materials
        │
        ▼
  DR opens Return Desk, enters returned item quantities
        │
        ▼
  DR clicks "Confirm Return, Settle Wallet & Restore Stock"
        │
        ├── 1. Physical Vendor Stock restored automatically
        ├── 2. Used Wallet Amount credited back to Customer Wallet (+₹24)
        ├── 3. Cashback (₹23) stays in Customer Wallet
        └── 4. Net Cash Refund (₹488 - ₹24 - ₹23 = ₹441) handed to Customer in cash
```

---

## 3. Database Entity Relationships Overview

| Model | Primary Fields | Key Relationships |
| :--- | :--- | :--- |
| **`User`** | `id`, `phone`, `name`, `role`, `walletBalance`, `referralCode` | Places `Order`, owns `WalletTransaction` |
| **`Region`** | `id`, `name`, `baseDeliveryCharge`, `isActive` | Operates vendors & DRs in district |
| **`Vendor`** | `id`, `userId`, `shopName`, `regionId`, `status` | Linked to `Region`, owns `VendorProduct` |
| **`VendorProduct`**| `id`, `vendorId`, `name`, `price`, `stockQty`, `approvalStatus` | Linked to `Vendor`, referenced by `OrderItem` |
| **`Order`** | `id`, `orderNumber`, `customerId`, `totalAmount`, `deliveryFee`, `walletDiscount`, `cashbackEarned`, `status` | Contains `OrderItem[]`, returned via `OrderReturn` |
| **`OrderItem`** | `id`, `orderId`, `vendorProductId`, `quantity`, `priceAtPurchase` | Child of `Order`, links to `VendorProduct` |
| **`OrderReturn`** | `id`, `orderId`, `drId`, `returnAmount`, `cashbackDeducted`, `netRefundCash`, `returnItems` | Child of `Order`, audited by `drId` |
| **`WalletTransaction`**| `id`, `userId`, `amount`, `type`, `orderId` | Audit passbook ledger for `User` |

---

## 2. Technology Stack & Dependencies

### Frontend (`/src`)
- **Core Framework:** React `^19.2.8` + React DOM `^19.2.8`
- **Build Tool:** Vite `^8.2.1` with `@vitejs/plugin-react` `^6.0.4`
- **Routing:** `react-router-dom` `^7.18.2` (Declarative Protected & Role-Restricted Routes)
- **Styling:** Tailwind CSS `^4.3.3` with `@tailwindcss/vite`
- **Mobile Container:** `@capacitor/core`, `@capacitor/android`, `@capacitor/app`, `@capacitor/push-notifications` `^8.x`
- **OTA Updates:** `@capgo/capacitor-updater` `^8.51.25`

### Backend (`/server`)
- **Runtime:** Node.js LTS (ES Module / CommonJS hybrid)
- **Web Framework:** Express `^4.x`
- **ORM / Database Driver:** Prisma Client with PostgreSQL connection pooling (`@prisma/client`, `pg` `^8.13.1`)
- **Security:** `jsonwebtoken` `^9.0.3` (HS256 tokens, 30-day customer / 7-day staff sessions), `crypto` (HMAC OTP tokens)
- **SMS Integration:** Native HTTPS agent with custom DLT payload targeting Aradhya SMS Gateway

---

## 3. Database Schema Overview (Prisma / Supabase)

### Core Models & Relationships

1. **`User`**
   - `id`: UUID (Primary Key)
   - `phone`: String (Unique, 10-digit normalized)
   - `name`: String
   - `role`: Enum (`CUSTOMER`, `VENDOR`, `DR`, `ADMIN`)
   - `password`: String (Null for customers, encrypted/hashed for staff)
   - `walletBalance`: Float / Decimal (Default: 0.0)
   - `referralCode`: String (Unique 6-char alphanumeric e.g. `BC7842`)
   - `referredBy`: String (Referrer's code)
   - Relations: Orders, Addresses, WalletTransactions, VendorProfile, DRProfile

2. **`Vendor`**
   - `id`: UUID / Short String
   - `userId`: UUID (Linked User Account)
   - `shopName`: String
   - `ownerName`: String
   - `phone`: String
   - `regionId`: UUID (Linked District Region)
   - `status`: Enum (`PENDING_APPROVAL`, `APPROVED`, `SUSPENDED`)
   - Relations: Products (`VendorProduct[]`), Orders (`OrderItem[]`)

3. **`DR` (District Representative)**
   - `id`: UUID
   - `userId`: UUID (Linked User Account)
   - `fullName`: String
   - `phone`: String
   - `regionId`: UUID (Assigned District Region)
   - `status`: Enum (`ACTIVE`, `INACTIVE`)

4. **`Region` (Districts)**
   - `id`: UUID
   - `name`: String (`Varanasi`, `Mirzapur`, `Sonbhadra`, etc.)
   - `state`: String (`Uttar Pradesh`)
   - `baseDeliveryCharge`: Float (Default: `49.0` or `56.0`)
   - `isActive`: Boolean

5. **`ProductMaster` & `VendorProduct`**
   - `ProductMaster`: Canonical reference (Brand, Grade, Category, Unit, Suggested Price, Image).
   - `VendorProduct`: Concrete vendor inventory listing with custom `price`, `stockQty`, `approvalStatus` (`PENDING`, `APPROVED`, `REJECTED`), and `isActive`.

6. **`Order`, `OrderItem`, & `OrderReturn`**
   - `Order`:
     - `id`: UUID (`ORD-*XXXX` in display)
     - `orderNumber`: Human-friendly numeric ID
     - `customerId`: UUID
     - `totalAmount`: Float (Net cash paid on delivery)
     - `deliveryFee`: Float (Non-refundable transport fee)
     - `walletDiscount`: Float (Wallet redeemed at checkout)
     - `discountAmount`: Float (Coupon discount)
     - `cashbackEarned`: Float (Credited on delivery)
     - `status`: Enum (`PENDING`, `PROCESSING`, `SHIPPED`, `DELIVERED`, `COMPLETED`, `CANCELLED`)
   - `OrderItem`:
     - `vendorProductId`: UUID
     - `quantity`: Int
     - `priceAtPurchase`: Float
     - `vendorId`: UUID
   - `OrderReturn`:
     - Records return transactions with `returnAmount`, `cashbackDeducted`, `netRefundCash`, and `returnItems` JSON array.

7. **`WalletTransaction`**
   - Ledger model tracking every rupee move: `type` (`WELCOME_BONUS`, `REFERRAL_REWARD`, `ORDER_CASHBACK`, `ORDER_REDEMPTION`, `ADMIN_ADJUST`), `amount` (+/-), `orderId`, and timestamp.

---

## 4. State Management Architecture

BuildCity deliberately uses **React Context with Persistent Caching** rather than heavyweight Redux, maximizing speed and minimizing bundle overhead:

| Context Provider | Location | Purpose |
| :--- | :--- | :--- |
| **`AuthContext`** | `src/context/AuthContext.jsx` | User session, role switching, token storage, logout guards |
| **`RegionContext`** | `src/context/RegionContext.jsx` | Active district selector, base delivery fee sync, region change events |
| **`CartContext`** | `src/context/CartContext.jsx` | Local cart items, subtotal calculation, region-mismatch guards, coupon state |
| **`OrderContext`** | `src/context/OrderContext.jsx` | Orders fetching, live event listeners, multi-vendor split dispatching |
| **`AdminContext`** | `src/context/AdminContext.jsx` | Global catalog, vendors list, coupon master, wallet settings cache |
| **`AlertContext`** | `src/context/AlertContext.jsx` | Centered modal alerts replacing native browser `alert()` popups |
| **`NotificationContext`**| `src/context/NotificationContext.jsx`| Real-time notification tray, live broadcast subscriptions |

### Hybrid Caching Protocol
1. On component mount: Immediate read from `localStorage` (`instant render, 0ms`).
2. Parallel background fetch from Backend API via `authFetch`.
3. Deep-equality comparison (`areOrdersEqual`, `isEqual`): If data changed, update state and persist to `localStorage`; if unchanged, discard silently without re-render.

---

## 5. Security & Isolation Model

1. **Role Separation:**
   - Customers log in **only** via 6-digit OTP. They have no passwords.
   - Vendors, DRs, and Admins log in **only** via Password. OTP login for staff accounts is strictly blocked at the API level (`server/src/index.js`).
2. **District Isolation:**
   - DR endpoints enforce `resolveCallerDrRegionIds(req.auth)`. A DR from Mirzapur cannot access Varanasi orders or vendor listings.
3. **Vendor Isolation:**
   - Vendor endpoints enforce `resolveOwnVendor(req)`. Vendors see only order line-items belonging to their shop.
4. **Order Status Immutability Lock:**
   - Once an order reaches `COMPLETED`, its status is permanently locked in backend validation; no role (not even Vendor) can revert it.
