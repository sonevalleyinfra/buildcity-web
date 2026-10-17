import path from "node:path";
import { test, expect, autoPickRegion } from "../fixtures.mjs";
import { ADMIN, apiFetch, customerToken, partnerToken } from "../api.mjs";
import { REGION_NAME, STATE_DIR, readState } from "../state.mjs";

test.use({ storageState: path.join(STATE_DIR, "customer.json") });

const inr = (n) => `₹${Number(n).toLocaleString("en-IN")}`;

test("wallet balance matches the ledger, cashback is credited and the order shows delivered with its return", async ({ page }) => {
  await autoPickRegion(page, REGION_NAME);
  const { orderId, returned } = readState();
  expect(orderId, "spec 2 must have placed an order").toBeTruthy();
  expect(returned, "spec 4 must have recorded the return").toBe(true);

  const token = customerToken();
  const wallet = await apiFetch("/api/v1/wallet", { token });
  expect(wallet.ok).toBeTruthy();
  const ledger = wallet.json.transactions || [];
  const ledgerSum = ledger.reduce((sum, t) => sum + Number(t.amount), 0);
  expect(Number(wallet.json.balance)).toBeCloseTo(ledgerSum, 2);

  // The customer's own order list carries the delivered status.
  const mine = await apiFetch("/api/v1/orders/me", { token });
  expect(mine.ok).toBeTruthy();
  const orders = Array.isArray(mine.json) ? mine.json : mine.json?.orders || [];
  const order = orders.find((o) => o.id === orderId);
  expect(order, "the order is in the customer's list").toBeTruthy();
  expect(["DELIVERED", "COMPLETED"]).toContain(order.status);
  // Customers have no returns endpoint; the desk's record of the return is read as admin.
  const returns = await apiFetch("/api/v1/returns", { token: await partnerToken(ADMIN) });
  const mineReturn = (returns.json || []).find((r) => r.orderId === orderId);
  expect(mineReturn, "the return is recorded against the order").toBeTruthy();
  const returnedUnits = (mineReturn.returnItems || []).reduce((s, it) => s + Number(it.quantity || 0), 0);
  expect(returnedUnits).toBe(1);

  // Cashback is expected when the wallet settings say the order qualifies.
  const settings = (await apiFetch("/api/v1/settings/wallet")).json;
  const materials = (order.items || []).reduce((s, it) => s + Number(it.totalPrice ?? Number(it.quantity) * Number(it.priceAtPurchase)), 0);
  const expectCashback = settings.cashbackEnabled && materials >= Number(settings.minOrderForCashback || 0);
  const cashback = ledger.filter((t) => t.type === "ORDER_CASHBACK" && t.orderId === orderId);
  if (expectCashback) {
    expect(cashback.length, "cashback entry for the delivered order").toBe(1);
    expect(Number(cashback[0].amount)).toBeGreaterThan(0);
  } else {
    expect(cashback).toHaveLength(0);
  }

  // Profile: the wallet card shows the API balance and the passbook lists the same entries.
  await page.goto("/profile");
    const card = page.getByRole("button", { name: /Wallet/ }).filter({ hasText: "Passbook" });
  await expect(card).toContainText(inr(wallet.json.balance));
  await card.click();
  const passbook = page.locator("div.fixed").filter({ has: page.getByRole("heading", { name: "Wallet Passbook" }) });
  await expect(passbook).toContainText(inr(wallet.json.balance));
  if (expectCashback) await expect(passbook).toContainText("ORDER_CASHBACK");
  await page.getByTitle("Close").click();

  // Order page: delivered.
  await page.goto(`/orders/${encodeURIComponent(orderId)}`);
  await expect(page.getByText("Delivered").first()).toBeVisible();
});
