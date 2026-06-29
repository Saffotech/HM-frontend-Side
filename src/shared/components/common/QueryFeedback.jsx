import { PageSkeleton } from './Skeleton';
import Button from './Button';

function getErrorMessage(error) {
  if (!error) return 'Something went wrong. Please try again.';
  const status = error.status;
  if (status === 404) return 'Record not found';
  if (status === 403) return "You don't have permission to view this";
  if (status === 0) {
    return (
      error.message ||
      'Could not reach the server. Start the backend on port 8000 and try again.'
    );
  }
  return error.message || 'Something went wrong. Please try again.';
}

/** Standard loading / error UI for data pages */
export default function QueryFeedback({ isLoading, isError, error, onRetry, children }) {
  if (isLoading) {
    return (
      <div className="query-feedback query-feedback--loading">
        <PageSkeleton />
      </div>
    );
  }
  if (isError) {
    return (
      <div className="query-feedback query-feedback--error" role="alert">
        <p>{getErrorMessage(error)}</p>
        {onRetry && (
          <Button type="button" variant="secondary" size="sm" onClick={onRetry}>
            Try again
          </Button>
        )}
      </div>
    );
  }
  return children;
}
