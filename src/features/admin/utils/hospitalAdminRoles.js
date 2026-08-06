/**
 * Roles Hospital Admin may assign when registering or updating staff.
 * Must stay in sync with HM-Backend Services/role_policy.py ADMIN_REGISTERABLE_ROLES.
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

export const HOSPITAL_ADMIN_FORBIDDEN_ROLE_NAMES = ['admin', 'super_admin'];

const ASSIGNABLE = new Set(HOSPITAL_ADMIN_ASSIGNABLE_ROLE_NAMES);
const PRIVILEGED_ROLE_NAMES = new Set(HOSPITAL_ADMIN_FORBIDDEN_ROLE_NAMES);

/**
 * @param {Array<{ id: number|string, name: string }>} roles
 * @param {{ includeRoleId?: number|string|null }} [options]
 *        Keep the staff member's current role in the list even if not assignable
 *        (so existing records remain editable without forcing a role change).
 */
export function filterHospitalAdminRegisterRoles(roles, options = {}) {
  if (!roles?.length) return [];
  const includeId =
    options.includeRoleId != null && options.includeRoleId !== ''
      ? String(options.includeRoleId)
      : null;

  return roles.filter((role) => {
    if (ASSIGNABLE.has(role.name)) return true;
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
