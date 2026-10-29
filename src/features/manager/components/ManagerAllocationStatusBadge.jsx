/* Legacy identifier preserved: AdminAllocationStatusBadge. Active name: ManagerAllocationStatusBadge. */
export default function ManagerAllocationStatusBadge({ isActive }) {
  return (
    <span
      className={`nba-status-badge${isActive ? ' nba-status-badge--active' : ' nba-status-badge--inactive'}`}
    >
      {isActive ? 'Active' : 'Inactive'}
    </span>
  );
}
