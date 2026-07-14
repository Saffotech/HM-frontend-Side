const STORAGE_KEY = 'hms_admin_permission_catalog';

export function loadPermissionCatalog() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function savePermissionCatalog(catalog) {
  if (typeof window === 'undefined' || !Array.isArray(catalog)) return catalog;
  const normalized = catalog
    .filter((item) => item?.id != null && item?.name)
    .map((item) => ({ id: item.id, name: item.name }));
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
}

export function addPermissionToCatalog(entry) {
  if (!entry?.id || !entry?.name) return loadPermissionCatalog();
  const catalog = loadPermissionCatalog();
  if (catalog.some((item) => item.id === entry.id)) {
    return catalog;
  }
  const next = [...catalog, { id: entry.id, name: entry.name }];
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
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
