import { LayoutDashboard, ClipboardList, FileCheck } from 'lucide-react';
import { ROUTES } from '@/shared/constants';
import RoleLayout from '@/shared/components/layout/RoleLayout';
import '../styles/lab.css';

const NAV_LINKS = [
  { label: 'Dashboard', href: ROUTES.LAB_DASHBOARD, icon: LayoutDashboard },
  { label: 'Pending Tests', href: ROUTES.LAB_ORDERS, icon: ClipboardList },
  { label: 'Report Archive', href: ROUTES.LAB_REPORTS, icon: FileCheck },
];

const PAGE_TITLES = [
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

function isNavLinkActive(pathname, link) {
  if (link.href === ROUTES.LAB_ORDERS) {
    return pathname === ROUTES.LAB_ORDERS || pathname.startsWith('/lab/orders/');
  }
  return pathname === link.href || pathname.startsWith(`${link.href}/`);
}

export default function LabLayout({ children, pageTitle, compact = false }) {
  return (
    <RoleLayout
      navLinks={NAV_LINKS}
      resolveTitle={resolveTitle}
      homeRoute={ROUTES.LAB_DASHBOARD}
      roleLabel="Lab Technician"
      roleLabelClassName="lab-role-label"
      defaultTitle="Dashboard"
      pageTitleOverride={pageTitle}
      isNavLinkActive={isNavLinkActive}
      showBell={false}
      compact={compact}
    >
      {children}
    </RoleLayout>
  );
}
