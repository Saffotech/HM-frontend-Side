import { useAuth } from '@/shared/hooks/useAuth';
import { hasBackendPermission } from '@/hooks/permissions';

export const LAB_PERMISSIONS = {
  labView: 'lab:view',
  labUpdate: 'lab:update',
  labUploadReport: 'lab:upload_report',
  profileView: 'lab_technician_profile:view',
  profileUpdate: 'lab_technician_profile:update',
  profileUploadImage: 'lab_technician_profile:upload_image',
  profileDeleteImage: 'lab_technician_profile:delete_image',
  notificationsView: 'notifications:view',
  notificationsUpdate: 'notifications:update',
};

export function useLabPermission(permission) {
  const { user } = useAuth();
  return hasBackendPermission(user, permission);
}

export function useLabPermissionSet() {
  const { user } = useAuth();
  return {
    canViewLab: hasBackendPermission(user, LAB_PERMISSIONS.labView),
    canUpdateLab: hasBackendPermission(user, LAB_PERMISSIONS.labUpdate),
    canUploadReport: hasBackendPermission(user, LAB_PERMISSIONS.labUploadReport),
    canViewProfile: hasBackendPermission(user, LAB_PERMISSIONS.profileView),
    canUpdateProfile: hasBackendPermission(user, LAB_PERMISSIONS.profileUpdate),
    canUploadProfileImage: hasBackendPermission(user, LAB_PERMISSIONS.profileUploadImage),
    canDeleteProfileImage: hasBackendPermission(user, LAB_PERMISSIONS.profileDeleteImage),
    canViewNotifications: hasBackendPermission(user, LAB_PERMISSIONS.notificationsView),
    canUpdateNotifications: hasBackendPermission(user, LAB_PERMISSIONS.notificationsUpdate),
  };
}
