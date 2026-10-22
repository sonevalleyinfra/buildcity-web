import path from "node:path";
import { test, expect } from "../fixtures.mjs";
import { PRODUCT_NAME, REGION_NAME, STATE_DIR, customerPhone, runId, writeState } from "../state.mjs";

test.use({ storageState: path.join(STATE_DIR, "customer.json") });

test("customer browses, adds to cart and places a COD order", async ({ page }) => {
  await page.goto("/");
  const header = page.getByRole("banner");
  await expect(header.getByRole("button", { name: "Logout" })).toBeVisible();

  // Pick the delivery location from the navbar, as a returning customer would.
  // The navbar location chip is the header's first button (it shows the current region name).
  await header.getByRole("button").first().click();
  const modal = page.getByRole("heading", { name: "Choose Delivery Location" });
  await expect(modal).toBeVisible();
  const dialog = page.locator("div").filter({ has: modal }).filter({ hasText: "Confirm & Explore" }).last();
  await dialog.getByRole("button", { name: REGION_NAME, exact: true }).click();
  await expect(modal).toBeHidden();
  await expect(header.getByText(REGION_NAME)).toBeVisible();

  // Home -> category -> product
  const categories = page.locator("section").filter({ has: page.getByRole("heading", { name: "Shop by Category" }) });
  await categories.getByRole("link", { name: /Cement/ }).first().click();
  await expect(page).toHaveURL(/\/categories\?cat=Cement/);

  await page.getByRole("link").filter({ hasText: PRODUCT_NAME }).first().click();
  await expect(page).toHaveURL(/\/product\//);
  await expect(page.getByRole("heading", { name: PRODUCT_NAME })).toBeVisible();

  await page.getByRole("button", { name: "Add to Cart", exact: true }).click();
  await expect(page.getByRole("button", { name: /Added to Cart/ })).toBeVisible();

  // Cart -> checkout
  await header.locator('a[href="/cart"]').click();
  await expect(page).toHaveURL(/\/cart$/);
  await expect(page.getByText(PRODUCT_NAME).first()).toBeVisible();
  await page.getByRole("button", { name: /Proceed to Checkout/ }).click();
  await expect(page).toHaveURL(/\/checkout$/);

  // New delivery address in the selected region (city is locked to it).
  await page.getByPlaceholder("e.g. Ramesh Kumar").fill("Playwright Customer");
  await page.getByPlaceholder("10-digit mobile number").fill(customerPhone());
  await page.getByPlaceholder(/Plot No\. 45/).fill(`Plot ${runId()}, E2E Site Road`);
  await expect(page.locator('input[type="text"][readonly]')).toHaveValue(REGION_NAME);
  await page.getByRole("button", { name: /Save & Select Delivery Address/ }).click();
  await expect(page.getByText(`Plot ${runId()}, E2E Site Road`).first()).toBeVisible();
  await expect(page.getByText("✓ Deliverable").first()).toBeVisible();
  await expect(page.locator('input[name="address"]:checked')).toHaveCount(1);

  // Pay with COD (the only method) and place the order.
  await expect(page.getByRole("radio", { name: /Cash on Delivery/ })).toBeChecked();
  const orderResponse = page.waitForResponse(
    (r) => r.request().method() === "POST" && new URL(r.url()).pathname === "/api/v1/orders/checkout"
  );
  await page.getByRole("button", { name: "Place Order (Cash on Delivery)" }).click();
  const res = await orderResponse;
  expect(res.ok()).toBeTruthy();
  const created = await res.json();
  expect(created.success).toBe(true);

  await expect(page.getByText("Order Confirmed & Placed")).toBeVisible();
  await page.getByRole("button", { name: /Track Live Order Status/ }).click();
  await expect(page).toHaveURL(/\/orders\/[^/]+$/);
  const orderId = decodeURIComponent(new URL(page.url()).pathname.split("/").pop());
  expect(orderId).toBe(created.order.id);

  writeState({ orderId });
});
