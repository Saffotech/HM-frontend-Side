import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getQueue,
  getBedPatients,
  getVital,
  listVitals,
  searchVitals,
  createVitals,
  updateVitals,
  getNote,
  listNotes,
  searchNotes,
  createNote,
  updateNote,
  getMedicationPatients,
  getPatientMedications,
  administerMedication,
  getMedicationHistory,
  getPatientMedicationHistory,
  listHandovers,
  getHandover,
  createHandover,
  bulkAddPatients,
  updatePatientRow,
  deletePatientRow,
  submitHandover,
  getAlerts,
  getAlertSummary,
  getAlert,
  createAlert,
  assignAlert,
  resolveAlert,
  escalateAlert,
} from '@/shared/api/services/nurse';
import { queryKeys } from '@/shared/api/queryKeys';
import { useQueryToken } from '@/shared/hooks/useQueryToken';
import { listAppointmentsPage, listAppointmentsForPatientPage } from '@/shared/api/services/appointments';

export function useNurseQueueQuery(filters = {}, options = {}) {
  const { enabled = true } = options;
  const token = useQueryToken();
  return useQuery({
    queryKey: queryKeys.nurse.queue(filters),
    enabled,
    queryFn: () => getQueue(filters, token),
    staleTime: 30 * 1000,
  });
}

/** Bed-assigned patients — primary nurse dashboard list. */
export function useNurseBedPatientsQuery(filters = {}, options = {}) {
  const { enabled = true } = options;
  const token = useQueryToken();
  return useQuery({
    queryKey: queryKeys.nurse.bedPatients(filters),
    enabled: enabled && Boolean(token),
    queryFn: () => getBedPatients(filters, token),
    staleTime: 30 * 1000,
  });
}

function findQueueAppointmentIdForPatient(queueData, patientId) {
  if (!queueData?.items?.length || patientId == null) return null;
  const pid = String(patientId);
  const match = queueData.items.find((item) => String(item.patient_id) === pid);
  if (!match) return null;
  return match.appointment_id ?? match.id ?? null;
}

function appointmentSortTime(appt) {
  const raw = appt?.scheduledAt ?? appt?.createdAt ?? appt?.date;
  const ts = raw ? new Date(raw).getTime() : 0;
  return Number.isNaN(ts) ? 0 : ts;
}

/** Prefer latest non-cancelled OPD appointment for bed/IPD patients (no nurse queue row). */
function pickAppointmentIdFromList(appointments, patientId) {
  if (!appointments?.length || patientId == null) return null;
  const pid = String(patientId);
  const matches = appointments.filter((appt) => {
    const status = String(appt?.status ?? '').toLowerCase();
    if (status === 'cancelled') return false;
    const dbId = appt.patientDbId ?? appt.patient_id;
    return dbId != null && String(dbId) === pid;
  });
  if (!matches.length) return null;
  matches.sort((a, b) => appointmentSortTime(b) - appointmentSortTime(a));
  const best = matches[0];
  return best.dbId ?? best.id ?? null;
}

/**
 * Resolve appointment_id for vitals/notes.
 * 1) Nurse OPD queue (today)
 * 2) Fallback: patient's OPD appointments (bed-assigned patients are often not on the queue)
 */
export function useNursePatientQueueAppointmentId(patientId, options = {}) {
  const { enabled = true } = options;
  const token = useQueryToken();
  const patientKey = patientId != null ? String(patientId) : '';
  const patientDbId = Number(patientKey);
  const filters = { search: patientKey, page: 1, page_size: 50 };
  const canResolve =
    enabled && Boolean(patientKey) && Boolean(token) && Number.isSafeInteger(patientDbId) && patientDbId >= 1;

  const query = useQuery({
    queryKey: queryKeys.nurse.patientAppointment(patientKey),
    enabled: canResolve,
    queryFn: async () => {
      try {
        const queueData = await getQueue(filters, token);
        const fromQueue = findQueueAppointmentIdForPatient(queueData, patientKey);
        if (fromQueue != null) return fromQueue;
      } catch {
        /* Bed patients often have no queue access path — fall through to appointments. */
      }

      try {
        const page = await listAppointmentsPage(
          token,
          { patient_id: patientDbId, page: 1, limit: 50, sort: 'scheduled_at', order: 'desc' },
          { softFail: true },
        );
        const fromFiltered = pickAppointmentIdFromList(page?.appointments, patientKey);
        if (fromFiltered != null) return fromFiltered;

        const scanned = await listAppointmentsForPatientPage(token, {
          patientDbId,
          page: 1,
          limit: 20,
          maxScanPages: 10,
        });
        return pickAppointmentIdFromList(scanned?.appointments, patientKey);
      } catch {
        return null;
      }
    },
    staleTime: 30 * 1000,
  });

  return {
    appointmentId: query.data ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

export function useNurseVitalQuery(vitalId, options = {}) {
  const { enabled = true } = options;
  const token = useQueryToken();
  return useQuery({
    queryKey: queryKeys.nurse.vital(vitalId),
    enabled: enabled && Boolean(vitalId),
    queryFn: () => getVital(vitalId, token),
  });
}

export function useNurseVitalsListQuery(filters = {}, options = {}) {
  const { enabled = true } = options;
  const token = useQueryToken();
  return useQuery({
    queryKey: queryKeys.nurse.vitals(filters),
    enabled,
    queryFn: () => listVitals(filters, token),
  });
}

export function useNurseVitalsSearchQuery(filters = {}, options = {}) {
  const { enabled = true } = options;
  const token = useQueryToken();
  return useQuery({
    queryKey: queryKeys.nurse.vitalsSearch(filters),
    enabled,
    queryFn: () => searchVitals(filters, token),
  });
}

export function useNurseNoteQuery(noteId, options = {}) {
  const { enabled = true } = options;
  const token = useQueryToken();
  return useQuery({
    queryKey: queryKeys.nurse.note(noteId),
    enabled: enabled && Boolean(noteId),
    queryFn: () => getNote(noteId, token),
  });
}

export function useNurseNotesListQuery(filters = {}, options = {}) {
  const { enabled = true } = options;
  const token = useQueryToken();
  return useQuery({
    queryKey: queryKeys.nurse.notes(filters),
    enabled,
    queryFn: () => listNotes(filters, token),
  });
}

export function useNurseNotesSearchQuery(filters = {}, options = {}) {
  const { enabled = true } = options;
  const token = useQueryToken();
  return useQuery({
    queryKey: queryKeys.nurse.notesSearch(filters),
    enabled,
    queryFn: () => searchNotes(filters, token),
  });
}

export function useNurseMedicationPatientsQuery(filters = {}, options = {}) {
  const { enabled = true } = options;
  const token = useQueryToken();
  return useQuery({
    queryKey: queryKeys.nurse.medicationPatients(filters),
    enabled,
    queryFn: () => getMedicationPatients(filters, token),
    staleTime: 30 * 1000,
  });
}

export function useNursePatientMedicationsQuery(patientId, options = {}) {
  const { enabled = true } = options;
  const token = useQueryToken();
  return useQuery({
    queryKey: queryKeys.nurse.patientMedications(patientId),
    enabled: enabled && Boolean(patientId),
    queryFn: () => getPatientMedications(patientId, token),
    staleTime: 30 * 1000,
  });
}

export function useNurseMedicationHistoryQuery(filters = {}, options = {}) {
  const { enabled = true } = options;
  const token = useQueryToken();
  return useQuery({
    queryKey: queryKeys.nurse.medicationHistory(filters),
    enabled,
    queryFn: () => getMedicationHistory(filters, token),
    staleTime: 30 * 1000,
  });
}

export function useNursePatientMedHistoryQuery(patientId, options = {}) {
  const { enabled = true } = options;
  const token = useQueryToken();
  return useQuery({
    queryKey: queryKeys.nurse.patientMedHistory(patientId),
    enabled: enabled && Boolean(patientId),
    queryFn: () => getPatientMedicationHistory(patientId, token),
    staleTime: 30 * 1000,
  });
}

export function useNurseHandoversQuery(filters = {}, options = {}) {
  const { enabled = true } = options;
  const token = useQueryToken();
  return useQuery({
    queryKey: queryKeys.nurse.handovers(filters),
    enabled,
    queryFn: () => listHandovers(filters, token),
  });
}

export function useNurseHandoverQuery(id, options = {}) {
  const { enabled = true } = options;
  const token = useQueryToken();
  return useQuery({
    queryKey: queryKeys.nurse.handover(id),
    enabled: enabled && Boolean(id),
    queryFn: () => getHandover(id, token),
  });
}

export function useNurseAlertsQuery(filters = {}, options = {}) {
  const { enabled = true } = options;
  const token = useQueryToken();
  return useQuery({
    queryKey: queryKeys.nurse.alerts(filters),
    enabled,
    queryFn: () => getAlerts(filters, token),
    staleTime: 30 * 1000,
  });
}

export function useNurseAlertSummaryQuery(options = {}) {
  const { enabled = true } = options;
  const token = useQueryToken();
  return useQuery({
    queryKey: queryKeys.nurse.alertSummary,
    enabled,
    queryFn: () => getAlertSummary(token),
    staleTime: 30 * 1000,
  });
}

export function useNurseAlertQuery(alertId, options = {}) {
  const { enabled = true } = options;
  const token = useQueryToken();
  return useQuery({
    queryKey: queryKeys.nurse.alert(alertId),
    enabled: enabled && Boolean(alertId),
    queryFn: () => getAlert(alertId, token),
  });
}

export function useCreateVitalsMutation() {
  const token = useQueryToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => createVitals(data, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nurse', 'vitals'] });
      queryClient.invalidateQueries({ queryKey: ['nurse', 'vitals-search'] });
      queryClient.invalidateQueries({ queryKey: ['nurse', 'queue'] });
      queryClient.invalidateQueries({ queryKey: ['nurse', 'bed-patients'] });
    },
  });
}

export function useUpdateVitalsMutation(vitalId) {
  const token = useQueryToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => updateVitals(vitalId, data, token),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['nurse', 'vitals'] });
      queryClient.invalidateQueries({ queryKey: ['nurse', 'vitals-search'] });
      if (vitalId) queryClient.invalidateQueries({ queryKey: queryKeys.nurse.vital(vitalId) });
      if (updated?.id) {
        queryClient.setQueryData(queryKeys.nurse.vital(updated.id), updated);
        queryClient.invalidateQueries({ queryKey: queryKeys.nurse.vital(updated.id) });
      }
    },
  });
}

export function useCreateNoteMutation() {
  const token = useQueryToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => createNote(data, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nurse', 'notes'] });
      queryClient.invalidateQueries({ queryKey: ['nurse', 'notes-search'] });
      queryClient.invalidateQueries({ queryKey: ['nurse', 'queue'] });
      queryClient.invalidateQueries({ queryKey: ['nurse', 'bed-patients'] });
    },
  });
}

export function useUpdateNoteMutation(noteId) {
  const token = useQueryToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => updateNote(noteId, data, token),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['nurse', 'notes'] });
      queryClient.invalidateQueries({ queryKey: ['nurse', 'notes-search'] });
      if (noteId) queryClient.invalidateQueries({ queryKey: queryKeys.nurse.note(noteId) });
      if (updated?.id) {
        queryClient.setQueryData(queryKeys.nurse.note(updated.id), updated);
        queryClient.invalidateQueries({ queryKey: queryKeys.nurse.note(updated.id) });
      }
    },
  });
}

export function useAdministerMedicationMutation(patientId) {
  const token = useQueryToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => administerMedication(data, token),
    onSuccess: () => {
      if (patientId) queryClient.invalidateQueries({ queryKey: queryKeys.nurse.patientMedications(patientId) });
      if (patientId) queryClient.invalidateQueries({ queryKey: queryKeys.nurse.patientMedHistory(patientId) });
      queryClient.invalidateQueries({ queryKey: ['nurse', 'medication-history'] });
      queryClient.invalidateQueries({ queryKey: ['nurse', 'medication-patients'] });
    },
  });
}

export function useCreateHandoverMutation() {
  const token = useQueryToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => createHandover(data, token),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.nurse.handovers() }),
  });
}

export function useBulkAddHandoverPatientsMutation(handoverId) {
  const token = useQueryToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patients) => bulkAddPatients(handoverId, patients, token),
    onSuccess: () => {
      if (handoverId) queryClient.invalidateQueries({ queryKey: queryKeys.nurse.handover(handoverId) });
    },
  });
}

export function useUpdateHandoverPatientMutation(handoverId) {
  const token = useQueryToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ summaryId, data }) => updatePatientRow(summaryId, data, token),
    onSuccess: () => {
      if (handoverId) queryClient.invalidateQueries({ queryKey: queryKeys.nurse.handover(handoverId) });
    },
  });
}

export function useDeleteHandoverPatientMutation(handoverId) {
  const token = useQueryToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (summaryId) => deletePatientRow(summaryId, token),
    onSuccess: () => {
      if (handoverId) queryClient.invalidateQueries({ queryKey: queryKeys.nurse.handover(handoverId) });
    },
  });
}

export function useSubmitHandoverMutation(handoverId) {
  const token = useQueryToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => submitHandover(handoverId, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nurse', 'handovers'] });
      if (handoverId) queryClient.invalidateQueries({ queryKey: queryKeys.nurse.handover(handoverId) });
    },
  });
}

export function useCreateAlertMutation() {
  const token = useQueryToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => createAlert(data, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nurse', 'alerts'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.nurse.alertSummary });
    },
  });
}

export function useAssignAlertMutation(alertId) {
  const token = useQueryToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => assignAlert(alertId, data, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nurse', 'alerts'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.nurse.alertSummary });
      if (alertId) queryClient.invalidateQueries({ queryKey: queryKeys.nurse.alert(alertId) });
    },
  });
}

export function useResolveAlertMutation(alertId) {
  const token = useQueryToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => resolveAlert(alertId, data, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nurse', 'alerts'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.nurse.alertSummary });
      if (alertId) queryClient.invalidateQueries({ queryKey: queryKeys.nurse.alert(alertId) });
    },
  });
}

export function useEscalateAlertMutation(alertId) {
  const token = useQueryToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => escalateAlert(alertId, data, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nurse', 'alerts'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.nurse.alertSummary });
      if (alertId) queryClient.invalidateQueries({ queryKey: queryKeys.nurse.alert(alertId) });
    },
  });
}
