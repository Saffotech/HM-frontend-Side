const recent = new Map();

/** Collapse identical error toasts from one failed page load. Success toasts are unaffected. */
export function shouldShowErrorToast(message, now = Date.now(), windowMs = 8000) {
  const key = String(message || '').trim();
  if (!key) return false;
  const previous = recent.get(key);
  if (typeof previous === 'number' && now - previous < windowMs) return false;
  recent.set(key, now);
  return true;
}

export function resetErrorToastDedupeForTests() {
  recent.clear();
}
