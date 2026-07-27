/**
 * Receptionist shell: queue nav + profile menu + notifications bell.
 */

import { useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Stethoscope, History, ListOrdered } from 'lucide-react';
import { ROUTES } from '@/shared/constants';
import RoleLayout from '@/shared/components/layout/RoleLayout';
import ReceptionistNotificationsBell from '@/features/receptionist/components/ReceptionistNotificationsBell';
import '../styles/receptionist.css';

const NAV_LINKS = [
  { href: ROUTES.RECEPTIONIST_DASHBOARD, label: 'Dashboard', icon: LayoutDashboard },
  { href: ROUTES.RECEPTIONIST_TODAY_QUEUE, label: "Today's Queue", icon: ListOrdered },
  { href: ROUTES.RECEPTIONIST_DOCTOR_QUEUES, label: 'Doctor Queues', icon: Stethoscope },
  { href: ROUTES.RECEPTIONIST_QUEUE_HISTORY, label: 'Queue History', icon: History },
];

const PAGE_TITLES = [
  { prefix: ROUTES.RECEPTIONIST_NOTIFICATIONS, title: 'Notifications' },
  { prefix: ROUTES.RECEPTIONIST_PROFILE, title: 'My Profile' },
  { prefix: ROUTES.RECEPTIONIST_QUEUE_HISTORY, title: 'Queue History' },
  { prefix: ROUTES.RECEPTIONIST_DOCTOR_QUEUES, title: 'Doctor Queues' },
  { prefix: ROUTES.RECEPTIONIST_TODAY_QUEUE, title: "Today's Queue" },
  { prefix: ROUTES.RECEPTIONIST_DASHBOARD, title: 'Receptionist Dashboard' },
];

function resolveTitle(pathname, pageTitleOverride) {
  if (pageTitleOverride) return pageTitleOverride;
  const match = PAGE_TITLES.find((entry) => pathname.startsWith(entry.prefix));
  return match?.title || 'Reception';
}

export default function ReceptionistLayout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const onProfilePage = location.pathname === ROUTES.RECEPTIONIST_PROFILE;

  return (
    <RoleLayout
      navLinks={NAV_LINKS}
      resolveTitle={resolveTitle}
      homeRoute={ROUTES.RECEPTIONIST_DASHBOARD}
      roleLabel="Reception"
      roleLabelClassName="receptionist-role-label"
      defaultTitle="Receptionist Dashboard"
      showBell
      profileHref={ROUTES.RECEPTIONIST_PROFILE}
      logoutMenuOnly={onProfilePage}
      headerBell={
        <ReceptionistNotificationsBell
          onViewAll={() => navigate(ROUTES.RECEPTIONIST_NOTIFICATIONS)}
        />
      }
    >
      {children}
    </RoleLayout>
  );
}
