/**
 * Lab technician notifications inbox — live /lab/notifications APIs.
 */

import LabLayout from '@/features/lab/components/LabLayout';
import LabNotificationsSection from '@/features/lab/components/LabNotificationsSection';

export default function LabNotificationsPage() {
  return (
    <LabLayout pageTitle="Notifications">
      <LabNotificationsSection />
    </LabLayout>
  );
}
