/**
 * Decode JWT payload without verification (client-side display only).
 * Server must always validate tokens.
 */
export function decodeJwt(token) {
  if (!token) return null;
  try {
    const payload = token.split('.')[1];
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

export function isTokenExpired(token) {
  const payload = decodeJwt(token);
  if (!payload?.exp) return true;
  return Date.now() >= payload.exp * 1000;
}

/** Milliseconds until JWT exp (negative if already expired). */
export function getTokenExpiresInMs(token) {
  const payload = decodeJwt(token);
  if (!payload?.exp) return 0;
  return payload.exp * 1000 - Date.now();
}
