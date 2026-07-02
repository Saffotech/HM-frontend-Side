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
