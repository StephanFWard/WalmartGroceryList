import {
  addGroceryItem,
  createGroceryList,
  removeGroceryItem,
  totalGroceryQuantity,
  updateGroceryQuantity,
} from "../components/GroceryList/GroceryList.js";
import { renderGroceryItem } from "../components/GroceryItem/GroceryItem.js";
import {
  addFromHistory,
  DEFAULT_HISTORY,
  renderSelectableHistory,
  searchHistory,
  seedGroceryList,
  toReadyToPurchase,
} from "../components/ReorderPanel/ReorderPanel.js";
import {
  downloadWalmartSyncPayload,
  toWalmartSyncPayload,
  WALMART_LIST_URL,
  walmartCheckoutUrl,
} from "../components/WalmartSync/WalmartSync.js";

const STORAGE_KEY = "walmart-grocery-list-v1";
const SYNC_QUEUE_KEY = "walmart-sync-queue-v1";
const list = createGroceryList();
const readyHistory = toReadyToPurchase(DEFAULT_HISTORY);
let searchQuery = "";

function loadStoredList() {
  let stored = null;
  try {
    stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
  } catch {
    stored = null;
  }
  if (Array.isArray(stored) && stored.length > 0) {
    for (const item of stored) {
      addGroceryItem(list, item);
    }
    return;
  }
  seedGroceryList(list, readyHistory);
  saveList();
}

function saveList() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    // Storage is optional for the local interface.
  }
}

function queueWalmartSync(change) {
  let queue = [];
  try {
    const stored = JSON.parse(localStorage.getItem(SYNC_QUEUE_KEY) ?? "[]");
    if (Array.isArray(stored)) {
      queue = stored;
    }
  } catch {
    queue = [];
  }
  queue.push({
    ...change,
    queuedAt: new Date().toISOString(),
    listUrl: WALMART_LIST_URL,
  });
  try {
    localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
  } catch {
    // Sync queue storage is optional.
  }
  renderSyncPanel(queue.length);
}

function applyLocalChange(change, mutate) {
  const result = mutate();
  if (result.added || result.removed || result.updated) {
    queueWalmartSync(change);
  }
  saveList();
  renderList();
  return result;
}

function renderSyncPanel(pendingCount) {
  const mount = document.querySelector("[data-page-sync]");
  if (!mount) {
    return;
  }
  const count = pendingCount ?? readSyncQueueLength();
  mount.innerHTML = `
    <section class="walmart-sync" aria-labelledby="walmart-sync-title">
      <h2 class="walmart-sync__title" id="walmart-sync-title">Walmart sync</h2>
      <p class="walmart-sync__description">Local changes queue an automatic sync payload for your Walmart list. Walmart requires your signed-in stephan.ward5@icloud.com session to apply it.</p>
      <p class="walmart-sync__status" data-walmart-sync-status role="status">${count === 0 ? "Sync queue is empty." : `${count} change(s) queued for Walmart list WL/73215e44.`}</p>
      <div class="walmart-sync__actions">
        <button class="walmart-sync__button" type="button" data-walmart-sync-download>Download sync file</button>
        <a class="walmart-sync__link" href="${WALMART_LIST_URL}">Open Walmart list</a>
      </div>
    </section>`;
  mount.querySelector("[data-walmart-sync-download]").addEventListener("click", () => {
    downloadWalmartSyncPayload(list);
    const status = mount.querySelector("[data-walmart-sync-status]");
    status.textContent = `Sync file exported with ${list.length} item(s). Open your Walmart list to apply it.`;
  });
}

function readSyncQueueLength() {
  try {
    const stored = JSON.parse(localStorage.getItem(SYNC_QUEUE_KEY) ?? "[]");
    return Array.isArray(stored) ? stored.length : 0;
  } catch {
    return 0;
  }
}

function renderList() {
  const mount = document.querySelector("[data-page-grocery-list]");
  const template = document.querySelector("#grocery-item-template");
  const checkoutUrl = walmartCheckoutUrl(list);
  mount.innerHTML = `
    <section class="grocery-list" aria-labelledby="grocery-list-title">
      <h2 class="grocery-list__title" id="grocery-list-title">Grocery list</h2>
      <p class="grocery-list__count" data-grocery-list-count>${list.length} items</p>
      <p class="grocery-list__total" data-grocery-list-total>Total quantity: ${totalGroceryQuantity(list)}</p>
      <ul class="grocery-list__items" data-grocery-list-items></ul>
      <p class="grocery-list__empty" data-grocery-list-empty ${list.length > 0 ? "hidden" : ""}>No items yet. Add an item from your previous history.</p>
      <div class="grocery-list__footer">
        <a class="grocery-list__checkout" data-grocery-list-checkout href="${checkoutUrl}">Checkout at Walmart</a>
        <a class="grocery-list__link" href="https://www.walmart.com/lists/WL/73215e44-ec62-42ab-ae9e-3a997e756090">Open Walmart list WL/73215e44</a>
        <a class="grocery-list__link" href="https://www.walmart.com/my-items">Open Reorder / My Items</a>
      </div>
    </section>`;
  const items = mount.querySelector("[data-grocery-list-items]");
  for (const item of list) {
    const fragment = renderGroceryItem(item, template, {
      onQuantity: (id, quantity) => {
        const result = applyLocalChange({ action: "update-quantity", id, quantity }, () =>
          updateGroceryQuantity(list, id, quantity),
        );
        if (!result.updated) {
          renderList();
        }
      },
    });
    const removeButton = fragment.querySelector("[data-grocery-item-remove]");
    removeButton.addEventListener("click", () => {
      applyLocalChange({ action: "remove", id: item.id, name: item.name }, () =>
        removeGroceryItem(list, item.id),
      );
    });
    items.append(fragment);
  }
}

function setStatus(message) {
  const status = document.querySelector("[data-reorder-status]");
  if (status) {
    status.textContent = message;
  }
}

function renderReorderPanel() {
  const mount = document.querySelector("[data-page-reorder]");
  mount.innerHTML = `
    <section class="reorder-panel" aria-labelledby="reorder-panel-title">
      <h2 class="reorder-panel__title" id="reorder-panel-title">Previous history</h2>
      <p class="reorder-panel__description">Search and select ready-to-purchase Walmart items. Every item is added with quantity 1 and duplicates are ignored.</p>
      <form class="reorder-panel__form" data-reorder-search-form>
        <label class="reorder-panel__label" for="reorder-search">Search Walmart items</label>
        <input class="reorder-panel__input" id="reorder-search" name="search" type="search" autocomplete="off" placeholder="Try milk, bread, or beef">
      </form>
      <ul class="reorder-panel__history" data-reorder-history></ul>
      <p class="reorder-panel__status" data-reorder-status role="status"></p>
    </section>`;

  const historyContainer = mount.querySelector("[data-reorder-history]");
  const searchInput = mount.querySelector("[data-reorder-search-form] input");
  const renderResults = () => {
    const results = searchHistory(readyHistory, searchQuery);
    renderSelectableHistory(results, historyContainer, (id) => {
      const match = readyHistory.find((item) => item.id === id);
      const result = applyLocalChange({ action: "add", id, name: match?.name ?? id }, () =>
        addFromHistory(list, readyHistory, id),
      );
      setStatus(result.added ? "Added one item and queued Walmart sync." : "That item is already in your grocery list.");
    });
    const status = mount.querySelector("[data-reorder-status]");
    status.textContent = results.length === 0 ? "No matching Walmart items." : `${results.length} matching item(s).`;
  };

  searchInput.value = searchQuery;
  searchInput.addEventListener("input", (event) => {
    searchQuery = event.target.value;
    renderResults();
  });
  renderResults();
}

function initializePage() {
  loadStoredList();
  renderReorderPanel();
  renderSyncPanel();
  renderList();
}

initializePage();
