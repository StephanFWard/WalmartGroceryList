/* Reads the signed-in Walmart cart from the page itself.
   Walmart changes its markup often, so every lookup is best-effort with several
   candidate selectors plus a diagnostics trail the dashboard can display. */
(() => {
  const MONEY = /\$([0-9]+(?:[.,][0-9]{2})?)/;
  const PRODUCT_HREF = /\/ip\/(?:[^/]+\/)?(\d{5,})/;

  function text(element) {
    return (element?.textContent ?? "").replace(/\s+/g, " ").trim();
  }

  function firstMatchIn(root, selectors) {
    for (const selector of selectors) {
      const found = root.querySelector(selector);
      if (found) {
        return found;
      }
    }
    return null;
  }

  function isSignedIn() {
    const account = firstMatchIn(document, [
      'a[href*="/account"] [data-automation-id]',
      'a[href="/my-items"]',
      '[data-automation-id="header-account"]',
    ]);
    const signIn = firstMatchIn(document, [
      'a[href*="identity.walmart.com/account/login"]',
      '[data-automation-id*="sign-in"]',
    ]);
    if (signIn !== null && account === null) {
      return false;
    }
    return account !== null;
  }

  function productIdFromHref(href) {
    const match = PRODUCT_HREF.exec(String(href ?? ""));
    return match === null ? null : match[1];
  }

  function productIdFromText(value) {
    const match = /\b(\d{9,12})\b/.exec(String(value ?? ""));
    return match === null ? null : match[1];
  }

  function cleanImageUrl(src) {
    if (!src) {
      return null;
    }
    return new URL(src, location.href).href.split("?")[0];
  }

  function moneyFromText(value) {
    const match = MONEY.exec(String(value ?? ""));
    return match === null ? null : Number.parseFloat(match[0].replace(/[$,]/g, "").replace(",", "."));
  }

  function quantityFromRow(row) {
    const control = firstMatchIn(row, [
      'select[aria-label*="uantity"]',
      'input[aria-label*="uantity"]',
      '[data-automation-id*="quantity"] input',
      '[data-automation-id*="quantity"] select',
    ]);
    if (control !== null) {
      const value = Number.parseInt(String(control.value ?? "1"), 10);
      if (!Number.isNaN(value) && value > 0) {
        return value;
      }
    }
    const explicit = /\bqty\.?\s*:?\s*(\d{1,2})\b/i.exec(text(row));
    if (explicit !== null) {
      const value = Number.parseInt(explicit[1], 10);
      if (!Number.isNaN(value) && value > 0) {
        return value;
      }
    }
    return 1;
  }

  function rowCandidates() {
    const rows = new Map();
    for (const anchor of document.querySelectorAll('a[href*="/ip/"]')) {
      const itemId = productIdFromHref(anchor.getAttribute("href"));
      if (itemId === null || rows.has(itemId)) {
        continue;
      }
      const parent = anchor.closest("li, article, [data-automation-id*='item'], div") ?? anchor.parentElement;
      rows.set(itemId, {
        itemId,
        anchor,
        container: parent,
        image: anchor.querySelector("img") ?? firstMatchIn(parent, ["img"]),
      });
    }
    return [...rows.values()];
  }

  function describeRow(row) {
    const container = row.container ?? row.anchor;
    const image = row.image ?? null;
    const name =
      (image === null ? "" : text(image.getAttribute("alt"))) ||
      row.anchor.getAttribute("aria-label") ||
      text(row.anchor);
    return {
      itemId: row.itemId,
      name: name === "" ? `Walmart item ${row.itemId}` : name,
      quantity: quantityFromRow(container),
      price: moneyFromText(text(container)),
      currency: "USD",
      imageUrl: image === null ? null : cleanImageUrl(image.currentSrc || image.getAttribute("src")),
      productUrl: new URL(row.anchor.getAttribute("href"), location.href).href.split("?")[0],
    };
  }

  window.__wglAdapter = {
    describe() {
      return {
        url: location.href,
        path: location.pathname,
        signedIn: isSignedIn(),
        isCart: location.pathname.startsWith("/cart"),
        isList: location.pathname.startsWith("/lists/") || location.pathname.startsWith("/list/"),
        isProduct: /^\/ip\//.test(location.pathname),
        isCheckout: location.pathname.startsWith("/checkout"),
      };
    },

    readItems() {
      const notes = [];
      const rows = rowCandidates();
      if (rows.length === 0) {
        notes.push("No /ip/ product links found on this page.");
        return { items: [], notes };
      }
      const items = [];
      for (const row of rows) {
        const described = describeRow(row);
        if (described.price === null) {
          notes.push(`No price parsed for item ${described.itemId}`);
        }
        items.push(described);
      }
      return { items, notes };
    },

    findRemoveControl(itemId) {
      const row = rowCandidates().find((candidate) => candidate.itemId === itemId);
      if (row === undefined) {
        return false;
      }
      const container = row.container ?? row.anchor;
      const control =
        firstMatchIn(container, [
          '[data-automation-id*="remove"]',
          'button[aria-label*="Remove"]',
          'a[aria-label*="Remove"]',
          'button[aria-label*="Delete"]',
        ]) ?? findTextButton(container, ["Remove", "Delete"]);
      if (control === null) {
        return false;
      }
      control.click();
      return true;
    },

    setQuantity(itemId, quantity) {
      const row = rowCandidates().find((candidate) => candidate.itemId === itemId);
      if (row === undefined) {
        return false;
      }
      const container = row.container ?? row.anchor;
      const control = firstMatchIn(container, [
        'select[aria-label*="uantity"]',
        'input[aria-label*="uantity"]',
        '[data-automation-id*="quantity"] input',
        '[data-automation-id*="quantity"] select',
      ]);
      if (control !== null) {
        setControlValue(control, String(quantity));
        return true;
      }
      const stepper = firstMatchIn(container, [
        '[data-automation-id*="increase"]',
        'button[aria-label*="Increase"]',
        'button[aria-label*="Add one"]',
      ]);
      if (stepper === null) {
        return false;
      }
      let current = quantityFromRow(container);
      let guard = 0;
      while (current < quantity && guard < 20) {
        stepper.click();
        current += 1;
        guard += 1;
      }
      return current === quantity;
    },

    addToCart(times) {
      const button =
        firstMatchIn(document, [
          '[data-automation-id="add-to-cart-button"]',
          'button[aria-label*="Add to cart"]',
          'button[data-testid*="add-to-cart"]',
        ]) ?? findTextButton(document.body, ["Add to cart"]);
      if (button === null) {
        return false;
      }
      for (let attempt = 0; attempt < times; attempt += 1) {
        button.click();
      }
      return true;
    },

    emptyCart() {
      const control =
        firstMatchIn(document, [
          '[data-automation-id*="remove-all"]',
          'button[aria-label*="Remove all"]',
          'button[aria-label*="Empty cart"]',
        ]) ?? findTextButton(document.body, ["Remove all", "Empty cart"]);
      if (control !== null) {
        control.click();
        return true;
      }
      const ids = rowCandidates().map((row) => row.itemId);
      for (const itemId of ids) {
        this.findRemoveControl(itemId);
      }
      return ids.length > 0;
    },

    currentItemId() {
      return productIdFromHref(location.pathname) ?? productIdFromText(location.pathname);
    },
  };

  function findTextButton(root, labels) {
    const buttons = [...root.querySelectorAll('button, a[role="button"], a')];
    for (const label of labels) {
      const match = buttons.find((button) => text(button).toLowerCase() === label.toLowerCase());
      if (match !== undefined) {
        return match;
      }
    }
    return null;
  }

  function setControlValue(control, value) {
    if (control.tagName === "SELECT") {
      control.value = value;
    } else {
      control.value = value;
    }
    control.dispatchEvent(new Event("input", { bubbles: true }));
    control.dispatchEvent(new Event("change", { bubbles: true }));
    control.dispatchEvent(new Event("blur", { bubbles: true }));
  }
})();
