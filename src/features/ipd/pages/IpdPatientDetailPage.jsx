/**
 * IPD Patient Detail — admission overview (`/ipd/admissions/{id}`).
 */

import { useMemo, useState } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { Button, EmptyState, QueryFeedback } from '@/shared/components/common';
import { ROUTES } from '@/shared/constants';
import IpdPageHeader from '@/features/ipd/components/IpdPageHeader';
import IpdStatusBadge from '@/features/ipd/components/IpdStatusBadge';
import BillSummary from '@/features/ipd/components/BillSummary';
import AdmissionCareTeamEditor from '@/features/ipd/components/AdmissionCareTeamEditor';
import EditInsuranceModal from '@/features/ipd/components/EditInsuranceModal';
import useIpdBackNavigation from '@/features/ipd/hooks/useIpdBackNavigation';
import { useIpdAdmissionDetailQuery } from '@/features/ipd/hooks/useIpdQuery';
import {
  useIpdAdmissionInsuranceQuery,
  useUpdateIpdAdmissionInsuranceMutation,
} from '@/features/ipd/hooks/useIpdBillingQuery';
import { useIpdPermissionSet } from '@/features/ipd/hooks/useIpdPermission';
import { formatIpdDateTime } from '@/features/ipd/utils/ipdFormat';
import { resolveIpdBillPreviewPayment } from '@/features/ipd/utils/resolveIpdBillPreviewPayment';
import { formatCurrency } from '@/shared/utils/formatCurrency';

function Field({ label, children, wide = false }) {
  return (
    <div className={`ipd-pd-field${wide ? ' ipd-pd-field--wide' : ''}`}>
      <dt>{label}</dt>
      <dd>{children ?? '—'}</dd>
    </div>
  );
}

export default function IpdPatientDetailPage() {
  const { admissionId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const goBack = useIpdBackNavigation(ROUTES.IPD_PATIENTS);
  const { canAdmit } = useIpdPermissionSet();
  const { data, isLoading, isError, error, refetch } =
    useIpdAdmissionDetailQuery(admissionId);
  const admissionInsuranceQuery = useIpdAdmissionInsuranceQuery(admissionId);
  const updateAdmissionInsuranceMutation = useUpdateIpdAdmissionInsuranceMutation();

  const [editInsuranceOpen, setEditInsuranceOpen] = useState(false);
  const [insuranceDraft, setInsuranceDraft] = useState(null);

  const payClaimInsurance =
    insuranceDraft ??
    admissionInsuranceQuery.data ??
    location.state?.payAndClaimInsurance ??
    null;

  const admission = data?.admission;
  const visits = data?.doctor_visits ?? [];
  const bills = data?.bills ?? [];
  const running = data?.running_bill;
  const admitted = admission?.status === 'admitted';

  const paymentView = useMemo(
    () =>
      resolveIpdBillPreviewPayment({
        bills,
        preview: running,
      }),
    [bills, running],
  );
  const paymentStatusLabel =
    paymentView.paymentStatusKey === 'paid'
      ? 'Paid'
      : paymentView.paymentStatusKey === 'partial'
        ? 'Partial'
        : 'Unpaid';
  const billActionLabel = paymentView.canCollectPayment ? 'Collect / Open bill' : 'View bill';

  return (
    <div className="ipd-page ipd-page--compact">
      <IpdPageHeader
        title={admission?.patient_name || 'Patient Detail'}
        subtitle={
          admission
            ? [
                admission.admission_no,
                admission.patient_uid,
                admission.ward_name && admission.bed_number
                  ? `${admission.ward_name} / ${admission.bed_number}`
                  : null,
              ]
                .filter(Boolean)
                .join(' · ')
            : admissionId
              ? `Admission #${admissionId}`
              : undefined
        }
        actions={
          <div className="ipd-form-actions">
            {admitted ? (
              <>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    navigate(
                      ROUTES.IPD_BILL_PREVIEW.replace(
                        ':admissionId',
                        String(admissionId)
                      )
                    )
                  }
                >
                  Billing
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() =>
                    navigate(
                      ROUTES.IPD_DISCHARGE_ADMISSION.replace(
                        ':admissionId',
                        String(admissionId)
                      )
                    )
                  }
                >
                  Discharge
                </Button>
              </>
            ) : null}
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={goBack}
            >
              Back
            </Button>
          </div>
        }
      />

      {isError ? (
        <div className="ipd-card">
          <div className="ipd-card__body">
            <QueryFeedback isError error={error} onRetry={refetch} />
          </div>
        </div>
      ) : null}

      {isLoading ? (
        <div className="ipd-card">
          <div className="ipd-card__body" style={{ display: 'grid', gap: '0.4rem' }}>
            <div className="ipd-skeleton" />
            <div className="ipd-skeleton" />
            <div className="ipd-skeleton" />
          </div>
        </div>
      ) : !admission ? (
        <EmptyState
          title="Admission not found"
          description="This admission may have been removed or you may not have access."
        />
      ) : (
        <div className="ipd-pd-stack">
          <div className="ipd-card">
            <div className="ipd-card__head ipd-pd-head">
              <div className="ipd-pd-head__left">
                <h2 className="ipd-card__title">Admission</h2>
                <IpdStatusBadge status={admission.status} />
              </div>
            </div>
            <div className="ipd-card__body ipd-pd-body">
              <dl className="ipd-pd-grid">
                <Field label="Admission No.">{admission.admission_no}</Field>
                <Field label="Patient ID">{admission.patient_uid}</Field>
                <Field label="Ward / Bed">
                  {admission.ward_name || '—'} / {admission.bed_number || '—'}
                </Field>
                <Field label="Length of stay">
                  {admission.length_of_stay_days != null
                    ? `${admission.length_of_stay_days} day(s)`
                    : '—'}
                </Field>
                <Field label="Admitted">
                  {formatIpdDateTime(admission.admitted_at)}
                </Field>
                <Field label="Discharged">
                  {admission.discharged_at
                    ? formatIpdDateTime(admission.discharged_at)
                    : 'Still admitted'}
                </Field>
              </dl>

              <div className="ipd-pd-care">
                <div className="ipd-pd-care__label">Care team</div>
                <AdmissionCareTeamEditor
                  admission={admission}
                  visits={visits}
                  canEdit={canAdmit}
                  compact
                />
              </div>
            </div>
          </div>

          {payClaimInsurance ? (
            <div className="ipd-card">
              <div className="ipd-card__head">
                <h2 className="ipd-card__title">Insurance (Copay)</h2>
                <div className="ipd-form-actions">
                  <span className="ipd-ins-chip ipd-ins-chip--coverage">
                    {payClaimInsurance.coverage}
                  </span>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => setEditInsuranceOpen(true)}
                  >
                    Edit Insurance
                  </Button>
                </div>
              </div>
              <div className="ipd-card__body">
                <dl className="ipd-claim-ins-grid">
                  <Field label="Insurance Company">{payClaimInsurance.insurer}</Field>
                  <Field label="Policy Number">{payClaimInsurance.policyNo}</Field>
                  <Field label="Policy Holder">{payClaimInsurance.policyHolder}</Field>
                  <Field label="Relationship">{payClaimInsurance.relationship}</Field>
                  <Field label="Claimed Amount">
                    {formatCurrency(payClaimInsurance.claimedAmount, { empty: '—' })}
                  </Field>
                  <Field label="Estimate Amount">
                    {formatCurrency(payClaimInsurance.estimateAmount, { empty: '—' })}
                  </Field>
                </dl>
                <p className="ipd-page__subtitle" style={{ marginTop: '0.75rem' }}>
                  Billing and payments use the standard self-pay flow. Insurance
                  details are stored on this profile for reimbursement reference.
                </p>
              </div>
            </div>
          ) : null}

          <div className="ipd-pd-split">
            <div className="ipd-card">
              <div className="ipd-card__head">
                <h2 className="ipd-card__title">Doctor visits</h2>
                {visits.length > 0 ? (
                  <span className="ipd-page__subtitle">{visits.length}</span>
                ) : null}
              </div>
              {visits.length === 0 ? (
                <div className="ipd-card__body">
                  <p className="ipd-pd-muted">No doctor visits recorded.</p>
                </div>
              ) : (
                <div className="ipd-table-wrap">
                  <table className="ipd-table ipd-table--dense">
                    <thead>
                      <tr>
                        <th>Doctor</th>
                        <th>Visited</th>
                        <th>Charge</th>
                        <th>Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visits.map((visit) => (
                        <tr key={visit.id}>
                          <td>{visit.doctor_name || '—'}</td>
                          <td>{formatIpdDateTime(visit.visited_at)}</td>
                          <td>{formatCurrency(visit.charge, { empty: '—' })}</td>
                          <td>{visit.notes || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="ipd-card">
              <div className="ipd-card__head">
                <h2 className="ipd-card__title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  Billing
                  <IpdStatusBadge
                    status={paymentView.paymentStatusKey}
                    label={paymentStatusLabel}
                  />
                </h2>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    navigate(
                      ROUTES.IPD_BILL_PREVIEW.replace(
                        ':admissionId',
                        String(admissionId)
                      )
                    )
                  }
                >
                  {billActionLabel}
                </Button>
              </div>
              <div className="ipd-card__body ipd-pd-billing">
                <BillSummary
                  subtotal={formatCurrency(running?.subtotal, { empty: '—' })}
                  tax={formatCurrency(running?.gst_amount, { empty: '—' })}
                  taxPercent={running?.gst_percent}
                  total={formatCurrency(running?.grand_total, { empty: '—' })}
                  paid={formatCurrency(paymentView.paid, { empty: '—' })}
                  balance={formatCurrency(paymentView.balance, { empty: '—' })}
                />
                {bills.length > 0 ? (
                  <div className="ipd-pd-bill-list">
                    <div className="ipd-pd-bill-list__title">Generated bills</div>
                    {bills.map((bill) => {
                      const methodRaw = String(bill.payment_mode || '').trim();
                      const methodLabel = methodRaw
                        ? methodRaw.charAt(0).toUpperCase() + methodRaw.slice(1).toLowerCase()
                        : '—';
                      return (
                      <Link
                        key={bill.id}
                        to={ROUTES.IPD_BILL_VIEW.replace(
                          ':billId',
                          String(bill.id)
                        )}
                        className="ipd-pd-bill-row"
                      >
                        <div className="ipd-pd-bill-row__main">
                          <span className="ipd-pd-bill-row__no">
                            {bill.bill_number}
                          </span>
                          <IpdStatusBadge status={bill.payment_status} />
                        </div>
                        <div className="ipd-pd-bill-row__amounts">
                          <span>
                            <em>Total</em> {formatCurrency(bill.grand_total, { empty: '—' })}
                          </span>
                          <span>
                            <em>Paid</em> {formatCurrency(bill.paid_amount, { empty: '—' })}
                          </span>
                          <span>
                            <em>Due</em> {formatCurrency(bill.balance_due, { empty: '—' })}
                          </span>
                          <span>
                            <em>Method</em> {methodLabel}
                          </span>
                        </div>
                      </Link>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      )}

      {payClaimInsurance ? (
        <EditInsuranceModal
          open={editInsuranceOpen}
          onClose={() => setEditInsuranceOpen(false)}
          initial={payClaimInsurance}
          onSave={(next) => {
            setInsuranceDraft((prev) => ({
              ...(prev ?? payClaimInsurance),
              ...next,
            }));
            updateAdmissionInsuranceMutation.mutate({
              admissionId,
              payload: next,
            });
          }}
        />
      ) : null}
    </div>
  );
}
