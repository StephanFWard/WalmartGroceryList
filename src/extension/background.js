/* Keeps one Walmart tab available so the content script can drive the cart sync.
   The sync itself lives in the content script; MV3 workers cannot hold a fast timer. */
const WORKER_TAB_URL = "https://www.walmart.com/cart";
const CHECK_INTERVAL_MS = 30000;

async function findWorkerTab() {
  const tabs = await chrome.tabs.query({ url: "https://www.walmart.com/*" });
  return tabs.length > 0 ? tabs[0] : null;
}

async function ensureWorkerTab() {
  const existing = await findWorkerTab();
  if (existing !== null) {
    return existing;
  }
  const created = await chrome.tabs.create({ url: WORKER_TAB_URL, active: false });
  return created;
}

async function nudgeWorkerTab() {
  const tab = await ensureWorkerTab();
  if (tab.status !== "complete") {
    return tab.id;
  }
  try {
    await chrome.tabs.sendMessage(tab.id, { type: "ping" });
  } catch {
    // Content script not injected yet (navigation in progress); the next tick retries.
  }
  return tab.id;
}

chrome.runtime.onInstalled.addListener(() => {
  ensureWorkerTab();
});

chrome.runtime.onStartup.addListener(() => {
  ensureWorkerTab();
});

setInterval(() => {
  nudgeWorkerTab().catch(() => {});
}, CHECK_INTERVAL_MS);

ensureWorkerTab().catch(() => {});
