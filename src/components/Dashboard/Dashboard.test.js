import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dashboardSummaryText } from "./Dashboard.js";

test("dashboard summary tracks items and quantity", () => {
  assert.equal(
    dashboardSummaryText([
      { id: "whole-milk", quantity: 2 },
      { id: "loaf-of-bread", quantity: 1 },
    ]),
    "2 items · 3 units",
  );
  assert.equal(dashboardSummaryText([]), "0 items · 0 units");
});

test("dashboard markup has search, list, and sync regions", () => {
  const html = readFileSync(new URL("./Dashboard.html", import.meta.url), "utf8");
  assert.match(html, /data-dashboard-search/);
  assert.match(html, /data-dashboard-list/);
  assert.match(html, /data-dashboard-sync/);
  assert.match(html, /data-dashboard-summary/);
});

test("dashboard css uses tokens and responsive grid", () => {
  const css = readFileSync(new URL("./Dashboard.css", import.meta.url), "utf8");
  assert.match(css, /var\(--color-/);
  assert.match(css, /\.grocery-dashboard__/);
  assert.match(css, /min-width: 64rem/);
  assert.doesNotMatch(css, /!important/);
});
