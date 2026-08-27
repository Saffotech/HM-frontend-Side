import { Stethoscope } from 'lucide-react';
import { useDoctorPatientVisitsForPatientQuery } from '@/features/doctor/hooks/useDoctorPatientQuery';
import { useDoctorPermission, DOCTOR_PERMISSIONS } from '@/features/doctor/hooks/useDoctorPermission';

function formatVisitTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString();
}

function visitDepartment(visit) {
  return (
    visit?.department_name
    || visit?.department
    || visit?.specialization
    || '—'
  );
}

/**
 * Nurse-recorded doctor visits on the patient history profile.
 * Pass IPD `admissions` so visits across the stay are loaded (API is day-scoped).
 */
export default function DoctorPatientVisitsPanel({
  patientId,
  patientUid,
  admissions = null,
  className = '',
}) {
  const canView = useDoctorPermission(DOCTOR_PERMISSIONS.patientVisitsView);
  const { data, isPending, isError } = useDoctorPatientVisitsForPatientQuery(
    patientId,
    patientUid,
    { enabled: canView, admissions },
  );

  if (!canView) return null;

  const visits = data?.visits ?? [];
  const panelClass = ['doc-card', 'doc-profile-panel', 'doc-profile-panel--visits', className]
    .filter(Boolean)
    .join(' ');

  return (
    <section className={panelClass}>
      <div className="doc-profile-panel__head">
        <h3 className="doc-profile-panel__title">
          <Stethoscope size={16} aria-hidden />
          Doctor Visits
          {visits.length > 0 ? (
            <span className="doc-profile-panel__count">{visits.length}</span>
          ) : null}
        </h3>
      </div>

      {isPending ? (
        <p className="text-muted doc-profile-empty">Loading doctor visits...</p>
      ) : isError ? (
        <p className="text-muted doc-profile-empty">Could not load doctor visits.</p>
      ) : visits.length === 0 ? (
        <p className="text-muted doc-profile-empty">No doctor visits recorded for this patient.</p>
      ) : (
        <div className="table-wrap doc-profile-visits-table-wrap">
          <table className="data-table doc-profile-visits-table">
            <thead>
              <tr>
                <th scope="col">Visited at</th>
                <th scope="col">Doctor</th>
                <th scope="col">Department</th>
                <th scope="col">Visit #</th>
                <th scope="col">Recorded by</th>
                <th scope="col">Notes</th>
              </tr>
            </thead>
            <tbody>
              {visits.map((visit) => (
                <tr key={visit.id}>
                  <td>{formatVisitTime(visit.visited_at)}</td>
                  <td>{visit.doctor_name || '—'}</td>
                  <td>{visitDepartment(visit)}</td>
                  <td>{visit.visit_number ?? '—'}</td>
                  <td>{visit.recorded_by_name || '—'}</td>
                  <td className="doc-profile-visits-table__notes">{visit.notes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
