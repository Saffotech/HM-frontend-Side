/**
 * Receptionist shell: queue nav + profile menu + notifications bell.
 */

import { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Stethoscope, History, ListOrdered } from 'lucide-react';
import { ROUTES } from '@/shared/constants';
import RoleLayout from '@/shared/components/layout/RoleLayout';
import ReceptionistNotificationsBell from '@/features/receptionist/components/ReceptionistNotificationsBell';
import { useReceptionistPermissionSet } from '@/features/receptionist/hooks/useReceptionistPermission';
import '../styles/receptionist.css';

const NAV_LINKS = [
  {
    href: ROUTES.RECEPTIONIST_DASHBOARD,
    label: 'Dashboard',
    icon: LayoutDashboard,
    requires: 'queues',
  },
  {
    href: ROUTES.RECEPTIONIST_TODAY_QUEUE,
    label: "Today's Queue",
    icon: ListOrdered,
    requires: 'queues',
  },
  {
    href: ROUTES.RECEPTIONIST_DOCTOR_QUEUES,
    label: 'Doctor Queues',
    icon: Stethoscope,
    requires: 'queues',
  },
  {
    href: ROUTES.RECEPTIONIST_QUEUE_HISTORY,
    label: 'Queue History',
    icon: History,
    requires: 'queues',
  },
];

/** Top shell title stays "Receptionist"; page names live in each screen. */
function resolveTitle() {
  return 'Receptionist';
}

export default function ReceptionistLayout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const onProfilePage = location.pathname === ROUTES.RECEPTIONIST_PROFILE;
  const { canViewQueues, canViewNotifications } = useReceptionistPermissionSet();

  const navLinks = useMemo(
    () =>
      NAV_LINKS.filter((link) => {
        if (link.requires === 'queues') return canViewQueues;
        return true;
      }),
    [canViewQueues],
  );

  return (
    <RoleLayout
      navLinks={navLinks}
      resolveTitle={resolveTitle}
      homeRoute={
        canViewQueues ? ROUTES.RECEPTIONIST_DASHBOARD : ROUTES.RECEPTIONIST_PROFILE
      }
      defaultTitle="Receptionist"
      showBell={canViewNotifications}
      profileHref={ROUTES.RECEPTIONIST_PROFILE}
      logoutMenuOnly={onProfilePage}
      headerBell={
        canViewNotifications ? (
          <ReceptionistNotificationsBell
            onViewAll={() => navigate(ROUTES.RECEPTIONIST_NOTIFICATIONS)}
          />
        ) : null
      }
    >
      {children}
    </RoleLayout>
  );
}
