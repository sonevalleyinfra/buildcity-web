import { test, expect, autoPickRegion } from "../fixtures.mjs";
import { ADMIN, DR, REGION_NAME, apiFetch, partnerToken, passwordFor } from "../api.mjs";
import { customerPhone, readState, writeState } from "../state.mjs";

test("DR sends the order out, marks it delivered and records a 1-item return", async ({ page }) => {
  await autoPickRegion(page, REGION_NAME);
  const { orderId } = readState();
  expect(orderId, "spec 2 must have placed an order").toBeTruthy();

  await page.goto("/vendor/login");
  await page.getByPlaceholder("10-digit number").fill(DR.phone);
  await page.getByPlaceholder("Enter password").fill(passwordFor(DR));
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dr\/dashboard/);

    // Orders tab: narrow to our order by id, then Processing -> Out for delivery.
  await expect(page.getByRole("heading", { name: /Customer Orders in/ })).toBeVisible();
  await page.getByPlaceholder("Search order ID, customer, phone...").fill(orderId);
  const select = page.getByLabel("Update Order Status");
  await expect(select).toHaveCount(1);
  await expect(select).toHaveValue("PROCESSING");
  await select.selectOption("OUT_FOR_DELIVERY");
  await expect(select).toHaveValue("OUT_FOR_DELIVERY");

  // Out for delivery -> Delivered. Delivered orders leave the active list, so check them under Delivered.
  await select.selectOption("DELIVERED");
  await expect(select).toHaveCount(0);
  await page.getByRole("button", { name: /^Delivered/ }).click();
  await expect(page.getByLabel("Update Order Status")).toHaveValue("DELIVERED");

  // Returns desk: find the delivered order by the customer's phone and return 1 unit.
  await page.getByRole("button", { name: /^Returns/ }).first().click();
  await page.getByPlaceholder(/Enter Customer Mobile No/).fill(customerPhone());
  await page.getByRole("button", { name: "Search Order" }).click();
  const selectOrder = page.getByRole("button", { name: /Select Order/ });
  if (await selectOrder.isVisible({ timeout: 5000 }).catch(() => false)) await selectOrder.click();
  await expect(page.getByText("Delivered: 1 Units")).toBeVisible();
  await page.getByRole("button", { name: "+", exact: true }).click();
  await page.getByRole("button", { name: /Confirm Return, Settle Wallet/ }).click();

  // The return is recorded server side against this order, for exactly 1 item.
  const admin = await partnerToken(ADMIN);
  await expect
    .poll(
      async () => {
        const res = await apiFetch("/api/v1/returns", { token: admin });
        const mine = (res.json || []).find((r) => r.orderId === orderId);
        if (!mine) return null;
        const units = (mine.returnItems || []).reduce((sum, it) => sum + Number(it.quantity || 0), 0);
        return { units, status: mine.status };
      },
      { timeout: 15_000, message: "return recorded for the order" }
    )
    .toEqual({ units: 1, status: "COMPLETED" });

  writeState({ returned: true });
});
