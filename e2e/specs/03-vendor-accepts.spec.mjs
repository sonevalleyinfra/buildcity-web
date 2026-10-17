import { test, expect, autoPickRegion } from "../fixtures.mjs";
import { ADMIN, REGION_NAME, VENDOR, apiFetch, customerToken, partnerToken, passwordFor } from "../api.mjs";
import { readState, runId } from "../state.mjs";

// The partner app is the same web build; this user agent marker switches it into vendor mode.
test.use({ userAgent: "Mozilla/5.0 (Linux; Android 14; E2E) AppleWebKit/537.36 Chrome/124.0 Mobile Safari/537.36 BuildCityPartner/1.0" });

test("vendor accepts the customer order and the customer push lands in the outbox", async ({ page }) => {
  await autoPickRegion(page, REGION_NAME);
  const { orderId } = readState();
  expect(orderId, "spec 2 must have placed an order").toBeTruthy();

  // The sandbox only records a customer push when the customer has a device token. Register a fake one
  // (never sent anywhere: off production the push goes to the outbox).
  const registered = await apiFetch("/api/v1/notifications/device-token", {
    method: "POST",
    token: customerToken(),
    body: { token: `e2e-device-${runId()}` },
  });
  expect(registered.ok).toBeTruthy();

  await page.goto("/vendor/login");
  await page.getByPlaceholder("10-digit number").fill(VENDOR.phone);
  await page.getByPlaceholder("Enter password").fill(passwordFor(VENDOR));
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/vendor\/dashboard/);

    // The order from spec 2 is on the vendor's board, still pending.
  const card = page.locator(`#vendor-order-${orderId}`);
  await expect(card).toBeVisible();
  await expect(card).toContainText("E2E Test Cement 50kg");
  const status = card.getByLabel("Order status");
  await expect(status).toHaveValue("PENDING");

  // Accept = move it to Processing.
  await status.selectOption("PROCESSING");
  await expect(status).toHaveValue("PROCESSING");

  // The accept is saved server-side, not just in the UI, and the customer push is in the outbox.
  const admin = await partnerToken(ADMIN);
  await expect
    .poll(
      async () => {
        const res = await apiFetch("/api/v1/_staging/outbox", { token: admin });
        const entries = res.json?.entries || [];
        return entries.some(
          (e) =>
            e.kind === "push" &&
            e.payload?.message?.data?.orderId === orderId &&
            e.payload?.message?.data?.status === "PROCESSING"
        );
      },
      { timeout: 15_000, message: "push for the accepted order in the outbox" }
    )
    .toBe(true);
});
