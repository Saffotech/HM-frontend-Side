import { DEPARTMENT_BY_ROLE, normalizeRole } from '../../shared/utils/roleUtils.js';

/**
 * Frontend safeguard only. A null tenant_id is still accepted by the API;
 * these checks stop the hospital UI from treating that response as a session.
 */

function hasOwn(object, key) {
  return Boolean(object) && Object.prototype.hasOwnProperty.call(object, key);
}

function cloneHospital(hospital) {
  if (!hospital || typeof hospital !== 'object') return null;
  return {
    id: hospital.id ?? null,
    name: typeof hospital.name === 'string' ? hospital.name : '',
    code: typeof hospital.code === 'string' ? hospital.code : '',
  };
}

export function isValidTenantId(value) {
  if (typeof value === 'number') {
    return Number.isInteger(value) && value > 0;
  }
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (!trimmed || /^(null|undefined|nan)$/i.test(trimmed)) return false;
  if (/^\d+$/.test(trimmed)) return Number(trimmed) > 0;
  return true;
}

export function hospitalDisplayName(user) {
  const name = user?.hospital?.name;
  if (typeof name !== 'string') return '';
  return name.trim();
}

function identityPart(value) {
  if (value == null || value === '') return null;
  return String(value);
}

export function identitiesDiffer(previous, next) {
  if (!previous || !next) return false;
  const previousUser = identityPart(previous.user_id ?? previous.id);
  const nextUser = identityPart(next.user_id ?? next.id);
  if (!previousUser || !nextUser) return false;
  return previousUser !== nextUser
    || identityPart(previous.tenant_id) !== identityPart(next.tenant_id);
}

/**
 * Latest /auth/me (or the login profile derived from it) wins.
 * Hospital fields are replaced from that payload when present, including null,
 * so a permission refresh cannot keep the previous hospital's name or id.
 * When the payload omits hospital or tenant_id, the current values stay.
 */
export function mergeAuthenticatedProfile(previous, me, loginData, accessToken, resolvePermissions) {
  const source = me && typeof me === 'object' ? me : {};
  const base = previous && typeof previous === 'object' ? previous : null;

  const userId = hasOwn(source, 'user_id') || hasOwn(source, 'id')
    ? (source.user_id ?? source.id ?? null)
    : (base?.user_id ?? base?.id ?? null);

  const tenantId = hasOwn(source, 'tenant_id')
    ? source.tenant_id
    : (base?.tenant_id ?? null);

  const hospital = hasOwn(source, 'hospital')
    ? cloneHospital(source.hospital)
    : cloneHospital(base?.hospital);

  const role = normalizeRole(
    hasOwn(source, 'role') && source.role != null
      ? source.role
      : (loginData?.role ?? base?.role)
  );

  const permissions = Array.isArray(source.permissions)
    ? [...source.permissions]
    : (typeof resolvePermissions === 'function'
      ? [...(resolvePermissions(loginData, accessToken) ?? [])]
      : (Array.isArray(base?.permissions) ? [...base.permissions] : []));

  const firstName = source.first_name ?? loginData?.first_name ?? base?.first_name ?? '';
  const lastName = source.last_name ?? base?.last_name ?? '';
  const fullName = `${firstName} ${lastName}`.trim() || base?.full_name || '';

  const profile = {
    ...(base ?? {}),
    ...source,
    id: userId,
    user_id: userId,
    tenant_id: tenantId,
    hospital,
    role,
    permissions,
    full_name: fullName,
  };

  if (!profile.department) {
    profile.department = DEPARTMENT_BY_ROLE[profile.role] ?? 'OPD';
  }

  return profile;
}
