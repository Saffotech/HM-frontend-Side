import {
  BarChart3,
  ClipboardList,
  LayoutDashboard,
  Settings,
  UserCog,
  Users,
} from 'lucide-react';
import { ROUTES } from '@/shared/constants';
import RoleLayout from '@/shared/components/layout/RoleLayout';
import '../styles/super-admin.css';

const NAV_LINKS = [
  { href: ROUTES.SUPER_ADMIN_DASHBOARD, label: 'Dashboard', icon: LayoutDashboard },
  { href: ROUTES.SUPER_ADMIN_STAFF, label: 'Staff', icon: Users },
  { href: ROUTES.SUPER_ADMIN_ROLES, label: 'Roles', icon: UserCog },
  { href: ROUTES.SUPER_ADMIN_SETTINGS, label: 'Settings', icon: Settings },
  { href: ROUTES.SUPER_ADMIN_REPORTS, label: 'Reports', icon: BarChart3 },
  { href: ROUTES.SUPER_ADMIN_AUDIT, label: 'Audit Log', icon: ClipboardList },
];

const SUPER_ADMIN_HEADER_TITLE = 'SuperAdmin Panel';

function resolveTitle() {
  return SUPER_ADMIN_HEADER_TITLE;
}

function isStaffActive(pathname) {
  return pathname === ROUTES.SUPER_ADMIN_STAFF || pathname.startsWith('/super-admin/staff/');
}

function isRolesActive(pathname) {
  return pathname === ROUTES.SUPER_ADMIN_ROLES || pathname.startsWith('/super-admin/roles/');
}

function isNavLinkActive(pathname, link) {
  if (link.href === ROUTES.SUPER_ADMIN_STAFF) return isStaffActive(pathname);
  if (link.href === ROUTES.SUPER_ADMIN_ROLES) return isRolesActive(pathname);
  return pathname === link.href || pathname.startsWith(`${link.href}/`);
}

export default function SuperAdminLayout({ children, pageTitle, compact = false }) {
  return (
    <RoleLayout
      navLinks={NAV_LINKS}
      resolveTitle={resolveTitle}
      homeRoute={ROUTES.SUPER_ADMIN_DASHBOARD}
      roleLabel="Super Admin"
      roleLabelClassName="sa-role-label"
      layoutClassName="layout--super-admin"
      defaultTitle={SUPER_ADMIN_HEADER_TITLE}
      pageTitleOverride={pageTitle}
      compact={compact}
      isNavLinkActive={isNavLinkActive}
      showBell={false}
    >
      <div className="sa-shell">{children}</div>
    </RoleLayout>
  );
}
