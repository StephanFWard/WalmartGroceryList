import test from "node:test";
import assert from "node:assert/strict";
import {
  addGroceryItem,
  countGroceryItems,
  createGroceryList,
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
