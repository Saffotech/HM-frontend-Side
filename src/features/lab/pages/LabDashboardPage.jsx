import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronRight,
  ClipboardList,
  FlaskConical,
  Siren,
  CheckCircle2,
  ArrowRight,
  ListTodo,
  Search,
  Printer,
} from 'lucide-react';
import LabLayout from '@/features/lab/components/LabLayout';
import LabDashboardRecentReports from '@/features/lab/components/LabDashboardRecentReports';
import LabDashboardReportFinder from '@/features/lab/components/LabDashboardReportFinder';
import {
  useLabDashboardQuery,
  useLabOrdersQuery,
  useLabReportsQuery,
} from '@/shared/hooks/queries/useLabQuery';
import { isOpenStatus } from '@/features/lab/utils/labOrderStatus';
import { printReportsSummary } from '@/features/lab/utils/labReportUtils';
import { QueryFeedback } from '@/shared/components/common';
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

export default function LabDashboardPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [reportFinderOpen, setReportFinderOpen] = useState(false);

  const dashboardQuery = useLabDashboardQuery();
  const stats = dashboardQuery.data;
  const urgentQuery = useLabOrdersQuery(
    { priority: 'urgent', pageSize: 10 },
    { enabled: !dashboardQuery.isError }
  );
  const reportsQuery = useLabReportsQuery({ pageSize: 10 });
  const reportsTotalQuery = useLabReportsQuery({ pageSize: 1 });

  const reports = reportsQuery.data?.data ?? [];
  const totalReportsDone = reportsTotalQuery.data?.total ?? 0;

  const urgentPending = useMemo(
    () => (urgentQuery.data?.data ?? []).filter((o) => isOpenStatus(o.status)),
    [urgentQuery.data]
  );

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 350);
    return () => clearTimeout(t);
  }, []);

  const todayTotal = stats?.totalToday ?? 0;
  const todayDone = stats?.completedToday ?? 0;
  const todayPending = stats?.pending ?? 0;
  const todaySampleCollected = stats?.sampleCollected ?? 0;
  const todayProcessing = stats?.processing ?? 0;
  const todayPct = todayTotal > 0 ? Math.round((todayDone / todayTotal) * 100) : 0;
  const openCount =
    (stats?.pending ?? 0) + (stats?.sampleCollected ?? 0) + (stats?.processing ?? 0);

  const todayIso = new Date().toISOString().slice(0, 10);

  const openReportFinder = () => {
    setReportFinderOpen(true);
    setTimeout(() => {
      document.getElementById('lab-report-finder')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  return (
    <LabLayout pageTitle="Dashboard">
      <QueryFeedback
        isLoading={dashboardQuery.isLoading}
        isError={dashboardQuery.isError}
        error={dashboardQuery.error}
        onRetry={dashboardQuery.refetch}
      >
      <div className="lab-dash">
        <div className="lab-dash-bento">
          <section
            className={`lab-dash-panel lab-dash-panel--workload${ready ? ' is-visible' : ''}`}
            style={{ '--panel-delay': '0ms' }}
          >
            <div className="lab-dash-panel__head">
              <div>
                <span className="lab-dash-badge lab-dash-badge--blue">Today&apos;s Progress</span>
                <h2 className="lab-dash-panel__title">Workload Completion</h2>
              </div>
            </div>

            <div className="lab-dash-workload-body">
              <div className="lab-dash-ring-wrap">
                <Ring pct={ready ? todayPct : 0} color={todayPct === 100 ? '#27ae60' : '#1a5c34'} />
                <span className="lab-dash-ring-label">{todayPct}%</span>
              </div>
              <div className="lab-dash-segments">
                {[
                  { label: 'Completed', value: todayDone, color: '#27ae60', pct: todayTotal ? (todayDone / todayTotal) * 100 : 0 },
                  { label: 'Processing', value: todayProcessing, color: '#1a5c34', pct: todayTotal ? (todayProcessing / todayTotal) * 100 : 0 },
                  { label: 'Waiting', value: todayPending, color: '#cbd5e0', pct: todayTotal ? (todayPending / todayTotal) * 100 : 0 },
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
              onClick={() => navigate(`${ROUTES.LAB_ORDERS}?date=${todayIso}`)}
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
            </div>

            <div
              className={`lab-dash-count-block lab-dash-count-block--red${
                (stats?.urgentPending ?? urgentPending.length) === 0 ? ' lab-dash-count-block--empty' : ''
              }`}
            >
              <span className="lab-dash-count-block__num">{stats?.urgentPending ?? urgentPending.length}</span>
              <span className="lab-dash-count-block__label">
                urgent test{(stats?.urgentPending ?? urgentPending.length) !== 1 ? 's' : ''} waiting
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
            </div>

            <div className="lab-dash-count-block">
              <span className="lab-dash-count-block__num">{openCount}</span>
              <span className="lab-dash-count-block__label">open tests (not completed)</span>
            </div>

            <div className="lab-dash-split-stats">
              <div className="lab-dash-split-box lab-dash-split-box--amber">
                <strong>{todayPending}</strong>
                <span>Waiting</span>
                <small>Ordered — not started</small>
              </div>
              <div className="lab-dash-split-box lab-dash-split-box--blue">
                <strong>{todaySampleCollected + todayProcessing}</strong>
                <span>In Progress</span>
                <small>Sample collected / processing</small>
              </div>
            </div>

            <button
              type="button"
              className="lab-dash-btn lab-dash-btn--primary"
              onClick={() => navigate(`${ROUTES.LAB_ORDERS}?view=ordered`)}
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
            </div>

            <div className="lab-dash-upload-stats">
              <div>
                <strong>{totalReportsDone}</strong>
                <span>All time</span>
              </div>
              <div>
                <strong>{todayDone}</strong>
                <span>Today</span>
              </div>
              <div>
                <strong>{stats?.completedToday ?? 0}</strong>
                <span>Completed today</span>
              </div>
            </div>

            <div className="lab-dash-panel__foot">
              <button
                type="button"
                className="lab-dash-btn lab-dash-btn--secondary"
                onClick={() => printReportsSummary(reports, 'Recent Lab Reports')}
                disabled={reports.length === 0}
              >
                <Printer size={16} aria-hidden />
                Print recent upload summary
              </button>
            </div>
          </section>
        </div>

        {reportFinderOpen && (
          <div id="lab-report-finder" className="lab-dash-finder-wrap">
            <LabDashboardReportFinder onClose={() => setReportFinderOpen(false)} />
          </div>
        )}

        <div className="lab-dash-bottom">
          <LabDashboardRecentReports reports={reports} />

          <aside className="lab-dash-actions">
            <h2>Quick Actions</h2>

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
              </span>
            </button>

            <button
              type="button"
              className="lab-dash-action-tile"
              onClick={() => navigate(`${ROUTES.LAB_ORDERS}?view=ordered`)}
            >
              <span className="lab-dash-action-tile__icon">
                <ClipboardList size={20} aria-hidden />
              </span>
              <span>
                <span className="lab-dash-action-tile__label">Start Pending Test</span>
              </span>
            </button>

            <button
              type="button"
              className="lab-dash-action-tile"
              onClick={() => navigate(`${ROUTES.LAB_ORDERS}?view=processing`)}
            >
              <span className="lab-dash-action-tile__icon">
                <FlaskConical size={20} aria-hidden />
              </span>
              <span>
                <span className="lab-dash-action-tile__label">Continue Processing</span>
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
              </span>
            </button>
          </aside>
        </div>
      </div>
      </QueryFeedback>
    </LabLayout>
  );
}
