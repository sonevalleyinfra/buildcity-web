# BuildCity — Project Memory & AI Context Codex

> **Critical Instruction for All AI Agents & Developers:**  
> This file contains the foundational memory, architectural invariants, developer traps, and command references for the BuildCity codebase. Read this file first before touching any code.

---

## 1. Quick Identity & Repository Metadata

- **Repository URL:** `https://github.com/sonevalleyinfra/buildcity-web.git`
- **Primary Branch:** `main`
- **Git Author:** `Dhiru2 <singhdhiru.ds@gmail.com>`
- **Local Project Path (Laptop):** `C:\Users\Dell\Downloads\buildcity-web(Part 2 )`
- **Local Project Path (Desktop):** `C:\Users\Counter Solutaion\Desktop\buildcity-web(Part 2 )`

---

## 2. Standard Development Commands

```bash
# 1. Install Dependencies
npm install

# 2. Start Frontend Dev Server (Vite on http://localhost:5173)
npm run dev

# 3. Start Backend Express Server (Node on http://localhost:5000)
node server/src/index.js

# 4. Production Build & Verification Check
npm run build

# 5. Git Commit & Push Workflow
git add .
git commit -m "feat/fix(scope): clear description of changes"
git push origin main
```

---

## 3. Critical Architectural Invariants & "Never Do" Rules

1. **NEVER use `window.alert()` or `window.confirm()`:**
   - Always use the centralized `useAlert()` hook from `src/context/AlertContext.jsx`:
     ```javascript
     const { showAlert } = useAlert();
     showAlert({ title: "Title", message: "Details...", type: "success" });
     ```
2. **NEVER allow decimal paise (`.4`, `.18`, `.22`) in financial settlement math:**
   - All amounts (cart subtotal, wallet discounts, cashback, delivery fee, and return settlements) must be rounded to clean whole rupees via `Math.round()` or `Math.floor()`.
3. **Delivery charge is strictly NON-REFUNDABLE:**
   - On returns, never refund the delivery charge (`order.deliveryFee`) in cash or wallet.
4. **Customers NEVER have passwords:**
   - Customers log in strictly via 6-digit OTP. Passwords in `User` table for customer accounts must remain `null`.
5. **Staff accounts are strictly BLOCKED from OTP login:**
   - Vendors, DRs, and Admins must use password authentication. If a staff phone is entered on Customer OTP screen, the backend explicitly rejects it to prevent role confusion.
6. **`COMPLETED` Order Status is an IMMUTABLE LOCK:**
   - Once an order status is updated to `COMPLETED` by DR or Admin, it cannot be changed back to any other status.
7. **Zero-Flicker LocalStorage Rule:**
   - Every dashboard and user state must hydrate immediately from `localStorage` on initial mount before waiting for backend API responses.
8. **NEVER Auto-Commit or Auto-Push Code:**
   - Always run and test changes locally first.
   - Do NOT run `git commit` or `git push` automatically. Wait for the user to test and explicitly confirm with "commit" or "push".
9. **Prisma Atomic Writes:**
   - Multiple database updates that depend on each other (e.g. creating return record + restoring stock + crediting wallet) must be wrapped inside `prisma.$transaction([...])`.

---

## 4. Key Directory Map

```
buildcity-web(Part 2 )/
├── docs/                        # Complete technical & product documentation
│   ├── prd.md                   # Product requirements & personas
│   ├── architecture.md          # Tech stack, schema & system design
│   ├── rules.md                 # Return & financial settlement rules
│   ├── design.md                # UI/UX design system & tokens
│   ├── task.md                  # Roadmap & completed milestones
│   └── memory.md                # Invariants & developer guidelines
├── server/
│   ├── prisma/
│   │   └── schema.prisma        # PostgreSQL Prisma database schema
│   └── src/
│       └── index.js             # Unified Express backend & API endpoints
├── src/
│   ├── components/              # Shared UI components (Navbar, RegionPicker, etc.)
│   ├── config/                  # API endpoints, authFetch wrapper, constants
│   ├── context/                 # Context state providers (Auth, Cart, Order, etc.)
│   └── pages/
│       ├── admin/               # Super Admin Dashboard
│       ├── customer/            # Storefront, Cart, Checkout, Orders, Profile
│       ├── dr/                  # District Representative Hub & Return Desk
│       │   ├── DrDashboard.jsx  # DR main shell & controllers
│       │   └── sections/
│       │       └── DrReturnsTab.jsx # 3-Box Return Settlement Desk
│       ├── public/              # Home, Categories, ProductDetail, Search
│       └── vendor/              # Vendor Partner Dashboard & store controls
└── package.json                 # Project scripts & dependencies
```

---

## 5. Primary API Endpoints Reference

### Authentication
- `POST /api/v1/auth/otp/send` — Dispatches 6-digit SMS OTP via Aradhya DLT Gateway (Customers only)
- `POST /api/v1/auth/otp/verify` — Verifies OTP, creates/loads customer account, returns JWT
- `POST /api/v1/auth/login` — Password authentication for Vendors, DRs, and Admins

### Storefront & Checkout
- `GET /api/v1/regions` — District list with base delivery fees
- `GET /api/v1/master-products` — Canonical catalog
- `POST /api/v1/orders/checkout` — Multi-vendor atomic checkout, stock decrement, wallet deduction

### DR & Returns Desk
- `GET /api/v1/returns/search?q={query}` — Search delivered orders by ID or last 4 characters
- `POST /api/v1/returns` — Process return, restore vendor inventory, credit customer wallet, calculate net cash
- `GET /api/v1/returns` — List historical returns processed in district

### Wallet & Rewards
- `GET /api/v1/wallet` — Customer wallet balance, referral code, and 50 most recent passbook transactions
- `GET /api/v1/admin/wallet-settings` — Read active reward & cashback rules
- `PATCH /api/v1/admin/wallet-settings` — Update reward rates, cashback %, and minimum order thresholds
