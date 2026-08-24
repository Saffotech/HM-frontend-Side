import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Stethoscope, X } from 'lucide-react';
import NurseLayout from '@/features/nurse/components/NurseLayout';
import NurseDataTable from '@/features/nurse/components/NurseDataTable';
import NursePagination from '@/features/nurse/components/NursePagination';
import NursePermissionButton from '@/features/nurse/components/NursePermissionButton';
import NurseLogVisitModal from '@/features/nurse/components/NurseLogVisitModal';
import { useNursePermissionSet } from '@/features/nurse/hooks/useNursePermission';
import { QueryFeedback, DateInput } from '@/shared/components/common';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';
import { useNursePatientScope } from '@/features/nurse/context/NursePatientScopeContext';
import { ROUTES } from '@/shared/constants';
import { formatPatientIdDisplay } from '@/shared/api/mappers/nurseMapper';
import { formatIpdDateTime } from '@/features/ipd/utils/ipdFormat';
import {
  useNurseBedPatientsQuery,
  useNurseDoctorVisitsQuery,
} from '@/shared/hooks/queries/useNurseQuery';
import NursePatientAllocationTags from '@/features/nurse/components/NursePatientAllocationTags';

const PAGE_SIZE = 20;
const FETCH_PAGE_SIZE = 100;
const WARD_OPTIONS = ['ICU', 'Private', 'General'];

export default function NurseDoctorVisitsPage() {
  const navigate = useNavigate();
  const { canViewDoctorVisits, canCreateDoctorVisits } = useNursePermissionSet();
  const {
    scopeReady,
    allocatedOnly,
    allocationSummary,
    scopeFilters,
    isPatientInScope,
  } = useNursePatientScope();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [ward, setWard] = useState('');
  const [admissionDate, setAdmissionDate] = useState('');
  const [logPatient, setLogPatient] = useState(null);
  const debouncedSearch = useDebouncedValue(search.trim(), 400);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, ward, admissionDate, allocatedOnly]);

  const filters = useMemo(
    () => ({
      search: debouncedSearch || undefined,
      ward_name: ward || undefined,
      page: 1,
      page_size: FETCH_PAGE_SIZE,
      ...scopeFilters,
    }),
    [debouncedSearch, ward, scopeFilters],
  );

  const { data, isLoading, isFetching, isError, error, refetch } = useNurseBedPatientsQuery(
    filters,
    { enabled: scopeReady && canViewDoctorVisits },
  );

  const visitsFilters = useMemo(
    () => ({
      page: 1,
      page_size: FETCH_PAGE_SIZE,
      allocated_only: allocatedOnly ? true : undefined,
      _scopeMode: allocatedOnly ? 'allocated' : 'all',
    }),
    [allocatedOnly],
  );

  const { data: visitsData } = useNurseDoctorVisitsQuery(visitsFilters, {
    enabled: scopeReady && canViewDoctorVisits,
  });

  const visitCountByPatientId = useMemo(() => {
    const map = new Map();
    for (const visit of visitsData?.items ?? []) {
      if (visit.is_voided) continue;
      const id = Number(visit.patient_id);
      if (!Number.isSafeInteger(id) || id < 1) continue;
      map.set(id, (map.get(id) ?? 0) + 1);
    }
    return map;
  }, [visitsData?.items]);

  const allRows = useMemo(() => {
    let items = data?.items ?? [];
    // Admission-date filter stays client-side (nurse beds API has no admission_date param).
    if (admissionDate) {
      items = items.filter((row) => {
        const raw = row.admitted_at;
        if (!raw) return false;
        return String(raw).slice(0, 10) === admissionDate;
      });
    }
    if (!allocatedOnly) return items;
    return items.filter((row) => isPatientInScope(row.patient_id));
  }, [data?.items, admissionDate, allocatedOnly, isPatientInScope]);

  const total = allRows.length;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const rows = useMemo(
    () => allRows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [allRows, safePage],
  );

  const columns = useMemo(
    () => [
      { header: 'Patient ID', render: (row) => formatPatientIdDisplay(row) },
      {
        header: 'Patient name',
        render: (row) => (
          <span className="nurse-patient-name-with-tags">
            <span>{row.patient_name?.trim() || '—'}</span>
            <NursePatientAllocationTags patientId={row.patient_id} />
          </span>
        ),
      },
      { header: 'Ward', render: (row) => row.ward_name || '—' },
      { header: 'Bed', render: (row) => row.bed_number || '—' },
      {
        header: 'Admission date',
        render: (row) => formatIpdDateTime(row.admitted_at),
      },
      {
        header: 'Status',
        render: () => (
          <span className="nurse-badge nurse-badge--active">Admitted</span>
        ),
      },
      {
        header: 'Visits',
        render: (row) => {
          const count = visitCountByPatientId.get(Number(row.patient_id)) ?? 0;
          return count > 0 ? (
            <span className="nurse-badge nurse-badge--active">{count}</span>
          ) : (
            <span className="nurse-badge nurse-badge--muted">0</span>
          );
        },
      },
      {
        header: 'Actions',
        render: (row) => (
          <div className="nurse-doctor-visits__actions">
            <NursePermissionButton
              allowed={canCreateDoctorVisits}
              className="nurse-btn nurse-btn--ghost nurse-doctor-visits__action"
              deniedMessage="You do not have permission to log doctor visits"
              onClick={() =>
                setLogPatient({
                  patient_id: row.patient_id,
                  patient_name: row.patient_name,
                })
              }
              aria-label={`Log visit for ${row.patient_name || 'patient'}`}
            >
              <Plus size={15} />
              Log Visit
            </NursePermissionButton>
          </div>
        ),
      },
    ],
    [canCreateDoctorVisits, visitCountByPatientId],
  );

  return (
    <NurseLayout>
      <div className="nurse-page nurse-doctor-visits-page">
        {!canViewDoctorVisits ? (
          <div className="nurse-alert nurse-alert--error">
            You do not have permission to view doctor visits.
          </div>
        ) : (
          <>
            <div className="nurse-doctor-visits-page__header nurse-card">
              <div className="nurse-doctor-visits-page__header-left">
                <div className="nurse-doctor-visits-page__icon" aria-hidden>
                  <Stethoscope size={20} />
                </div>
                <div>
                  <h1 className="nurse-doctor-visits-page__title">Doctor Visits</h1>
                  <p className="nurse-doctor-visits-page__subtitle">
                    {allocatedOnly
                      ? `Allocated filter · ${allocationSummary?.assigned_bed_count ?? 0} beds assigned`
                      : 'All IPD patients · log a doctor visit for any admitted patient'}
                  </p>
                </div>
              </div>
            </div>

            <div className="nurse-card nurse-doctor-visits-filters">
              <div className="nurse-doctor-visits-filters__grid">
                <div className="nurse-field nurse-doctor-visits-filters__search">
                  <label htmlFor="nurse-doctor-visits-search">Search</label>
                  <div className="nurse-doctor-visits-search-wrap">
                    <Search size={16} className="nurse-doctor-visits-search-icon" aria-hidden />
                    <input
                      id="nurse-doctor-visits-search"
                      type="search"
                      className="nurse-input nurse-doctor-visits-search"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search IPD patient by ID or name..."
                      aria-label="Search IPD patients"
                      autoComplete="off"
                    />
                  </div>
                </div>

                <div className="nurse-field nurse-doctor-visits-filters__ward">
                  <label htmlFor="nurse-doctor-visits-ward">Ward</label>
                  <div className="nurse-doctor-visits-filter-control">
                    <select
                      id="nurse-doctor-visits-ward"
                      className="nurse-select nurse-doctor-visits-filters__control"
                      value={ward}
                      onChange={(e) => setWard(e.target.value)}
                      aria-label="Filter by ward"
                    >
                      <option value="">All wards</option>
                      {WARD_OPTIONS.map((w) => (
                        <option key={w} value={w}>{w}</option>
                      ))}
                    </select>
                    {ward && (
                      <button
                        type="button"
                        className="nurse-doctor-visits-filter-clear"
                        onClick={() => setWard('')}
                        aria-label="Clear ward filter"
                        title="Clear ward filter"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="nurse-field nurse-doctor-visits-filters__date">
                  <label htmlFor="nurse-doctor-visits-admission-date">Admission date</label>
                  <div className="nurse-doctor-visits-filter-control">
                    <DateInput
                      id="nurse-doctor-visits-admission-date"
                      value={admissionDate}
                      onChange={(e) => setAdmissionDate(e.target.value)}
                      aria-label="Filter by admission date"
                    />
                    {admissionDate && (
                      <button
                        type="button"
                        className="nurse-doctor-visits-filter-clear"
                        onClick={() => setAdmissionDate('')}
                        aria-label="Clear admission date filter"
                        title="Clear admission date filter"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <QueryFeedback
              isLoading={isLoading && !data}
              isError={isError}
              error={error}
              onRetry={refetch}
            >
              <div
                className={`nurse-doctor-visits-table${
                  isFetching ? ' nurse-doctor-visits-table--fetching' : ''
                }`}
              >
                <div className="nurse-doctor-visits-table__head">
                  <p className="nurse-doctor-visits-table__count">
                    {isLoading && !data ? (
                      'Loading...'
                    ) : (
                      <>
                        <strong>{total}</strong>
                        {' '}
                        {total === 1 ? 'patient' : 'patients'}
                      </>
                    )}
                  </p>
                </div>

                <NurseDataTable
                  columns={columns}
                  data={rows}
                  isLoading={false}
                  onRowClick={(row) =>
                    navigate(ROUTES.NURSE_DOCTOR_VISITS_PATIENT.replace(':patientId', row.patient_id), {
                      state: { patient: row },
                    })
                  }
                  emptyMessage={
                    allocatedOnly
                      ? (allocationSummary?.assigned_bed_count
                        ? 'No IPD patients on your allocated beds.'
                        : 'No beds assigned this shift — Allocated filter shows no patients. Switch to All to see all IPD patients.')
                      : 'No admitted IPD patients match the current search.'
                  }
                />

                <NursePagination
                  page={safePage}
                  pageSize={PAGE_SIZE}
                  total={total}
                  itemCount={rows.length}
                  onChange={setPage}
                />
              </div>
            </QueryFeedback>
          </>
        )}
      </div>

      <NurseLogVisitModal
        open={Boolean(logPatient)}
        initialPatient={logPatient}
        onClose={() => setLogPatient(null)}
      />

    </NurseLayout>
  );
}
