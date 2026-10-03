import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  BRIDGE_ACTIONS_URL,
  BRIDGE_STATE_URL,
  liveCartNeedsWork,
  liveCartStatusText,
  normalizeLiveCart,
  planWalmartCartActions,
} from "./LiveCart.js";

const LOCAL_LIST = [
  { id: "whole-milk", walmartItemId: "10450114", name: "Whole Milk", quantity: 1 },
  { id: "loaf-of-bread", walmartItemId: "10315355", name: "Loaf of bread", quantity: 1 },
  { id: "hamburger-logs-2lbs", walmartItemId: "15136790", name: "Hamburger logs, 2 lbs", quantity: 2 },
];

test("bridge endpoints are same-origin paths", () => {
  assert.equal(BRIDGE_STATE_URL, "/api/walmart/state");
  assert.equal(BRIDGE_ACTIONS_URL, "/api/walmart/actions");
});

test("missing snapshot means disconnected with zeroed totals", () => {
  const cart = normalizeLiveCart(null);
  assert.equal(cart.connected, false);
  assert.deepEqual(cart.items, []);
  assert.deepEqual(cart.totals, { items: 0, units: 0, subtotal: 0 });
  assert.match(liveCartStatusText(cart, 0), /Not connected/);
});

test("snapshot normalizes items, quantities, and totals", () => {
  const cart = normalizeLiveCart({
    capturedAt: "2026-10-03T12:00:00.000Z",
    store: "Sacramento Gerber Rd Supercenter",
    items: [
      { id: "10450114", name: "Great Value Whole Vitamin D Milk", quantity: 2, price: 3.68 },
      { itemId: "10315355", name: "Great Value Bread", quantity: 1, price: 1.52, imageUrl: "", productUrl: null },
      { id: "99999999", name: "Mystery Item" },
    ],
  });
  assert.equal(cart.connected, true);
  assert.equal(cart.store, "Sacramento Gerber Rd Supercenter");
  assert.equal(cart.items.length, 3);
  assert.equal(cart.items[1].imageUrl, null);
  assert.equal(cart.items[1].productUrl, null);
  assert.equal(cart.items[2].price, null);
  assert.equal(cart.totals.items, 3);
  assert.equal(cart.totals.units, 4);
  assert.equal(cart.totals.subtotal, 8.88);
  assert.match(liveCartStatusText(cart, 2), /2 change\(s\) queued/);
});

test("invalid quantities fall back to one", () => {
  const cart = normalizeLiveCart({ items: [{ id: "a", name: "A", quantity: 0 }, { id: "b", name: "B" }] });
  assert.equal(cart.items[0].quantity, 1);
  assert.equal(cart.items[1].quantity, 1);
});

test("liveCartNeedsWork flags empty carts and unknown prices", () => {
  assert.equal(liveCartNeedsWork(normalizeLiveCart(null)), false);
  assert.equal(liveCartNeedsWork(normalizeLiveCart({ items: [] })), true);
  assert.equal(liveCartNeedsWork(normalizeLiveCart({ items: [{ id: "a", name: "A", price: 1 }] })), false);
  assert.equal(liveCartNeedsWork(normalizeLiveCart({ items: [{ id: "a", name: "A" }] })), true);
});

test("planner queues adds, quantity changes, and removals", () => {
  const cart = normalizeLiveCart({
    items: [
      { id: "10450114", name: "Milk", quantity: 4, price: 3.68 },
      { id: "10315355", name: "Bread", quantity: 1, price: 1.52 },
      { id: "77777777", name: "Cookies", quantity: 1, price: 4 },
    ],
  });
  const actions = planWalmartCartActions(LOCAL_LIST, cart);
  assert.deepEqual(actions, [
    { id: "set-quantity:10450114", type: "set-quantity", itemId: "10450114", quantity: 1, name: "Whole Milk" },
    { id: "add-product:15136790", type: "add-product", itemId: "15136790", quantity: 2, name: "Hamburger logs, 2 lbs" },
    { id: "remove-item:77777777", type: "remove-item", itemId: "77777777", name: "Cookies" },
  ]);
});

test("planner is a no-op when the cart already matches", () => {
  const cart = normalizeLiveCart({
    items: [
      { id: "10450114", name: "Milk", quantity: 1, price: 3.68 },
      { id: "10315355", name: "Bread", quantity: 1, price: 1.52 },
      { id: "15136790", name: "Beef", quantity: 2, price: 6.44 },
    ],
  });
  assert.deepEqual(planWalmartCartActions(LOCAL_LIST, cart), []);
});

test("planner can clear the cart first for a full replace", () => {
  const cart = normalizeLiveCart({ items: [{ id: "999", name: "Stale", quantity: 1, price: 1 }] });
  const actions = planWalmartCartActions(LOCAL_LIST, cart, { replaceCart: true });
  assert.equal(actions[0].id, "clear-cart");
  assert.equal(actions[0].type, "clear-cart");
  assert.equal(actions.filter((action) => action.type === "add-product").length, 3);
});

test("planner does not clear an already empty cart", () => {
  const cart = normalizeLiveCart({ items: [] });
  const actions = planWalmartCartActions(LOCAL_LIST, cart, { replaceCart: true });
  assert.equal(actions.some((action) => action.type === "clear-cart"), false);
});

test("live cart markup and css follow the project conventions", () => {
  const html = readFileSync(new URL("./LiveCart.html", import.meta.url), "utf8");
  assert.match(html, /data-live-cart-items/);
  assert.match(html, /data-live-cart-status/);
  assert.match(html, /data-live-cart-sync/);
  assert.match(html, /data-live-cart-checkout/);

  const css = readFileSync(new URL("./LiveCart.css", import.meta.url), "utf8");
  assert.match(css, /\.live-cart__/);
  assert.match(css, /var\(--color-/);
  assert.doesNotMatch(css, /!important/);
  assert.doesNotMatch(css, /#[0-9a-fA-F]{3,6}/);
});
