import { useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { Users, Filter, ChevronRight, ChevronDown, CalendarDays, RotateCcw, Check } from 'lucide-react';

import { useDoctorPatientVisitsQuery } from '@/features/doctor/hooks/useDoctorPatientQuery';

import { useDoctorTodayAppointmentsQuery } from '@/features/doctor/hooks/useDoctorAppointmentQuery';

import { visitRowToPatientSummary } from '@/shared/api/mappers/doctorPatientMapper';

import { Input, EmptyState } from '@/shared/components/common';

import PatientHistoryProfile from './PatientHistoryProfile';

import StatusPill from './StatusPill';

import { prefetchPatientProfileData } from '@/features/doctor/utils/doctorPatientProfileCache';

import { useQueryToken } from '@/shared/hooks/useQueryToken';

import {

  DAY_FILTER_OPTIONS,

  MONTH_FILTER_OPTIONS,

  YEAR_FILTER_OPTIONS,

  DEFAULT_DATE_FILTERS,

  buildDoctorPatientsQueryParams,

  matchesPatientDateFilters,

} from '@/features/doctor/utils/patientDateFilters';

import {

  PATIENT_CATEGORY_FILTER,

  PATIENT_CATEGORY_OPTIONS,

  buildPatientListByCategory,

  categoryEmptyMessage,

  TODAY_APPOINTMENT_CATEGORIES,

  DATE_FILTER_DISABLED_CATEGORIES,

} from '@/features/doctor/utils/patientListFilters';

import '../styles/doctor-ui.css';

const CATEGORY_HINTS = {
  [PATIENT_CATEGORY_FILTER.COMPLETED]: 'Open visit history',
  [PATIENT_CATEGORY_FILTER.QUEUE]: 'Patients waiting now',
  [PATIENT_CATEGORY_FILTER.IN_PROGRESS]: 'Scheduled today',
  [PATIENT_CATEGORY_FILTER.CANCELLED]: 'Cancelled today',
  [PATIENT_CATEGORY_FILTER.ALL]: 'All records combined',
};

function PatientCategorySelect({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const active =
    PATIENT_CATEGORY_OPTIONS.find((o) => o.value === value) ?? PATIENT_CATEGORY_OPTIONS[0];

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div className={`doc-patient-category${open ? ' doc-patient-category--open' : ''}`} ref={rootRef}>
      <button
        type="button"
        className="doc-patient-category__trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
      >
        <span className="doc-patient-category__trigger-icon" aria-hidden>
          <Filter size={14} />
        </span>
        <span className="doc-patient-category__trigger-label">{active.label}</span>
        <ChevronDown
          size={14}
          aria-hidden
          className={`doc-patient-category__trigger-chevron${open ? ' is-open' : ''}`}
        />
      </button>
      {open ? (
        <ul className="doc-patient-category__menu" role="listbox" aria-label="Patient list category">
          {PATIENT_CATEGORY_OPTIONS.map((option) => {
            const selected = option.value === value;
            return (
              <li key={option.value} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  className={`doc-patient-category__option${selected ? ' is-active' : ''}`}
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                >
                  <span className="doc-patient-category__option-text">
                    <span className="doc-patient-category__option-label">{option.label}</span>
                    <span className="doc-patient-category__option-hint">
                      {CATEGORY_HINTS[option.value]}
                    </span>
                  </span>
                  {selected ? <Check size={14} aria-hidden className="doc-patient-category__check" /> : null}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}



function formatAgeGender(row) {

  const agePart = row.age != null && row.age !== '' ? `${row.age}y` : null;

  const genderPart = row.gender && row.gender !== '—' ? row.gender : null;

  if (agePart && genderPart) return `${agePart} · ${genderPart}`;

  if (agePart) return agePart;

  if (genderPart) return genderPart;

  return '—';

}



function formatVisitDateCompact(scheduledAt) {

  if (!scheduledAt) return '—';

  const d = new Date(scheduledAt);

  if (Number.isNaN(d.getTime())) return String(scheduledAt);

  return d.toLocaleString('en-GB', {

    day: 'numeric',

    month: 'short',

    year: 'numeric',

    hour: '2-digit',

    minute: '2-digit',

  });

}



function PatientDateFilters({ filters, onChange, onReset, disabled }) {
  return (
    <div className="doc-patient-filters doc-patient-filters--pill" role="group" aria-label="Visit date filters">
      <label className="doc-patient-filters__field">
        <span>Day</span>
        <select
          value={filters.day}
          disabled={disabled}
          onChange={(e) => onChange({ ...filters, day: e.target.value })}
        >
          {DAY_FILTER_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
      <label className="doc-patient-filters__field">
        <span>Month</span>
        <select
          value={filters.month}
          disabled={disabled}
          onChange={(e) => onChange({ ...filters, month: e.target.value })}
        >
          {MONTH_FILTER_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
      <label className="doc-patient-filters__field">
        <span>Year</span>
        <select
          value={filters.year}
          disabled={disabled}
          onChange={(e) => onChange({ ...filters, year: e.target.value })}
        >
          {YEAR_FILTER_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
      {filters.year === 'custom' && (
        <label className="doc-patient-filters__field doc-patient-filters__field--year">
          <span>Year</span>
          <input
            type="number"
            min="1990"
            max="2100"
            disabled={disabled}
            value={filters.customYear}
            onChange={(e) => onChange({ ...filters, customYear: e.target.value })}
          />
        </label>
      )}
      <button
        type="button"
        className="doc-patient-filters__reset"
        disabled={disabled}
        onClick={onReset}
        title="Reset date filters"
      >
        <RotateCcw size={14} aria-hidden />
        <span>Reset</span>
      </button>
    </div>
  );
}



export default function PatientsEMRSection({

  initialCategoryFilter = PATIENT_CATEGORY_FILTER.COMPLETED,

}) {

  const queryClient = useQueryClient();
  const token = useQueryToken();

  const [q, setQ] = useState('');

  const [dateFilters, setDateFilters] = useState(DEFAULT_DATE_FILTERS);

  const [categoryFilter, setCategoryFilter] = useState(initialCategoryFilter);

  const [view, setView] = useState(null);



  useEffect(() => {

    setCategoryFilter(initialCategoryFilter);

  }, [initialCategoryFilter]);



  const needsCompletedApi =

    categoryFilter === PATIENT_CATEGORY_FILTER.COMPLETED ||

    categoryFilter === PATIENT_CATEGORY_FILTER.ALL;

  const needsTodayApi = TODAY_APPOINTMENT_CATEGORIES.has(categoryFilter);



  const apiParams = useMemo(

    () => buildDoctorPatientsQueryParams({ search: q, dateFilters }),

    [q, dateFilters]

  );



  const { data: visitsData, isLoading: visitsLoading } = useDoctorPatientVisitsQuery(

    { ...apiParams, limit: 100 },

    { enabled: needsCompletedApi }

  );

  const { data: todayAppointments = [], isLoading: todayLoading } =

    useDoctorTodayAppointmentsQuery();



  const completedVisits = useMemo(() => {

    const visits = visitsData?.visits ?? [];

    return visits.filter((row) => matchesPatientDateFilters(row, dateFilters));

  }, [visitsData?.visits, dateFilters]);



  const list = useMemo(() => {

    const rows = buildPatientListByCategory({

      category: categoryFilter,

      completedVisits,

      todayAppointments:
        needsTodayApi || categoryFilter === PATIENT_CATEGORY_FILTER.COMPLETED
          ? todayAppointments
          : [],

    });



    const term = q.trim().toLowerCase();

    if (!term) return rows;



    return rows.filter((row) => {

      const name = (row.name ?? '').toLowerCase();

      const uid = (row.patientUid ?? '').toLowerCase();

      return name.includes(term) || uid.includes(term);

    });

  }, [categoryFilter, completedVisits, todayAppointments, needsTodayApi, q]);



  const dateFiltersDisabled = DATE_FILTER_DISABLED_CATEGORIES.has(categoryFilter);



  const isLoading =

    (needsCompletedApi && visitsLoading) || (needsTodayApi && todayLoading);



  const activeCategoryLabel =

    PATIENT_CATEGORY_OPTIONS.find((o) => o.value === categoryFilter)?.label ?? 'Patients';



  const showPatientActions = categoryFilter === PATIENT_CATEGORY_FILTER.COMPLETED;
  const tableColumnCount = showPatientActions ? 6 : 5;

  const profilePlaceholderVisits = useMemo(
    () => (view ? list.filter((row) => row.patientUid === view.patientUid) : []),
    [view, list],
  );

  const openPatient = (row) => {
    const summary = visitRowToPatientSummary(row);
    void prefetchPatientProfileData(queryClient, token, {
      patientUid: summary?.patientUid,
      patientId: summary?.patientId,
    });
    setView(summary);
  };



  if (view) {

    return (

      <PatientHistoryProfile

        patient={view}

        placeholderVisits={profilePlaceholderVisits}

        onBack={() => setView(null)}

        backLabel="Back to Patients"

      />

    );

  }



  return (

    <div className="doc-page doc-patients-page">

      <div className="doc-card doc-patients-page__panel">

        <div className="doc-patients-page__head">

          <div className="doc-patients-page__head-text">

            <h2 className="doc-patients-page__title">Patients</h2>

            <p className="doc-patients-page__subtitle">

              {list.length} record{list.length === 1 ? '' : 's'} · {activeCategoryLabel}

            </p>

          </div>

          <PatientCategorySelect value={categoryFilter} onChange={setCategoryFilter} />

        </div>



        <div className="doc-patients-page__toolbar">
          <div className="doc-patient-search doc-patient-search--inline">
            <Input
              className="doc-patient-search__field"
              placeholder="Search by name or patient ID…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>

          <div
            className={`doc-patients-page__date-strip${dateFiltersDisabled ? ' doc-patients-page__date-strip--disabled' : ''}`}
          >
            <span className="doc-patients-page__date-label">
              <CalendarDays size={15} aria-hidden />
              Visit date
            </span>
            <PatientDateFilters
              filters={dateFilters}
              onChange={setDateFilters}
              onReset={() => setDateFilters(DEFAULT_DATE_FILTERS)}
              disabled={dateFiltersDisabled}
            />
          </div>
        </div>



        <div className="doc-patients-page__table-wrap table-wrap">
          <table
            className={`data-table doc-patient-table doc-patient-table--compact${showPatientActions ? '' : ' doc-patient-table--no-action'}`}
          >
            <colgroup>
              <col className="doc-patient-col doc-patient-col--uid" />
              <col className="doc-patient-col doc-patient-col--name" />
              <col className="doc-patient-col doc-patient-col--meta" />
              <col className="doc-patient-col doc-patient-col--date" />
              <col className="doc-patient-col doc-patient-col--status" />
              {showPatientActions ? (
                <col className="doc-patient-col doc-patient-col--action" />
              ) : null}
            </colgroup>
            <thead>
              <tr>
                <th scope="col">Patient Id</th>
                <th scope="col">Name</th>
                <th scope="col">Age/Gender</th>
                <th scope="col">Visit date</th>
                <th scope="col">Status</th>
                {showPatientActions ? (
                  <th className="doc-patient-table__th-action" scope="col">
                    Action
                  </th>
                ) : null}
              </tr>
            </thead>

            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={tableColumnCount} className="doc-patients-page__empty">
                    Loading patients…
                  </td>
                </tr>
              ) : list.length === 0 ? (
                <tr>
                  <td colSpan={tableColumnCount} className="doc-patient-table__empty-cell">
                    <EmptyState
                      icon={Users}
                      title="No patients found"
                      description={categoryEmptyMessage(categoryFilter)}
                    />
                  </td>
                </tr>
              ) : (
                list.map((row) => (
                  <tr
                    key={row.id}
                    className="doc-patient-row"
                    onClick={() => openPatient(row)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        openPatient(row);
                      }
                    }}
                    tabIndex={0}
                    role="button"
                    aria-label={`Open profile for ${row.name}`}
                  >
                    <td className="doc-patient-table__uid">{row.patientUid}</td>
                    <td className="doc-patient-table__name">
                      <strong>{row.name}</strong>
                    </td>
                    <td className="doc-patient-table__meta">{formatAgeGender(row)}</td>
                    <td className="doc-patient-table__date">
                      {formatVisitDateCompact(row.scheduledAt)}
                    </td>
                    <td className="doc-patient-table__status">
                      <StatusPill status={row.status} />
                    </td>
                    {showPatientActions ? (
                      <td className="doc-patient-table__action">
                        <span className="doc-patient-table__view">
                          View
                          <ChevronRight size={14} aria-hidden />
                        </span>
                      </td>
                    ) : null}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

      </div>

    </div>

  );

}


