import "./EmptyState.css";

export default function EmptyState({ title = "Nothing to show", message, action }) {
  return (
    <div className="empty-state">
      <h3>{title}</h3>
      {message && <p>{message}</p>}
      {action}
    </div>
  );
}
