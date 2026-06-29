import { Component } from 'react';
import './ErrorBoundary.css';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    const { hasError, error } = this.state;
    const { children, fallback } = this.props;

    if (hasError) {
      if (fallback) {
        return typeof fallback === 'function' ? fallback(error, this.handleRetry) : fallback;
      }

      return (
        <div className="error-boundary" role="alert">
          <h2 className="error-boundary__title">Something went wrong</h2>
          <p className="error-boundary__message">
            {error?.message || 'An unexpected error occurred.'}
          </p>
          <button type="button" className="error-boundary__retry" onClick={this.handleRetry}>
            Try again
          </button>
        </div>
      );
    }

    return children;
  }
}

