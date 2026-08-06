/**
 * Running bills list — live `/ipd/billing/running`.
 */

import { useNavigate } from 'react-router-dom';
import { EmptyState, QueryFeedback } from '@/shared/components/common';
import { ROUTES } from '@/shared/constants';
import IpdPageHeader from '@/features/ipd/components/IpdPageHeader';
import { useIpdPermissionSet } from '@/features/ipd/hooks/useIpdPermission';
import IpdPermissionButton from '@/features/ipd/components/IpdPermissionButton';
import { useIpdRunningBillsQuery } from '@/features/ipd/hooks/useIpdQuery';
import { formatIpdMoney } from '@/features/ipd/utils/ipdFormat';

export default function IpdBillingPage() {
  const navigate = useNavigate();
  const { canViewBilling } = useIpdPermissionSet();
  const { data, isLoading, isError, error, refetch } = useIpdRunningBillsQuery();

  const rows = (data?.items ?? []).map((item) => {
    const admission = item.admission ?? {};
    return {
      id: admission.id,
      admission_no: admission.admission_no,
      patient_name: admission.patient_name,
      ward: admission.ward_name,
      bed: admission.bed_number,
      days: admission.length_of_stay_days,
      balance: item.balance,
      running_total: item.running_total,
      open_bill_id: item.open_bill_id,
    };
  });

  return (
    <div className="ipd-page">
      <IpdPageHeader
        title="Running Bills"
        subtitle="Open IPD stays with outstanding charges"
      />

      <div className="ipd-card">
        <div className="ipd-card__head">
          <h2 className="ipd-card__title">Bill list</h2>
        </div>
        {isError ? (
          <div className="ipd-card__body">
            <QueryFeedback isError error={error} onRetry={refetch} />
          </div>
        ) : isLoading ? (
          <div className="ipd-card__body" style={{ display: 'grid', gap: '0.5rem' }}>
            <div className="ipd-skeleton" />
            <div className="ipd-skeleton" />
          </div>
        ) : rows.length === 0 ? (
          <div className="ipd-card__body">
            <EmptyState
              title="No running bills"
              description="Admitted patients with open charges will appear here."
            />
          </div>
        ) : (
          <div className="ipd-table-wrap">
            <table className="ipd-table">
              <thead>
                <tr>
                  <th>Admission</th>
                  <th>Patient</th>
                  <th>Ward / Bed</th>
                  <th>Days</th>
                  <th>Running total</th>
                  <th>Balance</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.admission_no || row.id}</td>
                    <td>{row.patient_name || '—'}</td>
                    <td>
                      {row.ward || '—'} / {row.bed || '—'}
                    </td>
                    <td>{row.days ?? '—'}</td>
                    <td>{formatIpdMoney(row.running_total)}</td>
                    <td>{formatIpdMoney(row.balance)}</td>
                    <td>
                      <IpdPermissionButton
                        allowed={canViewBilling}
                        type="button"
                        className="btn btn--secondary btn--sm"
                        onClick={() =>
                          navigate(
                            ROUTES.IPD_BILL_PREVIEW.replace(
                              ':admissionId',
                              String(row.id)
                            )
                          )
                        }
                      >
                        Preview
                      </IpdPermissionButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
