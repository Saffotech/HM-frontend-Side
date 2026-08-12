/**
 * Bills list — live `/ipd/billing/running`.
 */

import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { EmptyState, QueryFeedback } from '@/shared/components/common';
import { ROUTES } from '@/shared/constants';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';
import IpdPageHeader from '@/features/ipd/components/IpdPageHeader';
import { useIpdPermissionSet } from '@/features/ipd/hooks/useIpdPermission';
import IpdPermissionButton from '@/features/ipd/components/IpdPermissionButton';
import { useIpdRunningBillsQuery } from '@/features/ipd/hooks/useIpdQuery';
import { formatIpdMoney } from '@/features/ipd/utils/ipdFormat';

export default function IpdBillingPage() {
  const navigate = useNavigate();
  const { canViewBilling } = useIpdPermissionSet();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);
  const { data, isLoading, isError, error, refetch } = useIpdRunningBillsQuery();

  const rows = useMemo(() => {
    const mapped = (data?.items ?? []).map((item) => {
      const admission = item.admission ?? {};
      const total = Number(item.running_total ?? 0);
      const dueBalance = Math.max(0, Number(item.balance ?? 0));
      const paidRaw = Number(
        item.paid_amount != null
          ? item.paid_amount
          : Math.max(0, total - dueBalance),
      );
      // Keep Total = Paid Balance + Due Balance (cap paid if historical overpay)
      const paidBalance = Math.min(Math.max(0, paidRaw), total);
      return {
        id: admission.id,
        admission_no: admission.admission_no,
        patient_name: admission.patient_name,
        ward: admission.ward_name,
        bed: admission.bed_number,
        days: admission.length_of_stay_days,
        total,
        paid_balance: paidBalance,
        due_balance: dueBalance,
        open_bill_id: item.open_bill_id,
      };
    });

    const q = debouncedSearch.trim().toLowerCase();
    if (!q) return mapped;

    return mapped.filter((row) => {
      const hay = [
        row.admission_no,
        row.id,
        row.patient_name,
        row.ward,
        row.bed,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [data?.items, debouncedSearch]);

  return (
    <div className="ipd-page">
      <IpdPageHeader
        title="Bills"
        subtitle="Open IPD stays with outstanding charges"
      />

      <div className="ipd-card">
        <div className="ipd-card__head ipd-billing-card__head">
          <h2 className="ipd-card__title">Bill list</h2>
          <div className="ipd-toolbar__field ipd-billing-search">
            <input
              id="ipd-billing-search"
              className="ipd-input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search patient, admission, ward…"
              aria-label="Search bills"
            />
          </div>
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
        ) : (
          <div className="ipd-table-wrap">
            <table className="ipd-table">
              <thead>
                <tr>
                  <th>Admission</th>
                  <th>Patient</th>
                  <th>Ward / Bed</th>
                  <th>Days</th>
                  <th>Total</th>
                  <th>Paid Balance</th>
                  <th>Due Balance</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={8}>
                      <EmptyState
                        title={
                          debouncedSearch.trim()
                            ? 'No matching bills'
                            : 'No bills'
                        }
                        description={
                          debouncedSearch.trim()
                            ? 'Try a different patient, admission, or ward.'
                            : 'Admitted patients with open charges will appear here.'
                        }
                      />
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr key={row.id}>
                      <td>{row.admission_no || row.id}</td>
                      <td>{row.patient_name || '—'}</td>
                      <td>
                        {row.ward || '—'} / {row.bed || '—'}
                      </td>
                      <td>{row.days ?? '—'}</td>
                      <td>{formatIpdMoney(row.total)}</td>
                      <td>{formatIpdMoney(row.paid_balance)}</td>
                      <td>{formatIpdMoney(row.due_balance)}</td>
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
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
