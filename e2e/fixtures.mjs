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
