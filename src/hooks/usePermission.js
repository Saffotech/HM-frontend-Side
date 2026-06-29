import { useAuth } from '@/shared/hooks/useAuth';
import { checkPermission } from '@/hooks/permissions';

/**
 * @param {string} actionOrRole - ACTIONS.* value, or explicit role when second arg is set
 * @param {string} [action] - when provided, first arg is role (legacy overload)
 */
export function usePermission(actionOrRole, action) {
  const { user } = useAuth();

  if (action !== undefined) {
    return checkPermission(
      { role: actionOrRole, permissions: user?.permissions },
      action
    );
  }

  return checkPermission(
    { role: user?.role, permissions: user?.permissions },
    actionOrRole
  );
}
