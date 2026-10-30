const RELOAD_AT_KEY = 'saffo.bfcacheReloadAt';
const LOOP_WINDOW_MS = 4000;

export function readBfcacheReloadAt(storage) {
  const value = Number(storage?.getItem?.(RELOAD_AT_KEY));
  return Number.isFinite(value) ? value : 0;
}

export function markBfcacheReload(storage, now) {
  storage?.setItem?.(RELOAD_AT_KEY, String(now));
}

/**
 * Back-forward cache restores the previous document, including another role's screen.
 * Online: reload once so the current session is checked again.
 * Offline, or a second restore inside the loop window: hide that screen.
 * A normal load (persisted false) is left alone.
 */
export function decideBfcacheAction({ persisted, online, now, lastReloadAt }) {
  if (!persisted) return 'keep';
  if (!online) return 'offline';
  const last = Number(lastReloadAt) || 0;
  if (last > 0 && Number(now) - last < LOOP_WINDOW_MS) return 'safe';
  return 'reload';
}

/** Restored protected UI is never kept. The current role is applied on the next real load. */
export function restoredProtectedView(input) {
  const action = decideBfcacheAction(input);
  if (action === 'keep') {
    return { action, showRestoredProtectedUi: true };
  }
  return { action, showRestoredProtectedUi: false };
}
