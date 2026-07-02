import { memo } from 'react';
import { formatAppointmentTimeDisplay } from '@/features/doctor/utils/doctorDates';
import { getDoctorDisplayStatus } from '@/features/doctor/utils/appointmentWorkflow';
import { appointmentToPatientSummary } from '@/shared/api/mappers/doctorPatientMapper';
import Skeleton from '@/shared/components/common/Skeleton';
import StatusPill from './StatusPill';
import AppointmentRowActions from './AppointmentRowActions';

const TABLE_SKELETON_ROWS = 4;

function DashboardTableSkeleton({ showActions }) {
  return (
    <div className="table-wrap" aria-busy="true" aria-label="Loading appointments">
      <table
        className={`data-table doc-dashboard-table doc-dashboard-table--loading${
          showActions ? ' doc-dashboard-table--with-actions' : ''
        }`}
      >
        <thead>
          <tr>
            <th scope="col">Patient ID</th>
            <th scope="col">Patient Name</th>
            <th scope="col">Time</th>
            <th scope="col">Appointment Status</th>
            {showActions ? (
              <th scope="col" className="doc-dashboard-table__th-actions">
                Actions
              </th>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: TABLE_SKELETON_ROWS }).map((_, index) => (
            <tr key={index} className="doc-dashboard-table__row doc-dashboard-table__row--skeleton">
              <td><Skeleton height={14} width="70%" /></td>
              <td><Skeleton height={14} width="85%" /></td>
              <td><Skeleton height={14} width={56} /></td>
              <td><Skeleton height={22} width={88} /></td>
              {showActions ? (
                <td><Skeleton height={30} width={72} /></td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DashboardAppointmentsTable({
  title = 'Patient Queue',
  emptyMessage = 'No patients scheduled for today.',
  headerActions,
  filteredAppointments,
  showActions = false,
  actionMode = 'waiting',
  isLoading = false,
  startingConsult,
  onBeginConsultation,
  onOpenPatient,
  onPrescribe,
  onOpenNotes,
}) {
  const showEmpty = !isLoading && filteredAppointments.length === 0;
  const columnCount = showActions ? 5 : 4;

  return (
    <div className="doc-card doc-card__body--flush">
      <div className="doc-card__head doc-queue-card__head">
        <h3 className="doc-card__title">{title}</h3>
        {headerActions ? (
          <div className="doc-queue-card__actions">{headerActions}</div>
        ) : null}
      </div>
      {isLoading ? (
        <DashboardTableSkeleton showActions={showActions} />
      ) : (
        <div className="table-wrap">
          <table
            className={`data-table doc-dashboard-table${
              showActions ? ' doc-dashboard-table--with-actions' : ''
            }`}
          >
            <thead>
              <tr>
                <th scope="col">Patient ID</th>
                <th scope="col">Patient Name</th>
                <th scope="col">Time</th>
                <th scope="col">Appointment Status</th>
                {showActions ? (
                  <th scope="col" className="doc-dashboard-table__th-actions">
                    Actions
                  </th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {showEmpty ? (
                <tr>
                  <td colSpan={columnCount} className="doc-dashboard-table__empty">
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                filteredAppointments.map((a) => {
                  const statusLabel = getDoctorDisplayStatus(a);
                  const patient = appointmentToPatientSummary(a);
                  return (
                    <tr
                      key={a.id}
                      className="doc-dashboard-table__row"
                      tabIndex={0}
                      role="button"
                      aria-label={`Open profile for ${a.patientName}`}
                      onClick={() => onOpenPatient?.(patient)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onOpenPatient?.(patient);
                        }
                      }}
                    >
                      <td className="doc-dashboard-table__patient-id">
                        {a.patientUid ?? a.patientId ?? '—'}
                      </td>
                      <td className="doc-dashboard-table__patient-name-cell">
                        {a.patientName}
                      </td>
                      <td className="doc-dashboard-table__time">
                        <time dateTime={a.time}>{formatAppointmentTimeDisplay(a.time)}</time>
                      </td>
                      <td className="doc-dashboard-table__appt-status">
                        <StatusPill status={statusLabel} />
                      </td>
                      {showActions ? (
                        <td
                          className="doc-dashboard-table__actions"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <AppointmentRowActions
                              appointment={a}
                              patient={patient}
                              mode={actionMode}
                              onConsult={onBeginConsultation}
                              onEmr={() => onOpenPatient?.(patient)}
                              onPrescribe={onPrescribe}
                              onNotes={onOpenNotes}
                              disabled={startingConsult}
                            />
                        </td>
                      ) : null}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default memo(DashboardAppointmentsTable);
