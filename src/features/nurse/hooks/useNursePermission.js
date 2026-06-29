import { useAuth } from '@/shared/hooks/useAuth';
import { hasBackendPermission } from '@/hooks/permissions';

export const NURSE_PERMISSIONS = {
  queueView: 'opd:view',
  patientView: 'patients:view',
  vitalsView: 'nurse_vitals:view',
  vitalsCreate: 'nurse_vitals:create',
  vitalsUpdate: 'nurse_vitals:update',
  notesView: 'nurse_notes:view',
  notesCreate: 'nurse_notes:create',
  notesUpdate: 'nurse_notes:update',
  medicationView: 'nurse_medication:view',
  medicationCreate: 'nurse_medication:create',
  medicationUpdate: 'nurse_medication:update',
  handoverView: 'nurse_handover:view',
  handoverCreate: 'nurse_handover:create',
  handoverUpdate: 'nurse_handover:update',
  handoverSubmit: 'nurse_handover:submit',
  alertsView: 'emergency_alerts:view',
  alertsCreate: 'emergency_alerts:create',
  alertsUpdate: 'emergency_alerts:update',
  alertsEscalate: 'emergency_alerts:escalate',
};

export function useNursePermission(permission) {
  const { user } = useAuth();
  return hasBackendPermission(user, permission);
}

export function useNursePermissionSet() {
  const { user } = useAuth();
  return {
    canViewQueue: hasBackendPermission(user, NURSE_PERMISSIONS.queueView),
    canViewPatients: hasBackendPermission(user, NURSE_PERMISSIONS.patientView),
    canViewVitals: hasBackendPermission(user, NURSE_PERMISSIONS.vitalsView),
    canCreateVitals: hasBackendPermission(user, NURSE_PERMISSIONS.vitalsCreate),
    canUpdateVitals: hasBackendPermission(user, NURSE_PERMISSIONS.vitalsUpdate),
    canViewNotes: hasBackendPermission(user, NURSE_PERMISSIONS.notesView),
    canCreateNotes: hasBackendPermission(user, NURSE_PERMISSIONS.notesCreate),
    canUpdateNotes: hasBackendPermission(user, NURSE_PERMISSIONS.notesUpdate),
    canViewMedication: hasBackendPermission(user, NURSE_PERMISSIONS.medicationView),
    canCreateMedication: hasBackendPermission(user, NURSE_PERMISSIONS.medicationCreate),
    canUpdateMedication: hasBackendPermission(user, NURSE_PERMISSIONS.medicationUpdate),
    canViewHandovers: hasBackendPermission(user, NURSE_PERMISSIONS.handoverView),
    canCreateHandovers: hasBackendPermission(user, NURSE_PERMISSIONS.handoverCreate),
    canUpdateHandovers: hasBackendPermission(user, NURSE_PERMISSIONS.handoverUpdate),
    canSubmitHandovers: hasBackendPermission(user, NURSE_PERMISSIONS.handoverSubmit),
    canViewAlerts: hasBackendPermission(user, NURSE_PERMISSIONS.alertsView),
    canCreateAlerts: hasBackendPermission(user, NURSE_PERMISSIONS.alertsCreate),
    canUpdateAlerts: hasBackendPermission(user, NURSE_PERMISSIONS.alertsUpdate),
    canEscalateAlerts: hasBackendPermission(user, NURSE_PERMISSIONS.alertsEscalate),
  };
}
