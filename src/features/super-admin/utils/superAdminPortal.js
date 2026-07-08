import { ROLES } from '@/shared/constants';
import { DEPARTMENT_BY_ROLE } from '@/shared/utils/roleUtils';
import { decodeJwt } from '@/shared/utils/jwtHelper';

/** sessionStorage flag — super admin portal uses frontend-only demo session */
export const SUPER_ADMIN_PORTAL_SCOPE_KEY = 'super_admin_portal_scope';

/** Hardcoded demo credentials — frontend only, no backend account required */
export const DEMO_SUPER_ADMIN_CREDENTIALS = {
  email: 'superadmin@saffocare.com',
  password: 'SuperAdmin@123',
};

const DEMO_SUPER_ADMIN_EMAIL_ALIASES = new Set([
  DEMO_SUPER_ADMIN_CREDENTIALS.email.toLowerCase(),
  'superadmin@saffocare.local',
  'super_admin@saffocare.local',
]);

function base64UrlEncode(value) {
  return btoa(JSON.stringify(value))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/** Fake JWT so existing auth helpers treat the session as valid */
export function createDemoSuperAdminToken(expHours = 24 * 7) {
  const header = base64UrlEncode({ alg: 'none', typ: 'JWT' });
  const exp = Math.floor(Date.now() / 1000) + expHours * 3600;
  const payload = base64UrlEncode({
    sub: 'demo-super-admin',
    exp,
    role: ROLES.SUPER_ADMIN,
    demo: true,
  });
  return `${header}.${payload}.demo`;
}

export function createDemoSuperAdminUser() {
  const { email } = DEMO_SUPER_ADMIN_CREDENTIALS;
  return {
    id: 'demo-super-admin',
    user_id: 'demo-super-admin',
    email,
    first_name: 'Demo',
    last_name: 'Super Admin',
    full_name: 'Demo Super Admin',
    role: ROLES.SUPER_ADMIN,
    department: DEPARTMENT_BY_ROLE[ROLES.SUPER_ADMIN] ?? 'Super Administration',
    permissions: [],
    portalScope: 'super_admin',
    isDemoSession: true,
  };
}

export function isDemoSuperAdminSession(user) {
  if (user?.isDemoSession && user?.portalScope === 'super_admin') return true;
  if (isSuperAdminPortalScope() && user?.role === ROLES.SUPER_ADMIN) return true;
  return false;
}

export function isDemoSuperAdminToken(token) {
  const payload = decodeJwt(token);
  return Boolean(payload?.demo && payload?.role === ROLES.SUPER_ADMIN);
}

export function isSuperAdminPortalScope() {
  try {
    return sessionStorage.getItem(SUPER_ADMIN_PORTAL_SCOPE_KEY) === '1';
  } catch {
    return false;
  }
}

export function setSuperAdminPortalScope(active) {
  try {
    if (active) {
      sessionStorage.setItem(SUPER_ADMIN_PORTAL_SCOPE_KEY, '1');
    } else {
      sessionStorage.removeItem(SUPER_ADMIN_PORTAL_SCOPE_KEY);
    }
  } catch {
    /* sessionStorage unavailable */
  }
}

/**
 * Validate hardcoded super admin credentials — no API call.
 * Returns { user, accessToken, refreshToken } or null.
 */
export function authenticateDemoSuperAdmin({ email, password }) {
  const normalizedEmail = email?.trim().toLowerCase();

  if (
    !DEMO_SUPER_ADMIN_EMAIL_ALIASES.has(normalizedEmail) ||
    password !== DEMO_SUPER_ADMIN_CREDENTIALS.password
  ) {
    return null;
  }

  return {
    user: createDemoSuperAdminUser(),
    accessToken: createDemoSuperAdminToken(),
    refreshToken: createDemoSuperAdminToken(24 * 30),
  };
}

/** @deprecated Import from `@/features/super-admin/mock/superAdminMockData` */
export {
  MOCK_SUPER_ADMIN_DASHBOARD as DEMO_SUPER_ADMIN_DASHBOARD,
  MOCK_SUPER_ADMIN_ROLES as DEMO_SUPER_ADMIN_ROLES,
  MOCK_SUPER_ADMIN_DEPARTMENTS as DEMO_SUPER_ADMIN_DEPARTMENTS,
  MOCK_SUPER_ADMIN_PERMISSIONS as DEMO_SUPER_ADMIN_PERMISSIONS,
  MOCK_SUPER_ADMIN_STAFF as DEMO_SUPER_ADMIN_STAFF,
} from '../mock/superAdminMockData';
