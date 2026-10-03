import { formatUsd } from "../GroceryList/GroceryList.js";

const SOURCE_LABELS = {
  history: "From previous history",
  "walmart-list": "Mirrors Walmart list",
  ready: "Ready to purchase",
};

function setOptionalText(element, text) {
  if (!element) {
    return;
  }
  if (text === null || text === undefined || text === "") {
    element.textContent = "";
    element.removeAttribute("title");
    element.setAttribute("hidden", "");
    return;
  }
  element.textContent = text;
  element.setAttribute("title", text);
  element.removeAttribute("hidden");
}

function priceText(item) {
  if (typeof item.price !== "number") {
    return null;
  }
  const amount = formatUsd(item.price);
  return item.unitPrice ? `${amount} · ${item.unitPrice}` : amount;
}

export function renderGroceryItem(item, template, handlers = {}) {
  const fragment = template.content.cloneNode(true);
  const root = fragment.querySelector("[data-grocery-item]");
  const media = fragment.querySelector("[data-grocery-item-media]");
  const image = fragment.querySelector("[data-grocery-item-image]");
  const name = fragment.querySelector("[data-grocery-item-name]");
  const productName = fragment.querySelector("[data-grocery-item-product-name]");
  const size = fragment.querySelector("[data-grocery-item-size]");
  const price = fragment.querySelector("[data-grocery-item-price]");
  const quantity = fragment.querySelector("[data-grocery-item-quantity]");
  const quantityLabel = fragment.querySelector("[data-grocery-item-quantity-label]");
  const decrease = fragment.querySelector("[data-grocery-item-decrease]");
  const increase = fragment.querySelector("[data-grocery-item-increase]");
  const source = fragment.querySelector("[data-grocery-item-source]");
  const product = fragment.querySelector("[data-grocery-item-product]");
  const remove = fragment.querySelector("[data-grocery-item-remove]");

  if (root) {
    root.dataset.itemId = item.id;
  }
  if (media) {
    if (item.productUrl) {
      media.href = item.productUrl;
      media.removeAttribute("hidden");
    } else {
      media.removeAttribute("href");
      media.setAttribute("hidden", "");
    }
  }
  if (image) {
    if (item.imageUrl) {
      image.src = item.imageUrl;
      image.alt = item.name;
      image.removeAttribute("hidden");
    } else {
      image.removeAttribute("src");
      image.setAttribute("hidden", "");
    }
  }
  if (name) {
    name.textContent = item.name;
  }
  setOptionalText(productName, item.productName ?? null);
  setOptionalText(size, item.size ?? null);
  setOptionalText(price, priceText(item));
  if (quantity) {
    quantity.value = String(item.quantity);
    quantity.setAttribute("aria-label", `Quantity for ${item.name}`);
    quantity.addEventListener("change", (event) => {
      handlers.onQuantity?.(item.id, event.target.value);
    });
  }
  if (quantityLabel) {
    quantityLabel.setAttribute("for", `quantity-${item.id}`);
  }
  if (quantity) {
    quantity.id = `quantity-${item.id}`;
  }
  if (decrease) {
    decrease.setAttribute("aria-label", `Decrease quantity for ${item.name}`);
    decrease.addEventListener("click", () => {
      handlers.onQuantity?.(item.id, item.quantity - 1);
    });
  }
  if (increase) {
    increase.setAttribute("aria-label", `Increase quantity for ${item.name}`);
    increase.addEventListener("click", () => {
      handlers.onQuantity?.(item.id, item.quantity + 1);
    });
  }
  if (source) {
    source.textContent = SOURCE_LABELS[item.source] ?? SOURCE_LABELS.ready;
  }
  if (product) {
    if (item.productUrl) {
      product.href = item.productUrl;
      product.removeAttribute("hidden");
    } else {
      product.removeAttribute("href");
      product.setAttribute("hidden", "");
    }
  }
  if (remove) {
    remove.dataset.itemId = item.id;
  }
  return fragment;
}
