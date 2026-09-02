/**
 * Multi-step discharge wizard — live preview, pay, and discharge APIs.
 */

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Button, EmptyState, QueryFeedback } from '@/shared/components/common';
import { IPD_COLLECT_PAYMENT_MODES, ROUTES } from '@/shared/constants';
import { queryKeys } from '@/shared/api/queryKeys';
import { toast } from '@/shared/utils/toast';
import { getIpdPatientDetail } from '@/features/ipd/api/patients';
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
import { formatIpdDateTime } from '@/features/ipd/utils/ipdFormat';
import { resolveIpdBillPreviewPayment, findOpenUnpaidBill } from '@/features/ipd/utils/resolveIpdBillPreviewPayment';
import { formatCurrency } from '@/shared/utils/formatCurrency';
import { useQueryToken } from '@/shared/hooks/useQueryToken';

export default function DischargeWizard({ admissionId }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const token = useQueryToken();
  const { canDischarge, canPayBill, canGenerateBill } = useIpdPermissionSet();
  const [stepIndex, setStepIndex] = useState(0);
  const [payMode, setPayMode] = useState('Cash');
  const [payAmount, setPayAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [paymentReady, setPaymentReady] = useState(false);
  const [paymentCollected, setPaymentCollected] = useState(false);

  const detailQuery = useIpdAdmissionDetailQuery(admissionId);
  const previewQuery = useIpdBillPreviewQuery(admissionId);
  const generateMutation = useGenerateIpdBillMutation();
  const payMutation = usePayIpdBillMutation();
  const dischargeMutation = useCompleteIpdDischargeMutation();

  const admission = detailQuery.data?.admission;
  const preview = previewQuery.data;
  const bills = detailQuery.data?.bills ?? [];
  const paymentView = useMemo(
    () =>
      resolveIpdBillPreviewPayment({
        bills,
        preview,
      }),
    [bills, preview],
  );
  const openBill = paymentView.openBill;
  const exactAmount = Number(paymentView.balance ?? 0);
  const canCollectPayment = paymentView.canCollectPayment;
  const savingDischarge =
    dischargeMutation.isPending ||
    payMutation.isPending ||
    generateMutation.isPending;

  useEffect(() => {
    if (exactAmount == null || Number.isNaN(Number(exactAmount))) return;
    setPayAmount(String(Number(exactAmount)));
  }, [exactAmount, openBill?.id, stepIndex]);

  const step = IPD_DISCHARGE_STEPS[stepIndex];
  const goNext = () => setStepIndex((i) => Math.min(i + 1, IPD_DISCHARGE_STEPS.length - 1));
  const goBack = () => setStepIndex((i) => Math.max(i - 1, 0));

  const ensureBill = async (billList = bills) => {
    const existing = findOpenUnpaidBill(billList) ?? openBill;
    if (existing) return existing;

    if (!canGenerateBill) {
      throw new Error('No open bill and you cannot generate one');
    }
    if (!canCollectPayment || exactAmount <= 0.01) {
      throw new Error('No due balance to bill');
    }
    return generateMutation.mutateAsync({
      admission_id: Number(admissionId),
      pay_later: true,
    });
  };

  /** Payment step only locks details — no money is saved until Confirm discharge. */
  const onPaymentContinue = () => {
    const amount = Number(exactAmount ?? payAmount ?? 0);
    if (amount > 0.01 && !canPayBill) {
      toast.error('You do not have permission to collect payment');
      return;
    }
    if (!(amount >= 0) || Number.isNaN(amount)) {
      toast.error('Invalid payment amount');
      return;
    }
    setPaymentReady(true);
    goNext();
  };

  const onConfirmDischarge = async () => {
    try {
      const freshDetail = await queryClient.fetchQuery({
        queryKey: queryKeys.ipd.admission(admissionId),
        queryFn: () => getIpdPatientDetail(admissionId, token),
      });
      const freshBills = freshDetail?.bills ?? bills;
      const freshPaymentView = resolveIpdBillPreviewPayment({
        bills: freshBills,
        preview,
      });
      const amount = Number(freshPaymentView.balance ?? exactAmount ?? payAmount ?? 0);
      const needsPayment = amount > 0.01 && freshPaymentView.canCollectPayment;

      if (needsPayment) {
        if (!paymentReady) {
          toast.error('Complete the payment step before confirming discharge');
          return;
        }
        const bill = await ensureBill(freshBills);
        const due = Number(bill.balance_due ?? amount);
        if (due > 0.01) {
          await payMutation.mutateAsync({
            billId: bill.id,
            payload: {
              amount: due,
              payment_mode: payMode.toLowerCase(),
            },
          });
          setPaymentCollected(true);
        }
      }

      const result = await dischargeMutation.mutateAsync({
        admissionId,
        payload: { force: false, notes: notes.trim() || null },
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

  const stayFields = admission
    ? [
        { label: 'Patient', value: admission.patient_name || '—', tone: 'teal' },
        {
          label: 'Patient ID',
          value: admission.patient_uid || '—',
          tone: 'slate',
        },
        {
          label: 'Ward / Bed',
          value: `${admission.ward_name || '—'} / ${admission.bed_number || '—'}`,
          tone: 'green',
        },
        { label: 'Doctor', value: admission.doctor_name || '—', tone: 'violet' },
        {
          label: 'Admitted',
          value: formatIpdDateTime(admission.admitted_at),
          tone: 'blue',
        },
        {
          label: 'Length of stay',
          value:
            admission.length_of_stay_days != null
              ? `${admission.length_of_stay_days} day(s)`
              : '—',
          tone: 'amber',
        },
        {
          label: 'Diagnosis',
          value: admission.diagnosis || '—',
          tone: 'rose',
          wide: true,
        },
      ]
    : [];

  return (
    <div className="ipd-discharge-wizard">
      <nav className="ipd-dw-steps" aria-label="Discharge steps">
        {IPD_DISCHARGE_STEPS.map((s, index) => {
          const visited = index < stepIndex;
          const paymentSettled = exactAmount <= 0.01 || paymentCollected;
          const done =
            visited &&
            (s.id !== 'payment' || paymentSettled);
          const active = index === stepIndex;
          return (
            <div
              key={s.id}
              className={cn(
                'ipd-dw-step',
                active && 'ipd-dw-step--active',
                done && 'ipd-dw-step--done',
                visited && s.id === 'payment' && !paymentSettled && 'ipd-dw-step--pending-pay',
              )}
            >
              {index > 0 ? <span className="ipd-dw-step__rail" aria-hidden /> : null}
              <div className="ipd-dw-step__node">
                <span className="ipd-dw-step__num" aria-hidden>
                  {done ? '✓' : index + 1}
                </span>
                <span className="ipd-dw-step__label">{s.label}</span>
              </div>
            </div>
          );
        })}
      </nav>

      <section className="ipd-dw-panel">
        <header className="ipd-dw-panel__head">
          <div className="ipd-dw-panel__head-text">
            <p className="ipd-dw-panel__eyebrow">
              Step {stepIndex + 1} of {IPD_DISCHARGE_STEPS.length}
            </p>
            <h2 className="ipd-dw-panel__title">{step.label}</h2>
          </div>
          <div className="ipd-dw-patient-chip">
            <span className="ipd-dw-patient-chip__no">
              {admission?.admission_no || `Admission #${admissionId}`}
            </span>
            {admission?.patient_name ? (
              <span className="ipd-dw-patient-chip__name">{admission.patient_name}</span>
            ) : null}
          </div>
        </header>

        <div className="ipd-dw-panel__body">
          {detailQuery.isLoading || previewQuery.isLoading ? (
            <div className="ipd-dw-skeleton">
              <div className="ipd-skeleton" />
              <div className="ipd-skeleton" />
              <div className="ipd-skeleton" />
            </div>
          ) : null}

          {step.id === 'review_stay' && admission ? (
            <div className="ipd-dw-grid">
              {stayFields.map((field) => (
                <div
                  key={field.label}
                  className={cn(
                    'ipd-dw-field',
                    field.tone && `ipd-dw-field--${field.tone}`,
                    field.wide && 'ipd-dw-field--wide',
                  )}
                >
                  <dt>{field.label}</dt>
                  <dd>{field.value}</dd>
                </div>
              ))}
            </div>
          ) : null}

          {step.id === 'review_charges' ? (
            <div className="ipd-dw-charges">
              <ChargeTable
                rows={preview?.items ?? []}
                compact
                emptyTitle="No charges yet"
                emptyDescription="Bed and visit charges will appear here."
              />
              <BillSummary
                subtotal={formatCurrency(preview?.subtotal, { empty: '—' })}
                tax={formatCurrency(preview?.gst_amount, { empty: '—' })}
                taxPercent={preview?.gst_percent}
                total={formatCurrency(preview?.grand_total, { empty: '—' })}
                paid={formatCurrency(paymentView.paid, { empty: '—' })}
                balance={formatCurrency(paymentView.balance, { empty: '—' })}
              />
            </div>
          ) : null}

          {step.id === 'payment' ? (
            <div className="ipd-dw-pay">
              <div className="ipd-dw-pay__summary">
                <span className="ipd-dw-pay__summary-label">Outstanding balance</span>
                <strong className="ipd-dw-pay__summary-value">
                  {formatCurrency(exactAmount, { empty: '—' })}
                </strong>
                <p className="ipd-dw-pay__hint">
                  Review the exact amount and payment mode. Money is saved only when you
                  confirm discharge on the next step.
                </p>
              </div>
              <div className="ipd-dw-pay__form">
                <div className="ipd-toolbar__field">
                  <label className="ipd-toolbar__label" htmlFor="ipd-dis-pay-mode">
                    Payment mode
                  </label>
                  <select
                    id="ipd-dis-pay-mode"
                    className="ipd-select"
                    value={payMode}
                    onChange={(e) => {
                      setPayMode(e.target.value);
                      setPaymentReady(false);
                    }}
                  >
                    {IPD_COLLECT_PAYMENT_MODES.map((mode) => (
                      <option key={mode} value={mode}>
                        {mode}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="ipd-toolbar__field">
                  <label className="ipd-toolbar__label" htmlFor="ipd-dis-pay-amount">
                    Amount (exact)
                  </label>
                  <input
                    id="ipd-dis-pay-amount"
                    className="ipd-input"
                    type="number"
                    min="0"
                    step="0.01"
                    value={
                      exactAmount != null && !Number.isNaN(Number(exactAmount))
                        ? String(Number(exactAmount))
                        : payAmount
                    }
                    readOnly
                    aria-readonly="true"
                  />
                </div>
              </div>
              <div className="ipd-dw-pay__actions">
                <IpdPermissionButton
                  allowed={canPayBill || !(Number(exactAmount) > 0.01)}
                  type="button"
                  className="btn btn--primary"
                  onClick={onPaymentContinue}
                >
                  Continue
                </IpdPermissionButton>
              </div>
            </div>
          ) : null}

          {step.id === 'confirmation' ? (
            <div className="ipd-dw-confirm">
              <div className="ipd-dw-confirm__banner">
                <h3 className="ipd-dw-confirm__title">Ready to confirm discharge</h3>
                <p className="ipd-dw-confirm__text">
                  This will record payment
                  {Number(exactAmount) > 0.01 ? (
                    <>
                      {' '}
                      of <strong>{formatCurrency(exactAmount, { empty: '—' })}</strong> via{' '}
                      <strong>{payMode}</strong>,{' '}
                    </>
                  ) : (
                    ' '
                  )}
                  free the bed, and close the admission for{' '}
                  <strong>{admission?.patient_name || 'this patient'}</strong>.
                </p>
              </div>
              <div className="ipd-toolbar__field">
                <label className="ipd-toolbar__label" htmlFor="ipd-dis-notes">
                  Discharge notes
                </label>
                <textarea
                  id="ipd-dis-notes"
                  className="ipd-textarea"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional discharge notes"
                  rows={4}
                />
              </div>
            </div>
          ) : null}
        </div>

        <footer className="ipd-dw-panel__footer">
          <Button
            type="button"
            variant="secondary"
            onClick={goBack}
            disabled={stepIndex === 0 || savingDischarge}
          >
            Back
          </Button>
          {stepIndex < IPD_DISCHARGE_STEPS.length - 1 && step.id !== 'payment' ? (
            <Button type="button" onClick={goNext} disabled={savingDischarge}>
              Continue
            </Button>
          ) : null}
          {step.id === 'confirmation' ? (
            <IpdPermissionButton
              allowed={canDischarge}
              deniedMessage="You do not have permission to complete discharge"
              type="button"
              className="btn btn--primary"
              disabled={savingDischarge}
              onClick={onConfirmDischarge}
            >
              {savingDischarge ? 'Saving…' : 'Confirm discharge'}
            </IpdPermissionButton>
          ) : null}
        </footer>
      </section>
    </div>
  );
}
