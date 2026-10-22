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

// The storefront-wide delivery-location picker opens at an unpredictable moment after load (once regions are
// fetched) and blocks every click until a region is chosen. Register a handler that picks the seeded region
// whenever it shows up, so no spec depends on its timing.
export async function autoPickRegion(page, regionName) {
  const heading = page.getByRole("heading", { name: "Choose Delivery Location" });
  await page.addLocatorHandler(heading, async () => {
    await page.getByRole("button", { name: regionName, exact: true }).click();
    await expect(heading).toBeHidden();
  });
}
