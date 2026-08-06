/**
 * IPD shell: sidebar nav + profile menu via shared RoleLayout.
 */

import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  UserPlus,
  BedDouble,
  Receipt,
  History,
  LogOut,
  UserCircle,
} from 'lucide-react';
import { ROUTES } from '@/shared/constants';
import RoleLayout from '@/shared/components/layout/RoleLayout';
import { useIpdPermissionSet } from '@/features/ipd/hooks/useIpdPermission';
import '../styles/ipd.css';

const NAV_LINKS = [
  {
    href: ROUTES.IPD_DASHBOARD,
    label: 'Dashboard',
    icon: LayoutDashboard,
    requires: 'dashboard',
  },
  {
    href: ROUTES.IPD_PATIENTS,
    label: 'Patients',
    icon: Users,
    requires: 'patients',
  },
  {
    href: ROUTES.IPD_ADMIT,
    label: 'Admit',
    icon: UserPlus,
    requires: 'admit',
  },
  {
    href: ROUTES.IPD_BEDS,
    label: 'Beds',
    icon: BedDouble,
    requires: 'beds',
  },
  {
    href: ROUTES.IPD_BILLING,
    label: 'Billing',
    icon: Receipt,
    requires: 'billing',
  },
  {
    href: ROUTES.IPD_PAYMENT_HISTORY,
    label: 'Payment History',
    icon: History,
    requires: 'payments',
  },
  {
    href: ROUTES.IPD_DISCHARGE,
    label: 'Discharge',
    icon: LogOut,
    requires: 'discharge',
  },
  {
    href: ROUTES.IPD_PROFILE,
    label: 'Profile',
    icon: UserCircle,
    requires: 'profile',
  },
];

const PAGE_TITLES = [
  { prefix: ROUTES.IPD_PROFILE, title: 'My Profile' },
  { prefix: ROUTES.IPD_DISCHARGE, title: 'Discharge' },
  { prefix: ROUTES.IPD_PAYMENT_HISTORY, title: 'Payment History' },
  { prefix: '/ipd/billing/preview', title: 'Bill Preview' },
  { prefix: ROUTES.IPD_BILLING, title: 'Billing' },
  { prefix: ROUTES.IPD_BED_TRANSFER, title: 'Bed Transfer' },
  { prefix: ROUTES.IPD_BEDS, title: 'Beds' },
  { prefix: ROUTES.IPD_ADMIT, title: 'Admit Patient' },
  { prefix: ROUTES.IPD_PATIENTS, title: 'IPD Patients' },
  { prefix: ROUTES.IPD_DASHBOARD, title: 'IPD Dashboard' },
];

function resolveTitle(pathname, pageTitleOverride) {
  if (pageTitleOverride) return pageTitleOverride;
  const match = PAGE_TITLES.find((entry) => pathname.startsWith(entry.prefix));
  return match?.title || 'IPD';
}

export default function IpdLayout({ children }) {
  const location = useLocation();
  const onProfilePage = location.pathname === ROUTES.IPD_PROFILE;
  const perms = useIpdPermissionSet();

  const navLinks = useMemo(
    () =>
      NAV_LINKS.filter((link) => {
        switch (link.requires) {
          case 'dashboard':
            return perms.canViewDashboard;
          case 'patients':
            return perms.canListPatients;
          case 'admit':
            return perms.canAdmit;
          case 'beds':
            return perms.canViewBeds;
          case 'billing':
            return perms.canViewBilling;
          case 'payments':
            return perms.canViewPaymentHistory;
          case 'discharge':
            return perms.canDischarge;
          case 'profile':
            return perms.canViewProfile;
          default:
            return true;
        }
      }),
    [perms],
  );

  const homeRoute = perms.canViewDashboard
    ? ROUTES.IPD_DASHBOARD
    : perms.canViewProfile
      ? ROUTES.IPD_PROFILE
      : ROUTES.IPD_DASHBOARD;

  return (
    <RoleLayout
      navLinks={navLinks}
      resolveTitle={resolveTitle}
      homeRoute={homeRoute}
      roleLabel="IPD"
      roleLabelClassName="ipd-role-label"
      defaultTitle="IPD Dashboard"
      showBell={false}
      profileHref={ROUTES.IPD_PROFILE}
      logoutMenuOnly={onProfilePage}
      layoutClassName="ipd-layout"
    >
      {children}
    </RoleLayout>
  );
}
