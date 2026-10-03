import test from "node:test";
import assert from "node:assert/strict";
import {
  APP_SHELL_LINKS,
  appShellStats,
} from "./AppShell.js";
import {
  WALMART_CART_URL,
  WALMART_LIST_URL,
  WALMART_REORDER_URL,
} from "../WalmartSync/WalmartSync.js";

test("shell links point at the Walmart shortcuts", () => {
  assert.deepEqual(
    APP_SHELL_LINKS.map((link) => link.href),
    [WALMART_REORDER_URL, WALMART_LIST_URL, WALMART_CART_URL],
  );
  for (const link of APP_SHELL_LINKS) {
    assert.equal(link.href.startsWith("https://www.walmart.com/"), true);
    assert.equal(link.label.length > 0, true);
  }
});

test("shell stats summarize the local list and mirror", () => {
  const stats = appShellStats(
    [
      { id: "whole-milk", quantity: 2, price: 3.68 },
      { id: "loaf-of-bread", quantity: 1, price: 1.52 },
    ],
    { inSync: 2, total: 3 },
  );
  assert.deepEqual(stats, [
    { label: "Items", value: "2" },
    { label: "Units", value: "3" },
    { label: "In sync", value: "2/3" },
    { label: "Estimated", value: "$8.88" },
  ]);
});

test("shell stats work without a sync report", () => {
  const stats = appShellStats([{ id: "whole-milk", quantity: 1 }], null);
  assert.deepEqual(stats.map((stat) => stat.label), ["Items", "Units", "Estimated"]);
});
