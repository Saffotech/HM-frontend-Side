function getInitials(name) {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export default function AdminUserCell({ name, email, subtitle }) {
  const secondary = subtitle ?? email;

  return (
    <div className="admin-user-cell">
      <div className="admin-user-cell__avatar" aria-hidden>
        {getInitials(name)}
      </div>
      <div className="admin-user-cell__text">
        <div className="admin-user-cell__name">{name}</div>
        {secondary ? <div className="admin-user-cell__meta">{secondary}</div> : null}
      </div>
    </div>
  );
}
