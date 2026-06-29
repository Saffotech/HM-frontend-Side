/**
 * Dummy admin data — mirrors HM-Backend admin_schema shapes.
 * Replace with real API calls in features/admin/api/admin.js when wiring backend.
 */

export const MOCK_ROLES = [
  {
    id: 1,
    name: 'admin',
    permissions: ['users:list', 'users:create', 'users:delete', 'users:activate', 'roles:create', 'opd:view'],
  },
  {
    id: 2,
    name: 'doctor',
    permissions: ['patients:view', 'prescriptions:create', 'prescriptions:view', 'appointments:view'],
  },
  {
    id: 3,
    name: 'nurse',
    permissions: ['nurse_vitals:view', 'nurse_vitals:create', 'nurse_medication:view', 'emergency_alerts:view'],
  },
  {
    id: 4,
    name: 'opd_billing',
    permissions: ['patients:view', 'opd:view', 'billing:view', 'billing:create'],
  },
  {
    id: 5,
    name: 'pharmacist',
    permissions: ['prescriptions:view', 'prescriptions:dispense'],
  },
];

export const MOCK_DEPARTMENTS = [
  { id: 1, name: 'General Medicine', code: 'GEN' },
  { id: 2, name: 'Cardiology', code: 'CARD' },
  { id: 3, name: 'Orthopedics', code: 'ORTH' },
  { id: 4, name: 'Pediatrics', code: 'PED' },
  { id: 5, name: 'Gynecology', code: 'GYN' },
];

/** In-memory staff records (mutable for mock CRUD). */
let mockStaffStore = [
  {
    id: 1,
    first_name: 'System',
    last_name: 'Admin',
    email: 'admin@hospital.com',
    role_id: 1,
    role_name: 'admin',
    department_id: null,
    department_name: null,
    is_active: true,
    last_login: '2026-06-22T09:15:00+05:30',
    created_at: '2026-01-10T08:00:00+05:30',
    phone: '9876500001',
    login_count: 128,
  },
  {
    id: 2,
    first_name: 'Amaresh',
    last_name: 'Maurya',
    email: 'doctor@hospital.com',
    role_id: 2,
    role_name: 'doctor',
    department_id: 1,
    department_name: 'General Medicine',
    is_active: true,
    last_login: '2026-06-21T14:30:00+05:30',
    created_at: '2026-02-15T10:00:00+05:30',
    phone: '9876500002',
    login_count: 84,
  },
  {
    id: 3,
    first_name: 'Priya',
    last_name: 'Sharma',
    email: 'nurse@hospital.com',
    role_id: 3,
    role_name: 'nurse',
    department_id: 1,
    department_name: 'General Medicine',
    is_active: true,
    last_login: '2026-06-22T07:45:00+05:30',
    created_at: '2026-03-01T09:00:00+05:30',
    phone: '9876500003',
    login_count: 56,
  },
  {
    id: 4,
    first_name: 'Ravi',
    last_name: 'Singh',
    email: 'opd@hospital.com',
    role_id: 4,
    role_name: 'opd_billing',
    department_id: null,
    department_name: null,
    is_active: true,
    last_login: '2026-06-20T11:00:00+05:30',
    created_at: '2026-03-20T08:30:00+05:30',
    phone: '9876500004',
    login_count: 42,
  },
  {
    id: 5,
    first_name: 'Nilesh',
    last_name: 'Patel',
    email: 'pharmacist@hospital.com',
    role_id: 5,
    role_name: 'pharmacist',
    department_id: null,
    department_name: null,
    is_active: true,
    last_login: '2026-06-22T08:20:00+05:30',
    created_at: '2026-04-05T09:15:00+05:30',
    phone: '9876500005',
    login_count: 31,
  },
  {
    id: 6,
    first_name: 'Sunita',
    last_name: 'Verma',
    email: 'sunita.nurse@hospital.com',
    role_id: 3,
    role_name: 'nurse',
    department_id: 4,
    department_name: 'Pediatrics',
    is_active: false,
    last_login: '2026-05-10T16:00:00+05:30',
    created_at: '2026-04-18T11:00:00+05:30',
    phone: '9876500006',
    login_count: 12,
  },
];

export function getMockStaffStore() {
  return mockStaffStore;
}

export function setMockStaffStore(next) {
  mockStaffStore = next;
}

export function buildMockDashboard(staff) {
  const active = staff.filter((s) => s.is_active).length;
  const byRole = MOCK_ROLES.map((role) => ({
    role_id: role.id,
    role_name: role.name,
    count: staff.filter((s) => s.role_id === role.id).length,
  }));

  return {
    total_staff: staff.length,
    active_staff: active,
    inactive_staff: staff.length - active,
    total_departments: MOCK_DEPARTMENTS.length,
    total_roles: MOCK_ROLES.length,
    staff_by_role: byRole,
  };
}
