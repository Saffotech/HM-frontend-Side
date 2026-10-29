import './ManagerStaffStatusBadge.css';

/* Legacy identifier preserved: AdminStaffStatusBadge. Active name: ManagerStaffStatusBadge. */
export default function ManagerStaffStatusBadge({ isActive }) {
  return (
    <span
      className={`admin-staff-badge ${isActive ? 'admin-staff-badge--active' : 'admin-staff-badge--inactive'}`}
    >
      {isActive ? 'Active' : 'Inactive'}
    </span>
  );
}
