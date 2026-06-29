/** OPD dashboard aggregate API */

import { apiClient } from '@/shared/api/client';

export async function getOpdDashboard(token) {
  return apiClient('/opd/dashboard', { token });
}
