import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/shared/hooks/useAuth';
import { ROUTES } from '@/shared/constants';
import { getAppEntryForRole } from '@/shared/utils/authRedirect';
import { isChunkLoadError } from '@/shared/errors/errorClassification';
import ApplicationErrorPage from './ApplicationErrorPage';

export default function RouteErrorFallback({ error, onRetry, recovering = false }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const home = user?.role ? getAppEntryForRole(user.role) : ROUTES.LOGIN;
  const chunk = isChunkLoadError(error);

  return (
    <ApplicationErrorPage
      title={chunk ? 'This page needs a refresh' : 'Something went wrong'}
      message={chunk
        ? 'The latest version of this page could not be loaded. Refresh to continue. You will stay signed in.'
        : 'This page ran into a problem. You can try again, or return to your dashboard.'}
      onRetry={onRetry}
      onHome={() => navigate(home, { replace: true })}
      recovering={recovering}
      tone={chunk ? 'warning' : 'critical'}
    />
  );
}
