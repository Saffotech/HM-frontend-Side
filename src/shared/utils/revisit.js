import { REVISIT_DAYS } from '@/shared/constants';

export function daysBetween(dateStr) {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return Infinity;
  return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
}

/** Revisit window from OPD profile visits (preferred when appointments list is not loaded). */
export function getRevisitInfoFromVisits(visits) {
  if (!visits?.length) {
    return { isRevisit: false, registrationFeeApplicable: true, lastAppt: null, daysSince: null };
  }
  const lastVisit = visits.reduce((latest, v) => {
    const raw = v.visitDateIso ?? v.visitDate;
    const d = new Date(raw);
    const latestRaw = latest.visitDateIso ?? latest.visitDate;
    return d > new Date(latestRaw) ? v : latest;
  }, visits[0]);
  const daysSince = daysBetween(lastVisit.visitDateIso ?? lastVisit.visitDate);
  const isRevisit = daysSince <= REVISIT_DAYS;
  return {
    isRevisit,
    registrationFeeApplicable: !isRevisit,
    lastAppt: lastVisit
      ? {
          date: lastVisit.visitDate,
          deptName: lastVisit.department,
          doctorName: lastVisit.doctorName,
        }
      : null,
    daysSince,
  };
}

export function getRevisitInfo(appointments, patientId) {
  const completed = appointments.filter(
    (a) => a.patientId === patientId && a.status === 'Completed'
  );
  if (!completed.length) {
    return { isRevisit: false, registrationFeeApplicable: true, lastAppt: null, daysSince: null };
  }
  const lastAppt = completed.reduce((latest, a) => {
    const d = new Date(a.date);
    return d > new Date(latest.date) ? a : latest;
  }, completed[0]);
  const daysSince = daysBetween(lastAppt.date);
  const isRevisit = daysSince <= REVISIT_DAYS;
  return {
    isRevisit,
    registrationFeeApplicable: !isRevisit,
    lastAppt,
    daysSince,
  };
}
