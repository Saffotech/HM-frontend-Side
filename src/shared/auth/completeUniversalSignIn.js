import { getAppEntryForRole } from '@/shared/utils/authRedirect';
import {
  classifyForbidden,
  messageForSessionError,
} from '@/components/security/httpSessionPolicy';
import {
  classifyLoginBody,
  resolvePostLoginDestination,
} from '@/shared/auth/universalLoginPolicy';
import { platformApi } from '@/features/Platform Admin/shared/api/platformClient';
import {
  commitPlatformSession,
  discardIssuedToken,
  signOutPlatform,
} from '@/features/Platform Admin/shared/api/platformAuth';
import { saveActivePortalProfile } from '@/features/Platform Admin/shared/api/platformSession';

function hasOwn(object, key) {
  return Boolean(object) && Object.prototype.hasOwnProperty.call(object, key);
}

async function clearHospitalSessionIfUnlinked(error, hospitalLogout) {
  if (classifyForbidden(error?.detail || error?.message) !== 'hospital_unlinked') return;
  if (typeof hospitalLogout !== 'function') return;
  try {
    await hospitalLogout({
      message: messageForSessionError(error),
      notifyServer: true,
    });
  } catch {
    /* Hospital cleanup is idempotent. The login error is still reported. */
  }
}

/**
 * Login responses already include role and tenant_id. /auth/me fills either
 * field when the login payload omits it. The call uses the platform client so
 * a platform account never enters the hospital API client.
 */
async function resolveLoginIdentity(body) {
  if (!body?.access_token) {
    const error = new Error('Invalid email or password');
    error.status = 401;
    throw error;
  }
  const hasRole = typeof body.role === 'string' && body.role.trim();
  const hasTenant = hasOwn(body, 'tenant_id');
  if (hasRole && hasTenant) return body;

  try {
    const me = await platformApi('/auth/me', { token: body.access_token });
    return {
      ...body,
      role: hasRole ? body.role : me?.role,
      tenant_id: hasTenant ? body.tenant_id : me?.tenant_id,
      permissions: Array.isArray(body.permissions) && body.permissions.length
        ? body.permissions
        : me?.permissions,
      first_name: body.first_name || me?.first_name,
      user_id: body.user_id ?? me?.user_id,
    };
  } catch (error) {
    await discardIssuedToken(body.access_token);
    throw error;
  }
}

/**
 * One credential check, then the matching session store.
 * Platform roles never call hospital login. Hospital roles still require a tenant.
 */
export async function completeUniversalSignIn(credentials, {
  hospitalLogin,
  hospitalLogout,
  from,
} = {}) {
  const email = String(credentials?.email || '').trim();
  // Drop leftover browser sessions without calling /auth/logout. That request
  // can finish after the new token is issued and sign these portals out again.
  // An already-started logout is awaited so it cannot land on the new token.
  if (typeof hospitalLogout === 'function') {
    await hospitalLogout({ notifyServer: false });
  }
  await signOutPlatform({ localOnly: true });
  let body;
  try {
    body = await platformApi('/auth/login', {
      method: 'POST',
      anonymous: true,
      body: JSON.stringify({
        email,
        password: credentials?.password,
      }),
    });
  } catch (error) {
    await clearHospitalSessionIfUnlinked(error, hospitalLogout);
    throw error;
  }
  let identity;
  try {
    identity = await resolveLoginIdentity(body);
  } catch (error) {
    await clearHospitalSessionIfUnlinked(error, hospitalLogout);
    throw error;
  }
  const decision = classifyLoginBody(identity);

  if (decision.realm === 'platform') {
    let profile;
    try {
      profile = await commitPlatformSession(decision.portal, email, identity);
    } catch (error) {
      await discardIssuedToken(identity.access_token);
      await signOutPlatform();
      throw error;
    }
    saveActivePortalProfile(decision.portal, profile);
    return {
      realm: 'platform',
      role: decision.role,
      profile,
      destination: resolvePostLoginDestination(decision.role, from, getAppEntryForRole),
    };
  }

  if (decision.realm === 'hospital') {
    if (typeof hospitalLogin !== 'function') {
      await discardIssuedToken(identity.access_token);
      throw new Error('Hospital sign-in is unavailable.');
    }
    try {
      const profile = await hospitalLogin(credentials, { issuedSession: identity });
      return {
        realm: 'hospital',
        role: profile?.role,
        profile,
        destination: resolvePostLoginDestination(profile?.role, from, getAppEntryForRole),
      };
    } catch (error) {
      await discardIssuedToken(identity.access_token);
      throw error;
    }
  }

  await discardIssuedToken(identity.access_token);
  const error = new Error(decision.message);
  error.status = 403;
  error.code = decision.reason;
  throw error;
}
