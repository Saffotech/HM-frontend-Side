/** Doctor consultation queue helpers (separate from OPD billing queue). */

export function isQueueWaiting(row) {
  const s = row?.status;
  return s === 'Waiting' || s === 'waiting';
}

export function isQueueInConsultation(row) {
  const s = row?.status;
  return s === 'In Consultation' || s === 'in_consultation' || s === 'in_progress';
}

export function isQueueTerminal(row) {
  const s = row?.status;
  return s === 'Completed' || s === 'completed' || s === 'Cancelled' || s === 'cancelled';
}

export function compareQueueRows(a, b) {
  const pa = Number(b.priority) - Number(a.priority);
  if (pa !== 0) return pa;
  return (a.tokenNumber ?? 0) - (b.tokenNumber ?? 0);
}

export function findQueueRowForAppointment(todayQueue, appointmentDbId) {
  return todayQueue.find((q) => q.appointmentId === appointmentDbId) ?? null;
}
