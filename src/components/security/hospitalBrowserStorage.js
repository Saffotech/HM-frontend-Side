import { getHospitalStorageScope } from './hospitalStorageScope.js';
import { isSessionCurrent } from './sessionEpoch.js';

export const PLATFORM_STORAGE_KEY = 'saffocare.platform.v1';
export const SESSION_NOTICE_KEY = 'saffocare.hospital.session_notice';

const PRESERVED_KEYS = new Set([
  PLATFORM_STORAGE_KEY,
  SESSION_NOTICE_KEY,
  'access_token',
  'refresh_token',
  'user',
]);

const EXACT_OR_SCOPED = [
  'hms_admin_opd_settings_v1',
  'hm_bed_type_overlay_v1',
  'hms_admin_permission_catalog',
  'hms:doctor:ipd-consult-visits',
  'hms:doctor-ipd-bump',
  'hms:doctor-permissions-bump',
  'hms:nurse-permissions-bump',
  'hms:lab-permissions-bump',
  'hms:receptionist-permissions-bump',
  'hms:pharmacy-permissions-bump',
  'nurse-patient-list-mode',
];

const KEY_PREFIXES = [
  'pharmacy-dispense-pricing:',
  'ipd-pharmacy-admission:',
  'ipd-pharmacy-patient:',
  'ipd-ins-admit-ctx:',
  'nurse-handover-prefill:',
  'doctor:consultation-draft',
];

function scopePart(value) {
  if (value == null || value === '') return null;
  return String(value);
}

export function activeStorageScope() {
  const { tenantId, userId } = getHospitalStorageScope();
  const tenant = scopePart(tenantId);
  const user = scopePart(userId);
  if (!tenant || !user) return null;
  return { tenantId: tenant, userId: user };
}

export function canWriteHospitalStorage(epochAtStart) {
  if (epochAtStart != null && !isSessionCurrent(epochAtStart)) return false;
  return activeStorageScope() != null;
}

export function opdSettingsStorageKey(tenantId) {
  const tenant = scopePart(tenantId);
  if (!tenant) return null;
  return `hms_admin_opd_settings_v1:${tenant}`;
}

export function permissionCatalogStorageKey(tenantId, userId) {
  const tenant = scopePart(tenantId);
  const user = scopePart(userId);
  if (!tenant || !user) return null;
  return `hms_admin_permission_catalog:${tenant}:${user}`;
}

export function doctorIpdConsultStorageKey(tenantId, userId) {
  const tenant = scopePart(tenantId);
  const user = scopePart(userId);
  if (!tenant || !user) return null;
  return `hms:doctor:ipd-consult-visits:${tenant}:${user}`;
}

export function pharmacyStorageKey(prefix, recordId, tenantId) {
  const tenant = scopePart(tenantId);
  if (!tenant || recordId == null || recordId === '') return null;
  return `${prefix}${tenant}:${recordId}`;
}

export function nurseListModeStorageKey(tenantId, userId) {
  const tenant = scopePart(tenantId);
  const user = scopePart(userId);
  if (!tenant || !user) return null;
  return `nurse-patient-list-mode:${tenant}:${user}`;
}

export function nurseHandoverPrefillStorageKey(handoverId, tenantId, userId) {
  const tenant = scopePart(tenantId);
  const user = scopePart(userId);
  if (!tenant || !user || handoverId == null || handoverId === '') return null;
  return `nurse-handover-prefill:${tenant}:${user}:${handoverId}`;
}

export function hospitalBumpStorageKey(baseKey, tenantId) {
  const tenant = scopePart(tenantId);
  if (!baseKey || !tenant) return null;
  return `${baseKey}:${tenant}`;
}

export function matchesHospitalBump(storageKey, baseKey) {
  const scope = activeStorageScope();
  if (!storageKey || !baseKey || !scope) return false;
  return storageKey === hospitalBumpStorageKey(baseKey, scope.tenantId);
}

export function writeHospitalBump(baseKey) {
  const scope = activeStorageScope();
  const stamp = String(Date.now());
  if (scope) {
    const key = hospitalBumpStorageKey(baseKey, scope.tenantId);
    try {
      localStorage.setItem(key, stamp);
    } catch {
      /* storage unavailable */
    }
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(baseKey));
  }
}

export function hospitalSessionRecordKey(prefix, recordId) {
  const scope = activeStorageScope();
  if (!scope) return null;
  return pharmacyStorageKey(prefix, recordId, scope.tenantId);
}

export function readHospitalSessionJson(prefix, recordId, fallback) {
  const key = hospitalSessionRecordKey(prefix, recordId);
  if (!key || typeof window === 'undefined' || !window.sessionStorage) return fallback;
  try {
    const raw = window.sessionStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function writeHospitalSessionJson(prefix, recordId, value, epochAtStart) {
  if (!canWriteHospitalStorage(epochAtStart)) return false;
  const key = hospitalSessionRecordKey(prefix, recordId);
  if (!key || typeof window === 'undefined' || !window.sessionStorage) return false;
  if (!canWriteHospitalStorage(epochAtStart)) return false;
  try {
    window.sessionStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function readNurseListMode() {
  const scope = activeStorageScope();
  if (!scope || typeof window === 'undefined' || !window.sessionStorage) return null;
  const key = nurseListModeStorageKey(scope.tenantId, scope.userId);
  try {
    const stored = window.sessionStorage.getItem(key);
    return stored === 'allocated' || stored === 'all' ? stored : null;
  } catch {
    return null;
  }
}

export function writeNurseListMode(mode) {
  if (mode !== 'allocated' && mode !== 'all') return;
  if (!canWriteHospitalStorage()) return;
  const scope = activeStorageScope();
  const key = nurseListModeStorageKey(scope.tenantId, scope.userId);
  if (!key || typeof window === 'undefined' || !window.sessionStorage) return;
  try {
    window.sessionStorage.setItem(key, mode);
  } catch {
    /* storage unavailable */
  }
}

export function readNurseHandoverPrefill(handoverId) {
  const scope = activeStorageScope();
  if (!scope || handoverId == null || handoverId === '') return null;
  if (typeof window === 'undefined' || !window.sessionStorage) return null;
  const key = nurseHandoverPrefillStorageKey(handoverId, scope.tenantId, scope.userId);
  if (!key) return null;
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeNurseHandoverPrefill(handoverId, value, epochAtStart) {
  if (!canWriteHospitalStorage(epochAtStart)) return false;
  const scope = activeStorageScope();
  const key = nurseHandoverPrefillStorageKey(handoverId, scope.tenantId, scope.userId);
  if (!key || typeof window === 'undefined' || !window.sessionStorage) return false;
  if (!canWriteHospitalStorage(epochAtStart)) return false;
  try {
    window.sessionStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function clearNurseHandoverPrefill(handoverId, epochAtStart) {
  if (!canWriteHospitalStorage(epochAtStart)) return;
  const scope = activeStorageScope();
  const key = nurseHandoverPrefillStorageKey(handoverId, scope.tenantId, scope.userId);
  if (!key || typeof window === 'undefined' || !window.sessionStorage) return;
  try {
    window.sessionStorage.removeItem(key);
  } catch {
    /* storage unavailable */
  }
}

export function isHospitalDataStorageKey(key) {
  if (!key || PRESERVED_KEYS.has(key)) return false;
  if (KEY_PREFIXES.some((prefix) => key.startsWith(prefix))) return true;
  return EXACT_OR_SCOPED.some((base) => key === base || key.startsWith(`${base}:`));
}

function storageKeys(storage) {
  if (!storage) return [];
  const keys = [];
  try {
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);
      if (key) keys.push(key);
    }
  } catch {
    return [];
  }
  return keys;
}

function clearMatching(storage) {
  if (!storage) return;
  storageKeys(storage).forEach((key) => {
    if (!isHospitalDataStorageKey(key)) return;
    try {
      storage.removeItem(key);
    } catch {
      /* storage unavailable */
    }
  });
}

/** Removes hospital/user browser data. Leaves Platform Admin storage and the login notice. */
export function clearHospitalBrowserStorage() {
  if (typeof window === 'undefined') return;
  clearMatching(window.localStorage);
  clearMatching(window.sessionStorage);
}
