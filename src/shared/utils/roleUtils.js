/**
 * Backend role names ↔ frontend route/UI roles.
 * Backend seed: admin, doctor, nurse, opd_billing, pharmacist
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

/** Display department for module gate (not sent to API). */
export const DEPARTMENT_BY_ROLE = {
  super_admin: 'Super Administration',
  admin: 'Administration',
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
  super_admin: 'Super Admin',
  admin: 'Admin',
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
