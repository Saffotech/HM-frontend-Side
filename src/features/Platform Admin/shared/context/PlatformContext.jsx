import { createContext, useCallback, useContext, useMemo } from "react";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { signOutPlatform } from "../api/platformAuth";
import {
  PLATFORM_PORTAL_STATE_VERSION,
  PLATFORM_PORTAL_STORAGE_KEY,
  PORTAL_SESSION_KEYS,
} from "../api/platformSession";

const PlatformContext = createContext(null);
const STORAGE_KEY = "saffocare.platform.v1";
const SESSION_KEYS = PORTAL_SESSION_KEYS;
if (STORAGE_KEY !== PLATFORM_PORTAL_STORAGE_KEY) {
  throw new Error("Platform portal storage key is out of sync");
}

function createDefaultState() {
  return {
    version: PLATFORM_PORTAL_STATE_VERSION,
    platformSession: null,
    crmSession: null,
    accountsSession: null,
  };
}

/** React state can be older than another tab's write. Keep that tab's profile. */
function latestPortalState(fallback) {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.version !== PLATFORM_PORTAL_STATE_VERSION) return fallback;
    return { ...fallback, ...parsed, version: PLATFORM_PORTAL_STATE_VERSION };
  } catch {
    return fallback;
  }
}

export function PlatformProvider({ children }) {
  const [state, setState] = useLocalStorage(STORAGE_KEY, createDefaultState);

  const sessionFor = useCallback((portal) => {
    const key = SESSION_KEYS[portal];
    return key ? state[key] || null : null;
  }, [state]);

  const portalProfile = useCallback((portal) => {
    const session = sessionFor(portal);
    if (!session?.userId) return null;
    return {
      userId: session.userId,
      name: session.name,
      email: session.email,
      role: session.role,
      signedInAt: session.signedInAt || "",
      photoUrl: session.photoUrl || "",
      phone: "",
      jobTitle: "",
      department: "",
    };
  }, [sessionFor]);

  const openPortalSession = useCallback((portal, profile) => {
    const key = SESSION_KEYS[portal];
    if (!key || profile?.userId == null) return false;
    setState((current) => ({
      ...latestPortalState(current),
      [key]: {
        userId: profile.userId,
        name: profile.name,
        email: profile.email,
        role: profile.role,
        signedInAt: new Date().toISOString(),
        photoUrl: profile.photoUrl || "",
      },
    }));
    return true;
  }, [setState]);

  const patchPortalSession = useCallback((portal, patch) => {
    const key = SESSION_KEYS[portal];
    if (!key || !patch) return;
    setState((current) => {
      const base = latestPortalState(current);
      const session = base[key];
      if (!session) return base;
      return { ...base, [key]: { ...session, ...patch } };
    });
  }, [setState]);

  const signOutPortal = useCallback((portal) => {
    const key = SESSION_KEYS[portal];
    if (!key) return;
    void signOutPlatform({ portal });
    setState((current) => ({ ...latestPortalState(current), [key]: null }));
  }, [setState]);

  const api = useMemo(() => ({
    ...state,
    sessionFor,
    portalProfile,
    openPortalSession,
    patchPortalSession,
    signOutPortal,
  }), [openPortalSession, patchPortalSession, portalProfile, sessionFor, signOutPortal, state]);

  return <PlatformContext.Provider value={api}>{children}</PlatformContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function usePlatform() {
  const context = useContext(PlatformContext);
  if (!context) throw new Error("usePlatform must be used within PlatformProvider");
  return context;
}
