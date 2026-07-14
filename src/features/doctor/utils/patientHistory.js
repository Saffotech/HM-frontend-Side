import { visitRowToPatientSummary } from '@/shared/api/mappers/doctorPatientMapper';

export function formatVisitDateTime(dateStr, visitAt) {
  if (visitAt) {
    const d = new Date(visitAt);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleString('en-US', {
        month: 'numeric',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      });
    }
  }
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (!Number.isNaN(d.getTime())) {
    return d.toLocaleString('en-US', {
      month: 'numeric',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  }
  return dateStr;
}

function rxSortTime(rx) {
  const d = new Date(rx.date);
  return Number.isNaN(d.getTime()) ? 0 : d.getTime();
}

function coalesceVisitField(primary, secondary) {
  const pick = (value) => {
    if (value == null) return null;
    const text = String(value).trim();
    return text && text !== '—' ? text : null;
  };
  return pick(primary) ?? pick(secondary) ?? '—';
}

function findPrescriptionForVisit(visit, prescriptions, usedRx) {
  return prescriptions.find((rx) => {
    if (usedRx.has(rx.id)) return false;
    if (
      visit.appointmentDbId != null &&
      rx.appointmentId != null &&
      Number(rx.appointmentId) === Number(visit.appointmentDbId)
    ) {
      return true;
    }
    const rxDay = new Date(rx.date).toDateString();
    const visitDay = visit.scheduledAt
      ? new Date(visit.scheduledAt).toDateString()
      : new Date(visit.sortTime).toDateString();
    return rxDay === visitDay;
  });
}

function matchesPatientKey(row, patientKey) {
  if (patientKey == null || patientKey === '') return false;
  if (row.patientUid === patientKey || row.id === patientKey) return true;
  const keyNum = Number(patientKey);
  if (!Number.isNaN(keyNum) && row.patientId != null && Number(row.patientId) === keyNum) {
    return true;
  }
  return false;
}

/** Resolve profile header from doctor visit rows (UHID or numeric patient_id). */
export function resolveDoctorPatient(visitRows, patientKey, fallbackName) {
  const found = visitRows.find((p) => matchesPatientKey(p, patientKey));
  if (found) return visitRowToPatientSummary(found);

  const keyNum = Number(patientKey);
  const hasNumericId = !Number.isNaN(keyNum);

  return visitRowToPatientSummary({
    patientUid: hasNumericId ? null : patientKey,
    patientId: hasNumericId ? keyNum : null,
    name: fallbackName || 'Unknown patient',
    age: null,
    gender: '—',
  });
}

/** Attach prescription clinical data + medicines to visit timeline cards */
export function mergeVisitTimelineWithPrescriptions(visits, prescriptions) {
  const usedRx = new Set();
  const withRx = visits.map((visit) => {
    const rxMatch = findPrescriptionForVisit(visit, prescriptions, usedRx);
    if (rxMatch) usedRx.add(rxMatch.id);
    return {
      ...visit,
      diagnosis: coalesceVisitField(visit.diagnosis, rxMatch?.diagnosis),
      notes: coalesceVisitField(visit.notes, rxMatch?.notes),
      medicines: rxMatch?.medicines?.length ? rxMatch.medicines : visit.medicines ?? [],
    };
  });

  const extraRx = prescriptions
    .filter((rx) => !usedRx.has(rx.id))
    .map((rx) => ({
      id: `rx-${rx.id}`,
      appointmentDbId: rx.appointmentId ?? null,
      dateTime: formatVisitDateTime(rx.date),
      sortTime: rxSortTime(rx),
      symptoms: '—',
      diagnosis: rx.diagnosis || '—',
      notes: rx.notes || '—',
      followUp: '—',
      medicines: rx.medicines ?? [],
    }));

  return [...withRx, ...extraRx].sort((a, b) => b.sortTime - a.sortTime);
}
