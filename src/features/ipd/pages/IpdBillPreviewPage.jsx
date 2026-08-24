/**
 * Bill preview for an admission — daily charges, hospital totals, generate + pay.
 */

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Printer } from 'lucide-react';
import { Button, QueryFeedback } from '@/shared/components/common';
import { IPD_COLLECT_PAYMENT_MODES, ROUTES } from '@/shared/constants';
import { toast } from '@/shared/utils/toast';
import {
  requiresTransactionReference,
  validatePaymentTransactionRef,
} from '@/shared/utils/validators';
import IpdPageHeader from '@/features/ipd/components/IpdPageHeader';
import IpdBillPrintSheet from '@/features/ipd/components/IpdBillPrintSheet';
import IpdDailyChargesCard from '@/features/ipd/components/IpdDailyChargesCard';
import IpdHospitalChargesCard, {
  calculateInsuranceChargeTotals,
  normalizeInsuranceChargeHeads,
  sortInsuranceChargeHeads,
} from '@/features/ipd/components/IpdHospitalChargesCard';
import BillSummary from '@/features/ipd/components/BillSummary';
import IpdStatusBadge from '@/features/ipd/components/IpdStatusBadge';
import { useIpdPermissionSet } from '@/features/ipd/hooks/useIpdPermission';
import IpdPermissionButton from '@/features/ipd/components/IpdPermissionButton';
import useIpdBackNavigation from '@/features/ipd/hooks/useIpdBackNavigation';
import {
  useGenerateIpdBillMutation,
  useIpdAdmissionDetailQuery,
  useIpdBillInvoiceQuery,
  useIpdBillPreviewQuery,
  usePayIpdBillMutation,
} from '@/features/ipd/hooks/useIpdQuery';
import {
  useIpdSelfPayBillingBundleQuery,
  useSaveIpdSelfPayDailyBillingMutation,
  useSaveIpdSelfPayFinalBillingMutation,
  useIpdAdmissionInsuranceQuery,
} from '@/features/ipd/hooks/useIpdBillingQuery';
import { initChargeHeadsFromClaim, buildSelfPayBillingBundle } from '@/features/ipd/billing/ipdBillingMapper';
import { initDailyCharges } from '@/features/ipd/utils/insuranceDailyCharges';
import { buildIpdProvisionalInvoice } from '@/features/ipd/utils/ipdBillPrintModel';
import { resolveIpdBillPreviewPayment } from '@/features/ipd/utils/resolveIpdBillPreviewPayment';
import { formatCurrency } from '@/shared/utils/formatCurrency';

import '@/features/opd/billing/pages/ViewBillPage.css';

export default function IpdBillPreviewPage() {
  const { admissionId } = useParams();
  const goBack = useIpdBackNavigation(ROUTES.IPD_BILLING);
  const { canGenerateBill, canPayBill } = useIpdPermissionSet();

  const previewQuery = useIpdBillPreviewQuery(admissionId);
  const detailQuery = useIpdAdmissionDetailQuery(admissionId);
  const generateMutation = useGenerateIpdBillMutation();
  const payMutation = usePayIpdBillMutation();

  const patientId =
    detailQuery.data?.patient_id ?? detailQuery.data?.patient?.id ?? null;

  const preview = previewQuery.data;

  const admission = detailQuery.data?.admission;
  const doctorVisits = detailQuery.data?.doctor_visits ?? [];
  const admittedAt = admission?.admitted_at ?? null;

  const billingQuery = useIpdSelfPayBillingBundleQuery({
    admissionId,
    patientId,
    preview,
    admittedAt,
    doctorVisits,
    enabled: Boolean(admissionId),
  });
  const admissionInsuranceQuery = useIpdAdmissionInsuranceQuery(admissionId);
  const saveFinalBillingMutation = useSaveIpdSelfPayFinalBillingMutation();
  const saveDailyBillingMutation = useSaveIpdSelfPayDailyBillingMutation();

  const bills = detailQuery.data?.bills ?? [];

  const [charges, setCharges] = useState(() => initChargeHeadsFromClaim(null));
  const [dailyCharges, setDailyCharges] = useState([]);

  // Sync from billing bundle or live preview (do not wipe while user edits).
  useEffect(() => {
    if (!admissionId) return;

    const bundle =
      billingQuery.data ??
      (preview
        ? buildSelfPayBillingBundle(
            preview,
            {
              admissionId: String(admissionId),
              patientId,
              admittedAt,
              doctorVisits,
            },
            null,
          )
        : null);

    if (!bundle) return;

    setCharges(
      sortInsuranceChargeHeads(
        normalizeInsuranceChargeHeads(
          bundle.finalBilling?.chargeHeads ?? [],
        ),
      ),
    );
    setDailyCharges(initDailyCharges({ dailyCharges: bundle.dailyCharges }));
  }, [
    admissionId,
    patientId,
    admittedAt,
    preview?.admission_id,
    preview?.length_of_stay_days,
    billingQuery.dataUpdatedAt,
  ]);

  const [payMode, setPayMode] = useState('Cash');
  const [payAmount, setPayAmount] = useState('');
  const [paymentRef, setPaymentRef] = useState('');
  const [lastBillResult, setLastBillResult] = useState(null);

  const paymentBusy = generateMutation.isPending || payMutation.isPending;

  const paymentView = useMemo(
    () =>
      resolveIpdBillPreviewPayment({
        bills,
        lastBillResult,
        preview,
      }),
    [bills, lastBillResult, preview],
  );

  const {
    openBill,
    printableBill,
    paymentStatusKey,
    paid: paidAmount,
    balance: balanceDue,
    isFullyPaid,
    canCollectPayment,
  } = paymentView;

  const invoiceQuery = useIpdBillInvoiceQuery(printableBill?.id, {
    enabled: Boolean(printableBill?.id),
  });

  const provisionalInvoice = useMemo(
    () => buildIpdProvisionalInvoice(preview, detailQuery.data),
    [preview, detailQuery.data],
  );

  const payClaimInsurance = admissionInsuranceQuery.data ?? null;

  const basePrintInvoice = printableBill?.id ? invoiceQuery.data : provisionalInvoice;
  const printInvoice = useMemo(() => {
    if (!basePrintInvoice || !payClaimInsurance) return basePrintInvoice;
    return {
      ...basePrintInvoice,
      payment_type: 'insurance_pay_and_claim',
      payment_type_label: 'Insurance - Pay & Claim',
      insurance: {
        company: payClaimInsurance.insurer || null,
        policy_no: payClaimInsurance.policyNo || null,
        member_id: payClaimInsurance.memberId || null,
      },
    };
  }, [basePrintInvoice, payClaimInsurance]);
  const printLoading = Boolean(printableBill?.id) && invoiceQuery.isLoading;

  const chargeTotals = useMemo(
    () => calculateInsuranceChargeTotals(charges),
    [charges],
  );

  const billingSubtotal =
    chargeTotals.netBill > 0 ? chargeTotals.netBill : Number(preview?.subtotal) || 0;
  const gstPercent = Number(preview?.gst_percent) || 0;
  const billingGst =
    gstPercent > 0
      ? Math.round((billingSubtotal * gstPercent) / 100 * 100) / 100
      : Number(preview?.gst_amount) || 0;
  const billingGrandTotal = billingSubtotal + billingGst;

  const paymentStatusLabel =
    paymentStatusKey === 'paid'
      ? 'Paid'
      : paymentStatusKey === 'partial'
        ? 'Partial'
        : 'Unpaid';
  const summaryPaid = formatCurrency(paidAmount, { empty: '—' });
  const summaryBalance = formatCurrency(balanceDue, { empty: '—' });
  const collectAmountCap = Number(openBill?.balance_due ?? balanceDue ?? billingGrandTotal);

  const parsedPayAmount = Number(payAmount);
  const hasValidPayAmount =
    Number.isFinite(parsedPayAmount)
    && parsedPayAmount > 0
    && collectAmountCap > 0.01;
  const collectDisabled =
    paymentBusy
    || !hasValidPayAmount
    || !previewQuery.isSuccess
    || !canCollectPayment
    || isFullyPaid;
  const canCollect = openBill ? canPayBill : canPayBill && canGenerateBill;

  const previewItems = preview?.items ?? [];
  const admissionLabel =
    preview?.admission_no || `Admission #${admissionId}`;
  const billingContext = { admittedAt, doctorVisits };

  const refreshBilling = async () => {
    await Promise.all([
      previewQuery.refetch(),
      detailQuery.refetch(),
      billingQuery.refetch(),
    ]);
  };

  const onPrint = () => {
    if (printLoading) {
      toast.error('Loading invoice…');
      return;
    }
    if (!printInvoice) {
      toast.error('Nothing to print yet');
      return;
    }
    window.print();
  };

  const handleSaveCharges = () => {
    saveFinalBillingMutation.mutate(
      {
        admissionId,
        charges,
        previewItems,
        ...billingContext,
      },
      {
        onSuccess: (bundle) => {
          if (!bundle?.finalBilling) {
            toast.error('Unable to save charges');
            return;
          }
          setCharges(
            sortInsuranceChargeHeads(
              normalizeInsuranceChargeHeads(bundle.finalBilling.chargeHeads),
            ),
          );
          toast.success('Hospital charges saved');
        },
        onError: () => toast.error('Unable to save charges'),
      },
    );
  };

  const handleSaveDailyCharges = () => {
    const invalid = dailyCharges.find((row) => !String(row.item_name ?? '').trim());
    if (invalid) {
      toast.error('Every row needs an item name (medicine, treatment, etc.)');
      return;
    }
    saveDailyBillingMutation.mutate(
      {
        admissionId,
        dailyCharges,
        previewItems,
        ...billingContext,
      },
      {
        onSuccess: (bundle) => {
          if (!bundle) {
            toast.error('Unable to save daily charges');
            return;
          }
          setDailyCharges(initDailyCharges({ dailyCharges: bundle.dailyCharges }));
          setCharges(
            sortInsuranceChargeHeads(
              normalizeInsuranceChargeHeads(bundle.finalBilling.chargeHeads),
            ),
          );
          toast.success('Daily charges saved · hospital totals updated');
        },
        onError: () => toast.error('Unable to save daily charges'),
      },
    );
  };

  const onCollectPayment = async () => {
    if (!canCollectPayment || collectAmountCap <= 0.01) {
      toast.error('No due balance to collect');
      return;
    }

    const amount = Number(payAmount);
    if (!(amount > 0)) {
      toast.error('Enter a valid payment amount');
      return;
    }

    const capped = Math.min(amount, collectAmountCap);
    if (!(capped > 0)) {
      toast.error('No due balance to collect');
      return;
    }

    const refError = validatePaymentTransactionRef(payMode, paymentRef, {
      paidAmount: capped,
      payLater: false,
    });
    if (refError) {
      toast.error(refError);
      return;
    }

    const paymentPayload = {
      payment_mode: payMode.toLowerCase(),
      ...(paymentRef.trim() ? { transaction_reference: paymentRef.trim() } : {}),
    };

    try {
      if (openBill?.id) {
        const bill = await payMutation.mutateAsync({
          billId: openBill.id,
          payload: {
            amount: capped,
            ...paymentPayload,
          },
        });
        setLastBillResult(bill);
        toast.success(`Payment recorded · ${bill.bill_number}`);
      } else {
        if (!preview) {
          toast.error('Bill preview is not available');
          return;
        }
        const bill = await generateMutation.mutateAsync({
          admission_id: Number(admissionId),
          pay_later: false,
          amount_received: capped,
          ...paymentPayload,
        });
        setLastBillResult(bill);
        const status = String(bill.payment_status || '').toLowerCase();
        toast.success(
          status === 'paid'
            ? `Bill ${bill.bill_number} generated and paid`
            : `Bill ${bill.bill_number} generated · payment recorded`,
        );
      }

      setPayAmount('');
      setPaymentRef('');
      await refreshBilling();
    } catch (err) {
      toast.error(err?.message || 'Payment failed');
    }
  };

  const pageTitle = payClaimInsurance ? 'IPD Billing — Pay & Claim' : 'IPD Billing';

  return (
    <div className="ipd-page ipd-ins-billing">
      <div className="no-print">
      <IpdPageHeader
        title={pageTitle}
        subtitle={
          preview
            ? `${admissionLabel} · ${preview.patient_name || ''} · ${preview.ward_name}/${preview.bed_number} · ${preview.length_of_stay_days ?? 0} day(s)`
            : admissionId
              ? `Admission #${admissionId}`
              : 'Daily charges and hospital totals'
        }
        actions={(
          <div className="no-print" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <Button type="button" variant="secondary" onClick={goBack}>
              Back
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onPrint}
              disabled={printLoading || !printInvoice}
            >
              <Printer size={16} aria-hidden /> Print
            </Button>
          </div>
        )}
      />

      {previewQuery.isError ? (
        <div className="ipd-card">
          <div className="ipd-card__body">
            <QueryFeedback
              isError
              error={previewQuery.error}
              onRetry={previewQuery.refetch}
            />
          </div>
        </div>
      ) : null}

      {billingQuery.isError ? (
        <div className="ipd-card">
          <div className="ipd-card__body">
            <QueryFeedback
              isError
              error={billingQuery.error}
              onRetry={billingQuery.refetch}
            />
          </div>
        </div>
      ) : null}

      {billingQuery.isLoading && !preview ? (
        <div className="ipd-card">
          <div className="ipd-card__body">
            <QueryFeedback isLoading />
          </div>
        </div>
      ) : null}

      <div className="ipd-ins-billing__top">
        <IpdHospitalChargesCard
          charges={charges}
          onChargesChange={setCharges}
          onSave={handleSaveCharges}
          saving={saveFinalBillingMutation.isPending}
          hint="Room & doctor auto-fill from stay — save daily charges to update other heads."
        />

        <div className="ipd-ins-billing__side">
          <div className="ipd-card">
            <div className="ipd-card__head">
              <h2 className="ipd-card__title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                Payment
                <IpdStatusBadge status={paymentStatusKey} label={paymentStatusLabel} />
              </h2>
            </div>
            <div className="ipd-card__body">
              <BillSummary
                subtotal={formatCurrency(billingSubtotal, { empty: '—' })}
                tax={formatCurrency(billingGst, { empty: '—' })}
                taxPercent={gstPercent || preview?.gst_percent}
                total={formatCurrency(billingGrandTotal, { empty: '—' })}
                paid={summaryPaid}
                balance={summaryBalance}
              />

              <div className="no-print">
              {canCollectPayment ? (
                <>
                  <div className="ipd-form-grid" style={{ marginTop: '1rem' }}>
                    <div className="ipd-toolbar__field">
                      <label className="ipd-toolbar__label" htmlFor="ipd-bill-mode">
                        Payment mode
                      </label>
                      <select
                        id="ipd-bill-mode"
                        className="ipd-select"
                        value={payMode}
                        onChange={(e) => {
                          setPayMode(e.target.value);
                          if (!requiresTransactionReference(e.target.value)) {
                            setPaymentRef('');
                          }
                        }}
                        disabled={paymentBusy}
                      >
                        {IPD_COLLECT_PAYMENT_MODES.map((mode) => (
                          <option key={mode} value={mode}>
                            {mode}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="ipd-toolbar__field">
                      <label className="ipd-toolbar__label" htmlFor="ipd-bill-amount">
                        Amount
                      </label>
                      <input
                        id="ipd-bill-amount"
                        className="ipd-input"
                        type="number"
                        min="0"
                        step="0.01"
                        max={collectAmountCap || undefined}
                        value={payAmount}
                        onChange={(e) => setPayAmount(e.target.value)}
                        disabled={paymentBusy}
                        placeholder={String(collectAmountCap || '')}
                      />
                    </div>
                    {requiresTransactionReference(payMode) ? (
                      <div className="ipd-toolbar__field">
                        <label className="ipd-toolbar__label" htmlFor="ipd-bill-ref">
                          Transaction / reference no.
                        </label>
                        <input
                          id="ipd-bill-ref"
                          className="ipd-input"
                          type="text"
                          value={paymentRef}
                          onChange={(e) => setPaymentRef(e.target.value)}
                          disabled={paymentBusy}
                          placeholder="e.g. UPI ref or card auth code"
                        />
                      </div>
                    ) : null}
                  </div>

                  <div className="ipd-form-actions">
                    <IpdPermissionButton
                      allowed={canCollect}
                      type="button"
                      className="btn btn--primary"
                      disabled={collectDisabled}
                      onClick={onCollectPayment}
                    >
                      {paymentBusy ? 'Processing…' : 'Collect payment'}
                    </IpdPermissionButton>
                  </div>
                </>
              ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>

      <IpdDailyChargesCard
        dailyCharges={dailyCharges}
        onDailyChargesChange={setDailyCharges}
        onSave={handleSaveDailyCharges}
        saving={saveDailyBillingMutation.isPending}
        subtitle={`${admissionLabel} · each row is one item (medicine, treatment, room, etc.)`}
      />
      </div>

      {printInvoice ? (
        <IpdBillPrintSheet invoice={printInvoice} className="bill-print-zone--offscreen" />
      ) : null}
    </div>
  );
}
