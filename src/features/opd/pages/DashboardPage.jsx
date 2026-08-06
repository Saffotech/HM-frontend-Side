import { Link } from 'react-router-dom';
import { UserPlus, CalendarPlus, Receipt, Clock } from 'lucide-react';
import { usePatientsQuery, PATIENTS_PAGE_SIZE } from '@/shared/hooks/queries/usePatientQuery';
import { useTodayAppointmentsQuery } from '@/shared/hooks/queries/useAppointmentQuery';
import { useOpdDashboardQuery } from '@/shared/hooks/queries/useOpdDashboardQuery';
import { enrichAppointmentsWithApiPayment, prepareOpdDashboardAppointments } from '@/features/opd/utils/appointmentPaymentUtils';
import { Avatar, StatusBadge, QueryFeedback } from '@/shared/components/common';
import TodayOverviewCard from '@/features/opd/today-overview/components/TodayOverviewCard';
import { ROUTES } from '@/shared/constants';
import './DashboardPage.css';

export default function DashboardPage() {
  const { data: dashboard, isLoading: ld, isError: ed, error: errD } = useOpdDashboardQuery();
  const {
    data: todayApptPage,
    isLoading: la,
    isError: ea,
    error: errA,
  } = useTodayAppointmentsQuery();
  const {
    data: recentPage,
    isLoading: lp,
    isError: ep,
    error: errP,
  } = usePatientsQuery({ fetchAll: false, page: 1, limit: PATIENTS_PAGE_SIZE });

  const todaysAppts = prepareOpdDashboardAppointments(
    enrichAppointmentsWithApiPayment(todayApptPage?.appointments ?? []),
  );
  const paidCount = todaysAppts.filter((a) => a.payment?.isPaid).length;
  const unpaidCount = todaysAppts.length - paidCount;
  const recentPatients = recentPage?.patients ?? [];

  const hasShellData = Boolean(dashboard || recentPage || todayApptPage);
  const isInitialLoading = !hasShellData && (ld || lp);
  const showPartialWarning = (ed || ea || ep) && hasShellData;
  const showFatalError =
    !isInitialLoading && !hasShellData && (ed || ea || ep);
  const error = errD || errA || errP;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';
  const today = new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const stats = {
    patients: dashboard?.patientsTotal ?? recentPage?.total ?? recentPatients.length,
    appointmentsToday: dashboard?.appointmentsToday ?? todaysAppts.length,
    pendingBills: dashboard?.pendingBills ?? 0,
  };

  if (isInitialLoading) {
    return <QueryFeedback isLoading />;
  }

  if (showFatalError) {
    return <QueryFeedback isError error={error} />;
  }

  return (
    <div className="dashboard stagger-reveal">
        {showPartialWarning && (
          <p className="dashboard-partial-warning" role="status">
            Some dashboard data could not be refreshed. Showing the latest available
            information.
          </p>
        )}
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
            <TodayOverviewCard />
          </div>

          <div className="dashboard-panels">
            <div className="card dashboard-panels__appointments">
              <div className="card__header">
                <div className="dashboard-appt-title">
                  <h3>Today&apos;s Appointments</h3>
                  <div className="dashboard-appt-counts" aria-label="Payment summary">
                    <span className="dashboard-appt-count dashboard-appt-count--paid">
                      Paid {paidCount}
                    </span>
                    <span className="dashboard-appt-count dashboard-appt-count--unpaid">
                      Unpaid {unpaidCount}
                    </span>
                  </div>
                </div>
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
                      <th>Payment Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {la ? (
                      <tr>
                        <td colSpan={6} className="dashboard-empty-row">
                          Loading appointments…
                        </td>
                      </tr>
                    ) : todaysAppts.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="dashboard-empty-row">
                          No appointments scheduled for today.
                        </td>
                      </tr>
                    ) : (
                      todaysAppts.slice(0, 8).map((appt, i) => {
                        const paymentLabel =
                          appt.payment?.label
                          ?? (String(appt.paymentStatus ?? '').toLowerCase() === 'paid'
                            ? 'Paid'
                            : String(appt.paymentStatus ?? '').toLowerCase() === 'partial'
                              ? 'Partial'
                              : 'Unpaid');
                        return (
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
                            <StatusBadge status={appt.displayStatus ?? appt.status} />
                          </td>
                          <td>
                            <StatusBadge status={paymentLabel} />
                          </td>
                        </tr>
                        );
                      })
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
