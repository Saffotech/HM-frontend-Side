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
  Tags,
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
    href: ROUTES.IPD_PRICING,
    label: 'Pricing',
    icon: Tags,
    requires: 'pricing',
  },
  {
    href: ROUTES.IPD_PROFILE,
    label: 'Profile',
    icon: UserCircle,
    requires: 'profile',
  },
];

/** Top shell title stays "IPD"; page names live in each screen header. */
function resolveTitle(_pathname, pageTitleOverride) {
  return pageTitleOverride || 'IPD';
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
          case 'pricing':
            return true;
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
      defaultTitle="IPD"
      showBell={false}
      profileHref={ROUTES.IPD_PROFILE}
      logoutMenuOnly={onProfilePage}
      layoutClassName="ipd-layout"
    >
      {children}
    </RoleLayout>
  );
}
