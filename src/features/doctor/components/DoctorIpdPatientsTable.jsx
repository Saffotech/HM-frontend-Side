import { memo } from 'react';
import { formatAppointmentTimeDisplay } from '@/features/doctor/utils/doctorDates';
import { appointmentToPatientSummary } from '@/shared/api/mappers/doctorPatientMapper';
import { TablePagination } from '@/shared/components/common';
import Skeleton from '@/shared/components/common/Skeleton';
import StatusPill from './StatusPill';
import AppointmentRowActions from './AppointmentRowActions';

function formatIpdDate(row) {
  const raw = row.admittedAt ?? row.scheduledAt ?? row.date;
  if (!raw) return '—';
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return String(raw);
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatWardBed(row) {
  const ward = row.wardName?.trim();
  const bed = row.bedNumber?.trim();
  if (ward && bed) return `${ward} / ${bed}`;
  return ward || bed || '—';
}

function IpdTableSkeleton({ showActions, showWardBedColumn }) {
  return (
    <div className="table-wrap" aria-busy="true" aria-label="Loading IPD patients">
      <table
        className={`data-table doc-dashboard-table doc-dashboard-table--loading${
          showActions ? ' doc-dashboard-table--with-actions' : ''
        }`}
      >
        <thead>
          <tr>
            <th scope="col">Patient ID</th>
            <th scope="col">Patient Name</th>
            {showWardBedColumn ? <th scope="col">Ward / Bed No</th> : null}
            <th scope="col">Date</th>
            <th scope="col">Status</th>
            {showActions ? (
              <th scope="col" className="doc-dashboard-table__th-actions">
                Actions
              </th>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 4 }).map((_, index) => (
            <tr key={index} className="doc-dashboard-table__row doc-dashboard-table__row--skeleton">
              <td><Skeleton height={14} width="70%" /></td>
              <td><Skeleton height={14} width="85%" /></td>
              {showWardBedColumn ? <td><Skeleton height={14} width={88} /></td> : null}
              <td><Skeleton height={14} width={72} /></td>
              <td><Skeleton height={22} width={72} /></td>
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

function DoctorIpdPatientsTable({
  title = 'IPD Patients',
  emptyMessage = 'No IPD patients match these filters.',
  headerActions,
  titleExtra,
  headerEnd,
  rows = [],
  isLoading = false,
  page = 1,
  pageSize = 20,
  total = 0,
  onPageChange,
  onOpenPatient,
  showActions = false,
  showWardBedColumn = false,
  onConsult,
  startingConsult = false,
}) {
  const showEmpty = !isLoading && rows.length === 0;
  const columnCount = 4 + (showWardBedColumn ? 1 : 0) + (showActions ? 1 : 0);

  return (
    <div className="doc-card doc-card__body--flush">
      <div className="doc-card__head doc-queue-card__head">
        <div className="doc-queue-card__title-group">
          <h3 className="doc-card__title">{title}</h3>
          {titleExtra}
        </div>
        {headerActions ? (
          <div className="doc-queue-card__actions">{headerActions}</div>
        ) : null}
        {headerEnd ? (
          <div className="doc-queue-card__head-end">{headerEnd}</div>
        ) : null}
      </div>

      {isLoading ? (
        <IpdTableSkeleton showActions={showActions} showWardBedColumn={showWardBedColumn} />
      ) : (
        <>
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
                  {showWardBedColumn ? <th scope="col">Ward / Bed No</th> : null}
                  <th scope="col">Date</th>
                  <th scope="col">Status</th>
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
                  rows.map((row) => {
                    const patient = appointmentToPatientSummary(row);
                    return (
                      <tr
                        key={row.id}
                        className="doc-dashboard-table__row"
                        tabIndex={0}
                        role="button"
                        aria-label={`Open profile for ${row.patientName}`}
                        onClick={() => onOpenPatient?.(patient)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            onOpenPatient?.(patient);
                          }
                        }}
                      >
                        <td className="doc-dashboard-table__patient-id">
                          {row.patientUid ?? row.patientId ?? '—'}
                        </td>
                        <td className="doc-dashboard-table__patient-name-cell">
                          <strong>{row.patientName}</strong>
                          {!showWardBedColumn && (row.wardName || row.bedNumber) ? (
                            <span className="doc-dashboard-table__ipd-meta">
                              {[row.wardName, row.bedNumber ? `Bed ${row.bedNumber}` : null]
                                .filter(Boolean)
                                .join(' · ')}
                            </span>
                          ) : null}
                        </td>
                        {showWardBedColumn ? (
                          <td className="doc-dashboard-table__ward-bed">
                            {formatWardBed(row)}
                          </td>
                        ) : null}
                        <td className="doc-dashboard-table__time">
                          <time dateTime={row.admittedAt ?? row.scheduledAt}>
                            {formatIpdDate(row)}
                            {row.time ? (
                              <span className="doc-dashboard-table__ipd-time">
                                {formatAppointmentTimeDisplay(row.time)}
                              </span>
                            ) : null}
                          </time>
                        </td>
                        <td className="doc-dashboard-table__appt-status">
                          <StatusPill status={row.status} />
                        </td>
                        {showActions ? (
                          <td
                            className="doc-dashboard-table__actions"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <AppointmentRowActions
                              appointment={row}
                              patient={patient}
                              mode="consult"
                              allowIpdConsult
                              onConsult={onConsult}
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
          {total > pageSize ? (
            <div className="doc-dashboard-table__pagination">
              <TablePagination
                totalPages={Math.max(1, Math.ceil(total / pageSize))}
                page={page}
                pageSize={pageSize}
                totalItems={total}
                onPageChange={onPageChange}
                itemLabel="patients"
              />
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

export default memo(DoctorIpdPatientsTable);
