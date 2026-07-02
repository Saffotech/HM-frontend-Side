import { compareAppointmentsByDateTime } from './doctorDates';

/** Primary workflow status (API → UI mapped `status` field). */
export function getAppointmentStatus(appt) {
  return appt?.status || 'Scheduled';
}

/** Doctor dashboard display — hides waiting / in-progress states. */
export function getDoctorDisplayStatus(apptOrStatus) {
  const s = typeof apptOrStatus === 'string' ? apptOrStatus : getAppointmentStatus(apptOrStatus);
  if (s === 'Waiting' || s === 'In Progress') return 'Scheduled';
  return s;
}

export function isPendingConsultation(appt) {
  const s = getAppointmentStatus(appt);
  return s === 'Scheduled' || s === 'Waiting' || s === 'In Progress';
}

/** @deprecated Use getAppointmentStatus */
export function getConsultStatus(appt) {
  return getAppointmentStatus(appt);
}

export function isConsultCompleted(appt) {
  return getAppointmentStatus(appt) === 'Completed';
}

export function isConsultCancelled(appt) {
  return getAppointmentStatus(appt) === 'Cancelled';
}

/** Still on today's doctor board (not finished or cancelled). */
export function isActiveConsultation(appt) {
  return !isConsultCompleted(appt) && !isConsultCancelled(appt);
}

/** Shown on calendar week counts and day lists (excludes cancelled only). */
export function isCalendarVisible(appt) {
  return !isConsultCancelled(appt);
}

/** Future / open visits for the Upcoming section. */
export function isUpcomingAppointment(appt) {
  const s = getAppointmentStatus(appt);
  return s === 'Scheduled' || s === 'Waiting' || s === 'In Progress';
}

/** Waiting to be called — includes emergency triage while still waiting. */
export function isInWaitingQueue(appt) {
  const s = getAppointmentStatus(appt);
  if (s === 'In Progress' || s === 'Completed' || s === 'Cancelled') return false;
  return s === 'Waiting' || s === 'Scheduled' || appt?.type === 'Emergency';
}

export function initialConsultStatusForAppointment(appt) {
  if (appt?.type === 'Emergency') return 'Waiting';
  return 'Waiting';
}

/** Queue: emergencies first, then waiting, then by appointment time. */
export function compareQueueOrder(a, b) {
  const rank = (x) => {
    if (x.type === 'Emergency' && getAppointmentStatus(x) === 'Waiting') return 0;
    if (getAppointmentStatus(x) === 'Waiting') return 1;
    return 2;
  };
  const byPriority = rank(a) - rank(b);
  if (byPriority !== 0) return byPriority;
  return compareAppointmentsByDateTime(a, b);
}

export function canCallPatient(appt) {
  return isInWaitingQueue(appt);
}

/** Allowed manual status actions in appointment detail (doctor uses Consult modal to complete). */
export function getAppointmentStatusActions(uiStatus) {
  const display = getDoctorDisplayStatus(uiStatus);
  if (display === 'Completed' || display === 'Cancelled') return [];
  return [{ label: 'Cancel Appointment', status: 'Cancelled', variant: 'danger' }];
}
