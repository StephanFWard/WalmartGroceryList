import { createGroceryListController, renderShellNav } from "./list-view.js";

const root = document.body;

renderShellNav(root);

createGroceryListController({
  root,
  mounts: {
    live: document.querySelector("[data-page-live]"),
    mirror: document.querySelector("[data-page-mirror]"),
    search: document.querySelector("[data-page-search]"),
    list: document.querySelector("[data-page-list]"),
    sync: document.querySelector("[data-page-sync]"),
  },
  template: document.querySelector("#grocery-item-template"),
}).render();
