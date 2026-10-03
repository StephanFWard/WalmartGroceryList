import {
  addGroceryItem,
  findGroceryItem,
  updateGroceryQuantity,
} from "../GroceryList/GroceryList.js";
import { WALMART_LIST_ID, WALMART_LIST_URL } from "../WalmartSync/WalmartSync.js";

export const WALMART_IMAGE_PARAMS = "?odnHeight=576&odnWidth=576&odnBg=FFFFFF";

export const WALMART_LIST_MIRROR = {
  id: WALMART_LIST_ID,
  url: WALMART_LIST_URL,
  capturedAt: "2026-10-03",
  source: "Official Walmart item pages (i5.walmartimages.com images and walmart.com/ip links)",
  note: "Walmart list WL/73215e44 is private: walmart.com redirects to identity.walmart.com sign-in, so this mirror stores the list contents locally.",
};

export const WALMART_LIST_ITEMS = [
  {
    id: "whole-milk",
    label: "Whole Milk",
    name: "Great Value Whole Vitamin D Milk, Gallon, 128 fl oz",
    size: "1 gal · 128 fl oz",
    category: "Dairy",
    keywords: "milk dairy whole gallon vitamin d",
    price: 3.68,
    unitPrice: "2.9 ¢/fl oz",
    itemId: "10450114",
    itemUrl:
      "https://www.walmart.com/ip/Great-Value-Whole-Vitamin-D-Milk-Gallon-Plastic-Jug-128-Fl-Oz/10450114",
    imageUrl:
      `https://i5.walmartimages.com/seo/Great-Value-Whole-Vitamin-D-Milk-Gallon-Plastic-Jug-128-Fl-Oz_6a7b09b4-f51d-4bea-a01c-85767f1b481a.86876244397d83ce6cdedb030abe6e4a.jpeg${WALMART_IMAGE_PARAMS}`,
    listQuantity: 1,
  },
  {
    id: "loaf-of-bread",
    label: "Loaf of bread",
    name: "Great Value White Round Top Bread Loaf, 20 oz, Pre-Sliced",
    size: "20 oz loaf",
    category: "Bread & bakery",
    keywords: "bread loaf bakery white round top sliced",
    price: 1.52,
    unitPrice: "7.6 ¢/oz",
    itemId: "10315355",
    itemUrl:
      "https://www.walmart.com/ip/Great-Value-White-Round-Top-Bread-Loaf-20-oz/10315355",
    imageUrl:
      `https://i5.walmartimages.com/seo/Great-Value-White-Round-Top-Bread-Loaf-20-oz_2e2a0e48-fecf-4b00-9ce4-64486788a22e.76317f2bfb5207c437cb7ccd4115589d.jpeg${WALMART_IMAGE_PARAMS}`,
    listQuantity: 1,
  },
  {
    id: "hamburger-logs-2lbs",
    label: "Hamburger logs, 2 lbs",
    name: "73% Lean / 27% Fat Ground Beef, 1 lb Roll, Fresh, All Natural*",
    size: "2 × 1 lb roll (2 lbs)",
    category: "Meat & seafood",
    keywords: "beef hamburger ground roll two pounds lean",
    price: 6.44,
    unitPrice: "$6.44/lb",
    itemId: "15136790",
    itemUrl:
      "https://www.walmart.com/ip/73-Lean-27-Fat-Ground-Beef-1-lb-Roll-Fresh-All-Natural/15136790",
    imageUrl:
      `https://i5.walmartimages.com/seo/73-Lean-27-Fat-Ground-Beef-1-lb-Roll-Fresh-All-Natural_e6b4e251-2062-48c0-846a-b5904a0f3510.bb16d35cf49f75f7e5423f820b8377d1.jpeg${WALMART_IMAGE_PARAMS}`,
    listQuantity: 2,
  },
];

export function findListItem(items, id) {
  const normalized = String(id ?? "").trim().toLowerCase();
  return items.find((item) => String(item.id).trim().toLowerCase() === normalized);
}

export function walmartListImageUrls(items = WALMART_LIST_ITEMS) {
  return items.map((item) => item.imageUrl);
}

export function walmartListTotals(items = WALMART_LIST_ITEMS) {
  const units = items.reduce((total, item) => total + item.listQuantity, 0);
  const estimate = items.reduce((total, item) => total + item.price * item.listQuantity, 0);
  return {
    items: items.length,
    units,
    estimate: Math.round(estimate * 100) / 100,
  };
}

export function localListSyncReport(localList, items = WALMART_LIST_ITEMS) {
  const rows = items.map((item) => {
    const local = findGroceryItem(localList, item.id);
    const localQuantity = local ? local.quantity : 0;
    let status = "in-sync";
    if (!local) {
      status = "missing";
    } else if (local.quantity !== item.listQuantity) {
      status = "quantity-differs";
    }
    return {
      id: item.id,
      label: item.label,
      name: item.name,
      size: item.size,
      price: item.price,
      unitPrice: item.unitPrice,
      imageUrl: item.imageUrl,
      itemUrl: item.itemUrl,
      expectedQuantity: item.listQuantity,
      localQuantity,
      status,
    };
  });
  const extras = localList
    .filter((item) => !findListItem(items, item.id))
    .map((item) => ({ id: item.id, name: item.name, quantity: item.quantity }));
  return {
    rows,
    total: items.length,
    inSync: rows.filter((row) => row.status === "in-sync").length,
    missing: rows.filter((row) => row.status === "missing").length,
    differs: rows.filter((row) => row.status === "quantity-differs").length,
    extras,
  };
}

export function syncStatusText(report) {
  if (report.total === 0) {
    return "No Walmart list items to mirror.";
  }
  if (report.missing === 0 && report.differs === 0) {
    const extraText = report.extras.length === 0 ? "" : ` · ${report.extras.length} local extra item(s)`;
    return `${report.inSync} of ${report.total} Walmart list items in sync${extraText}.`;
  }
  const details = [];
  if (report.missing > 0) {
    details.push(`${report.missing} missing locally`);
  }
  if (report.differs > 0) {
    details.push(`${report.differs} with a different quantity`);
  }
  return `${report.inSync} of ${report.total} Walmart list items in sync · ${details.join(" · ")}.`;
}

export function applyWalmartList(list, items = WALMART_LIST_ITEMS) {
  let added = 0;
  let updated = 0;
  for (const item of items) {
    if (!findGroceryItem(list, item.id)) {
      addGroceryItem(list, {
        id: item.id,
        name: item.label,
        source: "walmart-list",
        imageUrl: item.imageUrl,
        productUrl: item.itemUrl,
        productName: item.name,
        size: item.size,
        unitPrice: item.unitPrice,
        category: item.category,
        price: item.price,
        walmartItemId: item.itemId,
      });
      added += 1;
    }
    if (updateGroceryQuantity(list, item.id, item.listQuantity).updated) {
      updated += 1;
    }
  }
  return { added, updated, total: items.length, list };
}

export function renderWalmartListSnapshot(report, container) {
  if (!container) {
    return;
  }
  container.innerHTML = "";
  for (const row of report.rows) {
    const listItem = document.createElement("li");
    listItem.className = `walmart-list__row walmart-list__row--${row.status}`;
    listItem.dataset.itemId = row.id;
    listItem.dataset.status = row.status;

    const image = document.createElement("img");
    image.className = "walmart-list__image";
    image.src = row.imageUrl;
    image.alt = row.name;
    image.width = 72;
    image.height = 72;
    image.loading = "lazy";

    const details = document.createElement("div");
    details.className = "walmart-list__details";

    const label = document.createElement("p");
    label.className = "walmart-list__label";
    label.textContent = row.label;

    const product = document.createElement("p");
    product.className = "walmart-list__product";
    product.textContent = row.name;
    product.title = row.name;

    const meta = document.createElement("p");
    meta.className = "walmart-list__meta";
    const size = document.createElement("span");
    size.className = "walmart-list__size";
    size.textContent = row.size;
    const price = document.createElement("span");
    price.className = "walmart-list__price";
    price.textContent = `$${row.price.toFixed(2)} · ${row.unitPrice}`;
    const status = document.createElement("span");
    status.className = "walmart-list__badge";
    status.textContent = statusLabel(row);
    meta.append(size, price, status);

    details.append(label, product, meta);

    const link = document.createElement("a");
    link.className = "walmart-list__link";
    link.href = row.itemUrl;
    link.textContent = "View item";

    listItem.append(image, details, link);
    container.append(listItem);
  }
}

function statusLabel(row) {
  if (row.status === "missing") {
    return "Not in your list yet";
  }
  if (row.status === "quantity-differs") {
    return `Qty ${row.localQuantity} → ${row.expectedQuantity} to match`;
  }
  return `In sync · qty ${row.expectedQuantity}`;
}
