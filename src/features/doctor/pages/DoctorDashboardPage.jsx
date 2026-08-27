import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  LayoutDashboard,
  Users,
  FlaskConical,
  CalendarDays,
} from 'lucide-react';
import DoctorShell from '@/features/doctor/components/DoctorShell';
import PageSpinner from '@/shared/components/PageSpinner';
import { PATIENT_CATEGORY_FILTER } from '@/features/doctor/utils/patientListFilters';
import { parseDoctorEncounterMode } from '@/features/doctor/utils/encounterType';
import {
  prefetchDoctorDashboard,
  prefetchDoctorSection,
  preloadDashboardSectionChunk,
} from '@/features/doctor/utils/doctorDashboardCache';
import { useQueryToken } from '@/shared/hooks/useQueryToken';
import { ROUTES } from '@/shared/constants';
import '../styles/doctor-ui.css';
import './DoctorDashboardPage.css';

const DashboardSection = lazy(() => import('@/features/doctor/components/DashboardSection'));
const PatientsEMRSection = lazy(() => import('@/features/doctor/components/PatientsEMRSection'));
const LabsSection = lazy(() => import('@/features/doctor/components/LabsSection'));
const ScheduleSection = lazy(() => import('@/features/doctor/components/ScheduleSection'));
const NotificationsSection = lazy(() => import('@/features/doctor/components/NotificationsSection'));

export default function DoctorDashboardPage() {
  const queryClient = useQueryClient();
  const token = useQueryToken();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [active, setActive] = useState('dashboard');
  const encounterMode = parseDoctorEncounterMode(searchParams.get('mode'));
  const [patientsCategoryFilter, setPatientsCategoryFilter] = useState(
    PATIENT_CATEGORY_FILTER.COMPLETED
  );

  const showEncounterToggle = ['dashboard', 'patients', 'labs', 'schedule'].includes(active);

  const handleEncounterModeChange = useCallback(
    (mode) => {
      const nextMode = parseDoctorEncounterMode(mode);
      // Keep the current sidebar section (e.g. Lab Tests) when switching OPD ↔ IPD.
      const next = new URLSearchParams(searchParams);
      next.set('mode', nextMode);
      navigate(
        {
          pathname: ROUTES.DOCTOR_DASHBOARD,
          search: `?${next.toString()}`,
        },
        {
          replace: true,
          state: { ...(location.state ?? {}), doctorSection: active },
        },
      );
    },
    [active, navigate, searchParams, location.state],
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

  useEffect(() => {
    const section = location.state?.doctorSection;
    if (typeof section === 'string' && section) {
      setActive(section);
    }
  }, [location.state]);

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
    setActive('patients');
  };

  /** Doctor Phase 2 by Atharva — deep-link by reference_type (+ reference_id in state) */
  const handleNotificationDeepLink = (n) => {
    const refId = n?.reference_id;
    switch (n?.reference_type) {
      case 'LAB_ORDER':
        setActive('labs');
        navigate(
          { pathname: ROUTES.DOCTOR_DASHBOARD, search: location.search },
          {
            state: { doctorSection: 'labs', labOrderId: refId },
            replace: true,
          },
        );
        break;
      case 'PATIENT':
        setActive('patients');
        navigate(
          { pathname: ROUTES.DOCTOR_DASHBOARD, search: location.search },
          {
            state: { doctorSection: 'patients', patientId: refId },
            replace: true,
          },
        );
        break;
      case 'APPOINTMENT':
        setActive('dashboard');
        navigate(
          { pathname: ROUTES.DOCTOR_DASHBOARD, search: location.search },
          {
            state: { doctorSection: 'dashboard', appointmentId: refId },
            replace: true,
          },
        );
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
      onSelect={setActive}
      encounterMode={showEncounterToggle ? encounterMode : undefined}
      onEncounterModeChange={showEncounterToggle ? handleEncounterModeChange : undefined}
    >
      <Suspense fallback={<PageSpinner />}>
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
      </Suspense>
    </DoctorShell>
  );
}
