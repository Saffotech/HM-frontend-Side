import { apiToUiVisitHistoryItem } from '@/shared/api/mappers/doctorPatientMapper';
import { formatVisitDateTime } from '@/features/doctor/utils/patientHistory';
import { parseIpdConsultVisitNotes } from '@/features/doctor/utils/parseIpdConsultVisitNotes';
import {
  getIpdConsultVisitsForAdmission,
  getIpdConsultVisitsForPatient,
} from '@/features/doctor/utils/ipdConsultVisitCache';
import { apiStatusToUiStatus } from '@/shared/api/mappers/appointmentMapper';

function isAdmittedStatus(status) {
  const key = String(status ?? '').toLowerCase();
  return key === 'admit' || key === 'admitted' || key === 'scheduled';
}

function formatFollowUpDisplay(value) {
  if (value == null || value === '' || value === '—') return '—';
  const d = new Date(value);
  if (!Number.isNaN(d.getTime())) {
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
  return String(value);
}

function visitFromConsultRecord(appt, consult) {
  const parsed = parseIpdConsultVisitNotes(consult.visitNotes);
  const visitedAt = consult.visitedAt ?? appt.admittedAt ?? appt.scheduledAt;
  const sortTime = visitedAt ? new Date(visitedAt).getTime() : 0;

  return {
    id: consult.id ?? `ipd-consult-${appt.admissionId}-${sortTime}`,
    admissionId: appt.admissionId ?? consult.admissionId ?? null,
    encounterType: 'IPD',
    appointmentDbId: null,
    scheduledAt: visitedAt ?? null,
    admittedAt: appt.admittedAt ?? null,
    dischargedAt: appt.dischargedAt ?? null,
    dateTime: formatVisitDateTime(null, visitedAt),
    sortTime,
    symptoms: parsed.symptoms || '—',
    diagnosis: parsed.diagnosis || appt.diagnosis || '—',
    notes: parsed.notes || '—',
    followUp: formatFollowUpDisplay(parsed.followUp),
    status: apiStatusToUiStatus(appt.status) ?? appt.status ?? 'Admit',
    medicines: parsed.medicines ?? [],
  };
}

function visitFromAdmission(appt, { sortAt } = {}) {
  const apiShape = {
    patient_uid: appt.patientUid,
    encounter_type: 'IPD',
    admission_id: appt.admissionId,
    admitted_at: appt.admittedAt ?? appt.scheduledAt,
    discharged_at: appt.dischargedAt,
    status: appt.status,
    diagnosis: appt.diagnosis,
    notes: appt.notes,
    symptoms: appt.symptoms,
  };
  const item = apiToUiVisitHistoryItem(apiShape);
  if (!item) return null;

  const timelineAt = sortAt ?? appt.dischargedAt ?? appt.admittedAt ?? appt.scheduledAt;
  const sortTime = timelineAt ? new Date(timelineAt).getTime() : item.sortTime;

  return {
    ...item,
    id: appt.id ? String(appt.id) : `ipd-admission-${appt.admissionId}`,
    admissionId: appt.admissionId ?? null,
    encounterType: 'IPD',
    scheduledAt: timelineAt ?? item.scheduledAt,
    dateTime: formatVisitDateTime(null, timelineAt ?? item.scheduledAt),
    sortTime,
  };
}

function visitAdmissionKey(visit) {
  if (visit?.admissionId != null) return String(visit.admissionId);
  if (typeof visit?.id === 'string' && /^IPD-/i.test(visit.id.trim())) return visit.id.trim();
  return null;
}

function isConsultVisit(visit) {
  return String(visit?.id ?? '').includes('ipd-consult-');
}

function dedupeAndSortVisits(visits) {
  const seenIds = new Set();
  const consultAdmissionIds = new Set(
    visits.filter(isConsultVisit).map((visit) => visitAdmissionKey(visit)).filter(Boolean),
  );

  return visits
    .filter((visit) => {
      const aid = visitAdmissionKey(visit);
      if (aid && consultAdmissionIds.has(aid) && !isConsultVisit(visit)) {
        return false;
      }
      const dedupeKey = visit.id ?? `${visit.admissionId}-${visit.sortTime}`;
      if (seenIds.has(dedupeKey)) return false;
      seenIds.add(dedupeKey);
      return true;
    })
    .sort((a, b) => (b.sortTime ?? 0) - (a.sortTime ?? 0));
}

function indexBaseVisits(visits) {
  const byAdmissionId = new Set();
  const byId = new Set();
  for (const visit of visits ?? []) {
    if (visit?.id != null) byId.add(String(visit.id));
    const key = visitAdmissionKey(visit);
    if (key) byAdmissionId.add(key);
  }
  return { byAdmissionId, byId };
}

/**
 * Merge IPD admissions + cached consult notes into visit timeline.
 * Patient history API only returns discharged IPD; admitted stays need doctor IPD API.
 */
export function mergeIpdIntoVisitHistory(visits, ipdAdmissions = [], patientUid = null) {
  const base = [...(visits ?? [])];
  const { byAdmissionId, byId } = indexBaseVisits(base);
  const extra = [];
  const handledConsultIds = new Set();
  const admissionById = new Map(
    (ipdAdmissions ?? [])
      .filter((row) => row?.admissionId != null)
      .map((row) => [String(row.admissionId), row]),
  );

  for (const appt of ipdAdmissions ?? []) {
    const aid = appt.admissionId;
    const cached = getIpdConsultVisitsForAdmission(aid);

    for (const consult of cached) {
      extra.push(visitFromConsultRecord(appt, consult));
      if (consult.id) handledConsultIds.add(consult.id);
    }

    const aidKey = aid != null ? String(aid) : null;
    const inBaseByAdmission = aidKey ? byAdmissionId.has(aidKey) : false;
    const inBaseById = appt.id ? byId.has(String(appt.id)) : false;

    if (!cached.length && (isAdmittedStatus(appt.status) || (!inBaseByAdmission && !inBaseById))) {
      const item = visitFromAdmission(appt);
      if (item) extra.push(item);
    }
  }

  if (patientUid) {
    for (const consult of getIpdConsultVisitsForPatient(patientUid)) {
      if (consult.id && handledConsultIds.has(consult.id)) continue;

      const appt = admissionById.get(String(consult.admissionId)) ?? {
        admissionId: consult.admissionId,
        patientUid: consult.patientUid,
        admittedAt: consult.visitedAt,
        status: 'Admit',
        diagnosis: null,
        notes: null,
      };

      extra.push(visitFromConsultRecord(appt, consult));
      handledConsultIds.add(consult.id);
    }
  }

  return dedupeAndSortVisits([...extra, ...base]);
}

/** @deprecated use mergeIpdIntoVisitHistory */
export function mergeAdmittedIpdIntoVisitHistory(visits, ipdAdmissions = []) {
  return mergeIpdIntoVisitHistory(visits, ipdAdmissions);
}
