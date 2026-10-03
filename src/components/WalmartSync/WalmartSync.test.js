import test from "node:test";
import assert from "node:assert/strict";
import {
  WALMART_CHECKOUT_URL,
  WALMART_LIST_ID,
  WALMART_LIST_URL,
  toWalmartSyncPayload,
  walmartCheckoutUrl,
  walmartSearchUrl,
} from "./WalmartSync.js";

test("walmart list constants target the requested list", () => {
  assert.equal(WALMART_LIST_ID, "73215e44-ec62-42ab-ae9e-3a997e756090");
  assert.equal(WALMART_LIST_URL, "https://www.walmart.com/lists/WL/73215e44-ec62-42ab-ae9e-3a997e756090");
});

test("walmart search url encodes queries", () => {
  assert.equal(walmartSearchUrl("whole milk"), "https://www.walmart.com/search?q=whole%20milk");
});

test("sync payload forces quantity one and includes images", () => {
  const payload = toWalmartSyncPayload([
    {
      id: "whole-milk",
      name: "Whole Milk",
      quantity: 3,
      imageUrl: "https://example.test/milk.jpg",
      productUrl: "https://example.test/milk",
    },
  ]);
  assert.equal(payload.items.length, 1);
  assert.equal(payload.items[0].quantity, 3);
  assert.equal(payload.items[0].imageUrl, "https://example.test/milk.jpg");
  assert.equal(payload.items[0].productUrl, "https://example.test/milk");
  assert.match(payload.checkoutUrl, /^https:\/\/www\.walmart\.com\/checkout/);
});

test("checkout url carries updated quantities", () => {
  const url = walmartCheckoutUrl([
    { id: "whole-milk", name: "Whole Milk", quantity: 2 },
    { id: "loaf-of-bread", name: "Loaf of bread", quantity: 3 },
  ]);
  assert.equal(url.startsWith(WALMART_CHECKOUT_URL), true);
  assert.match(url, /Whole%20Milk/);
  assert.match(url, /x2/);
  assert.match(url, /x3/);
});
