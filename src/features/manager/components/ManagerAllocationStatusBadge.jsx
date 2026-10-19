export default function AdminAllocationStatusBadge({ isActive }) {
  return (
    <span
      className={`nba-status-badge${isActive ? ' nba-status-badge--active' : ' nba-status-badge--inactive'}`}
    >
      {isActive ? 'Active' : 'Inactive'}
    </span>
  );
}
