import { useEffect, useState } from 'react';
import SuperAdminLayout from '@/features/super-admin/components/SuperAdminLayout';
import SuperAdminPageHeader from '@/features/super-admin/components/SuperAdminPageHeader';
import AdminStatCard from '@/features/admin/components/AdminStatCard';
import {
  getMonthlyRevenue,
  getRecentActivity,
  getReportsSummary,
  getStaffByRole,
} from '@/features/super-admin/mock/reportsMockService';
import { QueryFeedback } from '@/shared/components/common';

function fmtCurrency(n) {
  if (n >= 1000000) return `₹${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(0)}k`;
  return `₹${n}`;
}

export default function SuperAdminReportsPage() {
  const [summary, setSummary] = useState(null);
  const [staffByRole, setStaffByRole] = useState([]);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([getReportsSummary(), getStaffByRole(), getMonthlyRevenue(), getRecentActivity()])
      .then(([s, sr, , ra]) => {
        setSummary(s);
        setStaffByRole(sr);
        setActivity(ra);
      })
      .catch((e) => setError(e))
      .finally(() => setLoading(false));
  }, []);

  return (
    <SuperAdminLayout pageTitle="Reports">
      <div className="admin-page">
        <SuperAdminPageHeader
          title="Reports"
          subtitle="Hospital performance overview"
          mockBadge
        />

        <QueryFeedback isLoading={loading} isError={Boolean(error)} error={error}>
          {summary && (
            <>
              <div className="admin-stats admin-stats--dashboard">
                <AdminStatCard title="Total staff" value={summary.total_staff} />
                <AdminStatCard title="Active staff" value={summary.active_staff} />
                <AdminStatCard title="Patients this month" value={summary.total_patients_this_month?.toLocaleString()} />
                <AdminStatCard title="Revenue this month" value={fmtCurrency(summary.revenue_this_month || 0)} />
              </div>

              <div className="sa-reports-grid">
                <div className="admin-card sa-panel-card">
                  <div className="admin-card__header"><h2 className="admin-card__title">Staff by role</h2></div>
                  <div className="admin-card__body">
                    <div className="sa-bar-chart">
                      {staffByRole.map((row) => {
                        const max = Math.max(1, ...staffByRole.map((r) => r.count));
                        const pct = (row.count / max) * 100;
                        return (
                          <div key={row.role} className="sa-bar-item">
                            <div className="sa-bar-label">{row.role}</div>
                            <div className="sa-bar-track">
                              <div className="sa-bar-fill" style={{ width: `${pct}%` }} />
                            </div>
                            <div className="sa-bar-value">{row.count}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="admin-card sa-panel-card">
                  <div className="admin-card__header"><h2 className="admin-card__title">Recent activity</h2></div>
                  <div className="admin-table-wrap">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Department</th>
                          <th>Patients</th>
                          <th>Revenue</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activity.map((row) => (
                          <tr key={`${row.date}-${row.department}`}>
                            <td>{new Date(row.date).toLocaleDateString()}</td>
                            <td>{row.department}</td>
                            <td>{row.patients}</td>
                            <td>{fmtCurrency(row.revenue)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </>
          )}
        </QueryFeedback>
      </div>
    </SuperAdminLayout>
  );
}
