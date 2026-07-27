/**
 * Receptionist notifications inbox against live /receptionist/notifications APIs.
 * Deep-links only to Profile (SCHEDULE / USER) per the July 2026 guide.
 */

import { useNavigate } from 'react-router-dom';
import ReceptionistNotificationsSection from '@/features/receptionist/components/ReceptionistNotificationsSection';
import { ROUTES } from '@/shared/constants';

export default function ReceptionistNotificationsPage() {
  const navigate = useNavigate();

  const handleDeepLink = (n) => {
    switch (n?.reference_type) {
      case 'SCHEDULE':
        navigate(ROUTES.RECEPTIONIST_PROFILE, {
          state: { receptionistProfileTab: 'account' },
        });
        break;
      case 'USER':
        navigate(ROUTES.RECEPTIONIST_PROFILE);
        break;
      default:
        break;
    }
  };

  return <ReceptionistNotificationsSection onDeepLink={handleDeepLink} />;
}
