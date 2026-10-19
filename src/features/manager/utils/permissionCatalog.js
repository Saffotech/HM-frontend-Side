import {
  activeStorageScope,
  permissionCatalogStorageKey,
} from '../../../components/security/hospitalBrowserStorage.js';

function catalogKey() {
  const scope = activeStorageScope();
  if (!scope) return null;
  return permissionCatalogStorageKey(scope.tenantId, scope.userId);
}

export function loadPermissionCatalog() {
  const key = catalogKey();
  if (!key || typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function savePermissionCatalog(catalog) {
  if (!Array.isArray(catalog)) return catalog;
  const normalized = catalog
    .filter((item) => item?.id != null && item?.name)
    .map((item) => ({ id: item.id, name: item.name }));
  const key = catalogKey();
  if (!key || typeof window === 'undefined') return normalized;
  window.localStorage.setItem(key, JSON.stringify(normalized));
  return normalized;
}

export function addPermissionToCatalog(entry) {
  if (!entry?.id || !entry?.name) return loadPermissionCatalog();
  const catalog = loadPermissionCatalog();
  if (catalog.some((item) => item.id === entry.id)) {
    return catalog;
  }
  const next = [...catalog, { id: entry.id, name: entry.name }];
  const key = catalogKey();
  if (!key || typeof window === 'undefined') return next;
  window.localStorage.setItem(key, JSON.stringify(next));
  return next;
}

export function uniquePermissionNamesFromRoles(roles = []) {
  const names = new Set();
  roles.forEach((role) => {
    role.permissions?.forEach((perm) => {
      if (perm) names.add(perm);
    });
  });
  return [...names].sort();
}
