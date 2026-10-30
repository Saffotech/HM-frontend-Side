import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ErrorBoundary from '@/shared/components/ErrorBoundary';
import ApplicationErrorPage from '@/shared/components/errors/ApplicationErrorPage';
import { AuthProvider } from '@/shared/hooks/useAuth';
import { loadAuthSession } from '@/components/security/authSession';
import { getAppEntryForRole } from '@/shared/utils/authRedirect';
import { ROUTES } from '@/shared/constants';
import { isChunkLoadError, queryRetryDelay, shouldRetryMutation, shouldRetryQuery } from '@/shared/errors/errorClassification';
import { claimAutomaticChunkReload } from '@/shared/errors/chunkRecovery';
import App from './App';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: shouldRetryQuery,
      retryDelay: queryRetryDelay,
      throwOnError: false,
    },
    mutations: {
      retry: shouldRetryMutation,
    },
  },
});

if (typeof window !== 'undefined') {
  window.addEventListener('vite:preloadError', (event) => {
    if (claimAutomaticChunkReload(window.sessionStorage)) {
      event.preventDefault();
      window.location.reload();
    }
  });
}

function openAuthorizedHome() {
  try {
    const role = loadAuthSession()?.user?.role;
    window.location.replace(role ? getAppEntryForRole(role) : ROUTES.LOGIN);
  } catch {
    window.location.replace(ROUTES.LOGIN);
  }
}

function appErrorFallback(error, reset, recovering) {
  const chunk = isChunkLoadError(error);
  return (
    <ApplicationErrorPage
      title={chunk ? 'This page needs a refresh' : 'Something went wrong'}
      message={chunk
        ? 'The latest version of this page could not be loaded. Refresh to continue. You will stay signed in.'
        : 'SaffoCare ran into a problem. You can try again, or return to your dashboard.'}
      onRetry={chunk ? () => window.location.reload() : reset}
      onHome={openAuthorizedHome}
      recovering={Boolean(recovering)}
      tone={chunk ? 'warning' : 'critical'}
    />
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary fallback={appErrorFallback}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>
);