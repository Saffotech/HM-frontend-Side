import { useLocation } from 'react-router-dom';
import SuperAdminLayout from '@/features/admin/components/AdminLayout';
import ModuleSettingsShell from '@/features/manager/components/ModuleSettingsShell';
import { adminPanelRoutes } from '@/shared/constants';
import '@/features/manager/styles/manager.css';

/**
 * Same module settings as Manager (shared panels + shared APIs).
 * Permission ON/OFF here updates the same role rows Admin uses.
 */
export default function SuperAdminModuleSettingsPage() {
  const { pathname } = useLocation();
  const panel = adminPanelRoutes(pathname);
  const settingsRoutes = {
    root: panel.settings,
    opd: panel.settingsOpd,
    doctor: panel.settingsDoctor,
    receptionist: panel.settingsReceptionist,
    lab: panel.settingsLab,
    nurse: panel.settingsNurse,
    pharmacy: panel.settingsPharmacy,
  };
  const settingsNav = [
    { to: panel.settingsOpd, label: 'OPD/IPD', end: true },
    { to: panel.settingsDoctor, label: 'Doctor' },
    { to: panel.settingsReceptionist, label: 'Receptionist' },
    { to: panel.settingsLab, label: 'LAB' },
    { to: panel.settingsNurse, label: 'NURSE' },
    { to: panel.settingsPharmacy, label: 'Pharmacy' },
  ];

  return (
    <SuperAdminLayout pageTitle="Settings">
      <ModuleSettingsShell
        routes={settingsRoutes}
        navLinks={settingsNav}
        manageAdminEditLocks
      />
    </SuperAdminLayout>
  );
}
