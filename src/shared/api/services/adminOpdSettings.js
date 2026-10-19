/**
 * Admin OPD settings service.
 * Calls GET/PATCH /admin/settings/opd.
 * Falls back to the current tenant's local cache only when the backend route
 * is unavailable (404 / 405 / 501) or the network fails (status 0).
 * Permission-denied and other invalid responses are not replaced with cache.
 */

import {
  getOpdSettings as getOpdSettingsApi,
  updateOpdSettings as updateOpdSettingsApi,
} from '@/features/manager/api/opdSettings';
import {
  getDefaultOpdSettings,
  opdSettingsApiToForm,
  opdSettingsFormToApi,
  readLocalOpdSettings,
  shouldUseOpdLocalFallback,
  writeLocalOpdSettings,
} from '@/features/manager/utils/opdSettingsMapper';

export async function fetchAdminOpdSettings() {
  try {
    const data = await getOpdSettingsApi();
    return opdSettingsApiToForm({ ...data, _source: 'api' });
  } catch (error) {
    if (!shouldUseOpdLocalFallback(error)) throw error;
    const local = readLocalOpdSettings();
    if (local) return opdSettingsApiToForm(local);
    return getDefaultOpdSettings();
  }
}

export async function saveAdminOpdSettings(form) {
  const payload = opdSettingsFormToApi(form);
  try {
    const data = await updateOpdSettingsApi(payload);
    return opdSettingsApiToForm({ ...data, _source: 'api' });
  } catch (error) {
    if (!shouldUseOpdLocalFallback(error)) throw error;
    const saved = writeLocalOpdSettings(payload);
    if (!saved) throw error;
    return opdSettingsApiToForm(saved);
  }
}

/** Admin: PATCH only admin_edit gates. */
export async function saveAdminEditControls(adminEdit) {
  const data = await updateOpdSettingsApi({ admin_edit: adminEdit });
  return opdSettingsApiToForm({ ...data, _source: 'api' });
}
