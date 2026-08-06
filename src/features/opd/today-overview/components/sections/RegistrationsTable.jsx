import { Link } from 'react-router-dom';
import { Button, StatusBadge } from '@/shared/components/common';
import { formatAgeGender, formatClockTime } from '../../utils/todayOverviewUtils';

export default function RegistrationsTable({ rows }) {
  return (
    <table className="data-table">
      <thead>
        <tr>
          <th>UHID</th>
          <th>Patient Name</th>
          <th className="col-optional">Age / Gender</th>
          <th>Registered At</th>
          <th className="col-optional">Registered By</th>
          <th>Status</th>
          <th className="today-overview__col-action">Actions</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((patient) => (
          <tr key={patient.dbId ?? patient.id}>
            <td>
              <span className="id-badge">{patient.id ?? '—'}</span>
            </td>
            <td>
              <strong>{patient.name ?? '—'}</strong>
              {patient.phone ? <div className="text-muted">{patient.phone}</div> : null}
            </td>
            <td className="col-optional">{formatAgeGender(patient.age, patient.gender)}</td>
            <td className="today-overview__col-time">{formatClockTime(patient.createdAt)}</td>
            <td className="col-optional text-muted">{patient.registeredBy ?? '—'}</td>
            <td>
              <StatusBadge status={patient.status ?? 'active'} />
            </td>
            <td className="today-overview__col-action">
              {patient.id ? (
                <Link to={`/patients/${patient.id}/profile`} className="profile-link-btn">
                  <Button variant="outline" size="sm">
                    View Patient
                  </Button>
                </Link>
              ) : (
                <span className="text-muted">—</span>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
