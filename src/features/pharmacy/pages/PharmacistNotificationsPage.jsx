/**
 * Pharmacist notifications inbox — live /pharmacy/notifications APIs.
 */

import PharmacyLayout from '@/features/pharmacy/components/PharmacyLayout';
import PharmacyNotificationsSection from '@/features/pharmacy/components/PharmacyNotificationsSection';

export default function PharmacistNotificationsPage() {
  return (
    <PharmacyLayout pageTitle="Notifications">
      <PharmacyNotificationsSection />
    </PharmacyLayout>
  );
}
