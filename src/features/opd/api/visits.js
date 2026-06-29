/** OPD visit API — existing patient revisit */

import { apiClient } from '@/shared/api/client';

export async function createOpdVisit(data, token, queryString = '') {
  const suffix = queryString ? `?${queryString}` : '';
  const response = await apiClient(`/opd/visit${suffix}`, {
    method: 'POST',
    body: JSON.stringify(data),
    token,
  });
  return {
    patientId: response.patient_id,
    billNumber: response.bill_number,
    tokenNumber: response.token_number,
    visitId: response.visit_id,
    raw: response,
  };
}
