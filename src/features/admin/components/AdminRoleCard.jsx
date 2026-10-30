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
import ManagerRoleBadge from '@/features/manager/components/ManagerRoleBadge';
import { Button } from '@/shared/components/common';

const ROLE_ICONS = {
  super_admin: Shield,
  admin: UserCog,
  receptionist: ClipboardList,
  opd_billing: Banknote,
  doctor: Stethoscope,
  ipd: Users,
  nurse: HeartPulse,
  lab_technician: FlaskConical,
  pharmacist: Pill,
};

const ROLE_TONE_CLASS = {
  super_admin: 'admin-panel-role-card--super',
  admin: 'admin-panel-role-card--admin',
  receptionist: 'admin-panel-role-card--receptionist',
  opd_billing: 'admin-panel-role-card--billing',
  doctor: 'admin-panel-role-card--doctor',
  ipd: 'admin-panel-role-card--ipd',
  nurse: 'admin-panel-role-card--nurse',
  lab_technician: 'admin-panel-role-card--lab',
  pharmacist: 'admin-panel-role-card--pharmacist',
};

/* Legacy identifier preserved: SuperAdminRoleCard. Active name: AdminRoleCard. */
export default function AdminRoleCard({ role, staffCount = 0, onManage }) {
  const Icon = ROLE_ICONS[role.name] || Shield;
  const toneClass = ROLE_TONE_CLASS[role.name] || 'admin-panel-role-card--neutral';
  const permissionCount = role.permissions?.length ?? 0;

  return (
    <article className={`admin-panel-role-card ${toneClass}`}>
      <div className="admin-panel-role-card__head">
        <div className="admin-panel-role-card__icon-wrap" aria-hidden>
          <Icon size={22} />
        </div>
        <div className="admin-panel-role-card__title-wrap">
          <ManagerRoleBadge roleName={role.name} />
        </div>
      </div>

      <p className="admin-panel-role-card__desc">
        {role.description || 'No description provided for this role.'}
      </p>

      <div className="admin-panel-role-card__meta">
        <div className="admin-panel-role-card__stat">
          <Users size={17} aria-hidden />
          <span>
            <strong>{staffCount}</strong>
            {' '}
            staff assigned
          </span>
        </div>
        <div className="admin-panel-role-card__stat">
          <Shield size={17} aria-hidden />
          <span>
            <strong>{permissionCount}</strong>
            {' '}
            permissions
          </span>
        </div>
      </div>

      <div className="admin-panel-role-card__footer">
        <Button variant="ghost" size="md" onClick={onManage} className="admin-panel-role-card__action">
          <Link2 size={16} aria-hidden />
          Manage permissions
        </Button>
      </div>
    </article>
  );
}
