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
};
