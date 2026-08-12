/**
 * IPD Patient List — live `/ipd/patients`.
 * Stay filter: Admitted · Completed · All.
 */

import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button, DateInput, EmptyState, QueryFeedback } from '@/shared/components/common';
import { ROUTES, WARDS } from '@/shared/constants';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';
import IpdPageHeader from '@/features/ipd/components/IpdPageHeader';
import IpdStatusBadge from '@/features/ipd/components/IpdStatusBadge';
import { useIpdPermissionSet } from '@/features/ipd/hooks/useIpdPermission';
import IpdPermissionButton from '@/features/ipd/components/IpdPermissionButton';
import { useIpdPatientsQuery } from '@/features/ipd/hooks/useIpdQuery';
import { IPD_ADMISSION_STATUS } from '@/features/ipd/utils/constants';
import { formatIpdDateTime } from '@/features/ipd/utils/ipdFormat';

const WARD_CHIP = {
  General: 'ipd-pl-chip--green',
  ICU: 'ipd-pl-chip--rose',
  Private: 'ipd-pl-chip--violet',
};

/** URL/query values for the Stay filter */
const STAY_FILTER = {
  ADMITTED: IPD_ADMISSION_STATUS.ADMITTED,
  COMPLETED: IPD_ADMISSION_STATUS.DISCHARGED,
  ALL: 'all',
};

/** Accept only ISO YYYY-MM-DD (DateInput stores this; display is DD/MM/YYYY). */
function toIsoAdmissionDateParam(value) {
  const s = String(value || '').trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : '';
}

function wardChipClass(ward) {
  return WARD_CHIP[ward] || 'ipd-pl-chip--slate';
}

function parseStayFilter(raw) {
  if (raw === STAY_FILTER.COMPLETED || raw === 'discharged' || raw === 'completed') {
    return STAY_FILTER.COMPLETED;
  }
  if (raw === STAY_FILTER.ALL) {
    return STAY_FILTER.ALL;
  }
  return STAY_FILTER.ADMITTED;
}

export default function IpdPatientListPage() {
  const navigate = useNavigate();
  const {
    canViewPatient,
    canTransferBed,
    canViewBilling,
    canAdmit,
  } = useIpdPermissionSet();

  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(() => searchParams.get('search') ?? '');
  const [ward, setWard] = useState(() => searchParams.get('ward') ?? '');
  const [admissionDate, setAdmissionDate] = useState(
    () => toIsoAdmissionDateParam(searchParams.get('admissionDate'))
  );
  const [stay, setStay] = useState(() =>
    parseStayFilter(searchParams.get('status') ?? STAY_FILTER.ADMITTED)
  );
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search, 300);

  const statusParam = stay === STAY_FILTER.ALL ? undefined : stay;
  const admissionDateParam = toIsoAdmissionDateParam(admissionDate);

  const { data, isLoading, isError, error, refetch, isFetching } = useIpdPatientsQuery({
    search: debouncedSearch,
    status: statusParam,
    ward,
    admissionDate: admissionDateParam,
    page,
  });

  const rows = data?.items ?? [];
  const total = data?.total ?? 0;
  const limit = data?.limit ?? 20;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const showDischargeDate =
    stay === STAY_FILTER.COMPLETED || stay === STAY_FILTER.ALL;
  const showStatusColumn = stay !== STAY_FILTER.COMPLETED;
  const colSpan =
    6 + (showStatusColumn ? 1 : 0) + (showDischargeDate ? 1 : 0);

  const wardOptions = useMemo(() => WARDS ?? [], []);

  const pathFor = (template, admissionId) =>
    template.replace(':admissionId', String(admissionId));

  const onFilterChange = (setter, paramKey) => (e) => {
    const { value } = e.target;
    setter(value);
    setPage(1);
    const next = new URLSearchParams(searchParams);
    if (value) next.set(paramKey, value);
    else next.delete(paramKey);
    setSearchParams(next, { replace: true });
  };

  const onAdmissionDateChange = (e) => {
    const value = toIsoAdmissionDateParam(e.target.value);
    setAdmissionDate(value);
    setPage(1);
    const next = new URLSearchParams(searchParams);
    if (value) next.set('admissionDate', value);
    else next.delete('admissionDate');
    setSearchParams(next, { replace: true });
  };

  const onStayChange = (e) => {
    const value = parseStayFilter(e.target.value);
    setStay(value);
    setPage(1);
    const next = new URLSearchParams(searchParams);
    if (value === STAY_FILTER.ADMITTED) next.delete('status');
    else next.set('status', value);
    setSearchParams(next, { replace: true });
  };

  const emptyTitle =
    stay === STAY_FILTER.COMPLETED
      ? 'No completed stays'
      : stay === STAY_FILTER.ALL
        ? 'No IPD patients'
        : 'No admitted patients';

  return (
    <div className="ipd-page ipd-page--compact">
      <IpdPageHeader
        title="IPD Patients"
        actions={
          canAdmit ? (
            <Button type="button" onClick={() => navigate(ROUTES.IPD_ADMIT)}>
              Admit patient
            </Button>
          ) : null
        }
      />

      <div className="ipd-card">
        <div className="ipd-card__head ipd-pl-card__head">
          <h2 className="ipd-card__title">Patients</h2>
          {!isLoading ? (
            <span className="ipd-page__subtitle">
              {total} result{total === 1 ? '' : 's'}
              {isFetching ? ' · Updating…' : ''}
            </span>
          ) : null}
        </div>

        <div className="ipd-card__body">
          <div className="ipd-beds-filters ipd-pl-filters">
            <div className="ipd-toolbar__field ipd-beds-filters__search">
              <label className="ipd-toolbar__label" htmlFor="ipd-pl-search">
                Search
              </label>
              <input
                id="ipd-pl-search"
                className="ipd-input"
                value={search}
                onChange={onFilterChange(setSearch, 'search')}
                placeholder="Search patient"
              />
            </div>
            <div className="ipd-toolbar__field ipd-toolbar__field--sm">
              <label className="ipd-toolbar__label" htmlFor="ipd-pl-stay">
                Stay
              </label>
              <select
                id="ipd-pl-stay"
                className="ipd-select"
                value={stay}
                onChange={onStayChange}
              >
                <option value={STAY_FILTER.ADMITTED}>Admitted</option>
                <option value={STAY_FILTER.COMPLETED}>Completed</option>
                <option value={STAY_FILTER.ALL}>All</option>
              </select>
            </div>
            <div className="ipd-toolbar__field ipd-toolbar__field--sm">
              <label className="ipd-toolbar__label" htmlFor="ipd-pl-ward">
                Ward
              </label>
              <select
                id="ipd-pl-ward"
                className="ipd-select"
                value={ward}
                onChange={onFilterChange(setWard, 'ward')}
              >
                <option value="">All wards</option>
                {wardOptions.map((w) => (
                  <option key={w} value={w}>
                    {w}
                  </option>
                ))}
              </select>
            </div>
            <div className="ipd-toolbar__field ipd-toolbar__field--sm">
              <label className="ipd-toolbar__label" htmlFor="ipd-pl-date">
                Admission date
              </label>
              <DateInput
                id="ipd-pl-date"
                className="ipd-date-input"
                value={admissionDate}
                onChange={onAdmissionDateChange}
                placeholder="DD/MM/YYYY"
                aria-label="Admission date"
              />
            </div>
          </div>

          {isError ? (
            <QueryFeedback isError error={error} onRetry={refetch} />
          ) : isLoading ? (
            <div className="ipd-pl-skeletons">
              <div className="ipd-skeleton" />
              <div className="ipd-skeleton" />
            </div>
          ) : (
            <>
              <div className="ipd-table-wrap">
                <table className="ipd-table ipd-table--patients">
                  <thead>
                    <tr>
                      <th>Patient</th>
                      {showStatusColumn ? <th>Status</th> : null}
                      <th>Ward</th>
                      <th>Bed</th>
                      <th>Doctor</th>
                      <th>Admission date</th>
                      {showDischargeDate ? <th>Discharge date</th> : null}
                      <th className="ipd-table__col-actions">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.length === 0 ? (
                      <tr>
                        <td colSpan={colSpan}>
                          <EmptyState title={emptyTitle} />
                        </td>
                      </tr>
                    ) : (
                      rows.map((row) => {
                        const admitted =
                          row.status === IPD_ADMISSION_STATUS.ADMITTED;
                        return (
                          <tr
                            key={row.id}
                            className={
                              admitted
                                ? 'ipd-pl-row--admitted'
                                : 'ipd-pl-row--discharged'
                            }
                          >
                            <td>
                              <strong>{row.patient_name || '—'}</strong>
                              <div className="ipd-pl-patient__id">
                                {row.admission_no || row.patient_uid || '—'}
                              </div>
                            </td>
                            {showStatusColumn ? (
                              <td>
                                <IpdStatusBadge status={row.status} />
                              </td>
                            ) : null}
                            <td>
                              {row.ward_name ? (
                                <span
                                  className={`ipd-pl-chip ${wardChipClass(row.ward_name)}`}
                                >
                                  {row.ward_name}
                                </span>
                              ) : (
                                '—'
                              )}
                            </td>
                            <td>
                              {row.bed_number ? (
                                <span className="ipd-pl-chip ipd-pl-chip--bed">
                                  {row.bed_number}
                                </span>
                              ) : (
                                '—'
                              )}
                            </td>
                            <td>
                              {row.doctor_name ||
                                (admitted ? (
                                  <Link
                                    to={pathFor(ROUTES.IPD_PATIENT_DETAIL, row.id)}
                                    className="ipd-pl-assign-link"
                                  >
                                    Assign doctor
                                  </Link>
                                ) : (
                                  '—'
                                ))}
                            </td>
                            <td className="ipd-pl-date">
                              {formatIpdDateTime(row.admitted_at)}
                            </td>
                            {showDischargeDate ? (
                              <td className="ipd-pl-date">
                                {row.discharged_at
                                  ? formatIpdDateTime(row.discharged_at)
                                  : '—'}
                              </td>
                            ) : null}
                            <td className="ipd-table__col-actions">
                              <div className="ipd-table__actions">
                                <IpdPermissionButton
                                  allowed={canViewPatient}
                                  type="button"
                                  className="btn btn--sm ipd-action-btn ipd-action-btn--view"
                                  onClick={() =>
                                    navigate(
                                      pathFor(ROUTES.IPD_PATIENT_DETAIL, row.id)
                                    )
                                  }
                                >
                                  View
                                </IpdPermissionButton>
                                <IpdPermissionButton
                                  allowed={canTransferBed && admitted}
                                  type="button"
                                  className="btn btn--sm ipd-action-btn ipd-action-btn--transfer"
                                  onClick={() =>
                                    navigate(
                                      `${ROUTES.IPD_BED_TRANSFER}?admissionId=${row.id}`
                                    )
                                  }
                                >
                                  Transfer
                                </IpdPermissionButton>
                                <IpdPermissionButton
                                  allowed={canViewBilling}
                                  type="button"
                                  className="btn btn--sm ipd-action-btn ipd-action-btn--billing"
                                  onClick={() =>
                                    navigate(
                                      pathFor(ROUTES.IPD_BILL_PREVIEW, row.id)
                                    )
                                  }
                                >
                                  Billing
                                </IpdPermissionButton>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {total > 0 ? (
                <div className="ipd-beds-pager">
                  <span className="ipd-page__subtitle">
                    Showing {(page - 1) * limit + 1}–
                    {Math.min(page * limit, total)} of {total}
                  </span>
                  <div className="ipd-beds-pager__controls">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      Previous
                    </Button>
                    <span className="ipd-page__subtitle">
                      Page {page} / {totalPages}
                    </span>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
