import { formatUsd, normalizeQuantity } from "../GroceryList/GroceryList.js";

export const BRIDGE_STATE_URL = "/api/walmart/state";
export const BRIDGE_ACTIONS_URL = "/api/walmart/actions";
export const BRIDGE_POLL_MS = 2000;

export function normalizeLiveCart(snapshot) {
  if (snapshot === null || snapshot === undefined) {
    return { connected: false, capturedAt: null, store: null, items: [], totals: { items: 0, units: 0, subtotal: 0 } };
  }
  const items = (Array.isArray(snapshot.items) ? snapshot.items : []).map((item, index) => ({
    itemId: String(item.itemId ?? item.id ?? `unknown-${index}`).trim(),
    name: String(item.name ?? "Walmart item").trim(),
    quantity: normalizeQuantity(item.quantity, 1),
    price: Number.isFinite(Number.parseFloat(item.price)) ? Number.parseFloat(item.price) : null,
    imageUrl: item.imageUrl === null || item.imageUrl === undefined || item.imageUrl === "" ? null : String(item.imageUrl),
    productUrl: item.productUrl === null || item.productUrl === undefined || item.productUrl === "" ? null : String(item.productUrl),
  }));
  const units = items.reduce((total, item) => total + item.quantity, 0);
  const subtotal = items.reduce(
    (total, item) => total + (item.price === null ? 0 : item.price * item.quantity),
    0,
  );
  return {
    connected: true,
    capturedAt: typeof snapshot.capturedAt === "string" ? snapshot.capturedAt : null,
    store: snapshot.store === null || snapshot.store === undefined ? null : String(snapshot.store),
    items,
    totals: { items: items.length, units, subtotal: Math.round(subtotal * 100) / 100 },
  };
}

export function liveCartStatusText(cart, pendingCount = 0) {
  if (!cart.connected) {
    return "Not connected. Start the bridge with: node src/bridge/server.js";
  }
  const stamp = cart.capturedAt === null ? "just now" : new Date(cart.capturedAt).toLocaleTimeString();
  const base = `Walmart cart synced at ${stamp} - ${cart.totals.items} item(s), ${cart.totals.units} unit(s).`;
  return pendingCount === 0 ? base : `${base} ${pendingCount} change(s) queued.`;
}

export function liveCartNeedsWork(cart) {
  if (!cart.connected) {
    return false;
  }
  const withoutPrices = cart.items.some((item) => item.price === null);
  return cart.items.length === 0 || withoutPrices;
}

export function planWalmartCartActions(localList, cart, options = {}) {
  const { replaceCart = false } = options;
  const actions = [];
  if (replaceCart && cart.items.length > 0) {
    actions.push({ id: "clear-cart", type: "clear-cart" });
  }
  for (const item of localList) {
    const itemId = item.walmartItemId ?? item.id;
    const live = cart.items.find((candidate) => candidate.itemId === itemId);
    const quantity = normalizeQuantity(item.quantity, 1);
    if (!live) {
      actions.push({ id: `add-product:${itemId}`, type: "add-product", itemId, quantity, name: item.name });
      continue;
    }
    if (live.quantity !== quantity) {
      actions.push({ id: `set-quantity:${itemId}`, type: "set-quantity", itemId, quantity, name: item.name });
    }
  }
  const localIds = new Set(localList.map((item) => item.walmartItemId ?? item.id));
  for (const item of cart.items) {
    if (!localIds.has(item.itemId)) {
      actions.push({ id: `remove-item:${item.itemId}`, type: "remove-item", itemId: item.itemId, name: item.name });
    }
  }
  return actions;
}

export function renderLiveCartPanel(mount, options) {
  if (!mount) {
    return;
  }
  const { cart, pendingCount = 0, onAction } = options;
  const empty = cart.items.length === 0;
  const emptyText = cart.connected
    ? "Your Walmart cart is empty."
    : "Not connected. Start the bridge and install the extension to read your Walmart cart.";
  mount.innerHTML = `
    <section class="live-cart" aria-labelledby="live-cart-title">
      <h2 class="live-cart__title" id="live-cart-title">Live Walmart cart</h2>
      <p class="live-cart__description">Read from your signed-in Walmart session by the browser extension. Changes apply to walmart.com in realtime.</p>
      <p class="live-cart__status" data-live-cart-status role="status">${liveCartStatusText(cart, pendingCount)}</p>
      <ul class="live-cart__stats">
        <li class="live-cart__stat">
          <span class="live-cart__stat-value" data-live-cart-units>${cart.totals.units}</span>
          <span class="live-cart__stat-label">Units on Walmart</span>
        </li>
        <li class="live-cart__stat">
          <span class="live-cart__stat-value" data-live-cart-subtotal>${formatUsd(cart.totals.subtotal)}</span>
          <span class="live-cart__stat-label">Walmart subtotal</span>
        </li>
      </ul>
      <ul class="live-cart__items" data-live-cart-items></ul>
      <p class="live-cart__empty" ${empty ? "" : "hidden"}>${emptyText}</p>
      <div class="live-cart__actions">
        <button class="live-cart__button" type="button" data-live-cart-sync ${cart.connected ? "" : "disabled"}>Push my list to cart</button>
        <button class="live-cart__button live-cart__button--ghost" type="button" data-live-cart-refresh>Refresh</button>
        <button class="live-cart__button" type="button" data-live-cart-checkout ${cart.connected ? "" : "disabled"}>Checkout with my list</button>
      </div>
    </section>`;

  const items = mount.querySelector("[data-live-cart-items]");
  for (const item of cart.items) {
    items.append(buildLiveCartRow(item, onAction));
  }
  mount.querySelector("[data-live-cart-sync]").addEventListener("click", () => onAction({ type: "sync-list" }));
  mount.querySelector("[data-live-cart-refresh]").addEventListener("click", () => onAction({ type: "refresh" }));
  mount.querySelector("[data-live-cart-checkout]").addEventListener("click", () => onAction({ type: "checkout" }));
}

function buildLiveCartRow(item, onAction) {
  const listItem = document.createElement("li");
  listItem.className = "live-cart__row";
  listItem.dataset.itemId = item.itemId;

  const image = document.createElement("img");
  image.className = "live-cart__image";
  image.src = item.imageUrl === null ? "" : item.imageUrl;
  image.alt = item.name;
  image.width = 64;
  image.height = 64;
  image.loading = "lazy";
  if (item.imageUrl === null) {
    image.setAttribute("hidden", "");
  }

  const details = document.createElement("div");
  details.className = "live-cart__details";

  const name = document.createElement("p");
  name.className = "live-cart__name";
  name.textContent = item.name;

  const meta = document.createElement("p");
  meta.className = "live-cart__meta";
  meta.textContent = item.price === null ? "Price unavailable" : `${formatUsd(item.price)} each`;

  const quantity = document.createElement("div");
  quantity.className = "live-cart__quantity";

  const decrease = buildLiveCartButton("−", `Decrease ${item.name} on Walmart`, () =>
    onAction({ type: "set-quantity", itemId: item.itemId, quantity: Math.max(1, item.quantity - 1), name: item.name }),
  );
  decrease.dataset.liveCartDecrease = item.itemId;

  const amount = document.createElement("span");
  amount.className = "live-cart__quantity-value";
  amount.textContent = `Qty ${item.quantity}`;

  const increase = buildLiveCartButton("+", `Increase ${item.name} on Walmart`, () =>
    onAction({ type: "set-quantity", itemId: item.itemId, quantity: item.quantity + 1, name: item.name }),
  );
  increase.dataset.liveCartIncrease = item.itemId;

  quantity.append(decrease, amount, increase);
  details.append(name, meta, quantity);

  const remove = document.createElement("button");
  remove.type = "button";
  remove.className = "live-cart__remove";
  remove.textContent = "Remove";
  remove.dataset.liveCartRemove = item.itemId;
  remove.addEventListener("click", () => onAction({ type: "remove-item", itemId: item.itemId, name: item.name }));

  listItem.append(image, details, remove);
  return listItem;
}

function buildLiveCartButton(label, ariaLabel, onClick) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "live-cart__step";
  button.textContent = label;
  button.setAttribute("aria-label", ariaLabel);
  button.addEventListener("click", onClick);
  return button;
}

