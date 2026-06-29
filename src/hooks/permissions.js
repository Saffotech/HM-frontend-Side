/**
 * UI permission checks — backed by JWT permission strings from login.
 * Backend enforces the same strings via PermissionChecker.
 */

export const ACTIONS = {
  VIEW_OPD_DASHBOARD: 'view_opd_dashboard',
  VIEW_BILLING: 'view_billing',
  CREATE_BILL: 'create_bill',
  VIEW_PAYMENT_HISTORY: 'view_payment_history',
  MANAGE_PATIENTS: 'manage_patients',
  MANAGE_APPOINTMENTS: 'manage_appointments',
  MANAGE_BEDS: 'manage_beds',
  CALL_PATIENT: 'call_patient',
  CONSULT: 'consult',
  VIEW_EMR: 'view_emr',
  PRESCRIBE: 'prescribe',
  UPDATE_PRESCRIPTION: 'update_prescription',
  CLINICAL_NOTES: 'clinical_notes',
  VIEW_LAB: 'view_lab',
  ADMIN_BACKUP: 'admin_backup',
};

/** UI action → backend permission(s); any listed permission grants the action. */
export const ACTION_BACKEND_PERMISSIONS = {
  [ACTIONS.VIEW_OPD_DASHBOARD]: ['opd:view'],
  [ACTIONS.VIEW_BILLING]: ['billing:view'],
  [ACTIONS.CREATE_BILL]: ['billing:create'],
  [ACTIONS.VIEW_PAYMENT_HISTORY]: ['billing:view'],
  [ACTIONS.MANAGE_PATIENTS]: ['patients:view'],
  [ACTIONS.MANAGE_APPOINTMENTS]: ['appointments:view'],
  [ACTIONS.MANAGE_BEDS]: ['opd:view', 'opd:create'],
  [ACTIONS.CALL_PATIENT]: ['appointments:update'],
  [ACTIONS.CONSULT]: ['appointments:update'],
  [ACTIONS.VIEW_EMR]: ['patients:view'],
  [ACTIONS.PRESCRIBE]: ['prescriptions:create'],
  [ACTIONS.UPDATE_PRESCRIPTION]: ['prescriptions:update'],
  [ACTIONS.CLINICAL_NOTES]: ['appointments:update'],
  [ACTIONS.VIEW_LAB]: ['lab:view', 'lab:create'],
  [ACTIONS.ADMIN_BACKUP]: ['settings:manage'],
};

const ALL_ACTIONS = Object.values(ACTIONS);

const OPD_STAFF_PERMISSIONS = [
  ACTIONS.VIEW_OPD_DASHBOARD,
  ACTIONS.MANAGE_PATIENTS,
  ACTIONS.MANAGE_APPOINTMENTS,
  ACTIONS.MANAGE_BEDS,
  ACTIONS.VIEW_BILLING,
  ACTIONS.CREATE_BILL,
  ACTIONS.VIEW_PAYMENT_HISTORY,
];

/** Fallback when JWT permissions are missing (e.g. legacy sessions). */
const ROLE_PERMISSIONS = {
  admin: ALL_ACTIONS,
  doctor: [
    ACTIONS.CALL_PATIENT,
    ACTIONS.CONSULT,
    ACTIONS.VIEW_EMR,
    ACTIONS.PRESCRIBE,
    ACTIONS.UPDATE_PRESCRIPTION,
    ACTIONS.CLINICAL_NOTES,
    ACTIONS.VIEW_LAB,
  ],
  receptionist: [
    ACTIONS.VIEW_OPD_DASHBOARD,
    ACTIONS.MANAGE_PATIENTS,
    ACTIONS.MANAGE_APPOINTMENTS,
    ACTIONS.MANAGE_BEDS,
  ],
  opd: OPD_STAFF_PERMISSIONS,
  nurse: [ACTIONS.VIEW_OPD_DASHBOARD, ACTIONS.MANAGE_PATIENTS, ACTIONS.VIEW_EMR],
  billing: [
    ACTIONS.VIEW_OPD_DASHBOARD,
    ACTIONS.VIEW_BILLING,
    ACTIONS.CREATE_BILL,
    ACTIONS.VIEW_PAYMENT_HISTORY,
    ACTIONS.MANAGE_PATIENTS,
  ],
  lab_technician: [ACTIONS.VIEW_LAB],
  pharmacist: [
    ACTIONS.VIEW_OPD_DASHBOARD,
    ACTIONS.MANAGE_PATIENTS,
    ACTIONS.PRESCRIBE,
    ACTIONS.VIEW_EMR,
  ],
};

function normalizeSubject(subject) {
  if (subject && typeof subject === 'object' && !Array.isArray(subject)) {
    return {
      role: subject.role ?? null,
      permissions: Array.isArray(subject.permissions) ? subject.permissions : [],
    };
  }
  return { role: subject ?? null, permissions: [] };
}

function checkJwtPermissions(permissions, action) {
  const required = ACTION_BACKEND_PERMISSIONS[action];
  if (!required?.length || !permissions?.length) return false;
  return required.some((perm) => permissions.includes(perm));
}

function checkRoleFallback(role, action) {
  if (!role || !action) return false;
  const allowed = ROLE_PERMISSIONS[role];
  if (!allowed) return false;
  return allowed.includes(action);
}

/**
 * @param {string | { role?: string, permissions?: string[] }} subject
 * @param {string} action - ACTIONS.* value
 */
export function checkPermission(subject, action) {
  if (!action) return false;
  const { role, permissions } = normalizeSubject(subject);

  if (permissions.length > 0) {
    return checkJwtPermissions(permissions, action);
  }

  return checkRoleFallback(role, action);
}

export function canAccessAction(user, action) {
  return checkPermission(
    { role: user?.role, permissions: user?.permissions },
    action
  );
}

/** Direct backend permission check (e.g. patients:create). */
export function hasBackendPermission(user, permissionName) {
  const permissions = user?.permissions;
  if (Array.isArray(permissions) && permissions.length > 0) {
    return permissions.includes(permissionName);
  }
  if (user?.role === 'admin') return true;
  return false;
}
