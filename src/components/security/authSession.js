import { STORAGE_KEYS } from '@/shared/constants';

// Token in memory reduces XSS window — never log or expose token
let memoryToken = null;
let memoryRefreshToken = null;
let sessionStorageTokenHydrated = false;

function hydrateTokenFromSessionStorage() {
  if (sessionStorageTokenHydrated) return;
  sessionStorageTokenHydrated = true;
  try {
    const stored = sessionStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    const storedRefresh = sessionStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
    if (stored) memoryToken = stored;
    if (storedRefresh) memoryRefreshToken = storedRefresh;
  } catch {
    /* sessionStorage unavailable */
  }
}

function setToken(token) {
  memoryToken = token ?? null;
  try {
    if (memoryToken) {
      sessionStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, memoryToken);
    } else {
      sessionStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    }
  } catch {
    /* sessionStorage unavailable */
  }
}

function setRefreshToken(refreshToken) {
  memoryRefreshToken = refreshToken ?? null;
  try {
    if (memoryRefreshToken) {
      sessionStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, memoryRefreshToken);
    } else {
      sessionStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    }
  } catch {
    /* sessionStorage unavailable */
  }
}

function getToken() {
  if (memoryToken) return memoryToken;
  hydrateTokenFromSessionStorage();
  return memoryToken;
}

function getRefreshToken() {
  if (memoryRefreshToken) return memoryRefreshToken;
  hydrateTokenFromSessionStorage();
  return memoryRefreshToken;
}

function clearToken() {
  memoryToken = null;
  memoryRefreshToken = null;
  sessionStorageTokenHydrated = true;
  try {
    sessionStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    sessionStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
  } catch {
    /* sessionStorage unavailable */
  }
}

export function loadAuthSession() {
  try {
    const token = getToken();
    const refreshToken = getRefreshToken();
    const rawUser = sessionStorage.getItem(STORAGE_KEYS.USER);
    if (!token || !rawUser) return null;
    return { token, refreshToken, user: JSON.parse(rawUser) };
  } catch {
    return null;
  }
}

export function saveAuthSession(token, user, refreshToken) {
  setToken(token);
  if (refreshToken) setRefreshToken(refreshToken);
  sessionStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
}

export function applyRefreshedTokens(accessToken, refreshToken) {
  setToken(accessToken);
  if (refreshToken) setRefreshToken(refreshToken);
}

export function clearAuthSession() {
  clearToken();
  sessionStorage.removeItem(STORAGE_KEYS.USER);
}
