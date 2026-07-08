import { ROUTES, ROLES } from '@/shared/constants';
import { isDemoReceptionistSession } from '@/features/receptionist/utils/receptionistPortal';
import { isDemoSuperAdminSession } from '@/features/super-admin/utils/superAdminPortal';

/** Where to send user after login based on role */
export function getAppEntryForRole(role) {

  if (role === ROLES.DOCTOR) {

    return ROUTES.DOCTOR_DASHBOARD;

  }

  if (role === ROLES.LAB_TECHNICIAN) {

    return ROUTES.LAB_DASHBOARD;

  }

  if (role === ROLES.PHARMACIST) {

    return ROUTES.PHARMACY_PRESCRIPTIONS;

  }

  if (role === ROLES.NURSE) {

    return ROUTES.NURSE_DASHBOARD;

  }

  if (role === ROLES.RECEPTIONIST) {
    return ROUTES.RECEPTIONIST_DASHBOARD;
  }

  if (role === ROLES.SUPER_ADMIN) {
    return ROUTES.SUPER_ADMIN_DASHBOARD;
  }

  if (role === ROLES.ADMIN) {

    return ROUTES.ADMIN_DASHBOARD;

  }

  if (
    role === ROLES.BILLING ||
    role === ROLES.OPD
  ) {

    return ROUTES.APP_ENTRY;

  }

  return ROUTES.APP_ENTRY;

}

/** Post-login destination using demo portal flags + role (prefer over getAppEntryForRole alone). */
export function getAppEntryForUser(user) {
  if (!user) return ROUTES.LOGIN;
  if (isDemoSuperAdminSession(user)) return ROUTES.SUPER_ADMIN_DASHBOARD;
  if (isDemoReceptionistSession(user)) return ROUTES.RECEPTIONIST_DASHBOARD;
  return getAppEntryForRole(user.role);
}

/** Roles allowed on the OPD / staff layout shell (admin has its own module). */
export const OPD_SHELL_ROLES = [

  ROLES.BILLING,

  ROLES.OPD,

];

