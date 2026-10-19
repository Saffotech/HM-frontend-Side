import { ROUTES, ROLES } from '@/shared/constants';
import { dashboardForRole } from '@/shared/auth/universalLoginPolicy';
import { normalizeRole } from '@/shared/utils/roleUtils';

/** Where to send user after login based on role */
export function getAppEntryForRole(role) {
  const platformHome = dashboardForRole(role);
  if (platformHome) return platformHome;

  const normalized = normalizeRole(role);

  if (normalized === ROLES.DOCTOR) {
    return ROUTES.DOCTOR_DASHBOARD;
  }

  if (normalized === ROLES.LAB_TECHNICIAN) {
    return ROUTES.LAB_DASHBOARD;
  }

  if (normalized === ROLES.PHARMACIST) {
    return ROUTES.PHARMACY_PRESCRIPTIONS;
  }

  if (normalized === ROLES.NURSE) {
    return ROUTES.NURSE_DASHBOARD;
  }

  if (normalized === ROLES.RECEPTIONIST) {
    return ROUTES.RECEPTIONIST_DASHBOARD;
  }

  if (normalized === ROLES.IPD) {
    return ROUTES.IPD_DASHBOARD;
  }

  if (normalized === ROLES.SUPER_ADMIN) {
    return ROUTES.SUPER_ADMIN_DASHBOARD;
  }

  if (normalized === ROLES.ADMIN) {
    return ROUTES.ADMIN_DASHBOARD;
  }

  if (normalized === ROLES.BILLING || normalized === ROLES.OPD) {
    return ROUTES.APP_ENTRY;
  }

  return ROUTES.APP_ENTRY;
}

/** Post-login destination based on authenticated user role. */
export function getAppEntryForUser(user) {
  if (!user) return ROUTES.LOGIN;
  return getAppEntryForRole(user.role);
}

/** Roles allowed on the OPD / staff layout shell (admin has its own module). */
export const OPD_SHELL_ROLES = [ROLES.BILLING, ROLES.OPD];
