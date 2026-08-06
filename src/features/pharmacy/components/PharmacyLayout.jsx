import { useMemo } from 'react';
import { ClipboardList, History } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ROUTES } from '@/shared/constants';
import RoleLayout from '@/shared/components/layout/RoleLayout';
import PharmacyNotificationsBell from '@/features/pharmacy/components/PharmacyNotificationsBell';
import { usePharmacyPermissionSet } from '@/features/pharmacy/hooks/usePharmacyPermission';
import '../styles/pharmacy.css';

const NAV_LINKS = [
  {
    href: ROUTES.PHARMACY_PRESCRIPTIONS,
    label: 'Prescriptions',
    icon: ClipboardList,
    requires: 'prescriptions',
  },
  {
    href: ROUTES.PHARMACY_HISTORY,
    label: 'History',
    icon: History,
    requires: 'prescriptions',
  },
];

const PAGE_TITLES = [
  { prefix: ROUTES.PHARMACY_NOTIFICATIONS, title: 'Notifications' },
  { prefix: ROUTES.PHARMACY_PROFILE, title: 'My Profile' },
  { prefix: '/pharmacy/dispense', title: 'Dispense Medicine' },
  { prefix: ROUTES.PHARMACY_HISTORY, title: 'History' },
  { prefix: ROUTES.PHARMACY_PRESCRIPTIONS, title: 'Prescriptions' },
];

function resolveTitle(pathname, pageTitleOverride) {
  if (pageTitleOverride) return pageTitleOverride;
  const match = PAGE_TITLES.find((p) => pathname.startsWith(p.prefix));
  return match?.title || 'Prescriptions';
}

function isPrescriptionsActive(pathname) {
  return (
    pathname === ROUTES.PHARMACY_PRESCRIPTIONS ||
    pathname.startsWith('/pharmacy/prescriptions/') ||
    pathname.startsWith('/pharmacy/dispense/')
  );
}

function isNavLinkActive(pathname, link) {
  if (link.href === ROUTES.PHARMACY_PRESCRIPTIONS) {
    return isPrescriptionsActive(pathname);
  }
  return pathname === link.href || pathname.startsWith(link.href);
}

export default function PharmacyLayout({ children, pageTitle: pageTitleProp, compact = false }) {
  const navigate = useNavigate();
  const location = useLocation();
  const onProfilePage = location.pathname === ROUTES.PHARMACY_PROFILE;
  const { canViewPrescriptions, canViewNotifications } = usePharmacyPermissionSet();

  const navLinks = useMemo(
    () =>
      NAV_LINKS.filter((link) => {
        if (link.requires === 'prescriptions') return canViewPrescriptions;
        return true;
      }),
    [canViewPrescriptions],
  );

  return (
    <RoleLayout
      navLinks={navLinks}
      resolveTitle={resolveTitle}
      homeRoute={
        canViewPrescriptions ? ROUTES.PHARMACY_PRESCRIPTIONS : ROUTES.PHARMACY_PROFILE
      }
      roleLabel="Pharmacy"
      roleLabelClassName="pharmacy-role-label"
      defaultTitle="Prescriptions"
      pageTitleOverride={pageTitleProp}
      compact={compact}
      isNavLinkActive={isNavLinkActive}
      showBell={canViewNotifications}
      profileHref={ROUTES.PHARMACY_PROFILE}
      logoutMenuOnly={onProfilePage}
      headerBell={
        canViewNotifications ? (
          <PharmacyNotificationsBell
            onViewAll={() => navigate(ROUTES.PHARMACY_NOTIFICATIONS)}
          />
        ) : null
      }
    >
      {children}
    </RoleLayout>
  );
}
