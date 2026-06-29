import { LayoutDashboard, ClipboardList, FileCheck } from 'lucide-react';
import { ROUTES } from '@/shared/constants';
import RoleLayout from '@/shared/components/layout/RoleLayout';
import '../styles/lab.css';

const NAV_LINKS = [
  { label: 'Dashboard', href: ROUTES.LAB_DASHBOARD, icon: LayoutDashboard },
  { label: 'Pending Tests', href: ROUTES.LAB_ORDERS, icon: ClipboardList },
  { label: 'Report Archive', href: ROUTES.LAB_REPORTS, icon: FileCheck },
];

function resolveTitle(_pathname, pageTitleOverride) {
  return pageTitleOverride || 'Lab Portal';
}

export default function LabLayout({ children, pageTitle = 'Lab Portal' }) {
  return (
    <RoleLayout
      variant="lab"
      navLinks={NAV_LINKS}
      resolveTitle={resolveTitle}
      homeRoute={ROUTES.LAB_DASHBOARD}
      roleLabel="Lab Technician"
      pageTitleOverride={pageTitle}
    >
      {children}
    </RoleLayout>
  );
}
