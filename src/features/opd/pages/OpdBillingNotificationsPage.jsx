/**
 * OPD Billing notifications inbox page.
 */

import { useNavigate } from 'react-router-dom';
import OpdNotificationsSection from '@/features/opd/components/OpdNotificationsSection';
import { ROUTES } from '@/shared/constants';

export default function OpdBillingNotificationsPage() {
  const navigate = useNavigate();

  const handleDeepLink = (n) => {
    switch (n?.reference_type) {
      case 'SCHEDULE':
        navigate(ROUTES.OPD_PROFILE, {
          state: { opdProfileTab: 'account' },
        });
        break;
      case 'USER':
        navigate(ROUTES.OPD_PROFILE);
        break;
      case 'BILL':
        if (n?.reference_id) {
          navigate(ROUTES.BILLING_VIEW.replace(':id', String(n.reference_id)));
        }
        break;
      case 'APPOINTMENT':
        navigate(ROUTES.APPOINTMENTS);
        break;
      default:
        break;
    }
  };

  return <OpdNotificationsSection onDeepLink={handleDeepLink} />;
}
