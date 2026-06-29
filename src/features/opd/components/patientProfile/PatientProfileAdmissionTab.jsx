import { StatusBadge } from '@/shared/components/common';

export default function PatientProfileAdmissionTab({
  patientBeds,
  lb,
  eb,
  errB,
}) {
  return (
    <div className="pp-section">
      <h3 className="pp-section__title">Bed & Admission</h3>
      {lb ? (
        <p className="pp-placeholder">Loading admission records…</p>
      ) : eb ? (
        <p className="pp-placeholder">{errB?.message ?? 'Could not load beds.'}</p>
      ) : patientBeds.length === 0 ? (
        <p className="pp-placeholder">No admission records.</p>
      ) : (
        <div className="pp-table-wrap">
          <table className="data-table pp-table">
            <thead>
              <tr>
                <th>Bed</th>
                <th>Ward</th>
                <th>Department</th>
                <th>Admitted</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {patientBeds.map((bed) => (
                <tr key={bed.bedNo}>
                  <td><strong>{bed.bedNo}</strong></td>
                  <td><span className="pp-tag pp-tag--sm">{bed.ward}</span></td>
                  <td>{bed.department || '—'}</td>
                  <td className="text-muted">{bed.admittedDate || '—'}</td>
                  <td><StatusBadge status={bed.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
