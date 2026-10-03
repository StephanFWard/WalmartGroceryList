import test from "node:test";
import assert from "node:assert/strict";
import {
  addGroceryItem,
  countGroceryItems,
  createGroceryList,
  estimateGrocerySubtotal,
  formatUsd,
  normalizeQuantity,
  removeGroceryItem,
  searchGroceryCatalog,
  totalGroceryQuantity,
  updateGroceryQuantity,
} from "./GroceryList.js";

const CATALOG = [
  { id: "whole-milk", name: "Whole Milk", keywords: "dairy gallon" },
  { id: "loaf-of-bread", name: "Loaf of bread", keywords: "bakery" },
];

test("grocery list starts empty", () => {
  assert.equal(countGroceryItems(createGroceryList()), 0);
});

test("added items always use quantity 1", () => {
  const list = createGroceryList();
  const result = addGroceryItem(list, { id: "milk-1gal", name: "Milk", quantity: 12 });
  assert.equal(result.added, true);
  assert.equal(list[0].quantity, 1);
});

test("duplicate ids are rejected case-insensitively", () => {
  const list = createGroceryList();
  addGroceryItem(list, { id: "Eggs-12ct", name: "Eggs" });
  const second = addGroceryItem(list, { id: "eggs-12CT", name: "Eggs" });
  assert.equal(second.added, false);
  assert.equal(second.reason, "duplicate");
  assert.equal(countGroceryItems(list), 1);
});

test("missing id or name is rejected", () => {
  const list = createGroceryList();
  assert.equal(addGroceryItem(list, { id: "", name: "Bread" }).added, false);
  assert.equal(addGroceryItem(list, { id: "bread", name: "" }).added, false);
  assert.equal(countGroceryItems(list), 0);
});

test("remove works and reports missing items", () => {
  const list = createGroceryList();
  addGroceryItem(list, { id: "apples", name: "Apples" });
  assert.equal(removeGroceryItem(list, "APPLES").removed, true);
  assert.equal(removeGroceryItem(list, "apples").removed, false);
});

test("catalog search matches name, id, and keywords", () => {
  assert.equal(searchGroceryCatalog(CATALOG, "milk").length, 1);
  assert.equal(searchGroceryCatalog(CATALOG, "LOAF").length, 1);
  assert.equal(searchGroceryCatalog(CATALOG, "dairy").length, 1);
  assert.equal(searchGroceryCatalog(CATALOG, "").length, 2);
  assert.equal(searchGroceryCatalog(CATALOG, "hamburger").length, 0);
});

test("added images and product links are preserved", () => {
  const list = createGroceryList();
  addGroceryItem(list, {
    id: "whole-milk",
    name: "Whole Milk",
    imageUrl: "https://example.test/milk.jpg",
    productUrl: "https://example.test/milk",
  });
  assert.equal(list[0].imageUrl, "https://example.test/milk.jpg");
  assert.equal(list[0].productUrl, "https://example.test/milk");
});

test("quantity updates are tracked within 1 to 99", () => {
  const list = createGroceryList();
  addGroceryItem(list, { id: "whole-milk", name: "Whole Milk" });
  assert.equal(updateGroceryQuantity(list, "whole-milk", 3).updated, true);
  assert.equal(list[0].quantity, 3);
  assert.equal(updateGroceryQuantity(list, "missing", 2).updated, false);
  assert.equal(updateGroceryQuantity(list, "whole-milk", 0).updated, false);
  assert.equal(list[0].quantity, 3);
});

test("quantity normalization and totals work", () => {
  assert.equal(normalizeQuantity("4"), 4);
  assert.equal(normalizeQuantity(0, 2), 2);
  assert.equal(normalizeQuantity(100, 2), 2);
  const list = createGroceryList();
  addGroceryItem(list, { id: "whole-milk", name: "Whole Milk" });
  addGroceryItem(list, { id: "loaf-of-bread", name: "Loaf of bread" });
  updateGroceryQuantity(list, "whole-milk", 2);
  updateGroceryQuantity(list, "loaf-of-bread", 3);
  assert.equal(totalGroceryQuantity(list), 5);
});
test("added items keep the mirrored Walmart product details", () => {
  const list = createGroceryList();
  addGroceryItem(list, {
    id: "hamburger-logs-2lbs",
    name: "Hamburger logs, 2 lbs",
    imageUrl: "https://i5.walmartimages.com/seo/beef.jpeg",
    productUrl: "https://www.walmart.com/ip/73-Lean-27-Fat-Ground-Beef-1-lb-Roll-Fresh-All-Natural/15136790",
    productName: "73% Lean / 27% Fat Ground Beef, 1 lb Roll, Fresh, All Natural*",
    size: "2 × 1 lb roll (2 lbs)",
    unitPrice: "$6.44/lb",
    category: "Meat & seafood",
    price: "6.44",
    walmartItemId: "15136790",
  });
  assert.equal(list[0].size, "2 × 1 lb roll (2 lbs)");
  assert.equal(list[0].category, "Meat & seafood");
  assert.equal(list[0].price, 6.44);
  assert.equal(list[0].walmartItemId, "15136790");
  assert.equal(list[0].productName.startsWith("73% Lean"), true);
});

test("missing optional product details become null", () => {
  const list = createGroceryList();
  addGroceryItem(list, { id: "eggs-12ct", name: "Eggs" });
  assert.equal(list[0].productName, null);
  assert.equal(list[0].size, null);
  assert.equal(list[0].unitPrice, null);
  assert.equal(list[0].category, null);
  assert.equal(list[0].walmartItemId, null);
  assert.equal(list[0].price, null);
});

test("subtotal estimate and currency formatting track quantities", () => {
  assert.equal(estimateGrocerySubtotal([]), 0);
  assert.equal(formatUsd(0), "$0.00");
  assert.equal(formatUsd("6.4"), "$6.40");
  assert.equal(formatUsd(-2), "$0.00");

  const list = createGroceryList();
  addGroceryItem(list, { id: "whole-milk", name: "Whole Milk", price: 3.68 });
  addGroceryItem(list, { id: "eggs-12ct", name: "Eggs" });
  updateGroceryQuantity(list, "whole-milk", 2);
  assert.equal(estimateGrocerySubtotal(list), 7.36);
  assert.equal(formatUsd(estimateGrocerySubtotal(list)), "$7.36");
});

