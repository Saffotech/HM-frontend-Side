import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import ErrorBoundary from '@/shared/components/ErrorBoundary';
import { AuthProvider } from '@/shared/hooks/useAuth';
import App from './App';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
});

function appErrorFallback(error, reset) {
  return (
    <div className="app-error-fallback">
      <h2>Application error</h2>
      <p>Something went wrong. Please refresh the page.</p>
      {import.meta.env.DEV && error?.message ? (
        <pre style={{ maxWidth: '40rem', whiteSpace: 'pre-wrap', textAlign: 'left' }}>
          {error.message}
        </pre>
      ) : null}
      <button type="button" onClick={() => window.location.reload()}>
        Refresh
      </button>
      {import.meta.env.DEV ? (
        <button type="button" onClick={reset} style={{ marginLeft: '0.5rem' }}>
          Try again
        </button>
      ) : null}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary fallback={appErrorFallback}>
      <AuthProvider>
        <QueryClientProvider client={queryClient}>
          <App />
          {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
        </QueryClientProvider>
      </AuthProvider>
    </ErrorBoundary>
  </React.StrictMode>
);