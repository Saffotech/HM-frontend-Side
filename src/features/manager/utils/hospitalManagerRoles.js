/**
 * Clinical roles a hospital manager may assign.
 * Must stay in sync with HM-Backend Services/role_policy.py MANAGER_REGISTERABLE_ROLES.
 * Hospital admin (one per hospital) may also assign `manager`.
 * Platform roles are never assigned from a hospital screen.
 */
export const HOSPITAL_ADMIN_ASSIGNABLE_ROLE_NAMES = [
  'doctor',
  'nurse',
  'opd_billing',
  'ipd',
  'pharmacist',
  'receptionist',
  'lab_technician',
];

/** Hospital owner (`admin`) register/update list. One admin already exists. */
export const HOSPITAL_OWNER_ASSIGNABLE_ROLE_NAMES = [
  'manager',
  ...HOSPITAL_ADMIN_ASSIGNABLE_ROLE_NAMES,
];

export const HOSPITAL_ADMIN_FORBIDDEN_ROLE_NAMES = [
  'admin',
  'super_admin',
  'platform_admin',
  'crm',
  'accountant',
];

const ASSIGNABLE = new Set(HOSPITAL_ADMIN_ASSIGNABLE_ROLE_NAMES);
const OWNER_ASSIGNABLE = new Set(HOSPITAL_OWNER_ASSIGNABLE_ROLE_NAMES);
const PRIVILEGED_ROLE_NAMES = new Set(HOSPITAL_ADMIN_FORBIDDEN_ROLE_NAMES);

function keptRoleId(options) {
  if (options.includeRoleId == null || options.includeRoleId === '') return null;
  return String(options.includeRoleId);
}

/**
 * @param {Array<{ id: number|string, name: string }>} roles
 * @param {{ includeRoleId?: number|string|null }} [options]
 *        Keep the staff member's current role in the list even if not assignable
 *        (so existing records remain editable without forcing a role change).
 */
export function filterHospitalAdminRegisterRoles(roles, options = {}) {
  if (!roles?.length) return [];
  const includeId = keptRoleId(options);

  return roles.filter((role) => {
    if (ASSIGNABLE.has(role.name)) return true;
    if (includeId && String(role.id) === includeId) return true;
    return false;
  });
}

/** Roles the hospital admin may assign. Excludes a second admin and platform roles. */
export function filterHospitalOwnerRegisterRoles(roles, options = {}) {
  if (!roles?.length) return [];
  const includeId = keptRoleId(options);

  return roles.filter((role) => {
    if (OWNER_ASSIGNABLE.has(role.name)) return true;
    if (includeId && String(role.id) === includeId) return true;
    return false;
  });
}

export function isPrivilegedStaffRole(roleName) {
  return PRIVILEGED_ROLE_NAMES.has(roleName);
}

export function isHospitalAdminAssignableRole(roleName) {
  return ASSIGNABLE.has(roleName);
}

/** Roles that do not belong on a hospital screen. */
export const PLATFORM_ORGANIZATION_ROLE_NAMES = [
  'super_admin',
  'platform_admin',
  'crm',
  'accountant',
];

const PLATFORM_ROLES = new Set(PLATFORM_ORGANIZATION_ROLE_NAMES);

export function isPlatformOrganizationRole(roleName) {
  return PLATFORM_ROLES.has(roleName);
}

export function filterHospitalStaffRecords(staff) {
  if (!staff?.length) return [];
  return staff.filter((user) => !isPlatformOrganizationRole(user?.role_name || user?.role));
}

export function filterHospitalRoleRecords(roles) {
  if (!roles?.length) return [];
  return roles.filter((role) => !isPlatformOrganizationRole(role?.name));
}

/** Organization actors whose activity must not appear on the hospital audit log. */
const HOSPITAL_AUDIT_HIDDEN_ROLES = new Set(['platform_admin', 'crm', 'accountant']);

function auditActorRole(entry) {
  return String(entry?.actor_role || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');
}

export function isOrganizationAuditEntry(entry) {
  if (HOSPITAL_AUDIT_HIDDEN_ROLES.has(auditActorRole(entry))) return true;
  const resource = String(entry?.resource_type || entry?.target_type || '')
    .trim()
    .toLowerCase();
  if (resource === 'lead') return true;
  const action = String(entry?.action || '').trim().toLowerCase();
  return action.startsWith('lead.');
}

export function filterHospitalAuditEntries(entries) {
  if (!entries?.length) return [];
  return entries.filter((entry) => !isOrganizationAuditEntry(entry));
}
