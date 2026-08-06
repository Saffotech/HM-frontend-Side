/**
 * IPD dashboard API — live backend `/ipd/dashboard`.
 */

import { apiClient } from '@/shared/api/client';

export async function getIpdDashboardStats(token) {
  return apiClient('/ipd/dashboard', { token });
}

export async function getIpdRecentAdmissions(token) {
  const data = await getIpdDashboardStats(token);
  return data?.recent_admissions ?? [];
}
