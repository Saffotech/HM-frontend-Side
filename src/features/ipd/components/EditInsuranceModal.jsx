/**
 * Edit Insurance modal — company, policy, holder, relation, claimed, estimate.
 */

import { useEffect, useState } from 'react';
import { Modal, Button } from '@/shared/components/common';
import { currencyAmountLabel } from '@/shared/utils/formatCurrency';

function fromSeed(seed = {}) {
  const claimed = seed.claimed ?? seed.claimedAmount;
  return {
    insurer: seed.insurer ?? '',
    policyNo: seed.policyNo ?? '',
    policyHolder: seed.policyHolder ?? '',
    relationship: seed.relationship ?? '',
    claimedAmount: claimed != null && claimed !== '' ? String(claimed) : '',
    estimateAmount:
      seed.estimateAmount != null && seed.estimateAmount !== ''
        ? String(seed.estimateAmount)
        : '',
  };
}

export default function EditInsuranceModal({ open, onClose, initial, onSave }) {
  const [values, setValues] = useState(() => fromSeed(initial));
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setValues(fromSeed(initial));
    setError('');
    // Prefill once when the modal opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional open-only reset
  }, [open]);

  const set = (key, value) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setError('');
  };

  const handleClose = () => {
    setError('');
    onClose?.();
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!values.insurer.trim()) {
      setError('Insurance company is required');
      return;
    }
    if (!values.policyNo.trim()) {
      setError('Policy number is required');
      return;
    }
    if (!values.policyHolder.trim()) {
      setError('Policy holder is required');
      return;
    }
    if (!values.relationship.trim()) {
      setError('Relationship is required');
      return;
    }

    const claimed = Number(values.claimedAmount);
    if (Number.isNaN(claimed) || claimed <= 0) {
      setError('Enter a valid claimed amount');
      return;
    }

    let estimateAmount = null;
    if (String(values.estimateAmount || '').trim()) {
      estimateAmount = Number(values.estimateAmount);
      if (Number.isNaN(estimateAmount) || estimateAmount < 0) {
        setError('Enter a valid estimate amount');
        return;
      }
    }

    try {
      await onSave?.({
        insurer: values.insurer.trim(),
        policyNo: values.policyNo.trim(),
        policyHolder: values.policyHolder.trim(),
        relationship: values.relationship.trim(),
        claimed,
        claimedAmount: claimed,
        estimateAmount,
      });
      handleClose();
    } catch {
      // Parent surfaces API errors
    }
  };

  return (
    <Modal
      isOpen={open}
      onClose={handleClose}
      title="Edit Insurance"
      size="md"
      panelClassName="ipd-ins-pay-modal"
      footer={
        <div className="ipd-xfer-modal__actions">
          <Button type="submit" form="ipd-edit-ins-form">
            Save Changes
          </Button>
        </div>
      }
    >
      <form
        id="ipd-edit-ins-form"
        className="ipd-modal-form"
        onSubmit={onSubmit}
      >
        <div className="ipd-form-grid ipd-ins-pay-modal__grid">
          <div className="ipd-toolbar__field">
            <label className="ipd-toolbar__label" htmlFor="ipd-edit-insurer">
              Insurance Company
            </label>
            <input
              id="ipd-edit-insurer"
              className="ipd-input"
              value={values.insurer}
              onChange={(e) => set('insurer', e.target.value)}
            />
          </div>

          <div className="ipd-toolbar__field">
            <label className="ipd-toolbar__label" htmlFor="ipd-edit-policy">
              Policy Number
            </label>
            <input
              id="ipd-edit-policy"
              className="ipd-input"
              value={values.policyNo}
              onChange={(e) => set('policyNo', e.target.value)}
            />
          </div>

          <div className="ipd-toolbar__field">
            <label className="ipd-toolbar__label" htmlFor="ipd-edit-holder">
              Policy Holder
            </label>
            <input
              id="ipd-edit-holder"
              className="ipd-input"
              value={values.policyHolder}
              onChange={(e) => set('policyHolder', e.target.value)}
            />
          </div>

          <div className="ipd-toolbar__field">
            <label className="ipd-toolbar__label" htmlFor="ipd-edit-relation">
              Relationship
            </label>
            <input
              id="ipd-edit-relation"
              className="ipd-input"
              value={values.relationship}
              onChange={(e) => set('relationship', e.target.value)}
            />
          </div>

          <div className="ipd-toolbar__field">
            <label className="ipd-toolbar__label" htmlFor="ipd-edit-claimed">
              {currencyAmountLabel('Claimed Amount')}
            </label>
            <input
              id="ipd-edit-claimed"
              className="ipd-input"
              value={values.claimedAmount}
              onChange={(e) =>
                set('claimedAmount', e.target.value.replace(/[^\d.]/g, ''))
              }
              inputMode="decimal"
            />
          </div>

          <div className="ipd-toolbar__field">
            <label className="ipd-toolbar__label" htmlFor="ipd-edit-estimate">
              {`${currencyAmountLabel('Estimate Amount')} (optional)`}
            </label>
            <input
              id="ipd-edit-estimate"
              className="ipd-input"
              value={values.estimateAmount}
              onChange={(e) =>
                set('estimateAmount', e.target.value.replace(/[^\d.]/g, ''))
              }
              inputMode="decimal"
              placeholder="Optional"
            />
          </div>
        </div>

        {error ? (
          <p
            className="ipd-field-error"
            role="alert"
            style={{ marginTop: '0.65rem' }}
          >
            {error}
          </p>
        ) : null}
      </form>
    </Modal>
  );
}
