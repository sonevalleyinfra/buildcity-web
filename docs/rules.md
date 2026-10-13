# BuildCity — Business Rules & Calculation Specifications

> **Notice to Developers & AI Agents:** The rules defined in this document are **hard-locked business logic**. Do NOT modify or invert the formulas without explicit written confirmation from the product owner.

---

## 1. DR Return & Refund Desk Mathematical Formulation

When a delivered order undergoes a full or partial return at the DR Return Desk (`DrReturnsTab.jsx` / `POST /api/v1/returns`), the calculations follow a strict 3-step formula.

### Rule 1.1: Non-Refundable Delivery Charge
- **Delivery Charge (`order.deliveryFee`) is strictly NON-REFUNDABLE.**
- Reason: Transport and vehicle costs are incurred at site delivery and cannot be recovered from the logistics partner or driver.

### Rule 1.2: Whole Rupee (Bina Paisa) Rounding Standard
- All amounts on site and in returns must use **whole rupees (`Math.round`)**.
- No decimal paise (`.4`, `.18`, `.22`, `.6`) are ever presented to customers or logged in settlement records.

### Rule 1.3: Complete Return Math Breakdown (3-Box System)

Given:
- **$M$**: Returned Material Value (e.g., ₹488)
- **$D$**: Delivery Charge (e.g., ₹56)
- **$W_{used}$**: Wallet Balance Used by Customer at Checkout (e.g., ₹24)
- **$C_{earned}$**: Cashback Earned on Order sitting in Customer's Wallet (e.g., ₹23)
- **$T_{bill}$**: Total Bill ($M + D = ₹544$)
- **$P_{cash}$**: Total Cash Paid by Customer on Delivery ($T_{bill} - W_{used} = ₹520$)

#### 3-Box Return Settlement Flow

```
Total Order Bill (₹544) ──▶ [- ₹56 Delivery Fee (Non-Refundable)] ──▶ Returned Material Value (₹488)
                                                                                  │
                ┌─────────────────────────────────────────────────────────────────┴──────────────────────────────┐
                ▼                                                                                                ▼
      [ Cash Refund Calculation ]                                                                   [ Wallet Settlement ]
  Returned Materials:           ₹488                                                       Cashback Already in Wallet:    ₹23
  (-) Wallet Used at Checkout: -₹24 ──(Added back to Wallet)─────────────────────────────▶ (+) Wallet Used Added Back:   +₹24
  (-) Cashback in Wallet:      -₹23                                                        ──────────────────────────────────
  ──────────────────────────────────                                                       (=) Total in Customer Wallet:  ₹47
  (=) Net Cash to Give Customer:₹441
                │                                                                                                │
                └─────────────────────────────────────┬──────────────────────────────────────────────────────────┘
                                                      ▼
                               [ Total Order Product Value Settled ]
                                 ₹441 Cash + ₹47 Wallet = ₹488 (100% Settled!)
```

#### Box 1: Cash Refund Calculation
$$\text{Net Cash to Give Customer} = M - W_{used} - C_{earned}$$
$$\text{Example: } ₹488 - ₹24 - ₹23 = \mathbf{₹441\text{ Cash}}$$

*Detailed Line-by-Line Breakdown on Screen:*
1. Total Order Value (with Delivery): $M + D$ ($₹544$)
2. (-) Delivery Charge Deducted: $- D$ ($- ₹56$)
3. Returned Product Value (Materials): $M$ ($₹488$)
4. (-) Wallet Used (Added Back to Wallet): $- W_{used}$ ($- ₹24$)
5. (-) Cashback (Already in Customer Wallet): $- C_{earned}$ ($- ₹23$)
6. **(=) Net Cash to Give Customer:** **₹441**

#### Box 2: Wallet Settlement Calculation
1. Cashback Already in Customer Wallet: $C_{earned}$ ($₹23$)
2. (+) Wallet Used at Order (We Add Now): $+ W_{used}$ ($+ ₹24$)
3. **(=) Total Amount in Customer Wallet:** **$C_{earned} + W_{used} = \mathbf{₹47}$**

#### Box 3: Total Value Settled Proof
$$\text{Net Cash Refund } (₹441) + \text{Total Wallet } (₹47) = \mathbf{₹488\text{ (Exact Material Value)}}$$

---

### Order Lifecycle Status State Machine

| Status | Trigger Event | Stock Action | Can Status Change? |
| :--- | :--- | :--- | :--- |
| **`PENDING`** | Customer places COD order | Stock decremented from vendor | Yes (Vendor accepts or cancels) |
| **`CONFIRMED`** | Vendor confirms acceptance | Reserved | Yes (Moves to processing) |
| **`PROCESSING`** | Vendor packages material | In packing | Yes (Moves to shipped) |
| **`SHIPPED`** | Driver dispatched to site | In transit | Yes (Moves to out for delivery) |
| **`OUT_FOR_DELIVERY`**| Driver reaches site | Arriving | Yes (Unloading) |
| **`DELIVERED`** | Customer inspects & pays | Finalized (Cashback credited) | Yes (DR can complete or file return)|
| **`COMPLETED`** | DR / Admin locks delivery | Completed | **LOCKED (Permanent - Cannot Revert)**|
| **`CANCELLED`** | Vendor / DR cancels order | **Stock restored to vendor** | Terminated |
| **`RETURNED`** | DR files return at desk | **Stock restored to vendor** | Closed (Wallet & Cash settled) |

---

## 2. Wallet & Cashback Policy Rules

### Rule 2.1: Order Delivery Cashback Trigger
- Cashback is granted **only** when an order transitions to `DELIVERED` or `COMPLETED`.
- Cashback is calculated **strictly on net materials value** ($M = \text{Total Amount} - \text{Delivery Fee}$). Delivery charge never earns cashback.
- Minimum qualifying threshold (`minOrderForCashback`) is checked against material subtotal.

### Rule 2.2: Wallet Redemption at Checkout
- Customers may redeem wallet balance up to:
  $$\min\left(\text{walletBalance}, \left\lfloor\frac{\text{CartSubtotal} \times \text{MaxWalletPercent}}{100}\right\rfloor, \text{MaxWalletFlat}\right)$$
- Example: On ₹488 cart with 5% limit: $\lfloor 488 \times 0.05 \rfloor = \lfloor 24.4 \rfloor = \mathbf{₹24}$.

### Rule 2.3: Anti-Double-Dipping on Returns
- Since cashback is already credited upon delivery, a return must **not** allow the customer to keep the cashback as free cash. It is deducted from the physical cash refund so that:
  $$\text{Cash Received} + \text{Wallet Balance Retained} = \text{Original Value}$$

---

## 3. Inventory & Stock Restoration Rules

### Rule 3.1: Checkout Stock Decrement
- Stock is decremented on the concrete `vendorProduct.stockQty` at order checkout.
- If `stockQty < requestedQty`, order placement is rejected atomically.

### Rule 3.2: Order Cancellation Stock Restoration
- If an order is marked `CANCELLED` by Vendor, DR, or Admin, all items in `order.items` have their quantities incremented back to their respective `vendorProduct.stockQty` atomically.

### Rule 3.3: Return Stock Restoration
- When a DR processes a return, the accepted items and quantities are incremented back into the vendor's stock via Prisma transaction ops.

---

## 4. Role & Access Control Matrix

| Feature / Action | Customer | Vendor | District Rep (DR) | Super Admin |
| :--- | :---: | :---: | :---: | :---: |
| **Login Method** | Mobile OTP | Password | Password | Password |
| **Browse Products & Cart** | Yes | Yes (Preview) | Yes | Yes |
| **Place Orders** | Yes | No | No | No |
| **Accept & Dispatch Orders** | No | Own Shop Only | District Scope | All Districts |
| **Mark Order COMPLETED** | No | **Blocked** | District Scope | All Districts |
| **Add / Edit Master Products** | No | No | District Scope | Global |
| **Add / Edit Vendor Profile** | No | Self Profile | District Scope | Global |
| **File Returns & Refund Cash**| No | No | District Scope | Global |
| **Adjust Wallet Settings** | No | No | No | Global |

---

## 5. Regional Isolation Safeguards

1. **Strict District Scoping:** A customer viewing `Mirzapur` can only order products from vendors registered in `Mirzapur`.
2. **Region Switching Event:** If a customer switches districts while holding items in their cart:
   - Items unavailable in the new district are automatically purged from the cart with a notification.
   - Items available from new district suppliers have their prices recalculated to match the new district rates.
3. **Delivery Charges:** Delivery fees are dynamically pulled from the active district's `baseDeliveryCharge` setting.
