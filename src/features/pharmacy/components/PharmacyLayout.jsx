import { ClipboardList, History } from 'lucide-react';
import { ROUTES } from '@/shared/constants';
import RoleLayout from '@/shared/components/layout/RoleLayout';
import '../styles/pharmacy.css';

const NAV_LINKS = [
  { href: ROUTES.PHARMACY_PRESCRIPTIONS, label: 'Prescriptions', icon: ClipboardList },
  { href: ROUTES.PHARMACY_HISTORY, label: 'History', icon: History },
];

const PAGE_TITLES = [
  { prefix: '/pharmacy/dispense', title: 'Dispense Medicine' },
  { prefix: ROUTES.PHARMACY_HISTORY, title: 'History' },
  { prefix: ROUTES.PHARMACY_PRESCRIPTIONS, title: 'Prescriptions' },
];

function resolveTitle(pathname, pageTitleOverride) {
  const match = PAGE_TITLES.find((p) => pathname.startsWith(p.prefix));
  return pageTitleOverride || match?.title || 'Prescriptions';
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
  return (
    <RoleLayout
      navLinks={NAV_LINKS}
      resolveTitle={resolveTitle}
      homeRoute={ROUTES.PHARMACY_PRESCRIPTIONS}
      roleLabel="Pharmacy"
      roleLabelClassName="pharmacy-role-label"
      defaultTitle="Prescriptions"
      pageTitleOverride={pageTitleProp}
      compact={compact}
      isNavLinkActive={isNavLinkActive}
      showBell
    >
      {children}
    </RoleLayout>
  );
}
