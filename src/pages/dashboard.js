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
import { setDashboardSummary } from "../components/Dashboard/Dashboard.js";
import {
  downloadWalmartSyncPayload,
  WALMART_LIST_URL,
  walmartCheckoutUrl,
} from "../components/WalmartSync/WalmartSync.js";

const STORAGE_KEY = "walmart-grocery-list-v1";
const SYNC_QUEUE_KEY = "walmart-sync-queue-v1";
const list = createGroceryList();
const readyHistory = toReadyToPurchase(DEFAULT_HISTORY);
let searchQuery = "";

function dashboardRoot() {
  return document.querySelector("[data-page-dashboard]");
}

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

function readSyncQueueLength() {
  try {
    const stored = JSON.parse(localStorage.getItem(SYNC_QUEUE_KEY) ?? "[]");
    return Array.isArray(stored) ? stored.length : 0;
  } catch {
    return 0;
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
  renderDashboard();
}

function applyLocalChange(change, mutate) {
  const result = mutate();
  if (result.added || result.removed || result.updated) {
    queueWalmartSync(change);
  } else {
    saveList();
    renderDashboard();
  }
  return result;
}


function renderDashboard() {
  const mount = dashboardRoot();
  if (!mount) {
    return;
  }
  mount.innerHTML = `
    <section class="grocery-dashboard" aria-labelledby="grocery-dashboard-title">
      <div class="grocery-dashboard__header">
        <div>
          <h2 class="grocery-dashboard__title" id="grocery-dashboard-title">Grocery dashboard</h2>
          <p class="grocery-dashboard__subtitle">Search Walmart items, track quantities, and checkout.</p>
        </div>
        <p class="grocery-dashboard__badge" data-dashboard-summary></p>
      </div>
      <div class="grocery-dashboard__grid">
        <article class="grocery-dashboard__card" aria-labelledby="dashboard-search-title">
          <h3 class="grocery-dashboard__card-title" id="dashboard-search-title">1 · Search items</h3>
          <div data-dashboard-search></div>
        </article>
        <article class="grocery-dashboard__card" aria-labelledby="dashboard-list-title">
          <h3 class="grocery-dashboard__card-title" id="dashboard-list-title">2 · Review list</h3>
          <div data-dashboard-list></div>
        </article>
        <article class="grocery-dashboard__card" aria-labelledby="dashboard-checkout-title">
          <h3 class="grocery-dashboard__card-title" id="dashboard-checkout-title">3 · Sync and checkout</h3>
          <div data-dashboard-sync></div>
        </article>
      </div>
    </section>`;
  renderSearchCard(mount);
  renderListCard(mount);
  renderSyncCard(mount);
  setDashboardSummary(mount, list);
}

function renderSearchCard(root) {
  const mount = root.querySelector("[data-dashboard-search]");
  mount.innerHTML = `
    <section class="reorder-panel" aria-labelledby="reorder-panel-title">
      <h2 class="reorder-panel__title" id="reorder-panel-title">Previous history</h2>
      <p class="reorder-panel__description">Search shows each matching item with its Walmart image. Select adds one and ignores duplicates.</p>
      <form class="reorder-panel__form" data-reorder-search-form>
        <label class="reorder-panel__label" for="dashboard-search">Search Walmart items</label>
        <input class="reorder-panel__input" id="dashboard-search" name="search" type="search" autocomplete="off" placeholder="Try milk, bread, or beef">
      </form>
      <ul class="reorder-panel__history" data-reorder-history></ul>
      <p class="reorder-panel__status" data-reorder-status role="status"></p>
    </section>`;
  const historyContainer = mount.querySelector("[data-reorder-history]");
  const searchInput = mount.querySelector("[data-reorder-search-form] input");
  searchInput.value = searchQuery;
  searchInput.addEventListener("input", (event) => {
    searchQuery = event.target.value;
    renderDashboard();
    const nextInput = dashboardRoot().querySelector("#dashboard-search");
    nextInput.focus();
    nextInput.setSelectionRange(nextInput.value.length, nextInput.value.length);
  });
  const results = searchHistory(readyHistory, searchQuery);
  renderSelectableHistory(results, historyContainer, (id) => {
    const match = readyHistory.find((item) => item.id === id);
    const result = applyLocalChange({ action: "add", id, name: match?.name ?? id }, () =>
      addFromHistory(list, readyHistory, id),
    );
    const status = dashboardRoot().querySelector("[data-reorder-status]");
    status.textContent = result.added
      ? `Added one ${match?.name ?? id} with its image and queued Walmart sync.`
      : "That item is already in your grocery list.";
  });
  const status = mount.querySelector("[data-reorder-status]");
  status.textContent = results.length === 0
    ? "No matching Walmart items."
    : `${results.length} matching item(s), each shown with an image.`;
}

function renderListCard(root) {
  const mount = root.querySelector("[data-dashboard-list]");
  const template = document.querySelector("#grocery-item-template");
  const checkoutUrl = walmartCheckoutUrl(list);
  mount.innerHTML = `
    <section class="grocery-list" aria-labelledby="grocery-list-title">
      <h2 class="grocery-list__title" id="grocery-list-title">Grocery list</h2>
      <p class="grocery-list__count" data-grocery-list-count>${list.length} items</p>
      <p class="grocery-list__total" data-grocery-list-total>Total quantity: ${totalGroceryQuantity(list)}</p>
      <ul class="grocery-list__items" data-grocery-list-items></ul>
      <p class="grocery-list__empty" data-grocery-list-empty ${list.length > 0 ? "hidden" : ""}>No items yet. Search on the left and select an item.</p>
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
          renderDashboard();
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

function renderSyncCard(root) {
  const mount = root.querySelector("[data-dashboard-sync]");
  const count = readSyncQueueLength();
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

function initializeDashboard() {
  loadStoredList();
  renderDashboard();
}

initializeDashboard();

