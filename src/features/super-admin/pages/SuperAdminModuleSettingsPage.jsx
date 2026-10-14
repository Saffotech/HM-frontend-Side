import SuperAdminLayout from '@/features/super-admin/components/SuperAdminLayout';
import ModuleSettingsShell from '@/features/admin/components/ModuleSettingsShell';
import { ROUTES } from '@/shared/constants';
import '@/features/admin/styles/admin.css';

const SUPER_ADMIN_SETTINGS_ROUTES = {
  root: ROUTES.SUPER_ADMIN_SETTINGS,
  opd: ROUTES.SUPER_ADMIN_SETTINGS_OPD,
  doctor: ROUTES.SUPER_ADMIN_SETTINGS_DOCTOR,
  receptionist: ROUTES.SUPER_ADMIN_SETTINGS_RECEPTIONIST,
  lab: ROUTES.SUPER_ADMIN_SETTINGS_LAB,
  nurse: ROUTES.SUPER_ADMIN_SETTINGS_NURSE,
  pharmacy: ROUTES.SUPER_ADMIN_SETTINGS_PHARMACY,
};

const SUPER_ADMIN_SETTINGS_NAV = [
  { to: ROUTES.SUPER_ADMIN_SETTINGS_OPD, label: 'OPD/IPD', end: true },
  { to: ROUTES.SUPER_ADMIN_SETTINGS_DOCTOR, label: 'Doctor' },
  { to: ROUTES.SUPER_ADMIN_SETTINGS_RECEPTIONIST, label: 'Receptionist' },
  { to: ROUTES.SUPER_ADMIN_SETTINGS_LAB, label: 'LAB' },
  { to: ROUTES.SUPER_ADMIN_SETTINGS_NURSE, label: 'NURSE' },
  { to: ROUTES.SUPER_ADMIN_SETTINGS_PHARMACY, label: 'Pharmacy' },
];

/**
 * Same module settings as Hospital Admin (shared panels + shared APIs).
 * Permission ON/OFF here updates the same role rows Admin uses.
 */
export default function SuperAdminModuleSettingsPage() {
  return (
    <SuperAdminLayout pageTitle="Settings">
      <ModuleSettingsShell
        routes={SUPER_ADMIN_SETTINGS_ROUTES}
        navLinks={SUPER_ADMIN_SETTINGS_NAV}
        manageAdminEditLocks
      />
    </SuperAdminLayout>
  );
}
