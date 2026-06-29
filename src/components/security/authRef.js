/**
 * In-memory auth snapshot for apiClient (non-React callers).
 * Updated by AuthProvider — never persisted to storage.
 */

let snapshot = {
  user: null,
  token: null,
  isAuthenticated: false,
  loading: false,
  error: null,
  login: async () => {},
  logout: () => {},
  refreshSession: async () => {},
  applyTokens: () => {},
};

export function setAuthRef(next) {
  snapshot = { ...snapshot, ...next };
}

export function getAuthRef() {
  return snapshot;
}
