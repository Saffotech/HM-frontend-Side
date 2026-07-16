const STORAGE_PREFIX = 'doctor:consultation-draft';

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

export function loadConsultationDraft(appointmentDbId, doctorId) {
  if (appointmentDbId == null) return null;

  try {
    const raw = localStorage.getItem(draftKey(appointmentDbId, doctorId));
    if (!raw) return null;
    const draft = JSON.parse(raw);
    return hasConsultationDraftContent(draft) ? draft : null;
  } catch {
    return null;
  }
}

export function saveConsultationDraft(appointmentDbId, doctorId, draft) {
  if (appointmentDbId == null) return;

  const key = draftKey(appointmentDbId, doctorId);

  try {
    if (!hasConsultationDraftContent(draft)) {
      localStorage.removeItem(key);
      return;
    }

    localStorage.setItem(
      key,
      JSON.stringify({
        ...draft,
        updatedAt: new Date().toISOString(),
      }),
    );
  } catch {
    // Ignore quota / private-mode errors — draft is a convenience feature.
  }
}

export function clearConsultationDraft(appointmentDbId, doctorId) {
  if (appointmentDbId == null) return;

  try {
    localStorage.removeItem(draftKey(appointmentDbId, doctorId));
  } catch {
    // no-op
  }
}
