import { appShellStats, renderAppShellNav, renderAppShellStats } from "../components/AppShell/AppShell.js";
import { dashboardShellHtml, setDashboardSummary } from "../components/Dashboard/Dashboard.js";
import {
  countGroceryItems,
  estimateGrocerySubtotal,
  formatUsd,
  totalGroceryQuantity,
} from "../components/GroceryList/GroceryList.js";
import { renderGroceryItem } from "../components/GroceryItem/GroceryItem.js";
import {
  applyGroceryChange,
  applyWalmartMirrorToList,
  clearSyncQueue,
  loadGroceryList,
  readSyncQueue,
} from "../components/GroceryStore/GroceryStore.js";
import {
  DEFAULT_HISTORY,
  renderSelectableHistory,
  searchHistory,
  toReadyToPurchase,
} from "../components/ReorderPanel/ReorderPanel.js";
import {
  localListSyncReport,
  renderWalmartListSnapshot,
  syncStatusText,
} from "../components/WalmartList/WalmartList.js";
import {
  downloadWalmartSyncPayload,
  WALMART_LIST_ID,
  WALMART_LIST_URL,
  walmartCheckoutUrl,
} from "../components/WalmartSync/WalmartSync.js";

export function renderShellNav(root) {
  renderAppShellNav(root.querySelector("[data-app-shell-nav]"));
}

export function renderShellStats(root, list, report) {
  renderAppShellStats(root.querySelector("[data-app-shell-stats]"), appShellStats(list, report));
}

export function renderSearchPanel(mount, options) {
  if (!mount) {
    return null;
  }
  const { history, searchState, onSelect } = options;
  mount.innerHTML = `
    <section class="reorder-panel" aria-labelledby="reorder-panel-title">
      <h2 class="reorder-panel__title" id="reorder-panel-title">Search Walmart items</h2>
      <p class="reorder-panel__description">Every result uses the official Walmart image, size, and price captured for your list.</p>
      <form class="reorder-panel__form" data-reorder-search-form role="search">
        <label class="reorder-panel__label" for="reorder-search">Search by name, keyword, or item id</label>
        <input class="reorder-panel__input" id="reorder-search" name="search" type="search" autocomplete="off" placeholder="Try milk, bread, or beef">
      </form>
      <ul class="reorder-panel__history" data-reorder-history></ul>
      <p class="reorder-panel__status" data-reorder-status role="status"></p>
    </section>`;

  const historyContainer = mount.querySelector("[data-reorder-history]");
  const status = mount.querySelector("[data-reorder-status]");
  const input = mount.querySelector("[data-reorder-search-form] input");

  const renderResults = () => {
    const results = searchHistory(history, searchState.query);
    renderSelectableHistory(results, historyContainer, onSelect);
    const count = results.length === 0 ? "No matching Walmart items." : `${results.length} matching item(s).`;
    status.textContent = searchState.notice === "" ? count : `${count} ${searchState.notice}`;
  };

  input.value = searchState.query;
  input.addEventListener("input", (event) => {
    searchState.query = event.target.value;
    searchState.notice = "";
    renderResults();
  });
  renderResults();
  return { render: renderResults };
}

export function renderListPanel(mount, options) {
  if (!mount) {
    return;
  }
  const { list, template, onQuantity, onRemove } = options;
  const empty = list.length === 0;
  mount.innerHTML = `
    <section class="grocery-list" aria-labelledby="grocery-list-title">
      <div class="grocery-list__header">
        <h2 class="grocery-list__title" id="grocery-list-title">Your grocery list</h2>
        <p class="grocery-list__count" data-grocery-list-count>${countGroceryItems(list)} item(s)</p>
      </div>
      <ul class="grocery-list__stats">
        <li class="grocery-list__stat">
          <span class="grocery-list__stat-value">${totalGroceryQuantity(list)}</span>
          <span class="grocery-list__stat-label">Total units</span>
        </li>
        <li class="grocery-list__stat">
          <span class="grocery-list__stat-value">${formatUsd(estimateGrocerySubtotal(list))}</span>
          <span class="grocery-list__stat-label">Estimated subtotal</span>
        </li>
      </ul>
      <ul class="grocery-list__items" data-grocery-list-items></ul>
      <p class="grocery-list__empty" ${empty ? "" : "hidden"}>No items yet. Choose an item from search to start the list.</p>
      <div class="grocery-list__footer">
        <a class="grocery-list__checkout" data-grocery-list-checkout href="${walmartCheckoutUrl(list)}">Checkout at Walmart</a>
        <a class="grocery-list__link" href="${WALMART_LIST_URL}">Open Walmart list ${WALMART_LIST_ID.slice(0, 8)}</a>
        <a class="grocery-list__link" href="https://www.walmart.com/my-items">Open Reorder / My Items</a>
      </div>
      <p class="grocery-list__note">Estimated subtotal uses the Walmart prices captured with the list mirror. Walmart confirms final pricing at checkout.</p>
    </section>`;

  const items = mount.querySelector("[data-grocery-list-items]");
  for (const item of list) {
    const fragment = renderGroceryItem(item, template, { onQuantity });
    const removeButton = fragment.querySelector("[data-grocery-item-remove]");
    removeButton.addEventListener("click", () => onRemove(item.id));
    items.append(fragment);
  }
}

export function renderMirrorPanel(mount, options) {
  if (!mount) {
    return;
  }
  const { report, onApply } = options;
  mount.innerHTML = `
    <section class="walmart-list" aria-labelledby="walmart-list-title">
      <h2 class="walmart-list__title" id="walmart-list-title">Walmart list mirror</h2>
      <p class="walmart-list__description">Images, sizes, and prices captured from the items on Walmart list ${WALMART_LIST_ID.slice(0, 8)}. Walmart keeps that list private, so this mirror stores it locally.</p>
      <p class="walmart-list__status" data-walmart-list-status role="status">${syncStatusText(report)}</p>
      <ul class="walmart-list__rows" data-walmart-list-items></ul>
      <div class="walmart-list__actions">
        <button class="walmart-list__button" type="button" data-walmart-list-apply>Match Walmart list</button>
        <a class="walmart-list__link" href="${WALMART_LIST_URL}">Open Walmart list</a>
      </div>
    </section>`;

  renderWalmartListSnapshot(report, mount.querySelector("[data-walmart-list-items]"));
  mount.querySelector("[data-walmart-list-apply]").addEventListener("click", onApply);
}

export function renderSyncPanel(mount, options) {
  if (!mount) {
    return;
  }
  const { pendingCount, itemCount, onDownload, onClear } = options;
  const statusText =
    pendingCount === 0
      ? "Sync queue is empty."
      : `${pendingCount} change(s) queued for ${itemCount} item(s).`;
  mount.innerHTML = `
    <section class="walmart-sync" aria-labelledby="walmart-sync-title">
      <h2 class="walmart-sync__title" id="walmart-sync-title">Walmart sync</h2>
      <p class="walmart-sync__description">Every local change queues a sync payload for list ${WALMART_LIST_ID.slice(0, 8)}. Walmart requires your signed-in session to apply it.</p>
      <p class="walmart-sync__status" data-walmart-sync-status role="status">${statusText}</p>
      <div class="walmart-sync__actions">
        <button class="walmart-sync__button" type="button" data-walmart-sync-download>Download sync file</button>
        <button class="walmart-sync__button walmart-sync__button--ghost" type="button" data-walmart-sync-clear>Mark queue synced</button>
        <a class="walmart-sync__link" href="${WALMART_LIST_URL}">Open Walmart list</a>
      </div>
      <p class="walmart-sync__note">The sync file lists every item with its quantity, image, and Walmart product URL so it can be applied at walmart.com.</p>
    </section>`;

  mount.querySelector("[data-walmart-sync-download]").addEventListener("click", () => {
    onDownload(mount.querySelector("[data-walmart-sync-status]"));
  });
  mount.querySelector("[data-walmart-sync-clear]").addEventListener("click", onClear);
}

export function createGroceryListController(options) {
  const { root, template } = options;
  const view = { ...options.mounts };
  const readyHistory = toReadyToPurchase(DEFAULT_HISTORY);
  const { list, seeded } = loadGroceryList();
  const searchState = {
    query: "",
    notice: seeded ? "Seeded from the Walmart list mirror." : "",
  };
  let searchApi = null;

  const currentReport = () => localListSyncReport(list);

  function paintPanels() {
    const report = currentReport();
    renderShellStats(root, list, report);
    if (view.dashboard) {
      setDashboardSummary(view.dashboard, list);
    }
    renderListPanel(view.list, {
      list,
      template,
      onQuantity: handleQuantity,
      onRemove: handleRemove,
    });
    renderMirrorPanel(view.mirror, { report, onApply: handleApplyMirror });
    renderSyncPanel(view.sync, {
      pendingCount: readSyncQueue().length,
      itemCount: list.length,
      onDownload: handleDownload,
      onClear: handleClear,
    });
  }

  function paintSearch() {
    if (searchApi !== null) {
      searchApi.render();
    }
  }

  function handleAdd(id) {
    const item = readyHistory.find((entry) => entry.id === id);
    const label = item ? item.name : id;
    const result = applyGroceryChange(list, { action: "add", id, name: label, item });
    searchState.notice = result.changed
      ? `Added ${label} · queued for Walmart sync.`
      : "That item is already in your list.";
    paintSearch();
    paintPanels();
  }

  function handleQuantity(id, quantity) {
    applyGroceryChange(list, { action: "update-quantity", id, quantity });
    paintPanels();
  }

  function handleRemove(id) {
    applyGroceryChange(list, { action: "remove", id });
    searchState.notice = "Removed an item · queued for Walmart sync.";
    paintSearch();
    paintPanels();
  }

  function handleApplyMirror() {
    const applied = applyWalmartMirrorToList(list);
    searchState.notice =
      applied.added === 0 && applied.updated === 0
        ? "Your list already matches the Walmart list."
        : `Matched the Walmart list · ${applied.added} added, ${applied.updated} quantity update(s).`;
    paintSearch();
    paintPanels();
  }

  function handleDownload(statusElement) {
    const payload = downloadWalmartSyncPayload(list);
    if (statusElement) {
      statusElement.textContent = `Sync file exported with ${payload.itemCount} item(s) and ${payload.totalUnits} unit(s).`;
    }
  }

  function handleClear() {
    clearSyncQueue();
    paintPanels();
  }

  function render() {
    if (view.dashboard) {
      view.dashboard.innerHTML = dashboardShellHtml();
      view.search = view.dashboard.querySelector("[data-dashboard-search]");
      view.list = view.dashboard.querySelector("[data-dashboard-list]");
      view.mirror = view.dashboard.querySelector("[data-dashboard-mirror]");
      view.sync = view.dashboard.querySelector("[data-dashboard-sync]");
    }
    searchApi = renderSearchPanel(view.search, {
      history: readyHistory,
      searchState,
      onSelect: handleAdd,
    });
    paintPanels();
  }

  return { render, refresh: paintPanels, list, report: currentReport };
}
