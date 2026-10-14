/**

 * Shared helpers for normalizing backend API response shapes.

 * OPD, Doctor, and Pharmacy use live HTTP.

 */



/** Extract list arrays from common backend pagination/wrapper shapes. */

export function asList(payload) {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== 'object') return [];

  const named = [
    payload.results,
    payload.patients,
    payload.appointments,
    payload.bills,
    payload.payments,
    payload.queue,
    payload.beds,
    payload.lab_tests,
    payload.items,
  ];
  for (const candidate of named) {
    if (Array.isArray(candidate)) return candidate;
  }

  if (Array.isArray(payload.data)) return payload.data;
  if (payload.data && typeof payload.data === 'object') {
    return asList(payload.data);
  }

  return [];
}


