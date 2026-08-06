import { useAuth } from '@/shared/hooks/useAuth';
import { hasBackendPermission } from '@/hooks/permissions';

export const DOCTOR_PERMISSIONS = {
  appointmentsView: 'appointments:view',
  appointmentsUpdate: 'appointments:update',
  patientsView: 'patients:view',
  prescriptionsCreate: 'prescriptions:create',
  prescriptionsUpdate: 'prescriptions:update',
  prescriptionsDelete: 'prescriptions:delete',
  labView: 'lab:view',
  labCreate: 'lab:create',
  profileView: 'doctor_profile:view',
  profileUpdate: 'doctor_profile:update',
  profileUploadImage: 'doctor_profile:upload_image',
  profileDeleteImage: 'doctor_profile:delete_image',
  notificationsView: 'notifications:view',
  notificationsUpdate: 'notifications:update',
};

export function useDoctorPermission(permission) {
  const { user } = useAuth();
  return hasBackendPermission(user, permission);
}

export function useDoctorPermissionSet() {
  const { user } = useAuth();
  return {
    canViewAppointments: hasBackendPermission(user, DOCTOR_PERMISSIONS.appointmentsView),
    canUpdateAppointments: hasBackendPermission(user, DOCTOR_PERMISSIONS.appointmentsUpdate),
    canViewPatients: hasBackendPermission(user, DOCTOR_PERMISSIONS.patientsView),
    canCreatePrescriptions: hasBackendPermission(user, DOCTOR_PERMISSIONS.prescriptionsCreate),
    canUpdatePrescriptions: hasBackendPermission(user, DOCTOR_PERMISSIONS.prescriptionsUpdate),
    canDeletePrescriptions: hasBackendPermission(user, DOCTOR_PERMISSIONS.prescriptionsDelete),
    canViewLabs: hasBackendPermission(user, DOCTOR_PERMISSIONS.labView),
    canCreateLabs: hasBackendPermission(user, DOCTOR_PERMISSIONS.labCreate),
    canViewProfile: hasBackendPermission(user, DOCTOR_PERMISSIONS.profileView),
    canUpdateProfile: hasBackendPermission(user, DOCTOR_PERMISSIONS.profileUpdate),
    canUploadProfileImage: hasBackendPermission(user, DOCTOR_PERMISSIONS.profileUploadImage),
    canDeleteProfileImage: hasBackendPermission(user, DOCTOR_PERMISSIONS.profileDeleteImage),
    canViewNotifications: hasBackendPermission(user, DOCTOR_PERMISSIONS.notificationsView),
    canUpdateNotifications: hasBackendPermission(user, DOCTOR_PERMISSIONS.notificationsUpdate),
  };
}
