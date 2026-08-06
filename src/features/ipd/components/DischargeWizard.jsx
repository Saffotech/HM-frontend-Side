/**
 * Multi-step discharge wizard — live preview, pay, and discharge APIs.
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, EmptyState, QueryFeedback } from '@/shared/components/common';
import { PAYMENT_MODES, ROUTES } from '@/shared/constants';
import { toast } from '@/shared/utils/toast';
import { IPD_DISCHARGE_STEPS } from '@/features/ipd/utils/constants';
import { cn } from '@/features/ipd/utils/cn';
import ChargeTable from '@/features/ipd/components/ChargeTable';
import BillSummary from '@/features/ipd/components/BillSummary';
import { useIpdPermissionSet } from '@/features/ipd/hooks/useIpdPermission';
import IpdPermissionButton from '@/features/ipd/components/IpdPermissionButton';
import {
  useCompleteIpdDischargeMutation,
  useGenerateIpdBillMutation,
  useIpdAdmissionDetailQuery,
  useIpdBillPreviewQuery,
  usePayIpdBillMutation,
} from '@/features/ipd/hooks/useIpdQuery';
import {
  formatIpdDateTime,
  formatIpdMoney,
} from '@/features/ipd/utils/ipdFormat';

export default function DischargeWizard({ admissionId }) {
  const navigate = useNavigate();
  const { canDischarge, canPayBill, canGenerateBill } = useIpdPermissionSet();
  const [stepIndex, setStepIndex] = useState(0);
  const [payMode, setPayMode] = useState('Cash');
  const [payAmount, setPayAmount] = useState('');
  const [force, setForce] = useState(false);
  const [notes, setNotes] = useState('');

  const detailQuery = useIpdAdmissionDetailQuery(admissionId);
  const previewQuery = useIpdBillPreviewQuery(admissionId);
  const generateMutation = useGenerateIpdBillMutation();
  const payMutation = usePayIpdBillMutation();
  const dischargeMutation = useCompleteIpdDischargeMutation();

  const admission = detailQuery.data?.admission;
  const preview = previewQuery.data;
  const openBill = (detailQuery.data?.bills ?? []).find(
    (bill) =>
      bill.status !== 'void' &&
      Number(bill.balance_due ?? 0) > 0.01
  );

  useEffect(() => {
    if (openBill?.balance_due != null && !payAmount) {
      setPayAmount(String(openBill.balance_due));
    }
  }, [openBill?.id, openBill?.balance_due, payAmount]);

  const step = IPD_DISCHARGE_STEPS[stepIndex];
  const goNext = () => setStepIndex((i) => Math.min(i + 1, IPD_DISCHARGE_STEPS.length - 1));
  const goBack = () => setStepIndex((i) => Math.max(i - 1, 0));

  const ensureBill = async () => {
    if (openBill) return openBill;
    if (!canGenerateBill) {
      throw new Error('No open bill and you cannot generate one');
    }
    return generateMutation.mutateAsync({
      admission_id: Number(admissionId),
      pay_later: true,
    });
  };

  const onCollect = async () => {
    try {
      const bill = await ensureBill();
      const amount = Number(payAmount || bill.balance_due || preview?.grand_total || 0);
      if (!(amount > 0)) {
        toast.error('Enter a valid payment amount');
        return;
      }
      await payMutation.mutateAsync({
        billId: bill.id,
        payload: {
          amount,
          payment_mode: payMode.toLowerCase(),
        },
      });
      toast.success('Payment recorded');
      await detailQuery.refetch();
      goNext();
    } catch (err) {
      toast.error(err?.message || 'Payment failed');
    }
  };

  const onConfirmDischarge = async () => {
    try {
      const result = await dischargeMutation.mutateAsync({
        admissionId,
        payload: { force, notes: notes.trim() || null },
      });
      toast.success(result?.message || 'Patient discharged');
      navigate(ROUTES.IPD_PATIENTS);
    } catch (err) {
      toast.error(err?.message || 'Discharge failed');
    }
  };

  if (!admissionId) {
    return (
      <EmptyState
        title="Select an admission to discharge"
        description="Open Discharge from the IPD patient list with an admission ID."
      />
    );
  }

  if (detailQuery.isError) {
    return <QueryFeedback isError error={detailQuery.error} onRetry={detailQuery.refetch} />;
  }

  return (
    <div className="ipd-section-stack">
      <div className="ipd-wizard-steps" role="list" aria-label="Discharge steps">
        {IPD_DISCHARGE_STEPS.map((s, index) => (
          <div
            key={s.id}
            role="listitem"
            className={cn(
              'ipd-wizard-step',
              index === stepIndex && 'ipd-wizard-step--active',
              index < stepIndex && 'ipd-wizard-step--done'
            )}
          >
            <span className="ipd-wizard-step__num">{index + 1}</span>
            <span className="ipd-wizard-step__label">{s.label}</span>
          </div>
        ))}
      </div>

      <div className="ipd-card">
        <div className="ipd-card__head">
          <h2 className="ipd-card__title">{step.label}</h2>
          {admission ? (
            <span className="ipd-page__subtitle">
              {admission.admission_no} · {admission.patient_name}
            </span>
          ) : (
            <span className="ipd-page__subtitle">Admission #{admissionId}</span>
          )}
        </div>
        <div className="ipd-card__body">
          {detailQuery.isLoading || previewQuery.isLoading ? (
            <div style={{ display: 'grid', gap: '0.5rem' }}>
              <div className="ipd-skeleton" />
              <div className="ipd-skeleton" />
            </div>
          ) : null}

          {step.id === 'review_stay' && admission ? (
            <div className="ipd-kv">
              <span className="ipd-kv__label">Patient</span>
              <span className="ipd-kv__value">{admission.patient_name}</span>
              <span className="ipd-kv__label">Ward / Bed</span>
              <span className="ipd-kv__value">
                {admission.ward_name} / {admission.bed_number}
              </span>
              <span className="ipd-kv__label">Doctor</span>
              <span className="ipd-kv__value">{admission.doctor_name || '—'}</span>
              <span className="ipd-kv__label">Admitted</span>
              <span className="ipd-kv__value">{formatIpdDateTime(admission.admitted_at)}</span>
              <span className="ipd-kv__label">Length of stay</span>
              <span className="ipd-kv__value">
                {admission.length_of_stay_days != null
                  ? `${admission.length_of_stay_days} day(s)`
                  : '—'}
              </span>
              <span className="ipd-kv__label">Diagnosis</span>
              <span className="ipd-kv__value">{admission.diagnosis || '—'}</span>
            </div>
          ) : null}

          {step.id === 'review_charges' ? (
            <>
              <ChargeTable rows={preview?.items ?? []} />
              <BillSummary
                subtotal={formatIpdMoney(preview?.subtotal)}
                tax={formatIpdMoney(preview?.gst_amount)}
                total={formatIpdMoney(preview?.grand_total)}
                paid={openBill ? formatIpdMoney(openBill.paid_amount) : null}
                balance={openBill ? formatIpdMoney(openBill.balance_due) : null}
              />
            </>
          ) : null}

          {step.id === 'payment' ? (
            <div className="ipd-form-grid">
              <div className="ipd-toolbar__field">
                <label className="ipd-toolbar__label" htmlFor="ipd-dis-pay-mode">
                  Payment mode
                </label>
                <select
                  id="ipd-dis-pay-mode"
                  className="ipd-select"
                  value={payMode}
                  onChange={(e) => setPayMode(e.target.value)}
                >
                  {PAYMENT_MODES.map((mode) => (
                    <option key={mode} value={mode}>
                      {mode}
                    </option>
                  ))}
                </select>
              </div>
              <div className="ipd-toolbar__field">
                <label className="ipd-toolbar__label" htmlFor="ipd-dis-pay-amount">
                  Amount
                </label>
                <input
                  id="ipd-dis-pay-amount"
                  className="ipd-input"
                  type="number"
                  min="0"
                  step="0.01"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  placeholder={String(
                    openBill?.balance_due ?? preview?.grand_total ?? ''
                  )}
                />
              </div>
              <p className="ipd-page__subtitle ipd-form-grid--full">
                Outstanding:{' '}
                {formatIpdMoney(openBill?.balance_due ?? preview?.grand_total)}
                . You can skip payment and force discharge on the next step if needed.
              </p>
              <div className="ipd-form-actions ipd-form-grid--full">
                <IpdPermissionButton
                  allowed={canPayBill}
                  type="button"
                  className="btn btn--primary"
                  disabled={payMutation.isPending || generateMutation.isPending}
                  onClick={onCollect}
                >
                  {payMutation.isPending || generateMutation.isPending
                    ? 'Processing…'
                    : 'Collect & continue'}
                </IpdPermissionButton>
                <Button type="button" variant="secondary" onClick={goNext}>
                  Skip payment
                </Button>
              </div>
            </div>
          ) : null}

          {step.id === 'confirmation' ? (
            <div className="ipd-form-grid">
              <div className="ipd-toolbar__field ipd-form-grid--full">
                <label className="ipd-toolbar__label" htmlFor="ipd-dis-notes">
                  Discharge notes
                </label>
                <textarea
                  id="ipd-dis-notes"
                  className="ipd-textarea"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional discharge notes"
                />
              </div>
              <label className="ipd-toolbar__field ipd-form-grid--full" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <input
                  type="checkbox"
                  checked={force}
                  onChange={(e) => setForce(e.target.checked)}
                />
                <span>Force discharge even if balance is unpaid</span>
              </label>
              <EmptyState
                title="Ready to confirm discharge"
                description="This will free the bed and close the admission."
              />
            </div>
          ) : null}
        </div>
      </div>

      <div className="ipd-form-actions">
        <Button type="button" variant="secondary" onClick={goBack} disabled={stepIndex === 0}>
          Back
        </Button>
        {stepIndex < IPD_DISCHARGE_STEPS.length - 1 && step.id !== 'payment' ? (
          <Button type="button" onClick={goNext}>
            Continue
          </Button>
        ) : null}
        {step.id === 'confirmation' ? (
          <IpdPermissionButton
            allowed={canDischarge}
            deniedMessage="You do not have permission to complete discharge"
            type="button"
            className="btn btn--primary"
            disabled={dischargeMutation.isPending}
            onClick={onConfirmDischarge}
          >
            {dischargeMutation.isPending ? 'Discharging…' : 'Confirm discharge'}
          </IpdPermissionButton>
        ) : null}
      </div>
    </div>
  );
}
