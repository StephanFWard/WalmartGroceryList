import {
  addGroceryItem,
  createGroceryList,
  removeGroceryItem,
  updateGroceryQuantity,
} from "../GroceryList/GroceryList.js";
import { WALMART_LIST_URL } from "../WalmartSync/WalmartSync.js";
import {
  WALMART_LIST_ITEMS,
  applyWalmartList,
  findListItem,
} from "../WalmartList/WalmartList.js";

export const GROCERY_STORAGE_KEY = "walmart-grocery-list-v1";
export const SYNC_QUEUE_STORAGE_KEY = "walmart-sync-queue-v1";

export function resolveStorage(storage) {
  if (storage) {
    return storage;
  }
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

function readJson(storage, key, fallback) {
  if (!storage) {
    return fallback;
  }
  try {
    const parsed = JSON.parse(storage.getItem(key) ?? "null");
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function writeJson(storage, key, value) {
  if (!storage) {
    return false;
  }
  try {
    storage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function enrichListItem(item) {
  const mirror = findListItem(WALMART_LIST_ITEMS, item?.id);
  if (!mirror) {
    return item;
  }
  return {
    ...item,
    name: mirror.label,
    imageUrl: mirror.imageUrl,
    productUrl: mirror.itemUrl,
    productName: mirror.name,
    size: mirror.size,
    unitPrice: mirror.unitPrice,
    category: mirror.category,
    price: mirror.price,
    walmartItemId: mirror.itemId,
  };
}

export function loadGroceryList(storage) {
  const resolved = resolveStorage(storage);
  const stored = readJson(resolved, GROCERY_STORAGE_KEY, []);
  const list = createGroceryList();
  if (Array.isArray(stored) && stored.length > 0) {
    for (const item of stored) {
      const result = addGroceryItem(list, enrichListItem(item));
      if (result.added) {
        updateGroceryQuantity(list, item.id, item.quantity);
      }
    }
    return { list, seeded: false, added: 0, updated: 0 };
  }
  const applied = applyWalmartList(list);
  saveGroceryList(list, resolved);
  return { list, seeded: true, added: applied.added, updated: applied.updated };
}

export function saveGroceryList(list, storage) {
  return writeJson(resolveStorage(storage), GROCERY_STORAGE_KEY, list);
}

export function readSyncQueue(storage) {
  const queue = readJson(resolveStorage(storage), SYNC_QUEUE_STORAGE_KEY, []);
  return Array.isArray(queue) ? queue : [];
}

export function pushSyncChange(change, storage) {
  const resolved = resolveStorage(storage);
  const queue = readSyncQueue(resolved);
  queue.push({
    ...change,
    queuedAt: new Date().toISOString(),
    listUrl: WALMART_LIST_URL,
  });
  writeJson(resolved, SYNC_QUEUE_STORAGE_KEY, queue);
  return queue;
}

export function clearSyncQueue(storage) {
  const resolved = resolveStorage(storage);
  writeJson(resolved, SYNC_QUEUE_STORAGE_KEY, []);
  return 0;
}

export function applyGroceryChange(list, change, storage) {
  const action = String(change?.action ?? "");
  let result;
  if (action === "add") {
    result = addGroceryItem(list, change.item ?? { id: change.id, name: change.name });
  } else if (action === "remove") {
    result = removeGroceryItem(list, change.id);
  } else if (action === "update-quantity") {
    result = updateGroceryQuantity(list, change.id, change.quantity);
  } else {
    result = { list, changed: false, reason: "unknown-action" };
  }
  const changed = Boolean(result.added || result.removed || result.updated);
  if (changed) {
    pushSyncChange(
      { action, id: change.id ?? null, name: change.name ?? null, quantity: change.quantity ?? null },
      storage,
    );
  }
  saveGroceryList(list, storage);
  return { ...result, changed, pendingSync: readSyncQueue(storage).length };
}

export function applyWalmartMirrorToList(list, storage) {
  const applied = applyWalmartList(list);
  if (applied.added > 0 || applied.updated > 0) {
    pushSyncChange({ action: "match-walmart-list", added: applied.added, updated: applied.updated }, storage);
  }
  saveGroceryList(list, storage);
  return { ...applied, pendingSync: readSyncQueue(storage).length };
}
