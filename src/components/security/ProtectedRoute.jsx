import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/shared/hooks/useAuth';
import { ROUTES, ROLES } from '@/shared/constants';
import PageSpinner from '@/shared/components/PageSpinner';

export default function ProtectedRoute({ allowedRoles, loginPath = ROUTES.LOGIN }) {
  const { isAuthenticated, user, loading, authReady } = useAuth();

  if (!authReady || loading) {
    return <PageSpinner />;
  }

  if (!isAuthenticated || !user) {
    return <Navigate to={loginPath} replace />;
  }

  if (allowedRoles?.length && (!user.role || !allowedRoles.includes(user.role))) {
    if (user.role === ROLES.SUPER_ADMIN) {
      return <Navigate to={ROUTES.SUPER_ADMIN_DASHBOARD} replace />;
    }
    if (user.role === ROLES.ADMIN) {
      return <Navigate to={ROUTES.ADMIN_DASHBOARD} replace />;
    }
    return <Navigate to={ROUTES.UNAUTHORIZED} replace />;
  }

  return <Outlet />;
}
