import { Navigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/shared/hooks/useAuth';
import { getAppEntryForRole } from '@/shared/utils/authRedirect';
import { resolvePostLoginDestination } from '@/shared/auth/universalLoginPolicy';

/**
 * Public routes (landing, staff login). Authenticated hospital users are sent
 * to their dashboard. `?switch=1` stays on the page so /login can sign them out.
 */
export default function GuestRoute({ children }) {
  const { isAuthenticated, user, authReady } = useAuth();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const switching = searchParams.get('switch') === '1';

  if (!authReady) {
    return <div className="loading">Loading…</div>;
  }

  if (!switching && isAuthenticated && user) {
    const target = resolvePostLoginDestination(user.role, location.state?.from, getAppEntryForRole);
    return <Navigate to={target} replace />;
  }

  return children;
}
