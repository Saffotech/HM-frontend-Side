/**
 * Backend role names stay as returned by login and /auth/me.
 * Hospital owner panels are `super_admin` and `admin`. Operations is `manager`.
 * `super_admin` is not rewritten to `admin`: /admin/profile still rejects it.
 * `platform_admin` is unrelated and is not mapped here.
 */

export function normalizeRole(role) {
  if (!role) return role;
  const map = {
    opd_billing: 'opd',
    opd_staff: 'opd',
    opd_receptionist: 'opd',
  };
  return map[role] ?? role;
}

/** Owner or operations home. Other roles, including platform roles, return null. */
export function hospitalEntryPath(role) {
  const normalized = normalizeRole(role);
  if (normalized === 'super_admin' || normalized === 'admin') return '/admin/dashboard';
  if (normalized === 'manager') return '/manager/dashboard';
  return null;
}

/** Display department for module gate (not sent to API). */
export const DEPARTMENT_BY_ROLE = {
  super_admin: 'Administration',
  admin: 'Management',
  manager: 'Management',
  doctor: 'Doctor',
  opd: 'OPD',
  nurse: 'Nursing',
  lab_technician: 'Lab Technician',
  pharmacist: 'Pharmacy',
  receptionist: 'Reception',
  billing: 'Billing',
  ipd: 'IPD',
};

/** Short module label shown next to the avatar in every module shell. */
export const ROLE_LABELS = {
  super_admin: 'Admin',
  admin: 'Hospital Admin',
  manager: 'Manager',
  doctor: 'Doctor',
  opd: 'OPD Billing',
  nurse: 'Nurse',
  lab_technician: 'Lab',
  pharmacist: 'Pharmacy',
  receptionist: 'Receptionist',
  billing: 'Billing',
  ipd: 'IPD',
};

/** Abbreviations that stay fully upper-cased when a role has no explicit label. */
const ACRONYMS = new Set(['opd', 'ipd', 'icu', 'ot', 'hr', 'it']);

function capitalizeWord(word) {
  if (ACRONYMS.has(word.toLowerCase())) return word.toUpperCase();
  return word
    .split('-')
    .map((part) => (part ? part.charAt(0).toUpperCase() + part.slice(1).toLowerCase() : part))
    .join('-');
}

/** Title-cases a raw role/name string: "shivam singh" → "Shivam Singh". */
export function toTitleCase(value) {
  if (!value) return '';
  return String(value).trim().split(/[\s_]+/).filter(Boolean).map(capitalizeWord).join(' ');
}

/** Role label for a user object, falling back to a title-cased role name. */
export function getRoleLabel(user) {
  const role = normalizeRole(user?.role ?? user?.role_name);
  if (!role) return 'Staff';
  return ROLE_LABELS[role] || toTitleCase(role) || 'Staff';
}
