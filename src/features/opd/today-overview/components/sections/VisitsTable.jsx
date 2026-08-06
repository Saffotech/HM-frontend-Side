import { Link } from 'react-router-dom';
import { Badge, Button, StatusBadge } from '@/shared/components/common';
import { ROUTES } from '@/shared/constants';

export default function VisitsTable({ rows }) {
  return (
    <table className="data-table">
      <thead>
        <tr>
          <th>Visit No.</th>
          <th>Patient</th>
          <th>Doctor</th>
          <th className="col-optional">Visit Type</th>
          <th className="col-optional">Token</th>
          <th>Status</th>
          <th className="today-overview__col-action">Actions</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((visit) => (
          <tr key={visit.visitId}>
            <td>
              <span className="id-badge">#{visit.visitId}</span>
            </td>
            <td>
              <strong>{visit.patientName ?? '—'}</strong>
              {visit.patientUid ? <div className="text-muted">{visit.patientUid}</div> : null}
            </td>
            <td className="text-teal">{visit.doctorName ?? '—'}</td>
            <td className="col-optional">
              <Badge variant={visit.visitType === 'Walk-in' ? 'info' : 'default'}>
                {visit.visitType}
              </Badge>
            </td>
            <td className="col-optional">
              <span className="id-badge">{visit.tokenNumber ?? '—'}</span>
            </td>
            <td>
              <StatusBadge status={visit.status ?? 'Registered'} />
            </td>
            <td className="today-overview__col-action">
              <div className="today-overview__row-actions">
                {visit.patientUid ? (
                  <Link to={`/patients/${visit.patientUid}/profile`} className="profile-link-btn">
                    <Button variant="outline" size="sm">
                      View
                    </Button>
                  </Link>
                ) : null}
                {visit.billNumber ? (
                  <Link to={`${ROUTES.BILLING}/${visit.billNumber}`} className="profile-link-btn">
                    <Button variant="outline" size="sm">
                      View Bill
                    </Button>
                  </Link>
                ) : (
                  <Link to={ROUTES.BILLING_OPD_NEW} className="profile-link-btn">
                    <Button size="sm">Generate Bill</Button>
                  </Link>
                )}
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
