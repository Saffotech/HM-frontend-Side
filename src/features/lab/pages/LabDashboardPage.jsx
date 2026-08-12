import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FlaskConical,
  Siren,
  ArrowRight,
  ListTodo,
} from 'lucide-react';
import LabLayout from '@/features/lab/components/LabLayout';
import LabDashboardRemainingTests from '@/features/lab/components/LabDashboardRemainingTests';
import { useLabPermissionSet } from '@/features/lab/hooks/useLabPermission';
import {
  useLabDashboardQuery,
  useLabOrdersQuery,
  useLabReportsQuery,
} from '@/shared/hooks/queries/useLabQuery';
import { isOpenStatus } from '@/features/lab/utils/labOrderStatus';
import { EmptyState, QueryFeedback } from '@/shared/components/common';
import { ROUTES } from '@/shared/constants';
import './LabDashboardPage.css';

function priorityRank(priority) {
  const key = String(priority || '').toLowerCase();
  if (key === 'stat') return 0;
  if (key === 'urgent') return 1;
  return 2;
}

export default function LabDashboardPage() {
  const navigate = useNavigate();
  const { canViewLab } = useLabPermissionSet();
  const [ready, setReady] = useState(false);

  const dashboardQuery = useLabDashboardQuery({ enabled: canViewLab });
  const stats = dashboardQuery.data;
  const urgentQuery = useLabOrdersQuery(
    { priority: 'urgent', view: 'ordered', pageSize: 1 },
    { enabled: canViewLab && !dashboardQuery.isError }
  );
  const remainingQuery = useLabOrdersQuery(
    { view: 'all', pageSize: 50 },
    { enabled: canViewLab && !dashboardQuery.isError }
  );
  const reportsTotalQuery = useLabReportsQuery({ pageSize: 1 }, { enabled: canViewLab });

  const totalReportsDone = reportsTotalQuery.data?.total ?? 0;
  const urgentWaitingCount = urgentQuery.data?.total ?? 0;

  const remainingOrders = useMemo(() => {
    const rows = remainingQuery.data?.data ?? [];
    return [...rows]
      .filter((o) => isOpenStatus(o.status))
      .sort((a, b) => {
        const pr = priorityRank(a.priority) - priorityRank(b.priority);
        if (pr !== 0) return pr;
        const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return ta - tb;
      });
  }, [remainingQuery.data?.data]);

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 350);
    return () => clearTimeout(t);
  }, []);

  const todayDone = stats?.completedToday ?? 0;
  const openCount =
    (stats?.pending ?? 0) + (stats?.sampleCollected ?? 0) + (stats?.processing ?? 0);

  if (!canViewLab) {
    return (
      <LabLayout pageTitle="Dashboard">
        <EmptyState
          icon={FlaskConical}
          title="Lab access denied"
          description="You do not have permission to view lab orders and reports."
        />
      </LabLayout>
    );
  }

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
            className={`lab-dash-panel lab-dash-panel--urgent${ready ? ' is-visible' : ''}`}
            style={{ '--panel-delay': '0ms' }}
          >
            <div>
              <span className="lab-dash-badge lab-dash-badge--red">Do First</span>
              <h2 className="lab-dash-panel__title">Urgent Tests</h2>
            </div>

            <div
              className={`lab-dash-count-block lab-dash-count-block--red${
                urgentWaitingCount === 0 ? ' lab-dash-count-block--empty' : ''
              }`}
            >
              <span className="lab-dash-count-block__num">{urgentWaitingCount}</span>
              <span className="lab-dash-count-block__label">
                urgent test{urgentWaitingCount !== 1 ? 's' : ''} waiting
              </span>
            </div>

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
            style={{ '--panel-delay': '80ms' }}
          >
            <div>
              <span className="lab-dash-badge lab-dash-badge--amber">Your Worklist</span>
              <h2 className="lab-dash-panel__title">Open Tests</h2>
            </div>

            <div className="lab-dash-count-block">
              <span className="lab-dash-count-block__num">{openCount}</span>
              <span className="lab-dash-count-block__label">open tests (not completed)</span>
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
            </div>

            <div className="lab-dash-panel__foot">
              <button
                type="button"
                className="lab-dash-btn lab-dash-btn--primary"
                onClick={() => navigate(ROUTES.LAB_REPORTS)}
              >
                View completed report
                <ArrowRight size={16} aria-hidden />
              </button>
            </div>
          </section>
        </div>

        <div className="lab-dash-bottom">
          <QueryFeedback
            isLoading={remainingQuery.isLoading}
            isError={remainingQuery.isError}
            error={remainingQuery.error}
            onRetry={remainingQuery.refetch}
          >
            <LabDashboardRemainingTests orders={remainingOrders} />
          </QueryFeedback>
        </div>
      </div>
      </QueryFeedback>
    </LabLayout>
  );
}
