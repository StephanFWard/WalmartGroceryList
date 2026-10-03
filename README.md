# WalmartGroceryList

Local grocery-list interface backed by searchable Walmart-style history items.

## Open the app

Open `src/pages/grocery.html` in a browser.

The page composes:

- `src/components/ReorderPanel/`
- `src/components/WalmartSync/`
- `src/components/GroceryList/`
- `src/components/GroceryItem/`

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

## Search and select

- Search the previous-history catalog by name, ID, or keyword.
- Each result shows a Walmart product image and a select button.
- Selecting an item adds one copy unless it is already present.

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
node --test src/components/GroceryList/GroceryList.test.js src/components/GroceryItem/GroceryItem.test.js src/components/ReorderPanel/ReorderPanel.test.js src/components/WalmartSync/WalmartSync.test.js
```

