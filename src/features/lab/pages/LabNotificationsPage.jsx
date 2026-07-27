/**
 * Lab technician notifications inbox — live /lab/notifications APIs.
 */

import { useNavigate, generatePath } from 'react-router-dom';
import LabLayout from '@/features/lab/components/LabLayout';
import LabNotificationsSection from '@/features/lab/components/LabNotificationsSection';
import { ROUTES } from '@/shared/constants';

export default function LabNotificationsPage() {
  const navigate = useNavigate();

  const handleDeepLink = (n) => {
    const refId = n?.reference_id;
    switch (n?.reference_type) {
      case 'LAB_ORDER':
        if (refId != null && refId !== '' && Number(refId) !== 0) {
          navigate(generatePath(ROUTES.LAB_ORDER_UPLOAD, { id: String(refId) }));
        } else {
          navigate(ROUTES.LAB_ORDERS);
        }
        break;
      case 'SCHEDULE':
        navigate(ROUTES.LAB_PROFILE, { state: { labProfileTab: 'account' } });
        break;
      case 'USER':
        navigate(ROUTES.LAB_PROFILE);
        break;
      default:
        break;
    }
  };

  return (
    <LabLayout pageTitle="Notifications">
      <LabNotificationsSection onDeepLink={handleDeepLink} />
    </LabLayout>
  );
}
