const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const PORT = Number(process.env.PORT ?? 3000);
const HOST = process.env.HOST ?? "127.0.0.1";
const ACTION_TTL_MS = 5 * 60 * 1000;
const MAX_ACTIONS = 500;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
};

const state = {
  snapshot: null,
  actions: [],
  events: [],
};

function sendJson(res, statusCode, body) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(body));
}

function readBody(req, limitBytes = 512 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > limitBytes) {
        reject(new Error("payload too large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8");
      if (raw.trim() === "") {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch (error) {
        reject(new Error(`invalid JSON body: ${error.message}`));
      }
    });
    req.on("error", reject);
  });
}

function pruneActions() {
  const cutoff = Date.now() - ACTION_TTL_MS;
  const before = state.actions.length;
  state.actions = state.actions.filter(
    (action) => action.status === "pending" && action.expiresAt > cutoff,
  );
  return before - state.actions.length;
}

function recordEvent(level, message) {
  state.events.unshift({ at: new Date().toISOString(), level, message });
  state.events = state.events.slice(0, 50);
}

const KNOWN_ACTIONS = [
  "add-product",
  "set-quantity",
  "remove-item",
  "clear-cart",
  "checkout",
  "refresh",
];

function isKnownAction(type) {
  return KNOWN_ACTIONS.includes(type);
}

function enqueueActions(actions) {
  const queuedAt = new Date().toISOString();
  const expiresAt = Date.now() + ACTION_TTL_MS;
  const accepted = [];
  const rejected = [];
  for (const action of Array.isArray(actions) ? actions : []) {
    const type = String(action?.type ?? "");
    if (!isKnownAction(type)) {
      rejected.push({ type, reason: "unknown-action-type" });
      continue;
    }
    const id = String(action?.id ?? `${type}-${Date.now()}`);
    if (state.actions.some((pending) => pending.id === id && pending.status === "pending")) {
      accepted.push({ id, deduped: true });
      continue;
    }
    state.actions.push({ ...action, id, type, status: "pending", queuedAt, expiresAt });
    accepted.push({ id, deduped: false });
  }
  if (state.actions.length > MAX_ACTIONS) {
    state.actions = state.actions.slice(-MAX_ACTIONS);
  }
  recordEvent(
    "info",
    `Queued ${accepted.length} action(s): ${accepted.map((entry) => entry.id).join(", ") || "none"}`,
  );
  return { accepted, rejected };
}

function handleApi(req, res, url) {
  if (req.method === "GET" && url.pathname === "/api/walmart/health") {
    sendJson(res, 200, {
      ok: true,
      connected: state.snapshot !== null,
      pending: state.actions.filter((action) => action.status === "pending").length,
      capturedAt: state.snapshot?.capturedAt ?? null,
    });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/walmart/state") {
    sendJson(res, 200, { snapshot: state.snapshot, serverTime: new Date().toISOString() });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/walmart/state") {
    readBody(req)
      .then((body) => {
        const snapshot = body?.snapshot ?? null;
        if (snapshot !== null && (typeof snapshot !== "object" || Array.isArray(snapshot))) {
          sendJson(res, 400, { ok: false, error: "snapshot must be an object or null" });
          return;
        }
        state.snapshot = snapshot;
        recordEvent("info", snapshot === null ? "Extension disconnected" : "Snapshot received");
        sendJson(res, 200, { ok: true });
      })
      .catch((error) => sendJson(res, 400, { ok: false, error: error.message }));
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/walmart/actions") {
    readBody(req)
      .then((body) => sendJson(res, 200, { ok: true, ...enqueueActions(body?.actions) }))
      .catch((error) => sendJson(res, 400, { ok: false, error: error.message }));
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/walmart/actions") {
    const pruned = pruneActions();
    sendJson(res, 200, {
      actions: state.actions.filter((action) => action.status === "pending"),
      pruned,
      serverTime: new Date().toISOString(),
    });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/walmart/actions/ack") {
    readBody(req)
      .then((body) => {
        const id = String(body?.id ?? "");
        const action = state.actions.find((candidate) => candidate.id === id);
        if (!action) {
          sendJson(res, 404, { ok: false, error: `unknown action id ${id}` });
          return;
        }
        action.status = "done";
        action.completedAt = new Date().toISOString();
        action.result = body?.result ?? null;
        recordEvent(body?.ok === false ? "error" : "info", `Action ${id} ${action.result ?? "completed"}`);
        sendJson(res, 200, { ok: true });
      })
      .catch((error) => sendJson(res, 400, { ok: false, error: error.message }));
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/walmart/events") {
    sendJson(res, 200, { events: state.events });
    return;
  }

  sendJson(res, 404, { ok: false, error: `unknown endpoint ${req.method} ${url.pathname}` });
}

function serveStatic(req, res, url) {
  const requested = url.pathname === "/" ? "/pages/dashboard.html" : url.pathname;
  const filePath = path.join(ROOT, path.normalize(decodeURIComponent(requested)));
  if (!filePath.startsWith(ROOT)) {
    sendJson(res, 403, { ok: false, error: "forbidden" });
    return;
  }
  fs.readFile(filePath, (error, data) => {
    if (error) {
      sendJson(res, 404, { ok: false, error: `not found: ${requested}` });
      return;
    }
    res.writeHead(200, {
      "Content-Type": MIME[path.extname(filePath)] ?? "application/octet-stream",
      "Cache-Control": "no-store",
    });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host ?? "localhost"}`);
  if (url.pathname.startsWith("/api/")) {
    handleApi(req, res, url);
    return;
  }
  if (req.method === "GET" || req.method === "HEAD") {
    serveStatic(req, res, url);
    return;
  }
  sendJson(res, 405, { ok: false, error: "method not allowed" });
});

if (require.main === module) {
  server.listen(PORT, HOST, () => {
    console.log(`WalmartGroceryList bridge + static server`);
    console.log(`  dashboard : http://localhost:${PORT}/pages/dashboard.html`);
    console.log(`  list view : http://localhost:${PORT}/pages/grocery.html`);
    console.log(`  bridge API: http://localhost:${PORT}/api/walmart/health`);
  });
}

module.exports = { createServer: () => server, handleApi, enqueueActions, state };

