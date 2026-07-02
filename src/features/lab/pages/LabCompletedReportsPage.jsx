import { useState, useMemo } from 'react';
import LabLayout from '@/features/lab/components/LabLayout';
import LabReportDetailModal from '@/features/lab/components/LabReportDetailModal';
import { useLabReports } from '@/features/lab/hooks/useLabStore';
import { downloadReportsCsv, printLabReport } from '@/features/lab/utils/labReportUtils';
import { DateInput } from '@/shared/components/common';
import '../styles/lab.css';

export default function LabCompletedReportsPage() {
  const { reports } = useLabReports();

  const [search, setSearch] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [filterDoctor, setFilterDoctor] = useState('all');
  const [selectedReport, setSelectedReport] = useState(null);

  const doctors = useMemo(
    () => [...new Set(reports.map((r) => r.doctorName))].sort(),
    [reports]
  );

  const filtered = useMemo(() => {
    return reports.filter((r) => {
      if (filterDoctor !== 'all' && r.doctorName !== filterDoctor) return false;
      if (filterDate && !r.uploadedDate.startsWith(filterDate)) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        r.patientName.toLowerCase().includes(q) ||
        r.reportId.toLowerCase().includes(q) ||
        r.testName.toLowerCase().includes(q)
      );
    });
  }, [reports, search, filterDate, filterDoctor]);

  const hasFilters = search || filterDate || filterDoctor !== 'all';
  const resetFilters = () => {
    setSearch('');
    setFilterDate('');
    setFilterDoctor('all');
  };

  return (
    <LabLayout pageTitle="Completed Reports">
      <div className="lab-page-header">
        <div className="lab-breadcrumb">
          <span>Lab Portal</span>
          <span className="sep">›</span>
          <span className="current">Completed Reports</span>
        </div>
        <h1>Report Archive</h1>
        <p>
          Full history with filters and export — use the dashboard for quick preview, search, and print
          summary.
        </p>
      </div>

      <div className="lab-archive-toolbar no-print">
        <button
          type="button"
          className="lab-btn lab-btn-secondary"
          onClick={() => downloadReportsCsv(filtered)}
          disabled={filtered.length === 0}
        >
          ↓ Export CSV ({filtered.length})
        </button>
        <span className="lab-archive-toolbar__hint">Archive only — not available on dashboard</span>
      </div>

      <LabReportDetailModal report={selectedReport} onClose={() => setSelectedReport(null)} />

      <div className="lab-card">
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

        <div className="lab-result-count">
          Showing <strong>{filtered.length}</strong> of <strong>{reports.length}</strong> reports
        </div>

        {filtered.length === 0 ? (
          <div className="lab-empty">
            <div className="lab-empty-icon">📋</div>
            <h3>No Reports Found</h3>
            <p>No completed reports match your filters.</p>
          </div>
        ) : (
          <div className="lab-table-wrap">
            <table className="lab-table">
              <thead>
                <tr>
                  <th>Report ID</th>
                  <th>Patient Name</th>
                  <th>Patient ID</th>
                  <th>Test Name</th>
                  <th>Doctor</th>
                  <th>Uploaded Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((report) => (
                  <tr key={report.reportId}>
                    <td>
                      <strong>{report.reportId}</strong>
                    </td>
                    <td>{report.patientName}</td>
                    <td style={{ color: '#6b7f99', fontFamily: 'monospace', fontSize: '12.5px' }}>{report.patientId}</td>
                    <td>{report.testName}</td>
                    <td>{report.doctorName}</td>
                    <td style={{ whiteSpace: 'nowrap', color: '#6b7f99' }}>{report.uploadedDate}</td>
                    <td>
                      <span className="lab-badge completed">✓ Completed</span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          className="lab-btn lab-btn-primary lab-btn-sm"
                          onClick={() => setSelectedReport(report)}
                        >
                          View
                        </button>
                        <button
                          type="button"
                          className="lab-btn lab-btn-secondary lab-btn-sm"
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
      </div>
    </LabLayout>
  );
}
