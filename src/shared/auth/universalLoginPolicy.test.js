/* eslint-disable import/no-unresolved -- Node's test runner resolves node: imports. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import {
  classifyLoginBody,
  dashboardForRole,
  isReturnPathForRole,
  loginRedirectState,
  resolvePostLoginDestination,
} from './universalLoginPolicy.js';
import { getRoleLabel, hospitalEntryPath, normalizeRole } from '../utils/roleUtils.js';
import {
  createPlatformAuthStore,
  readActivePortalSession,
  saveActivePortalProfile,
} from '../../features/Platform Admin/shared/api/platformSession.js';

function memoryStorage() {
  const store = new Map();
  return {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: (key) => store.delete(key),
  };
}

function homeForRole(role) {
  const platformHome = dashboardForRole(role);
  if (platformHome) return platformHome;
  const normalized = normalizeRole(role);
  const homes = {
    doctor: '/doctor/dashboard',
    receptionist: '/receptionist/dashboard',
    pharmacist: '/pharmacy/prescriptions',
    opd: '/dashboard',
  };
  return homes[normalized] || '/dashboard';
}

function destination(role, from) {
  return resolvePostLoginDestination(role, from, homeForRole);
}

describe('universal login classification', () => {
  it('accepts platform roles when tenant_id is null', () => {
    ['platform_admin', 'crm', 'accountant'].forEach((role) => {
      const decision = classifyLoginBody({
        role,
        tenant_id: null,
        user_id: 4,
        access_token: 'token',
      });
      assert.equal(decision.realm, 'platform', role);
      assert.equal(decision.tenantId, null);
    });
    assert.equal(classifyLoginBody({ role: 'platform_admin', tenant_id: null }).portal, 'platform');
    assert.equal(classifyLoginBody({ role: 'crm', tenant_id: null }).portal, 'crm');
    assert.equal(classifyLoginBody({ role: 'accountant', tenant_id: null }).portal, 'accountant');
  });

  it('keeps hospital roles and rejects a missing tenant', () => {
    const doctor = classifyLoginBody({ role: 'doctor', tenant_id: 3 });
    assert.equal(doctor.realm, 'hospital');
    assert.equal(doctor.tenantId, 3);

    ['admin', 'nurse', 'opd_billing', 'pharmacist', 'lab_technician', 'receptionist'].forEach((role) => {
      assert.equal(classifyLoginBody({ role, tenant_id: 2 }).realm, 'hospital', role);
      const rejected = classifyLoginBody({ role, tenant_id: null });
      assert.equal(rejected.realm, 'rejected', role);
      assert.equal(rejected.reason, 'invalid_tenant');
    });
  });

  it('rejects an unknown role', () => {
    const decision = classifyLoginBody({ role: 'patient', tenant_id: null });
    assert.equal(decision.realm, 'rejected');
    assert.equal(decision.reason, 'unauthorized_role');
  });
});

describe('post-login destination', () => {
  it('sends each role to its own dashboard', () => {
    assert.equal(destination('platform_admin', null), '/platform');
    assert.equal(destination('crm', null), '/platform/crm');
    assert.equal(destination('accountant', null), '/platform/accounts');
    assert.equal(destination('doctor', null), '/doctor/dashboard');
    assert.equal(destination('opd_billing', null), '/dashboard');
    assert.equal(destination('receptionist', null), '/receptionist/dashboard');
    assert.equal(homeForRole('pharmacist'), '/pharmacy/prescriptions');
  });

  it('preserves an allowed return path and drops login or cross-role paths', () => {
    assert.equal(
      destination('platform_admin', { pathname: '/platform/hospitals', search: '?tab=1' }),
      '/platform/hospitals?tab=1',
    );
    assert.equal(destination('crm', { pathname: '/platform/hospitals' }), '/platform/crm');
    assert.equal(destination('accountant', { pathname: '/platform/crm/leads' }), '/platform/accounts');
    assert.equal(destination('doctor', { pathname: '/doctor/profile' }), '/doctor/profile');
    assert.equal(destination('doctor', { pathname: '/nurse/queue' }), '/doctor/dashboard');
    assert.equal(destination('platform_admin', { pathname: '/login' }), '/platform');
    assert.equal(destination('crm', '/platform/crm/login'), '/platform/crm');
    assert.equal(destination('doctor', 'https://evil.example/doctor'), '/doctor/dashboard');
    assert.equal(destination('doctor', '//evil.example'), '/doctor/dashboard');
    assert.equal(isReturnPathForRole('pharmacist', '/pharmacy/login'), false);
    assert.equal(isReturnPathForRole('pharmacist', '/pharmacy/prescriptions'), true);
  });

  it('does not send a protected page back to a login url', () => {
    assert.equal(loginRedirectState({ pathname: '/login' }), undefined);
    assert.equal(loginRedirectState({ pathname: '/platform/login' }), undefined);
    assert.deepEqual(loginRedirectState({ pathname: '/platform/hospitals', search: '', hash: '' }), {
      from: { pathname: '/platform/hospitals', search: '', hash: '' },
    });
  });
});

describe('hospital admin and manager stay separate', () => {
  it('does not collapse the backend admin role into manager', () => {
    assert.equal(normalizeRole('admin'), 'admin');
    assert.equal(normalizeRole('manager'), 'manager');
    assert.equal(normalizeRole('super_admin'), 'super_admin');
    assert.equal(normalizeRole('platform_admin'), 'platform_admin');
    assert.equal(normalizeRole('crm'), 'crm');
    assert.equal(normalizeRole('accountant'), 'accountant');
    assert.equal(getRoleLabel({ role: 'admin' }), 'Hospital Admin');
    assert.equal(getRoleLabel({ role: 'manager' }), 'Manager');
  });

  it('sends manager through the hospital realm and leaves platform homes unchanged', () => {
    const manager = classifyLoginBody({ role: 'manager', tenant_id: 2 });
    assert.equal(manager.realm, 'hospital');
    assert.equal(manager.role, 'manager');
    assert.equal(classifyLoginBody({ role: 'admin', tenant_id: 2 }).realm, 'hospital');
    assert.equal(classifyLoginBody({ role: 'manager', tenant_id: null }).reason, 'invalid_tenant');
    assert.equal(dashboardForRole('admin'), null);
    assert.equal(dashboardForRole('manager'), null);
    assert.equal(dashboardForRole('super_admin'), null);
    assert.equal(dashboardForRole('platform_admin'), '/platform');
    assert.equal(dashboardForRole('crm'), '/platform/crm');
    assert.equal(dashboardForRole('accountant'), '/platform/accounts');
  });

  it('keeps each role on its own panel prefix', () => {
    assert.equal(isReturnPathForRole('admin', '/admin/dashboard'), true);
    assert.equal(isReturnPathForRole('admin', '/admin/audit'), true);
    assert.equal(isReturnPathForRole('admin', '/manager/dashboard'), false);
    assert.equal(isReturnPathForRole('manager', '/manager/staff'), true);
    assert.equal(isReturnPathForRole('manager', '/admin/dashboard'), false);
    assert.equal(isReturnPathForRole('super_admin', '/admin/dashboard'), true);
    assert.equal(isReturnPathForRole('super_admin', '/admin/staff'), true);
    assert.equal(isReturnPathForRole('super_admin', '/super-admin/dashboard'), false);
    assert.equal(isReturnPathForRole('super_admin', '/manager/dashboard'), false);
    assert.equal(isReturnPathForRole('super_admin', '/platform'), false);
    assert.equal(normalizeRole('super_admin'), 'super_admin');
    assert.equal(isReturnPathForRole('platform_admin', '/platform/hospitals'), true);
    assert.equal(isReturnPathForRole('crm', '/platform/crm'), true);
    assert.equal(isReturnPathForRole('accountant', '/platform/accounts'), true);
  });

  it('registers /admin for hospital admin and /manager for the operations panel', () => {
    const managerRoutes = readFileSync(new URL('../../routes/managerRoutes.jsx', import.meta.url), 'utf8');
    const adminRoutes = readFileSync(new URL('../../routes/adminRoutes.jsx', import.meta.url), 'utf8');
    const redirect = readFileSync(new URL('../utils/authRedirect.js', import.meta.url), 'utf8');
    const guard = readFileSync(new URL('../../components/security/ProtectedRoute.jsx', import.meta.url), 'utf8');
    const login = readFileSync(new URL('../../features/manager/pages/ManagerLoginPage.jsx', import.meta.url), 'utf8');

    assert.match(redirect, /hospitalEntryPath\(normalized\)/);
    assert.doesNotMatch(redirect, /ROLES\.SUPER_ADMIN[\s\S]{0,80}ROUTES\.UNAUTHORIZED/);
    assert.doesNotMatch(redirect, /admin:\s*'manager'|normalized === ROLES\.ADMIN[\s\S]{0,40}MANAGER_DASHBOARD/);

    assert.match(managerRoutes, /allowedRoles=\{\[ROLES\.MANAGER\]\}/);
    assert.match(managerRoutes, /ROUTES\.MANAGER_DASHBOARD/);
    assert.doesNotMatch(managerRoutes, /ROUTES\.ADMIN_|path: '\/admin/);
    assert.match(adminRoutes, /OWNER_PANEL_ROLES = \[ROLES\.ADMIN, ROLES\.SUPER_ADMIN\]/);
    assert.match(adminRoutes, /ownerPanelRoutes\(OWNER_PANEL_ROLES/);
    assert.match(adminRoutes, /ROUTES\.ADMIN_DASHBOARD/);
    assert.match(adminRoutes, /path: '\/super-admin\/\*'/);
    assert.match(guard, /getAppEntryForRole\(user\.role\)/);
    assert.match(guard, /ROUTES\.UNAUTHORIZED/);
    assert.doesNotMatch(guard, /ROLES\.SUPER_ADMIN[\s\S]{0,80}ROUTES\.UNAUTHORIZED/);
    assert.match(login, /me\.role !== ROLES\.MANAGER/);
    assert.match(login, /ROUTES\.MANAGER_DASHBOARD/);
  });

  it('uses the supported /admin API paths and keeps manager profile off the admin-only route', () => {
    const root = new URL('../../features/manager/api/', import.meta.url);
    const profile = readFileSync(new URL('profile.js', root), 'utf8');
    const opd = readFileSync(new URL('opdSettings.js', root), 'utf8');
    const notes = readFileSync(new URL('notifications.js', root), 'utf8');
    const workforce = readFileSync(new URL('nurseWorkforce.js', root), 'utf8');
    const beds = readFileSync(new URL('nurseBedAllocation.js', root), 'utf8');
    const shared = readFileSync(new URL('manager.js', root), 'utf8');
    const ownerProfile = readFileSync(new URL('../../features/admin/api/profile.js', import.meta.url), 'utf8');
    const ownerAudit = readFileSync(new URL('../../features/admin/api/admin.js', import.meta.url), 'utf8');

    assert.match(profile, /\/manager\/profile/);
    assert.doesNotMatch(profile, /apiClient\('\/admin\/profile'/);
    assert.match(opd, /apiClient\('\/admin\/settings\/opd'/);
    assert.doesNotMatch(opd, /\/manager\/settings\/opd/);
    assert.match(notes, /\/admin\/notifications/);
    assert.doesNotMatch(notes, /\/manager\/notifications/);
    assert.match(workforce, /\/admin\/nurse-workforce/);
    assert.doesNotMatch(workforce, /\/manager\/nurse-workforce/);
    assert.match(beds, /\/admin\/nurse-bed-allocations/);
    assert.doesNotMatch(beds, /\/manager\/nurse-bed-allocations/);
    assert.match(shared, /apiClient\('\/admin\/dashboard'\)/);
    assert.match(shared, /\/admin\/reports\/overview/);
    assert.match(shared, /\/admin\/reports\/visits/);
    assert.doesNotMatch(shared, /\/manager\/dashboard|\/manager\/reports/);
    assert.match(ownerProfile, /apiClient\('\/admin\/profile'/);
    assert.doesNotMatch(ownerProfile, /\/super-admin\/profile/);
    assert.match(ownerAudit, /\/admin\/audit/);
    assert.doesNotMatch(ownerAudit, /\/super-admin\/audit/);
  });
});

describe('hospital owner entry', () => {
  function homeForRole(role) {
    return dashboardForRole(role) || hospitalEntryPath(role) || '/dashboard';
  }

  it('opens the owner panel for super_admin and admin, and keeps the other portals', () => {
    assert.equal(hospitalEntryPath('super_admin'), '/admin/dashboard');
    assert.equal(hospitalEntryPath('admin'), '/admin/dashboard');
    assert.equal(hospitalEntryPath('manager'), '/manager/dashboard');
    assert.equal(hospitalEntryPath('platform_admin'), null);
    assert.equal(normalizeRole('super_admin'), 'super_admin');
    assert.equal(resolvePostLoginDestination('super_admin', null, homeForRole), '/admin/dashboard');
    assert.equal(resolvePostLoginDestination('admin', null, homeForRole), '/admin/dashboard');
    assert.equal(resolvePostLoginDestination('manager', null, homeForRole), '/manager/dashboard');
    assert.equal(resolvePostLoginDestination('platform_admin', null, homeForRole), '/platform');
    assert.equal(resolvePostLoginDestination('crm', null, homeForRole), '/platform/crm');
    assert.equal(resolvePostLoginDestination('accountant', null, homeForRole), '/platform/accounts');
    assert.equal(
      resolvePostLoginDestination('super_admin', { pathname: '/admin/staff' }, homeForRole),
      '/admin/staff',
    );
    assert.equal(
      resolvePostLoginDestination('super_admin', { pathname: '/manager/dashboard' }, homeForRole),
      '/admin/dashboard',
    );
  });

  it('keeps a hospital super_admin without a tenant out of the owner panel', () => {
    const missing = classifyLoginBody({ role: 'super_admin', tenant_id: null });
    assert.equal(missing.realm, 'rejected');
    assert.equal(missing.reason, 'invalid_tenant');
    assert.equal(missing.role, 'super_admin');

    const owner = classifyLoginBody({ role: 'super_admin', tenant_id: 4 });
    assert.equal(owner.realm, 'hospital');
    assert.equal(owner.role, 'super_admin');
    assert.equal(owner.tenantId, 4);

    const unknown = classifyLoginBody({ role: 'patient', tenant_id: 4 });
    assert.equal(unknown.realm, 'rejected');
    assert.equal(unknown.reason, 'unauthorized_role');
  });
});

describe('platform session restore', () => {
  it('restores only the portal whose profile matches the platform token', () => {
    const storage = memoryStorage();
    const auth = createPlatformAuthStore(memoryStorage());
    saveActivePortalProfile('crm', {
      userId: 5,
      name: 'Meera',
      email: 'crm@saffocare.example',
      role: 'crm',
    }, storage);
    assert.equal(readActivePortalSession(storage, auth), null);

    auth.saveSession({
      accessToken: 'crm-access',
      refreshToken: 'crm-refresh',
      user: { userId: 5, role: 'crm' },
    });
    const active = readActivePortalSession(storage, auth);
    assert.equal(active.portal, 'crm');
    assert.equal(active.role, 'crm');
    assert.equal(readActivePortalSession(storage, createPlatformAuthStore(memoryStorage())), null);
  });
});

describe('login wiring', () => {
  it('starts every role at /login and keeps platform users out of hospital adopt', () => {
    const loginPage = readFileSync(new URL('../../pages/landing/LoginPage.jsx', import.meta.url), 'utf8');
    const app = readFileSync(new URL('../../App.jsx', import.meta.url), 'utf8');
    const auth = readFileSync(new URL('../../components/security/AuthContext.jsx', import.meta.url), 'utf8');
    const platformRoutes = readFileSync(new URL('../../features/Platform Admin/panels/superAdmin/SuperAdminRoutes.jsx', import.meta.url), 'utf8');
    const crmRoutes = readFileSync(new URL('../../features/Platform Admin/panels/crm/CrmRoutes.jsx', import.meta.url), 'utf8');
    const accountRoutes = readFileSync(new URL('../../features/Platform Admin/panels/accountant/AccountantRoutes.jsx', import.meta.url), 'utf8');

    assert.match(loginPage, /useUniversalSignIn/);
    assert.match(app, /PHARMACY_LOGIN[\s\S]*Navigate to=\{ROUTES\.LOGIN\}/);
    assert.match(app, /SUPER_ADMIN_LOGIN[\s\S]*Navigate to=\{ROUTES\.LOGIN\}/);
    assert.match(platformRoutes, /UNIVERSAL_LOGIN/);
    assert.match(crmRoutes, /UNIVERSAL_LOGIN/);
    assert.match(accountRoutes, /UNIVERSAL_LOGIN/);
    assert.doesNotMatch(platformRoutes, /PlatformLogin/);

    const loginStart = auth.indexOf('const login = useCallback');
    const guard = auth.indexOf('platform_realm', loginStart);
    const me = auth.indexOf('getCurrentUser(accessToken)', guard);
    assert.ok(loginStart > 0);
    assert.ok(guard > loginStart);
    assert.ok(me > guard);
  });
});
