import { test as base, expect } from "@playwright/test";
import { PROD_HOSTS } from "./guard.mjs";

// Defence in depth: whatever the app tries, the browser never reaches a production host.
export const test = base.extend({
  context: async ({ context }, provide) => {
    await context.route(
      (url) => PROD_HOSTS.includes(url.hostname.toLowerCase()),
      (route) => route.abort("blockedbyclient")
    );
    await provide(context);
  },
});
export { expect };

// The storefront-wide delivery-location picker opens a moment after the first page load (once regions are
// fetched) and blocks every click until a region is chosen. Pick the seeded one if it shows up.
export async function pickRegionIfAsked(page, regionName, timeout = 8000) {
  const heading = page.getByRole("heading", { name: "Choose Delivery Location" });
  if (await heading.isVisible({ timeout }).catch(() => false)) {
    await page.getByRole("button", { name: regionName, exact: true }).click();
    await expect(heading).toBeHidden();
  }
}
