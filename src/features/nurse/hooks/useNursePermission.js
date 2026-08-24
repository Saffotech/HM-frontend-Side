import { useAuth } from '@/shared/hooks/useAuth';
import { hasBackendPermission } from '@/hooks/permissions';

const NURSE_PERMISSIONS = {
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
  doctorVisitsView: 'nurse_doctor_visits:view',
  doctorVisitsCreate: 'nurse_doctor_visits:create',
  doctorVisitsUpdate: 'nurse_doctor_visits:update',
  labReportsView: 'nurse_lab_reports:view',
  profileView: 'nurse_profile:view',
  profileUpdate: 'nurse_profile:update',
  profileUploadImage: 'nurse_profile:upload_image',
  profileDeleteImage: 'nurse_profile:delete_image',
};

export function useNursePermission(permission) {
  const { user } = useAuth();
  return hasBackendPermission(user, permission);
}

export function useNursePermissionSet() {
  const { user } = useAuth();
  return {
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
    canViewProfile: hasBackendPermission(user, NURSE_PERMISSIONS.profileView),
    canUpdateProfile: hasBackendPermission(user, NURSE_PERMISSIONS.profileUpdate),
    canUploadProfileImage: hasBackendPermission(user, NURSE_PERMISSIONS.profileUploadImage),
    canDeleteProfileImage: hasBackendPermission(user, NURSE_PERMISSIONS.profileDeleteImage),
    canViewDoctorVisits: hasBackendPermission(user, NURSE_PERMISSIONS.doctorVisitsView),
    canCreateDoctorVisits: hasBackendPermission(user, NURSE_PERMISSIONS.doctorVisitsCreate),
    canUpdateDoctorVisits: hasBackendPermission(user, NURSE_PERMISSIONS.doctorVisitsUpdate),
    canViewLabReports: hasBackendPermission(user, NURSE_PERMISSIONS.labReportsView),
  };
}

