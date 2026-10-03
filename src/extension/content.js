/* Sync loop that runs inside your signed-in Walmart tab.
   It pushes a cart snapshot to the local bridge and applies queued actions. */
(() => {
  const BRIDGE = "http://127.0.0.1:3000/api/walmart";
  const LOOP_MS = 3000;
  const WAIT_MS = 1500;
  let busy = false;

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async function callJson(path, options) {
    const response = await fetch(`${BRIDGE}${path}`, {
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      ...options,
    });
    if (!response.ok) {
      throw new Error(`${path} responded ${response.status}`);
    }
    return response.json();
  }

  function adapter() {
    return window.__wglAdapter ?? null;
  }

  function setQuantitySelect(quantity) {
    const select = document.querySelector(
      '[data-automation-id*="quantity"] select, select[aria-label*="uantity"]',
    );
    if (select === null) {
      return;
    }
    select.value = String(quantity);
    select.dispatchEvent(new Event("change", { bubbles: true }));
  }

  async function capture() {
    const api = adapter();
    if (api === null) {
      return null;
    }
    const page = api.describe();
    if (!page.isCart) {
      return null;
    }
    const read = api.readItems();
    return {
      capturedAt: new Date().toISOString(),
      source: "walmart-cart",
      page: page.path,
      signedIn: page.signedIn,
      notes: read.notes,
      items: read.items,
    };
  }

  async function pushSnapshot() {
    const snapshot = await capture();
    if (snapshot === null) {
      return;
    }
    await callJson("/state", { method: "POST", body: JSON.stringify({ snapshot }) });
  }

  async function runAction(action) {
    const api = adapter();
    if (api === null) {
      return { ok: false, result: "adapter missing" };
    }
    const page = api.describe();

    if (action.type === "refresh") {
      return { ok: true, result: "refresh captured" };
    }

    if (action.type === "checkout") {
      location.assign("https://www.walmart.com/checkout");
      return { ok: true, result: "navigating to checkout" };
    }

    if (action.type === "add-product") {
      if (page.isProduct && api.currentItemId() === action.itemId) {
        setQuantitySelect(action.quantity ?? 1);
        const clicked = api.addToCart(1);
        return { ok: clicked, result: clicked ? `added ${action.itemId}` : "add-to-cart button not found" };
      }
      const marker = `wgl-navigated-${action.itemId}`;
      if (sessionStorage.getItem(marker) === null) {
        sessionStorage.setItem(marker, "1");
        location.assign(`https://www.walmart.com/ip/${action.itemId}`);
        return { ok: false, result: `navigating to product ${action.itemId}` };
      }
      sessionStorage.removeItem(marker);
      return { ok: false, result: "product page never offered an add-to-cart button" };
    }

    if (!page.isCart) {
      return { ok: false, result: "not on the cart page; open walmart.com/cart in this tab" };
    }

    if (action.type === "clear-cart") {
      return { ok: api.emptyCart(), result: "clear-cart attempted" };
    }
    if (action.type === "remove-item") {
      const removed = api.findRemoveControl(action.itemId);
      return { ok: removed, result: removed ? `removed ${action.itemId}` : `remove control not found for ${action.itemId}` };
    }
    if (action.type === "set-quantity") {
      const changed = api.setQuantity(action.itemId, action.quantity);
      return { ok: changed, result: changed ? `quantity ${action.itemId}=${action.quantity}` : `quantity control not found for ${action.itemId}` };
    }
    return { ok: false, result: `unsupported action ${action.type}` };
  }

  async function drainActions() {
    const body = await callJson("/actions");
    const actions = Array.isArray(body.actions) ? body.actions : [];
    for (const action of actions) {
      const outcome = await runAction(action);
      if (!outcome.ok && outcome.result.startsWith("navigating")) {
        return actions.length;
      }
      await sleep(WAIT_MS);
      await callJson("/actions/ack", {
        method: "POST",
        body: JSON.stringify({ id: action.id, ok: outcome.ok, result: outcome.result }),
      });
    }
    return actions.length;
  }

  async function loop() {
    if (busy) {
      return;
    }
    busy = true;
    try {
      await pushSnapshot();
      await drainActions();
    } catch {
      // The bridge may not be running yet; the next tick retries.
    } finally {
      busy = false;
    }
  }

  loop();
  setInterval(loop, LOOP_MS);
  window.addEventListener("pageshow", () => {
    loop();
  });
})();
