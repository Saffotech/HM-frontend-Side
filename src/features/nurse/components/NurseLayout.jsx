/**
 * Nurse Phase 2 by Atharva —
 * Nurse shell: nav, titles, profile menu, notifications bell.
 */

import { useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Activity,
  FileText,
  Pill,
  CalendarClock,
  Stethoscope,
  FlaskConical,
} from 'lucide-react';
import { ROUTES } from '@/shared/constants';
import RoleLayout from '@/shared/components/layout/RoleLayout';
import NurseNotificationsBell from '@/features/nurse/components/NurseNotificationsBell';
import NursePatientScopeBar from '@/features/nurse/components/NursePatientScopeBar';
import { useNursePermissionSet } from '@/features/nurse/hooks/useNursePermission';
import '../styles/nurse.css';

const NURSE_HEADER_TITLE = 'Nurse';

export default function NurseLayout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const onProfilePage = location.pathname === ROUTES.NURSE_PROFILE;
  const {
    canViewPatients,
    canViewVitals,
    canViewNotes,
    canViewLabReports,
    canViewMedication,
    canViewDoctorVisits,
  } = useNursePermissionSet();

  const resolveLayoutTitle = useCallback(() => NURSE_HEADER_TITLE, []);

  const navLinks = useMemo(() => {
    const links = [
      { href: ROUTES.NURSE_DASHBOARD, label: 'Dashboard', icon: LayoutDashboard },
      { href: ROUTES.NURSE_MY_DUTY, label: 'My Duty', icon: CalendarClock },
    ];
    if (canViewPatients) {
      links.push({ href: ROUTES.NURSE_QUEUE, label: 'Patient', icon: Users });
    }
    if (canViewVitals) {
      links.push({ href: ROUTES.NURSE_VITALS, label: 'Vitals', icon: Activity });
    }
    if (canViewNotes) {
      links.push({ href: ROUTES.NURSE_NOTES, label: 'Nursing Notes', icon: FileText });
    }
    if (canViewLabReports) {
      links.push({ href: ROUTES.NURSE_LAB_REPORTS, label: 'Lab Reports', icon: FlaskConical });
    }
    if (canViewMedication) {
      links.push({ href: ROUTES.NURSE_MEDICATIONS, label: 'Medications', icon: Pill });
    }
    if (canViewDoctorVisits) {
      links.push({ href: ROUTES.NURSE_DOCTOR_VISITS, label: 'Doctor Visits', icon: Stethoscope });
    }
    return links;
  }, [canViewPatients, canViewVitals, canViewNotes, canViewLabReports, canViewMedication, canViewDoctorVisits]);

  return (
    <RoleLayout
      navLinks={navLinks}
      resolveTitle={resolveLayoutTitle}
      homeRoute={ROUTES.NURSE_DASHBOARD}
      defaultTitle={NURSE_HEADER_TITLE}
      showBell
      profileHref={ROUTES.NURSE_PROFILE}
      logoutMenuOnly={onProfilePage}
      headerBell={
        <NurseNotificationsBell
          onViewAll={() => navigate(ROUTES.NURSE_NOTIFICATIONS)}
        />
      }
      layoutClassName="nurse-layout"
    >
      <NursePatientScopeBar />
      {children}
    </RoleLayout>
  );
}
