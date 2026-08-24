/**
 * Modal for adding to the approved amount on approved / partially approved claims.
 */

import { useEffect, useMemo, useState } from 'react';
import { Modal, Button } from '@/shared/components/common';
import { validateAddApprovedAmount } from '@/features/ipd/utils/claimStatusConstants';
import { formatCurrency } from '@/shared/utils/formatCurrency';

export default function UpdateApprovedAmountModal({
  open,
  claimedAmount = 0,
  currentApprovedAmount = 0,
  onClose,
  onConfirm,
}) {
  const [additionalAmount, setAdditionalAmount] = useState('');
  const [changeReason, setChangeReason] = useState('');
  const [error, setError] = useState('');

  const currentApproved = Number(currentApprovedAmount) || 0;
  const additionalNum = Number(additionalAmount);
  const nextApproved = useMemo(() => {
    if (Number.isNaN(additionalNum) || additionalNum <= 0) {
      return currentApproved;
    }
    return currentApproved + additionalNum;
  }, [additionalNum, currentApproved]);

  useEffect(() => {
    if (!open) return;
    setAdditionalAmount('');
    setChangeReason('');
    setError('');
  }, [open, currentApprovedAmount]);

  const handleClose = () => {
    setError('');
    onClose?.();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const validationError = validateAddApprovedAmount(
      claimedAmount,
      currentApproved,
      additionalAmount,
      changeReason,
    );
    if (validationError) {
      setError(validationError);
      return;
    }

    onConfirm?.({
      approvedAmount: nextApproved,
      changeReason: changeReason.trim(),
    });
    handleClose();
  };

  const showReason =
    !Number.isNaN(additionalNum) &&
    additionalNum > 0 &&
    nextApproved < Number(claimedAmount);

  return (
    <Modal
      isOpen={open}
      onClose={handleClose}
      title="Add Approved Amount"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" form="ipd-update-approved-form">
            Add
          </Button>
        </>
      }
    >
      <form id="ipd-update-approved-form" onSubmit={handleSubmit}>
        <p className="ipd-page__subtitle">
          Claimed amount: {formatCurrency(claimedAmount, { empty: '—' })}
        </p>
        <p className="ipd-page__subtitle" style={{ marginTop: '0.35rem' }}>
          Current approved amount: {formatCurrency(currentApproved, { empty: '—' })}
        </p>

        <div className="ipd-toolbar__field" style={{ marginTop: '1rem' }}>
          <label className="ipd-toolbar__label" htmlFor="ipd-add-approved-amt">
            Add Amount (₹)
          </label>
          <input
            id="ipd-add-approved-amt"
            className="ipd-input"
            value={additionalAmount}
            onChange={(e) => {
              setAdditionalAmount(e.target.value);
              setError('');
            }}
            inputMode="decimal"
            placeholder="e.g. 200"
            required
          />
        </div>

        {!Number.isNaN(additionalNum) && additionalNum > 0 ? (
          <p className="ipd-page__subtitle" style={{ marginTop: '0.75rem' }}>
            New approved amount:{' '}
            <strong>{formatCurrency(nextApproved, { empty: '—' })}</strong>
            {currentApproved > 0 ? (
              <>
                {' '}
                ({formatCurrency(currentApproved, { empty: '—' })} + {formatCurrency(additionalNum, { empty: '—' })})
              </>
            ) : null}
          </p>
        ) : null}

        {showReason ? (
          <div className="ipd-toolbar__field" style={{ marginTop: '1rem' }}>
            <label className="ipd-toolbar__label" htmlFor="ipd-update-approved-reason">
              Reason / Change Reason
            </label>
            <input
              id="ipd-update-approved-reason"
              className="ipd-input"
              value={changeReason}
              onChange={(e) => {
                setChangeReason(e.target.value);
                setError('');
              }}
              placeholder="e.g. ₹10,000 non-covered expenses"
              required
            />
          </div>
        ) : (
          <div className="ipd-toolbar__field" style={{ marginTop: '1rem' }}>
            <label className="ipd-toolbar__label" htmlFor="ipd-update-approved-reason-opt">
              Reason (optional)
            </label>
            <input
              id="ipd-update-approved-reason-opt"
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
