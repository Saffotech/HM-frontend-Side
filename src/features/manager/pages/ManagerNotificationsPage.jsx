/**
 * Manager notifications inbox page.
 */

import { useNavigate } from 'react-router-dom';
import AdminLayout from '@/features/manager/components/ManagerLayout';
import AdminNotificationsSection from '@/features/manager/components/ManagerNotificationsSection';
import { ROUTES } from '@/shared/constants';

export default function AdminNotificationsPage() {
  const navigate = useNavigate();

  const handleDeepLink = (n) => {
    switch (n?.reference_type) {
      case 'SCHEDULE':
        navigate(ROUTES.MANAGER_PROFILE, {
          state: { adminProfileTab: 'account' },
        });
        break;
      case 'USER':
        navigate(ROUTES.MANAGER_PROFILE);
        break;
      case 'ALERT':
      case 'PATIENT':
        navigate(ROUTES.MANAGER_DASHBOARD);
        break;
      case 'BILL':
        navigate(ROUTES.MANAGER_REPORTS);
        break;
      default:
        break;
    }
  };

  return (
    <AdminLayout pageTitle="Notifications">
      <AdminNotificationsSection onDeepLink={handleDeepLink} />
    </AdminLayout>
  );
}
