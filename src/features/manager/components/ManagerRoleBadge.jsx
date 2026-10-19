import { formatRoleLabel } from '@/features/manager/utils/formatRoleLabel';

const ROLE_TONES = {
  admin: 'admin',
  doctor: 'doctor',
  nurse: 'nurse',
  pharmacist: 'pharmacist',
  receptionist: 'neutral',
  opd_billing: 'billing',
  ipd: 'billing',
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
