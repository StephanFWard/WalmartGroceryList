# Walmart Grocery List Bridge (Chrome extension)

This extension is the only piece that can touch your signed-in Walmart session. It runs **inside your own browser**, on the Walmart tab you sign into, so no credentials, cookies, or tokens are ever shared with the dashboard or with me.

## How the pieces fit

```text
your signed-in walmart.com cart tab
        |  (extension: reads the rendered cart, applies queued actions)
        v
http://127.0.0.1:3000  bridge API   <---->   localhost dashboard (Live Walmart cart card)
```

- The **dashboard** never talks to walmart.com directly (same-origin policy blocks it).
- The **extension** can, because it runs in the page.
- The **bridge** (`src/bridge/server.js`) is the local mailbox between them.

## Install

1. Start the bridge from the repo root:

   ```powershell
   node src/bridge/server.js
   ```

   It serves the dashboard at `http://localhost:3000/pages/dashboard.html` and the API at `http://127.0.0.1:3000/api/walmart/`.

2. Load the extension: `chrome://extensions` -> enable **Developer mode** -> **Load unpacked** -> select `src/extension`.

3. Sign in to Walmart in a normal tab (the extension opens `https://www.walmart.com/cart` in a background tab on install).

4. Open the dashboard. The **Live Walmart cart** card should go from "Not connected" to a synced snapshot within a few seconds.

## What it does

- Publishes a cart snapshot every 3 seconds: item id, name, quantity, price, image URL, product URL.
- Applies queued actions in order: `add-product`, `set-quantity`, `remove-item`, `clear-cart`, `checkout`.
- Reports every action result back to the bridge, so the dashboard can show pending vs. completed work.

## Honest limitations

- **It reads the rendered DOM, not a private API.** Walmart ships no public cart API for this, and its internal GraphQL operations are undocumented and change without notice. Selectors are therefore best-effort. If Walmart changes its markup, some actions will report failures instead of silently doing nothing.
- **The worker tab must stay open** on `walmart.com/cart` (or a page the loop can work from). Chrome may freeze background tabs; open `walmart.com/cart` yourself if syncing stalls.
- **Prices and availability still come from Walmart at checkout.** The dashboard's estimate is informational.
- **The extension never handles credentials.** It reuses the session that already exists in your browser profile. Do not paste passwords or SMS codes into the dashboard, the bridge, or this repo.

## Troubleshooting

| Symptom | Likely cause |
| --- | --- |
| Card says "Not connected" | Bridge not running, or the extension is not loaded. Check `http://127.0.0.1:3000/api/walmart/health`. |
| Items show but prices are blank | Walmart markup changed; the snapshot carries `notes` explaining what failed to parse. |
| Actions stay "queued" | The Walmart tab is not on the cart page, or it is signed out. |
| Nothing happens on checkout | Checkout completes in your Walmart tab, not in the dashboard. |
