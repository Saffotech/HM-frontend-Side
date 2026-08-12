import { useState, useMemo } from 'react';
import { FileCheck } from 'lucide-react';
import LabLayout from '@/features/lab/components/LabLayout';
import LabReportDetailModal from '@/features/lab/components/LabReportDetailModal';
import { useLabPermissionSet } from '@/features/lab/hooks/useLabPermission';
import { useLabReportsQuery } from '@/shared/hooks/queries/useLabQuery';
import { printLabReport } from '@/features/lab/utils/labReportUtils';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';
import { EmptyState, QueryFeedback } from '@/shared/components/common';
import { DateInput } from '@/shared/components/common';
import '../styles/lab.css';

export default function LabCompletedReportsPage() {
  const { canViewLab } = useLabPermissionSet();
  const [search, setSearch] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [selectedReport, setSelectedReport] = useState(null);

  const debouncedSearch = useDebouncedValue(search, 300);

  const reportsQuery = useLabReportsQuery(
    {
      search: debouncedSearch,
      date: filterDate || undefined,
      pageSize: 100,
    },
    { enabled: canViewLab },
  );

  const reports = reportsQuery.data?.data ?? [];
  const total = reportsQuery.data?.total ?? reports.length;

  const doctors = useMemo(
    () => [...new Set(reports.map((r) => r.doctorName).filter((d) => d && d !== '—'))].sort(),
    [reports]
  );

  const [filterDoctor, setFilterDoctor] = useState('all');

  const filtered = useMemo(() => {
    if (filterDoctor === 'all') return reports;
    return reports.filter((r) => r.doctorName === filterDoctor);
  }, [reports, filterDoctor]);

  const hasFilters = search || filterDate || filterDoctor !== 'all';
  const resetFilters = () => {
    setSearch('');
    setFilterDate('');
    setFilterDoctor('all');
  };

  if (!canViewLab) {
    return (
      <LabLayout pageTitle="Completed Reports">
        <EmptyState
          icon={FileCheck}
          title="Lab access denied"
          description="You do not have permission to view lab reports."
        />
      </LabLayout>
    );
  }

  return (
    <LabLayout pageTitle="Completed Reports">
      <LabReportDetailModal report={selectedReport} onClose={() => setSelectedReport(null)} />

      <div className="lab-card lab-card--archive">
        <div className="lab-filters">
          <div className="lab-filter-group" style={{ flex: 2, minWidth: 200 }}>
            <label htmlFor="reports-search">Search</label>
            <input
              id="reports-search"
              type="search"
              placeholder="Patient name, Report ID, or Test..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="lab-filter-group">
            <label htmlFor="reports-doctor">Ordering doctor</label>
            <select
              id="reports-doctor"
              value={filterDoctor}
              onChange={(e) => setFilterDoctor(e.target.value)}
            >
              <option value="all">All doctors</option>
              {doctors.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
          <div className="lab-filter-group">
            <DateInput
              id="reports-date"
              label="Upload date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
            />
          </div>
          {hasFilters && (
            <button type="button" className="lab-filter-reset" onClick={resetFilters}>
              ✕ Clear
            </button>
          )}
        </div>

        <QueryFeedback
          isLoading={reportsQuery.isLoading}
          isError={reportsQuery.isError}
          error={reportsQuery.error}
          onRetry={reportsQuery.refetch}
        >
          <div className="lab-result-count">
            Showing <strong>{filtered.length}</strong> of <strong>{total}</strong> reports
          </div>

          {filtered.length === 0 ? (
            <div className="lab-empty">
              <div className="lab-empty-icon">📋</div>
              <h3>No Reports Found</h3>
              <p>No completed reports match your filters.</p>
            </div>
          ) : (
            <div className="lab-table-wrap lab-table-wrap--archive">
              <table className="lab-table lab-table--archive">
                <thead>
                  <tr>
                    <th>Report ID</th>
                    <th>Patient Name</th>
                    <th>Patient ID</th>
                    <th>Test Name</th>
                    <th>Doctor</th>
                    <th>Lab Technician</th>
                    <th>Uploaded Date</th>
                    <th>Status</th>
                    <th className="lab-archive-actions-head">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((report) => (
                    <tr key={report.reportDbId ?? report.reportId}>
                      <td>
                        <strong>{report.reportId}</strong>
                      </td>
                      <td>{report.patientName}</td>
                      <td className="lab-archive-meta">{report.patientId}</td>
                      <td>{report.testName}</td>
                      <td>{report.doctorName}</td>
                      <td>{report.uploadedByName}</td>
                      <td className="lab-archive-meta lab-archive-meta--nowrap">{report.uploadedDate}</td>
                      <td>
                        <span className="lab-badge completed">Completed</span>
                      </td>
                      <td className="lab-archive-actions-cell">
                        <div className="lab-archive-actions">
                          <button
                            type="button"
                            className="lab-btn lab-btn-sm lab-archive-btn lab-archive-btn--view"
                            onClick={() => setSelectedReport(report)}
                          >
                            View
                          </button>
                          <button
                            type="button"
                            className="lab-btn lab-btn-sm lab-archive-btn lab-archive-btn--print"
                            onClick={() => printLabReport(report)}
                          >
                            Print
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </QueryFeedback>
      </div>
    </LabLayout>
  );
}
