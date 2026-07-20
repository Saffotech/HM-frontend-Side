/**
 * Nurse Phase 2 by Atharva —
 * Full notifications inbox page with deep-links into nurse modules.
 */

import { useNavigate, generatePath } from 'react-router-dom';
import NurseLayout from '@/features/nurse/components/NurseLayout';
import NurseNotificationsSection from '@/features/nurse/components/NurseNotificationsSection';
import { ROUTES } from '@/shared/constants';

export default function NurseNotificationsPage() {
  const navigate = useNavigate();

  // Nurse Phase 2 by Atharva — deep-link by reference_type into alert / handover / profile
  const handleDeepLink = (n) => {
    const refId = n?.reference_id;
    switch (n?.reference_type) {
      case 'ALERT':
        if (refId != null && refId !== '' && Number(refId) !== 0) {
          navigate(generatePath(ROUTES.NURSE_ALERT_DETAIL, { alertId: String(refId) }));
        } else {
          navigate(ROUTES.NURSE_ALERTS);
        }
        break;
      case 'HANDOVER':
        if (refId != null && refId !== '' && Number(refId) !== 0) {
          navigate(generatePath(ROUTES.NURSE_HANDOVER_DETAIL, { id: String(refId) }));
        } else {
          navigate(ROUTES.NURSE_HANDOVER);
        }
        break;
      case 'SCHEDULE':
        // Nurse Phase 2 by Atharva — shift lives on Account tab
        navigate(ROUTES.NURSE_PROFILE, { state: { nurseProfileTab: 'account' } });
        break;
      case 'USER':
        navigate(ROUTES.NURSE_PROFILE);
        break;
      default:
        break;
    }
  };

  return (
    <NurseLayout>
      <NurseNotificationsSection onDeepLink={handleDeepLink} />
    </NurseLayout>
  );
}
