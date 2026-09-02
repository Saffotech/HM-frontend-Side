/**
 * IPD read-only pricing — GET /ipd/pricing (no opd:view required).
 */

import { apiClient } from '@/shared/api/client';

export async function getIpdPricing(token) {
  return apiClient('/ipd/pricing', { token });
}
