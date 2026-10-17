import path from "node:path";
import { test, expect } from "../fixtures.mjs";
import { OTP, REGION_NAME, STATE_DIR, customerPhone } from "../state.mjs";

// Letters and spaces only: the register form strips anything else.
const CUSTOMER_NAME = "Playwright Customer";

async function chooseRegion(page) {
  const modal = page.getByRole("heading", { name: "Choose Delivery Location" });
  await expect(modal).toBeVisible();
  const dialog = page.locator("div").filter({ has: modal }).filter({ hasText: "Confirm & Explore" }).last();
  await dialog.getByRole("button", { name: REGION_NAME, exact: true }).click();
  await expect(modal).toBeHidden();
}

test("customer registers, logs out and logs back in with OTP", async ({ page, context }) => {
  const phone = customerPhone();

  // First visit: the storefront asks for a delivery location before anything else.
  await page.goto("/register");
  await chooseRegion(page);

  await page.getByPlaceholder("e.g. Ramesh Kumar").fill(CUSTOMER_NAME);
  await page.getByPlaceholder("10-digit mobile number").fill(phone);
  await page.getByRole("button", { name: /Send Verification OTP/ }).click();

  await page.getByPlaceholder("Enter 6-digit SMS OTP").fill(OTP);
  await page.getByRole("button", { name: /Verify OTP & Create Account/ }).click();

  const logout = page.getByRole("button", { name: "Logout" });
  await expect(page).toHaveURL(/\/$/);
  await expect(logout).toBeVisible();

  await logout.click();
  await expect(page).toHaveURL(/\/login/);
  await expect(logout).toBeHidden();

  await page.getByPlaceholder("Enter 10-digit mobile number").fill(phone);
  await page.getByRole("button", { name: "Continue with OTP" }).click();
  await page.getByPlaceholder("Enter 6-digit OTP").fill(OTP);
  await page.getByRole("button", { name: "Verify & Login" }).click();

  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("banner").getByText(CUSTOMER_NAME)).toBeVisible();
  await expect(logout).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("buildcity_token"))).toBeTruthy();

  await context.storageState({ path: path.join(STATE_DIR, "customer.json") });
});
