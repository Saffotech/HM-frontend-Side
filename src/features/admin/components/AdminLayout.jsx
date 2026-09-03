import {
  BarChart3,
  BedDouble,
  CalendarDays,
  LayoutDashboard,
  Settings,
  User,
  UserCog,
  Users,
} from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { ROUTES } from '@/shared/constants';
import RoleLayout from '@/shared/components/layout/RoleLayout';
import '../styles/admin.css';

const NAV_LINKS = [
  { href: ROUTES.ADMIN_DASHBOARD, label: 'Dashboard', icon: LayoutDashboard },
  { href: ROUTES.ADMIN_STAFF, label: 'Staff', icon: Users },
  { href: ROUTES.ADMIN_BED_ALLOCATION, label: 'Nurse Bed Allocation', icon: BedDouble },
  { href: ROUTES.ADMIN_NURSE_WORKFORCE, label: 'Nurse Workforce', icon: CalendarDays },
  { href: ROUTES.ADMIN_REPORTS, label: 'Reports', icon: BarChart3 },
  { href: ROUTES.ADMIN_ROLES, label: 'Roles', icon: UserCog },
  { href: ROUTES.ADMIN_SETTINGS, label: 'Settings', icon: Settings },
  { href: ROUTES.ADMIN_PROFILE, label: 'Profile', icon: User },
];

/** Top shell title stays "Admin"; page names live in each screen header. */
const HEADER_TITLE = 'Admin';

function resolveTitle() {
  return HEADER_TITLE;
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

function isBedAllocationActive(pathname) {
  return pathname === ROUTES.ADMIN_BED_ALLOCATION || pathname.startsWith('/admin/bed-allocation');
}

function isSettingsActive(pathname) {
  return pathname === ROUTES.ADMIN_SETTINGS || pathname.startsWith(`${ROUTES.ADMIN_SETTINGS}/`);
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
  if (link.href === ROUTES.ADMIN_BED_ALLOCATION) {
    return isBedAllocationActive(pathname);
  }
  if (link.href === ROUTES.ADMIN_SETTINGS) {
    return isSettingsActive(pathname);
  }
  return pathname === link.href || pathname.startsWith(link.href);
}

export default function AdminLayout({ children, compact = false }) {
  const location = useLocation();
  const onProfilePage = location.pathname === ROUTES.ADMIN_PROFILE;

  return (
    <RoleLayout
      navLinks={NAV_LINKS}
      resolveTitle={resolveTitle}
      homeRoute={ROUTES.ADMIN_DASHBOARD}
      defaultTitle={HEADER_TITLE}
      compact={compact}
      isNavLinkActive={isNavLinkActive}
      showBell={false}
      profileHref={ROUTES.ADMIN_PROFILE}
      logoutMenuOnly={onProfilePage}
    >
      <div className="admin-shell">{children}</div>
    </RoleLayout>
  );
}
