import { useMemo, useCallback } from 'react';
import { LayoutDashboard, ClipboardList, FileCheck } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ROUTES } from '@/shared/constants';
import RoleLayout from '@/shared/components/layout/RoleLayout';
import LabNotificationsBell from '@/features/lab/components/LabNotificationsBell';
import { useLabPermissionSet } from '@/features/lab/hooks/useLabPermission';
import { useLabTechnicianProfileQuery } from '@/features/lab/hooks/useLabTechnicianProfileQuery';
import { useAuth } from '@/shared/hooks/useAuth';
import {
  labDepartmentLabelFromUser,
  departmentCode,
  LAB_DEPT_CODE,
} from '@/shared/utils/labDepartments';
import '../styles/lab.css';

const NAV_LINKS = [
  {
    label: 'Dashboard',
    href: ROUTES.LAB_DASHBOARD,
    icon: LayoutDashboard,
    requires: 'labView',
  },
  {
    label: 'Pending Tests',
    href: ROUTES.LAB_ORDERS,
    icon: ClipboardList,
    requires: 'labView',
  },
  {
    label: 'Report Archive',
    href: ROUTES.LAB_REPORTS,
    icon: FileCheck,
    requires: 'labView',
  },
];

const PAGE_TITLES = [
  { prefix: ROUTES.LAB_NOTIFICATIONS, title: 'Notifications' },
  { prefix: ROUTES.LAB_PROFILE, title: 'My Profile' },
  { prefix: '/lab/orders/', title: 'Upload Report' },
  { prefix: ROUTES.LAB_ORDERS, title: 'Pending Tests' },
  { prefix: ROUTES.LAB_REPORTS, title: 'Report Archive' },
  { prefix: ROUTES.LAB_DASHBOARD, title: 'Dashboard' },
];

function resolveTitle(pathname, pageTitleOverride) {
  if (pageTitleOverride) return pageTitleOverride;
  const match = PAGE_TITLES.find((entry) => pathname.startsWith(entry.prefix));
  return match?.title || 'Lab Portal';
}

function resolveLabDepartmentHeaderTitle(user, profile) {
  const profileRow = profile?.profile ?? profile;
  const label = labDepartmentLabelFromUser(profileRow) || labDepartmentLabelFromUser(user);
  if (label === 'Radiology' || label === 'Laboratory') return label;

  const sources = [profileRow, profileRow?.department, user, user?.department];
  for (const src of sources) {
    const code = departmentCode(src);
    if (code === LAB_DEPT_CODE.RAD) return 'Radiology';
    if (code === LAB_DEPT_CODE.LAB) return 'Laboratory';
  }
  return '';
}

function isNavLinkActive(pathname, link) {
  if (link.href === ROUTES.LAB_ORDERS) {
    return pathname === ROUTES.LAB_ORDERS || pathname.startsWith('/lab/orders/');
  }
  return pathname === link.href || pathname.startsWith(`${link.href}/`);
}

export default function LabLayout({ children, pageTitle, compact = false }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const onProfilePage = location.pathname === ROUTES.LAB_PROFILE;
  const { canViewLab, canViewNotifications } = useLabPermissionSet();
  const profileQuery = useLabTechnicianProfileQuery();
  const departmentLabel = useMemo(() => {
    const profile = profileQuery.data?.profile ?? profileQuery.data;
    return labDepartmentLabelFromUser(profile) || labDepartmentLabelFromUser(user);
  }, [profileQuery.data, user]);

  const departmentHeaderTitle = useMemo(
    () => resolveLabDepartmentHeaderTitle(user, profileQuery.data),
    [user, profileQuery.data],
  );

  const resolveLayoutTitle = useCallback(
    (pathname, pageTitleOverride) => {
      if (departmentHeaderTitle) return departmentHeaderTitle;
      return resolveTitle(pathname, pageTitleOverride);
    },
    [departmentHeaderTitle],
  );

  const navLinks = useMemo(
    () =>
      NAV_LINKS.filter((link) => {
        if (link.requires === 'labView') return canViewLab;
        return true;
      }),
    [canViewLab],
  );

  return (
    <RoleLayout
      navLinks={navLinks}
      resolveTitle={resolveLayoutTitle}
      homeRoute={canViewLab ? ROUTES.LAB_DASHBOARD : ROUTES.LAB_PROFILE}
      roleLabel={
        departmentLabel ? (
          <>
            Lab Technician
            <span className="lab-role-dept">{departmentLabel}</span>
          </>
        ) : (
          'Lab Technician'
        )
      }
      roleLabelClassName="lab-role-label"
      defaultTitle={departmentHeaderTitle || 'Dashboard'}
      pageTitleOverride={pageTitle}
      isNavLinkActive={isNavLinkActive}
      showBell={canViewNotifications}
      profileHref={ROUTES.LAB_PROFILE}
      logoutMenuOnly={onProfilePage}
      headerBell={
        canViewNotifications ? (
          <LabNotificationsBell onViewAll={() => navigate(ROUTES.LAB_NOTIFICATIONS)} />
        ) : null
      }
      compact={compact}
    >
      {children}
    </RoleLayout>
  );
}
