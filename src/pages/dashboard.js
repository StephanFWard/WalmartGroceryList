import { renderShellNav, createGroceryListController } from "./list-view.js";

const root = document.body;

renderShellNav(root);

createGroceryListController({
  root,
  mounts: {
    dashboard: document.querySelector("[data-page-dashboard]"),
  },
  template: document.querySelector("#grocery-item-template"),
}).render();
