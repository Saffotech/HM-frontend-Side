import { useEffect, useMemo, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Download, FileText } from 'lucide-react';
import AdminLayout from '@/features/admin/components/AdminLayout';
import AdminEmptyState from '@/features/admin/components/AdminEmptyState';
import AdminPageHeader from '@/features/admin/components/AdminPageHeader';
import AdminReportFilters from '@/features/admin/components/AdminReportFilters';
import AdminStatusPill from '@/features/admin/components/AdminStatusPill';
import {
  defaultReportDateRange,
  formatCurrency,
  formatReportDate,
} from '@/features/admin/utils/reportUtils';
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

export default function VisitsReportPage() {
  const [range, setRange] = useState(defaultReportDateRange);
  const [departmentId, setDepartmentId] = useState('all');
  const [page, setPage] = useState(1);

  const { data: departments } = useAdminDepartmentsQuery();

  useEffect(() => {
    setPage(1);
  }, [range.from_date, range.to_date, departmentId]);

  const filters = useMemo(() => {
    const params = {
      from_date: range.from_date,
      to_date: range.to_date,
      page,
      limit: PAGE_SIZE,
    };
    if (departmentId !== 'all') params.department_id = Number(departmentId);
    return params;
  }, [range, departmentId, page]);

  const { data, isLoading, isError, error, refetch } = useAdminReportsVisitsQuery(filters);

  const visits = data?.visits ?? [];
  const total = data?.total ?? 0;
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

  const resetFilters = () => {
    setRange(defaultReportDateRange());
    setDepartmentId('all');
    setPage(1);
  };

  const handleExport = () => {
    toast.info('Export will be available in a future release.');
  };

  return (
    <AdminLayout pageTitle="Visit reports">
      <div className="admin-page">
        <AdminPageHeader
          eyebrow="Analytics"
          title="Visit reports"
          subtitle="Detailed visit records with billing and payment status."
          actions={(
            <nav className="admin-subnav" aria-label="Report sections">
              <NavLink
                to={ROUTES.ADMIN_REPORTS}
                end
                className={({ isActive }) =>
                  `admin-subnav__link${isActive ? ' admin-subnav__link--active' : ''}`
                }
              >
                Overview
              </NavLink>
              <NavLink
                to={ROUTES.ADMIN_REPORTS_VISITS}
                className={({ isActive }) =>
                  `admin-subnav__link${isActive ? ' admin-subnav__link--active' : ''}`
                }
              >
                Visits
              </NavLink>
            </nav>
          )}
        />

        <AdminReportFilters
          fromDate={range.from_date}
          toDate={range.to_date}
          onFromChange={(value) => setRange((prev) => ({ ...prev, from_date: value }))}
          onToChange={(value) => setRange((prev) => ({ ...prev, to_date: value }))}
          onReset={resetFilters}
          showReset
        >
          <Select
            label="Department"
            value={departmentId}
            onChange={setDepartmentId}
            options={departmentOptions}
          />
          <Button type="button" variant="outline" onClick={handleExport}>
            <Download size={16} aria-hidden />
            Export
          </Button>
        </AdminReportFilters>

        <QueryFeedback
          isLoading={isLoading}
          isError={isError}
          error={error}
          onRetry={refetch}
        >
          {data && (
            <>
              <p className="admin-report-period">
                Period: {formatReportDate(data.from_date)} — {formatReportDate(data.to_date)}
                {' · '}
                {total} visit{total === 1 ? '' : 's'}
              </p>

              <div className="admin-card admin-card--flat">
                <div className="admin-card__body admin-card__body--flush-top">
                  {!visits.length ? (
                    <AdminEmptyState
                      icon={<FileText size={22} />}
                      title="No visits found"
                      description="Adjust the date range or department filter to see visit records."
                    />
                  ) : (
                    <>
                      <div className="admin-table-wrap">
                        <table className="admin-table">
                          <thead>
                            <tr>
                              <th>Bill #</th>
                              <th>Token</th>
                              <th>Patient</th>
                              <th>Department</th>
                              <th>Visit date</th>
                              <th className="admin-table__num">Total</th>
                              <th className="admin-table__num">Paid</th>
                              <th>Payment</th>
                              <th>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {visits.map((visit) => (
                              <tr key={visit.visit_id}>
                                <td>{visit.bill_number}</td>
                                <td>{visit.token_number}</td>
                                <td>#{visit.patient_id}</td>
                                <td>{visit.department_name}</td>
                                <td>{formatReportDate(visit.visit_date)}</td>
                                <td className="admin-table__num">
                                  {formatCurrency(visit.grand_total)}
                                </td>
                                <td className="admin-table__num">
                                  {visit.paid_amount != null
                                    ? formatCurrency(visit.paid_amount)
                                    : '—'}
                                </td>
                                <td>
                                  <AdminStatusPill label={visit.payment_status} />
                                </td>
                                <td>
                                  <AdminStatusPill label={visit.status} />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {total > PAGE_SIZE && (
                        <TablePagination
                          page={page}
                          totalPages={totalPages}
                          onPageChange={setPage}
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
    </AdminLayout>
  );
}
