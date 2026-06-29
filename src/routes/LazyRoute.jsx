import { Suspense } from 'react';
import ErrorBoundary from '@/shared/components/ErrorBoundary';
import PageSpinner from '@/shared/components/PageSpinner';
import { PageTransition } from '@/shared/components/motion';

export default function LazyRoute({ children }) {
  return (
    <Suspense fallback={<PageSpinner />}>
      <ErrorBoundary>
        <PageTransition>{children}</PageTransition>
      </ErrorBoundary>
    </Suspense>
  );
}
