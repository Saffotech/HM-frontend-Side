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
import { normalizeRole } from '../utils/roleUtils.js';
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
