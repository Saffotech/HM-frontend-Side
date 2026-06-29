import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  ChevronRight,
  ClipboardList,
  FlaskConical,
  Siren,
  CheckCircle2,
  ArrowRight,
  ListTodo,
  Search,
  ArrowDown,
  Printer,
} from 'lucide-react';
import LabLayout from '@/features/lab/components/LabLayout';
import LabDashboardRecentReports from '@/features/lab/components/LabDashboardRecentReports';
import LabDashboardReportFinder from '@/features/lab/components/LabDashboardReportFinder';
import { useLabOrders, useLabReports } from '@/features/lab/hooks/useLabStore';
import {
  countByStatus,
  isOpenStatus,
} from '@/features/lab/utils/labOrderStatus';
import { ensureMockLabDataLoaded, getLabReferenceToday } from '@/features/lab/data/labStore';
import { printReportsSummary } from '@/features/lab/utils/labReportUtils';
import { ROUTES } from '@/shared/constants';
import './LabDashboardPage.css';

function Ring({ pct, size = 72, stroke = 7, color = '#0d9488' }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <svg
      width={size}
      height={size}
      style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}
      aria-hidden
    >
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e2e8f0" strokeWidth={stroke} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 1s cubic-bezier(.4,0,.2,1)' }}
      />
    </svg>
  );
}

function daysBetween(a, b) {
  return Math.floor(
    (new Date(b).getTime() - new Date(a).getTime()) / (1000 * 60 * 60 * 24)
  );
}

export default function LabDashboardPage() {
  const navigate = useNavigate();
  const { orders } = useLabOrders();
  const { reports } = useLabReports();
  const [ready, setReady] = useState(false);
  const [reportFinderOpen, setReportFinderOpen] = useState(false);
  const [referenceToday, setReferenceToday] = useState(() => getLabReferenceToday());
  const TODAY = referenceToday;

  const scrollToRecentReports = () => {
    setReportFinderOpen(false);
    document.getElementById('lab-recent-reports')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const openReportFinder = () => {
    setReportFinderOpen(true);
    setTimeout(() => {
      document.getElementById('lab-report-finder')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  useEffect(() => {
    ensureMockLabDataLoaded().then((mod) => {
      setReferenceToday(mod.LAB_REFERENCE_TODAY);
    });
    const t = setTimeout(() => setReady(true), 350);
    return () => clearTimeout(t);
  }, []);

  const todayOrders = orders.filter((o) => o.requestedDate === TODAY);
  const todayDone = todayOrders.filter((o) => o.status === 'completed').length;
  const todayInProgress = todayOrders.filter((o) => o.status === 'in_progress').length;
  const todayPending = todayOrders.filter((o) => o.status === 'pending').length;
  const todayPct = todayOrders.length > 0 ? Math.round((todayDone / todayOrders.length) * 100) : 0;

  const statusCounts = useMemo(() => countByStatus(orders), [orders]);

  const urgentPending = orders
    .filter((o) => o.priority === 'urgent' && isOpenStatus(o.status))
    .sort((a, b) => a.requestedDate.localeCompare(b.requestedDate));

  const totalReportsDone = reports.length;
  const uploadStats = useMemo(() => {
    const today = reports.filter((r) => r.uploadedDate.startsWith(TODAY)).length;
    const week = reports.filter((r) => {
      const d = r.uploadedDate.split(' ')[0];
      return daysBetween(d, TODAY) <= 7;
    }).length;
    return { today, week };
  }, [TODAY, reports]);

  const formattedDate = new Date(TODAY).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <LabLayout pageTitle="Dashboard">
      <div className="lab-dash">
        <header className="lab-dash-hero">
          <div className="lab-dash-hero__left">
            <nav className="lab-dash-crumb" aria-label="Breadcrumb">
              <FlaskConical size={14} aria-hidden />
              <span>Lab Portal</span>
              <ChevronRight size={12} aria-hidden />
              <span className="current">Dashboard</span>
            </nav>
            <h1>Lab Technician Dashboard</h1>
            <p className="lab-dash-hero__subtitle">
              {formattedDate} — Here is your lab overview for today.
            </p>
          </div>
          <div className="lab-dash-date-pill">
            <span className="lab-dash-date-pill__icon">
              <Calendar size={18} aria-hidden />
            </span>
            <span>{formattedDate}</span>
          </div>
        </header>

        <div className="lab-dash-bento">
          <section
            className={`lab-dash-panel lab-dash-panel--workload${ready ? ' is-visible' : ''}`}
            style={{ '--panel-delay': '0ms' }}
          >
            <div className="lab-dash-panel__head">
              <div>
                <span className="lab-dash-badge lab-dash-badge--blue">Today&apos;s Progress</span>
                <h2 className="lab-dash-panel__title">Workload Completion</h2>
                <p className="lab-dash-panel__sub">
                  {todayOrders.length} test{todayOrders.length !== 1 ? 's' : ''} assigned today
                </p>
              </div>
            </div>

            <div className="lab-dash-workload-body">
              <div className="lab-dash-ring-wrap">
                <Ring pct={ready ? todayPct : 0} color={todayPct === 100 ? '#059669' : '#0d9488'} />
                <span className="lab-dash-ring-label">{todayPct}%</span>
              </div>
              <div className="lab-dash-segments">
                {[
                  { label: 'Completed', value: todayDone, color: '#10b981', pct: todayOrders.length ? (todayDone / todayOrders.length) * 100 : 0 },
                  { label: 'In Progress', value: todayInProgress, color: '#0ea5e9', pct: todayOrders.length ? (todayInProgress / todayOrders.length) * 100 : 0 },
                  { label: 'Pending', value: todayPending, color: '#f59e0b', pct: todayOrders.length ? (todayPending / todayOrders.length) * 100 : 0 },
                ].map(({ label, value, color, pct }) => (
                  <div key={label} className="lab-dash-segment">
                    <span className="lab-dash-segment__dot" style={{ background: color }} aria-hidden />
                    <div>
                      <span>{label}</span>
                      <div className="lab-dash-segment__bar">
                        <div
                          className="lab-dash-segment__fill"
                          style={{ width: ready ? `${pct}%` : '0%', background: color }}
                        />
                      </div>
                    </div>
                    <strong>{value}</strong>
                  </div>
                ))}
              </div>
            </div>

            <button
              type="button"
              className="lab-dash-btn lab-dash-btn--primary"
              onClick={() => navigate(`${ROUTES.LAB_ORDERS}?date=${TODAY}`)}
            >
              View today&apos;s orders
              <ArrowRight size={16} aria-hidden />
            </button>
          </section>

          <section
            className={`lab-dash-panel lab-dash-panel--urgent${ready ? ' is-visible' : ''}`}
            style={{ '--panel-delay': '80ms' }}
          >
            <div>
              <span className="lab-dash-badge lab-dash-badge--red">Do First</span>
              <h2 className="lab-dash-panel__title">Urgent Tests</h2>
              <p className="lab-dash-panel__sub">
                Doctor marked these as urgent — upload their report before other tests.
              </p>
            </div>

            <div className="lab-dash-count-block lab-dash-count-block--red">
              <span className="lab-dash-count-block__num">{urgentPending.length}</span>
              <span className="lab-dash-count-block__label">
                urgent test{urgentPending.length !== 1 ? 's' : ''} waiting
              </span>
            </div>

            {urgentPending.length > 0 ? (
              <ul className="lab-dash-simple-list">
                {urgentPending.slice(0, 2).map((o) => (
                  <li key={o.id}>
                    <button
                      type="button"
                      className="lab-dash-simple-list__row"
                      onClick={() => navigate(`/lab/orders/${o.id}/upload`)}
                    >
                      <span className="lab-dash-simple-list__main">
                        <strong>{o.patientName}</strong>
                        <span>{o.testName}</span>
                      </span>
                      <ChevronRight size={16} aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="lab-dash-empty lab-dash-empty--compact">
                <CheckCircle2 size={28} aria-hidden />
                <span>No urgent tests right now</span>
              </div>
            )}

            <button
              type="button"
              className="lab-dash-btn lab-dash-btn--danger"
              onClick={() => navigate(`${ROUTES.LAB_ORDERS}?priority=urgent`)}
            >
              <Siren size={16} aria-hidden />
              Open urgent list
              <ArrowRight size={16} aria-hidden />
            </button>
          </section>

          <section
            className={`lab-dash-panel lab-dash-panel--queue${ready ? ' is-visible' : ''}`}
            style={{ '--panel-delay': '160ms' }}
          >
            <div>
              <span className="lab-dash-badge lab-dash-badge--amber">Your Worklist</span>
              <h2 className="lab-dash-panel__title">Open Tests</h2>
              <p className="lab-dash-panel__sub">
                Still on your worklist — waiting or in progress. Completed tests move to archive.
              </p>
            </div>

            <div className="lab-dash-count-block">
              <span className="lab-dash-count-block__num">{statusCounts.open}</span>
              <span className="lab-dash-count-block__label">open tests (not completed)</span>
            </div>

            <div className="lab-dash-split-stats">
              <div className="lab-dash-split-box lab-dash-split-box--amber">
                <strong>{statusCounts.pending}</strong>
                <span>Waiting</span>
                <small>Doctor ordered — not started</small>
              </div>
              <div className="lab-dash-split-box lab-dash-split-box--blue">
                <strong>{statusCounts.in_progress}</strong>
                <span>In Progress</span>
                <small>Sample taken / test running</small>
              </div>
            </div>

            <button
              type="button"
              className="lab-dash-btn lab-dash-btn--primary"
              onClick={() => navigate(`${ROUTES.LAB_ORDERS}?view=open`)}
            >
              <ListTodo size={16} aria-hidden />
              View open worklist
              <ArrowRight size={16} aria-hidden />
            </button>
          </section>

          <section
            className={`lab-dash-panel lab-dash-panel--done${ready ? ' is-visible' : ''}`}
            style={{ '--panel-delay': '240ms' }}
          >
            <div>
              <span className="lab-dash-badge lab-dash-badge--green">Finished</span>
              <h2 className="lab-dash-panel__title">Reports Uploaded</h2>
              <p className="lab-dash-panel__sub">
                Upload activity summary — print a combined list or jump to recent rows below.
              </p>
            </div>

            <div className="lab-dash-upload-stats">
              <div>
                <strong>{totalReportsDone}</strong>
                <span>All time</span>
              </div>
              <div>
                <strong>{uploadStats.today}</strong>
                <span>Today</span>
              </div>
              <div>
                <strong>{uploadStats.week}</strong>
                <span>Last 7 days</span>
              </div>
            </div>

            <div className="lab-dash-panel__foot">
              <button
                type="button"
                className="lab-dash-btn lab-dash-btn--secondary"
                onClick={() => printReportsSummary(reports, 'All Uploaded Lab Reports')}
              >
                <Printer size={16} aria-hidden />
                Print full upload summary
              </button>

              <button
                type="button"
                className="lab-dash-link-btn"
                onClick={scrollToRecentReports}
              >
                <ArrowDown size={14} aria-hidden style={{ verticalAlign: -2 }} />
                {' '}
                Expand recent reports below
              </button>
            </div>
          </section>
        </div>

        {reportFinderOpen && (
          <div id="lab-report-finder" className="lab-dash-finder-wrap">
            <LabDashboardReportFinder reports={reports} onClose={() => setReportFinderOpen(false)} />
          </div>
        )}

        <div className="lab-dash-bottom">
          <LabDashboardRecentReports reports={reports} />

          <aside className="lab-dash-actions">
            <h2>Quick Actions</h2>
            <p className="lab-dash-actions__sub">Each opens a different workflow</p>

            <button
              type="button"
              className="lab-dash-action-tile lab-dash-action-tile--primary"
              onClick={() => navigate(`${ROUTES.LAB_ORDERS}?priority=urgent`)}
            >
              <span className="lab-dash-action-tile__icon">
                <Siren size={20} aria-hidden />
              </span>
              <span>
                <span className="lab-dash-action-tile__label">Upload Urgent Report</span>
                <span className="lab-dash-action-tile__hint">Go to upload form</span>
              </span>
            </button>

            <button
              type="button"
              className="lab-dash-action-tile"
              onClick={() => navigate(`${ROUTES.LAB_ORDERS}?view=pending`)}
            >
              <span className="lab-dash-action-tile__icon">
                <ClipboardList size={20} aria-hidden />
              </span>
              <span>
                <span className="lab-dash-action-tile__label">Start Pending Test</span>
                <span className="lab-dash-action-tile__hint">Not started worklist</span>
              </span>
            </button>

            <button
              type="button"
              className="lab-dash-action-tile"
              onClick={() => navigate(`${ROUTES.LAB_ORDERS}?view=in_progress`)}
            >
              <span className="lab-dash-action-tile__icon">
                <FlaskConical size={20} aria-hidden />
              </span>
              <span>
                <span className="lab-dash-action-tile__label">Continue In-Progress</span>
                <span className="lab-dash-action-tile__hint">Tests already running</span>
              </span>
            </button>

            <button
              type="button"
              className={`lab-dash-action-tile${reportFinderOpen ? ' is-active' : ''}`}
              onClick={openReportFinder}
            >
              <span className="lab-dash-action-tile__icon">
                <Search size={20} aria-hidden />
              </span>
              <span>
                <span className="lab-dash-action-tile__label">Find a Report</span>
                <span className="lab-dash-action-tile__hint">Search on dashboard</span>
              </span>
            </button>
          </aside>
        </div>
      </div>
    </LabLayout>
  );
}
