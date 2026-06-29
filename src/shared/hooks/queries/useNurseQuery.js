import { useQuery, useQueries, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getQueue,
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
  updateAdministration,
  getMedicationHistory,
  getPatientMedicationHistory,
  listHandovers,
  getHandover,
  createHandover,
  updateHandover,
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

const NURSE_QUEUE_KPI_FILTERS = {
  waiting: { status: 'waiting', page: 1, page_size: 1 },
  vitals_completed: { status: 'vitals_completed', page: 1, page_size: 1 },
  in_consultation: { status: 'in_consultation', page: 1, page_size: 1 },
  emergency: { priority: 'emergency', page: 1, page_size: 1 },
};

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

/** Dashboard KPI totals — uses backend `total` per filter (page_size 1, no bulk fetch). */
export function useNurseQueueKpiCounts(options = {}) {
  const { enabled = true } = options;
  const token = useQueryToken();
  const entries = Object.entries(NURSE_QUEUE_KPI_FILTERS);
  const results = useQueries({
    queries: entries.map(([, filters]) => ({
      queryKey: queryKeys.nurse.queue(filters),
      queryFn: () => getQueue(filters, token),
      enabled: enabled && Boolean(token),
    })),
  });

  const counts = Object.fromEntries(
    entries.map(([id], index) => [id, results[index].data?.total ?? 0]),
  );
  const isLoading = results.some((result) => result.isLoading);
  const isError = results.some((result) => result.isError);
  const error = results.find((result) => result.isError)?.error;
  const refetch = () => {
    results.forEach((result) => {
      result.refetch?.();
    });
  };

  return { counts, isLoading, isError, error, refetch };
}

function findQueueAppointmentIdForPatient(queueData, patientId) {
  if (!queueData?.items?.length || patientId == null) return null;
  const pid = String(patientId);
  const match = queueData.items.find((item) => String(item.patient_id) === pid);
  if (!match) return null;
  return match.appointment_id ?? match.id ?? null;
}

/**
 * Resolve today's queue appointment_id for a patient (vitals/notes require appointment_id, not patient_id).
 * Uses queue search — backend matches numeric search against patient_id.
 */
export function useNursePatientQueueAppointmentId(patientId, options = {}) {
  const { enabled = true } = options;
  const token = useQueryToken();
  const patientKey = patientId != null ? String(patientId) : '';
  const filters = { search: patientKey, page: 1, page_size: 50 };

  const query = useQuery({
    queryKey: queryKeys.nurse.queue(filters),
    enabled: enabled && Boolean(patientKey) && Boolean(token),
    queryFn: () => getQueue(filters, token),
    select: (data) => findQueueAppointmentIdForPatient(data, patientKey),
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
    },
  });
}

export function useUpdateVitalsMutation(vitalId) {
  const token = useQueryToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => updateVitals(vitalId, data, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nurse', 'vitals'] });
      queryClient.invalidateQueries({ queryKey: ['nurse', 'vitals-search'] });
      if (vitalId) queryClient.invalidateQueries({ queryKey: queryKeys.nurse.vital(vitalId) });
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
    },
  });
}

export function useUpdateNoteMutation(noteId) {
  const token = useQueryToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => updateNote(noteId, data, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nurse', 'notes'] });
      queryClient.invalidateQueries({ queryKey: ['nurse', 'notes-search'] });
      if (noteId) queryClient.invalidateQueries({ queryKey: queryKeys.nurse.note(noteId) });
    },
  });
}

export function useAdministerMedicationMutation(patientId) {
  const token = useQueryToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) =>
      data.id ? updateAdministration(data.id, data, token) : administerMedication(data, token),
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

export function useUpdateHandoverMutation(handoverId) {
  const token = useQueryToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => updateHandover(handoverId, data, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nurse', 'handovers'] });
      if (handoverId) queryClient.invalidateQueries({ queryKey: queryKeys.nurse.handover(handoverId) });
    },
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
