import { getHospitalStorageScope } from '../../../components/security/hospitalStorageScope.js';
import { opdSettingsStorageKey } from '../../../components/security/hospitalBrowserStorage.js';
import { opdCacheBelongsToTenant } from './opdSettingsFallback.js';

function currentTenantId(explicit) {
  if (explicit != null && explicit !== '') return explicit;
  return getHospitalStorageScope().tenantId;
}

/** Reads only the current tenant's OPD fallback. The unscoped legacy key is ignored. */
export function readLocalOpdSettings(tenantId) {
  const tenant = currentTenantId(tenantId);
  const key = opdSettingsStorageKey(tenant);
  if (!key || typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!opdCacheBelongsToTenant(parsed, tenant)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeLocalOpdSettings(payload, tenantId) {
  const tenant = currentTenantId(tenantId);
  const key = opdSettingsStorageKey(tenant);
  if (!key || typeof localStorage === 'undefined') return null;
  const toStore = {
    ...payload,
    updated_at: new Date().toISOString(),
    _source: 'local',
    _tenant_id: tenant,
  };
  localStorage.setItem(key, JSON.stringify(toStore));
  return toStore;
}
