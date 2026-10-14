/**
 * Receptionist read-only OPD pricing.
 * GET /receptionist/pricing (permission: receptionist:pricing, no opd:view).
 */

import { apiClient } from '@/shared/api/client';

export async function getReceptionistPricing(token) {
  return apiClient('/receptionist/pricing', { token });
}
