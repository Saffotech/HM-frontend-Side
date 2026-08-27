import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  ChevronDown,
  LayoutGrid,
  Building2,
  Activity,
  Shield,
  Check,
} from 'lucide-react';
import NurseLayout from '@/features/nurse/components/NurseLayout';
import NurseDataTable from '@/features/nurse/components/NurseDataTable';
import NursePagination from '@/features/nurse/components/NursePagination';
import { useNursePermissionSet } from '@/features/nurse/hooks/useNursePermission';
import { useNurseDocumentedPatients } from '@/features/nurse/hooks/useNurseDocumentedPatients';
import { useNursePatientScope } from '@/features/nurse/context/NursePatientScopeContext';
import { QueryFeedback } from '@/shared/components/common';
import { formatPatientIdDisplay } from '@/shared/api/mappers/nurseMapper';
import { ROUTES } from '@/shared/constants';
import NursePatientAllocationTags from '@/features/nurse/components/NursePatientAllocationTags';
import '@/features/nurse/pages/NurseMedicationPatientsPage.css';

const PAGE_SIZE = 10;

const WARD_OPTIONS = [
  { value: 'all', label: 'All wards', Icon: LayoutGrid },
  { value: 'general', label: 'General', Icon: Building2 },
  { value: 'icu', label: 'ICU', Icon: Activity },
  { value: 'private', label: 'Private', Icon: Shield },
];

function matchesWard(wardName, wardFilter) {
  if (!wardFilter || wardFilter === 'all') return true;
  const normalized = String(wardName ?? '').trim().toLowerCase();
  return normalized === wardFilter || normalized.includes(wardFilter);
}

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

function CareStatusBadge({ done, doneLabel = 'Done', pendingLabel = 'Not done', tone }) {
  if (done) {
    return (
      <span className={`nurse-badge nurse-badge--${tone}`}>
        {doneLabel}
      </span>
    );
  }
  return (
    <span className="nurse-badge nurse-badge--not-done">
      {pendingLabel}
    </span>
  );
}

export default function NurseQueuePage() {
  const navigate = useNavigate();
  const { canViewPatients } = useNursePermissionSet();
  const { scopeReady, allocatedOnly, allocationSummary } = useNursePatientScope();
  const [search, setSearch] = useState('');
  const [wardFilter, setWardFilter] = useState('all');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search, 400);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, wardFilter, allocatedOnly]);

  const { data, isLoading, isError, error, refetch } = useNurseDocumentedPatients({
    search: debouncedSearch,
    page: 1,
    page_size: 100,
  });

  const allPatients = data?.items || [];
  const filteredPatients = useMemo(
    () => allPatients.filter((row) => matchesWard(row.ward_name, wardFilter)),
    [allPatients, wardFilter],
  );

  const pageCount = Math.max(1, Math.ceil(filteredPatients.length / PAGE_SIZE) || 1);
  const safePage = Math.min(page, pageCount);
  const pagedPatients = useMemo(
    () => filteredPatients.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [filteredPatients, safePage],
  );

  const total = filteredPatients.length;
  const pendingCareCount = useMemo(() => {
    if (wardFilter === 'all') return data?.pending_care_count || 0;
    return filteredPatients.filter((row) => !row.has_vitals || !row.has_notes).length;
  }, [wardFilter, data?.pending_care_count, filteredPatients]);

  const handleRowClick = useCallback(
    (row) => {
      if (canViewPatients) {
        navigate(`/nurse/patients/${row.patient_id}`, {
          state: { backTo: ROUTES.NURSE_QUEUE },
        });
      }
    },
    [navigate, canViewPatients],
  );

  const columns = useMemo(() => [
    {
      header: 'Patient ID',
      render: (row) => <span className="nurse-queue__id">{formatPatientIdDisplay(row)}</span>,
    },
    {
      header: 'Patient Name',
      render: (row) => (
        <span className="nurse-patient-name-with-tags">
          <span className="nurse-queue__name">{row.patient_name}</span>
          <NursePatientAllocationTags patientId={row.patient_id} />
        </span>
      ),
    },
    {
      header: 'Bed Number',
      render: (row) => <span className="nurse-queue__bed">{row.bed_number || '—'}</span>,
    },
    {
      header: 'Ward',
      render: (row) => <span className="nurse-queue__ward">{row.ward_name || '—'}</span>,
    },
    {
      header: 'Vitals',
      render: (row) => <CareStatusBadge done={Boolean(row.has_vitals)} tone="vitals" />,
    },
    {
      header: 'Notes',
      render: (row) => <CareStatusBadge done={Boolean(row.has_notes)} tone="notes" />,
    },
  ], []);

  const hasActiveFilters = Boolean(search.trim() || wardFilter !== 'all');

  const clearFilters = () => {
    setSearch('');
    setWardFilter('all');
    setPage(1);
  };

  return (
    <NurseLayout>
      <div className="nurse-page nurse-queue-page">
        <div className="nurse-queue-page__header nurse-card">
          <div className="nurse-queue-page__header-left">
            <div className="nurse-queue-page__icon" aria-hidden>
              <Users size={20} />
            </div>
            <div>
              <h1 className="nurse-queue-page__title">Patient</h1>
              <p className="nurse-queue-page__subtitle">
                {!scopeReady || isLoading ? 'Loading patients…' : (
                  <>
                    <strong>{total}</strong>
                    {' '}
                    {total === 1 ? 'patient' : 'patients'}
                    {pendingCareCount > 0 ? (
                      <>
                        {' · '}
                        <strong>{pendingCareCount}</strong>
                        {' '}
                        need vitals or notes
                      </>
                    ) : null}
                    {allocatedOnly && allocationSummary?.has_allocations === false
                      ? ' (no beds assigned this shift)'
                      : ''}
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="nurse-queue-page__header-search">
            <label htmlFor="nurse-queue-search" className="nurse-queue-page__search-label">
              Search patients
            </label>
            <div className="nurse-queue-page__search-wrap">
              <input
                id="nurse-queue-search"
                type="search"
                className="nurse-input nurse-queue-page__search"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="Name, UHID, bed, or ward…"
                aria-label="Search patients"
              />
            </div>
            <WardFilterDropdown
              value={wardFilter}
              onChange={(value) => {
                setWardFilter(value);
                setPage(1);
              }}
            />
            {hasActiveFilters ? (
              <button type="button" className="nurse-queue-page__clear" onClick={clearFilters}>
                Clear
              </button>
            ) : null}
          </div>
        </div>

        <QueryFeedback
          isLoading={isLoading}
          isError={isError}
          error={error}
          onRetry={refetch}
        >
          <div className="nurse-queue-page__table">
            <NurseDataTable
              columns={columns}
              data={pagedPatients}
              isLoading={false}
              emptyMessage={
                hasActiveFilters
                  ? 'No patients match your filters.'
                  : 'No patients found.'
              }
              onRowClick={canViewPatients ? handleRowClick : undefined}
            />
          </div>

          <NursePagination
            page={safePage}
            pageSize={PAGE_SIZE}
            total={total}
            hasNextPage={safePage < pageCount}
            itemCount={pagedPatients.length}
            onChange={setPage}
          />
        </QueryFeedback>
      </div>
    </NurseLayout>
  );
}
