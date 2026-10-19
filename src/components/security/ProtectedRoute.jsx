import { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/shared/hooks/useAuth';
import { ROUTES, ROLES } from '@/shared/constants';
import PageSpinner from '@/shared/components/PageSpinner';
import { isValidTenantId } from '@/components/security/hospitalIdentity';
import {
  resolveSessionFailure,
  shouldApplyHospitalSessionGuard,
} from '@/components/security/httpSessionPolicy';
import { getAppEntryForRole } from '@/shared/utils/authRedirect';
import { loginRedirectState } from '@/shared/auth/universalLoginPolicy';

function RejectHospitalSession({ loginPath, redirectState }) {
  const { logout } = useAuth();

  useEffect(() => {
    logout({
      message: resolveSessionFailure('invalid_tenant').message,
      notifyServer: true,
    });
  }, [logout]);

  return <Navigate to={loginPath} replace state={redirectState} />;
}

export default function ProtectedRoute({ allowedRoles, loginPath = ROUTES.LOGIN }) {
  const location = useLocation();
  const { pathname } = location;
  const { isAuthenticated, user, loading, authReady } = useAuth();
  const redirectState = loginRedirectState(location);

  if (!shouldApplyHospitalSessionGuard(pathname)) {
    return <Outlet />;
  }

  if (!authReady || loading) {
    return <PageSpinner />;
  }

  if (user && !isValidTenantId(user.tenant_id)) {
    return <RejectHospitalSession loginPath={loginPath} redirectState={redirectState} />;
  }

  if (!isAuthenticated || !user) {
    return <Navigate to={loginPath} replace state={redirectState} />;
  }

  if (allowedRoles?.length && (!user.role || !allowedRoles.includes(user.role))) {
    const home = getAppEntryForRole(user.role);
    if (home && home !== ROUTES.APP_ENTRY && home !== pathname) {
      return <Navigate to={home} replace />;
    }
    // Legacy hospital super_admin is not an owner session. Role admin uses /admin.
    if (user.role === ROLES.SUPER_ADMIN) {
      return <Navigate to={ROUTES.UNAUTHORIZED} replace />;
    }
    if (user.role === ROLES.ADMIN) {
      return <Navigate to={ROUTES.ADMIN_DASHBOARD} replace />;
    }
    if (user.role === ROLES.MANAGER) {
      return <Navigate to={ROUTES.MANAGER_DASHBOARD} replace />;
    }
    return <Navigate to={ROUTES.UNAUTHORIZED} replace />;
  }

  const sessionKey = `${user.user_id ?? user.id}:${user.tenant_id}`;
  return <Outlet key={sessionKey} />;
}
