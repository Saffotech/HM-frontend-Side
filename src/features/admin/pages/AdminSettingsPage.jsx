import { Construction } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import AdminLayout from '@/features/admin/components/AdminLayout';
import AdminSettingsNav from '@/features/admin/components/AdminSettingsNav';
import AdminEmptyState from '@/features/admin/components/AdminEmptyState';
import AdminOpdSettingsPanel from '@/features/admin/components/AdminOpdSettingsPanel';
import { ROUTES } from '@/shared/constants';
import '@/features/admin/styles/nurseWorkforce.css';

const MODULE_BY_PATH = [
  { prefix: ROUTES.ADMIN_SETTINGS_DOCTOR, label: 'Doctor' },
  { prefix: ROUTES.ADMIN_SETTINGS_RECEPTIONIST, label: 'Receptionist' },
  { prefix: ROUTES.ADMIN_SETTINGS_LAB, label: 'LAB' },
  { prefix: ROUTES.ADMIN_SETTINGS_NURSE, label: 'NURSE' },
  { prefix: ROUTES.ADMIN_SETTINGS_PHARMACY, label: 'Pharmacy' },
  { prefix: ROUTES.ADMIN_SETTINGS_OPD, label: 'OPD' },
];

function resolveModuleLabel(pathname) {
  const match = MODULE_BY_PATH.find((item) => pathname.startsWith(item.prefix));
  return match?.label || 'OPD';
}

function isOpdSettingsPath(pathname) {
  return (
    pathname === ROUTES.ADMIN_SETTINGS_OPD ||
    pathname === ROUTES.ADMIN_SETTINGS ||
    pathname.startsWith(`${ROUTES.ADMIN_SETTINGS_OPD}/`)
  );
}

export default function AdminSettingsPage() {
  const { pathname } = useLocation();
  const moduleLabel = resolveModuleLabel(pathname);
  const showOpdSettings = isOpdSettingsPath(pathname);

  return (
    <AdminLayout pageTitle="Settings">
      <div className="admin-page nwf-page">
        <AdminSettingsNav />

        {showOpdSettings ? (
          <AdminOpdSettingsPanel />
        ) : (
          <section className="nwf-panel">
            <div className="nwf-panel__header">
              <h2 className="admin-card__title">{moduleLabel} settings</h2>
            </div>
            <AdminEmptyState
              icon={<Construction size={28} strokeWidth={1.75} />}
              title="Under development"
              description={`${moduleLabel} business controls for the Admin Panel are coming soon.`}
            />
          </section>
        )}
      </div>
    </AdminLayout>
  );
}
