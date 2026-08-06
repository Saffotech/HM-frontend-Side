/**
 * Charge line table for IPD billing / discharge.
 * Renders empty state when there are no rows.
 */

import { EmptyState } from '@/shared/components/common';

export default function ChargeTable({
  rows = [],
  loading = false,
  emptyTitle = 'No charges yet',
  emptyDescription = 'Charges will appear here when billing is connected.',
}) {
  if (loading) {
    return (
      <div className="ipd-card__body" style={{ display: 'grid', gap: '0.5rem' }}>
        <div className="ipd-skeleton" />
        <div className="ipd-skeleton" />
        <div className="ipd-skeleton" />
      </div>
    );
  }

  if (!rows.length) {
    return (
      <EmptyState title={emptyTitle} description={emptyDescription} />
    );
  }

  return (
    <div className="ipd-table-wrap">
      <table className="ipd-table">
        <thead>
          <tr>
            <th>Description</th>
            <th>Qty</th>
            <th>Unit</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id || `${row.description}-${row.amount}`}>
              <td>{row.description || '—'}</td>
              <td>{row.qty ?? '—'}</td>
              <td>{row.unit_price != null ? row.unit_price : '—'}</td>
              <td>{row.amount != null ? row.amount : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
