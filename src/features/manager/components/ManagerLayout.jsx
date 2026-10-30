import {
  BarChart3,
  BedDouble,
  CalendarDays,
  LayoutDashboard,
  Settings,
  User,
  Users,
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ROUTES } from '@/shared/constants';
import RoleLayout from '@/shared/components/layout/RoleLayout';
import ManagerNotificationsBell from '@/features/manager/components/ManagerNotificationsBell';
import '../styles/manager.css';
import '../styles/manager-mobile.css';

const NAV_LINKS = [
  { href: ROUTES.MANAGER_DASHBOARD, label: 'Dashboard', icon: LayoutDashboard },
  { href: ROUTES.MANAGER_STAFF, label: 'Staff', icon: Users },
  { href: ROUTES.MANAGER_BED_ALLOCATION, label: 'Nurse Bed Allocation', icon: BedDouble },
  { href: ROUTES.MANAGER_NURSE_WORKFORCE, label: 'Nurse Workforce', icon: CalendarDays },
  { href: ROUTES.MANAGER_REPORTS, label: 'Reports', icon: BarChart3 },
  { href: ROUTES.MANAGER_SETTINGS, label: 'Settings', icon: Settings },
  { href: ROUTES.MANAGER_PROFILE, label: 'Profile', icon: User },
];

/** Top shell title stays "Manager"; page names live in each screen header. */
const HEADER_TITLE = 'Manager';

function resolveTitle() {
  return HEADER_TITLE;
}

function isStaffActive(pathname) {
  return pathname === ROUTES.MANAGER_STAFF || pathname.startsWith('/manager/staff/');
}

function isReportsActive(pathname) {
  return pathname.startsWith(ROUTES.MANAGER_REPORTS);
}

function isBedAllocationActive(pathname) {
  return pathname === ROUTES.MANAGER_BED_ALLOCATION || pathname.startsWith('/manager/bed-allocation');
}

function isSettingsActive(pathname) {
  return pathname === ROUTES.MANAGER_SETTINGS || pathname.startsWith(`${ROUTES.MANAGER_SETTINGS}/`);
}

function isNavLinkActive(pathname, link) {
  if (link.href === ROUTES.MANAGER_STAFF) {
    return isStaffActive(pathname);
  }
  if (link.href === ROUTES.MANAGER_REPORTS) {
    return isReportsActive(pathname);
  }
  if (link.href === ROUTES.MANAGER_BED_ALLOCATION) {
    return isBedAllocationActive(pathname);
  }
  if (link.href === ROUTES.MANAGER_SETTINGS) {
    return isSettingsActive(pathname);
  }
  return pathname === link.href || pathname.startsWith(link.href);
}

/* Legacy identifier preserved: AdminLayout. Active name: ManagerLayout. */
export default function ManagerLayout({ children, compact = false }) {
  const location = useLocation();
  const navigate = useNavigate();
  const onProfilePage = location.pathname === ROUTES.MANAGER_PROFILE;

  // Legacy classes (inactive): admin-layout, admin-shell. Active: manager-layout, manager-shell.
  return (
    <RoleLayout
      navLinks={NAV_LINKS}
      resolveTitle={resolveTitle}
      homeRoute={ROUTES.MANAGER_DASHBOARD}
      defaultTitle={HEADER_TITLE}
      compact={compact}
      layoutClassName="manager-layout"
      isNavLinkActive={isNavLinkActive}
      showBell
      headerBell={
        <ManagerNotificationsBell
          onViewAll={() => navigate(ROUTES.MANAGER_NOTIFICATIONS)}
        />
      }
      profileHref={ROUTES.MANAGER_PROFILE}
      logoutMenuOnly={onProfilePage}
    >
      <div className="manager-shell">{children}</div>
    </RoleLayout>
  );
}
