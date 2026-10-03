import {
  estimateGrocerySubtotal,
  formatUsd,
  totalGroceryQuantity,
} from "../GroceryList/GroceryList.js";
import {
  WALMART_CART_URL,
  WALMART_LIST_ID,
  WALMART_LIST_URL,
  WALMART_REORDER_URL,
} from "../WalmartSync/WalmartSync.js";

export const APP_SHELL_LINKS = [
  { id: "reorder", label: "Reorder · My Items", href: WALMART_REORDER_URL },
  { id: "list", label: `Walmart list ${WALMART_LIST_ID.slice(0, 8)}`, href: WALMART_LIST_URL },
  { id: "cart", label: "Cart · checkout", href: WALMART_CART_URL },
];

export function renderAppShellNav(container, links = APP_SHELL_LINKS) {
  if (!container) {
    return [];
  }
  container.innerHTML = "";
  const rendered = [];
  for (const link of links) {
    const anchor = document.createElement("a");
    anchor.className = "app-shell__nav-link";
    anchor.href = link.href;
    anchor.textContent = link.label;
    anchor.dataset.linkId = link.id;
    container.append(anchor);
    rendered.push(anchor);
  }
  return rendered;
}

export function appShellStats(list, syncReport) {
  const stats = [
    { label: "Items", value: String(list.length) },
    { label: "Units", value: String(totalGroceryQuantity(list)) },
  ];
  if (syncReport) {
    stats.push({ label: "In sync", value: `${syncReport.inSync}/${syncReport.total}` });
  }
  stats.push({ label: "Estimated", value: formatUsd(estimateGrocerySubtotal(list)) });
  return stats;
}

export function renderAppShellStats(container, stats) {
  if (!container) {
    return;
  }
  container.innerHTML = "";
  for (const stat of stats) {
    const listItem = document.createElement("li");
    listItem.className = "app-shell__stat";

    const value = document.createElement("span");
    value.className = "app-shell__stat-value";
    value.textContent = stat.value;

    const label = document.createElement("span");
    label.className = "app-shell__stat-label";
    label.textContent = stat.label;

    listItem.append(value, label);
    container.append(listItem);
  }
}
