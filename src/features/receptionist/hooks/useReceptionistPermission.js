import { useAuth } from '@/shared/hooks/useAuth';
import { hasBackendPermission } from '@/hooks/permissions';

export const RECEPTIONIST_PERMISSIONS = {
  queuesView: 'receptionist:view_queues',
  doctorScheduleView: 'receptionist:view_doctor_schedule',
  profileView: 'receptionist_profile:view',
  profileUpdate: 'receptionist_profile:update',
  profileUploadImage: 'receptionist_profile:upload_image',
  profileDeleteImage: 'receptionist_profile:delete_image',
  notificationsView: 'notifications:view',
  notificationsUpdate: 'notifications:update',
};

export function useReceptionistPermission(permission) {
  const { user } = useAuth();
  return hasBackendPermission(user, permission);
}

export function useReceptionistPermissionSet() {
  const { user } = useAuth();
  return {
    canViewQueues: hasBackendPermission(user, RECEPTIONIST_PERMISSIONS.queuesView),
    canViewDoctorSchedule: hasBackendPermission(
      user,
      RECEPTIONIST_PERMISSIONS.doctorScheduleView,
    ),
    canViewProfile: hasBackendPermission(user, RECEPTIONIST_PERMISSIONS.profileView),
    canUpdateProfile: hasBackendPermission(user, RECEPTIONIST_PERMISSIONS.profileUpdate),
    canUploadProfileImage: hasBackendPermission(
      user,
      RECEPTIONIST_PERMISSIONS.profileUploadImage,
    ),
    canDeleteProfileImage: hasBackendPermission(
      user,
      RECEPTIONIST_PERMISSIONS.profileDeleteImage,
    ),
    canViewNotifications: hasBackendPermission(user, RECEPTIONIST_PERMISSIONS.notificationsView),
    canUpdateNotifications: hasBackendPermission(
      user,
      RECEPTIONIST_PERMISSIONS.notificationsUpdate,
    ),
  };
}
