import {
  BRIDGE_ACTIONS_URL,
  BRIDGE_POLL_MS,
  BRIDGE_STATE_URL,
  normalizeLiveCart,
} from "./LiveCart.js";

export const BRIDGE_DISCONNECTED = { reachable: false, cart: normalizeLiveCart(null), pending: 0 };

async function readJson(url, options) {
  const response = await fetch(url, { cache: "no-store", ...options });
  if (!response.ok) {
    throw new Error(`${url} responded ${response.status}`);
  }
  return response.json();
}

export async function pollLiveCart() {
  try {
    const [state, actions] = await Promise.all([
      readJson(BRIDGE_STATE_URL),
      readJson(BRIDGE_ACTIONS_URL),
    ]);
    return {
      reachable: true,
      cart: normalizeLiveCart(state.snapshot ?? null),
      pending: Array.isArray(actions.actions) ? actions.actions.length : 0,
    };
  } catch {
    return { ...BRIDGE_DISCONNECTED };
  }
}

export async function sendLiveActions(actions) {
  if (actions.length === 0) {
    return { ok: true, queued: 0, rejected: [] };
  }
  try {
    const body = await readJson(BRIDGE_ACTIONS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actions }),
    });
    return {
      ok: body.ok === true,
      queued: Array.isArray(body.accepted) ? body.accepted.length : 0,
      rejected: Array.isArray(body.rejected) ? body.rejected : [],
    };
  } catch {
    return { ok: false, queued: 0, rejected: [{ reason: "bridge-unreachable" }] };
  }
}

export function startLiveCartPolling(onUpdate, intervalMs = BRIDGE_POLL_MS) {
  let stopped = false;
  let timer = null;

  const tick = async () => {
    if (stopped) {
      return;
    }
    const update = await pollLiveCart();
    if (!stopped) {
      onUpdate(update);
    }
    if (!stopped) {
      timer = setTimeout(tick, intervalMs);
    }
  };

  tick();

  return () => {
    stopped = true;
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  };
}
