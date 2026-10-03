export const WALMART_LIST_ID = "73215e44-ec62-42ab-ae9e-3a997e756090";
export const WALMART_LIST_URL = `https://www.walmart.com/lists/WL/${WALMART_LIST_ID}`;
export const WALMART_REORDER_URL = "https://www.walmart.com/my-items";
export const WALMART_CART_URL = "https://www.walmart.com/cart";
export const WALMART_CHECKOUT_URL = "https://www.walmart.com/checkout";

export function walmartCheckoutUrl(list) {
  const summary = list
    .map((item) => `${normalizeCheckoutText(item.name)} x${normalizeCheckoutQuantity(item.quantity)}`)
    .join(", ");
  if (summary === "") {
    return WALMART_CHECKOUT_URL;
  }
  return `${WALMART_CHECKOUT_URL}?local-list=${encodeURIComponent(summary)}`;
}

function normalizeCheckoutQuantity(quantity) {
  const parsed = Number.parseInt(String(quantity ?? "1"), 10);
  if (Number.isNaN(parsed) || parsed < 1 || parsed > 99) {
    return 1;
  }
  return parsed;
}

function normalizeCheckoutText(value) {
  return String(value ?? "").trim().slice(0, 80);
}

export function walmartSearchUrl(query) {
  return `https://www.walmart.com/search?q=${encodeURIComponent(query)}`;
}

export function toWalmartSyncPayload(list) {
  return {
    listId: WALMART_LIST_ID,
    listUrl: WALMART_LIST_URL,
    checkoutUrl: walmartCheckoutUrl(list),
    generatedAt: new Date().toISOString(),
    itemCount: list.length,
    totalUnits: list.reduce((total, item) => total + normalizeCheckoutQuantity(item.quantity), 0),
    items: list.map((item) => ({
      id: item.id,
      name: item.name,
      quantity: normalizeCheckoutQuantity(item.quantity),
      imageUrl: item.imageUrl ?? null,
      productUrl: item.productUrl ?? null,
      productName: item.productName ?? null,
      size: item.size ?? null,
      unitPrice: item.unitPrice ?? null,
      category: item.category ?? null,
      walmartItemId: item.walmartItemId ?? null,
      price: typeof item.price === "number" ? item.price : null,
    })),
  };
}

export function downloadWalmartSyncPayload(list) {
  const payload = toWalmartSyncPayload(list);
  const blob = new Blob([`${JSON.stringify(payload, null, 2)}\n`], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `walmart-list-${WALMART_LIST_ID}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  return payload;
}
