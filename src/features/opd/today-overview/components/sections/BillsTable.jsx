import { Link } from 'react-router-dom';
import { Button, MoneyAmount, StatusBadge } from '@/shared/components/common';
import { ROUTES } from '@/shared/constants';

export default function BillsTable({ rows, onCollect }) {
  return (
    <table className="data-table">
      <thead>
        <tr>
          <th>Bill No.</th>
          <th>Patient</th>
          <th className="col-money">Amount</th>
          <th className="col-money col-optional">Paid</th>
          <th className="col-money">Balance</th>
          <th>Status</th>
          <th className="today-overview__col-action">Actions</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((bill) => (
          <tr key={bill.id}>
            <td>
              <span className="id-badge">{bill.id}</span>
            </td>
            <td>
              <strong>{bill.patientName ?? '—'}</strong>
              {bill.patientUid ? <div className="text-muted">{bill.patientUid}</div> : null}
            </td>
            <td className="col-money">
              <MoneyAmount amount={bill.total} strong />
            </td>
            <td className="col-money col-optional text-green">
              <MoneyAmount amount={bill.paid} />
            </td>
            <td className={`col-money ${Number(bill.balance) > 0 ? 'text-red' : 'text-green'}`}>
              <MoneyAmount amount={bill.balance} />
            </td>
            <td>
              <StatusBadge status={bill.status} />
            </td>
            <td className="today-overview__col-action">
              <div className="today-overview__row-actions">
                <Link to={`${ROUTES.BILLING}/${bill.id}`} className="profile-link-btn">
                  <Button variant="outline" size="sm">
                    View Bill
                  </Button>
                </Link>
                {Number(bill.balance ?? 0) > 0.01 ? (
                  <Button variant="success" size="sm" onClick={() => onCollect(bill.id)}>
                    Collect
                  </Button>
                ) : null}
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
