import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  LayoutDashboard,
  Users,
  FlaskConical,
  CalendarDays,
  Bell,
} from 'lucide-react';
import DoctorShell from '@/features/doctor/components/DoctorShell';
import PageSpinner from '@/shared/components/PageSpinner';
import { useDoctorNotificationsQuery } from '@/features/doctor/hooks/useDoctorQuery';
import { PATIENT_CATEGORY_FILTER } from '@/features/doctor/utils/patientListFilters';
import {
  prefetchDoctorDashboard,
  preloadDashboardSectionChunk,
} from '@/features/doctor/utils/doctorDashboardCache';
import { useQueryToken } from '@/shared/hooks/useQueryToken';
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
  const { data: notifications = [] } = useDoctorNotificationsQuery();
  const [active, setActive] = useState('dashboard');
  const [patientsCategoryFilter, setPatientsCategoryFilter] = useState(
    PATIENT_CATEGORY_FILTER.COMPLETED
  );

  useEffect(() => {
    void preloadDashboardSectionChunk();
    if (token) {
      void prefetchDoctorDashboard(queryClient, token);
    }
  }, [queryClient, token]);

  const unread = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  const nav = useMemo(
    () => [
      { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={16} /> },
      { id: 'patients', label: 'Patients', icon: <Users size={16} /> },
      { id: 'labs', label: 'Lab Tests', icon: <FlaskConical size={16} /> },
      { id: 'schedule', label: 'Calendar', icon: <CalendarDays size={16} /> },
      {
        id: 'notifications',
        label: `Notifications${unread ? ` (${unread})` : ''}`,
        icon: <Bell size={16} />,
      },
    ],
    [unread]
  );

  const openPatientsWithFilter = (category) => {
    setPatientsCategoryFilter(category);
    setActive('patients');
  };

  return (
    <DoctorShell title="Doctor" nav={nav} active={active} onSelect={setActive}>
      <Suspense fallback={<PageSpinner />}>
        {active === 'dashboard' && (
          <DashboardSection onViewAllPatients={openPatientsWithFilter} />
        )}
        {active === 'patients' && (
          <PatientsEMRSection
            key={patientsCategoryFilter}
            initialCategoryFilter={patientsCategoryFilter}
          />
        )}
        {active === 'labs' && <LabsSection />}
        {active === 'schedule' && <ScheduleSection />}
        {active === 'notifications' && <NotificationsSection />}
      </Suspense>
    </DoctorShell>
  );
}
