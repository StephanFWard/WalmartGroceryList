import test from "node:test";
import assert from "node:assert/strict";
import {
  GROCERY_STORAGE_KEY,
  SYNC_QUEUE_STORAGE_KEY,
  applyGroceryChange,
  applyWalmartMirrorToList,
  clearSyncQueue,
  enrichListItem,
  loadGroceryList,
  readSyncQueue,
  saveGroceryList,
} from "./GroceryStore.js";
import {
  countGroceryItems,
  createGroceryList,
  findGroceryItem,
} from "../GroceryList/GroceryList.js";
import { localListSyncReport } from "../WalmartList/WalmartList.js";
import { WALMART_LIST_URL } from "../WalmartSync/WalmartSync.js";

function createFakeStorage() {
  const data = new Map();
  return {
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => {
      data.set(key, String(value));
    },
  };
}

test("first load seeds the grocery list from the Walmart mirror", () => {
  const storage = createFakeStorage();
  const { list, seeded } = loadGroceryList(storage);
  assert.equal(seeded, true);
  assert.equal(countGroceryItems(list), 3);
  assert.equal(findGroceryItem(list, "hamburger-logs-2lbs").quantity, 2);
  assert.equal(localListSyncReport(list).inSync, 3);
  assert.match(storage.getItem(GROCERY_STORAGE_KEY), /whole-milk/);
});

test("stored quantities win and images stay in sync with Walmart", () => {
  const storage = createFakeStorage();
  storage.setItem(
    GROCERY_STORAGE_KEY,
    JSON.stringify([
      { id: "whole-milk", name: "Whole Milk", quantity: 3, imageUrl: null, productUrl: null },
    ]),
  );
  const { list, seeded } = loadGroceryList(storage);
  assert.equal(seeded, false);
  assert.equal(list[0].quantity, 3);
  assert.match(list[0].imageUrl, /^https:\/\/i5\.walmartimages\.com\//);
  assert.match(list[0].productUrl, /^https:\/\/www\.walmart\.com\/ip\//);
  assert.equal(list[0].size, "1 gal · 128 fl oz");
});

test("enrichListItem leaves unknown items untouched", () => {
  const item = { id: "eggs-12ct", name: "Eggs", quantity: 1 };
  assert.equal(enrichListItem(item), item);
});

test("changes are persisted and queued for Walmart sync", () => {
  const storage = createFakeStorage();
  const list = createGroceryList();

  const added = applyGroceryChange(
    list,
    { action: "add", item: { id: "whole-milk", name: "Whole Milk" } },
    storage,
  );
  assert.equal(added.changed, true);
  assert.equal(added.pendingSync, 1);

  const queued = readSyncQueue(storage);
  assert.equal(queued.length, 1);
  assert.equal(queued[0].action, "add");
  assert.equal(queued[0].listUrl, WALMART_LIST_URL);
  assert.equal(JSON.parse(storage.getItem(GROCERY_STORAGE_KEY)).length, 1);

  const duplicate = applyGroceryChange(
    list,
    { action: "add", item: { id: "whole-milk", name: "Whole Milk" } },
    storage,
  );
  assert.equal(duplicate.changed, false);
  assert.equal(duplicate.reason, "duplicate");
  assert.equal(readSyncQueue(storage).length, 1);

  const unknown = applyGroceryChange(list, { action: "teleport" }, storage);
  assert.equal(unknown.changed, false);
  assert.equal(unknown.reason, "unknown-action");
  assert.equal(readSyncQueue(storage).length, 1);

  const quantity = applyGroceryChange(list, { action: "update-quantity", id: "whole-milk", quantity: 4 }, storage);
  assert.equal(quantity.changed, true);
  assert.equal(findGroceryItem(list, "whole-milk").quantity, 4);
  assert.equal(readSyncQueue(storage).length, 2);

  const removed = applyGroceryChange(list, { action: "remove", id: "whole-milk" }, storage);
  assert.equal(removed.changed, true);
  assert.equal(countGroceryItems(list), 0);
});

test("mirror apply adds missing items, matches quantities, and queues one sync", () => {
  const storage = createFakeStorage();
  const list = createGroceryList();
  const applied = applyWalmartMirrorToList(list, storage);
  assert.equal(applied.added, 3);
  assert.equal(applied.updated, 1);
  assert.equal(applied.pendingSync, 1);
  assert.equal(findGroceryItem(list, "hamburger-logs-2lbs").quantity, 2);
  assert.equal(saveGroceryList(list, storage), true);
  assert.equal(readSyncQueue(storage).length, 1);
  assert.equal(clearSyncQueue(storage), 0);
  assert.equal(readSyncQueue(storage).length, 0);

  const repeat = applyWalmartMirrorToList(list, storage);
  assert.equal(repeat.added, 0);
  assert.equal(repeat.updated, 0);
  assert.equal(readSyncQueue(storage).length, 0);
  assert.match(storage.getItem(SYNC_QUEUE_STORAGE_KEY), /^\[\]$/);
});

test("storage failures do not break the change pipeline", () => {
  const hostileStorage = {
    getItem() {
      throw new Error("storage denied");
    },
    setItem() {
      throw new Error("storage denied");
    },
  };
  const list = createGroceryList();
  const result = applyGroceryChange(
    list,
    { action: "add", item: { id: "eggs-12ct", name: "Eggs" } },
    hostileStorage,
  );
  assert.equal(result.changed, true);
  assert.equal(result.pendingSync, 0);
  assert.equal(countGroceryItems(list), 1);

  const loaded = loadGroceryList(hostileStorage);
  assert.equal(loaded.seeded, true);
  assert.equal(countGroceryItems(loaded.list), 3);
});
