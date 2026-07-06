/** OPD dashboard aggregate API */

import { apiClient } from '@/shared/api/client';

export async function getOpdDashboard(token) {
  return apiClient('/opd/dashboard', { token });
}

export async function getTodayBillingVisits(token) {
  return apiClient('/opd/visits/today', { token });
}
