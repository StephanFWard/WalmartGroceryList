import { totalGroceryQuantity } from "../GroceryList/GroceryList.js";

export function dashboardSummaryText(list) {
  const items = list.length;
  const quantity = totalGroceryQuantity(list);
  const itemLabel = items === 1 ? "item" : "items";
  const quantityLabel = quantity === 1 ? "unit" : "units";
  return `${items} ${itemLabel} · ${quantity} ${quantityLabel}`;
}

export function setDashboardSummary(root, list) {
  const summary = root.querySelector("[data-dashboard-summary]");
  if (summary) {
    summary.textContent = dashboardSummaryText(list);
  }
}
