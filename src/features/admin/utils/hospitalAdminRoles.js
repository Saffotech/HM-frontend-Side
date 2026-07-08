/** Roles Hospital Admin may assign when registering or updating staff (frontend filter). */
export const HOSPITAL_ADMIN_REGISTER_ROLE_NAMES = [
  'doctor',
  'nurse',
  'opd_billing',
  'pharmacist',
];

const PRIVILEGED_ROLE_NAMES = new Set(['admin', 'super_admin']);

export function filterHospitalAdminRegisterRoles(roles) {
  if (!roles?.length) return [];
  return roles.filter((role) => HOSPITAL_ADMIN_REGISTER_ROLE_NAMES.includes(role.name));
}

export function isPrivilegedStaffRole(roleName) {
  return PRIVILEGED_ROLE_NAMES.has(roleName);
}
