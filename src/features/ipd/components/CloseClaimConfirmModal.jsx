/**
 * Confirmation dialog before manually closing an insurance claim.
 */

import { Modal, Button } from '@/shared/components/common';

export default function CloseClaimConfirmModal({ open, onClose, onConfirm }) {
  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title="Close Claim?"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={onConfirm}>
            Close Claim
          </Button>
        </>
      }
    >
      <p>Are you sure you want to close this claim?</p>
      <p className="ipd-page__subtitle" style={{ marginTop: '0.5rem' }}>
        Once closed, no further claim status changes will be allowed.
      </p>
    </Modal>
  );
}
