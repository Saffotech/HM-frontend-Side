import { EmptyState, Skeleton } from '@/shared/components/common';

/**
 * Renders the loading / error / empty branches shared by every panel body.
 * Returns `children` only when there is real data to show.
 */
export default function PanelState({
  isLoading = false,
  isError = false,
  error,
  isEmpty = false,
  emptyIcon,
  emptyTitle = 'Nothing to show yet',
  emptyDescription,
  skeletonRows = 4,
  children,
}) {
  if (isLoading) {
    return (
      <div className="today-overview__skeleton" aria-busy="true" aria-label="Loading">
        {Array.from({ length: skeletonRows }).map((_, index) => (
          <Skeleton key={index} height={38} />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <p className="today-overview__panel-error" role="alert">
        {error?.message || 'This section could not be loaded. Try refreshing.'}
      </p>
    );
  }

  if (isEmpty) {
    return (
      <EmptyState
        icon={emptyIcon}
        title={emptyTitle}
        description={emptyDescription}
        className="today-overview__empty"
      />
    );
  }

  return children;
}
