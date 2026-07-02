export default function AdminEmptyState({ icon, title, description }) {
  return (
    <div className="admin-empty">
      {icon ? <div className="admin-empty__icon">{icon}</div> : null}
      {title ? <p className="admin-empty__title">{title}</p> : null}
      {description ? <p className="admin-empty__desc">{description}</p> : null}
    </div>
  );
}
