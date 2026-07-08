import {
  Banknote,
  ClipboardList,
  FlaskConical,
  Link2,
  Shield,
  Stethoscope,
  UserCog,
  Users,
  Pill,
  HeartPulse,
} from 'lucide-react';
import AdminRoleBadge from '@/features/admin/components/AdminRoleBadge';
import { Button } from '@/shared/components/common';

const ROLE_ICONS = {
  super_admin: Shield,
  admin: UserCog,
  doctor: Stethoscope,
  nurse: HeartPulse,
  pharmacist: Pill,
  opd_billing: Banknote,
  lab_technician: FlaskConical,
  receptionist: ClipboardList,
};

const ROLE_TONE_CLASS = {
  super_admin: 'sa-role-card--super',
  admin: 'sa-role-card--admin',
  doctor: 'sa-role-card--doctor',
  nurse: 'sa-role-card--nurse',
  pharmacist: 'sa-role-card--pharmacist',
  opd_billing: 'sa-role-card--billing',
  lab_technician: 'sa-role-card--lab',
  receptionist: 'sa-role-card--receptionist',
};

export default function SuperAdminRoleCard({ role, staffCount = 0, onManage }) {
  const Icon = ROLE_ICONS[role.name] || Shield;
  const toneClass = ROLE_TONE_CLASS[role.name] || 'sa-role-card--neutral';
  const permissionCount = role.permissions?.length ?? 0;

  return (
    <article className={`sa-role-card ${toneClass}`}>
      <div className="sa-role-card__head">
        <div className="sa-role-card__icon-wrap" aria-hidden>
          <Icon size={22} />
        </div>
        <div className="sa-role-card__title-wrap">
          <AdminRoleBadge roleName={role.name} />
        </div>
      </div>

      <p className="sa-role-card__desc">
        {role.description || 'No description provided for this role.'}
      </p>

      <div className="sa-role-card__meta">
        <div className="sa-role-card__stat">
          <Users size={17} aria-hidden />
          <span>
            <strong>{staffCount}</strong>
            {' '}
            staff assigned
          </span>
        </div>
        <div className="sa-role-card__stat">
          <Shield size={17} aria-hidden />
          <span>
            <strong>{permissionCount}</strong>
            {' '}
            permissions
          </span>
        </div>
      </div>

      <div className="sa-role-card__footer">
        <Button variant="ghost" size="md" onClick={onManage} className="sa-role-card__action">
          <Link2 size={16} aria-hidden />
          Manage permissions
        </Button>
      </div>
    </article>
  );
}
