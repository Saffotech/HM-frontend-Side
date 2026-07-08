import { useAuth } from '@/shared/hooks/useAuth';
import { isDemoSuperAdminSession } from '@/features/super-admin/utils/superAdminPortal';

/**
 * True when Super Admin should use mock data instead of backend APIs.
 * Demo portal sessions have no backend super_admin account.
 */
export function useSuperAdminDemoMode() {
  const { user } = useAuth();
  return isDemoSuperAdminSession(user);
}
