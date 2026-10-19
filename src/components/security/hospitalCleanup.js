import { clearHospitalBrowserStorage } from './hospitalBrowserStorage.js';
import { setHospitalStorageScope } from './hospitalStorageScope.js';

/**
 * Single local cleanup for logout, timeout, failed refresh, invalid restore,
 * inactive hospital, deactivated account, and hospital identity changes.
 * Server audit logout is separate and must be started before this runs.
 */
export function performHospitalCleanup(deps = {}) {
  setHospitalStorageScope(null);
  deps.dropRenderedSession?.();
  deps.clearStoredSession?.();
  deps.clearDrafts?.();
  deps.cancelQueries?.();
  deps.clearQueries?.();
  clearHospitalBrowserStorage();
}
