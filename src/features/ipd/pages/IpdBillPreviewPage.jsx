/**
 * Bill preview for an admission — live generate + pay.
 */

import { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Printer } from 'lucide-react';
import { Button, QueryFeedback } from '@/shared/components/common';
import { PAYMENT_MODES, ROUTES } from '@/shared/constants';
import { toast } from '@/shared/utils/toast';
import {
  requiresTransactionReference,
  validatePaymentTransactionRef,
} from '@/shared/utils/validators';
import IpdPageHeader from '@/features/ipd/components/IpdPageHeader';
import IpdBillPrintSheet from '@/features/ipd/components/IpdBillPrintSheet';
import ChargeTable from '@/features/ipd/components/ChargeTable';
import BillSummary from '@/features/ipd/components/BillSummary';
import IpdStatusBadge from '@/features/ipd/components/IpdStatusBadge';
import { useIpdPermissionSet } from '@/features/ipd/hooks/useIpdPermission';
import IpdPermissionButton from '@/features/ipd/components/IpdPermissionButton';
import {
  useGenerateIpdBillMutation,
  useIpdAdmissionDetailQuery,
  useIpdBillInvoiceQuery,
  useIpdBillPreviewQuery,
  usePayIpdBillMutation,
} from '@/features/ipd/hooks/useIpdQuery';
import { buildIpdProvisionalInvoice } from '@/features/ipd/utils/ipdBillPrintModel';
import { formatIpdMoney } from '@/features/ipd/utils/ipdFormat';
import { resolveIpdBillPreviewPayment } from '@/features/ipd/utils/resolveIpdBillPreviewPayment';
import '@/features/opd/billing/pages/ViewBillPage.css';

export default function IpdBillPreviewPage() {
  const { admissionId } = useParams();
  const navigate = useNavigate();
  const { canGenerateBill, canPayBill } = useIpdPermissionSet();

  const previewQuery = useIpdBillPreviewQuery(admissionId);
  const detailQuery = useIpdAdmissionDetailQuery(admissionId);
  const generateMutation = useGenerateIpdBillMutation();
  const payMutation = usePayIpdBillMutation();

  const preview = previewQuery.data;
  const bills = detailQuery.data?.bills ?? [];

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

  const printInvoice = printableBill?.id ? invoiceQuery.data : provisionalInvoice;
  const printLoading = Boolean(printableBill?.id) && invoiceQuery.isLoading;

  const paymentStatusLabel =
    paymentStatusKey === 'paid'
      ? 'Paid'
      : paymentStatusKey === 'partial'
        ? 'Partial'
        : 'Unpaid';
  const summaryPaid = formatIpdMoney(paidAmount);
  const summaryBalance = formatIpdMoney(balanceDue);
  const collectAmountCap = Number(openBill?.balance_due ?? balanceDue ?? 0);

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

  const refreshBilling = async () => {
    await Promise.all([previewQuery.refetch(), detailQuery.refetch()]);
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

  return (
    <div className="ipd-page">
      <div className="no-print">
      <IpdPageHeader
        title="Bill Preview"
        subtitle={
          preview
            ? `${preview.admission_no || `Admission #${admissionId}`} · ${preview.patient_name || ''}`
            : admissionId
              ? `Admission #${admissionId}`
              : 'Bed days, doctor visits, and other charges'
        }
        actions={(
          <div className="no-print" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <Button type="button" variant="secondary" onClick={() => navigate(ROUTES.IPD_BILLING)}>
              Back to billing
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

      <div className="ipd-card">
        <div className="ipd-card__head">
          <h2 className="ipd-card__title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            Charges
            <IpdStatusBadge status={paymentStatusKey} label={paymentStatusLabel} />
          </h2>
          {preview ? (
            <span className="ipd-page__subtitle">
              {preview.ward_name}/{preview.bed_number} · {preview.length_of_stay_days ?? 0}{' '}
              day(s) · Bed rate {formatIpdMoney(preview.bed_rate)}
            </span>
          ) : null}
        </div>
        <ChargeTable
          rows={preview?.items ?? []}
          loading={previewQuery.isLoading}
          emptyTitle="No charges to preview"
          emptyDescription="Bill lines appear once the patient has an active stay."
        />
        <div className="ipd-card__body">
          <BillSummary
            subtotal={formatIpdMoney(preview?.subtotal)}
            tax={formatIpdMoney(preview?.gst_amount)}
            taxPercent={preview?.gst_percent}
            total={formatIpdMoney(preview?.grand_total)}
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
                    {PAYMENT_MODES.map((mode) => (
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

      {printInvoice ? (
        <IpdBillPrintSheet invoice={printInvoice} className="bill-print-zone--offscreen" />
      ) : null}
    </div>
  );
}
