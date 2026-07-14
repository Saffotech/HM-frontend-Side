/** Map backend audit action keys to badge tone classes (no backend changes). */

export const AUDIT_ACTION_BADGE = {
  'auth.login': 'admin-badge--info',
  'staff.register': 'admin-badge--info',
  'staff.update': 'admin-badge--info',
  'staff.activate': 'admin-badge--success',
  'staff.deactivate': 'admin-badge--warn',
  'staff.delete': 'admin-badge--danger',
  'role.create': 'admin-badge--info',
  'role.permissions_update': 'admin-badge--info',
  'settings.update': 'admin-badge--warn',
  'department.create': 'admin-badge--info',
  'department.update': 'admin-badge--info',
  REGISTER_USER: 'admin-badge--info',
  ACTIVATE_USER: 'admin-badge--success',
  DEACTIVATE_USER: 'admin-badge--warn',
  DELETE_USER: 'admin-badge--danger',
  CREATE_ROLE: 'admin-badge--info',
  ASSIGN_PERMISSIONS: 'admin-badge--info',
  UPDATE_SETTINGS: 'admin-badge--warn',
  UPDATE_USER: 'admin-badge--info',
};

export const AUDIT_ACTION_OPTIONS = [
  { value: 'all', label: 'All actions' },
  { value: 'auth.login', label: 'Auth login' },
  { value: 'staff.register', label: 'Staff register' },
  { value: 'staff.update', label: 'Staff update' },
  { value: 'staff.activate', label: 'Staff activate' },
  { value: 'staff.deactivate', label: 'Staff deactivate' },
  { value: 'staff.delete', label: 'Staff delete' },
  { value: 'role.create', label: 'Role create' },
  { value: 'role.permissions_update', label: 'Role permissions update' },
  { value: 'settings.update', label: 'Settings update' },
  { value: 'department.create', label: 'Department create' },
  { value: 'department.update', label: 'Department update' },
];

export function formatAuditActionLabel(action) {
  if (!action) return '—';
  return String(action).replace(/[._]/g, ' ');
}

export function getAuditActionBadgeClass(action) {
  return AUDIT_ACTION_BADGE[action] || 'admin-badge--info';
}
