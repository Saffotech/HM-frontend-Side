/** Persistent cache for IPD consult visits — doctor history API omits admitted stays. */

const STORAGE_KEY = 'hms:doctor:ipd-consult-visits';
const LEGACY_SESSION_KEY = STORAGE_KEY;

function readStore() {
  try {
    let raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      raw = sessionStorage.getItem(LEGACY_SESSION_KEY);
      if (raw) {
        localStorage.setItem(STORAGE_KEY, raw);
        sessionStorage.removeItem(LEGACY_SESSION_KEY);
      }
    }
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeStore(store) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    /* storage unavailable */
  }
}

/**
 * Persist one IPD consult visit for visit-history merge (server save via doctor IPD consult API).
 */
export function cacheIpdConsultVisit({
  admissionId,
  patientUid,
  visitNotes,
  visitedAt,
}) {
  if (admissionId == null || !patientUid || !visitNotes?.trim()) return;

  const store = readStore();
  const key = String(admissionId);
  const list = Array.isArray(store[key]) ? store[key] : [];

  const entry = {
    id: `ipd-consult-${admissionId}-${visitedAt ?? Date.now()}`,
    admissionId: Number(admissionId),
    patientUid: String(patientUid),
    visitNotes: visitNotes.trim(),
    visitedAt: visitedAt ?? new Date().toISOString(),
  };

  const duplicate = list.some(
    (row) => row.visitNotes === entry.visitNotes && row.visitedAt === entry.visitedAt,
  );
  if (!duplicate) {
    list.unshift(entry);
    store[key] = list.slice(0, 100);
    writeStore(store);
  }

  window.dispatchEvent(new CustomEvent('hms:ipd-consult-cache-updated', { detail: entry }));
}

/** @returns {Record<string, Array>} admissionId -> consult visits */
export function getIpdConsultVisitStore() {
  return readStore();
}

export function getIpdConsultVisitsForAdmission(admissionId) {
  if (admissionId == null) return [];
  const store = readStore();
  return Array.isArray(store[String(admissionId)]) ? store[String(admissionId)] : [];
}

export function getIpdConsultVisitsForPatient(patientUid) {
  if (!patientUid) return [];
  const store = readStore();
  const uid = String(patientUid);
  const out = [];
  for (const visits of Object.values(store)) {
    if (!Array.isArray(visits)) continue;
    for (const visit of visits) {
      if (visit?.patientUid === uid) out.push(visit);
    }
  }
  return out.sort(
    (a, b) => new Date(b.visitedAt).getTime() - new Date(a.visitedAt).getTime(),
  );
}
