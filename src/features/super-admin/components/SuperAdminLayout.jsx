import {
  BarChart3,
  Building2,
  ClipboardList,
  LayoutDashboard,
  Settings,
  User,
  UserCog,
  Users,
} from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { ROUTES } from '@/shared/constants';
import RoleLayout from '@/shared/components/layout/RoleLayout';
import '../styles/super-admin.css';

const NAV_LINKS = [
  { href: ROUTES.SUPER_ADMIN_DASHBOARD, label: 'Dashboard', icon: LayoutDashboard },
  { href: ROUTES.SUPER_ADMIN_STAFF, label: 'Staff', icon: Users },
  { href: ROUTES.SUPER_ADMIN_DEPARTMENTS, label: 'Departments', icon: Building2 },
  { href: ROUTES.SUPER_ADMIN_ROLES, label: 'Roles', icon: UserCog },
  { href: ROUTES.SUPER_ADMIN_SETTINGS, label: 'Settings', icon: Settings },
  { href: ROUTES.SUPER_ADMIN_REPORTS, label: 'Reports', icon: BarChart3 },
  { href: ROUTES.SUPER_ADMIN_AUDIT, label: 'Audit Log', icon: ClipboardList },
  { href: ROUTES.SUPER_ADMIN_PROFILE, label: 'Profile', icon: User },
];

const SUPER_ADMIN_HEADER_TITLE = 'SuperAdmin Panel';

const PAGE_TITLES = [
  { prefix: ROUTES.SUPER_ADMIN_PROFILE, title: 'My Profile' },
  { prefix: ROUTES.SUPER_ADMIN_STAFF, title: 'Staff' },
  { prefix: ROUTES.SUPER_ADMIN_DEPARTMENTS, title: 'Departments' },
  { prefix: ROUTES.SUPER_ADMIN_ROLES, title: 'Roles' },
  { prefix: ROUTES.SUPER_ADMIN_SETTINGS, title: 'Settings' },
  { prefix: ROUTES.SUPER_ADMIN_REPORTS, title: 'Reports' },
  { prefix: ROUTES.SUPER_ADMIN_AUDIT, title: 'Audit Log' },
  { prefix: ROUTES.SUPER_ADMIN_DASHBOARD, title: 'Dashboard' },
];

function resolveTitle(pathname, pageTitleOverride) {
  if (pageTitleOverride) return pageTitleOverride;
  const match = PAGE_TITLES.find((p) => pathname.startsWith(p.prefix));
  return match?.title || SUPER_ADMIN_HEADER_TITLE;
}

function isStaffActive(pathname) {
  return pathname === ROUTES.SUPER_ADMIN_STAFF || pathname.startsWith('/super-admin/staff/');
}

function isDepartmentsActive(pathname) {
  return pathname === ROUTES.SUPER_ADMIN_DEPARTMENTS
    || pathname.startsWith('/super-admin/departments/');
}

function isRolesActive(pathname) {
  return pathname === ROUTES.SUPER_ADMIN_ROLES || pathname.startsWith('/super-admin/roles/');
}

function isNavLinkActive(pathname, link) {
  if (link.href === ROUTES.SUPER_ADMIN_STAFF) return isStaffActive(pathname);
  if (link.href === ROUTES.SUPER_ADMIN_DEPARTMENTS) return isDepartmentsActive(pathname);
  if (link.href === ROUTES.SUPER_ADMIN_ROLES) return isRolesActive(pathname);
  return pathname === link.href || pathname.startsWith(`${link.href}/`);
}

export default function SuperAdminLayout({ children, pageTitle, compact = false }) {
  const location = useLocation();
  const onProfilePage = location.pathname === ROUTES.SUPER_ADMIN_PROFILE;

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
      profileHref={ROUTES.SUPER_ADMIN_PROFILE}
      logoutMenuOnly={onProfilePage}
    >
      <div className="sa-shell">{children}</div>
    </RoleLayout>
  );
}
