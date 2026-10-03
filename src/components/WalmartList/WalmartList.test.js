import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  WALMART_LIST_ITEMS,
  WALMART_LIST_MIRROR,
  applyWalmartList,
  findListItem,
  localListSyncReport,
  syncStatusText,
  walmartListImageUrls,
  walmartListTotals,
} from "./WalmartList.js";
import { WALMART_LIST_ID } from "../WalmartSync/WalmartSync.js";
import {
  countGroceryItems,
  createGroceryList,
  findGroceryItem,
} from "../GroceryList/GroceryList.js";

test("mirror targets the requested Walmart list", () => {
  assert.equal(WALMART_LIST_MIRROR.id, WALMART_LIST_ID);
  assert.equal(WALMART_LIST_MIRROR.url, `https://www.walmart.com/lists/WL/${WALMART_LIST_ID}`);
});

test("mirror holds the three grocery items with official Walmart product data", () => {
  assert.deepEqual(
    WALMART_LIST_ITEMS.map((item) => item.id),
    ["whole-milk", "loaf-of-bread", "hamburger-logs-2lbs"],
  );
  assert.deepEqual(
    WALMART_LIST_ITEMS.map((item) => item.label),
    ["Whole Milk", "Loaf of bread", "Hamburger logs, 2 lbs"],
  );
  assert.deepEqual(
    WALMART_LIST_ITEMS.map((item) => item.itemId),
    ["10450114", "10315355", "15136790"],
  );
  for (const item of WALMART_LIST_ITEMS) {
    assert.match(item.imageUrl, /^https:\/\/i5\.walmartimages\.com\/seo\//);
    assert.match(item.itemUrl, /^https:\/\/www\.walmart\.com\/ip\//);
    assert.match(item.itemUrl, new RegExp(`/${item.itemId}$`));
    assert.equal(typeof item.price, "number");
    assert.equal(item.price > 0, true);
    assert.equal(item.listQuantity >= 1, true);
    assert.equal(typeof item.size, "string");
  }
});

test("mirror exposes one unique Walmart image per product", () => {
  const urls = walmartListImageUrls();
  assert.equal(urls.length, WALMART_LIST_ITEMS.length);
  assert.equal(new Set(urls).size, WALMART_LIST_ITEMS.length);
});

test("mirror totals match the Walmart list quantities", () => {
  assert.deepEqual(walmartListTotals(), { items: 3, units: 4, estimate: 18.08 });
});

test("sync report flags missing items, quantity drift, and local extras", () => {
  const empty = localListSyncReport(createGroceryList());
  assert.equal(empty.missing, 3);
  assert.equal(empty.inSync, 0);

  const syncedList = createGroceryList();
  applyWalmartList(syncedList);
  const synced = localListSyncReport(syncedList);
  assert.equal(synced.inSync, 3);
  assert.equal(synced.missing, 0);
  assert.equal(synced.differs, 0);
  assert.deepEqual(synced.extras, []);
  assert.match(syncStatusText(synced), /3 of 3 Walmart list items in sync/);

  const driftedList = createGroceryList();
  applyWalmartList(driftedList);
  driftedList[0].quantity = 5;
  driftedList.push({ id: "eggs-12ct", name: "Eggs", quantity: 1 });
  const drifted = localListSyncReport(driftedList);
  assert.equal(drifted.differs, 1);
  assert.equal(drifted.inSync, 2);
  assert.equal(drifted.extras.length, 1);
  assert.match(syncStatusText(drifted), /different quantity/);
});

test("applyWalmartList adds missing items and matches list quantities", () => {
  const list = createGroceryList();
  const applied = applyWalmartList(list);
  assert.equal(applied.added, 3);
  assert.equal(countGroceryItems(list), 3);

  const beef = findGroceryItem(list, "hamburger-logs-2lbs");
  assert.equal(beef.quantity, 2);
  assert.match(beef.imageUrl, /^https:\/\/i5\.walmartimages\.com\//);
  assert.match(beef.productUrl, /^https:\/\/www\.walmart\.com\/ip\//);
  assert.equal(beef.price, 6.44);
  assert.equal(beef.size, "2 × 1 lb roll (2 lbs)");

  const second = applyWalmartList(list);
  assert.equal(second.added, 0);
  assert.equal(second.updated, 0);
  assert.equal(countGroceryItems(list), 3);
});

test("findListItem matches ids case-insensitively", () => {
  assert.equal(findListItem(WALMART_LIST_ITEMS, " WHOLE-MILK ").label, "Whole Milk");
  assert.equal(findListItem(WALMART_LIST_ITEMS, "eggs"), undefined);
});

test("walmart list markup and css follow the project conventions", () => {
  const html = readFileSync(new URL("./WalmartList.html", import.meta.url), "utf8");
  assert.match(html, /data-walmart-list-items/);
  assert.match(html, /data-walmart-list-status/);
  assert.match(html, /data-walmart-list-apply/);

  const css = readFileSync(new URL("./WalmartList.css", import.meta.url), "utf8");
  assert.match(css, /\.walmart-list__/);
  assert.match(css, /var\(--color-/);
  assert.doesNotMatch(css, /!important/);
  assert.doesNotMatch(css, /#[0-9a-fA-F]{3,6}/);
});
