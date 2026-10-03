export function normalizeGroceryId(value) {
  return String(value ?? "").trim().toLowerCase();
}

export function normalizeGroceryText(value) {
  return String(value ?? "").trim().toLowerCase();
}

export function createGroceryList() {
  return [];
}

export function findGroceryItem(list, id) {
  const normalized = normalizeGroceryId(id);
  return list.find((item) => normalizeGroceryId(item.id) === normalized);
}

export function searchGroceryCatalog(catalog, query) {
  const normalized = normalizeGroceryText(query);
  if (normalized === "") {
    return [...catalog];
  }
  return catalog.filter((item) => {
    const haystack = `${item.id ?? ""} ${item.name ?? ""} ${item.keywords ?? ""}`;
    return normalizeGroceryText(haystack).includes(normalized);
  });
}

export function normalizeQuantity(value, fallback = 1) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  if (Number.isNaN(parsed) || parsed < 1 || parsed > 99) {
    return fallback;
  }
  return parsed;
}

export function addGroceryItem(list, candidate) {
  const id = normalizeGroceryId(candidate?.id);
  const name = String(candidate?.name ?? "").trim();
  const imageUrl = String(candidate?.imageUrl ?? "").trim();
  const productUrl = String(candidate?.productUrl ?? "").trim();
  if (id === "" || name === "") {
    return { added: false, reason: "missing-id-or-name", list };
  }
  if (findGroceryItem(list, id) !== undefined) {
    return { added: false, reason: "duplicate", list };
  }
  list.push({
    id,
    name,
    quantity: 1,
    source: candidate?.source ?? "history",
    imageUrl: imageUrl === "" ? null : imageUrl,
    productUrl: productUrl === "" ? null : productUrl,
  });
  return { added: true, list };
}


export function updateGroceryQuantity(list, id, quantity) {
  const item = findGroceryItem(list, id);
  if (!item) {
    return { updated: false, reason: "not-found", list };
  }
  const nextQuantity = normalizeQuantity(quantity, item.quantity);
  if (nextQuantity === item.quantity && normalizeQuantity(quantity, -1) !== item.quantity) {
    return { updated: false, reason: "unchanged", list };
  }
  item.quantity = nextQuantity;
  return { updated: true, list };
}

export function totalGroceryQuantity(list) {
  return list.reduce((total, item) => total + normalizeQuantity(item.quantity, 1), 0);
}

export function removeGroceryItem(list, id) {
  const index = list.findIndex((item) => normalizeGroceryId(item.id) === normalizeGroceryId(id));
  if (index === -1) {
    return { removed: false, list };
  }
  list.splice(index, 1);
  return { removed: true, list };
}

export function countGroceryItems(list) {
  return list.length;
}
