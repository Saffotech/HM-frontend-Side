function formatRoleLabel(name) {
  if (!name) return '—';
  if (name === 'opd_billing') return 'OPD Billing';
  if (name === 'lab_technician') return 'Lab Technician';
  return name.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

const ROLE_TONES = {
  admin: 'admin',
  doctor: 'doctor',
  nurse: 'nurse',
  pharmacist: 'pharmacist',
  receptionist: 'neutral',
  opd_billing: 'billing',
  lab_technician: 'lab',
};

export default function AdminRoleBadge({ roleName }) {
  const tone = ROLE_TONES[roleName] || 'neutral';
  return (
    <span className={`admin-role-badge admin-role-badge--${tone}`}>
      {formatRoleLabel(roleName)}
    </span>
  );
}

export { formatRoleLabel };
