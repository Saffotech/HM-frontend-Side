import { Component } from "react";
import { TriangleAlert } from "lucide-react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="crm-state crm-state-error" role="alert">
        <TriangleAlert size={22} aria-hidden="true" />
        <strong>This page couldn&apos;t be loaded.</strong>
        <span>Your data is safe. Try again, or open another page from the sidebar.</span>
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => this.setState({ failed: false })}>Try again</button>
      </div>
    );
  }
}
