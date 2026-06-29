/**
 * Unwrap inconsistent doctor-module list responses.
 * Single-object endpoints should use res.{key} directly (e.g. res.queue, res.appointment).
 */
export function unwrapDoctorResponse(res, key) {
  if (Array.isArray(res)) return res;
  if (res?.[key]) return res[key];
  if (res?.data) return res.data;
  if (res?.results) return res.results;
  return [];
}

/** Normalize list unwrappers that may return a single object instead of an array. */
export function normalizeDoctorList(list) {
  if (Array.isArray(list)) return list;
  if (list && typeof list === 'object') return [list];
  return [];
}
