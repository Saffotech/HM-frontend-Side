import { ROLES } from '@/shared/constants';
import { DEPARTMENT_BY_ROLE } from '@/shared/utils/roleUtils';

/** sessionStorage flag — receptionist portal uses frontend-only demo session */
export const RECEPTIONIST_PORTAL_SCOPE_KEY = 'receptionist_portal_scope';

/** Hardcoded demo credentials — frontend only, no backend account required */
export const DEMO_RECEPTIONIST_CREDENTIALS = {
  email: 'receptionist@saffocare.com',
  password: 'Reception@123',
};

const DEMO_RECEPTIONIST_EMAIL_ALIASES = new Set([
  DEMO_RECEPTIONIST_CREDENTIALS.email.toLowerCase(),
  'receptionist@saffocare.local',
]);

function base64UrlEncode(value) {
  return btoa(JSON.stringify(value))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/** Fake JWT so existing auth helpers treat the session as valid */
export function createDemoReceptionistToken(expHours = 24 * 7) {
  const header = base64UrlEncode({ alg: 'none', typ: 'JWT' });
  const exp = Math.floor(Date.now() / 1000) + expHours * 3600;
  const payload = base64UrlEncode({
    sub: 'demo-receptionist',
    exp,
    role: ROLES.RECEPTIONIST,
    demo: true,
  });
  return `${header}.${payload}.demo`;
}

export function createDemoReceptionistUser() {
  const { email } = DEMO_RECEPTIONIST_CREDENTIALS;
  return {
    id: 'demo-receptionist',
    user_id: 'demo-receptionist',
    email,
    first_name: 'Demo',
    last_name: 'Receptionist',
    full_name: 'Demo Receptionist',
    role: ROLES.RECEPTIONIST,
    department: DEPARTMENT_BY_ROLE[ROLES.RECEPTIONIST] ?? 'Reception',
    permissions: [],
    portalScope: 'receptionist',
    isDemoSession: true,
  };
}

export function isDemoReceptionistSession(user) {
  return Boolean(user?.isDemoSession && user?.portalScope === 'receptionist');
}

export function isReceptionistPortalScope() {
  try {
    return sessionStorage.getItem(RECEPTIONIST_PORTAL_SCOPE_KEY) === '1';
  } catch {
    return false;
  }
}

export function setReceptionistPortalScope(active) {
  try {
    if (active) {
      sessionStorage.setItem(RECEPTIONIST_PORTAL_SCOPE_KEY, '1');
    } else {
      sessionStorage.removeItem(RECEPTIONIST_PORTAL_SCOPE_KEY);
    }
  } catch {
    /* sessionStorage unavailable */
  }
}

/**
 * Validate hardcoded receptionist credentials — no API call.
 * Returns { user, accessToken, refreshToken } or null.
 */
export function authenticateDemoReceptionist({ email, password }) {
  const normalizedEmail = email?.trim().toLowerCase();

  if (
    !DEMO_RECEPTIONIST_EMAIL_ALIASES.has(normalizedEmail) ||
    password !== DEMO_RECEPTIONIST_CREDENTIALS.password
  ) {
    return null;
  }

  return {
    user: createDemoReceptionistUser(),
    accessToken: createDemoReceptionistToken(),
    refreshToken: createDemoReceptionistToken(24 * 30),
  };
}
