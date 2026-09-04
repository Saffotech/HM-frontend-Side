/**
 * IPD Patient List — live `/ipd/patients`.
 * Stay filter: Admitted · Completed · All.
 */

import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Button, DateInput, EmptyState, QueryFeedback } from '@/shared/components/common';
import { ROUTES } from '@/shared/constants';
import { queryKeys } from '@/shared/api/queryKeys';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';
import IpdPageHeader from '@/features/ipd/components/IpdPageHeader';
import IpdStatusBadge from '@/features/ipd/components/IpdStatusBadge';
import BedTransferModal from '@/features/ipd/components/BedTransferModal';
import { useIpdPermissionSet } from '@/features/ipd/hooks/useIpdPermission';
import IpdPermissionButton from '@/features/ipd/components/IpdPermissionButton';
import { useIpdPatientsQuery } from '@/features/ipd/hooks/useIpdQuery';
import { useIpdInsurancePatientsQuery } from '@/features/ipd/hooks/useIpdBillingQuery';
import { useIpdWardOptions } from '@/features/ipd/hooks/useIpdWardOptions';
import { IPD_ADMISSION_STATUS } from '@/features/ipd/utils/constants';
import { formatIpdDateTime } from '@/features/ipd/utils/ipdFormat';
import { mapInsurancePatientRow } from '@/features/ipd/utils/mapInsuranceApi';
import {
  IPD_PAYMENT_TYPE,
  IPD_PAYMENT_TYPE_GROUP,
  IPD_PAYMENT_TYPE_GROUP_OPTIONS,
  IPD_PAYMENT_TYPE_SUB_OPTIONS,
  getPaymentTypeGroup,
  isInsuranceCashlessPaymentType,
  matchesPaymentType,
  parseIpdPaymentType,
  resolveIpdBillingPath,
  resolveIpdPatientOpenPath,
  paymentTypeQueryValue,
} from '@/features/ipd/utils/ipdPaymentTypes';
import { formatCurrency } from '@/shared/utils/formatCurrency';
import { toast } from '@/shared/utils/toast';

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

const INSURANCE_TABLE_COLUMNS = [
  'Patient',
  'Patient ID',
  'Coverage',
  'Insurance Company',
  'Policy No',
  'Policy Status',
  'Action',
];

/** Accept only ISO YYYY-MM-DD (DateInput stores this; display is DD/MM/YYYY). */
function toIsoAdmissionDateParam(value) {
  const s = String(value || '').trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : '';
}

function wardChipClass(ward) {
  return WARD_CHIP[ward] || 'ipd-pl-chip--slate';
}

function isInteractiveTableTarget(target) {
  return Boolean(
    target?.closest?.('a, button, input, select, textarea, label'),
  );
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

function parsePaymentType(raw) {
  return parseIpdPaymentType(raw);
}

/** One row per patient — prefer rows linked to an active admission. */
function dedupeCashlessInsurancePatients(rows, stay) {
  const byPatient = new Map();

  for (const row of rows) {
    const patientKey = String(row.uhid || row.id || '')
      .trim()
      .toLowerCase();
    if (!patientKey || patientKey === '—') continue;

    if (stay === STAY_FILTER.ADMITTED && !row.admissionId) continue;

    const prev = byPatient.get(patientKey);
    if (!prev) {
      byPatient.set(patientKey, row);
      continue;
    }
    if (!prev.admissionId && row.admissionId) {
      byPatient.set(patientKey, row);
    }
  }

  return [...byPatient.values()];
}

export default function IpdPatientListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
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
  const [paymentType, setPaymentType] = useState(() =>
    parsePaymentType(searchParams.get('paymentType'))
  );
  const [page, setPage] = useState(1);
  const [transferAdmissionId, setTransferAdmissionId] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);

  const statusParam = stay === STAY_FILTER.ALL ? undefined : stay;
  const admissionDateParam = toIsoAdmissionDateParam(admissionDate);

  const patientsQueryParams = useMemo(
    () => ({
      search: debouncedSearch,
      status: statusParam,
      ward,
      admissionDate: admissionDateParam,
      page,
    }),
    [debouncedSearch, statusParam, ward, admissionDateParam, page],
  );

  const showInsuranceCashless = isInsuranceCashlessPaymentType(paymentType);
  const paymentTypeGroup = getPaymentTypeGroup(paymentType);
  const cachedPatientsPage = queryClient.getQueryData(
    queryKeys.ipd.patients(patientsQueryParams),
  );

  const insurancePatientsQuery = useIpdInsurancePatientsQuery(
    patientsQueryParams,
    { enabled: showInsuranceCashless },
  );

  const insuranceHasRows =
    (insurancePatientsQuery.data?.items?.length ?? 0) > 0;

  const patientsQueryEnabled =
    !showInsuranceCashless ||
    !cachedPatientsPage ||
    (insurancePatientsQuery.isFetched && !insuranceHasRows);

  const { data, isLoading, isError, error, refetch } =
    useIpdPatientsQuery(patientsQueryParams, {
      enabled: patientsQueryEnabled,
    });

  const admissionListItems =
    data?.items ?? cachedPatientsPage?.items ?? [];

  const cashlessPatients = useMemo(() => {
    const fromApi = (insurancePatientsQuery.data?.items ?? []).map(
      mapInsurancePatientRow,
    );

    if (fromApi.length > 0) {
      return dedupeCashlessInsurancePatients(fromApi, stay);
    }

    const fromAdmissions = admissionListItems
      .filter((row) => matchesPaymentType(row, IPD_PAYMENT_TYPE.INSURANCE_CASHLESS))
      .map((row) =>
        mapInsurancePatientRow({
          ...row,
          patient_id: row.patient_id ?? row.patientId ?? undefined,
          patient_uid: row.patient_uid ?? row.uhid ?? row.patientUid ?? undefined,
          uhid: row.uhid ?? row.patient_uid ?? row.patientUid,
          admission_id: row.admission_id ?? row.admissionId ?? row.id,
          admissionId: row.admission_id ?? row.admissionId ?? row.id,
          patientName: row.patient_name ?? row.patientName ?? row.name,
          ageGender: row.age_gender ?? row.ageGender,
        }),
      );

    return dedupeCashlessInsurancePatients(fromAdmissions, stay);
  }, [insurancePatientsQuery.data?.items, admissionListItems, stay]);

  const rows = useMemo(() => {
    return admissionListItems.filter((row) => matchesPaymentType(row, paymentType));
  }, [admissionListItems, paymentType]);

  const total = showInsuranceCashless
    ? cashlessPatients.length
    : rows.length;
  const paymentTypeSummary = useMemo(() => {
    const selfCount = admissionListItems.filter((row) =>
      matchesPaymentType(row, IPD_PAYMENT_TYPE.SELF),
    ).length;
    const copayCount = admissionListItems.filter((row) =>
      matchesPaymentType(row, IPD_PAYMENT_TYPE.INSURANCE_COPAY),
    ).length;

    return {
      self: selfCount,
      cashless: cashlessPatients.length,
      copay: copayCount,
    };
  }, [admissionListItems, cashlessPatients]);

  const limit = data?.limit ?? cachedPatientsPage?.limit ?? 20;
  const insuranceListLoading =
    showInsuranceCashless &&
    insurancePatientsQuery.isLoading &&
    !insurancePatientsQuery.data;
  const headerSummaryLoading = showInsuranceCashless
    ? insuranceListLoading || (patientsQueryEnabled && isLoading)
    : isLoading;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const showDischargeDate =
    stay === STAY_FILTER.COMPLETED || stay === STAY_FILTER.ALL;
  const showStatusColumn = stay !== STAY_FILTER.COMPLETED;
  const colSpan =
    6 + (showStatusColumn ? 1 : 0) + (showDischargeDate ? 1 : 0);

  const { wardOptions } = useIpdWardOptions();

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

  const updatePaymentType = (nextType) => {
    setPaymentType(nextType);
    setPage(1);
    const next = new URLSearchParams(searchParams);
    const queryValue = paymentTypeQueryValue(nextType);
    if (queryValue) next.set('paymentType', queryValue);
    else next.delete('paymentType');
    setSearchParams(next, { replace: true });
  };

  const onPaymentGroupChange = (e) => {
    const group = e.target.value;
    const nextType =
      group === IPD_PAYMENT_TYPE_GROUP.INSURANCE
        ? IPD_PAYMENT_TYPE.INSURANCE_CASHLESS
        : IPD_PAYMENT_TYPE.SELF;
    updatePaymentType(nextType);
  };

  const onPaymentSubTypeChange = (e) => {
    updatePaymentType(parseIpdPaymentType(e.target.value));
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
          {!headerSummaryLoading ? (
            <div className="ipd-pl-summary">
              <span className="ipd-pl-chip ipd-pl-chip--slate">
                Self: {paymentTypeSummary.self}
              </span>
              <span className="ipd-ins-chip ipd-ins-chip--coverage">
                Cashless: {paymentTypeSummary.cashless}
              </span>
              <span className="ipd-pl-chip ipd-pl-chip--violet">
                Copay: {paymentTypeSummary.copay}
              </span>
            </div>
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
                placeholder="Search patient by ID"
              />
            </div>
            <div
              className={`ipd-toolbar__field ipd-pay-type-field ${
                paymentTypeGroup === IPD_PAYMENT_TYPE_GROUP.INSURANCE
                  ? 'ipd-pay-type-field--insurance'
                  : ''
              }`}
            >
              <label className="ipd-toolbar__label" htmlFor="ipd-pl-pay-type">
                Payment type
              </label>
              <div className="ipd-pay-type-selects">
                <select
                  id="ipd-pl-pay-type"
                  className="ipd-select"
                  value={paymentTypeGroup}
                  onChange={onPaymentGroupChange}
                >
                  {IPD_PAYMENT_TYPE_GROUP_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                {paymentTypeGroup === IPD_PAYMENT_TYPE_GROUP.INSURANCE && (
                  <select
                    id="ipd-pl-insurance-sub-type"
                    className="ipd-select"
                    value={paymentType}
                    onChange={onPaymentSubTypeChange}
                    aria-label="Insurance type"
                  >
                    {IPD_PAYMENT_TYPE_SUB_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                )}
              </div>
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

          {showInsuranceCashless ? (
            insurancePatientsQuery.isError ? (
              <QueryFeedback
                isError
                error={insurancePatientsQuery.error}
                onRetry={insurancePatientsQuery.refetch}
              />
            ) : insuranceListLoading ? (
              <div className="ipd-pl-skeletons">
                <div className="ipd-skeleton" />
                <div className="ipd-skeleton" />
              </div>
            ) : (
            <>
              <div className="ipd-table-wrap ipd-ins-table-wrap">
                <table className="ipd-table ipd-table--insurance">
                  <thead>
                    <tr>
                      {INSURANCE_TABLE_COLUMNS.map((col) => (
                        <th
                          key={col}
                          className={
                            col === 'Action' ? 'ipd-table__col-actions' : undefined
                          }
                        >
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {cashlessPatients.length === 0 ? (
                      <tr>
                        <td colSpan={INSURANCE_TABLE_COLUMNS.length}>
                          <EmptyState
                            title="No insurance patients"
                            description="Cashless insurance patients will appear here when connected."
                          />
                        </td>
                      </tr>
                    ) : (
                      cashlessPatients.map((row) => {
                        const admissionId = row.admissionId ?? null;
                        const canTransfer = canTransferBed && Boolean(admissionId);
                        return (
                        <tr
                          key={`${row.uhid}-${row.admissionId ?? row.claimId ?? row.id}`}
                          className="ipd-table__row--clickable"
                          tabIndex={0}
                          onClick={(e) => {
                            if (isInteractiveTableTarget(e.target)) return;
                            const path = resolveIpdPatientOpenPath({
                              ...row,
                              payment_type: IPD_PAYMENT_TYPE.INSURANCE_CASHLESS,
                              paymentType: IPD_PAYMENT_TYPE.INSURANCE_CASHLESS,
                            });
                            if (path) navigate(path);
                          }}
                          onKeyDown={(e) => {
                            if (e.key !== 'Enter') return;
                            if (isInteractiveTableTarget(e.target)) return;
                            e.currentTarget.click();
                          }}
                        >
                          <td>
                            <strong>{row.patientName}</strong>
                            <div className="ipd-ins-meta">{row.ageGender}</div>
                          </td>
                          <td>{row.uhid}</td>
                          <td>
                            <span className="ipd-ins-chip ipd-ins-chip--coverage">
                              {row.coverage}
                            </span>
                          </td>
                          <td>{row.insurer}</td>
                          <td>{row.policyNo}</td>
                          <td>
                            <span className="ipd-ins-chip ipd-ins-chip--active">
                              {row.policyStatus}
                            </span>
                          </td>
                          <td>
                            <div className="ipd-table__actions">
                              <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                              onClick={() => {
                                const path = resolveIpdPatientOpenPath({
                                  ...row,
                                  payment_type: IPD_PAYMENT_TYPE.INSURANCE_CASHLESS,
                                  paymentType: IPD_PAYMENT_TYPE.INSURANCE_CASHLESS,
                                });
                                if (path) navigate(path);
                              }}
                              >
                                Open
                              </Button>
                              <IpdPermissionButton
                                allowed={canTransfer}
                                deniedMessage={
                                  canTransferBed
                                    ? 'No active admission found for this patient'
                                    : 'You do not have permission to transfer beds'
                                }
                                type="button"
                                className="btn btn--sm ipd-action-btn ipd-action-btn--transfer"
                                onClick={() =>
                                  setTransferAdmissionId(String(admissionId))
                                }
                              >
                                Transfer
                              </IpdPermissionButton>
                              <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                className="ipd-action-btn ipd-action-btn--billing"
                                onClick={() => {
                                  const path = resolveIpdBillingPath({
                                    ...row,
                                    payment_type: IPD_PAYMENT_TYPE.INSURANCE_CASHLESS,
                                    paymentType: IPD_PAYMENT_TYPE.INSURANCE_CASHLESS,
                                  });
                                  if (path) navigate(path);
                                }}
                              >
                                Billing
                              </Button>
                            </div>
                          </td>
                        </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
              <div className="ipd-beds-pager">
                <span className="ipd-page__subtitle">
                  Showing 1–{cashlessPatients.length} of{' '}
                  {cashlessPatients.length}
                </span>
                <div className="ipd-beds-pager__controls">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled
                  >
                    Previous
                  </Button>
                  <span className="ipd-page__subtitle">Page 1 / 1</span>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
            )
          ) : isError ? (
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
                      <th>Admission NO</th>
                      {showStatusColumn ? <th>Status</th> : null}
                      <th>Ward</th>
                      <th>Bed</th>
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
                            className={[
                              'ipd-table__row--clickable',
                              admitted
                                ? 'ipd-pl-row--admitted'
                                : 'ipd-pl-row--discharged',
                            ].join(' ')}
                            tabIndex={canViewPatient ? 0 : undefined}
                            onClick={(e) => {
                              if (isInteractiveTableTarget(e.target)) return;
                              if (!canViewPatient) {
                                toast.error('You do not have permission');
                                return;
                              }
                              const path = resolveIpdPatientOpenPath(row);
                              if (path) navigate(path);
                            }}
                            onKeyDown={(e) => {
                              if (e.key !== 'Enter') return;
                              if (isInteractiveTableTarget(e.target)) return;
                              e.currentTarget.click();
                            }}
                          >
                            <td>
                              <strong>{row.patient_name || '—'}</strong>
                              <div className="ipd-pl-patient__id">
                                {row.patient_uid || '—'}
                              </div>
                            </td>
                            <td>{row.admission_no || '—'}</td>
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
                                  onClick={() => {
                                    const path = resolveIpdPatientOpenPath(row);
                                    if (path) navigate(path);
                                  }}
                                >
                                  View
                                </IpdPermissionButton>
                                <IpdPermissionButton
                                  allowed={canTransferBed && admitted}
                                  type="button"
                                  className="btn btn--sm ipd-action-btn ipd-action-btn--transfer"
                                  onClick={() =>
                                    setTransferAdmissionId(String(row.id))
                                  }
                                >
                                  Transfer
                                </IpdPermissionButton>
                                <IpdPermissionButton
                                  allowed={canViewBilling}
                                  type="button"
                                  className="btn btn--sm ipd-action-btn ipd-action-btn--billing"
                                  onClick={() => {
                                    const path = resolveIpdBillingPath(row);
                                    if (path) navigate(path);
                                  }}
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

      <BedTransferModal
        open={Boolean(transferAdmissionId)}
        onClose={() => setTransferAdmissionId('')}
        initialAdmissionId={transferAdmissionId}
        lockAdmission
      />
    </div>
  );
}
