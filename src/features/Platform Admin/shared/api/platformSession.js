import { PORTAL_BACKEND_ROLE } from "./platformLoginPolicy.js";

export const PLATFORM_PORTAL_STORAGE_KEY = "saffocare.platform.v1";
export const PLATFORM_PORTAL_STATE_VERSION = 14;
export const PORTAL_SESSION_KEYS = {
  platform: "platformSession",
  crm: "crmSession",
  accountant: "accountsSession",
};

const ACCESS_TOKEN = "saffocare.platform.accessToken";
const REFRESH_TOKEN = "saffocare.platform.refreshToken";
const USER = "saffocare.platform.user";
const REGISTERED_TENANTS = "saffocare.platform.registeredTenants";
const LEAD_SUBMISSIONS = "saffocare.platform.leadSubmissions";

function memoryStorage() {
  const store = new Map();
  return {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: (key) => store.delete(key),
  };
}

function browserSessionStorage() {
  try {
    if (typeof sessionStorage !== "undefined") return sessionStorage;
  } catch {
    /* sessionStorage unavailable */
  }
  return memoryStorage();
}

function readJson(storage, key) {
  try {
    const raw = storage.getItem(key);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function parseStoredUser(raw) {
  try {
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function createPlatformAuthStore(storage = memoryStorage()) {
  let accessToken = null;
  let refreshToken = null;
  let user = null;

  const read = (key) => {
    try {
      return storage.getItem(key);
    } catch {
      return null;
    }
  };
  const write = (key, value) => {
    try {
      if (value == null || value === "") storage.removeItem(key);
      else storage.setItem(key, value);
    } catch {
      /* storage unavailable */
    }
  };

  accessToken = read(ACCESS_TOKEN);
  refreshToken = read(REFRESH_TOKEN);
  user = parseStoredUser(read(USER));

  return {
    getAccessToken: () => accessToken,
    getRefreshToken: () => refreshToken,
    getUser: () => user,
    saveSession({ accessToken: nextAccess, refreshToken: nextRefresh, user: nextUser }) {
      accessToken = nextAccess || null;
      refreshToken = nextRefresh || null;
      user = nextUser || null;
      write(ACCESS_TOKEN, accessToken);
      write(REFRESH_TOKEN, refreshToken);
      write(USER, user ? JSON.stringify(user) : null);
    },
    saveTokens(nextAccess, nextRefresh) {
      accessToken = nextAccess || null;
      if (nextRefresh) refreshToken = nextRefresh;
      write(ACCESS_TOKEN, accessToken);
      write(REFRESH_TOKEN, refreshToken);
    },
    clear() {
      accessToken = null;
      refreshToken = null;
      user = null;
      write(ACCESS_TOKEN, null);
      write(REFRESH_TOKEN, null);
      write(USER, null);
      write(REGISTERED_TENANTS, null);
      write(LEAD_SUBMISSIONS, null);
    },
    rememberRegisteredTenant(tenant) {
      if (!tenant?.tenant_id) return;
      const all = readJson(storage, REGISTERED_TENANTS);
      all[String(tenant.tenant_id)] = {
        ...tenant,
        rememberedAt: tenant.rememberedAt || new Date().toISOString(),
      };
      write(REGISTERED_TENANTS, JSON.stringify(all));
    },
    recallRegisteredTenant(tenantId) {
      const all = readJson(storage, REGISTERED_TENANTS);
      return all[String(tenantId)] || null;
    },
    listRegisteredTenants() {
      return Object.values(readJson(storage, REGISTERED_TENANTS)).filter((item) => item?.tenant_id != null);
    },
    rememberLeadSubmission(leadId, extra) {
      if (leadId == null) return;
      const all = readJson(storage, LEAD_SUBMISSIONS);
      all[String(leadId)] = {
        trialPeriod: extra?.trialPeriod || "",
        tenantStatus: extra?.tenantStatus || "",
      };
      write(LEAD_SUBMISSIONS, JSON.stringify(all));
    },
    recallLeadSubmission(leadId) {
      const all = readJson(storage, LEAD_SUBMISSIONS);
      return all[String(leadId)] || null;
    },
  };
}

export const platformAuth = createPlatformAuthStore(browserSessionStorage());

export function hasPlatformAccessToken() {
  return Boolean(platformAuth.getAccessToken());
}

/**
 * A stored portal user id is not a session. The shell also needs the
 * platform access token and that token's user must match this portal.
 */
function browserLocalStorage() {
  try {
    if (typeof localStorage !== "undefined") return localStorage;
  } catch {
    /* localStorage unavailable */
  }
  return null;
}

function emptyPortalState() {
  return {
    version: PLATFORM_PORTAL_STATE_VERSION,
    platformSession: null,
    crmSession: null,
    accountsSession: null,
  };
}

function readPortalState(storage) {
  try {
    const raw = storage.getItem(PLATFORM_PORTAL_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.version !== PLATFORM_PORTAL_STATE_VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** Persist the one portal profile that matches the platform access token. */
export function saveActivePortalProfile(portal, profile, storage = browserLocalStorage()) {
  const key = PORTAL_SESSION_KEYS[portal];
  if (!storage || !key || profile?.userId == null) return false;
  const next = emptyPortalState();
  next[key] = {
    userId: profile.userId,
    name: profile.name || "",
    email: profile.email || "",
    role: profile.role || PORTAL_BACKEND_ROLE[portal] || "",
    signedInAt: profile.signedInAt || new Date().toISOString(),
    photoUrl: profile.photoUrl || "",
  };
  try {
    storage.setItem(PLATFORM_PORTAL_STORAGE_KEY, JSON.stringify(next));
    return true;
  } catch {
    return false;
  }
}

export function clearStoredPortalProfiles(storage = browserLocalStorage()) {
  if (!storage) return;
  try {
    storage.setItem(PLATFORM_PORTAL_STORAGE_KEY, JSON.stringify(emptyPortalState()));
  } catch {
    /* storage unavailable */
  }
}

/**
 * The portal whose stored profile matches the current platform access token.
 * A profile without that token is not a session.
 */
export function readActivePortalSession(storage = browserLocalStorage(), auth = platformAuth) {
  if (!storage) return null;
  const state = readPortalState(storage);
  if (!state) return null;
  const portals = Object.keys(PORTAL_SESSION_KEYS);
  for (let index = 0; index < portals.length; index += 1) {
    const portal = portals[index];
    const session = state[PORTAL_SESSION_KEYS[portal]];
    if (portalSessionIsAuthenticated(portal, session, auth)) {
      return { portal, session, role: session.role };
    }
  }
  return null;
}

export function portalSessionIsAuthenticated(portal, session, auth = platformAuth) {
  if (!auth.getAccessToken() || session?.userId == null) return false;
  const expectedRole = PORTAL_BACKEND_ROLE[portal];
  if (!expectedRole || session.role !== expectedRole) return false;
  const tokenUser = auth.getUser?.();
  if (!tokenUser || tokenUser.userId == null || tokenUser.role !== expectedRole) return false;
  return String(tokenUser.userId) === String(session.userId);
}
