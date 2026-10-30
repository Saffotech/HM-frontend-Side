import { Component } from "react";
import { TriangleAlert } from "lucide-react";
import { isChunkLoadError } from "../../../../../shared/errors/errorClassification.js";
import {
  cancelChunkRecoveryReset,
  claimAutomaticChunkReload,
} from "../../../../../shared/errors/chunkRecovery.js";
import { recordClientDiagnostic } from "../../../../../shared/errors/errorDiagnostics.js";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false, error: null, recovering: false };
  }

  static getDerivedStateFromError(error) {
    return { failed: true, error };
  }

  componentDidCatch(error) {
    const chunk = isChunkLoadError(error);
    recordClientDiagnostic({
      category: chunk ? "chunk" : "render",
      chunk,
      network: chunk,
      route: typeof window !== "undefined" ? window.location.pathname : null,
    });
    if (!chunk || typeof window === "undefined") return;
    cancelChunkRecoveryReset();
    if (claimAutomaticChunkReload(window.sessionStorage)) {
      this.setState({ recovering: true });
      window.location.reload();
    }
  }

  retry = () => {
    if (isChunkLoadError(this.state.error)) {
      window.location.reload();
      return;
    }
    this.setState({ failed: false, error: null, recovering: false });
  };

  render() {
    if (!this.state.failed) return this.props.children;
    if (this.state.recovering) {
      return <p className="panel-copy" role="status">Updating SaffoCare…</p>;
    }
    const chunk = isChunkLoadError(this.state.error);
    return (
      <div className="crm-state crm-state-error" role="alert">
        <TriangleAlert size={22} aria-hidden="true" />
        <strong>{chunk ? "This page needs a refresh." : "This page couldn't be loaded."}</strong>
        <span>
          {chunk
            ? "Refresh to load the latest version. You will stay signed in."
            : "Your data is safe. Try again, or open another page from the sidebar."}
        </span>
        <button type="button" className="btn btn-secondary btn-sm" onClick={this.retry}>
          {chunk ? "Refresh" : "Try again"}
        </button>
      </div>
    );
  }
}
