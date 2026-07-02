/**
 * Receptionist module API layer.
 * Add receptionist-specific endpoints here as the module is built out.
 */

import { apiClient } from '@/shared/api/client';

/** Placeholder — wire receptionist endpoints when backend is ready. */
export async function listReceptionistResources() {
  return apiClient('/receptionist/');
}
