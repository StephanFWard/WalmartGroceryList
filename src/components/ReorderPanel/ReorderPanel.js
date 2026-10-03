import { addGroceryItem, formatUsd, searchGroceryCatalog } from "../GroceryList/GroceryList.js";
import { WALMART_LIST_ITEMS } from "../WalmartList/WalmartList.js";
import { walmartSearchUrl } from "../WalmartSync/WalmartSync.js";

export const DEFAULT_HISTORY = WALMART_LIST_ITEMS.map((item) => ({
  id: item.id,
  name: item.label,
  keywords: item.keywords,
  imageUrl: item.imageUrl,
  itemUrl: item.itemUrl,
  itemId: item.itemId,
  productName: item.name,
  size: item.size,
  unitPrice: item.unitPrice,
  category: item.category,
  price: item.price,
  productUrl: walmartSearchUrl(item.label),
}));

export function searchHistory(history, query) {
  return searchGroceryCatalog(history, query);
}

export function toReadyToPurchase(history) {
  return history.map((item) => ({
    id: item.id,
    name: item.name,
    keywords: item.keywords ?? "",
    quantity: 1,
    source: "history",
    imageUrl: item.imageUrl ?? null,
    productUrl: item.itemUrl ?? item.productUrl ?? null,
    productName: item.productName ?? null,
    size: item.size ?? null,
    unitPrice: item.unitPrice ?? null,
    category: item.category ?? null,
    price: item.price ?? null,
    walmartItemId: item.itemId ?? null,
  }));
}

export function addFromHistory(list, history, id) {
  const normalized = String(id ?? "").trim().toLowerCase();
  const match = history.find((item) => String(item.id).trim().toLowerCase() === normalized);
  if (!match) {
    return { added: false, reason: "not-found", list };
  }
  return addGroceryItem(list, {
    id: match.id,
    name: match.name,
    imageUrl: match.imageUrl,
    productUrl: match.itemUrl ?? match.productUrl,
    productName: match.productName,
    size: match.size,
    unitPrice: match.unitPrice,
    category: match.category,
    price: match.price,
    walmartItemId: match.itemId,
    source: match.source ?? "history",
  });
}

export function seedGroceryList(list, history) {
  for (const item of history) {
    addFromHistory(list, history, item.id);
  }
  return list;
}

export function renderSelectableHistory(history, container, onSelect) {
  if (!container) {
    return;
  }
  container.innerHTML = "";
  for (const item of history) {
    const listItem = document.createElement("li");
    listItem.className = "reorder-panel__history-item";
    listItem.dataset.itemId = item.id;

    const image = document.createElement("img");
    image.className = "reorder-panel__history-image";
    image.src = item.imageUrl;
    image.alt = item.productName ?? item.name;
    image.width = 96;
    image.height = 96;
    image.loading = "lazy";

    const details = document.createElement("div");
    details.className = "reorder-panel__history-details";

    const name = document.createElement("p");
    name.className = "reorder-panel__history-name";
    name.textContent = item.name;

    const product = document.createElement("p");
    product.className = "reorder-panel__history-product";
    product.textContent = item.productName ?? "Walmart item";
    product.title = item.productName ?? item.name;

    const meta = document.createElement("p");
    meta.className = "reorder-panel__history-meta";
    const size = document.createElement("span");
    size.className = "reorder-panel__history-size";
    size.textContent = item.size ?? "Walmart size";
    const price = document.createElement("span");
    price.className = "reorder-panel__history-price";
    price.textContent = priceLabel(item);
    meta.append(size, price);
    details.append(name, product, meta);

    const button = document.createElement("button");
    button.type = "button";
    button.className = "reorder-panel__history-button";
    button.textContent = "Add to list";
    button.dataset.itemId = item.id;
    button.setAttribute("aria-label", `Add ${item.name} to grocery list`);
    button.addEventListener("click", () => onSelect(item.id));

    listItem.append(image, details, button);
    container.append(listItem);
  }
}

function priceLabel(item) {
  if (typeof item.price !== "number") {
    return "Starts at qty 1";
  }
  const amount = formatUsd(item.price);
  return item.unitPrice ? `${amount} · ${item.unitPrice}` : amount;
}

export function renderHistoryButtons(history, container, onSelect) {
  renderSelectableHistory(history, container, onSelect);
}
