import { useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient, useQueries } from '@tanstack/react-query';

import { Users, Filter, ChevronRight, ChevronDown, CalendarDays, RotateCcw, Check } from 'lucide-react';

import { useDoctorPatientVisitsQuery } from '@/features/doctor/hooks/useDoctorPatientQuery';

import { useDoctorTodayAppointmentsQuery } from '@/features/doctor/hooks/useDoctorAppointmentQuery';
import { useDoctorIpdAdmissionsQuery } from '@/features/doctor/hooks/useDoctorIpdQuery';

import { visitRowToPatientSummary, appointmentToVisitRow } from '@/shared/api/mappers/doctorPatientMapper';

import { Input, EmptyState } from '@/shared/components/common';

import PatientHistoryProfile from './PatientHistoryProfile';

import StatusPill from './StatusPill';

import { prefetchPatientProfileData } from '@/features/doctor/utils/doctorPatientProfileCache';

import { formatPatientAgeGender } from '@/features/doctor/utils/formatPatientAge';

import { useQueryToken } from '@/shared/hooks/useQueryToken';

import { patientsApi } from '@/shared/api/services';

import { queryKeys } from '@/shared/api/queryKeys';

import {

  DAY_FILTER_OPTIONS,

  MONTH_FILTER_OPTIONS,

  YEAR_FILTER_OPTIONS,

  CUSTOM_YEAR_OPTIONS,

  DEFAULT_DATE_FILTERS,

  buildDoctorPatientsQueryParams,

  matchesPatientDateFilters,

} from '@/features/doctor/utils/patientDateFilters';
import { DOCTOR_ENCOUNTER_MODE, matchesDoctorEncounterMode } from '@/features/doctor/utils/encounterType';

import {

  PATIENT_CATEGORY_FILTER,

  PATIENT_CATEGORY_OPTIONS,

  IPD_PATIENT_CATEGORY_FILTER,

  IPD_PATIENT_CATEGORY_OPTIONS,

  IPD_PATIENT_CATEGORY_VALUES,

  OPD_PATIENT_CATEGORY_VALUES,

  buildPatientListByCategory,

  categoryEmptyMessage,

  ipdCategoryEmptyMessage,

  ipdStatusQueryParam,

  TODAY_APPOINTMENT_CATEGORIES,

  DATE_FILTER_DISABLED_CATEGORIES,

} from '@/features/doctor/utils/patientListFilters';

import '../styles/doctor-ui.css';

const OPD_CATEGORY_HINTS = {
  [PATIENT_CATEGORY_FILTER.COMPLETED]: 'Open visit history',
  [PATIENT_CATEGORY_FILTER.QUEUE]: 'Patients waiting now',
  [PATIENT_CATEGORY_FILTER.IN_PROGRESS]: 'Scheduled today',
  [PATIENT_CATEGORY_FILTER.CANCELLED]: 'Cancelled today',
  [PATIENT_CATEGORY_FILTER.ALL]: 'All records combined',
};

const IPD_CATEGORY_HINTS = {
  [IPD_PATIENT_CATEGORY_FILTER.ADMITTED]: 'Currently admitted under you',
  [IPD_PATIENT_CATEGORY_FILTER.DISCHARGED]: 'Discharged IPD admissions',
  [IPD_PATIENT_CATEGORY_FILTER.ALL]: 'All IPD admissions combined',
};

const IPD_PATIENTS_PAGE_SIZE = 100;

function resolveInitialCategoryFilter(initial, encounterMode) {
  if (encounterMode === DOCTOR_ENCOUNTER_MODE.IPD) {
    return IPD_PATIENT_CATEGORY_VALUES.has(initial)
      ? initial
      : IPD_PATIENT_CATEGORY_FILTER.DISCHARGED;
  }
  return OPD_PATIENT_CATEGORY_VALUES.has(initial)
    ? initial
    : PATIENT_CATEGORY_FILTER.COMPLETED;
}

function PatientCategorySelect({ value, onChange, options, hints }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const active = options.find((o) => o.value === value) ?? options[0];

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
          {options.map((option) => {
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
                      {hints[option.value]}
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
  return formatPatientAgeGender({
    age: row.age,
    dob: row.dob,
    gender: row.gender,
  });
}



function formatVisitDateCompact(row) {
  const scheduledAt = row?.admittedAt ?? row?.scheduledAt ?? row?.visitAt;

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
          onChange={(e) => {
            const year = e.target.value;
            onChange({
              ...filters,
              year,
              customYear:
                year === 'custom'
                  ? filters.customYear || String(new Date().getFullYear())
                  : filters.customYear,
            });
          }}
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
          <select
            value={filters.customYear}
            disabled={disabled}
            onChange={(e) => onChange({ ...filters, customYear: e.target.value })}
            aria-label="Custom year"
          >
            {!CUSTOM_YEAR_OPTIONS.some((o) => o.value === String(filters.customYear)) &&
            filters.customYear ? (
              <option value={filters.customYear}>{filters.customYear}</option>
            ) : null}
            {CUSTOM_YEAR_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
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
  encounterMode = DOCTOR_ENCOUNTER_MODE.OPD,

}) {

  const queryClient = useQueryClient();
  const token = useQueryToken();
  const isIpdMode = encounterMode === DOCTOR_ENCOUNTER_MODE.IPD;

  const [q, setQ] = useState('');

  const [dateFilters, setDateFilters] = useState(DEFAULT_DATE_FILTERS);

  const [categoryFilter, setCategoryFilter] = useState(() =>
    resolveInitialCategoryFilter(initialCategoryFilter, encounterMode),
  );

  const [view, setView] = useState(null);

  const categoryOptions = isIpdMode ? IPD_PATIENT_CATEGORY_OPTIONS : PATIENT_CATEGORY_OPTIONS;
  const categoryHints = isIpdMode ? IPD_CATEGORY_HINTS : OPD_CATEGORY_HINTS;

  useEffect(() => {
    setCategoryFilter(resolveInitialCategoryFilter(initialCategoryFilter, encounterMode));
  }, [initialCategoryFilter, encounterMode]);

  useEffect(() => {
    setCategoryFilter((current) => {
      if (isIpdMode) {
        return IPD_PATIENT_CATEGORY_VALUES.has(current)
          ? current
          : IPD_PATIENT_CATEGORY_FILTER.DISCHARGED;
      }
      return OPD_PATIENT_CATEGORY_VALUES.has(current)
        ? current
        : PATIENT_CATEGORY_FILTER.COMPLETED;
    });
  }, [isIpdMode]);

  const needsCompletedApi =
    !isIpdMode &&
    (categoryFilter === PATIENT_CATEGORY_FILTER.COMPLETED ||
      categoryFilter === PATIENT_CATEGORY_FILTER.ALL);

  const needsTodayApi = !isIpdMode && TODAY_APPOINTMENT_CATEGORIES.has(categoryFilter);



  const apiParams = useMemo(

    () => buildDoctorPatientsQueryParams({
      search: q,
      dateFilters,
      encounter_type: encounterMode,
    }),

    [q, dateFilters, encounterMode]

  );

  const ipdQueryParams = useMemo(
    () => ({
      status: ipdStatusQueryParam(categoryFilter),
      search: q.trim() || undefined,
      page: 1,
      page_size: IPD_PATIENTS_PAGE_SIZE,
    }),
    [categoryFilter, q],
  );

  const { data: visitsData, isLoading: visitsLoading } = useDoctorPatientVisitsQuery(

    { ...apiParams, limit: 100 },

    { enabled: needsCompletedApi }

  );

  const { data: todayAppointments = [], isLoading: todayLoading } =

    useDoctorTodayAppointmentsQuery();

  const { data: ipdData, isPending: ipdLoading } = useDoctorIpdAdmissionsQuery(
    ipdQueryParams,
    { enabled: isIpdMode },
  );



  const completedVisits = useMemo(() => {

    const visits = visitsData?.visits ?? [];

    return visits.filter((row) => matchesPatientDateFilters(row, dateFilters));

  }, [visitsData?.visits, dateFilters]);

  const dateFiltersDisabled = !isIpdMode && DATE_FILTER_DISABLED_CATEGORIES.has(categoryFilter);

  const list = useMemo(() => {
    if (isIpdMode) {
      const rows = (ipdData?.items ?? [])
        .map((appt) => {
          const row = appointmentToVisitRow(appt);
          if (!row) return null;
          return {
            ...row,
            id: appt.admissionId != null ? `ipd-${appt.admissionId}` : row.id,
          };
        })
        .filter(Boolean);

      return rows.filter((row) => matchesPatientDateFilters(row, dateFilters));
    }

    const rows = buildPatientListByCategory({

      category: categoryFilter,

      completedVisits,

      todayAppointments:
        needsTodayApi || categoryFilter === PATIENT_CATEGORY_FILTER.COMPLETED
          ? todayAppointments
          : [],

    });

    const dateFiltered = dateFiltersDisabled
      ? rows
      : rows.filter((row) => matchesPatientDateFilters(row, dateFilters));

    const term = q.trim().toLowerCase();

    if (!term) {
      return dateFiltered.filter((row) => matchesDoctorEncounterMode(row, encounterMode));
    }

    return dateFiltered.filter((row) => {
      if (!matchesDoctorEncounterMode(row, encounterMode)) return false;

      const name = (row.name ?? '').toLowerCase();

      const uid = (row.patientUid ?? '').toLowerCase();

      return name.includes(term) || uid.includes(term);

    });

  }, [
    isIpdMode,
    ipdData?.items,
    categoryFilter,
    completedVisits,
    todayAppointments,
    needsTodayApi,
    q,
    dateFilters,
    dateFiltersDisabled,
    encounterMode,
  ]);

  // Doctor list APIs only send whole-year age; fetch DOB for infants so Age/Gender can show m/d.
  const infantPatientIds = useMemo(() => {
    const ids = new Set();
    for (const row of list) {
      if (row.dob) continue;
      const years = Number(row.age);
      if (!Number.isFinite(years) || years >= 1) continue;
      const id = row.patientId;
      if (id == null || Number.isNaN(Number(id))) continue;
      ids.add(Number(id));
    }
    return [...ids];
  }, [list]);

  const infantProfileQueries = useQueries({
    queries: infantPatientIds.map((patientId) => ({
      queryKey: queryKeys.patients.profile(patientId),
      queryFn: () => patientsApi.getPatientProfileById(patientId, token),
      enabled: Boolean(token) && patientId != null,
      staleTime: 1000 * 60 * 5,
      refetchOnWindowFocus: false,
    })),
  });

  const dobByPatientId = useMemo(() => {
    const map = new Map();
    infantProfileQueries.forEach((query, index) => {
      const patientId = infantPatientIds[index];
      const dob = query.data?.patient?.dob ?? null;
      if (patientId != null && dob) map.set(patientId, dob);
    });
    return map;
  }, [infantProfileQueries, infantPatientIds]);

  const displayList = useMemo(
    () =>
      list.map((row) => {
        if (row.dob || row.patientId == null) return row;
        const dob = dobByPatientId.get(Number(row.patientId));
        return dob ? { ...row, dob } : row;
      }),
    [list, dobByPatientId],
  );

  const isLoading = isIpdMode
    ? ipdLoading
    : (needsCompletedApi && visitsLoading) || (needsTodayApi && todayLoading);



  const activeCategoryLabel =

    categoryOptions.find((o) => o.value === categoryFilter)?.label ?? 'Patients';



  const showPatientActions = isIpdMode || categoryFilter === PATIENT_CATEGORY_FILTER.COMPLETED;
  const emptyDescription = isIpdMode
    ? ipdCategoryEmptyMessage(categoryFilter)
    : categoryEmptyMessage(categoryFilter);
  const tableColumnCount = showPatientActions ? 6 : 5;

  const profilePlaceholderVisits = useMemo(
    () => (view ? displayList.filter((row) => row.patientUid === view.patientUid) : []),
    [view, displayList],
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
        encounterMode={encounterMode}

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

              {displayList.length} record{displayList.length === 1 ? '' : 's'} · {encounterMode.toUpperCase()} · {activeCategoryLabel}

            </p>

          </div>

          <PatientCategorySelect
            value={categoryFilter}
            onChange={setCategoryFilter}
            options={categoryOptions}
            hints={categoryHints}
          />

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
              ) : displayList.length === 0 ? (
                <tr>
                  <td colSpan={tableColumnCount} className="doc-patient-table__empty-cell">
                    <EmptyState
                      icon={Users}
                      title="No patients found"
                      description={emptyDescription}
                    />
                  </td>
                </tr>
              ) : (
                displayList.map((row) => (
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
                      {formatVisitDateCompact(row)}
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


