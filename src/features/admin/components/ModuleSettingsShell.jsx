import { Construction } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import AdminSettingsNav from '@/features/admin/components/AdminSettingsNav';
import AdminEmptyState from '@/features/admin/components/AdminEmptyState';
import AdminOpdSettingsPanel from '@/features/admin/components/AdminOpdSettingsPanel';
import AdminNurseManagementPanel from '@/features/admin/nurse/components/AdminNurseManagementPanel';
import AdminReceptionistManagementPanel from '@/features/admin/receptionist/components/AdminReceptionistManagementPanel';
import AdminDoctorManagementPanel from '@/features/admin/doctor/components/AdminDoctorManagementPanel';
import AdminPharmacyManagementPanel from '@/features/admin/pharmacy/components/AdminPharmacyManagementPanel';
import AdminLabManagementPanel from '@/features/admin/lab/components/AdminLabManagementPanel';
import '@/features/admin/styles/nurseWorkforce.css';

/**
 * Shared Admin / Super Admin module settings body.
 * Same panels + same APIs (POST /roles/{id}/permissions, OPD settings) so
 * toggles saved in either portal apply to both.
 */
export default function ModuleSettingsShell({
  routes,
  navLinks,
  defaultModule = 'OPD',
  manageAdminEditLocks = false,
}) {
  const { pathname } = useLocation();

  const moduleByPath = [
    { prefix: routes.doctor, label: 'Doctor' },
    { prefix: routes.receptionist, label: 'Receptionist' },
    { prefix: routes.lab, label: 'LAB' },
    { prefix: routes.nurse, label: 'NURSE' },
    { prefix: routes.pharmacy, label: 'Pharmacy' },
    { prefix: routes.opd, label: 'OPD' },
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
      <AdminSettingsNav links={navLinks} />

      {showOpd ? (
        <AdminOpdSettingsPanel manageAdminEditLocks={manageAdminEditLocks} />
      ) : showNurse ? (
        <AdminNurseManagementPanel manageAdminEditLocks={manageAdminEditLocks} />
      ) : showReceptionist ? (
        <AdminReceptionistManagementPanel manageAdminEditLocks={manageAdminEditLocks} />
      ) : showDoctor ? (
        <AdminDoctorManagementPanel manageAdminEditLocks={manageAdminEditLocks} />
      ) : showPharmacy ? (
        <AdminPharmacyManagementPanel manageAdminEditLocks={manageAdminEditLocks} />
      ) : showLab ? (
        <AdminLabManagementPanel manageAdminEditLocks={manageAdminEditLocks} />
      ) : (
        <section className="nwf-panel">
          <div className="nwf-panel__header">
            <h2 className="admin-card__title">{moduleLabel} settings</h2>
          </div>
          <AdminEmptyState
            icon={<Construction size={28} strokeWidth={1.75} />}
            title="Under development"
            description={`${moduleLabel} business controls are coming soon.`}
          />
        </section>
      )}
    </div>
  );
}
