/**
 * Pharmacist notifications inbox — live /pharmacy/notifications APIs.
 */

import { useNavigate, generatePath } from 'react-router-dom';
import PharmacyLayout from '@/features/pharmacy/components/PharmacyLayout';
import PharmacyNotificationsSection from '@/features/pharmacy/components/PharmacyNotificationsSection';
import { ROUTES } from '@/shared/constants';

export default function PharmacistNotificationsPage() {
  const navigate = useNavigate();

  const handleDeepLink = (n) => {
    const refId = n?.reference_id;
    switch (n?.reference_type) {
      case 'PRESCRIPTION':
        if (refId != null && refId !== '' && Number(refId) !== 0) {
          navigate(
            generatePath(ROUTES.PHARMACY_PRESCRIPTION_DETAIL, { id: String(refId) })
          );
        } else {
          navigate(ROUTES.PHARMACY_PRESCRIPTIONS);
        }
        break;
      case 'SCHEDULE':
        navigate(ROUTES.PHARMACY_PROFILE, {
          state: { pharmacistProfileTab: 'account' },
        });
        break;
      case 'USER':
        navigate(ROUTES.PHARMACY_PROFILE);
        break;
      default:
        break;
    }
  };

  return (
    <PharmacyLayout pageTitle="Notifications">
      <PharmacyNotificationsSection onDeepLink={handleDeepLink} />
    </PharmacyLayout>
  );
}
