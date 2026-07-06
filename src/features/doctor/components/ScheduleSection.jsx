import { useMemo, useState } from 'react';
import { CalendarDays, Eye } from 'lucide-react';
import {
  useDoctorWeekAppointmentsQueries,
  useDoctorAppointmentsByDateQuery,
} from '@/features/doctor/hooks/useDoctorAppointmentQuery';
import {
  todayOpdDate,
  parseOpdDateString,
  compareAppointmentsByDateTime,
  uiDateToIsoInput,
  isoInputToUiDate,
} from '@/features/doctor/utils/doctorDates';
import { isCalendarVisible } from '@/features/doctor/utils/appointmentWorkflow';
import { appointmentToPatientSummary } from '@/shared/api/mappers/doctorPatientMapper';
import { Button, DateInput } from '@/shared/components/common';
import AppointmentDetailModal from './AppointmentDetailModal';
import PatientHistoryProfile from './PatientHistoryProfile';
import StatusPill from './StatusPill';
import { getDoctorDisplayStatus } from '@/features/doctor/utils/appointmentWorkflow';
import '../styles/doctor-ui.css';

function dedupeAppointments(items) {
  const seen = new Set();
  return items.filter((a) => {
    const key = a.dbId ?? a.id;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function weekdayLabel(uiDate) {
  return parseOpdDateString(uiDate).toLocaleDateString(undefined, { weekday: 'short' });
}

function dayOfMonth(uiDate) {
  return parseOpdDateString(uiDate).getDate();
}

export default function ScheduleSection() {
  const { days, byDate, isLoading: weekLoading, isError: weekError } =
    useDoctorWeekAppointmentsQueries(7);
  const today = todayOpdDate();
  const [selectedDay, setSelectedDay] = useState(today);
  const [viewAppointmentDbId, setViewAppointmentDbId] = useState(null);
  const [profilePatient, setProfilePatient] = useState(null);

  const weekDaySet = useMemo(() => new Set(days), [days]);

  const { data: dateAppointments = [], isLoading: dateLoading } =
    useDoctorAppointmentsByDateQuery(weekDaySet.has(selectedDay) ? null : selectedDay);

  const handleCustomDateChange = (isoValue) => {
    if (!isoValue) return;
    setSelectedDay(isoInputToUiDate(isoValue));
  };

  const selectedDayAppointments = useMemo(() => {
    const source = byDate[selectedDay] ?? dateAppointments;
    return dedupeAppointments(source.filter(isCalendarVisible)).sort(
      compareAppointmentsByDateTime
    );
  }, [selectedDay, byDate, dateAppointments]);

  const selectedDayLoading = weekDaySet.has(selectedDay) ? weekLoading : dateLoading;

  const loading = weekLoading;
  const error = weekError;

  if (profilePatient) {
    return (
      <PatientHistoryProfile
        patient={profilePatient}
        onBack={() => setProfilePatient(null)}
        backLabel="Back to Calendar"
      />
    );
  }

  return (
    <div className="doc-page doc-schedule">
      {error && (
        <p className="field__error doc-schedule__error">
          Could not load calendar — check that the backend is running.
        </p>
      )}
      <div className="doc-card doc-schedule__week-card">
        <div className="doc-card__head">
          <h3 className="doc-card__title">Week at a glance</h3>
        </div>
        <div className="doc-card__body">
          <div className="doc-week-toolbar">
            {loading ? (
              <p className="text-muted doc-week-toolbar__loading">Loading schedule…</p>
            ) : (
              <div className="doc-week-grid" role="tablist" aria-label="Select day">
                {days.slice(0, 7).map((d) => {
                  const count = (byDate[d] ?? []).filter(isCalendarVisible).length;
                  const isSelected = d === selectedDay;
                  const isToday = d === today;
                  return (
                    <button
                      key={d}
                      type="button"
                      role="tab"
                      aria-selected={isSelected}
                      className={`doc-week-day${isToday ? ' doc-week-day--today' : ''}${
                        isSelected ? ' doc-week-day--selected' : ''
                      }`}
                      onClick={() => setSelectedDay(d)}
                    >
                      <span className="doc-week-day__label">{weekdayLabel(d)}</span>
                      <span className="doc-week-day__num">{dayOfMonth(d)}</span>
                      <span className="doc-week-day__count">
                        {count} appt{count === 1 ? '' : 's'}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
            <div className="doc-week-date-picker">
              <CalendarDays size={14} aria-hidden className="doc-week-date-picker__icon" />
              <span className="doc-week-date-picker__label">Pick date</span>
              <DateInput
                className="doc-week-date-picker__date"
                value={uiDateToIsoInput(selectedDay)}
                onChange={(e) => handleCustomDateChange(e.target.value)}
                placeholder="Date"
              />
            </div>
          </div>
        </div>
      </div>
      <section className="doc-schedule__day-section">
        <h3 className="doc-schedule__day-title">
          {selectedDay === today ? 'Today' : weekdayLabel(selectedDay)} · {selectedDay}
        </h3>
        <ApptTable
          items={selectedDayAppointments}
          loading={selectedDayLoading}
          onOpenPatient={setProfilePatient}
          onView={(appt) => setViewAppointmentDbId(appt.dbId ?? appt.id)}
        />
      </section>

      <AppointmentDetailModal
        appointmentDbId={viewAppointmentDbId}
        open={viewAppointmentDbId != null}
        onClose={() => setViewAppointmentDbId(null)}
      />
    </div>
  );
}

function ApptTable({ items, loading, onOpenPatient, onView }) {
  if (loading) {
    return (
      <div className="doc-card doc-schedule__table-card">
        <p className="text-muted doc-schedule__empty">Loading appointments…</p>
      </div>
    );
  }
  if (!items.length) {
    return (
      <div className="doc-card doc-schedule__table-card">
        <p className="text-muted doc-schedule__empty">Nothing scheduled.</p>
      </div>
    );
  }
  return (
    <div className="doc-card doc-card__body--flush doc-schedule__table-card">
      <table className="data-table doc-schedule-table">
        <thead>
          <tr>
            <th>Time / Date</th>
            <th>Patient</th>
            <th>Reason</th>
            <th>Status</th>
            <th className="doc-schedule-table__actions-head">Action</th>
          </tr>
        </thead>
        <tbody>
          {items.map((a) => (
            <tr
              key={a.dbId ?? a.id}
              className="doc-schedule-row"
              tabIndex={0}
              role="button"
              aria-label={`Open profile for ${a.patientName}`}
              onClick={() => onOpenPatient?.(appointmentToPatientSummary(a))}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onOpenPatient?.(appointmentToPatientSummary(a));
                }
              }}
            >
              <td>
                {a.date} {a.time}
              </td>
              <td>
                <strong>{a.patientName}</strong>
              </td>
              <td>{a.reason || a.notes || '—'}</td>
              <td>
                <StatusPill status={getDoctorDisplayStatus(a)} />
              </td>
              <td className="doc-schedule-table__actions" onClick={(e) => e.stopPropagation()}>
                <Button
                  size="sm"
                  variant="outline"
                  className="doc-schedule-view-btn"
                  onClick={() => onView(a)}
                >
                  <Eye size={14} aria-hidden />
                  View
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
