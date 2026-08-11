import { useAuth } from '@/shared/hooks/useAuth';
import { hasBackendPermission } from '@/hooks/permissions';

export const PHARMACY_PERMISSIONS = {
  prescriptionsView: 'prescriptions:view',
  prescriptionsDispense: 'prescriptions:dispense',
  profileView: 'pharmacist_profile:view',
  profileUpdate: 'pharmacist_profile:update',
  profileUploadImage: 'pharmacist_profile:upload_image',
  profileDeleteImage: 'pharmacist_profile:delete_image',
  notificationsView: 'notifications:view',
  notificationsUpdate: 'notifications:update',
};

export function usePharmacyPermissionSet() {
  const { user } = useAuth();
  return {
    canViewPrescriptions: hasBackendPermission(user, PHARMACY_PERMISSIONS.prescriptionsView),
    canDispense: hasBackendPermission(user, PHARMACY_PERMISSIONS.prescriptionsDispense),
    canViewProfile: hasBackendPermission(user, PHARMACY_PERMISSIONS.profileView),
    canUpdateProfile: hasBackendPermission(user, PHARMACY_PERMISSIONS.profileUpdate),
    canUploadProfileImage: hasBackendPermission(user, PHARMACY_PERMISSIONS.profileUploadImage),
    canDeleteProfileImage: hasBackendPermission(user, PHARMACY_PERMISSIONS.profileDeleteImage),
    canViewNotifications: hasBackendPermission(user, PHARMACY_PERMISSIONS.notificationsView),
    canUpdateNotifications: hasBackendPermission(user, PHARMACY_PERMISSIONS.notificationsUpdate),
  };
}
