import { useAuth } from '@/shared/hooks/useAuth';
import { hasBackendPermission } from '@/hooks/permissions';

/**
 * Future backend permission keys for IPD.
 * Until seeded, hasBackendPermission returns false — sidebar still shows
 * core nav when role is IPD (see IpdLayout fallback).
 */
export const IPD_PERMISSIONS = {
  dashboardView: 'ipd:dashboard',
  patientsList: 'ipd:patients:list',
  patientsView: 'ipd:patients:view',
  /** Shared Patient Master create (UHID) — not an OPD visit. */
  patientsCreate: 'patients:create',
  admitCreate: 'ipd:admission:create',
  bedsView: 'ipd:beds:view',
  bedsAssign: 'ipd:beds:assign',
  bedsTransfer: 'ipd:beds:transfer',
  billingView: 'ipd:bill:view',
  billingGenerate: 'ipd:bill:generate',
  billingPay: 'ipd:bill:pay',
  paymentHistory: 'ipd:bill:history',
  pricingView: 'ipd:pricing',
  discharge: 'ipd:admission:discharge',
  profileView: 'ipd_profile:view',
  profileUpdate: 'ipd_profile:update',
  profileUploadImage: 'ipd_profile:upload_image',
  profileDeleteImage: 'ipd_profile:delete_image',
};

export function useIpdPermissionSet() {
  const { user } = useAuth();
  const isIpdRole = user?.role === 'ipd';

  const check = (permission) => hasBackendPermission(user, permission);

  return {
    /** Scaffold: IPD role may browse UI before fine-grained perms exist. */
    canViewDashboard: check(IPD_PERMISSIONS.dashboardView) || isIpdRole,
    canListPatients: check(IPD_PERMISSIONS.patientsList) || isIpdRole,
    canViewPatient: check(IPD_PERMISSIONS.patientsView) || isIpdRole,
    canCreatePatient: check(IPD_PERMISSIONS.patientsCreate) || isIpdRole,
    canAdmit: check(IPD_PERMISSIONS.admitCreate) || isIpdRole,
    canViewBeds: check(IPD_PERMISSIONS.bedsView) || isIpdRole,
    canAssignBed: check(IPD_PERMISSIONS.bedsAssign) || isIpdRole,
    canTransferBed: check(IPD_PERMISSIONS.bedsTransfer) || isIpdRole,
    canViewBilling: check(IPD_PERMISSIONS.billingView) || isIpdRole,
    canGenerateBill: check(IPD_PERMISSIONS.billingGenerate) || isIpdRole,
    canPayBill: check(IPD_PERMISSIONS.billingPay) || isIpdRole,
    canViewPaymentHistory: check(IPD_PERMISSIONS.paymentHistory) || isIpdRole,
    canViewPricing: check(IPD_PERMISSIONS.pricingView) || isIpdRole,
    canDischarge: check(IPD_PERMISSIONS.discharge) || isIpdRole,
    canViewProfile: check(IPD_PERMISSIONS.profileView) || isIpdRole,
    canUpdateProfile: check(IPD_PERMISSIONS.profileUpdate) || isIpdRole,
    canUploadProfileImage: check(IPD_PERMISSIONS.profileUploadImage) || isIpdRole,
    canDeleteProfileImage: check(IPD_PERMISSIONS.profileDeleteImage) || isIpdRole,
  };
}
