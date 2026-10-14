/**
 * Insurance claim + patient pay panel — isolated state so typing patient pay
 * does not re-render hospital charges / daily charges on the billing page.
 */

import { memo, useEffect, useState } from 'react';
import { Button } from '@/shared/components/common';
import { formatCurrency } from '@/shared/utils/formatCurrency';
import { useSaveIpdInsuranceClaimMutation } from '@/features/ipd/hooks/useIpdBillingQuery';
import { toast } from '@/shared/utils/toast';

function Fact({ label, value }) {
  return (
    <div className="ipd-claim-kv">
      <dt>{label}</dt>
      <dd>{value ?? '—'}</dd>
    </div>
  );
}

function money(n) {
  return formatCurrency(n, { empty: '—' });
}

function IpdInsuranceClaimBillingCard({
  claim,
  savedClaim,
  actualBill,
  patientId,
  insuranceAdmit,
  onClaimSaved,
}) {
  const saveClaimMutation = useSaveIpdInsuranceClaimMutation();
  const activeSavedClaim = savedClaim ?? claim;

  const [claimedInput, setClaimedInput] = useState(
    () =>
      claim?.claimed != null && claim.claimed !== '' ? String(claim.claimed) : '',
  );
  const [estimateInput, setEstimateInput] = useState(
    () =>
      claim?.estimateAmount != null && claim.estimateAmount !== ''
        ? String(claim.estimateAmount)
        : '',
  );
  const [patientPayInput, setPatientPayInput] = useState('');
  const [claimEditing, setClaimEditing] = useState(false);

  useEffect(() => {
    if (!claim) return;
    setClaimedInput(
      claim.claimed != null && claim.claimed !== '' ? String(claim.claimed) : '',
    );
    setEstimateInput(
      claim.estimateAmount != null && claim.estimateAmount !== ''
        ? String(claim.estimateAmount)
        : '',
    );
    setPatientPayInput('');
    setClaimEditing(false);
  }, [claim?.id]);

  const handleSaveClaimAmounts = () => {
    const claimed = Number(claimedInput) || 0;
    const estimateAmount = String(estimateInput).trim()
      ? Number(estimateInput)
      : 0;
    const addPay = String(patientPayInput).trim() ? Number(patientPayInput) : 0;

    if (Number.isNaN(claimed) || claimed < 0) {
      toast.error('Enter a valid claim amount');
      return;
    }
    if (Number.isNaN(estimateAmount) || estimateAmount < 0) {
      toast.error('Enter a valid estimate amount');
      return;
    }
    if (Number.isNaN(addPay) || addPay < 0) {
      toast.error('Enter a valid patient pay amount');
      return;
    }

    const patientPayment =
      addPay > 0
        ? {
            amount: addPay,
            paymentDate: new Date().toISOString().slice(0, 10),
            paymentMode: 'Cash',
            reference: '',
          }
        : undefined;

    saveClaimMutation.mutate(
      {
        claimId: claim.id,
        patch: {
          claimed,
          estimateAmount,
        },
        patientPayment,
        patientId,
        insuranceAdmit,
      },
      {
        onSuccess: (bundle) => {
          if (!bundle?.claim) {
            toast.error('Unable to save claim amounts');
            return;
          }
          onClaimSaved?.(bundle.claim);
          setPatientPayInput('');
          setClaimEditing(false);
          const totalPaid = Number(bundle.claim.patientPaid) || 0;
          toast.success(
            addPay > 0
              ? `Patient pay added · total ${money(totalPaid)}`
              : 'Insurance claim updated',
          );
        },
        onError: () => {
          toast.error(
            addPay > 0
              ? 'Unable to save claim or patient payment'
              : 'Unable to save claim amounts',
          );
        },
      },
    );
  };

  const estimateAmount = Number(estimateInput) || 0;
  const insuranceCovered = estimateAmount;
  const outstandingAmount = Math.max(0, actualBill - insuranceCovered);
  const patientPayable = Math.max(0, actualBill - estimateAmount);
  const alreadyPaid = Number(activeSavedClaim.patientPaid) || 0;
  const addPay = Number(patientPayInput) || 0;
  const patientPay = alreadyPaid + addPay;
  const patientPayOutstanding = Math.max(0, patientPayable - patientPay);
  const isSaving = saveClaimMutation.isPending;

  return (
    <div className="ipd-card">
      <div className="ipd-card__head">
        <h2 className="ipd-card__title">Insurance Claim</h2>
        {claimEditing ? (
          <Button
            type="button"
            size="sm"
            onClick={handleSaveClaimAmounts}
            disabled={isSaving}
          >
            {isSaving ? 'Saving…' : 'Save'}
          </Button>
        ) : (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => {
              setPatientPayInput('');
              setClaimEditing(true);
            }}
          >
            Update
          </Button>
        )}
      </div>
      <div className="ipd-card__body">
        <dl className="ipd-claim-facts">
          <div className="ipd-claim-kv">
            <dt>
              <label htmlFor="ipd-bill-claim-amount">Claim Amount</label>
            </dt>
            <dd>
              <input
                id="ipd-bill-claim-amount"
                className="ipd-input"
                value={claimedInput}
                onChange={(e) =>
                  setClaimedInput(e.target.value.replace(/[^\d.]/g, ''))
                }
                placeholder="0"
                inputMode="decimal"
                disabled={!claimEditing}
              />
            </dd>
          </div>
          <div className="ipd-claim-kv">
            <dt>
              <label htmlFor="ipd-bill-estimate-amount">Estimate Amount</label>
            </dt>
            <dd>
              <input
                id="ipd-bill-estimate-amount"
                className="ipd-input"
                value={estimateInput}
                onChange={(e) =>
                  setEstimateInput(e.target.value.replace(/[^\d.]/g, ''))
                }
                placeholder="0"
                inputMode="decimal"
                disabled={!claimEditing}
              />
            </dd>
          </div>
          <Fact label="Hospital Bill" value={money(actualBill)} />
          <Fact
            label="Insurance Covered"
            value={
              <span className="ipd-claim-amt--ok">{money(insuranceCovered)}</span>
            }
          />
          <Fact
            label="Outstanding Amount"
            value={
              <span className="ipd-claim-amt--due">{money(outstandingAmount)}</span>
            }
          />
        </dl>

        <p className="ipd-claim-section-label" style={{ marginTop: '0.85rem' }}>
          Patient Payable
        </p>
        <dl className="ipd-claim-facts">
          <Fact
            label="Paid so far"
            value={
              <span className="ipd-claim-amt--ok">{money(alreadyPaid)}</span>
            }
          />
          {claimEditing ? (
            <div className="ipd-claim-kv">
              <dt>
                <label htmlFor="ipd-bill-patient-pay">Add amount</label>
              </dt>
              <dd>
                <input
                  id="ipd-bill-patient-pay"
                  className="ipd-input"
                  value={patientPayInput}
                  onChange={(e) =>
                    setPatientPayInput(e.target.value.replace(/[^\d.]/g, ''))
                  }
                  placeholder="0"
                  inputMode="decimal"
                />
              </dd>
            </div>
          ) : null}
          <Fact
            label="Patient Pay Outstanding"
            value={
              <span
                className={
                  patientPayOutstanding > 0
                    ? 'ipd-claim-amt--due'
                    : 'ipd-claim-amt--ok'
                }
              >
                {money(patientPayOutstanding)}
              </span>
            }
          />
        </dl>
      </div>
    </div>
  );
}

export default memo(IpdInsuranceClaimBillingCard);
