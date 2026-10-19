const STORAGE_KEY = 'saffocare.hospital.session_notice';

let cacheLoaded = false;
let cachedNotice = null;

function readStorage() {
  if (typeof sessionStorage === 'undefined') return null;
  try {
    return sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeStorage(message) {
  if (typeof sessionStorage === 'undefined') return;
  try {
    if (message) sessionStorage.setItem(STORAGE_KEY, message);
    else sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* sessionStorage unavailable */
  }
}

export function peekSessionNotice() {
  if (!cacheLoaded) {
    cacheLoaded = true;
    cachedNotice = readStorage();
  }
  return cachedNotice;
}

export function publishSessionNotice(message) {
  cachedNotice = message || null;
  cacheLoaded = true;
  writeStorage(cachedNotice);
}

export function clearSessionNotice() {
  cachedNotice = null;
  cacheLoaded = true;
  writeStorage(null);
}
