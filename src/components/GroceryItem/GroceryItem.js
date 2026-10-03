export function renderGroceryItem(item, template, handlers = {}) {
  const fragment = template.content.cloneNode(true);
  const image = fragment.querySelector("[data-grocery-item-image]");
  const name = fragment.querySelector("[data-grocery-item-name]");
  const quantity = fragment.querySelector("[data-grocery-item-quantity]");
  const quantityLabel = fragment.querySelector("[data-grocery-item-quantity-label]");
  const decrease = fragment.querySelector("[data-grocery-item-decrease]");
  const increase = fragment.querySelector("[data-grocery-item-increase]");
  const source = fragment.querySelector("[data-grocery-item-source]");
  const product = fragment.querySelector("[data-grocery-item-product]");
  const remove = fragment.querySelector("[data-grocery-item-remove]");

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
    source.textContent = item.source === "history" ? "From previous history" : "Ready to purchase";
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
