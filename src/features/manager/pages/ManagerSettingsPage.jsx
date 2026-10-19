import AdminLayout from '@/features/manager/components/ManagerLayout';
import ModuleSettingsShell from '@/features/manager/components/ModuleSettingsShell';
import { ROUTES } from '@/shared/constants';

const ADMIN_SETTINGS_ROUTES = {
  root: ROUTES.MANAGER_SETTINGS,
  opd: ROUTES.MANAGER_SETTINGS_OPD,
  doctor: ROUTES.MANAGER_SETTINGS_DOCTOR,
  receptionist: ROUTES.MANAGER_SETTINGS_RECEPTIONIST,
  lab: ROUTES.MANAGER_SETTINGS_LAB,
  nurse: ROUTES.MANAGER_SETTINGS_NURSE,
  pharmacy: ROUTES.MANAGER_SETTINGS_PHARMACY,
};

const ADMIN_SETTINGS_NAV = [
  { to: ROUTES.MANAGER_SETTINGS_OPD, label: 'OPD/IPD', end: true },
  { to: ROUTES.MANAGER_SETTINGS_DOCTOR, label: 'Doctor' },
  { to: ROUTES.MANAGER_SETTINGS_RECEPTIONIST, label: 'Receptionist' },
  { to: ROUTES.MANAGER_SETTINGS_LAB, label: 'LAB' },
  { to: ROUTES.MANAGER_SETTINGS_NURSE, label: 'NURSE' },
  { to: ROUTES.MANAGER_SETTINGS_PHARMACY, label: 'Pharmacy' },
];

export default function AdminSettingsPage() {
  return (
    <AdminLayout pageTitle="Settings">
      <ModuleSettingsShell routes={ADMIN_SETTINGS_ROUTES} navLinks={ADMIN_SETTINGS_NAV} />
    </AdminLayout>
  );
}
