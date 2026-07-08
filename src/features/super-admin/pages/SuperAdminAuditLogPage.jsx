import { useCallback, useEffect, useState } from 'react';
import SuperAdminLayout from '@/features/super-admin/components/SuperAdminLayout';
import SuperAdminPageHeader from '@/features/super-admin/components/SuperAdminPageHeader';
import { getAuditLogs } from '@/features/super-admin/mock/auditMockService';
import { DateInput, Input, Label, QueryFeedback } from '@/shared/components/common';

const ACTION_BADGE = {
  REGISTER_USER: 'admin-badge--info',
  ACTIVATE_USER: 'admin-badge--success',
  DEACTIVATE_USER: 'admin-badge--warn',
  DELETE_USER: 'admin-badge--danger',
  CREATE_ROLE: 'admin-badge--info',
  ASSIGN_PERMISSIONS: 'admin-badge--info',
  UPDATE_SETTINGS: 'admin-badge--warn',
};

export default function SuperAdminAuditLogPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({ actor: '', dateFrom: '', dateTo: '' });

  const fetchLogs = useCallback(() => {
    setLoading(true);
    getAuditLogs(filters)
      .then(setLogs)
      .catch((e) => setError(e))
      .finally(() => setLoading(false));
  }, [filters]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return (
    <SuperAdminLayout pageTitle="Audit Log">
      <div className="admin-page">
        <SuperAdminPageHeader
          title="Audit log"
          subtitle="System activity and change history"
          mockBadge
        />

        <div className="admin-card sa-panel-card" style={{ marginBottom: '1rem' }}>
          <div className="admin-card__body">
            <div className="sa-audit-filters">
              <div style={{ flex: '2 1 200px' }}>
                <Label htmlFor="audit-actor">Filter by actor</Label>
                <Input
                  id="audit-actor"
                  value={filters.actor}
                  onChange={(e) => setFilters((f) => ({ ...f, actor: e.target.value }))}
                  placeholder="admin@hospital.org"
                />
              </div>
              <div>
                <DateInput
                  id="audit-from"
                  label="From"
                  value={filters.dateFrom}
                  onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value }))}
                />
              </div>
              <div>
                <DateInput
                  id="audit-to"
                  label="To"
                  value={filters.dateTo}
                  onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value }))}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="admin-card sa-panel-card admin-card--flat">
          <QueryFeedback isLoading={loading} isError={Boolean(error)} error={error} onRetry={fetchLogs}>
            {!logs.length ? (
              <div className="admin-empty-state"><p>No audit events match your filters.</p></div>
            ) : (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Timestamp</th>
                      <th>Actor</th>
                      <th>Action</th>
                      <th>Target</th>
                      <th>Type</th>
                      <th>IP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => (
                      <tr key={log.id}>
                        <td className="sa-audit-time">
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td>{log.actor}</td>
                        <td>
                          <span className={`admin-badge ${ACTION_BADGE[log.action] || 'admin-badge--info'}`}>
                            {log.action.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td>{log.target}</td>
                        <td>{log.target_type}</td>
                        <td>{log.ip}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </QueryFeedback>
        </div>
      </div>
    </SuperAdminLayout>
  );
}
