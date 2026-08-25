/**
 * Temporary client store for extra care-team doctors until backend care-team API exists.
 * Keyed by admission id. Does not change admission.doctor_id.
 */

const STORAGE_PREFIX = 'ipd.careTeam.extra.';

function storageKey(admissionId) {
  return `${STORAGE_PREFIX}${admissionId}`;
}

export function loadExtraCareTeamDoctors(admissionId) {
  if (admissionId == null || admissionId === '') return [];
  try {
    const raw = localStorage.getItem(storageKey(admissionId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((row) => row && (row.doctorId || row.doctorName))
      .map((row) => ({
        doctorId: row.doctorId != null ? String(row.doctorId) : null,
        doctorName: String(row.doctorName || '').trim() || '—',
        departmentId: row.departmentId != null ? String(row.departmentId) : null,
        departmentName: String(row.departmentName || '').trim() || '—',
      }));
  } catch {
    return [];
  }
}

export function saveExtraCareTeamDoctors(admissionId, rows) {
  if (admissionId == null || admissionId === '') return;
  try {
    localStorage.setItem(storageKey(admissionId), JSON.stringify(rows ?? []));
  } catch {
    // ignore quota / private mode
  }
}
