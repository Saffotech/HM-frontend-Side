import { useEffect, useMemo, useState } from 'react';
import SuperAdminLayout from '@/features/super-admin/components/SuperAdminLayout';
import SuperAdminPageHeader from '@/features/super-admin/components/SuperAdminPageHeader';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';
import { useSuperAdminAuditQuery } from '@/features/super-admin/hooks/useSuperAdminQuery';
import {
  AUDIT_ACTION_OPTIONS,
  formatAuditActionLabel,
  getAuditActionBadgeClass,
} from '@/features/super-admin/utils/auditActionBadges';
import {
  DateInput,
  Input,
  Label,
  QueryFeedback,
  Select,
  TablePagination,
} from '@/shared/components/common';

const PAGE_SIZE_OPTIONS = [
  { value: '20', label: '20 per page' },
  { value: '50', label: '50 per page' },
  { value: '100', label: '100 per page' },
];

export default function SuperAdminAuditLogPage() {
  const [filters, setFilters] = useState({
    actor: '',
    action: 'all',
    dateFrom: '',
    dateTo: '',
  });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const debouncedActor = useDebouncedValue(filters.actor, 300);

  useEffect(() => {
    setPage(1);
  }, [debouncedActor, filters.action, filters.dateFrom, filters.dateTo, pageSize]);

  const auditQuery = useSuperAdminAuditQuery({
    actor: debouncedActor,
    action: filters.action,
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
    page,
    limit: pageSize,
  });

  const logs = auditQuery.data?.entries ?? [];
  const total = auditQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const displayLogs = useMemo(
    () =>
      logs.map((log) => ({
        id: log.id,
        timestamp: log.timestamp,
        actor: log.actor,
        action: log.action,
        target: log.target,
        target_type: log.target_type,
        ip: log.ip,
      })),
    [logs],
  );

  return (
    <SuperAdminLayout pageTitle="Audit Log">
      <div className="admin-page">
        <SuperAdminPageHeader
          title="Audit log"
          subtitle="System activity and change history"
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
              <div style={{ flex: '1 1 160px' }}>
                <Label htmlFor="audit-action">Action</Label>
                <Select
                  value={filters.action}
                  onChange={(value) => setFilters((f) => ({ ...f, action: value }))}
                  options={AUDIT_ACTION_OPTIONS}
                  placeholder="All actions"
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
              <div style={{ flex: '0 1 140px' }}>
                <Label htmlFor="audit-page-size">Page size</Label>
                <Select
                  value={String(pageSize)}
                  onChange={(value) => setPageSize(Number(value))}
                  options={PAGE_SIZE_OPTIONS}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="admin-card sa-panel-card admin-card--flat">
          <QueryFeedback
            isLoading={auditQuery.isLoading}
            isError={auditQuery.isError}
            error={auditQuery.error}
            onRetry={auditQuery.refetch}
          >
            {!displayLogs.length ? (
              <div className="admin-empty-state"><p>No audit events match your filters.</p></div>
            ) : (
              <>
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Timestamp</th>
                        <th>Actor</th>
                        <th>Action</th>
                        <th>Description</th>
                        <th>Target Type</th>
                        <th>IP</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayLogs.map((log) => (
                        <tr key={log.id}>
                          <td className="sa-audit-time">
                            {new Date(log.timestamp).toLocaleString()}
                          </td>
                          <td>{log.actor}</td>
                          <td>
                            <span className={`admin-badge ${getAuditActionBadgeClass(log.action)}`}>
                              {formatAuditActionLabel(log.action)}
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
                <TablePagination
                  page={page}
                  totalPages={totalPages}
                  totalItems={total}
                  pageSize={pageSize}
                  onPageChange={setPage}
                  itemLabel="events"
                />
              </>
            )}
          </QueryFeedback>
        </div>
      </div>
    </SuperAdminLayout>
  );
}
