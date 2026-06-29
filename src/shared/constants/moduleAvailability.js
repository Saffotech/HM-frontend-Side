/**
 * Which staff modules are implemented vs placeholder on login.
 * Keys match AuthContext `department` labels from DEPARTMENT_BY_ROLE.
 */

import { ROLES } from '@/shared/constants';

export const MODULE_STATUS = {
  LIVE: 'live',
  COMING_SOON: 'coming_soon',
};

/** @type {Record<string, 'live' | 'coming_soon'>} */
export const STAFF_MODULE_AVAILABILITY = {
  Doctor: MODULE_STATUS.LIVE,
  'Lab Technician': MODULE_STATUS.LIVE,
  OPD: MODULE_STATUS.LIVE,
  Administration: MODULE_STATUS.LIVE,
  Pharmacy: MODULE_STATUS.LIVE,
  Nursing: MODULE_STATUS.LIVE,
  Reception: MODULE_STATUS.COMING_SOON,
  Billing: MODULE_STATUS.COMING_SOON,
};

/** Roles that always pass the post-login module gate (admin uses OPD shell). */
const ALWAYS_LIVE_ROLES = new Set([ROLES.ADMIN, ROLES.OPD, ROLES.DOCTOR]);

export function getStaffModuleStatus(department) {
  return STAFF_MODULE_AVAILABILITY[department] ?? MODULE_STATUS.COMING_SOON;
}

/**
 * @param {string} [department]
 * @param {string} [role] - normalized frontend role
 */
export function isStaffModuleLive(department, role) {
  if (role && ALWAYS_LIVE_ROLES.has(role)) return true;
  return getStaffModuleStatus(department) === MODULE_STATUS.LIVE;
}
