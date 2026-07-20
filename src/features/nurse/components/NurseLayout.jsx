/**
 * Nurse Phase 2 by Atharva —
 * Nurse shell: nav, titles, profile menu, notifications bell.
 */

import { useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Activity,
  FileText,
  Pill,
  ClipboardList,
  AlertTriangle,
} from 'lucide-react';
import { ROUTES } from '@/shared/constants';
import RoleLayout from '@/shared/components/layout/RoleLayout';
import NurseNotificationsBell from '@/features/nurse/components/NurseNotificationsBell';
import '../styles/nurse.css';
import '../styles/nurse-alerts.css';

const NAV_LINKS = [
  { href: ROUTES.NURSE_DASHBOARD, label: 'Dashboard', icon: LayoutDashboard },
  { href: ROUTES.NURSE_QUEUE, label: 'Patient', icon: Users },
  { href: ROUTES.NURSE_VITALS, label: 'Vitals', icon: Activity },
  { href: ROUTES.NURSE_NOTES, label: 'Nursing Notes', icon: FileText },
  { href: ROUTES.NURSE_MEDICATIONS, label: 'Medications', icon: Pill },
  { href: ROUTES.NURSE_HANDOVER, label: 'Shift Handover', icon: ClipboardList },
  { href: ROUTES.NURSE_ALERTS, label: 'Emergency Alerts', icon: AlertTriangle },
];

const PAGE_TITLES = [
  { prefix: ROUTES.NURSE_NOTIFICATIONS, title: 'Notifications' },
  { prefix: '/nurse/alerts', title: 'Emergency Alerts' },
  { prefix: '/nurse/handover', title: 'Shift Handover' },
  { prefix: '/nurse/medications', title: 'Medications' },
  { prefix: '/nurse/notes', title: 'Nursing Notes' },
  { prefix: '/nurse/vitals', title: 'Vitals' },
  { prefix: ROUTES.NURSE_QUEUE, title: 'Patient' },
  { prefix: ROUTES.NURSE_DASHBOARD, title: 'Dashboard' },
  { prefix: '/nurse/patients', title: 'Patient' },
  { prefix: ROUTES.NURSE_PROFILE, title: 'My Profile' },
];

function resolveTitle(pathname) {
  const match = PAGE_TITLES.find((p) => pathname.startsWith(p.prefix));
  return match?.title || 'Nursing';
}

export default function NurseLayout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const onProfilePage = location.pathname === ROUTES.NURSE_PROFILE;

  return (
    <RoleLayout
      navLinks={NAV_LINKS}
      resolveTitle={resolveTitle}
      homeRoute={ROUTES.NURSE_DASHBOARD}
      roleLabel="Nursing"
      roleLabelClassName="nurse-role-label"
      defaultTitle="Dashboard"
      showBell
      profileHref={ROUTES.NURSE_PROFILE}
      logoutMenuOnly={onProfilePage}
      headerBell={
        <NurseNotificationsBell
          onViewAll={() => navigate(ROUTES.NURSE_NOTIFICATIONS)}
        />
      }
    >
      {children}
    </RoleLayout>
  );
}
