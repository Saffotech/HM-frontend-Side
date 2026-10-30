const buffer = [];
const MAX_ENTRIES = 30;

export function scrubRoute(pathname) {
  if (!pathname || typeof pathname !== 'string') return null;
  const path = pathname.split('?')[0].split('#')[0];
  return path.replace(/\/[0-9]+(?=\/|$)/g, '/:id');
}

export function sanitizeRequestId(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!/^[A-Za-z0-9._:-]{1,128}$/.test(trimmed)) return null;
  if (trimmed.split('.').length >= 3) return null;
  return trimmed;
}

export function recordClientDiagnostic(entry = {}) {
  const safe = {
    category: String(entry.category || 'unexpected'),
    route: scrubRoute(entry.route || (typeof window !== 'undefined' ? window.location.pathname : '')),
    at: new Date().toISOString(),
    network: Boolean(entry.network),
    chunk: Boolean(entry.chunk),
    status: Number.isFinite(Number(entry.status)) ? Number(entry.status) : null,
    requestId: sanitizeRequestId(entry.requestId),
  };
  buffer.push(safe);
  if (buffer.length > MAX_ENTRIES) buffer.shift();
  const dev = typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.DEV;
  if (dev && typeof console !== 'undefined') {
    console.warn('[saffo-care]', safe);
  }
  return safe;
}

export function getClientDiagnostics() {
  return buffer.slice();
}

export function resetClientDiagnosticsForTests() {
  buffer.length = 0;
}
