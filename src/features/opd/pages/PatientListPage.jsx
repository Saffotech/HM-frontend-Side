import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Users } from 'lucide-react';
import { usePatientsQuery, useDeletePatientMutation } from '@/shared/hooks/queries/usePatientQuery';
import { asPatientList, asPatientPageMeta } from '@/shared/hooks/queries/listDataUtils';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';
import { usePagination } from '@/shared/hooks/usePagination';
import { useTableSort } from '@/shared/hooks/useTableSort';
import {
  REGISTRATION_DATE_FILTER_OPTIONS,
  matchesRegistrationDateFilter,
} from '@/features/opd/utils/patientRegisteredDateFilter';
import { Avatar, Button, DateInput, SearchBar, DataTableShell, QueryFeedback, ConfirmDialog, EmptyState } from '@/shared/components/common';
import { ROUTES } from '@/shared/constants';
import { toast } from '@/shared/utils/toast';
import './PatientListPage.css';

export default function PatientListPage() {
  const navigate = useNavigate();
  const deletePatient = useDeletePatientMutation();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search.trim(), 300);
  const [dateFilter, setDateFilter] = useState('all');
  const [customDate, setCustomDate] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [serverPage, setServerPage] = useState(1);
  const pageSize = 10;
  const useClientDateFilter = dateFilter !== 'all';

  useEffect(() => {
    setServerPage(1);
  }, [debouncedSearch, dateFilter, customDate]);

  const { data, isLoading, isError, error } = usePatientsQuery({
    fetchAll: useClientDateFilter,
    search: debouncedSearch || undefined,
    page: useClientDateFilter ? undefined : serverPage,
    limit: pageSize,
  });

  const patients = asPatientList(data);
  const pageMeta = asPatientPageMeta(data);

  const filtered = useMemo(
    () =>
      patients.filter((p) =>
        useClientDateFilter
          ? matchesRegistrationDateFilter(p, dateFilter, customDate)
          : true
      ),
    [patients, dateFilter, customDate, useClientDateFilter]
  );

  const { sorted, sortKey, sortDir, toggleSort } = useTableSort(filtered, 'name', 'asc');
  const clientPagination = usePagination(sorted, pageSize);

  const paginatedItems = useClientDateFilter
    ? clientPagination.paginatedItems
    : sorted;
  const page = useClientDateFilter ? clientPagination.page : pageMeta.page;
  const totalPages = useClientDateFilter ? clientPagination.totalPages : pageMeta.totalPages;
  const totalItems = useClientDateFilter ? clientPagination.totalItems : pageMeta.total;
  const goToPage = useClientDateFilter
    ? clientPagination.goToPage
    : (p) => setServerPage(p);

  useEffect(() => {
    if (useClientDateFilter) clientPagination.resetPage();
  }, [debouncedSearch, dateFilter, customDate, useClientDateFilter, clientPagination.resetPage]);

  const SortTh = ({ label, field, className = '' }) => (
    <th
      className={`sortable ${sortKey === field ? 'sorted' : ''} ${className}`.trim()}
      onClick={() => toggleSort(field)}
    >
      {label}
      <span className="sort-icon">{sortKey === field ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}</span>
    </th>
  );

  return (
    <QueryFeedback isLoading={isLoading} isError={isError} error={error}>
    <div className="page-stack patients-page">
      <div className="card patients-page__card">
        {patients.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No patients yet"
            description="Register your first patient to get started"
            action="Register patient"
            onAction={() => navigate(ROUTES.PATIENTS_REGISTER)}
          />
        ) : (
        <>
        <div className="page-toolbar patients-page__toolbar">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search name, phone or ID..."
            className="search-bar--wide patients-page__search"
          />
          <div className="patients-page__date-filters" role="group" aria-label="Filter by registration date">
            {REGISTRATION_DATE_FILTER_OPTIONS.map((f) => (
              <button
                key={f.id}
                type="button"
                className={`patients-page__date-filter${dateFilter === f.id ? ' patients-page__date-filter--active' : ''}`}
                onClick={() => setDateFilter(f.id)}
              >
                {f.label}
              </button>
            ))}
            {dateFilter === 'custom' && (
              <DateInput
                className="patients-page__custom-date"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                aria-label="Custom registration date"
              />
            )}
          </div>
          {(debouncedSearch || dateFilter !== 'all') && (
            <span className="result-count">
              {totalItems} patient{totalItems !== 1 ? 's' : ''}
              {useClientDateFilter ? ' (date filter on loaded records)' : ''}
            </span>
          )}
          <Link to={ROUTES.PATIENTS_REGISTER} className="patients-page__register-link">
            <Button>
              <Plus size={16} /> Register New Patient
            </Button>
          </Link>
        </div>

        <DataTableShell
          maxHeight="480px"
          pagination={{
            page,
            totalPages,
            totalItems,
            pageSize,
            onPageChange: goToPage,
          }}
        >
          <table className="data-table patients-table">
            <thead>
              <tr>
                <SortTh label="Patient" field="name" />
                <SortTh label="Contact" field="phone" className="col-optional" />
                <th className="col-optional">Blood</th>
                <SortTh label="Registered" field="registeredDate" className="col-optional" />
                <th className="patients-table__actions-head">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedItems.map((p) => (
                <tr
                  key={p.id}
                  className="patients-table__row"
                  onClick={() => navigate(`/patients/${p.id}/profile`)}
                  style={{ cursor: 'pointer' }}
                >
                  <td>
                    <div className="patient-cell">
                      <Avatar name={p.name} />
                      <div className="patient-cell__meta">
                        <strong>{p.name}</strong>
                        <span className="id-badge">{p.id}</span>
                        <span className="patient-cell__phone">{p.phone}</span>
                        <span className="patient-cell__gender">{p.gender}</span>
                      </div>
                    </div>
                  </td>
                  <td className="col-optional">
                    {p.phone}
                    <div className="text-muted">{p.gender}</div>
                  </td>
                  <td className="col-optional">
                    <span className="blood-badge">{p.bloodGroup}</span>
                  </td>
                  <td className="col-optional">{p.registeredDate}</td>
                  <td className="actions-cell patients-table__actions">
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={(e) => { e.stopPropagation(); setDeleteTarget(p); }}
                    >
                      Delete
                    </Button>
                  </td>
                </tr>
              ))}
              {!paginatedItems.length && (
                <tr>
                  <td colSpan={5} className="empty-row">No patients found</td>
                </tr>
              )}
            </tbody>
          </table>
        </DataTableShell>
        </>
        )}
      </div>
    </div>
      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        message={deleteTarget ? `Delete patient ${deleteTarget.name} (${deleteTarget.id})?` : ''}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          deletePatient.mutate(deleteTarget.dbId ?? deleteTarget.id, {
            onSuccess: () => {
              toast.success('Patient deleted');
              setDeleteTarget(null);
            },
          });
        }}
      />
    </QueryFeedback>
  );
}
