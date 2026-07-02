/**
 * Admin API — all endpoints call the live backend via apiClient.
 */

import { apiClient } from '@/shared/api/client';
import { register as authRegister } from '@/shared/api/auth';

function buildQuery(params = {}) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    qs.set(key, String(value));
  });
  const query = qs.toString();
  return query ? `?${query}` : '';
}

/** GET /admin/dashboard */
export async function getAdminDashboard() {
  return apiClient('/admin/dashboard');
}

/** GET /users/ */
export async function listStaff(params = {}) {
  const { search, role_id: roleId, is_active: isActive, page, limit } = params;
  const query = buildQuery({
    search: search?.trim() || undefined,
    role_id: roleId,
    is_active: isActive === true || isActive === false ? isActive : undefined,
    page,
    limit,
  });
  return apiClient(`/users/${query}`);
}

/** GET /users/{id} */
export async function getStaffById(userId) {
  return apiClient(`/users/${userId}`);
}

/** PATCH /users/{id} */
export async function updateStaff(userId, body) {
  return apiClient(`/users/${userId}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

/** PATCH /users/{id}/activate */
export async function activateStaff(userId, isActive) {
  return apiClient(`/users/${userId}/activate`, {
    method: 'PATCH',
    body: JSON.stringify({ is_active: isActive }),
  });
}

/** DELETE /users/{id} */
export async function deleteStaff(userId) {
  return apiClient(`/users/${userId}`, {
    method: 'DELETE',
  });
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
export async function listDepartments(params = {}) {
  const query = buildQuery({
    is_active:
      params.is_active === true || params.is_active === false
        ? params.is_active
        : undefined,
  });
  const data = await apiClient(`/departments/${query}`);
  const rows = data?.departments ?? data;
  return Array.isArray(rows) ? rows : [];
}

/** GET /departments/{id} */
export async function getDepartmentById(departmentId) {
  return apiClient(`/departments/${departmentId}`);
}

/** POST /departments/ */
export async function createDepartment(body) {
  return apiClient('/departments/', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/** PATCH /departments/{id} */
export async function updateDepartment(departmentId, body) {
  return apiClient(`/departments/${departmentId}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

/** GET /admin/reports/overview */
export async function getReportsOverview(params = {}) {
  const query = buildQuery({
    from_date: params.from_date,
    to_date: params.to_date,
  });
  return apiClient(`/admin/reports/overview${query}`);
}

/** GET /admin/reports/visits */
export async function getReportsVisits(params = {}) {
  const query = buildQuery({
    from_date: params.from_date,
    to_date: params.to_date,
    department_id: params.department_id,
    page: params.page,
    limit: params.limit,
  });
  return apiClient(`/admin/reports/visits${query}`);
}

/** POST /roles/ */
export async function createRole(body) {
  return apiClient('/roles/', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/** POST /roles/permissions */
export async function createPermission(body) {
  return apiClient('/roles/permissions', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/** POST /roles/{role_id}/permissions */
export async function assignRolePermissions(roleId, permissionIds) {
  return apiClient(`/roles/${roleId}/permissions`, {
    method: 'POST',
    body: JSON.stringify({ permission_ids: permissionIds }),
  });
}
