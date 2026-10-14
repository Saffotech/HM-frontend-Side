import { Link, useNavigate } from 'react-router-dom';
import { Plus, ExternalLink } from 'lucide-react';
import { Button, StatusBadge, MoneyAmount, TablePagination } from '@/shared/components/common';
import { ROUTES } from '@/shared/constants';
import { BILLS_PAGE_SIZE } from '@/shared/hooks/queries/useBillingQuery';

export default function PatientProfileBillingTab({
  id,
  patientBills,
  billPageMeta,
  setBillPage,
  lbi,
  ebi,
  errBi,
}) {
  const navigate = useNavigate();

  return (
    <div className="pp-section">
      <div className="pp-section__head">
        <h3 className="pp-section__title">Billing History</h3>
        <Link to={`${ROUTES.BILLING_OPD_NEW}?patientId=${id}`}>
          <Button size="sm" variant="outline"><Plus size={14} /> New Bill</Button>
        </Link>
      </div>
      {lbi ? (
        <p className="pp-placeholder">Loading bills…</p>
      ) : ebi ? (
        <p className="pp-placeholder">{errBi?.message ?? 'Could not load bills.'}</p>
      ) : (
      <div className="pp-table-wrap">
        <table className="data-table pp-table data-table--stack">
          <thead>
            <tr>
              <th>Bill</th>
              <th>Date</th>
              <th className="col-money">Total</th>
              <th className="col-money">Paid</th>
              <th className="col-money">Due</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {patientBills.map((b) => (
              <tr
                key={b.id}
                className="pp-table__row"
                onClick={() => navigate(`${ROUTES.BILLING}/${b.id}`)}
              >
                <td data-label="Bill"><span className="id-badge">{b.id}</span></td>
                <td className="text-muted" data-label="Date">{b.date.split(' ').slice(0, 2).join(' ')}</td>
                <td className="col-money" data-label="Total"><MoneyAmount amount={b.total} strong /></td>
                <td className="col-money text-green" data-label="Paid">
                  <MoneyAmount amount={b.paid} strong />
                </td>
                <td className={`col-money ${b.balance > 0 ? 'text-red' : ''}`} data-label="Due">
                  <MoneyAmount amount={b.balance} strong />
                </td>
                <td data-label="Status"><StatusBadge status={b.status} /></td>
                <td className="pp-table__link" data-label="View">
                  <ExternalLink size={14} aria-hidden />
                </td>
              </tr>
            ))}
            {!patientBills.length && (
              <tr><td colSpan={7} className="empty-row">No bills</td></tr>
            )}
          </tbody>
        </table>
      </div>
      )}
      {!lbi && !ebi && (
        <TablePagination
          page={billPageMeta.page}
          totalPages={billPageMeta.totalPages}
          totalItems={billPageMeta.total}
          pageSize={BILLS_PAGE_SIZE}
          onPageChange={setBillPage}
        />
      )}
    </div>
  );
}
