# WalmartGroceryList

Local localhost dashboard for searchable Walmart-style grocery items with images, quantities, sync, and checkout.

## Open the localhost dashboard

Use either localhost entry point:

```powershell
npx serve "c:\\Users\\steph\\OneDrive\\Documents\\GitHub\\WalmartGroceryList\\src\\pages"
```

Then open:

- `http://localhost:3000/dashboard.html`
- `http://localhost:3000/grocery.html`

Or open `src/pages/dashboard.html` directly in a browser.

The intuitive dashboard composes:

- `src/components/Dashboard/`
- `src/components/ReorderPanel/`
- `src/components/GroceryList/`
- `src/components/GroceryItem/`
- `src/components/WalmartSync/`

Dashboard flow:

1. Search items.
2. Review list and quantities.
3. Sync and checkout.

## Search always shows images

- Search previous-history items by name, ID, or keyword.
- Every matching search result displays its Walmart product image.
- Examples:
  - `milk` shows Whole Milk with its image.
  - `bread` shows Loaf of bread with its image.
  - `beef` shows Hamburger logs, 2 lbs with its image.
- Selecting an item adds one copy unless it is already present.
- Grocery-list rows also display the selected Walmart image.

## Grocery behavior

- Starts with:
  - Whole Milk
  - Loaf of bread
  - Hamburger logs, 2 lbs
- New items start at quantity `1`.
- Quantities can be updated locally from `1` to `99`.
- Duplicate item IDs are ignored case-insensitively.
- Local list and pending Walmart sync queue persist in `localStorage`.
- Item and total quantities are shown on the localhost interface.
- Dashboard header also summarizes item and unit totals.

## Walmart checkout

- The grocery list includes a **Checkout at Walmart** button.
- The button navigates to `https://www.walmart.com/checkout`.
- The current item names and updated quantities are encoded in the checkout URL.
- The sync payload also exports checkout, list, image, and product URLs.
- Walmart still requires the signed-in `stephan.ward5@icloud.com` session to complete checkout.
- Related Walmart entry points:
  - `https://www.walmart.com/lists/WL/73215e44-ec62-42ab-ae9e-3a997e756090`
  - `https://www.walmart.com/my-items`
  - `https://www.walmart.com/cart`

## Tests

Run all component tests with Node.js:

```powershell
node --test src/components/Dashboard/Dashboard.test.js src/components/GroceryList/GroceryList.test.js src/components/GroceryItem/GroceryItem.test.js src/components/ReorderPanel/ReorderPanel.test.js src/components/WalmartSync/WalmartSync.test.js
```

