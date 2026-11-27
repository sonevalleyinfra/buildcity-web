import { test } from "node:test";
import assert from "node:assert/strict";
import { countLabel, discountPercent, realMrp } from "./priceDisplay.js";

test("realMrp shows only a real MRP above the price", () => {
  assert.equal(realMrp(395, 430), 430);
  assert.equal(realMrp(61, 0), 0, "no MRP set: show none (never an invented one)");
  assert.equal(realMrp(500, 500), 0, "MRP equal to price is not a discount");
  assert.equal(realMrp(500, 450), 0, "MRP below price is ignored");
  assert.equal(realMrp("372", "410"), 410, "string inputs from the API");
  assert.equal(realMrp(undefined, null), 0);
});

test("discountPercent rounds to whole percent and is 0 without a real MRP", () => {
  assert.equal(discountPercent(395, 430), 8);
  assert.equal(discountPercent(372, 410), 9);
  assert.equal(discountPercent(9, 10), 10);
  assert.equal(discountPercent(61, 0), 0);
  assert.equal(discountPercent(700, 700), 0);
  assert.equal(discountPercent(0, 100), 100);
});

test("countLabel uses singular for exactly one", () => {
  assert.equal(countLabel(1, "product"), "1 product");
  assert.equal(countLabel(0, "product"), "0 products");
  assert.equal(countLabel(25, "product"), "25 products");
  assert.equal(countLabel(2, "item", "items"), "2 items");
  assert.equal(countLabel("3", "review"), "3 reviews");
  assert.equal(countLabel(undefined, "order"), "0 orders");
});
