/**
 * Nurse Phase 2 by Atharva —
 * Full notifications inbox page with deep-links into nurse modules.
 */

import NurseLayout from '@/features/nurse/components/NurseLayout';
import NurseNotificationsSection from '@/features/nurse/components/NurseNotificationsSection';

export default function NurseNotificationsPage() {
  return (
    <NurseLayout>
      <NurseNotificationsSection />
    </NurseLayout>
  );
}
