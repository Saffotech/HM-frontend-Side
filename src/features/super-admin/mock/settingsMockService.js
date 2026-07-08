/** Mock hospital settings — replace when GET/PATCH /super-admin/settings is live */

import { createDefaultHospitalSettings } from './hospitalSettingsDefaults';

const MOCK_DELAY = 400;

let mockData = createDefaultHospitalSettings();

export async function getSettings() {
  await new Promise((r) => setTimeout(r, MOCK_DELAY));
  return { ...mockData, payment_modes: [...mockData.payment_modes] };
}

export async function updateSettings(data) {
  await new Promise((r) => setTimeout(r, MOCK_DELAY));
  mockData = {
    ...mockData,
    ...data,
    payment_modes: Array.isArray(data.payment_modes)
      ? [...data.payment_modes]
      : [...mockData.payment_modes],
  };
  return getSettings();
}
