import { BarChart3, LayoutDashboard, UserCog, Users } from 'lucide-react';
import { ROUTES } from '@/shared/constants';
import RoleLayout from '@/shared/components/layout/RoleLayout';
import '../styles/admin.css';

const NAV_LINKS = [
  { href: ROUTES.ADMIN_DASHBOARD, label: 'Dashboard', icon: LayoutDashboard },
  { href: ROUTES.ADMIN_STAFF, label: 'Staff', icon: Users },
  { href: ROUTES.ADMIN_REPORTS, label: 'Reports', icon: BarChart3 },
  { href: ROUTES.ADMIN_ROLES, label: 'Roles', icon: UserCog },
];

const PAGE_TITLES = [
  { prefix: ROUTES.ADMIN_STAFF, title: 'Staff' },
  { prefix: ROUTES.ADMIN_REPORTS, title: 'Reports' },
  { prefix: ROUTES.ADMIN_ROLES, title: 'Roles' },
  { prefix: ROUTES.ADMIN_DASHBOARD, title: 'Dashboard' },
];

function resolveTitle(pathname, pageTitleOverride) {
  if (pathname.startsWith(`${ROUTES.ADMIN_STAFF}/`) && pathname !== ROUTES.ADMIN_STAFF_NEW) {
    return pageTitleOverride || 'Staff Details';
  }
  if (pathname === ROUTES.ADMIN_STAFF_NEW) {
    return 'Register Staff';
  }
  if (pathname.startsWith(ROUTES.ADMIN_REPORTS)) {
    return pageTitleOverride || 'Reports';
  }
  const match = PAGE_TITLES.find((p) => pathname.startsWith(p.prefix));
  return pageTitleOverride || match?.title || 'Admin';
}

function isStaffActive(pathname) {
  return pathname === ROUTES.ADMIN_STAFF || pathname.startsWith('/admin/staff/');
}

function isReportsActive(pathname) {
  return pathname.startsWith(ROUTES.ADMIN_REPORTS);
}

function isRolesActive(pathname) {
  return pathname === ROUTES.ADMIN_ROLES;
}

function isNavLinkActive(pathname, link) {
  if (link.href === ROUTES.ADMIN_STAFF) {
    return isStaffActive(pathname);
  }
  if (link.href === ROUTES.ADMIN_REPORTS) {
    return isReportsActive(pathname);
  }
  if (link.href === ROUTES.ADMIN_ROLES) {
    return isRolesActive(pathname);
  }
  return pathname === link.href || pathname.startsWith(link.href);
}

export default function AdminLayout({ children, pageTitle, compact = false }) {
  return (
    <RoleLayout
      navLinks={NAV_LINKS}
      resolveTitle={resolveTitle}
      homeRoute={ROUTES.ADMIN_DASHBOARD}
      roleLabel="Administration"
      roleLabelClassName="admin-role-label"
      defaultTitle="Dashboard"
      pageTitleOverride={pageTitle}
      compact={compact}
      isNavLinkActive={isNavLinkActive}
      showBell={false}
    >
      <div className="admin-shell">{children}</div>
    </RoleLayout>
  );
}
