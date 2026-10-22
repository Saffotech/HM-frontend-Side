import { platformApi } from "./platformClient.js";
import { PlatformApiError } from "./platformErrors.js";
import { PORTAL_BACKEND_ROLE, sessionFromLogin } from "./platformLoginPolicy.js";
import { clearStoredPortalProfiles, platformAuth } from "./platformSession.js";

export async function commitPlatformSession(portal, email, body) {
  const session = sessionFromLogin(portal, email, body);
  platformAuth.saveSession({
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
    user: session.profile,
  });
  try {
    const me = await platformApi("/auth/me");
    const expectedRole = PORTAL_BACKEND_ROLE[portal];
    const sameUser = me?.user_id != null
      && String(me.user_id) === String(session.profile.userId);
    if (!expectedRole || !sameUser || me?.role !== expectedRole) {
      platformAuth.clear();
      throw new PlatformApiError("This account cannot sign in to this portal.", {
        status: 403,
        detail: "Permission denied",
      });
    }
    const name = [me.first_name, me.last_name].filter(Boolean).join(" ").trim();
    const profile = {
      ...session.profile,
      name: name || session.profile.name,
      email: me.email || session.profile.email,
      role: me.role || session.profile.role,
      photoUrl: me.profile_image_url || "",
      tenantId: null,
    };
    platformAuth.saveSession({
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
      user: profile,
    });
    return profile;
  } catch (error) {
    platformAuth.clear();
    clearStoredPortalProfiles();
    throw error;
  }
}

export async function signInPlatformPortal(portal, email, password) {
  const body = await platformApi("/auth/login", {
    method: "POST",
    anonymous: true,
    body: JSON.stringify({
      email: String(email || "").trim(),
      password,
    }),
  });
  return commitPlatformSession(portal, email, body);
}

/** Drop a token that must not become either a platform or a hospital session. */
export function discardIssuedToken(token) {
  if (!token) return Promise.resolve(null);
  return platformApi("/auth/logout", {
    method: "POST",
    token,
    skipRefresh: true,
  }).catch(() => null);
}

export function fetchPlatformMe() {
  return platformApi("/auth/me");
}

export function mapPlatformMe(body, session) {
  const name = [body?.first_name, body?.last_name].filter(Boolean).join(" ").trim();
  return {
    userId: body?.user_id ?? session?.userId,
    firstName: body?.first_name || session?.firstName || "",
    lastName: body?.last_name || session?.lastName || "",
    name: name || session?.name || "",
    email: body?.email || session?.email || "",
    role: body?.role || session?.role || "",
    roleId: body?.role_id ?? null,
    isActive: body?.is_active,
    createdAt: body?.created_at || "",
    photoUrl: body?.profile_image_url || "",
    permissions: Array.isArray(body?.permissions) ? body.permissions : [],
    tenantId: null,
    hospital: null,
  };
}

let platformLogoutTask = null;

export function signOutPlatform({ localOnly = false } = {}) {
  const token = platformAuth.getAccessToken();
  platformAuth.clear();
  clearStoredPortalProfiles();
  if (platformLogoutTask) return platformLogoutTask;
  if (localOnly || !token) return Promise.resolve(null);
  const task = platformApi("/auth/logout", {
    method: "POST",
    token,
    skipRefresh: true,
  }).catch(() => null).finally(() => {
    if (platformLogoutTask === task) platformLogoutTask = null;
  });
  platformLogoutTask = task;
  return task;
}
