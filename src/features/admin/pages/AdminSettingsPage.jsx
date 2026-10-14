import AdminLayout from '@/features/admin/components/AdminLayout';
import ModuleSettingsShell from '@/features/admin/components/ModuleSettingsShell';
import { ROUTES } from '@/shared/constants';

const ADMIN_SETTINGS_ROUTES = {
  root: ROUTES.ADMIN_SETTINGS,
  opd: ROUTES.ADMIN_SETTINGS_OPD,
  doctor: ROUTES.ADMIN_SETTINGS_DOCTOR,
  receptionist: ROUTES.ADMIN_SETTINGS_RECEPTIONIST,
  lab: ROUTES.ADMIN_SETTINGS_LAB,
  nurse: ROUTES.ADMIN_SETTINGS_NURSE,
  pharmacy: ROUTES.ADMIN_SETTINGS_PHARMACY,
};

const ADMIN_SETTINGS_NAV = [
  { to: ROUTES.ADMIN_SETTINGS_OPD, label: 'OPD/IPD', end: true },
  { to: ROUTES.ADMIN_SETTINGS_DOCTOR, label: 'Doctor' },
  { to: ROUTES.ADMIN_SETTINGS_RECEPTIONIST, label: 'Receptionist' },
  { to: ROUTES.ADMIN_SETTINGS_LAB, label: 'LAB' },
  { to: ROUTES.ADMIN_SETTINGS_NURSE, label: 'NURSE' },
  { to: ROUTES.ADMIN_SETTINGS_PHARMACY, label: 'Pharmacy' },
];

export default function AdminSettingsPage() {
  return (
    <AdminLayout pageTitle="Settings">
      <ModuleSettingsShell routes={ADMIN_SETTINGS_ROUTES} navLinks={ADMIN_SETTINGS_NAV} />
    </AdminLayout>
  );
}
