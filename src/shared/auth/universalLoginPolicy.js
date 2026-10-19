import { isValidTenantId } from '../../components/security/hospitalIdentity.js';
import { INVALID_TENANT_MESSAGE } from '../../components/security/httpSessionPolicy.js';
import { normalizeRole } from '../utils/roleUtils.js';
import {
  ACCOUNTS_BASE,
  CRM_BASE,
  PLATFORM_BASE,
} from '../../features/Platform Admin/shared/paths.js';

/** Backend role → platform portal. Hospital roles are not listed here. */
export const PLATFORM_ROLE_TO_PORTAL = {
  platform_admin: 'platform',
  crm: 'crm',
  accountant: 'accountant',
};

const PLATFORM_DASHBOARD = {
  platform: PLATFORM_BASE,
  crm: CRM_BASE,
  accountant: ACCOUNTS_BASE,
};

/** Roles that belong to a hospital and must have a real tenant id. */
const HOSPITAL_ROLES = new Set([
  'admin',
  'doctor',
  'nurse',
  'opd',
  'opd_billing',
  'pharmacist',
  'lab_technician',
  'receptionist',
  'super_admin',
  'billing',
  'ipd',
]);

const HOSPITAL_RETURN_PREFIXES = {
  doctor: ['/doctor'],
  lab_technician: ['/lab'],
  pharmacist: ['/pharmacy'],
  nurse: ['/nurse'],
  receptionist: ['/receptionist'],
  ipd: ['/ipd'],
  super_admin: ['/super-admin'],
  admin: ['/admin'],
  opd: ['/dashboard', '/billing', '/appointments', '/patients', '/pricing', '/payment-history', '/opd'],
  billing: ['/dashboard', '/billing', '/appointments', '/patients', '/pricing', '/payment-history', '/opd'],
};

const UNAUTHORIZED_MESSAGE = 'This account cannot sign in.';

function cleanRole(role) {
  return typeof role === 'string' ? role.trim() : '';
}

export function isPlatformLoginRole(role) {
  return Object.prototype.hasOwnProperty.call(PLATFORM_ROLE_TO_PORTAL, cleanRole(role));
}

export function portalForRole(role) {
  return PLATFORM_ROLE_TO_PORTAL[cleanRole(role)] || null;
}

/** Platform dashboard for a platform role. Hospital roles return null. */
export function dashboardForRole(role) {
  const portal = portalForRole(role);
  return portal ? PLATFORM_DASHBOARD[portal] : null;
}

/**
 * Decide which session store may accept this login body.
 * Platform roles are accepted with a null tenant. Hospital roles are not.
 */
export function classifyLoginBody(body) {
  const role = cleanRole(body?.role);
  if (isPlatformLoginRole(role)) {
    return {
      realm: 'platform',
      role,
      portal: portalForRole(role),
      tenantId: body?.tenant_id ?? null,
    };
  }

  const normalized = normalizeRole(role);
  if (role && (HOSPITAL_ROLES.has(role) || HOSPITAL_ROLES.has(normalized))) {
    if (!isValidTenantId(body?.tenant_id)) {
      return {
        realm: 'rejected',
        reason: 'invalid_tenant',
        role,
        message: INVALID_TENANT_MESSAGE,
      };
    }
    return {
      realm: 'hospital',
      role,
      tenantId: body.tenant_id,
    };
  }

  return {
    realm: 'rejected',
    reason: 'unauthorized_role',
    role,
    message: UNAUTHORIZED_MESSAGE,
  };
}

export function barePath(path) {
  if (typeof path !== 'string' || !path) return '';
  const value = path.split('?')[0].split('#')[0];
  if (value.length > 1 && value.endsWith('/')) return value.slice(0, -1);
  return value;
}

export function isLoginPath(path) {
  const bare = barePath(path);
  return bare === '/login'
    || bare === '/patient-login'
    || bare.endsWith('/login')
    || bare.endsWith('/register');
}

function matchesPrefix(path, prefix) {
  const bare = barePath(path);
  return bare === prefix || bare.startsWith(`${prefix}/`);
}

export function normalizeReturnTarget(from) {
  let path = '';
  if (typeof from === 'string') path = from;
  else if (from && typeof from === 'object' && typeof from.pathname === 'string') {
    path = `${from.pathname}${from.search || ''}${from.hash || ''}`;
  }
  if (!path.startsWith('/') || path.startsWith('//') || path.includes('\\')) return null;
  if (isLoginPath(path)) return null;
  return path;
}

function isPlatformAdminPath(path) {
  const bare = barePath(path);
  if (bare === PLATFORM_BASE) return true;
  if (!bare.startsWith(`${PLATFORM_BASE}/`)) return false;
  if (bare === CRM_BASE || bare.startsWith(`${CRM_BASE}/`)) return false;
  if (bare === ACCOUNTS_BASE || bare.startsWith(`${ACCOUNTS_BASE}/`)) return false;
  return !isLoginPath(bare);
}

export function isReturnPathForRole(role, target) {
  const path = normalizeReturnTarget(target);
  if (!path) return false;
  const cleaned = cleanRole(role);
  if (cleaned === 'platform_admin') return isPlatformAdminPath(path);
  if (cleaned === 'crm') return matchesPrefix(path, CRM_BASE);
  if (cleaned === 'accountant') return matchesPrefix(path, ACCOUNTS_BASE);

  const normalized = normalizeRole(cleaned);
  const prefixes = HOSPITAL_RETURN_PREFIXES[normalized];
  if (!prefixes) return false;
  return prefixes.some((prefix) => matchesPrefix(path, prefix));
}

/**
 * Role home, or the page the user asked for when that page belongs to the role.
 * Login URLs and another role's screens are never returned, so guards cannot loop.
 */
export function resolvePostLoginDestination(role, from, resolveHome) {
  const home = typeof resolveHome === 'function'
    ? resolveHome(role)
    : dashboardForRole(role);
  const target = normalizeReturnTarget(from);
  if (target && isReturnPathForRole(role, target)) return target;
  return home || '/login';
}

/** State for a redirect to /login. Login pages themselves are not preserved. */
export function loginRedirectState(location) {
  const from = {
    pathname: location?.pathname || '',
    search: location?.search || '',
    hash: location?.hash || '',
  };
  if (!from.pathname || isLoginPath(from.pathname)) return undefined;
  return { from };
}
