import { Component } from 'react';
import { isChunkLoadError } from '@/shared/errors/errorClassification';
import {
  cancelChunkRecoveryReset,
  claimAutomaticChunkReload,
} from '@/shared/errors/chunkRecovery';
import { recordClientDiagnostic, scrubRoute } from '@/shared/errors/errorDiagnostics';
import ApplicationErrorPage from '@/shared/components/errors/ApplicationErrorPage';
import RouteErrorFallback from '@/shared/components/errors/RouteErrorFallback';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, recovering: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error) {
    const chunk = isChunkLoadError(error);
    recordClientDiagnostic({
      category: chunk ? 'chunk' : 'render',
      chunk,
      network: chunk,
      route: typeof window !== 'undefined' ? scrubRoute(window.location.pathname) : null,
    });
    if (!chunk || typeof window === 'undefined') return;
    cancelChunkRecoveryReset();
    if (claimAutomaticChunkReload(window.sessionStorage)) {
      this.setState({ recovering: true });
      window.location.reload();
    }
  }

  handleRetry = () => {
    const { error } = this.state;
    if (isChunkLoadError(error) && typeof window !== 'undefined') {
      window.location.reload();
      return;
    }
    this.setState({ hasError: false, error: null, recovering: false });
  };

  render() {
    const { hasError, error, recovering } = this.state;
    const { children, fallback, variant } = this.props;

    if (!hasError) return children;

    if (fallback) {
      return typeof fallback === 'function' ? fallback(error, this.handleRetry, recovering) : fallback;
    }

    if (variant === 'route') {
      return (
        <RouteErrorFallback
          error={error}
          onRetry={this.handleRetry}
          recovering={recovering}
        />
      );
    }

    return (
      <ApplicationErrorPage
        title={isChunkLoadError(error) ? 'This page needs a refresh' : 'Something went wrong'}
        message={isChunkLoadError(error)
          ? 'The latest version of this page could not be loaded. Refresh to continue. You will stay signed in.'
          : 'This page ran into a problem. You can try again, or return to your dashboard.'}
        onRetry={this.handleRetry}
        recovering={recovering}
        tone={isChunkLoadError(error) ? 'warning' : 'critical'}
      />
    );
  }
}
