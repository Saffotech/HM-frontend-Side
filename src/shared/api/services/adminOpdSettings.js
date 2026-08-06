/**
 * Admin OPD settings service.
 * Calls GET/PATCH /admin/settings/opd.
 * Falls back to localStorage only when the backend route is unavailable
 * (404 / 501 / 405) so older environments still work.
 */

import {
  getOpdSettings as getOpdSettingsApi,
  updateOpdSettings as updateOpdSettingsApi,
} from '@/features/admin/api/opdSettings';
import {
  getDefaultOpdSettings,
  opdSettingsApiToForm,
  opdSettingsFormToApi,
  readLocalOpdSettings,
  writeLocalOpdSettings,
} from '@/features/admin/utils/opdSettingsMapper';

function isBackendUnavailable(error) {
  const status = error?.status;
  return status === 404 || status === 405 || status === 501 || status === 0;
}

export async function fetchAdminOpdSettings() {
  try {
    const data = await getOpdSettingsApi();
    return opdSettingsApiToForm({ ...data, _source: 'api' });
  } catch (error) {
    if (!isBackendUnavailable(error)) throw error;
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
    if (!isBackendUnavailable(error)) throw error;
    const saved = writeLocalOpdSettings(payload);
    return opdSettingsApiToForm(saved);
  }
}

/** Super Admin: PATCH only admin_edit gates. */
export async function saveAdminEditControls(adminEdit) {
  const data = await updateOpdSettingsApi({ admin_edit: adminEdit });
  return opdSettingsApiToForm({ ...data, _source: 'api' });
}
