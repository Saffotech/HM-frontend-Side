import { apiClient } from '@/shared/api/client';

/** GET /opd/settings — read-only for OPD Billing Counter */
export async function getOpdBillingSettings() {
  return apiClient('/opd/settings');
}
