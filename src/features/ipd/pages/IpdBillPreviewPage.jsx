/**
 * Bill preview for an admission — live generate + pay.
 */

import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, QueryFeedback } from '@/shared/components/common';
import { PAYMENT_MODES, ROUTES } from '@/shared/constants';
import { toast } from '@/shared/utils/toast';
import IpdPageHeader from '@/features/ipd/components/IpdPageHeader';
import ChargeTable from '@/features/ipd/components/ChargeTable';
import BillSummary from '@/features/ipd/components/BillSummary';
import { useIpdPermissionSet } from '@/features/ipd/hooks/useIpdPermission';
import IpdPermissionButton from '@/features/ipd/components/IpdPermissionButton';
import {
  useGenerateIpdBillMutation,
  useIpdAdmissionDetailQuery,
  useIpdBillPreviewQuery,
  usePayIpdBillMutation,
} from '@/features/ipd/hooks/useIpdQuery';
import { formatIpdMoney } from '@/features/ipd/utils/ipdFormat';

export default function IpdBillPreviewPage() {
  const { admissionId } = useParams();
  const navigate = useNavigate();
  const { canGenerateBill, canPayBill } = useIpdPermissionSet();

  const previewQuery = useIpdBillPreviewQuery(admissionId);
  const detailQuery = useIpdAdmissionDetailQuery(admissionId);
  const generateMutation = useGenerateIpdBillMutation();
  const payMutation = usePayIpdBillMutation();

  const preview = previewQuery.data;
  const openBill = (detailQuery.data?.bills ?? []).find(
    (bill) =>
      bill.status !== 'void' &&
      ['pending', 'partial'].includes(String(bill.payment_status || '').toLowerCase())
  );

  const [payMode, setPayMode] = useState('Cash');
  const [payAmount, setPayAmount] = useState('');

  const onGenerate = async (payLater = true) => {
    try {
      const bill = await generateMutation.mutateAsync({
        admission_id: Number(admissionId),
        pay_later: payLater,
        payment_mode: payLater ? null : payMode.toLowerCase(),
        amount_received: payLater ? 0 : Number(payAmount || preview?.grand_total || 0),
      });
      toast.success(`Bill ${bill.bill_number} generated`);
      await Promise.all([previewQuery.refetch(), detailQuery.refetch()]);
    } catch (err) {
      toast.error(err?.message || 'Could not generate bill');
    }
  };

  const onCollect = async () => {
    if (!openBill?.id) {
      toast.error('Generate a bill before collecting payment');
      return;
    }
    const amount = Number(payAmount || openBill.balance_due || 0);
    if (!(amount > 0)) {
      toast.error('Enter a valid payment amount');
      return;
    }
    try {
      await payMutation.mutateAsync({
        billId: openBill.id,
        payload: {
          amount,
          payment_mode: payMode.toLowerCase(),
        },
      });
      toast.success('Payment recorded');
      setPayAmount('');
      await detailQuery.refetch();
    } catch (err) {
      toast.error(err?.message || 'Payment failed');
    }
  };

  return (
    <div className="ipd-page">
      <IpdPageHeader
        title="Bill Preview"
        subtitle={
          preview
            ? `${preview.admission_no || `Admission #${admissionId}`} · ${preview.patient_name || ''}`
            : admissionId
              ? `Admission #${admissionId}`
              : 'Bed days, doctor visits, and other charges'
        }
        actions={
          <Button type="button" variant="secondary" onClick={() => navigate(ROUTES.IPD_BILLING)}>
            Back to billing
          </Button>
        }
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
          <h2 className="ipd-card__title">Charges</h2>
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
            total={formatIpdMoney(preview?.grand_total)}
            paid={openBill ? formatIpdMoney(openBill.paid_amount) : null}
            balance={openBill ? formatIpdMoney(openBill.balance_due) : null}
          />

          <div className="ipd-form-grid" style={{ marginTop: '1rem' }}>
            <div className="ipd-toolbar__field">
              <label className="ipd-toolbar__label" htmlFor="ipd-bill-mode">
                Payment mode
              </label>
              <select
                id="ipd-bill-mode"
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
              <label className="ipd-toolbar__label" htmlFor="ipd-bill-amount">
                Amount
              </label>
              <input
                id="ipd-bill-amount"
                className="ipd-input"
                type="number"
                min="0"
                step="0.01"
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                placeholder={
                  openBill
                    ? String(openBill.balance_due ?? '')
                    : String(preview?.grand_total ?? '')
                }
              />
            </div>
          </div>

          <div className="ipd-form-actions">
            <IpdPermissionButton
              allowed={canGenerateBill}
              type="button"
              className="btn btn--secondary"
              disabled={generateMutation.isPending || !preview}
              onClick={() => onGenerate(true)}
            >
              {generateMutation.isPending ? 'Generating…' : 'Generate bill (pay later)'}
            </IpdPermissionButton>
            <IpdPermissionButton
              allowed={canPayBill}
              type="button"
              className="btn btn--primary"
              disabled={payMutation.isPending || !openBill}
              onClick={onCollect}
            >
              {payMutation.isPending ? 'Collecting…' : 'Collect payment'}
            </IpdPermissionButton>
          </div>
          {openBill ? (
            <p className="ipd-page__subtitle">
              Open bill {openBill.bill_number} · balance{' '}
              {formatIpdMoney(openBill.balance_due)}
            </p>
          ) : (
            <p className="ipd-page__subtitle">
              Generate a bill first, then collect payment against the outstanding balance.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
