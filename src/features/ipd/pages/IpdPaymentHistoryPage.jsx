/**
 * IPD payment history — live `/ipd/payments/history`.
 */

import { useState } from 'react';
import { EmptyState, QueryFeedback } from '@/shared/components/common';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';
import IpdPageHeader from '@/features/ipd/components/IpdPageHeader';
import { useIpdPaymentHistoryQuery } from '@/features/ipd/hooks/useIpdQuery';
import {
  formatIpdDateTime,
  formatIpdMoney,
} from '@/features/ipd/utils/ipdFormat';

export default function IpdPaymentHistoryPage() {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);
  const { data, isLoading, isError, error, refetch } = useIpdPaymentHistoryQuery({
    search: debouncedSearch,
  });
  const rows = data?.items ?? [];

  return (
    <div className="ipd-page">
      <IpdPageHeader
        title="Payment History"
        subtitle="Settled IPD bills and receipts"
      />

      <div className="ipd-card">
        <div className="ipd-card__body">
          <div className="ipd-toolbar">
            <div className="ipd-toolbar__field">
              <label className="ipd-toolbar__label" htmlFor="ipd-ph-search">
                Search
              </label>
              <input
                id="ipd-ph-search"
                className="ipd-input"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Receipt, patient, admission…"
              />
            </div>
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
        ) : rows.length === 0 ? (
          <div className="ipd-card__body">
            <EmptyState
              title="No payments yet"
              description="Collected IPD payments will appear here."
            />
          </div>
        ) : (
          <div className="ipd-table-wrap">
            <table className="ipd-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Receipt</th>
                  <th>Patient</th>
                  <th>Admission</th>
                  <th>Bill</th>
                  <th>Mode</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>{formatIpdDateTime(row.paid_at)}</td>
                    <td>{row.receipt_no || '—'}</td>
                    <td>
                      <strong>{row.patient_name || '—'}</strong>
                      {row.patient_uid ? (
                        <div className="ipd-page__subtitle">{row.patient_uid}</div>
                      ) : null}
                    </td>
                    <td>{row.admission_no || row.admission_id || '—'}</td>
                    <td>{row.bill_number || '—'}</td>
                    <td>{row.mode || '—'}</td>
                    <td>{formatIpdMoney(row.amount)}</td>
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
