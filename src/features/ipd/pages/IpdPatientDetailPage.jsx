/**
 * IPD Patient Detail — live `/ipd/admissions/{id}`.
 */

import { useParams, useNavigate, Link } from 'react-router-dom';
import { Button, EmptyState, QueryFeedback } from '@/shared/components/common';
import { ROUTES } from '@/shared/constants';
import IpdPageHeader from '@/features/ipd/components/IpdPageHeader';
import IpdStatusBadge from '@/features/ipd/components/IpdStatusBadge';
import ChargeTable from '@/features/ipd/components/ChargeTable';
import BillSummary from '@/features/ipd/components/BillSummary';
import { useIpdAdmissionDetailQuery } from '@/features/ipd/hooks/useIpdQuery';
import {
  formatIpdDateTime,
  formatIpdMoney,
} from '@/features/ipd/utils/ipdFormat';

function DetailSection({ title, children }) {
  return (
    <div className="ipd-card">
      <div className="ipd-card__head">
        <h2 className="ipd-card__title">{title}</h2>
      </div>
      <div className="ipd-card__body">{children}</div>
    </div>
  );
}

function Kv({ label, value }) {
  return (
    <>
      <span className="ipd-kv__label">{label}</span>
      <span className="ipd-kv__value">{value ?? '—'}</span>
    </>
  );
}

export default function IpdPatientDetailPage() {
  const { admissionId } = useParams();
  const navigate = useNavigate();
  const { data, isLoading, isError, error, refetch } =
    useIpdAdmissionDetailQuery(admissionId);

  const admission = data?.admission;
  const visits = data?.doctor_visits ?? [];
  const bills = data?.bills ?? [];
  const running = data?.running_bill;

  return (
    <div className="ipd-page">
      <IpdPageHeader
        title="Patient Detail"
        subtitle={
          admission
            ? `${admission.admission_no || `Admission #${admissionId}`} · ${admission.patient_name || ''}`
            : admissionId
              ? `Admission #${admissionId}`
              : 'IPD stay overview'
        }
        actions={
          <div className="ipd-form-actions">
            {admission?.status === 'admitted' ? (
              <>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() =>
                    navigate(
                      ROUTES.IPD_BILL_PREVIEW.replace(':admissionId', String(admissionId))
                    )
                  }
                >
                  Billing
                </Button>
                <Button
                  type="button"
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
              onClick={() => navigate(ROUTES.IPD_PATIENTS)}
            >
              Back to list
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
        <div className="ipd-section-stack">
          <div className="ipd-skeleton" style={{ height: '6rem' }} />
          <div className="ipd-skeleton" style={{ height: '6rem' }} />
        </div>
      ) : !admission ? (
        <EmptyState
          title="Admission not found"
          description="This admission may have been removed or you may not have access."
        />
      ) : (
        <div className="ipd-section-stack">
          <div className="ipd-detail-grid">
            <DetailSection title="Patient Summary">
              <div className="ipd-kv">
                <Kv label="Name" value={admission.patient_name} />
                <Kv label="UHID" value={admission.patient_uid} />
                <Kv label="Status" value={<IpdStatusBadge status={admission.status} />} />
              </div>
            </DetailSection>
            <DetailSection title="Admission Information">
              <div className="ipd-kv">
                <Kv label="Admission No." value={admission.admission_no} />
                <Kv label="Doctor" value={admission.doctor_name} />
                <Kv label="Department" value={admission.department_name} />
                <Kv label="Diagnosis" value={admission.diagnosis} />
                <Kv label="Notes" value={admission.notes} />
                <Kv label="Admitted" value={formatIpdDateTime(admission.admitted_at)} />
              </div>
            </DetailSection>
            <DetailSection title="Current Bed">
              <div className="ipd-kv">
                <Kv label="Ward" value={admission.ward_name} />
                <Kv label="Bed" value={admission.bed_number} />
              </div>
            </DetailSection>
            <DetailSection title="Length of Stay">
              <div className="ipd-kv">
                <Kv
                  label="Days"
                  value={
                    admission.length_of_stay_days != null
                      ? `${admission.length_of_stay_days} day(s)`
                      : '—'
                  }
                />
                <Kv
                  label="Discharged"
                  value={
                    admission.discharged_at
                      ? formatIpdDateTime(admission.discharged_at)
                      : 'Still admitted'
                  }
                />
              </div>
            </DetailSection>
          </div>

          <DetailSection title="Doctor Visits">
            {visits.length === 0 ? (
              <EmptyState
                title="No doctor visits"
                description="Visit charges recorded against this stay will appear here."
              />
            ) : (
              <div className="ipd-table-wrap">
                <table className="ipd-table">
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
                        <td>{formatIpdMoney(visit.charge)}</td>
                        <td>{visit.notes || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </DetailSection>

          <DetailSection title="Billing Summary">
            <ChargeTable
              rows={running?.items ?? []}
              emptyTitle="No running charges"
              emptyDescription="Bed-day and visit charges will appear once the stay is active."
            />
            <BillSummary
              subtotal={formatIpdMoney(running?.subtotal)}
              tax={formatIpdMoney(running?.gst_amount)}
              total={formatIpdMoney(running?.grand_total)}
            />
            {bills.length > 0 ? (
              <div className="ipd-table-wrap" style={{ marginTop: '1rem' }}>
                <table className="ipd-table">
                  <thead>
                    <tr>
                      <th>Bill</th>
                      <th>Status</th>
                      <th>Total</th>
                      <th>Paid</th>
                      <th>Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bills.map((bill) => (
                      <tr key={bill.id}>
                        <td>
                          <Link
                            to={ROUTES.IPD_BILL_PREVIEW.replace(
                              ':admissionId',
                              String(admissionId)
                            )}
                          >
                            {bill.bill_number}
                          </Link>
                        </td>
                        <td>
                          <IpdStatusBadge status={bill.payment_status} />
                        </td>
                        <td>{formatIpdMoney(bill.grand_total)}</td>
                        <td>{formatIpdMoney(bill.paid_amount)}</td>
                        <td>{formatIpdMoney(bill.balance_due)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </DetailSection>

          <DetailSection title="Discharge Information">
            {admission.status === 'discharged' ? (
              <div className="ipd-kv">
                <Kv label="Discharged at" value={formatIpdDateTime(admission.discharged_at)} />
                <Kv label="Notes" value={admission.notes} />
              </div>
            ) : (
              <EmptyState
                title="Not discharged"
                description="Discharge details will appear after the stay is closed."
              />
            )}
          </DetailSection>
        </div>
      )}
    </div>
  );
}
