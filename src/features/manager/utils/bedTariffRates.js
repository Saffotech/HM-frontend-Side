/** Persist double-bed ward rates in existing `ward_rates` without backend schema changes. */
export const DOUBLE_WARD_PREFIX = '__double__:';

export function doubleWardStorageKey(wardName) {
  return `${DOUBLE_WARD_PREFIX}${String(wardName || '').trim()}`;
}

export function isDoubleWardStorageKey(wardName) {
  return String(wardName || '').trim().toLowerCase().startsWith(DOUBLE_WARD_PREFIX.toLowerCase());
}

export function coerceBedType(value) {
  return String(value || '').trim().toLowerCase() === 'double' ? 'double' : 'single';
}
