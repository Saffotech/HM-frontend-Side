import './PageSpinner.css';

export default function PageSpinner() {
  return (
    <div className="page-spinner" aria-live="polite" aria-busy="true">
      Loading...
    </div>
  );
}
