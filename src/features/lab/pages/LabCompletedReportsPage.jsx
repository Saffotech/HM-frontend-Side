import { useState, useMemo, useEffect } from 'react';
import { FileCheck } from 'lucide-react';
import LabLayout from '@/features/lab/components/LabLayout';
import LabReportDetailModal from '@/features/lab/components/LabReportDetailModal';
import LabReportEditModal from '@/features/lab/components/LabReportEditModal';
import { useLabPermissionSet } from '@/features/lab/hooks/useLabPermission';
import { useLabReportsQuery } from '@/shared/hooks/queries/useLabQuery';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';
import { EmptyState, QueryFeedback, TablePagination } from '@/shared/components/common';
import { DateInput } from '@/shared/components/common';
import LabEncounterBadge from '@/features/lab/components/LabEncounterBadge';
import { visitLocationLabel, normalizeEncounterType, reportMatchesArchiveSearch } from '@/features/lab/utils/visitLocation';
import { formatOrderPrice } from '@/shared/api/mappers/labCatalogMapper';
import '../styles/lab.css';

const PAGE_SIZE = 10;

export default function LabCompletedReportsPage() {
  const { canViewLab } = useLabPermissionSet();
  const [search, setSearch] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [selectedReport, setSelectedReport] = useState(null);
  const [editingReport, setEditingReport] = useState(null);
  const [page, setPage] = useState(1);

  const debouncedSearch = useDebouncedValue(search, 300);

  const reportsQuery = useLabReportsQuery(
    {
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
  const [filterSource, setFilterSource] = useState('all');

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filterDate, filterDoctor, filterSource]);

  const filtered = useMemo(() => {
    return reports.filter((r) => {
      if (!reportMatchesArchiveSearch(r, debouncedSearch)) return false;
      if (filterDoctor !== 'all' && r.doctorName !== filterDoctor) return false;
      if (filterSource !== 'all' && normalizeEncounterType(r.encounterType) !== filterSource) {
        return false;
      }
      return true;
    });
  }, [reports, debouncedSearch, filterDoctor, filterSource]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE) || 1);
  const safePage = Math.min(page, pageCount);
  const paged = useMemo(
    () => filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [filtered, safePage],
  );

  const hasFilters = search || filterDate || filterDoctor !== 'all' || filterSource !== 'all';
  const resetFilters = () => {
    setSearch('');
    setFilterDate('');
    setFilterDoctor('all');
    setFilterSource('all');
    setPage(1);
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
      <LabReportDetailModal
        report={selectedReport}
        onClose={() => setSelectedReport(null)}
        onEdit={(report) => setEditingReport(report)}
      />
      <LabReportEditModal report={editingReport} onClose={() => setEditingReport(null)} />

      <div className="lab-card lab-card--archive">
        <div className="lab-filters">
          <div className="lab-filter-group" style={{ flex: 2, minWidth: 200 }}>
            <label htmlFor="reports-search">Search</label>
            <input
              id="reports-search"
              type="search"
              placeholder="Patient, report ID, test, ward, bed, source..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="lab-filter-group">
            <label htmlFor="reports-source">Source</label>
            <select
              id="reports-source"
              value={filterSource}
              onChange={(e) => setFilterSource(e.target.value)}
            >
              <option value="all">All</option>
              <option value="OPD">OPD</option>
              <option value="IPD">IPD</option>
            </select>
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
            Showing <strong>{paged.length}</strong> of <strong>{filtered.length}</strong> matching
            {filtered.length !== total ? (
              <>
                {' '}(<strong>{total}</strong> total)
              </>
            ) : null}
            {' '}reports
          </div>

          {filtered.length === 0 ? (
            <div className="lab-empty">
              <div className="lab-empty-icon">📋</div>
              <h3>No Reports Found</h3>
              <p>No completed reports match your filters.</p>
            </div>
          ) : (
            <>
              <div className="lab-table-wrap lab-table-wrap--archive">
                <table className="lab-table lab-table--archive">
                  <thead>
                    <tr>
                      <th className="lab-archive-col lab-archive-col--patient">Patient Name</th>
                      <th className="lab-archive-col lab-archive-col--source">Source</th>
                      <th className="lab-archive-col lab-archive-col--location">Ward / Bed</th>
                      <th className="lab-archive-col lab-archive-col--test">Test Name</th>
                      <th className="lab-archive-col lab-archive-col--price">Price</th>
                      <th className="lab-archive-col lab-archive-col--doctor">Doctor</th>
                      <th className="lab-archive-col lab-archive-col--tech">Lab Technician</th>
                      <th className="lab-archive-col lab-archive-col--date">Uploaded Date</th>
                      <th className="lab-archive-col lab-archive-col--status">Status</th>
                      <th className="lab-archive-col lab-archive-col--actions lab-archive-actions-head">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paged.map((report) => {
                      const location = visitLocationLabel(report);
                      return (
                      <tr key={report.reportDbId ?? report.reportId}>
                        <td className="lab-archive-col lab-archive-col--patient lab-archive-patient">
                          <span className="lab-archive-patient__name">{report.patientName}</span>
                          <span className="lab-archive-meta lab-archive-patient__id">{report.patientId}</span>
                        </td>
                        <td className="lab-archive-col lab-archive-col--source">
                          <LabEncounterBadge encounterType={report.encounterType} />
                        </td>
                        <td className="lab-archive-col lab-archive-col--location lab-archive-location">
                          {location.visit === 'IPD' ? (
                            <>
                              <span className="lab-archive-location__ward">{location.ward}</span>
                              <span className="lab-archive-meta lab-archive-location__bed">{location.bed}</span>
                            </>
                          ) : (
                            <span className="lab-archive-location__empty">-</span>
                          )}
                        </td>
                        <td className="lab-archive-col lab-archive-col--test">{report.testName}</td>
                        <td className="lab-archive-col lab-archive-col--price">
                          {formatOrderPrice(report.price)}
                        </td>
                        <td className="lab-archive-col lab-archive-col--doctor">{report.doctorName}</td>
                        <td className="lab-archive-col lab-archive-col--tech">{report.uploadedByName}</td>
                        <td className="lab-archive-col lab-archive-col--date">{report.uploadedDate}</td>
                        <td className="lab-archive-col lab-archive-col--status">
                          <span className="lab-badge completed">Completed</span>
                        </td>
                        <td className="lab-archive-col lab-archive-col--actions lab-archive-actions-cell">
                          <div className="lab-archive-actions">
                            <button
                              type="button"
                              className="lab-btn lab-btn-sm lab-archive-btn lab-archive-btn--view"
                              onClick={() => setSelectedReport(report)}
                            >
                              View
                            </button>
                          </div>
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <TablePagination
                page={safePage}
                totalPages={pageCount}
                totalItems={filtered.length}
                pageSize={PAGE_SIZE}
                onPageChange={setPage}
                itemLabel="reports"
              />
            </>
          )}
        </QueryFeedback>
      </div>
    </LabLayout>
  );
}
