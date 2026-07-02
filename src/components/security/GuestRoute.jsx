import { Navigate } from 'react-router-dom';
import { useAuth } from '@/shared/hooks/useAuth';
import { getAppEntryForRole } from '@/shared/utils/authRedirect';
import { isDemoReceptionistSession } from '@/features/receptionist/utils/receptionistPortal';
import { ROUTES } from '@/shared/constants';

/**
 * Public routes (landing, staff login). Authenticated users are sent to their
 * dashboard with replace so Back does not return to "/" or "/login".
 */
export default function GuestRoute({ children }) {
  const { isAuthenticated, user, authReady } = useAuth();

  if (!authReady) {
    return <div className="loading">Loading…</div>;
  }

  if (isAuthenticated && user) {
    const target = isDemoReceptionistSession(user)
      ? ROUTES.RECEPTIONIST_DASHBOARD
      : getAppEntryForRole(user.role);
    return <Navigate to={target} replace />;
  }

  return children;
}
