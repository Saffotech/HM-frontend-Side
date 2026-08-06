import { Link } from 'react-router-dom';
import { Clock } from 'lucide-react';
import { Button, StatusBadge } from '@/shared/components/common';

export default function AppointmentsTable({ rows }) {
  return (
    <table className="data-table">
      <thead>
        <tr>
          <th>Time</th>
          <th>Patient</th>
          <th>Doctor</th>
          <th className="col-optional">Department</th>
          <th>Status</th>
          <th className="today-overview__col-action">Actions</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((appt) => {
          const uid = appt.patientUid ?? appt.patientId;
          return (
            <tr key={appt.id}>
              <td>
                <span className="time-pill">
                  <Clock size={12} aria-hidden />
                  {appt.time ?? '—'}
                </span>
              </td>
              <td>
                <strong>{appt.patientName ?? '—'}</strong>
                {uid ? <div className="text-muted">{uid}</div> : null}
              </td>
              <td className="text-teal">{appt.doctorName ?? '—'}</td>
              <td className="col-optional">{appt.deptName ?? '—'}</td>
              <td>
                <StatusBadge status={appt.status ?? 'Scheduled'} />
              </td>
              <td className="today-overview__col-action">
                {uid ? (
                  <Link to={`/patients/${uid}/profile`} className="profile-link-btn">
                    <Button variant="outline" size="sm">
                      View
                    </Button>
                  </Link>
                ) : (
                  <span className="text-muted">—</span>
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
