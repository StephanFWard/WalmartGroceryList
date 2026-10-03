import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("grocery item markup uses labels, buttons, and quantity", () => {
  const html = readFileSync(new URL("./GroceryItem.html", import.meta.url), "utf8");
  assert.match(html, /grocery-item__image/);
  assert.match(html, /alt="/);
  assert.match(html, /grocery-item__name/);
  assert.match(html, /grocery-item__quantity-input/);
  assert.match(html, /value="1"/);
  assert.match(html, /Quantity/);
  assert.match(html, /type="button"/);
  assert.match(html, /Remove/);
});

test("grocery item css uses tokens and BEM without important", () => {
  const css = readFileSync(new URL("./GroceryItem.css", import.meta.url), "utf8");
  assert.match(css, /var\(--color-/);
  assert.match(css, /\.grocery-item__/);
  assert.doesNotMatch(css, /!important/);
  assert.doesNotMatch(css, /#[0-9a-fA-F]{3,6}/);
});
