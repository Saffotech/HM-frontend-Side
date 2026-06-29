import { Link } from 'react-router-dom';
import { useMemo } from 'react';
import { UserPlus, CalendarPlus, BedDouble, Receipt, Clock } from 'lucide-react';
import { usePatientsQuery, PATIENTS_PAGE_SIZE } from '@/shared/hooks/queries/usePatientQuery';
import { useTodayAppointmentsQuery } from '@/shared/hooks/queries/useAppointmentQuery';
import { useBedsQuery } from '@/shared/hooks/queries/useBedsQuery';
import { useOpdDashboardQuery } from '@/shared/hooks/queries/useOpdDashboardQuery';
import { Avatar, StatusBadge, QueryFeedback } from '@/shared/components/common';
import { ROUTES } from '@/shared/constants';
import './DashboardPage.css';

function normalizeBedStatus(status) {
  const s = String(status ?? '').toLowerCase();
  if (s === 'occupied') return 'Occupied';
  if (s === 'available') return 'Available';
  return status;
}

const BED_STATUS_WARDS = ['General', 'ICU', 'Private'];

function computeWardBedStats(beds) {
  return BED_STATUS_WARDS.map((wardName) => {
    const wardBeds = beds.filter(
      (bed) => String(bed.ward ?? '').toLowerCase() === wardName.toLowerCase(),
    );
    const occupied = wardBeds.filter(
      (bed) => normalizeBedStatus(bed.status) === 'Occupied',
    ).length;
    const total = wardBeds.length;
    const available = Math.max(0, total - occupied);
    const percent = total ? Math.round((occupied / total) * 100) : 0;
    return { ward: wardName, occupied, available, total, percent };
  });
}

export default function DashboardPage() {
  const { data: dashboard, isLoading: ld, isError: ed, error: errD } = useOpdDashboardQuery();
  const {
    data: todayApptPage,
    isLoading: la,
    isError: ea,
    error: errA,
  } = useTodayAppointmentsQuery();
  const { data: bedData, isLoading: lb, isError: eb, error: errB } = useBedsQuery();
  const {
    data: recentPage,
    isLoading: lp,
    isError: ep,
    error: errP,
  } = usePatientsQuery({ fetchAll: false, page: 1, limit: PATIENTS_PAGE_SIZE });
  const beds = bedData?.beds ?? [];
  const bedStats = bedData?.stats;
  const todaysAppts = todayApptPage?.appointments ?? [];
  const recentPatients = recentPage?.patients ?? [];

  const isLoading = ld || la || lb || lp;
  const isError = ed || ea || eb || ep;
  const error = errD || errA || errB || errP;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';
  const today = new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const occupiedBeds =
    bedStats?.occupied ?? beds.filter((b) => normalizeBedStatus(b.status) === 'Occupied').length;
  const availableBeds =
    dashboard?.bedsFree ?? bedStats?.available ?? beds.length - occupiedBeds;
  const wardBedStats = useMemo(() => computeWardBedStats(beds), [beds]);

  const stats = {
    patients: dashboard?.patientsTotal ?? recentPage?.total ?? recentPatients.length,
    appointmentsToday: dashboard?.appointmentsToday ?? todaysAppts.length,
    pendingBills: dashboard?.pendingBills ?? 0,
    bedsFree: availableBeds,
  };

  return (
    <QueryFeedback isLoading={isLoading} isError={isError} error={error}>
      <div className="dashboard stagger-reveal">
        <section className="dashboard-banner">
          <div>
            <h2 className="dashboard-banner__title">{greeting}, Billing Counter</h2>
            <p className="dashboard-banner__date">{today}</p>
          </div>
          <div className="dashboard-banner__chips">
            <span className="chip">
              <span className="chip__dot chip__dot--blue" />
              {stats.patients} Patients
            </span>
            <span className="chip">
              <span className="chip__dot chip__dot--purple" />
              {stats.appointmentsToday} Appointments Today
            </span>
            <span className="chip">
              <span className="chip__dot chip__dot--green" />
              {stats.bedsFree} Beds Free
            </span>
            <span className="chip">
              <span className="chip__dot chip__dot--amber" />
              {stats.pendingBills} Pending Bills
            </span>
          </div>
        </section>

        <div className="dashboard-grid">
          <div className="quick-actions">
            <QuickAction
              color="orange"
              icon={Receipt}
              title="Billing"
              desc="OPD visit bills & payments"
              href={ROUTES.BILLING}
              label="Open Billing"
            />
            <QuickAction
              color="blue"
              icon={UserPlus}
              title="Register Patient"
              desc="New patient + OPD visit bill"
              href={ROUTES.PATIENTS_REGISTER}
              label="Register"
            />
            <QuickAction
              color="teal"
              icon={CalendarPlus}
              title="Book Appointment"
              desc="Schedule a future appointment"
              href={ROUTES.APPOINTMENTS_BOOK}
              label="Book"
            />
            <QuickAction
              color="purple"
              icon={BedDouble}
              title="Assign Bed"
              desc="Allocate bed to patient"
              href={ROUTES.BEDS}
              label="Assign"
            />
            <BedStatusQuickAction wardStats={wardBedStats} href={ROUTES.BEDS} />
          </div>

          <div className="dashboard-panels">
            <div className="card dashboard-panels__appointments">
              <div className="card__header">
                <h3>Today&apos;s Appointments</h3>
                <Link to={ROUTES.APPOINTMENTS}>View All</Link>
              </div>
              <div className="table-wrap dashboard-table-wrap">
                <table className="data-table data-table--animated dashboard-appointments-table">
                  <thead>
                    <tr>
                      <th className="col-optional">#</th>
                      <th>Patient</th>
                      <th className="col-optional">Doctor</th>
                      <th>Time</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {todaysAppts.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="dashboard-empty-row">
                          No appointments scheduled for today.
                        </td>
                      </tr>
                    ) : (
                      todaysAppts.slice(0, 8).map((appt, i) => (
                        <tr key={appt.id}>
                          <td className="text-muted-num col-optional">{i + 1}</td>
                          <td>
                            <div className="dashboard-patient-cell">
                              <Avatar name={appt.patientName ?? 'Patient'} size={32} />
                              <div>
                                <div>{appt.patientName}</div>
                                {appt.patientUid && (
                                  <div className="text-muted dashboard-patient-cell__id">
                                    {appt.patientUid}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="text-teal col-optional">{appt.doctorName}</td>
                          <td>
                            <span className="time-pill">
                              <Clock size={12} />
                              {appt.time ?? '—'}
                            </span>
                          </td>
                          <td>
                            <StatusBadge status={appt.status} />
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <div className="card__footer">
                <Link to={ROUTES.APPOINTMENTS}>
                  View all scheduled appointments
                </Link>
              </div>
            </div>

            <div className="card dashboard-panels__recent">
              <div className="card__header">
                <h3>Recent Patients</h3>
                <Link to={ROUTES.PATIENTS}>See All</Link>
              </div>
              <div className="recent-patients">
                {recentPatients.length === 0 ? (
                  <p className="text-muted dashboard-empty-row">No patients registered yet.</p>
                ) : (
                  recentPatients.map((p) => {
                    const reg = p.registeredDate ?? '—';
                    const dateParts = String(reg).split(' ');
                    const dateLabel =
                      dateParts.length >= 2
                        ? `${dateParts[0]} ${dateParts[1]}`
                        : dateParts[0] ?? '—';
                    return (
                      <Link key={p.id} to={`/patients/${p.id}/profile`} className="recent-patient">
                        <Avatar name={p.name ?? 'Patient'} size={40} />
                        <div className="recent-patient__info">
                          <strong>{p.name}</strong>
                          <span>{p.phone}</span>
                        </div>
                        <div className="recent-patient__meta">
                          <span className="recent-patient__id">{p.id}</span>
                          <span className="recent-patient__date">{dateLabel}</span>
                        </div>
                      </Link>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </QueryFeedback>
  );
}

function BedStatusQuickAction({ wardStats, href }) {
  const totalOccupied = wardStats.reduce((sum, ward) => sum + ward.occupied, 0);
  const totalBeds = wardStats.reduce((sum, ward) => sum + ward.total, 0);

  return (
    <div className="quick-action quick-action--green ui-interactive bed-status-quick">
      <div className="quick-action__bar" />
      <div className="quick-action__body bed-status-quick__body">
        <div className="bed-status-quick__split">
          <div className="bed-status-quick__brand">
            <div className="quick-action__icon">
              <BedDouble size={22} />
            </div>
            <h3>Bed Status</h3>
          </div>
          <div className="bed-status-quick__wards" aria-label="Bed status by ward">
            <div className="bed-status-quick__ward-line bed-status-quick__ward-line--total">
              <span className="bed-status-quick__ward-label">Total</span>
              <span className="bed-status-quick__ward-ratio">
                {totalBeds ? `${totalOccupied}/${totalBeds}` : '—'}
              </span>
            </div>
            {wardStats.map((ward) => (
              <div
                key={ward.ward}
                className="bed-status-quick__ward"
                aria-label={
                  ward.total
                    ? `${ward.ward}: ${ward.occupied} occupied of ${ward.total} beds`
                    : `${ward.ward}: no beds`
                }
              >
                <div className="bed-status-quick__ward-line">
                  <span className="bed-status-quick__ward-label">{ward.ward}</span>
                  <span className="bed-status-quick__ward-ratio">
                    {ward.total ? `${ward.occupied}/${ward.total}` : '—'}
                  </span>
                </div>
                <div className="bed-bar bed-bar--compact" aria-hidden>
                  <div
                    style={{ width: `${ward.percent}%` }}
                    className="bed-bar__occupied"
                  />
                  <div
                    style={{ width: `${100 - ward.percent}%` }}
                    className="bed-bar__free"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
        <Link to={href} className="quick-action__btn bed-status-quick__btn">
          Manage
        </Link>
      </div>
    </div>
  );
}

function QuickAction({ color, icon: Icon, title, desc, href, label }) {
  return (
    <div className={`quick-action quick-action--${color} ui-interactive`}>
      <div className="quick-action__bar" />
      <div className="quick-action__body">
        <div className="quick-action__icon">
          <Icon size={22} />
        </div>
        <h3>{title}</h3>
        <p>{desc}</p>
        <Link to={href} className="quick-action__btn">
          {label}
        </Link>
      </div>
    </div>
  );
}
