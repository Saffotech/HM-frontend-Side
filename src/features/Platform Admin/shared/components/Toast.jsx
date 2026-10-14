import "./Toast.css";

export default function Toast({ toasts, onDismiss }) {
  if (!toasts?.length) return null;
  return (
    <div className="toast-stack" aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast-${toast.tone === "error" ? "error" : toast.tone === "success" ? "success" : "info"}`}>
          <span>{toast.message}</span>
          <button type="button" onClick={() => onDismiss(toast.id)} aria-label="Dismiss notification">×</button>
        </div>
      ))}
    </div>
  );
}
