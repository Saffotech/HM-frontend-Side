import { useMutation, useQuery } from '@tanstack/react-query';
import {
  closeNurseAlert,
  getNurseAlertsSummary,
  listNurseAlerts,
  listNurseMedicationHistory,
  listNurseNotes,
  listNurseVitals,
  listRolePermissionsCatalog,
  resolveNurseAlert,
} from '@/features/admin/nurse/api/nurseAdmin';

export function useNurseAdminAlertsQuery(filters = {}, options = {}) {
  const { enabled = true } = options;
  return useQuery({
    queryKey: ['admin', 'nurse-management', 'alerts', filters],
    queryFn: () => listNurseAlerts(filters),
    enabled,
  });
}

export function useNurseAdminAlertsSummaryQuery(options = {}) {
  const { enabled = true } = options;
  return useQuery({
    queryKey: ['admin', 'nurse-management', 'alerts-summary'],
    queryFn: () => getNurseAlertsSummary(),
    enabled,
  });
}

export function useNurseAdminVitalsQuery(filters = {}, options = {}) {
  const { enabled = true } = options;
  return useQuery({
    queryKey: ['admin', 'nurse-management', 'vitals', filters],
    queryFn: () => listNurseVitals(filters),
    enabled,
  });
}

export function useNurseAdminNotesQuery(filters = {}, options = {}) {
  const { enabled = true } = options;
  return useQuery({
    queryKey: ['admin', 'nurse-management', 'notes', filters],
    queryFn: () => listNurseNotes(filters),
    enabled,
  });
}

export function useNurseAdminMedicationHistoryQuery(filters = {}, options = {}) {
  const { enabled = true } = options;
  return useQuery({
    queryKey: ['admin', 'nurse-management', 'medication-history', filters],
    queryFn: () => listNurseMedicationHistory(filters),
    enabled,
  });
}

export function useRolePermissionsCatalogQuery(options = {}) {
  const { enabled = true } = options;
  return useQuery({
    queryKey: ['admin', 'nurse-management', 'permissions-catalog'],
    queryFn: () => listRolePermissionsCatalog(),
    enabled,
  });
}

export function useResolveAlertMutation() {
  return useMutation({ mutationFn: ({ alertId, payload }) => resolveNurseAlert(alertId, payload) });
}

export function useCloseAlertMutation() {
  return useMutation({ mutationFn: ({ alertId, payload }) => closeNurseAlert(alertId, payload) });
}
