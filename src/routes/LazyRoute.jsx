import { Suspense, useEffect } from 'react';
import ErrorBoundary from '@/shared/components/ErrorBoundary';
import PageSpinner from '@/shared/components/PageSpinner';
import PageTransition from '@/shared/components/motion/PageTransition';
import {
  cancelChunkRecoveryReset,
  scheduleChunkRecoveryReset,
} from '@/shared/errors/chunkRecovery';

function MarkChunkRecoveryHealthy() {
  useEffect(() => {
    scheduleChunkRecoveryReset(window.sessionStorage);
    return () => cancelChunkRecoveryReset();
  }, []);
  return null;
}

export default function LazyRoute({ children }) {
  return (
    <Suspense fallback={<PageSpinner />}>
      <ErrorBoundary variant="route">
        <MarkChunkRecoveryHealthy />
        <PageTransition>{children}</PageTransition>
      </ErrorBoundary>
    </Suspense>
  );
}
