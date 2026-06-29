import './AdminStaffStatusBadge.css';

export default function AdminStaffStatusBadge({ isActive }) {
  return (
    <span
      className={`admin-staff-badge ${isActive ? 'admin-staff-badge--active' : 'admin-staff-badge--inactive'}`}
    >
      {isActive ? 'Active' : 'Inactive'}
    </span>
  );
}
