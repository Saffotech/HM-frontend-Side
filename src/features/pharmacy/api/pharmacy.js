/** Pharmacy API — mirrors HM-Backend pharmacist routes. */



import { apiClient } from '@/shared/api/client';



/**

 * Map UI status filter to backend query value.

 * Empty string skips backend status filter (all statuses).

 */

function toApiStatusParam(status) {

  if (!status || status === 'all') return '';

  return status;

}



export async function getPrescriptions(params, token) {

  const search = new URLSearchParams();

  const apiStatus = toApiStatusParam(params?.status);

  if (apiStatus !== undefined && apiStatus !== null) {

    search.set('status', apiStatus);

  }

  if (params?.search) search.set('search', params.search);

  const qs = search.toString();

  return apiClient(`/pharmacy/prescriptions${qs ? `?${qs}` : ''}`, { token });

}



export async function getPrescriptionById(id, token) {

  return apiClient(`/pharmacy/prescriptions/${id}`, { token });

}



export async function dispenseMedicine(prescriptionId, body, token) {

  // Item-level body (target contract):

  // { items: [{ prescription_item_id, quantity_dispensed }], remarks?: string }

  return apiClient(`/pharmacy/dispense/${prescriptionId}`, {

    method: 'POST',

    body: JSON.stringify(body),

    token,

  });

}



export async function getDispenseHistory(
  token,
  { page = 1, limit = 20, date_from, date_to } = {}
) {
  const search = new URLSearchParams();
  search.set('page', String(page));
  search.set('limit', String(limit));
  if (date_from) search.set('date_from', date_from);
  if (date_to) search.set('date_to', date_to);
  return apiClient(`/pharmacy/history?${search.toString()}`, { token });
}


