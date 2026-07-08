import { Navigate } from 'react-router-dom';
import { useAuth } from '@/shared/hooks/useAuth';
import { getAppEntryForUser } from '@/shared/utils/authRedirect';

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
    const target = getAppEntryForUser(user);
    return <Navigate to={target} replace />;
  }

  return children;
}
