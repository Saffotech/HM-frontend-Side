/**
 * Charge line table for IPD billing / discharge.
 */

import { EmptyState } from '@/shared/components/common';
import { formatCurrency } from '@/shared/utils/formatCurrency';

export default function ChargeTable({
  rows = [],
  loading = false,
  emptyTitle = 'No charges yet',
  emptyDescription = 'Charges will appear here when billing is connected.',
  compact = false,
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
      <table className={`ipd-table${compact ? ' ipd-table--dense' : ''} ipd-table--charges`}>
        <thead>
          <tr>
            <th>Description</th>
            <th className="ipd-num">Qty</th>
            <th className="ipd-num">Unit</th>
            <th className="ipd-num">Amount</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id || `${row.description}-${row.amount}`}>
              <td>{row.description || '—'}</td>
              <td className="ipd-num">{row.qty ?? '—'}</td>
              <td className="ipd-num">
                {formatCurrency(row.unit_price, { empty: '—' })}
              </td>
              <td className="ipd-num ipd-num--strong">
                {formatCurrency(row.amount, { empty: '—' })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
