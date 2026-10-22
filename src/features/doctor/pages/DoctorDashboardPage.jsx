import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  LayoutDashboard,
  Users,
  FlaskConical,
  CalendarDays,
} from 'lucide-react';
import DoctorShell from '@/features/doctor/components/DoctorShell';
import DashboardSection from '@/features/doctor/components/DashboardSection';
import PatientsEMRSection from '@/features/doctor/components/PatientsEMRSection';
import LabsSection from '@/features/doctor/components/LabsSection';
import ScheduleSection from '@/features/doctor/components/ScheduleSection';
import NotificationsSection from '@/features/doctor/components/NotificationsSection';
import { PATIENT_CATEGORY_FILTER } from '@/features/doctor/utils/patientListFilters';
import { parseDoctorEncounterMode } from '@/features/doctor/utils/encounterType';
import { parseDoctorSection, withDoctorSection } from '@/features/doctor/utils/doctorSection';
import {
  prefetchDoctorDashboard,
  prefetchDoctorSection,
  preloadDashboardSectionChunk,
} from '@/features/doctor/utils/doctorDashboardCache';
import { useQueryToken } from '@/shared/hooks/useQueryToken';
import { ROUTES } from '@/shared/constants';
import '../styles/doctor-ui.css';
import './DoctorDashboardPage.css';

export default function DoctorDashboardPage() {
  const queryClient = useQueryClient();
  const token = useQueryToken();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const encounterMode = parseDoctorEncounterMode(searchParams.get('mode'));
  const active = parseDoctorSection(searchParams.get('section')) || 'dashboard';
  const [patientsCategoryFilter, setPatientsCategoryFilter] = useState(
    PATIENT_CATEGORY_FILTER.COMPLETED
  );

  const showEncounterToggle = ['dashboard', 'patients', 'labs', 'schedule'].includes(active);

  const selectSection = useCallback((section) => {
    const nextSection = parseDoctorSection(section) || 'dashboard';
    setSearchParams((prev) => {
      const next = withDoctorSection(prev, nextSection);
      if (nextSection !== 'patients') next.delete('patient');
      return next;
    }, {
      replace: true,
      preventScrollReset: true,
    });
  }, [setSearchParams]);

  const handleEncounterModeChange = useCallback(
    (mode) => {
      const nextMode = parseDoctorEncounterMode(mode);
      // Keep the current sidebar section (e.g. Lab Tests) when switching OPD ↔ IPD.
      const next = withDoctorSection(searchParams, active);
      next.set('mode', nextMode);
      navigate(
        {
          pathname: ROUTES.DOCTOR_DASHBOARD,
          search: `?${next.toString()}`,
        },
        {
          replace: true,
          preventScrollReset: true,
        },
      );
    },
    [active, navigate, searchParams],
  );

  useEffect(() => {
    void preloadDashboardSectionChunk();
    if (token) {
      void prefetchDoctorDashboard(queryClient, token);
    }
  }, [queryClient, token]);

  useEffect(() => {
    if (!token) return;
    void prefetchDoctorSection(queryClient, token, { section: active, encounterMode });
  }, [queryClient, token, active, encounterMode]);

  // Doctor Phase 2 by Atharva — sidebar only main clinical sections (no notifications / profile)
  const nav = useMemo(
    () => [
      { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={22} /> },
      { id: 'patients', label: 'Patients', icon: <Users size={22} /> },
      { id: 'labs', label: 'Lab Tests', icon: <FlaskConical size={22} /> },
      { id: 'schedule', label: 'Calendar', icon: <CalendarDays size={22} /> },
    ],
    []
  );

  const openPatientsWithFilter = (category) => {
    setPatientsCategoryFilter(category);
    selectSection('patients');
  };

  /** Doctor Phase 2 by Atharva — deep-link by reference_type (+ reference_id in state) */
  const handleNotificationDeepLink = (n) => {
    switch (n?.reference_type) {
      case 'LAB_ORDER':
        selectSection('labs');
        break;
      case 'PATIENT':
        selectSection('patients');
        break;
      case 'APPOINTMENT':
        selectSection('dashboard');
        break;
      case 'USER':
        navigate(ROUTES.DOCTOR_PROFILE);
        break;
      default:
        break;
    }
  };

  return (
    <DoctorShell
      title="Doctor"
      nav={nav}
      active={active}
      onSelect={selectSection}
      encounterMode={showEncounterToggle ? encounterMode : undefined}
      onEncounterModeChange={showEncounterToggle ? handleEncounterModeChange : undefined}
    >
      {active === 'dashboard' && (
        <DashboardSection
          key={`dashboard-${encounterMode}`}
          encounterMode={encounterMode}
          onViewAllPatients={openPatientsWithFilter}
        />
      )}
      {active === 'patients' && (
        <PatientsEMRSection
          key={`${patientsCategoryFilter}-${encounterMode}`}
          initialCategoryFilter={patientsCategoryFilter}
          encounterMode={encounterMode}
        />
      )}
      {active === 'labs' && (
        <LabsSection key={`labs-${encounterMode}`} encounterMode={encounterMode} />
      )}
      {active === 'schedule' && (
        <ScheduleSection key={`schedule-${encounterMode}`} encounterMode={encounterMode} />
      )}
      {active === 'notifications' && (
        <NotificationsSection onDeepLink={handleNotificationDeepLink} />
      )}
    </DoctorShell>
  );
}
