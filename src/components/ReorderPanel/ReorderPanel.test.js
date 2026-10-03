import test from "node:test";
import assert from "node:assert/strict";
import {
  addFromHistory,
  DEFAULT_HISTORY,
  searchHistory,
  seedGroceryList,
  toReadyToPurchase,
} from "./ReorderPanel.js";
import { createGroceryList, countGroceryItems } from "../GroceryList/GroceryList.js";

test("default history contains whole milk, bread, and hamburger logs", () => {
  const names = DEFAULT_HISTORY.map((item) => item.name);
  assert.deepEqual(names, ["Whole Milk", "Loaf of bread", "Hamburger logs, 2 lbs"]);
});

test("seeding creates exactly three quantity-one items with no duplicates", () => {
  const list = seedGroceryList(createGroceryList(), DEFAULT_HISTORY);
  seedGroceryList(list, DEFAULT_HISTORY);
  assert.equal(countGroceryItems(list), 3);
  for (const item of list) {
    assert.equal(item.quantity, 1);
  }
});

test("history converts to ready-to-purchase quantity-one items", () => {
  const ready = toReadyToPurchase(DEFAULT_HISTORY);
  assert.equal(ready.length, DEFAULT_HISTORY.length);
  for (const item of ready) {
    assert.equal(item.quantity, 1);
    assert.equal(item.source, "history");
  }
});

test("adding from history prevents duplicates", () => {
  const list = createGroceryList();
  assert.equal(addFromHistory(list, DEFAULT_HISTORY, "whole-milk").added, true);
  assert.equal(addFromHistory(list, DEFAULT_HISTORY, "WHOLE-MILK").added, false);
  assert.equal(countGroceryItems(list), 1);
});

test("unknown history id reports not-found", () => {
  const list = createGroceryList();
  const result = addFromHistory(list, DEFAULT_HISTORY, "missing-item");
  assert.equal(result.added, false);
  assert.equal(result.reason, "not-found");
});

test("history search is case-insensitive and returns images", () => {
  assert.equal(searchHistory(DEFAULT_HISTORY, "MILK")[0].id, "whole-milk");
  assert.equal(searchHistory(DEFAULT_HISTORY, "beef")[0].id, "hamburger-logs-2lbs");
  assert.equal(searchHistory(DEFAULT_HISTORY, "").length, 3);
  for (const item of DEFAULT_HISTORY) {
    assert.match(item.imageUrl, /^https:\/\/i5\.walmartimages\.com\//);
    assert.match(item.productUrl, /^https:\/\/www\.walmart\.com\/search\?q=/);
  }
});
test("ready-to-purchase items stay searchable by keyword", () => {
  const ready = toReadyToPurchase(DEFAULT_HISTORY);
  assert.equal(searchHistory(ready, "beef")[0].id, "hamburger-logs-2lbs");
  assert.equal(searchHistory(ready, "MILK")[0].id, "whole-milk");
  assert.equal(searchHistory(ready, "dairy").length, 1);
});

