import { useEffect, useMemo, useState } from 'react';
import { NavLink, useSearchParams } from 'react-router-dom';
import { Download, FileText, RotateCcw } from 'lucide-react';
import ManagerLayout from '@/features/manager/components/ManagerLayout';
import ManagerEmptyState from '@/features/manager/components/ManagerEmptyState';
import ManagerPageHeader from '@/features/manager/components/ManagerPageHeader';
import ManagerReportFilters from '@/features/manager/components/ManagerReportFilters';
import ManagerStatusPill from '@/features/manager/components/ManagerStatusPill';
import {
  formatReportDate,
} from '@/features/manager/utils/reportUtils';
import { formatCurrency } from '@/shared/utils/formatCurrency';
import {
  useAdminDepartmentsQuery,
  useAdminReportsVisitsQuery,
} from '@/shared/hooks/queries/useAdminQuery';
import {
  Button,
  QueryFeedback,
  Select,
  TablePagination,
} from '@/shared/components/common';
import { ROUTES } from '@/shared/constants';
import { toast } from '@/shared/utils/toast';

const PAGE_SIZE = 10;
const STATUS_FETCH_LIMIT = 100;

const STATUS_LABELS = {
  admit: 'Admit',
  admitted: 'Admit',
  discharged: 'Discharged',
  complete: 'Complete',
  completed: 'Complete',
  no_show: 'Missed appointment',
  missed: 'Missed appointment',
  missed_appointment: 'Missed appointment',
};

function statusKey(value) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, '_');
}

function statusLabel(value) {
  const key = statusKey(value);
  return STATUS_LABELS[key] || value || '—';
}

function matchesStatus(value, selected) {
  const key = statusKey(value);
  if (selected === 'admit') return key === 'admit' || key === 'admitted';
  if (selected === 'discharged') return key === 'discharged';
  if (selected === 'complete') return key === 'complete' || key === 'completed';
  if (selected === 'missed') {
    return key === 'no_show' || key === 'missed' || key === 'missed_appointment';
  }
  return true;
}

function visitSource(visit) {
  const explicit = String(visit?.source || '').trim().toLowerCase();
  if (explicit === 'ipd') return 'IPD';
  if (explicit === 'opd') return 'OPD';
  const marker = [visit?.token_number, visit?.bill_number, visit?.admission_no]
    .filter(Boolean)
    .join(' ')
    .toUpperCase();
  if (marker.includes('IPD')) return 'IPD';
  return 'OPD';
}

export default function VisitsReportPage() {
  const [searchParams] = useSearchParams();
  const focusVisitId = searchParams.get('visit');
  const [range, setRange] = useState({ from_date: '', to_date: '' });
  const [departmentId, setDepartmentId] = useState('all');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);

  const { data: departments } = useAdminDepartmentsQuery();

  useEffect(() => {
    setPage(1);
  }, [range.from_date, range.to_date, departmentId, status]);

  const filters = useMemo(() => {
    const params = {
      from_date: range.from_date,
      to_date: range.to_date,
      page: status === 'all' ? page : 1,
      limit: status === 'all' ? PAGE_SIZE : STATUS_FETCH_LIMIT,
    };
    if (departmentId !== 'all') params.department_id = Number(departmentId);
    return params;
  }, [range, departmentId, status, page]);

  const { data, isLoading, isError, error, refetch } = useAdminReportsVisitsQuery(filters);

  const matchedVisits = useMemo(() => {
    const rows = data?.visits ?? [];
    if (status === 'all') return rows;
    return rows.filter((visit) => matchesStatus(visit.status, status));
  }, [data, status]);

  const visits = status === 'all'
    ? matchedVisits
    : matchedVisits.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const focusVisible = focusVisitId != null && visits.some(
    (visit) => String(visit.visit_id) === String(focusVisitId),
  );
  const total = status === 'all' ? (data?.total ?? 0) : matchedVisits.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const departmentOptions = useMemo(
    () => [
      { value: 'all', label: 'All departments' },
      ...(departments?.map((dept) => ({
        value: String(dept.id),
        label: dept.name,
      })) ?? []),
    ],
    [departments]
  );

  const statusOptions = [
    { value: 'all', label: 'All statuses' },
    { value: 'admit', label: 'Admit' },
    { value: 'discharged', label: 'Discharged' },
    { value: 'complete', label: 'Complete' },
    { value: 'missed', label: 'Missed appointment' },
  ];

  const resetFilters = () => {
    setRange({ from_date: '', to_date: '' });
    setDepartmentId('all');
    setStatus('all');
    setPage(1);
  };

  const handleExport = () => {
    toast.info('Export will be available in a future release.');
  };

  return (
    <ManagerLayout pageTitle="Visit reports">
      <div className="admin-page admin-page--compact">
        <ManagerPageHeader
          title="Visit reports"
          actions={(
            <nav className="admin-subnav" aria-label="Report sections">
              <NavLink
                to={ROUTES.MANAGER_REPORTS}
                end
                className={({ isActive }) =>
                  `admin-subnav__link${isActive ? ' admin-subnav__link--active' : ''}`
                }
              >
                Overview
              </NavLink>
              <NavLink
                to={ROUTES.MANAGER_REPORTS_VISITS}
                className={({ isActive }) =>
                  `admin-subnav__link${isActive ? ' admin-subnav__link--active' : ''}`
                }
              >
                Visits
              </NavLink>
            </nav>
          )}
        />

        <p className="admin-reports-toolbar__subtitle">
          Detailed visit records with billing and payment status.
        </p>

        <div className="admin-visits-filter-row">
          <ManagerReportFilters
            inline
            fromDate={range.from_date}
            toDate={range.to_date}
            onFromChange={(value) => setRange((prev) => ({ ...prev, from_date: value }))}
            onToChange={(value) => setRange((prev) => ({ ...prev, to_date: value }))}
          >
            <Select
              label="Department"
              value={departmentId}
              onChange={setDepartmentId}
              options={departmentOptions}
              className="admin-visits-filter-row__dept"
            />
            <Select
              label="Status"
              value={status}
              onChange={setStatus}
              options={statusOptions}
              className="admin-visits-filter-row__status"
            />
            <Button type="button" variant="outline" size="sm" onClick={handleExport}>
              <Download size={16} aria-hidden />
              Export
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={resetFilters}>
              <RotateCcw size={14} aria-hidden />
              Reset
            </Button>
          </ManagerReportFilters>
        </div>

        {focusVisitId && data && !focusVisible ? (
          <p className="admin-reports-toolbar__subtitle">
            Visit {focusVisitId} is not on this page. The visits report cannot search by visit id, so no other visit was selected.
          </p>
        ) : null}

        <QueryFeedback
          isLoading={isLoading}
          isError={isError}
          error={error}
          onRetry={refetch}
        >
          {data && (
            <>
              <div className="admin-card admin-card--flat">
                <div className="admin-card__body admin-card__body--flush-top">
                  {!visits.length ? (
                    <ManagerEmptyState
                      icon={<FileText size={22} />}
                      title="No visits found"
                      description="Adjust the date range, department, or status filter to see visit records."
                    />
                  ) : (
                    <>
                      <div className="admin-table-wrap">
                        <table className="admin-table admin-table--stack">
                          <thead>
                            <tr>
                              <th>Patient UID</th>
                              <th>Patient</th>
                              <th>Doctor</th>
                              <th>Department</th>
                              <th>Visit date</th>
                              <th className="admin-table__num">Total</th>
                              <th className="admin-table__num">Paid</th>
                              <th>Payment</th>
                              <th>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {visits.map((visit) => {
                              const source = visitSource(visit);
                              return (
                              <tr
                                key={visit.visit_id}
                                className={
                                  focusVisitId != null && String(visit.visit_id) === String(focusVisitId)
                                    ? 'admin-visits-row--focus'
                                    : undefined
                                }
                              >
                                <td data-label="Patient UID">
                                  <span className="admin-visits-uid">
                                    <span>{visit.patient_uid || '—'}</span>
                                    <span className={`admin-visits-uid__source admin-visits-uid__source--${source.toLowerCase()}`}>
                                      {source}
                                    </span>
                                  </span>
                                </td>
                                <td data-label="Patient"><span>{visit.patient_name || '—'}</span></td>
                                <td data-label="Doctor"><span>{visit.doctor_name || '—'}</span></td>
                                <td data-label="Department"><span>{visit.department_name}</span></td>
                                <td data-label="Visit date"><span>{formatReportDate(visit.visit_date)}</span></td>
                                <td className="admin-table__num" data-label="Total">
                                  <span>{formatCurrency(visit.grand_total)}</span>
                                </td>
                                <td className="admin-table__num" data-label="Paid">
                                  <span>
                                  {visit.paid_amount != null
                                    ? formatCurrency(visit.paid_amount)
                                    : '—'}
                                  </span>
                                </td>
                                <td data-label="Payment">
                                  <ManagerStatusPill label={visit.payment_status} />
                                </td>
                                <td data-label="Status">
                                  <ManagerStatusPill label={statusLabel(visit.status)} />
                                </td>
                              </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {total > PAGE_SIZE && (
                        <TablePagination
                          page={page}
                          pageSize={PAGE_SIZE}
                          totalPages={totalPages}
                          totalItems={total}
                          onPageChange={setPage}
                          itemLabel="items"
                        />
                      )}
                    </>
                  )}
                </div>
              </div>
            </>
          )}
        </QueryFeedback>
      </div>
    </ManagerLayout>
  );
}
