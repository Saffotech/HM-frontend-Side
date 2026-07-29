const STORAGE_PREFIX = 'doctor:consultation-draft';

/** In-memory draft store — PHI never persisted to localStorage/sessionStorage. */
const draftStore = new Map();

function draftKey(appointmentDbId, doctorId) {
  const appt = appointmentDbId != null ? String(appointmentDbId) : '';
  const doctor = doctorId != null ? String(doctorId) : 'anon';
  return `${STORAGE_PREFIX}:${doctor}:${appt}`;
}

function hasText(value) {
  return Boolean(String(value ?? '').trim());
}

export function hasConsultationDraftContent(draft) {
  if (!draft || typeof draft !== 'object') return false;

  if (
    hasText(draft.symptoms) ||
    hasText(draft.diagnosis) ||
    hasText(draft.notes) ||
    hasText(draft.followUp) ||
    hasText(draft.labTest) ||
    hasText(draft.labClinicalNotes)
  ) {
    return true;
  }

  return (draft.meds ?? []).some(
    (med) =>
      hasText(med?.name) ||
      hasText(med?.dosage) ||
      hasText(med?.frequency) ||
      hasText(med?.durationValue) ||
      hasText(med?.instructions),
  );
}

/** One-time migration: lift any legacy localStorage draft into memory, then purge it. */
function migrateLegacyLocalDraft(key) {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    window.localStorage.removeItem(key);
    const draft = JSON.parse(raw);
    return hasConsultationDraftContent(draft) ? draft : null;
  } catch {
    try {
      window.localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
    return null;
  }
}

export function loadConsultationDraft(appointmentDbId, doctorId) {
  if (appointmentDbId == null) return null;

  const key = draftKey(appointmentDbId, doctorId);

  if (draftStore.has(key)) {
    const cached = draftStore.get(key);
    return hasConsultationDraftContent(cached) ? cached : null;
  }

  const legacy = migrateLegacyLocalDraft(key);
  if (legacy) {
    draftStore.set(key, legacy);
    return legacy;
  }

  return null;
}

export function saveConsultationDraft(appointmentDbId, doctorId, draft) {
  if (appointmentDbId == null) return;

  const key = draftKey(appointmentDbId, doctorId);

  if (!hasConsultationDraftContent(draft)) {
    draftStore.delete(key);
    return;
  }

  draftStore.set(key, {
    ...draft,
    updatedAt: new Date().toISOString(),
  });
}

export function clearConsultationDraft(appointmentDbId, doctorId) {
  if (appointmentDbId == null) return;

  const key = draftKey(appointmentDbId, doctorId);
  draftStore.delete(key);

  try {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(key);
    }
  } catch {
    /* no-op */
  }
}

/** Remove all in-memory drafts (e.g. on logout). */
export function clearAllConsultationDrafts() {
  draftStore.clear();
}
