import { listPermissions, listRoles } from '@/features/admin/api/admin';
import {
  loadPermissionCatalog,
  savePermissionCatalog,
  uniquePermissionNamesFromRoles,
} from '@/features/admin/utils/permissionCatalog';
import { buildSeedPermissionCatalog } from '@/features/super-admin/constants/seedPermissions';

function mergeRolePermissionExtras(catalog, roles) {
  const roleNames = uniquePermissionNamesFromRoles(roles);
  const catalogNames = new Set(catalog.map((p) => p.name));
  const extras = roleNames
    .filter((name) => !catalogNames.has(name))
    .map((name) => ({ id: null, name, unresolved: true }));
  return [...catalog, ...extras];
}

function fallbackCatalog(roles = []) {
  const stored = loadPermissionCatalog();
  if (stored.length > 0) {
    return mergeRolePermissionExtras(stored, roles);
  }

  const seedCatalog = buildSeedPermissionCatalog();
  return mergeRolePermissionExtras(seedCatalog, roles);
}

/**
 * Load permission catalog for assign-permissions UI.
 * Prefers live IDs from GET /roles/permissions; falls back to cached/seed data.
 */
export async function loadSuperAdminPermissionCatalog() {
  let roles = [];
  try {
    roles = await listRoles();
  } catch {
    roles = [];
  }

  try {
    const apiPermissions = await listPermissions();
    if (apiPermissions.length > 0) {
      const catalog = apiPermissions.map((permission) => ({
        id: permission.id,
        name: permission.name,
      }));
      savePermissionCatalog(catalog);
      return mergeRolePermissionExtras(catalog, roles);
    }
  } catch {
    // Fall back to cached/seed catalog when the list endpoint is unavailable.
  }

  return fallbackCatalog(roles);
}
