/**
 * Dedicated bed transfer page — opens the transfer modal, then returns to Beds.
 */

import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/shared/components/common';
import { ROUTES } from '@/shared/constants';
import IpdPageHeader from '@/features/ipd/components/IpdPageHeader';
import BedTransferModal from '@/features/ipd/components/BedTransferModal';
import useIpdBackNavigation from '@/features/ipd/hooks/useIpdBackNavigation';
import { useIpdPermissionSet } from '@/features/ipd/hooks/useIpdPermission';
import IpdPermissionButton from '@/features/ipd/components/IpdPermissionButton';

export default function IpdBedTransferPage() {
  const navigate = useNavigate();
  const goBack = useIpdBackNavigation(ROUTES.IPD_BEDS);
  const [searchParams] = useSearchParams();
  const { canTransferBed } = useIpdPermissionSet();
  const initialAdmissionId = searchParams.get('admissionId') || '';
  const [modalOpen, setModalOpen] = useState(true);

  const subtitle = useMemo(
    () =>
      initialAdmissionId
        ? `Transfer for admission #${initialAdmissionId}`
        : 'Move an admitted patient to another bed',
    [initialAdmissionId]
  );

  useEffect(() => {
    setModalOpen(true);
  }, [initialAdmissionId]);

  const goBackToBeds = () => {
    setModalOpen(false);
    goBack();
  };

  return (
    <div className="ipd-page">
      <IpdPageHeader
        title="Bed Transfer"
        subtitle={subtitle}
        actions={
          <>
            <Button type="button" variant="secondary" onClick={goBackToBeds}>
              Back to beds
            </Button>
            <IpdPermissionButton
              allowed={canTransferBed}
              type="button"
              className="btn btn--primary btn--md"
              onClick={() => setModalOpen(true)}
            >
              Open transfer
            </IpdPermissionButton>
          </>
        }
      />

      <BedTransferModal
        open={modalOpen}
        onClose={goBackToBeds}
        initialAdmissionId={initialAdmissionId}
      />
    </div>
  );
}
