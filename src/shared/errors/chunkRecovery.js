import { isChunkLoadError } from './errorClassification.js';

export { isChunkLoadError };

const COUNT_KEY = 'saffo.chunkReload.count';
const MAX_AUTOMATIC = 1;

let claimedThisDocument = false;
let resetTimer = null;

export function readChunkReloadCount(storage) {
  const count = Number(storage?.getItem?.(COUNT_KEY) || 0);
  return Number.isFinite(count) && count > 0 ? count : 0;
}

export function chunkRecoveryDecision(storage) {
  return readChunkReloadCount(storage) >= MAX_AUTOMATIC ? 'manual' : 'reload';
}

/**
 * First recoverable chunk failure reloads once per session.
 * A second failure in the same document, or after that reload, stays manual.
 */
export function claimAutomaticChunkReload(storage) {
  if (!storage?.getItem || !storage?.setItem) return false;
  if (claimedThisDocument) return false;
  if (readChunkReloadCount(storage) >= MAX_AUTOMATIC) return false;
  claimedThisDocument = true;
  storage.setItem(COUNT_KEY, String(readChunkReloadCount(storage) + 1));
  if (resetTimer) {
    clearTimeout(resetTimer);
    resetTimer = null;
  }
  return true;
}

export function scheduleChunkRecoveryReset(storage, delay = 15000, setTimeoutImpl = setTimeout, clearTimeoutImpl = clearTimeout) {
  if (!storage?.removeItem) return;
  if (resetTimer) clearTimeoutImpl(resetTimer);
  resetTimer = setTimeoutImpl(() => {
    storage.removeItem(COUNT_KEY);
    resetTimer = null;
  }, delay);
}

export function cancelChunkRecoveryReset(clearTimeoutImpl = clearTimeout) {
  if (!resetTimer) return;
  clearTimeoutImpl(resetTimer);
  resetTimer = null;
}

export function resetChunkRecoveryStateForTests() {
  claimedThisDocument = false;
  if (resetTimer) clearTimeout(resetTimer);
  resetTimer = null;
}
