/**
 * Dedicated bed transfer page — live transfer modal.
 */

import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button, EmptyState } from '@/shared/components/common';
import { ROUTES } from '@/shared/constants';
import IpdPageHeader from '@/features/ipd/components/IpdPageHeader';
import BedTransferModal from '@/features/ipd/components/BedTransferModal';
import { useIpdPermissionSet } from '@/features/ipd/hooks/useIpdPermission';
import IpdPermissionButton from '@/features/ipd/components/IpdPermissionButton';

export default function IpdBedTransferPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { canTransferBed } = useIpdPermissionSet();
  const initialAdmissionId = searchParams.get('admissionId') || '';
  const [modalOpen, setModalOpen] = useState(Boolean(initialAdmissionId));

  const subtitle = useMemo(
    () =>
      initialAdmissionId
        ? `Transfer for admission #${initialAdmissionId}`
        : 'Move an admitted patient to another bed',
    [initialAdmissionId]
  );

  return (
    <div className="ipd-page">
      <IpdPageHeader
        title="Bed Transfer"
        subtitle={subtitle}
        actions={
          <>
            <Button type="button" variant="secondary" onClick={() => navigate(ROUTES.IPD_BEDS)}>
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

      <div className="ipd-card">
        <div className="ipd-card__body">
          <EmptyState
            title="Transfer a patient"
            description="Choose an admitted patient and an available bed, then confirm the transfer."
            actionLabel="Open transfer"
            onAction={() => setModalOpen(true)}
          />
        </div>
      </div>

      <BedTransferModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        initialAdmissionId={initialAdmissionId}
      />
    </div>
  );
}
