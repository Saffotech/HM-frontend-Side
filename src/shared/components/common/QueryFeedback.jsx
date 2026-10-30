import { PageSkeleton } from './Skeleton';
import PageDataError from '@/shared/components/errors/PageDataError';
import InlineApiError from '@/shared/components/errors/InlineApiError';
import { userFacingMessage, feedbackPhase } from '@/shared/errors/errorClassification';
import {
  isLabDepartmentUnassignedError,
  LAB_DEPT_UNASSIGNED_MESSAGE,
} from '@/shared/utils/labDepartments';

function getErrorMessage(error) {
  if (!error) return 'Something went wrong. Please try again.';
  if (error.code === 'session_superseded') return '';
  if (isLabDepartmentUnassignedError(error)) return LAB_DEPT_UNASSIGNED_MESSAGE;
  return userFacingMessage(error);
}

/** Standard loading / error UI for data pages and sections. */
export default function QueryFeedback({
  isLoading,
  isError,
  error,
  onRetry,
  children,
  variant,
}) {
  const phase = feedbackPhase({ isLoading, isError });
  if (phase === 'loading') {
    return (
      <div className="query-feedback query-feedback--loading">
        <PageSkeleton />
      </div>
    );
  }
  if (phase === 'error') {
    if (error?.code === 'session_superseded') return null;
    const message = getErrorMessage(error);
    const surface = variant || (children ? 'page' : 'inline');
    if (surface === 'inline') {
      return (
        <InlineApiError
          error={error}
          message={message}
          onRetry={onRetry}
        />
      );
    }
    return (
      <PageDataError
        error={error}
        message={message}
        onRetry={onRetry}
      />
    );
  }
  return children;
}
