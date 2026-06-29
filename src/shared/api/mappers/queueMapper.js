/**
 * Doctor consultation queue row ↔ UI mapping.
 */

const QUEUE_STATUS_TO_UI = {
  waiting: 'Waiting',
  vitals_completed: 'Vitals Completed',
  in_consultation: 'In Consultation',
  in_progress: 'In Consultation',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export function apiStatusToUiQueueStatus(apiStatus) {
  if (apiStatus == null || apiStatus === '') return null;
  const key = String(apiStatus).toLowerCase();
  return QUEUE_STATUS_TO_UI[key] ?? apiStatus;
}

export function apiToUiQueueRow(api) {
  if (!api) return null;
  return {
    queueId: api.id,
    appointmentId: api.appointment_id ?? api.appointmentId,
    patientId: api.patient_id ?? api.patientId,
    patientUid: api.patient_uhid ?? api.patientUid,
    tokenNumber: api.token_number ?? api.tokenNumber,
    priority: api.priority ?? 0,
    status: apiStatusToUiQueueStatus(api.status),
  };
}

export function mapQueueList(rows) {
  return (rows ?? []).map(apiToUiQueueRow).filter(Boolean);
}
