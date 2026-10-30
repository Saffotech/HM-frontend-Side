/**
 * Manager notifications inbox page.
 */

import ManagerLayout from '@/features/manager/components/ManagerLayout';
import ManagerNotificationsSection from '@/features/manager/components/ManagerNotificationsSection';

/* Legacy identifier preserved: AdminNotificationsPage. Active name: ManagerNotificationsPage. */
export default function ManagerNotificationsPage() {
  return (
    <ManagerLayout pageTitle="Notifications">
      <ManagerNotificationsSection />
    </ManagerLayout>
  );
}
