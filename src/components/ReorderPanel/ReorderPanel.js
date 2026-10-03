import { addGroceryItem, searchGroceryCatalog } from "../GroceryList/GroceryList.js";

export const DEFAULT_HISTORY = [
  {
    id: "whole-milk",
    name: "Whole Milk",
    keywords: "milk dairy whole",
    imageUrl: "https://i5.walmartimages.com/seo/Crystal-Creamery-Real-California-Milk-Whole-Vitamin-D-Gluten-Free-Milk-Plastic-Jug-Gallon128-fl-oz_99ec39e0-0aa0-4acd-a237-904f667e237d.2256cc69e7e0f63c70f6f30e2be46ba1.jpeg?odnHeight=576&odnWidth=576&odnBg=FFFFFF",
    productUrl: "https://www.walmart.com/search?q=whole+milk",
  },
  {
    id: "loaf-of-bread",
    name: "Loaf of bread",
    keywords: "bread loaf bakery",
    imageUrl: "https://i5.walmartimages.com/seo/Great-Value-White-Round-Top-Bread-Loaf-20-oz_2e2a0e48-fecf-4b00-9ce4-64486788a22e.76317f2bfb5207c437cb7ccd4115589d.jpeg?odnHeight=576&odnWidth=576&odnBg=FFFFFF",
    productUrl: "https://www.walmart.com/search?q=loaf+of+bread",
  },
  {
    id: "hamburger-logs-2lbs",
    name: "Hamburger logs, 2 lbs",
    keywords: "beef hamburger ground roll",
    imageUrl: "https://i5.walmartimages.com/seo/73-Lean-27-Fat-Ground-Beef-Roll-1-Lb_191a1a22-3e92-44b3-b3a5-4744e3d84e22.db4efc1f1075d5b0f6054d2c0b8ba169.jpeg?odnHeight=576&odnWidth=576&odnBg=FFFFFF",
    productUrl: "https://www.walmart.com/search?q=hamburger+logs",
  },
];

export function searchHistory(history, query) {
  return searchGroceryCatalog(history, query);
}

export function toReadyToPurchase(history) {
  return history.map((item) => ({
    id: item.id,
    name: item.name,
    quantity: 1,
    source: "history",
    imageUrl: item.imageUrl ?? null,
    productUrl: item.productUrl ?? null,
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
    productUrl: match.productUrl,
  });
}

export function seedGroceryList(list, history) {
  for (const item of history) {
    addFromHistory(list, history, item.id);
  }
  return list;
}

export function renderSelectableHistory(history, container, onSelect) {
  container.innerHTML = "";
  for (const item of history) {
    const listItem = document.createElement("li");
    listItem.className = "reorder-panel__history-item";

    const image = document.createElement("img");
    image.className = "reorder-panel__history-image";
    image.src = item.imageUrl;
    image.alt = item.name;
    image.width = 72;
    image.height = 72;
    image.loading = "lazy";

    const details = document.createElement("div");
    details.className = "reorder-panel__history-details";
    const name = document.createElement("span");
    name.className = "reorder-panel__history-name";
    name.textContent = item.name;
    const meta = document.createElement("span");
    meta.className = "reorder-panel__history-meta";
    meta.textContent = "Qty 1 · From Walmart";
    details.append(name, meta);

    const button = document.createElement("button");
    button.type = "button";
    button.className = "reorder-panel__history-button";
    button.textContent = `Select ${item.name}`;
    button.dataset.itemId = item.id;
    button.setAttribute("aria-label", `Add one ${item.name} to grocery list`);
    button.addEventListener("click", () => onSelect(item.id));

    listItem.append(image, details, button);
    container.append(listItem);
  }
}

export function renderHistoryButtons(history, container, onSelect) {
  renderSelectableHistory(history, container, onSelect);
}
