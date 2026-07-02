import { LayoutDashboard } from 'lucide-react';
import { ROUTES } from '@/shared/constants';
import RoleLayout from '@/shared/components/layout/RoleLayout';
import '../styles/receptionist.css';

const NAV_LINKS = [
  { href: ROUTES.RECEPTIONIST_DASHBOARD, label: 'Dashboard', icon: LayoutDashboard },
];

function resolveTitle(pathname) {
  if (pathname.startsWith(ROUTES.RECEPTIONIST_DASHBOARD)) {
    return 'Receptionist Dashboard';
  }
  return 'Reception';
}

export default function ReceptionistLayout({ children }) {
  return (
    <RoleLayout
      navLinks={NAV_LINKS}
      resolveTitle={resolveTitle}
      homeRoute={ROUTES.RECEPTIONIST_DASHBOARD}
      roleLabel="Reception"
      roleLabelClassName="receptionist-role-label"
      defaultTitle="Receptionist Dashboard"
    >
      {children}
    </RoleLayout>
  );
}
