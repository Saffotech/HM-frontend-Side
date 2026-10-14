/**
 * Modal for Approve / Partially Approve / Reject claim actions.
 */

import { useEffect, useState } from 'react';
import { Modal, Button } from '@/shared/components/common';
import {
  CLAIM_STATUS,
  validateApproveTransition,
  validatePartiallyApprovedTransition,
  validateRejectTransition,
} from '@/features/ipd/utils/claimStatusConstants';
import { formatCurrency, currencyAmountLabel } from '@/shared/utils/formatCurrency';

const ACTION_META = {
  approve: {
    title: 'Approve Claim',
    confirmLabel: 'Approve',
    targetStatus: CLAIM_STATUS.APPROVED,
    requireApproved: true,
    requireReason: false,
  },
  partially_approve: {
    title: 'Partially Approve Claim',
    confirmLabel: 'Partially Approve',
    targetStatus: CLAIM_STATUS.PARTIALLY_APPROVED,
    requireApproved: true,
    requireReason: true,
  },
  reject: {
    title: 'Reject Claim',
    confirmLabel: 'Reject',
    targetStatus: CLAIM_STATUS.REJECTED,
    requireApproved: false,
    requireReason: true,
  },
};

export default function ClaimStatusActionModal({
  open,
  actionType,
  claimedAmount = 0,
  onClose,
  onConfirm,
}) {
  const meta = ACTION_META[actionType] ?? ACTION_META.approve;
  const [approvedAmount, setApprovedAmount] = useState('');
  const [changeReason, setChangeReason] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    const claimed = Number(claimedAmount) || 0;
    setApprovedAmount(
      actionType === 'approve' && claimed > 0 ? String(claimed) : '',
    );
    setChangeReason('');
    setError('');
  }, [open, actionType, claimedAmount]);

  const handleClose = () => {
    setError('');
    onClose?.();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    let validationError = null;
    if (actionType === 'approve') {
      validationError = validateApproveTransition(claimedAmount, approvedAmount);
    } else if (actionType === 'partially_approve') {
      validationError = validatePartiallyApprovedTransition(
        claimedAmount,
        approvedAmount,
        changeReason,
      );
    } else if (actionType === 'reject') {
      validationError = validateRejectTransition(changeReason);
    }
    if (validationError) {
      setError(validationError);
      return;
    }

    onConfirm?.({
      status: meta.targetStatus,
      claimedAmount: Number(claimedAmount) || 0,
      approvedAmount:
        actionType === 'reject' ? 0 : Number(approvedAmount) || 0,
      changeReason: changeReason.trim(),
    });
    handleClose();
  };

  return (
    <Modal
      isOpen={open}
      onClose={handleClose}
      title={meta.title}
      footer={
        <>
          <Button type="button" variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" form="ipd-claim-status-action-form">
            {meta.confirmLabel}
          </Button>
        </>
      }
    >
      <form id="ipd-claim-status-action-form" onSubmit={handleSubmit}>
        <p className="ipd-page__subtitle">
          Claimed amount: {formatCurrency(claimedAmount, { empty: '—' })}
        </p>

        {meta.requireApproved ? (
          <div className="ipd-toolbar__field" style={{ marginTop: '1rem' }}>
            <label className="ipd-toolbar__label" htmlFor="ipd-claim-action-approved">
              {currencyAmountLabel('Approved Amount')}
            </label>
            <input
              id="ipd-claim-action-approved"
              className="ipd-input"
              value={approvedAmount}
              onChange={(e) => {
                setApprovedAmount(e.target.value);
                setError('');
              }}
              inputMode="decimal"
              required
            />
          </div>
        ) : null}

        {meta.requireReason ? (
          <div className="ipd-toolbar__field" style={{ marginTop: '1rem' }}>
            <label className="ipd-toolbar__label" htmlFor="ipd-claim-action-reason">
              {actionType === 'reject' ? 'Rejection Reason' : 'Reason / Change Reason'}
            </label>
            <input
              id="ipd-claim-action-reason"
              className="ipd-input"
              value={changeReason}
              onChange={(e) => {
                setChangeReason(e.target.value);
                setError('');
              }}
              placeholder={
                actionType === 'reject'
                  ? 'e.g. Treatment not covered by policy'
                  : `e.g. ${formatCurrency(25000)} non-covered expenses`
              }
              required
            />
          </div>
        ) : (
          <div className="ipd-toolbar__field" style={{ marginTop: '1rem' }}>
            <label className="ipd-toolbar__label" htmlFor="ipd-claim-action-reason-opt">
              Reason (optional)
            </label>
            <input
              id="ipd-claim-action-reason-opt"
              className="ipd-input"
              value={changeReason}
              onChange={(e) => setChangeReason(e.target.value)}
              placeholder="Optional note"
            />
          </div>
        )}

        {error ? (
          <p className="ipd-form-error" role="alert" style={{ marginTop: '0.75rem' }}>
            {error}
          </p>
        ) : null}
      </form>
    </Modal>
  );
}
