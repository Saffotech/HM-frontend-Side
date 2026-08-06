/**
 * Discharge entry — select admission context + wizard.
 */

import { useParams } from 'react-router-dom';
import { EmptyState } from '@/shared/components/common';
import IpdPageHeader from '@/features/ipd/components/IpdPageHeader';
import DischargeWizard from '@/features/ipd/components/DischargeWizard';

export default function IpdDischargePage() {
  const { admissionId } = useParams();

  return (
    <div className="ipd-page">
      <IpdPageHeader
        title="Discharge"
        subtitle="Review stay, settle charges, and close the admission"
      />

      {!admissionId ? (
        <div className="ipd-card">
          <div className="ipd-card__body">
            <EmptyState
              title="Select an admission to discharge"
              description="Open Discharge from the IPD patient list, or navigate to /ipd/discharge/:admissionId."
            />
          </div>
        </div>
      ) : (
        <DischargeWizard admissionId={admissionId} />
      )}
    </div>
  );
}
