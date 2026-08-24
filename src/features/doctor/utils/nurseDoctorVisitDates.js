/**
 * Nurse doctor-visit helpers for doctor UI.
 * GET /doctor/patient-visits is single-day only (defaults to today).
 */

const MAX_LOOKUP_DAYS = 45;

export function toIsoDate(value) {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function todayIsoDate() {
  return toIsoDate(new Date());
}

/** Inclusive calendar days from start → end (capped). */
export function eachIsoDateInclusive(fromIso, toIso, maxDays = MAX_LOOKUP_DAYS) {
  if (!fromIso && !toIso) return [];
  if (!fromIso) return toIso ? [toIso] : [];
  if (!toIso) return [fromIso];

  const start = new Date(`${fromIso}T12:00:00`);
  const stop = new Date(`${toIso}T12:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(stop.getTime())) {
    return [fromIso];
  }

  const first = start <= stop ? start : stop;
  const last = start <= stop ? stop : start;
  const dates = [];
  const cursor = new Date(first);
  while (cursor <= last && dates.length < maxDays) {
    dates.push(toIsoDate(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  if (dates.length >= maxDays) {
    const endIso = toIsoDate(last);
    if (endIso && !dates.includes(endIso)) dates[dates.length - 1] = endIso;
  }
  return dates.filter(Boolean);
}

/**
 * Dates to query for nurse doctor visits for an IPD admission row
 * (or a list of admissions on the patient profile).
 */
export function nurseVisitDatesFromAdmissions(admissions = []) {
  const today = todayIsoDate();
  const dateSet = new Set();

  const rows = Array.isArray(admissions) ? admissions : [];
  if (rows.length === 0) {
    if (today) dateSet.add(today);
    // Also look back a short window so profile is not empty for recent visits.
    const start = new Date();
    start.setDate(start.getDate() - 13);
    eachIsoDateInclusive(toIsoDate(start), today, 14).forEach((d) => dateSet.add(d));
    return [...dateSet];
  }

  for (const row of rows) {
    const admitted = toIsoDate(row.admittedAt ?? row.scheduledAt);
    const discharged = toIsoDate(row.dischargedAt);
    let end = today;
    if (discharged && today && discharged < today) end = discharged;
    eachIsoDateInclusive(admitted, end || admitted || today, MAX_LOOKUP_DAYS).forEach((d) =>
      dateSet.add(d),
    );
  }

  if (today) dateSet.add(today);
  return [...dateSet].sort();
}

export function mergeNurseDoctorVisits(dayResponses = []) {
  const byId = new Map();
  let patient_id = null;
  let patient_uid = null;
  let patient_name = '';

  for (const day of dayResponses) {
    if (!day) continue;
    if (day.patient_id != null) patient_id = day.patient_id;
    if (day.patient_uid) patient_uid = day.patient_uid;
    if (day.patient_name) patient_name = day.patient_name;
    for (const visit of day.visits ?? []) {
      if (visit?.id == null) continue;
      byId.set(visit.id, visit);
    }
  }

  // API visit_number is day-scoped; renumber across the full stay (oldest = 1).
  const chronological = [...byId.values()].sort((a, b) => {
    const ta = a.visited_at ? new Date(a.visited_at).getTime() : 0;
    const tb = b.visited_at ? new Date(b.visited_at).getTime() : 0;
    if (ta !== tb) return ta - tb;
    return Number(a.id) - Number(b.id);
  });

  const numbered = chronological.map((visit, index) => ({
    ...visit,
    visit_number: index + 1,
  }));

  // Newest first for the profile table.
  const visits = [...numbered].sort((a, b) => {
    const ta = a.visited_at ? new Date(a.visited_at).getTime() : 0;
    const tb = b.visited_at ? new Date(b.visited_at).getTime() : 0;
    if (ta !== tb) return tb - ta;
    return Number(b.id) - Number(a.id);
  });

  return {
    patient_id,
    patient_uid,
    patient_name,
    visit_date: null,
    visit_count: visits.length,
    visits,
  };
}
