/**
 * Hospital Admin notifications inbox page.
 */

import { useNavigate } from 'react-router-dom';
import AdminLayout from '@/features/admin/components/AdminLayout';
import AdminNotificationsSection from '@/features/admin/components/AdminNotificationsSection';
import { ROUTES } from '@/shared/constants';

export default function AdminNotificationsPage() {
  const navigate = useNavigate();

  const handleDeepLink = (n) => {
    switch (n?.reference_type) {
      case 'SCHEDULE':
        navigate(ROUTES.ADMIN_PROFILE, {
          state: { adminProfileTab: 'account' },
        });
        break;
      case 'USER':
        navigate(ROUTES.ADMIN_PROFILE);
        break;
      case 'ALERT':
      case 'PATIENT':
        navigate(ROUTES.ADMIN_DASHBOARD);
        break;
      case 'BILL':
        navigate(ROUTES.ADMIN_REPORTS);
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
