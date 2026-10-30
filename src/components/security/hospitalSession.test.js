import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import { performHospitalCleanup } from './hospitalCleanup.js';
import {
  hospitalDisplayName,
  identitiesDiffer,
  isValidTenantId,
  mergeAuthenticatedProfile,
} from './hospitalIdentity.js';
import {
  classifyForbidden,
  loginRouteForRole,
  resolveSessionFailure,
  sanitizeRequestHeaders,
  sessionActionForHttpStatus,
  sessionCleanupNotifiesServer,
  shouldApplyHospitalSessionGuard,
  shouldRedirectToHospitalLogin,
} from './httpSessionPolicy.js';
import { setHospitalStorageScope } from './hospitalStorageScope.js';
import { queryKeys } from '../../shared/api/queryKeys.js';
import { beginNewSessionEpoch, currentSessionEpoch, isSessionCurrent } from './sessionEpoch.js';
import {
  clearAllConsultationDrafts,
  loadConsultationDraft,
  saveConsultationDraft,
} from '../../shared/utils/consultationDraftStorage.js';

const here = fileURLToPath(new URL('.', import.meta.url));

function readSrc(relativePath) {
  return readFileSync(new URL(relativePath, import.meta.url), 'utf8');
}

const hospitalA = {
  user_id: 11,
  id: 11,
  tenant_id: 1,
  role: 'doctor',
  permissions: ['patients:view'],
  hospital: { id: 1, name: 'Hospital A', code: 'HA', stale: true },
  first_name: 'Asha',
  last_name: 'Patel',
};

const meB = {
  user_id: 22,
  email: 'b@hospital-b.test',
  first_name: 'Bela',
  last_name: 'Shah',
  role: 'doctor',
  permissions: ['patients:view', 'notes:create'],
  tenant_id: 2,
  hospital: { id: 2, name: 'Hospital B', code: 'HB' },
};

function createMemoryStorage() {
  const store = new Map();
  const storage = {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: (key) => store.delete(key),
    key: (index) => Array.from(store.keys())[index] ?? null,
    get length() {
      return store.size;
    },
  };
  return { store, storage };
}

describe('valid tenant login', () => {
  it('keeps user, tenant, hospital, role, and permissions from the authenticated profile', () => {
    const profile = mergeAuthenticatedProfile(null, {
      user_id: 7,
      email: 'ada@city.test',
      first_name: 'Ada',
      last_name: 'Lovelace',
      role: 'opd_billing',
      permissions: ['billing:view'],
      tenant_id: 3,
      hospital: { id: 3, name: 'City Hospital', code: 'CTY' },
    }, {
      role: 'opd_billing',
      permissions: ['billing:view'],
      first_name: 'Ada',
    }, 'access-token');

    assert.equal(isValidTenantId(profile.tenant_id), true);
    assert.equal(profile.user_id, 7);
    assert.equal(profile.id, 7);
    assert.equal(profile.tenant_id, 3);
    assert.deepEqual(profile.hospital, { id: 3, name: 'City Hospital', code: 'CTY' });
    assert.equal(profile.role, 'opd');
    assert.deepEqual(profile.permissions, ['billing:view']);
    assert.equal(profile.full_name, 'Ada Lovelace');
  });
});

describe('/auth/me session restoration', () => {
  it('uses the latest profile and drops a stale hospital name', () => {
    const stale = {
      ...hospitalA,
      hospital: { id: 3, name: 'Old City Name', code: 'OLD' },
      permissions: ['stale:permission'],
      role: 'nurse',
    };
    const me = {
      user_id: 7,
      first_name: 'Ada',
      last_name: 'Lovelace',
      role: 'doctor',
      permissions: ['patients:view'],
      tenant_id: 3,
      hospital: { id: 3, name: 'City Hospital', code: 'CTY' },
    };

    const profile = mergeAuthenticatedProfile(stale, me, { role: stale.role }, 'access-token');

    assert.equal(profile.user_id, 7);
    assert.equal(profile.tenant_id, 3);
    assert.equal(profile.role, 'doctor');
    assert.deepEqual(profile.permissions, ['patients:view']);
    assert.equal(profile.hospital.name, 'City Hospital');
    assert.equal(profile.hospital.code, 'CTY');
    assert.equal(profile.hospital.stale, undefined);
    assert.equal(identitiesDiffer(stale, profile), true);
  });
});

describe('null or missing tenant rejection', () => {
  it('rejects missing, null, and invalid tenant ids', () => {
    [null, undefined, '', '   ', 'null', 'undefined', 0, -1, 1.5, Number.NaN, false, {}].forEach((value) => {
      assert.equal(isValidTenantId(value), false, `expected invalid: ${String(value)}`);
    });
    assert.equal(isValidTenantId(4), true);
    assert.equal(isValidTenantId('8'), true);
  });

  it('does not keep the previous hospital when /auth/me returns a null tenant', () => {
    const profile = mergeAuthenticatedProfile(hospitalA, {
      user_id: 11,
      role: 'doctor',
      permissions: ['patients:view'],
      tenant_id: null,
      hospital: null,
    }, null, 'access-token');

    assert.equal(profile.tenant_id, null);
    assert.equal(profile.hospital, null);
    assert.equal(isValidTenantId(profile.tenant_id), false);
    assert.equal(resolveSessionFailure('invalid_tenant').cleanup, true);
    assert.match(resolveSessionFailure('invalid_tenant').message, /hospital/i);
  });
});

describe('hospital name display', () => {
  it('reads the current hospital name and hides a missing one', () => {
    assert.equal(hospitalDisplayName({ hospital: { name: '  Hospital B  ' } }), 'Hospital B');
    assert.equal(hospitalDisplayName({ hospital: { name: '' } }), '');
    assert.equal(hospitalDisplayName({ hospital: null }), '');
    assert.equal(hospitalDisplayName(null), '');
    assert.equal(hospitalDisplayName(hospitalA), 'Hospital A');
  });

  it('places the live hospital name under the existing wordmark in hospital shells', () => {
    const roleLayout = readSrc('../../shared/components/layout/RoleLayout.jsx');
    const opdLayout = readSrc('../../shared/components/common/Layout.jsx');
    const doctorShell = readSrc('../../features/doctor/components/DoctorShell.jsx');
    const brand = readSrc('../../shared/components/common/BrandName.jsx');

    [roleLayout, opdLayout, doctorShell].forEach((source) => {
      assert.match(source, /<BrandName/);
      assert.match(source, /<HospitalName/);
    });
    assert.match(brand, /BRAND_NAME_LEAD/);
    assert.match(brand, /BRAND_NAME_TRAIL/);
    assert.doesNotMatch(doctorShell, /Hospital A|Hospital B|City Hospital/);
  });
});

describe('hospital switch in the same tab', () => {
  it('clears hospital A before hospital B can render', () => {
    const { store, storage } = createMemoryStorage();
    globalThis.window = { localStorage: storage };
    store.set('saffocare.platform.v1', '{"platformSession":true}');
    store.set('doctor:consultation-draft:11:55', '{"symptoms":"old"}');
    saveConsultationDraft(55, 11, { symptoms: 'fever from A' });

    const cache = new Map([['patients', [{ hospital: 'A' }]]]);
    const stored = {
      accessToken: 'token-a',
      refreshToken: 'refresh-a',
      user: hospitalA,
    };
    let renderedName = hospitalDisplayName(hospitalA);

    performHospitalCleanup({
      dropRenderedSession() {
        renderedName = '';
      },
      clearStoredSession() {
        stored.accessToken = null;
        stored.refreshToken = null;
        stored.user = null;
      },
      clearDrafts: clearAllConsultationDrafts,
      cancelQueries() {},
      clearQueries() {
        cache.clear();
      },
    });

    assert.equal(renderedName, '');
    assert.equal(stored.user, null);
    assert.equal(stored.accessToken, null);
    assert.equal(stored.refreshToken, null);
    assert.equal(cache.size, 0);
    assert.equal(loadConsultationDraft(55, 11), null);
    assert.equal(store.has('doctor:consultation-draft:11:55'), false);
    assert.equal(store.get('saffocare.platform.v1'), '{"platformSession":true}');

    performHospitalCleanup({
      clearQueries() {
        cache.clear();
      },
      clearDrafts: clearAllConsultationDrafts,
    });

    const profile = mergeAuthenticatedProfile(null, meB, meB, 'token-b');
    assert.equal(isValidTenantId(profile.tenant_id), true);
    assert.equal(identitiesDiffer(hospitalA, profile), true);
    renderedName = hospitalDisplayName(profile);
    stored.user = profile;
    stored.accessToken = 'token-b';

    assert.equal(renderedName, 'Hospital B');
    assert.equal(stored.user.hospital.name, 'Hospital B');
    assert.notEqual(stored.user.hospital.name, 'Hospital A');
    assert.equal(cache.size, 0);
  });
});

describe('query cache cleanup', () => {
  it('clears stored session, drafts, and queries for every terminal hospital session', () => {
    ['logout', 'timeout', 'refresh_failed', 'invalid_restore', 'hospital_inactive', 'hospital_unlinked', 'account_deactivated', 'identity_change'].forEach((kind) => {
      const calls = [];
      const plan = resolveSessionFailure(kind);
      assert.equal(plan.cleanup, true, kind);
      if (plan.cleanup) {
        performHospitalCleanup({
          clearStoredSession: () => calls.push('session'),
          clearDrafts: () => calls.push('drafts'),
          cancelQueries: () => calls.push('cancel'),
          clearQueries: () => calls.push('clear'),
        });
      }
      assert.deepEqual(calls, ['session', 'drafts', 'cancel', 'clear']);
    });

    assert.equal(resolveSessionFailure('permission_denied').cleanup, false);
    assert.equal(resolveSessionFailure('refresh_failed').notifyServer, false);
    assert.equal(resolveSessionFailure('timeout').notifyServer, true);
  });

  it('is the cleanup path used by login, logout, and failed refresh', () => {
    const authContext = readSrc('./AuthContext.jsx');
    const sessionTimeout = readSrc('./SessionTimeout.jsx');
    assert.match(authContext, /performHospitalCleanup/);
    assert.match(authContext, /cleanupHospitalState\(\)/);
    assert.match(authContext, /requestHospitalLogout/);
    assert.match(authContext, /resolveSessionFailure\('refresh_failed'\)/);
    assert.match(sessionTimeout, /logout\(\)/);
    assert.match(sessionTimeout, /shouldApplyHospitalSessionGuard/);
  });
});

describe('permission denied stays signed in', () => {
  it('does not treat a permission error as a terminal session', () => {
    const detail = 'Permission denied: patients:view required';
    assert.equal(classifyForbidden(detail), 'permission_denied');
    assert.equal(sessionActionForHttpStatus(403, detail), 'keep');
    assert.equal(resolveSessionFailure('permission_denied').cleanup, false);
    assert.match(resolveSessionFailure('permission_denied').message, /permission/i);
  });
});

describe('inactive hospital and deactivated account', () => {
  it('ends the session only for explicit terminal account or hospital states', () => {
    assert.equal(sessionActionForHttpStatus(403, 'Hospital is inactive'), 'logout');
    assert.equal(resolveSessionFailure('hospital_inactive').cleanup, true);
    assert.match(resolveSessionFailure('hospital_inactive').message, /inactive/i);

    assert.equal(classifyForbidden('This account is not linked to a hospital'), 'hospital_unlinked');
    assert.equal(sessionActionForHttpStatus(403, 'This account is not linked to a hospital'), 'logout');
    assert.equal(resolveSessionFailure('hospital_unlinked').cleanup, true);
    assert.equal(sessionCleanupNotifiesServer('hospital_unlinked'), true);
    assert.match(resolveSessionFailure('hospital_unlinked').message, /not linked to a hospital/i);
    assert.notEqual(classifyForbidden('This account is not linked to a hospital'), 'permission_denied');
    assert.notEqual(classifyForbidden('This account is not linked to a hospital'), 'other');

    assert.equal(sessionActionForHttpStatus(403, 'Account is deactivated'), 'logout');
    assert.equal(sessionActionForHttpStatus(403, 'Account is inactive'), 'logout');
    assert.equal(resolveSessionFailure('account_deactivated').cleanup, true);

    assert.equal(sessionActionForHttpStatus(403, 'Selected nurse is inactive'), 'keep');
    assert.equal(sessionActionForHttpStatus(403, 'Delete disabled by Administrator.'), 'keep');
    assert.equal(sessionActionForHttpStatus(401, 'Could not validate credentials'), 'refresh_or_logout');
  });
});

describe('no client-supplied tenant', () => {
  it('strips tenant headers and does not add a tenant to auth requests', () => {
    const headers = sanitizeRequestHeaders(
      {
        'X-Tenant': '2',
        'X-Hospital-ID': '9',
        Accept: 'application/json',
      },
      { authToken: 'abc' }
    );

    assert.equal(headers['X-Tenant'], undefined);
    assert.equal(headers['X-Hospital-ID'], undefined);
    assert.equal(headers['x-tenant'], undefined);
    assert.equal(headers.Accept, 'application/json');
    assert.equal(headers.Authorization, 'Bearer abc');

    const refreshHeaders = sanitizeRequestHeaders({}, {
      authToken: 'abc',
      isRefreshRequest: true,
    });
    assert.equal(refreshHeaders.Authorization, undefined);

    const client = readSrc('../../shared/api/client.js');
    const auth = readSrc('../../shared/api/auth.js');
    assert.match(client, /sanitizeRequestHeaders/);
    assert.match(client, /\$\{API_BASE_URL\}\$\{API_PREFIX\}\$\{endpoint\}/);
    assert.doesNotMatch(client, /X-Tenant|X-Hospital-ID|tenant_id/);
    assert.doesNotMatch(auth, /tenant_id|X-Tenant|X-Hospital-ID/);
    assert.match(auth, /JSON\.stringify\(trimmed\)/);
    assert.match(auth, /\/auth\/logout/);
    assert.match(auth, /skipSessionLogout:\s*true/);
    assert.match(client, /_retriedAfterRefresh/);
    assert.match(client, /export async function apiSessionRequest/);
    assert.match(client, /omitContentType:\s*true/);
    assert.match(client, /responseType === 'blob'/);
    assert.equal((client.match(/async function refreshSessionTokens/g) || []).length, 1);

    const fileHeaders = sanitizeRequestHeaders(
      { 'Content-Type': 'application/json', 'X-Tenant': '4' },
      { authToken: 'file-token', omitContentType: true },
    );
    assert.equal(fileHeaders['Content-Type'], undefined);
    assert.equal(fileHeaders['X-Tenant'], undefined);
    assert.equal(fileHeaders.Authorization, 'Bearer file-token');
  });

  it('discards a file response after the hospital session changes', () => {
    const epochAtStart = currentSessionEpoch();
    beginNewSessionEpoch();
    assert.equal(isSessionCurrent(epochAtStart), false);

    const client = readSrc('../../shared/api/client.js');
    const blobCheck = client.indexOf("responseType === 'blob'");
    const blobEpoch = client.indexOf('if (!isSessionCurrent(epochAtStart)) throw supersededSessionError();', blobCheck);
    assert.ok(blobCheck > 0);
    assert.ok(blobEpoch > blobCheck);

    const uploads = [
      '../../features/manager/api/profile.js',
      '../../features/doctor/api/profile.js',
      '../../features/doctor/api/labs.js',
      '../../features/nurse/api/profile.js',
      '../../features/nurse/api/nurse.js',
      '../../features/lab/api/profile.js',
      '../../features/lab/api/lab.js',
      '../../features/ipd/api/profile.js',
      '../../features/opd/api/profile.js',
      '../../features/pharmacy/api/profile.js',
      '../../features/receptionist/api/profile.js',
      '../../features/admin/api/profile.js',
    ];
    uploads.forEach((relativePath) => {
      const source = readSrc(relativePath);
      assert.match(source, /apiSessionRequest/);
      assert.doesNotMatch(source, /await fetch\(/);
    });
    assert.match(readSrc('../../features/manager/api/profile.js'), /formData\.append\('file', file\)/);
    assert.match(readSrc('../../features/lab/api/lab.js'), /\/lab\/orders\/\$\{orderId\}\/upload-file/);
    assert.match(readSrc('../../features/doctor/api/labs.js'), /\/lab-tests\/\$\{testId\}\/report\/file/);
    assert.match(readSrc('../../features/nurse/api/nurse.js'), /\/nurse\/lab-reports\/\$\{reportId\}\/file/);
  });
});

describe('platform admin stays independent', () => {
  it('does not apply the hospital session guard to /platform', () => {
    assert.equal(shouldApplyHospitalSessionGuard('/platform'), false);
    assert.equal(shouldApplyHospitalSessionGuard('/platform/crm'), false);
    assert.equal(shouldApplyHospitalSessionGuard('/dashboard'), true);
    assert.equal(shouldRedirectToHospitalLogin('/platform/hospitals', ['/login']), false);
    assert.equal(shouldRedirectToHospitalLogin('/login', ['/login']), false);
    assert.equal(shouldRedirectToHospitalLogin('/dashboard', ['/login']), true);
    assert.equal(loginRouteForRole('receptionist', {
      superAdmin: '/super-admin/login',
      receptionist: '/receptionist/login',
      default: '/login',
    }), '/login');
    assert.equal(loginRouteForRole('platform_admin', {
      default: '/login',
    }), '/login');
    assert.equal(loginRouteForRole('super_admin', {
      default: '/login',
    }), '/login');

    const platform = readSrc('../../features/Platform Admin/shared/context/PlatformContext.jsx');
    const storedSession = readSrc('./authSession.js');
    assert.match(platform, /saffocare\.platform\.v1/);
    assert.doesNotMatch(storedSession, /saffocare\.platform\.v1/);
    assert.match(storedSession, /ACCESS_TOKEN/);
    assert.match(storedSession, /REFRESH_TOKEN/);
    assert.match(storedSession, /STORAGE_KEYS\.USER/);

    const route = readSrc('./ProtectedRoute.jsx');
    assert.match(route, /shouldApplyHospitalSessionGuard/);
    assert.match(route, /isValidTenantId/);
    assert.match(route, /Outlet key=\{sessionKey\}/);
  });
});

describe('stale responses after an identity change', () => {
  it('invalidates the epoch before the next hospital session is applied', () => {
    const previousEpoch = beginNewSessionEpoch();
    const nextEpoch = beginNewSessionEpoch();
    assert.equal(isSessionCurrent(previousEpoch), false);
    assert.equal(isSessionCurrent(nextEpoch), true);
  });

  it('replaces permissions without dropping or reusing another hospital', () => {
    const sameHospital = mergeAuthenticatedProfile(hospitalA, {
      ...hospitalA,
      permissions: [],
      hospital: { id: 1, name: 'Hospital A', code: 'HA' },
    }, null, 'token-a');
    assert.deepEqual(sameHospital.permissions, []);
    assert.equal(sameHospital.hospital.name, 'Hospital A');
    assert.equal(identitiesDiffer(hospitalA, sameHospital), false);

    const renamed = mergeAuthenticatedProfile(hospitalA, {
      user_id: 11,
      tenant_id: 1,
      role: 'doctor',
      permissions: ['patients:view'],
      hospital: { id: 1, name: 'Hospital A West', code: 'HA' },
    }, null, 'token-a');
    assert.equal(renamed.hospital.name, 'Hospital A West');
    assert.equal(identitiesDiffer(hospitalA, renamed), false);

    const omitted = mergeAuthenticatedProfile(hospitalA, {
      user_id: 11,
      permissions: ['patients:view'],
    }, null, 'token-a');
    assert.equal(omitted.hospital.name, 'Hospital A');
    assert.equal(omitted.tenant_id, 1);
  });
});

describe('hospital query scope', () => {
  it('keeps one hospital cache key from matching another hospital', () => {
    setHospitalStorageScope({ tenantId: 1, userId: 11 });
    const patientsA = queryKeys.patients.list({ page: 1 });
    const billsA = queryKeys.bills.invoice(9);
    const fileA = queryKeys.lab.report(4);
    const handoverA = queryKeys.nurse.handovers({ page: 1 });
    const rosterA = queryKeys.admin.workforceRoster({ week: 1 });
    const dispenseA = queryKeys.pharmacy.history({ page: 1 });
    const visitsA = [...queryKeys.doctor.patients.visits, { limit: 100 }];

    setHospitalStorageScope({ tenantId: 2, userId: 22 });
    const patientsB = queryKeys.patients.list({ page: 1 });
    const fileB = queryKeys.lab.report(4);

    assert.deepEqual(patientsA.slice(0, 3), ['patients', 'list', { page: 1 }]);
    assert.deepEqual(patientsA.at(-1), { tenantId: 1, userId: 11 });
    assert.deepEqual(patientsB.at(-1), { tenantId: 2, userId: 22 });
    assert.notDeepEqual(patientsA, patientsB);
    assert.notDeepEqual(fileA, fileB);
    assert.equal(queryKeys.patients.all[0], 'patients');
    assert.equal(queryKeys.patients.all.length, 1);
    assert.equal(billsA[0], 'bills');
    assert.equal(handoverA[1], 'handovers');
    assert.equal(rosterA[2], 'roster');
    assert.equal(dispenseA[1], 'history');
    assert.equal(visitsA[2], 'visits');
    assert.deepEqual(visitsA[3], { tenantId: 1, userId: 11 });
    assert.deepEqual(visitsA[4], { limit: 100 });
    assert.deepEqual(queryKeys.opd.settings, ['opd', 'settings']);
    assert.deepEqual(queryKeys.superAdmin.profile, ['super-admin', 'profile']);
    setHospitalStorageScope(null);
  });
});

describe('module wiring', () => {
  it('loads the security modules from this frontend folder', () => {
    assert.match(here, /components[\\/]security/);
  });
});
