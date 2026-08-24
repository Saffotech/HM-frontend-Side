import { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';
import { useNavigate } from 'react-router-dom';
import {
  Pill,
  ChevronDown,
  LayoutGrid,
  Building2,
  Activity,
  Shield,
  Check,
  X,
} from 'lucide-react';
import NurseLayout from '@/features/nurse/components/NurseLayout';
import NurseDataTable from '@/features/nurse/components/NurseDataTable';
import NursePagination from '@/features/nurse/components/NursePagination';
import { QueryFeedback } from '@/shared/components/common';
import { formatPatientIdDisplay, getPagedListCount } from '@/shared/api/mappers/nurseMapper';
import { useNurseMedicationPatientsQuery } from '@/shared/hooks/queries/useNurseQuery';
import { useNursePatientScope } from '@/features/nurse/context/NursePatientScopeContext';
import { useNursePermissionSet } from '@/features/nurse/hooks/useNursePermission';
import { useNursePagedListGuard } from '@/features/nurse/hooks/useNursePagedListGuard';
import NursePatientAllocationTags from '@/features/nurse/components/NursePatientAllocationTags';
import './NurseMedicationPatientsPage.css';

const WARD_OPTIONS = [
  { value: 'all', label: 'All wards', tone: 'all', Icon: LayoutGrid },
  { value: 'general', label: 'General', tone: 'general', Icon: Building2 },
  { value: 'icu', label: 'ICU', tone: 'icu', Icon: Activity },
  { value: 'private', label: 'Private', tone: 'private', Icon: Shield },
];

function WardFilterDropdown({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const selected = WARD_OPTIONS.find((option) => option.value === value) ?? WARD_OPTIONS[0];
  const SelectedIcon = selected.Icon;

  useEffect(() => {
    if (!open) return undefined;
    const onDocClick = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div className="nurse-med-patients__ward-dropdown" ref={rootRef}>
      <button
        type="button"
        className={`nurse-input nurse-med-patients__ward-trigger${open ? ' is-open' : ''}`}
        onClick={() => setOpen((isOpen) => !isOpen)}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={`Ward filter: ${selected.label}`}
      >
        <SelectedIcon size={15} aria-hidden />
        <span>{selected.label}</span>
        <ChevronDown size={15} className={open ? 'is-open' : undefined} aria-hidden />
      </button>
      {open ? (
        <ul className="nurse-med-patients__ward-menu" role="listbox" aria-label="Select ward">
          {WARD_OPTIONS.map((option) => {
            const OptionIcon = option.Icon;
            const isActive = value === option.value;
            return (
              <li key={option.value} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={isActive}
                  className={`nurse-med-patients__ward-option${isActive ? ' is-active' : ''}`}
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                >
                  <OptionIcon size={15} aria-hidden />
                  <span>{option.label}</span>
                  {isActive ? <Check size={14} aria-hidden /> : null}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

function matchesWard(wardName, wardFilter) {
  if (!wardFilter || wardFilter === 'all') return true;
  const normalized = String(wardName ?? '').trim().toLowerCase();
  return normalized === wardFilter || normalized.includes(wardFilter);
}

export default function NurseMedicationPatientsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [wardFilter, setWardFilter] = useState('all');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search, 400);
  const { scopeFilters, scopeReady, allocatedOnly } = useNursePatientScope();
  const { canViewMedication } = useNursePermissionSet();
  const { data, isLoading, isFetching, isError, error, refetch } = useNurseMedicationPatientsQuery(
    {
      search: debouncedSearch,
      page,
      page_size: 20,
      ...scopeFilters,
    },
    { enabled: scopeReady && canViewMedication },
  );
  const patients = data?.items ?? [];
  const filteredPatients = useMemo(
    () => patients.filter((patient) => matchesWard(patient.ward_name, wardFilter)),
    [patients, wardFilter],
  );

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, wardFilter, allocatedOnly]);

  useNursePagedListGuard({
    isLoading,
    page,
    items: data?.items,
    onPageChange: setPage,
  });

  const listCount = useMemo(() => {
    if (wardFilter !== 'all') {
      return { count: filteredPatients.length, approximate: false };
    }
    return getPagedListCount({
      page,
      page_size: 20,
      items: data?.items,
      total: data?.total,
      hasNextPage: data?.hasNextPage,
    });
  }, [wardFilter, filteredPatients.length, page, data]);

  const openPatient = useCallback(
    (row) => navigate(`/nurse/medications/patient/${row.patient_id}`),
    [navigate],
  );

  const columns = useMemo(() => [
    {
      header: 'Patient ID',
      render: (row) => (
        <span className="nurse-notes-registry__id">{formatPatientIdDisplay(row)}</span>
      ),
    },
    {
      header: 'Patient Name',
      render: (row) => (
        <span className="nurse-patient-name-with-tags">
          <span className="nurse-notes-registry__name">{row.patient_name || '—'}</span>
          <NursePatientAllocationTags patientId={row.patient_id} />
        </span>
      ),
    },
    {
      header: 'Ward',
      render: (row) => <span>{row.ward_name || '—'}</span>,
    },
    {
      header: 'Bed',
      render: (row) => (
        <span className="nurse-notes-registry__bed">{row.bed_number || '—'}</span>
      ),
    },
    {
      header: 'Medicines',
      render: (row) => <span>{row.medicine_count ?? 0}</span>,
    },
  ], []);

  const hasFilters = Boolean(search.trim() || wardFilter !== 'all');

  return (
    <NurseLayout>
      <div className="nurse-page nurse-notes-registry nurse-med-patients">
        {!canViewMedication ? (
          <div className="nurse-alert nurse-alert--error">
            You do not have permission to view medications.
          </div>
        ) : (
          <>
            <div className="nurse-notes-registry__toolbar nurse-card">
              <div className="nurse-notes-registry__toolbar-left">
                <div className="nurse-notes-registry__icon" aria-hidden>
                  <Pill size={22} />
                </div>
                <div>
                  <p className="nurse-notes-registry__count">
                    {isLoading && !data ? '…' : (
                      <>
                        {listCount.approximate ? `${listCount.count}+` : listCount.count}
                      </>
                    )}
                    {' '}
                    {listCount.count === 1 && !listCount.approximate ? 'patient' : 'patients'}
                  </p>
                  <p className="nurse-notes-registry__hint">
                    Patients with active prescriptions. Open a row to administer.
                  </p>
                </div>
              </div>

              <div className="nurse-med-patients__toolbar-filters">
                <div
                  className={`nurse-notes-registry__search-wrap nurse-med-patients__search-wrap${
                    search ? ' nurse-med-patients__search-wrap--has-clear' : ''
                  }`}
                >
                  <input
                    type="text"
                    className="nurse-input nurse-notes-registry__search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by name, patient ID, or bed…"
                    aria-label="Search medication patients"
                  />
                  {search ? (
                    <button
                      type="button"
                      className="nurse-med-patients__search-clear"
                      onClick={() => setSearch('')}
                      aria-label="Clear search"
                    >
                      <X size={14} aria-hidden />
                    </button>
                  ) : null}
                </div>

                <WardFilterDropdown value={wardFilter} onChange={setWardFilter} />

                {hasFilters ? (
                  <button
                    type="button"
                    className="nurse-btn nurse-btn--secondary nurse-btn--sm"
                    onClick={() => {
                      setSearch('');
                      setWardFilter('all');
                    }}
                  >
                    Clear
                  </button>
                ) : null}
              </div>
            </div>

            <QueryFeedback
              isLoading={isLoading && !data}
              isError={isError}
              error={error}
              onRetry={refetch}
            >
              <div
                className={`nurse-notes-registry__table${
                  isFetching ? ' nurse-notes-registry__table--fetching' : ''
                }`}
              >
                <NurseDataTable
                  columns={columns}
                  data={filteredPatients}
                  isLoading={false}
                  emptyMessage={
                    hasFilters
                      ? 'No patients match your filters.'
                      : 'No patients with active prescriptions.'
                  }
                  onRowClick={openPatient}
                />
              </div>

              <NursePagination
                page={page}
                pageSize={20}
                total={data?.total}
                hasNextPage={data?.hasNextPage}
                itemCount={patients.length}
                onChange={setPage}
              />
            </QueryFeedback>
          </>
        )}
      </div>
    </NurseLayout>
  );
}
