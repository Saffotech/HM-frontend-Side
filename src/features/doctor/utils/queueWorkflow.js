/** Doctor consultation queue helpers (separate from OPD billing queue). */

export function findQueueRowForAppointment(todayQueue, appointmentDbId) {
  return todayQueue.find((q) => q.appointmentId === appointmentDbId) ?? null;
}
