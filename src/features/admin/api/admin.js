/**
 * Admin API — staff register, roles, and departments use live backend;
 * other endpoints remain mock until wired.
 */

import { apiClient } from '@/shared/api/client';
import { register as authRegister } from '@/shared/api/auth';
import {
  MOCK_ROLES,
  MOCK_DEPARTMENTS,
  buildMockDashboard,
  getMockStaffStore,
  setMockStaffStore,
} from '@/features/admin/data/mockAdminData';

const MOCK_DELAY_MS = 350;

function delay(ms = MOCK_DELAY_MS) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function roleById(roleId) {
  return MOCK_ROLES.find((r) => r.id === roleId) ?? null;
}

function departmentById(deptId) {
  return MOCK_DEPARTMENTS.find((d) => d.id === deptId) ?? null;
}

function enrichStaff(user) {
  const role = roleById(user.role_id);
  const dept = departmentById(user.department_id);
  return {
    ...user,
    role_name: role?.name ?? user.role_name ?? null,
    department_name: dept?.name ?? user.department_name ?? null,
  };
}

/** GET /admin/dashboard */
export async function getAdminDashboard() {
  await delay();
  return buildMockDashboard(getMockStaffStore());
}

/** GET /users/ */
export async function listStaff(params = {}) {
  await delay();
  const {
    search,
    role_id: roleId,
    is_active: isActive,
    page = 1,
    limit = 20,
  } = params;

  let rows = [...getMockStaffStore()];

  if (search) {
    const term = search.trim().toLowerCase();
    rows = rows.filter(
      (s) =>
        s.first_name.toLowerCase().includes(term) ||
        (s.last_name || '').toLowerCase().includes(term) ||
        s.email.toLowerCase().includes(term)
    );
  }

  if (roleId != null) {
    rows = rows.filter((s) => s.role_id === Number(roleId));
  }

  if (isActive === true || isActive === false) {
    rows = rows.filter((s) => s.is_active === isActive);
  } else if (isActive === 'true') {
    rows = rows.filter((s) => s.is_active);
  } else if (isActive === 'false') {
    rows = rows.filter((s) => !s.is_active);
  }

  const total = rows.length;
  const offset = (page - 1) * limit;
  const staff = rows.slice(offset, offset + limit).map(enrichStaff);

  return { total, page, limit, staff };
}

/** GET /users/{id} */
export async function getStaffById(userId) {
  await delay();
  const found = getMockStaffStore().find((s) => s.id === Number(userId));
  if (!found) {
    const err = new Error('Staff member not found');
    err.status = 404;
    throw err;
  }
  return enrichStaff(found);
}

/** PATCH /users/{id} */
export async function updateStaff(userId, body) {
  await delay();
  const store = getMockStaffStore();
  const index = store.findIndex((s) => s.id === Number(userId));
  if (index < 0) {
    const err = new Error('Staff member not found');
    err.status = 404;
    throw err;
  }

  const updates = { ...body };
  if (updates.department_id === null) {
    updates.department_name = null;
  } else if (updates.department_id != null) {
    updates.department_name = departmentById(updates.department_id)?.name ?? null;
  }
  if (updates.role_id != null) {
    updates.role_name = roleById(updates.role_id)?.name ?? null;
  }

  const next = enrichStaff({ ...store[index], ...updates });
  const copy = [...store];
  copy[index] = next;
  setMockStaffStore(copy);
  return next;
}

/** PATCH /users/{id}/activate */
export async function activateStaff(userId, isActive, actorId) {
  await delay();
  if (!isActive && Number(actorId) === Number(userId)) {
    const err = new Error('You cannot deactivate your own account');
    err.status = 400;
    throw err;
  }
  return updateStaff(userId, { is_active: isActive });
}

/** DELETE /users/{id} */
export async function deleteStaff(userId, actorId) {
  await delay();
  if (Number(actorId) === Number(userId)) {
    const err = new Error('You cannot delete your own account');
    err.status = 400;
    throw err;
  }
  const copy = getMockStaffStore().filter((s) => s.id !== Number(userId));
  if (copy.length === getMockStaffStore().length) {
    const err = new Error('Staff member not found');
    err.status = 404;
    throw err;
  }
  setMockStaffStore(copy);
  return { message: 'Staff deleted successfully', user_id: Number(userId) };
}

/** POST /auth/register */
export async function registerStaff(body) {
  return authRegister(body);
}

/** GET /roles/ */
export async function listRoles() {
  const data = await apiClient('/roles/');
  return Array.isArray(data) ? data : [];
}

/** GET /departments/ */
export async function listDepartments() {
  const data = await apiClient('/departments/');
  const rows = data?.departments ?? data;
  return Array.isArray(rows) ? rows : [];
}
