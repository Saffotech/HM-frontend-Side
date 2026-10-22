/**
 * Insurance claim + patient pay panel — isolated state so typing patient pay
 * does not re-render hospital charges / daily charges on the billing page.
 */

import { memo, useEffect, useRef, useState } from 'react';
import { Button } from '@/shared/components/common';
import { formatCurrency } from '@/shared/utils/formatCurrency';
import { resolveAdmissionIdFromBillingContext } from '@/features/ipd/billing/ipdBillingMapper';
import { useSaveIpdInsuranceClaimMutation } from '@/features/ipd/hooks/useIpdBillingQuery';
import { useIpdBillPreviewQuery } from '@/features/ipd/hooks/useIpdQuery';
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

const PATIENT_PAY_MODES = ['Cash', 'Card', 'UPI'];

/** Insurance cover: approved, otherwise estimate, otherwise claim amount. */
function insuranceCoverAmount(approved, estimateInput, claimedInput) {
  const appr = Number(approved);
  if (Number.isFinite(appr) && appr > 0) return appr;
  const estimate = Number(estimateInput);
  if (Number.isFinite(estimate) && estimate > 0) return estimate;
  const claimed = Number(claimedInput);
  return Number.isFinite(claimed) && claimed > 0 ? claimed : 0;
}

/** What the patient still owes after insurance and payments already saved. */
function patientOwes(hospitalBill, insuranceCover, alreadyPaid) {
  return Math.max(
    0,
    (Number(hospitalBill) || 0) -
      (Number(insuranceCover) || 0) -
      (Number(alreadyPaid) || 0),
  );
}

/** GST on the hospital bill. Percent 0 means no tax. */
function gstAmountOnBill(hospitalBill, gstPercent) {
  const bill = Number(hospitalBill) || 0;
  const pct = Number(gstPercent) || 0;
  if (bill <= 0 || pct <= 0) return 0;
  return Math.round(((bill * pct) / 100) * 100) / 100;
}

function billWithGst(hospitalBill, gstPercent) {
  return (Number(hospitalBill) || 0) + gstAmountOnBill(hospitalBill, gstPercent);
}

/** Hospital GST rate. Zero is a valid rate. */
function automaticGstPercent(previewPercent) {
  const n = Number(previewPercent);
  if (Number.isFinite(n) && n >= 0 && n <= 100) return n;
  return 0;
}

function gstPercentLabel(gstPercent) {
  const n = Number(gstPercent) || 0;
  const shown = Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100);
  return `GST (${shown}%)`;
}

function IpdInsuranceClaimBillingCard({
  claim,
  savedClaim,
  actualBill,
  patientId,
  insuranceAdmit,
  onClaimSaved,
  readOnly = false,
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
  const [patientPayMode, setPatientPayMode] = useState('Cash');
  const [patientPayReference, setPatientPayReference] = useState('');
  const [claimEditing, setClaimEditing] = useState(false);
  const admissionId = resolveAdmissionIdFromBillingContext({
    claim,
    insuranceAdmit,
  });
  const previewQuery = useIpdBillPreviewQuery(admissionId);
  const gstPercent = automaticGstPercent(previewQuery.data?.gst_percent);
  const claimRef = useRef(claim);
  claimRef.current = claim;

  useEffect(() => {
    const current = claimRef.current;
    if (!current) return;
    setClaimedInput(
      current.claimed != null && current.claimed !== '' ? String(current.claimed) : '',
    );
    setEstimateInput(
      current.estimateAmount != null && current.estimateAmount !== ''
        ? String(current.estimateAmount)
        : '',
    );
    setClaimEditing(false);
  }, [claim?.id]);

  const handleSaveClaimAmounts = () => {
    const claimed = Number(claimedInput) || 0;
    const estimateAmount = String(estimateInput).trim()
      ? Number(estimateInput)
      : 0;
    const addPay = String(patientPayInput).trim() ? Number(patientPayInput) : 0;
    const maxPatientPay = patientOwes(
      billWithGst(actualBill, gstPercent),
      insuranceCoverAmount(activeSavedClaim?.approved, estimateAmount, claimed),
      activeSavedClaim?.patientPaid,
    );

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
    if (addPay > maxPatientPay) {
      toast.error(`Patient pay cannot be more than ${money(maxPatientPay)}`);
      return;
    }
    const payMode = PATIENT_PAY_MODES.includes(patientPayMode) ? patientPayMode : 'Cash';
    const payReference = patientPayReference.trim();
    if (addPay > 0 && (payMode === 'Card' || payMode === 'UPI') && !payReference) {
      toast.error(
        payMode === 'UPI'
          ? 'Enter the UPI reference for this online payment'
          : 'Enter the card reference for this payment',
      );
      return;
    }

    const paidOn = new Date().toISOString().slice(0, 10);
    const patientPayment =
      addPay > 0
        ? {
            amount: addPay,
            paidAt: paidOn,
            paymentDate: paidOn,
            mode: payMode,
            paymentMode: payMode,
            reference: payReference,
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
          setPatientPayMode('Cash');
          setPatientPayReference('');
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

  const useBackend = !claimEditing && activeSavedClaim?.patient_balance != null;
  const insuranceCovered = useBackend
    ? Number(activeSavedClaim.insurance_share) || 0
    : insuranceCoverAmount(activeSavedClaim?.approved, estimateInput, claimedInput);
  const gstAmount = gstAmountOnBill(actualBill, gstPercent);
  const finalAmount = (Number(actualBill) || 0) + gstAmount;
  const insuranceRemaining = Math.max(0, insuranceCovered - finalAmount);
  const alreadyPaid = Number(activeSavedClaim?.patientPaid) || 0;
  const outstandingAmount = useBackend
    ? Number(activeSavedClaim.patient_balance) || 0
    : patientOwes(finalAmount, insuranceCovered, alreadyPaid);
  const addPay = claimEditing ? Number(patientPayInput) || 0 : 0;
  const patientPayOutstanding = Math.max(0, outstandingAmount - addPay);
  const isSaving = saveClaimMutation.isPending;

  return (
    <div className="ipd-card">
      <div className="ipd-card__head">
        <h2 className="ipd-card__title">Insurance Claim</h2>
        {claimEditing && !readOnly ? (
          <Button
            type="button"
            size="sm"
            onClick={handleSaveClaimAmounts}
            disabled={isSaving}
          >
            {isSaving ? 'Saving…' : 'Save'}
          </Button>
        ) : !readOnly ? (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => {
              setPatientPayInput((current) => {
                if (String(current).trim() !== '') return current;
                const maxPatientPay = patientOwes(
                  billWithGst(actualBill, gstPercent),
                  insuranceCoverAmount(activeSavedClaim?.approved, estimateInput, claimedInput),
                  activeSavedClaim?.patientPaid,
                );
                return String(maxPatientPay);
              });
              setClaimEditing(true);
            }}
          >
            Update
          </Button>
        ): null}
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
                disabled={!claimEditing || readOnly}
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
                disabled={!claimEditing || readOnly}
              />
            </dd>
          </div>
          <Fact label="Hospital Bill" value={money(actualBill)} />
          <Fact label={gstPercentLabel(gstPercent)} value={money(gstAmount)} />
          <Fact label="Final amount" value={money(finalAmount)} />
          <Fact
            label="Insurance Covered"
            value={
              <span className="ipd-claim-amt--ok">{money(insuranceCovered)}</span>
            }
          />
          <Fact
            label="Insurance Remaining"
            value={
              <span className={insuranceRemaining > 0 ? 'ipd-claim-amt--ok' : undefined}>
                {money(insuranceRemaining)}
              </span>
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
                  onChange={(e) => {
                    const raw = e.target.value.replace(/[^\d.]/g, '');
                    if (raw === '') {
                      setPatientPayInput('');
                      return;
                    }
                    const maxPatientPay = patientOwes(
                      billWithGst(actualBill, gstPercent),
                      insuranceCoverAmount(activeSavedClaim?.approved, estimateInput, claimedInput),
                      activeSavedClaim?.patientPaid,
                    );
                    const next = Number(raw);
                    setPatientPayInput(
                      !Number.isNaN(next) && next > maxPatientPay
                        ? String(maxPatientPay)
                        : raw,
                    );
                  }}
                  inputMode="decimal"
                />
              </dd>
            </div>
          ) : null}
          {claimEditing ? (
            <div className="ipd-claim-kv">
              <dt>
                <label htmlFor="ipd-bill-patient-pay-mode">Pay by</label>
              </dt>
              <dd>
                <select
                  id="ipd-bill-patient-pay-mode"
                  className="ipd-input"
                  value={patientPayMode}
                  onChange={(e) => setPatientPayMode(e.target.value)}
                >
                  {PATIENT_PAY_MODES.map((mode) => (
                    <option key={mode} value={mode}>
                      {mode === 'UPI' ? 'UPI (online)' : mode === 'Card' ? 'Card' : 'Cash'}
                    </option>
                  ))}
                </select>
              </dd>
            </div>
          ) : null}
          {claimEditing && (patientPayMode === 'Card' || patientPayMode === 'UPI') ? (
            <div className="ipd-claim-kv">
              <dt>
                <label htmlFor="ipd-bill-patient-pay-ref">
                  {patientPayMode === 'UPI' ? 'UPI reference' : 'Card reference'}
                </label>
              </dt>
              <dd>
                <input
                  id="ipd-bill-patient-pay-ref"
                  className="ipd-input"
                  value={patientPayReference}
                  onChange={(e) => setPatientPayReference(e.target.value)}
                  placeholder={patientPayMode === 'UPI' ? 'UPI transaction id' : 'Card transaction id'}
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
