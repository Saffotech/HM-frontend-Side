import { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  ClipboardList,
  Pill,
  ChevronRight,
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
import { QueryFeedback } from '@/shared/components/common';
import { formatPatientIdDisplay } from '@/shared/api/mappers/nurseMapper';
import { useNurseMedicationPatientsQuery } from '@/shared/hooks/queries/useNurseQuery';
import './NurseMedicationPatientsPage.css';

const WARD_OPTIONS = [
  { value: 'all', label: 'All Ward', tone: 'all', Icon: LayoutGrid },
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
    <div className="nurse-med-patients-page__ward-dropdown" ref={rootRef}>
      <button
        type="button"
        id="med-patients-ward"
        className={`nurse-med-patients-page__ward-trigger nurse-med-patients-page__ward-trigger--${selected.tone}${
          open ? ' nurse-med-patients-page__ward-trigger--open' : ''
        }`}
        onClick={() => setOpen((isOpen) => !isOpen)}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={`Ward filter: ${selected.label}`}
      >
        <span className="nurse-med-patients-page__ward-trigger-icon" aria-hidden>
          <SelectedIcon size={16} />
        </span>
        <span className="nurse-med-patients-page__ward-trigger-label">{selected.label}</span>
        <ChevronDown
          size={16}
          className={`nurse-med-patients-page__ward-trigger-chevron${open ? ' is-open' : ''}`}
          aria-hidden
        />
      </button>
      {open && (
        <ul className="nurse-med-patients-page__ward-menu" role="listbox" aria-label="Select ward">
          {WARD_OPTIONS.map((option) => {
            const OptionIcon = option.Icon;
            const isActive = value === option.value;
            return (
              <li key={option.value} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={isActive}
                  className={`nurse-med-patients-page__ward-option nurse-med-patients-page__ward-option--${option.tone}${
                    isActive ? ' nurse-med-patients-page__ward-option--active' : ''
                  }`}
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                >
                  <span className="nurse-med-patients-page__ward-option-icon" aria-hidden>
                    <OptionIcon size={15} />
                  </span>
                  <span className="nurse-med-patients-page__ward-option-label">{option.label}</span>
                  {isActive && (
                    <Check size={14} className="nurse-med-patients-page__ward-option-check" aria-hidden />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function matchesWard(wardName, wardFilter) {
  if (!wardFilter || wardFilter === 'all') return true;
  const normalized = String(wardName ?? '').trim().toLowerCase();
  return normalized === wardFilter || normalized.includes(wardFilter);
}

function getWardTone(wardName) {
  const ward = String(wardName ?? '').trim().toLowerCase();
  if (ward.includes('icu')) return 'icu';
  if (ward.includes('private')) return 'private';
  if (ward.includes('general')) return 'general';
  if (ward.includes('ward')) return 'ward';
  return 'default';
}

function patientInitial(name) {
  const trimmed = String(name ?? '').trim();
  return trimmed ? trimmed.charAt(0).toUpperCase() : '?';
}

export default function NurseMedicationPatientsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [wardFilter, setWardFilter] = useState('all');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search, 400);
  const { data, isLoading, isError, error, refetch } = useNurseMedicationPatientsQuery({
    search: debouncedSearch,
    page,
    page_size: 20,
  });
  const patients = data?.items ?? [];
  const filteredPatients = useMemo(
    () => patients.filter((patient) => matchesWard(patient.ward_name, wardFilter)),
    [patients, wardFilter],
  );

  const totalMedicines = useMemo(
    () => filteredPatients.reduce((sum, p) => sum + (p.medicine_count || 0), 0),
    [filteredPatients],
  );

  const openPatient = useCallback(
    (row) => navigate(`/nurse/medications/patient/${row.patient_id}`),
    [navigate],
  );

  const columns = useMemo(() => [
    {
      header: 'Patient Name',
      render: (row) => (
        <div className="nurse-med-patients__name-cell">
          <span className="nurse-med-patients__avatar" aria-hidden>
            {patientInitial(row.patient_name)}
          </span>
          <span className="nurse-med-patients__name">{row.patient_name}</span>
          <ChevronRight size={14} className="nurse-med-patients__row-chevron" aria-hidden />
        </div>
      ),
    },
    {
      header: 'Patient ID',
      render: (row) => <span className="nurse-med-patients__uhid">{formatPatientIdDisplay(row)}</span>,
    },
    {
      header: 'Bed',
      render: (row) => <span className="nurse-med-patients__bed">{row.bed_number || '—'}</span>,
    },
    {
      header: 'Ward',
      render: (row) => {
        const tone = getWardTone(row.ward_name);
        return (
          <span className={`nurse-med-patients__ward nurse-med-patients__ward--${tone}`}>
            {row.ward_name || '—'}
          </span>
        );
      },
    },
    {
      header: 'Medicines',
      render: (row) => (
        <span className="nurse-med-patients__count">{row.medicine_count ?? 0}</span>
      ),
    },
  ], []);

  const hasFilters = Boolean(search.trim() || wardFilter !== 'all');

  return (
    <NurseLayout>
      <div className="nurse-page nurse-med-patients-page">
        <header className="nurse-med-patients-page__hero">
          <div className="nurse-med-patients-page__hero-icon" aria-hidden>
            <Pill size={22} />
          </div>
          <div className="nurse-med-patients-page__hero-text">
            <h1 className="nurse-med-patients-page__title">Medication Patients</h1>
            {/* <p className="nurse-med-patients-page__subtitle">
              Patients with active prescriptions — tap a row to administer
            </p> */}
          </div>
        </header>

        <div className="nurse-card nurse-med-patients-page__panel">
          <div className="nurse-med-patients-page__toolbar">
            <div className="nurse-med-patients-page__filters">
              <div className="nurse-med-patients-page__filter-row">
                <div className="nurse-field nurse-med-patients-page__search-field">
                  <label htmlFor="med-patients-search">Patient Search</label>
                  <div className="nurse-med-patients-page__search-wrap">
                    <input
                      id="med-patients-search"
                      type="search"
                      className="nurse-input nurse-med-patients-page__search-input"
                      value={search}
                      onChange={(e) => {
                        setSearch(e.target.value);
                        setPage(1);
                      }}
                      placeholder="Patient name or patient ID…"
                    />
                  </div>
                </div>

                <div className="nurse-field nurse-med-patients-page__ward-field">
                  <WardFilterDropdown
                    value={wardFilter}
                    onChange={(next) => {
                      setWardFilter(next);
                      setPage(1);
                    }}
                  />
                </div>

                {hasFilters && (
                  <button
                    type="button"
                    className="nurse-med-patients-page__clear"
                    onClick={() => {
                      setSearch('');
                      setWardFilter('all');
                      setPage(1);
                    }}
                  >
                    Clear filters
                  </button>
                )}
              </div>
            </div>

            <div className="nurse-med-patients-page__summary" aria-label="Patient summary">
              {isLoading ? (
                <span className="nurse-med-patients-page__summary-loading">Loading…</span>
              ) : (
                <>
                  <div className="nurse-med-patients-page__stat nurse-med-patients-page__stat--patients">
                    <span className="nurse-med-patients-page__stat-icon" aria-hidden>
                      <Users size={15} />
                    </span>
                    <span className="nurse-med-patients-page__stat-text">
                      <span className="nurse-med-patients-page__stat-value">
                        {filteredPatients.length}
                      </span>
                      <span className="nurse-med-patients-page__stat-label">
                        {filteredPatients.length === 1 ? 'Patient' : 'Patients'}
                      </span>
                    </span>
                  </div>
                  <div className="nurse-med-patients-page__stat nurse-med-patients-page__stat--meds">
                    <span className="nurse-med-patients-page__stat-icon" aria-hidden>
                      <ClipboardList size={15} />
                    </span>
                    <span className="nurse-med-patients-page__stat-text">
                      <span className="nurse-med-patients-page__stat-value">{totalMedicines}</span>
                      <span className="nurse-med-patients-page__stat-label">
                        {totalMedicines === 1 ? 'Medicine due' : 'Medicines due'}
                      </span>
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          <QueryFeedback isLoading={isLoading} isError={isError} error={error} onRetry={refetch}>
            <div className="nurse-med-patients-page__table">
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
        </div>
      </div>
    </NurseLayout>
  );
}
