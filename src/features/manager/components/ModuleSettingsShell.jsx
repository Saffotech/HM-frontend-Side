import { Construction } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import ManagerSettingsNav from '@/features/manager/components/ManagerSettingsNav';
import ManagerEmptyState from '@/features/manager/components/ManagerEmptyState';
import ManagerOpdSettingsPanel from '@/features/manager/components/ManagerOpdSettingsPanel';
import ManagerNurseManagementPanel from '@/features/manager/nurse/components/ManagerNurseManagementPanel';
import ManagerReceptionistManagementPanel from '@/features/manager/receptionist/components/ManagerReceptionistManagementPanel';
import ManagerDoctorManagementPanel from '@/features/manager/doctor/components/ManagerDoctorManagementPanel';
import ManagerPharmacyManagementPanel from '@/features/manager/pharmacy/components/ManagerPharmacyManagementPanel';
import ManagerLabManagementPanel from '@/features/manager/lab/components/ManagerLabManagementPanel';
import '@/features/manager/styles/nurseWorkforce.css';

/**
 * Shared Manager / Admin module settings body.
 * Same panels + same APIs (POST /roles/{id}/permissions, OPD settings) so
 * toggles saved in either portal apply to both.
 */
export default function ModuleSettingsShell({
  routes,
  navLinks,
  defaultModule = 'OPD/IPD',
  manageAdminEditLocks = false,
}) {
  const { pathname } = useLocation();

  const moduleByPath = [
    { prefix: routes.doctor, label: 'Doctor' },
    { prefix: routes.receptionist, label: 'Receptionist' },
    { prefix: routes.lab, label: 'LAB' },
    { prefix: routes.nurse, label: 'NURSE' },
    { prefix: routes.pharmacy, label: 'Pharmacy' },
    { prefix: routes.opd, label: 'OPD/IPD' },
  ];

  const moduleLabel =
    moduleByPath.find((item) => pathname.startsWith(item.prefix))?.label || defaultModule;

  const showOpd =
    pathname === routes.root ||
    pathname === routes.opd ||
    pathname.startsWith(`${routes.opd}/`);
  const showNurse =
    pathname === routes.nurse || pathname.startsWith(`${routes.nurse}/`);
  const showReceptionist =
    pathname === routes.receptionist || pathname.startsWith(`${routes.receptionist}/`);
  const showDoctor =
    pathname === routes.doctor || pathname.startsWith(`${routes.doctor}/`);
  const showPharmacy =
    pathname === routes.pharmacy || pathname.startsWith(`${routes.pharmacy}/`);
  const showLab = pathname === routes.lab || pathname.startsWith(`${routes.lab}/`);

  return (
    <div className="admin-page nwf-page">
      <ManagerSettingsNav links={navLinks} />

      {showOpd ? (
        <ManagerOpdSettingsPanel manageAdminEditLocks={manageAdminEditLocks} />
      ) : showNurse ? (
        <ManagerNurseManagementPanel manageAdminEditLocks={manageAdminEditLocks} />
      ) : showReceptionist ? (
        <ManagerReceptionistManagementPanel manageAdminEditLocks={manageAdminEditLocks} />
      ) : showDoctor ? (
        <ManagerDoctorManagementPanel manageAdminEditLocks={manageAdminEditLocks} />
      ) : showPharmacy ? (
        <ManagerPharmacyManagementPanel manageAdminEditLocks={manageAdminEditLocks} />
      ) : showLab ? (
        <ManagerLabManagementPanel manageAdminEditLocks={manageAdminEditLocks} />
      ) : (
        <section className="nwf-panel">
          <div className="nwf-panel__header">
            <h2 className="admin-card__title">{moduleLabel} settings</h2>
          </div>
          <ManagerEmptyState
            icon={<Construction size={28} strokeWidth={1.75} />}
            title="Under development"
            description={`${moduleLabel} business controls are coming soon.`}
          />
        </section>
      )}
    </div>
  );
}
