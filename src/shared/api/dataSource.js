/**

 * Shared helpers for normalizing backend API response shapes.

 * OPD, Doctor, and Pharmacy use live HTTP.

 */



/** Extract list arrays from common backend pagination/wrapper shapes. */

export function asList(payload) {

  if (Array.isArray(payload)) return payload;

  if (payload?.results) return payload.results;

  if (payload?.data) return payload.data;

  if (payload?.patients) return payload.patients;

  if (payload?.appointments) return payload.appointments;

  if (payload?.bills) return payload.bills;

  if (payload?.payments) return payload.payments;

  if (payload?.queue) return payload.queue;

  if (payload?.beds) return payload.beds;

  if (payload?.lab_tests) return payload.lab_tests;

  if (payload?.items) return payload.items;

  return [];

}


