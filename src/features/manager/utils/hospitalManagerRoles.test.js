import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  filterHospitalAdminRegisterRoles,
  filterHospitalOwnerRegisterRoles,
  filterHospitalRoleRecords,
  filterHospitalAuditEntries,
  filterHospitalStaffRecords,
} from './hospitalManagerRoles.js';
import { formatRoleLabel } from './formatRoleLabel.js';

const roles = [
  { id: 1, name: 'doctor' },
  { id: 2, name: 'manager' },
  { id: 3, name: 'admin' },
  { id: 4, name: 'super_admin' },
  { id: 5, name: 'platform_admin' },
  { id: 6, name: 'crm' },
  { id: 7, name: 'accountant' },
  { id: 8, name: 'nurse' },
];

describe('hospital staff role dropdowns', () => {
  it('lets the hospital admin assign one manager and clinical staff only', () => {
    const names = filterHospitalOwnerRegisterRoles(roles).map((role) => role.name);
    assert.deepEqual(names, ['doctor', 'manager', 'nurse']);
    assert.equal(names.filter((name) => name === 'manager').length, 1);
    assert.equal(names.includes('admin'), false);
    assert.equal(names.includes('platform_admin'), false);
    assert.equal(names.includes('crm'), false);
    assert.equal(names.includes('accountant'), false);
  });

  it('keeps a manager from assigning manager, admin, or platform roles', () => {
    const names = filterHospitalAdminRegisterRoles(roles).map((role) => role.name);
    assert.deepEqual(names, ['doctor', 'nurse']);
  });

  it('labels the hospital admin as Admin and hides platform accounts from staff lists', () => {
    assert.equal(formatRoleLabel('admin'), 'Admin');
    assert.equal(formatRoleLabel('manager'), 'Manager');
    const visible = filterHospitalStaffRecords([
      { id: 1, role_name: 'admin', email: 'rahul.admin@example.com' },
      { id: 2, role: 'platform_admin' },
      { id: 3, role_name: 'crm' },
      { id: 4, role_name: 'accountant' },
      { id: 5, role_name: 'doctor' },
    ]).map((user) => user.id);
    assert.deepEqual(visible, [1, 5]);
  });

  it('hides organization roles from the hospital roles page', () => {
    const names = filterHospitalRoleRecords([
      { id: 1, name: 'pharmacist' },
      { id: 2, name: 'accountant' },
      { id: 3, name: 'crm' },
      { id: 4, name: 'manager' },
      { id: 5, name: 'platform_admin' },
      { id: 9, name: 'super_admin' },
    ]).map((role) => role.name);
    assert.deepEqual(names, ['pharmacist', 'manager']);
    assert.equal(names.includes('super_admin'), false);
  });

  it('hides crm, accountant, and platform admin audit events', () => {
    const actors = filterHospitalAuditEntries([
      { id: 1, actor_role: 'admin', action: 'auth.login', resource_type: 'user' },
      { id: 2, actor_role: 'crm', action: 'auth.login', resource_type: 'user' },
      { id: 3, actor_role: 'accountant', action: 'auth.logout', resource_type: 'user' },
      { id: 4, actor_role: 'platform_admin', action: 'auth.login', resource_type: 'user' },
      { id: 5, actor_role: 'manager', action: 'lead.create', resource_type: 'lead' },
      { id: 6, actor_role: 'doctor', action: 'patient.update', resource_type: 'patient' },
    ]).map((entry) => entry.id);
    assert.deepEqual(actors, [1, 6]);
  });

  it('keeps the current role when editing an existing account', () => {
    const names = filterHospitalOwnerRegisterRoles(roles, { includeRoleId: 3 }).map(
      (role) => role.name,
    );
    assert.equal(names.includes('admin'), true);
    assert.equal(names.includes('platform_admin'), false);
  });
});
