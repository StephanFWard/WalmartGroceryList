# WalmartGroceryList

A localhost dashboard for the Walmart grocery list `WL/73215e44-ec62-42ab-ae9e-3a997e756090`. Search the list's items with their official Walmart product images, track quantities, keep the local list in sync with the list mirror, and jump to Walmart checkout.

## Open the dashboard

```powershell
npx serve "c:\Users\steph\OneDrive\Documents\GitHub\WalmartGroceryList\src"
```

Then open:

- `http://localhost:3000/pages/dashboard.html` - the three-step dashboard
- `http://localhost:3000/pages/grocery.html` - the single-page list view

Serve `src` (not `src/pages`) because both pages import component CSS and ES modules from `src/`.

## What probing walmart.com showed

The list itself is private. Probing it on 2026-10-03 returned:

- `https://www.walmart.com/lists/WL/73215e44-ec62-42ab-ae9e-3a997e756090` renders "Sign in to see your saved lists" and redirects automation to `identity.walmart.com/account/login`.
- The public Walmart **item pages** are reachable, so their official data (the `og:image` from `i5.walmartimages.com`, the size, and the price) is what populates the local interface.
- Walmart serves checkout only for a signed-in session, so checkout links are handed off to your browser.

| List item | Walmart item id | Product | Size | Price |
| --- | --- | --- | --- | --- |
| Whole Milk | 10450114 | Great Value Whole Vitamin D Milk, Gallon | 1 gal - 128 fl oz | $3.68 (2.9 cents/fl oz) |
| Loaf of bread | 10315355 | Great Value White Round Top Bread Loaf, Pre-Sliced | 20 oz loaf | $1.52 (7.6 cents/oz) |
| Hamburger logs, 2 lbs | 15136790 | 73% Lean / 27% Fat Ground Beef, 1 lb Roll (x2) | 2 x 1 lb roll | $6.44/lb |

Because the list cannot be read without your session, `src/components/WalmartList/` holds that local copy. Update `WALMART_LIST_ITEMS` there - or press **Match Walmart list** - whenever the real list changes. Captured prices are point-in-time values, not live quotes.

## Dashboard flow

1. **Search Walmart items** - matches name, keyword, or item id; every result shows the Walmart image, size, and price.
2. **Review your list** - quantity steppers from 1 to 99, per-item price chips, total units, and an estimated subtotal.
3. **Mirror, sync & checkout** - compares your local list to the list mirror row by row, exports a sync JSON payload, and links to Walmart checkout with the current quantities.

## Images stay in sync with walmart.com

- Search results, grocery rows, and the mirror all use the same `i5.walmartimages.com` URL per item.
- Grocery rows and search results link straight to the matching `walmart.com/ip/...` product page.
- Stored lists are re-enriched on load, so an older saved list picks up the current Walmart image, size, and price.
- Keyword search runs on the same data: `milk`, `dairy`, `bread`, `beef`, or `15136790` all resolve.

## Grocery and sync behavior

- First load seeds the list from the mirror: 3 items, 4 units, $18.08 estimated.
- New items start at quantity `1`; duplicate ids are ignored case-insensitively.
- The local list and the pending sync queue persist in `localStorage`.
- The sync payload carries each item's id, name, quantity, image URL, Walmart product URL, product name, size, unit price, category, Walmart item id, and price.
- **Mark queue synced** clears the local queue once you have applied the payload in your signed-in Walmart session.

## Project structure

```text
src/
  components/
    AppShell/       shared header, hero, stat chips, panels
    Dashboard/      three-step dashboard shell and summary
    GroceryList/    list model plus totals, subtotal, and formatting helpers
    GroceryItem/    row rendering with image, quantity, price, and product link
    GroceryStore/   localStorage, sync queue, and mirror seeding
    ReorderPanel/   search catalog derived from the list mirror
    WalmartList/    mirror of list WL/73215e44 plus the sync diff
    WalmartSync/    checkout URL, sync payload, and file export
  pages/
    dashboard.html, dashboard.js, grocery.html, grocery.js, list-view.js
  styles/
    tokens.css, reset.css
```

Design rules: BEM class names, mobile-first CSS with `min-width` breakpoints, every color and spacing value from `tokens.css`, no inline styles or inline scripts, no `!important`, and visible `:focus-visible` rings. Contrast meets WCAG AA and motion respects `prefers-reduced-motion`.

## Tests

```powershell
node --test "src/components/**/*.test.js"
```

46 tests cover the list mirror, sync diffing, store persistence and queueing, quantity rules, subtotal formatting, and the HTML/CSS conventions of every component.

## Limitations

- The Walmart list can only be read by you in a signed-in browser session; the app mirrors it locally instead of scraping it.
- Checkout completes on walmart.com with your session, not in this interface.
- Captured prices and images are point-in-time values from Walmart item pages.
