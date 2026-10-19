/** Network-error fallback rules for the OPD settings cache. */

import { isSupersededSessionError } from '../../../components/security/httpSessionPolicy.js';

export function shouldUseOpdLocalFallback(error) {
  if (isSupersededSessionError(error)) return false;
  const status = error?.status;
  if (status === 403) return false;
  const detail = `${error?.detail || ''} ${error?.message || ''}`;
  if (/permission denied/i.test(detail)) return false;
  return status === 404 || status === 405 || status === 501 || status === 0;
}

export function opdCacheBelongsToTenant(stored, tenantId) {
  if (!stored || typeof stored !== 'object' || tenantId == null || tenantId === '') return false;
  if (stored._tenant_id == null || stored._tenant_id === '') return false;
  return String(stored._tenant_id) === String(tenantId);
}
