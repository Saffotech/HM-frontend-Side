/**
 * IPD Patient List — live `/ipd/patients`.
 */

import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button, EmptyState, QueryFeedback } from '@/shared/components/common';
import { ROUTES, WARDS } from '@/shared/constants';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';
import IpdPageHeader from '@/features/ipd/components/IpdPageHeader';
import IpdStatusBadge from '@/features/ipd/components/IpdStatusBadge';
import { useIpdPermissionSet } from '@/features/ipd/hooks/useIpdPermission';
import IpdPermissionButton from '@/features/ipd/components/IpdPermissionButton';
import { useIpdPatientsQuery } from '@/features/ipd/hooks/useIpdQuery';
import { IPD_ADMISSION_STATUS } from '@/features/ipd/utils/constants';
import { formatIpdDateTime } from '@/features/ipd/utils/ipdFormat';

export default function IpdPatientListPage() {
  const navigate = useNavigate();
  const {
    canViewPatient,
    canTransferBed,
    canViewBilling,
    canDischarge,
    canAdmit,
  } = useIpdPermissionSet();

  // Seeded from the URL so dashboard drill-downs open a pre-filtered list.
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(() => searchParams.get('search') ?? '');
  const [status, setStatus] = useState(() => searchParams.get('status') ?? '');
  const [ward, setWard] = useState(() => searchParams.get('ward') ?? '');
  const [admissionDate, setAdmissionDate] = useState(
    () => searchParams.get('admissionDate') ?? ''
  );
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search, 300);

  const { data, isLoading, isError, error, refetch, isFetching } = useIpdPatientsQuery({
    search: debouncedSearch,
    status,
    ward,
    admissionDate,
    page,
  });

  const rows = data?.items ?? [];
  const total = data?.total ?? 0;
  const limit = data?.limit ?? 20;
  const totalPages = Math.max(1, Math.ceil(total / limit));

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

  return (
    <div className="ipd-page">
      <IpdPageHeader
        title="IPD Patients"
        subtitle="Admitted and discharged in-patients"
        actions={
          canAdmit ? (
            <Button type="button" onClick={() => navigate(ROUTES.IPD_ADMIT)}>
              Admit patient
            </Button>
          ) : null
        }
      />

      <div className="ipd-card">
        <div className="ipd-card__body">
          <div className="ipd-toolbar">
            <div className="ipd-toolbar__field">
              <label className="ipd-toolbar__label" htmlFor="ipd-pl-search">
                Search
              </label>
              <input
                id="ipd-pl-search"
                className="ipd-input"
                value={search}
                onChange={onFilterChange(setSearch, 'search')}
                placeholder="Name, MRN, bed…"
              />
            </div>
            <div className="ipd-toolbar__field">
              <label className="ipd-toolbar__label" htmlFor="ipd-pl-status">
                Status
              </label>
              <select
                id="ipd-pl-status"
                className="ipd-select"
                value={status}
                onChange={onFilterChange(setStatus, 'status')}
              >
                <option value="">All</option>
                <option value={IPD_ADMISSION_STATUS.ADMITTED}>Admitted</option>
                <option value={IPD_ADMISSION_STATUS.DISCHARGED}>Discharged</option>
              </select>
            </div>
            <div className="ipd-toolbar__field">
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
            <div className="ipd-toolbar__field">
              <label className="ipd-toolbar__label" htmlFor="ipd-pl-date">
                Admission date
              </label>
              <input
                id="ipd-pl-date"
                type="date"
                className="ipd-input"
                value={admissionDate}
                onChange={onFilterChange(setAdmissionDate, 'admissionDate')}
              />
            </div>
          </div>
        </div>

        {isError ? (
          <div className="ipd-card__body">
            <QueryFeedback isError error={error} onRetry={refetch} />
          </div>
        ) : isLoading ? (
          <div className="ipd-card__body" style={{ display: 'grid', gap: '0.5rem' }}>
            <div className="ipd-skeleton" />
            <div className="ipd-skeleton" />
            <div className="ipd-skeleton" />
          </div>
        ) : rows.length === 0 ? (
          <div className="ipd-card__body">
            <EmptyState
              title="No IPD patients"
              description="Try adjusting filters, or admit a patient to get started."
            />
          </div>
        ) : (
          <>
            <div className="ipd-table-wrap">
              <table className="ipd-table">
                <thead>
                  <tr>
                    <th>Patient</th>
                    <th>Status</th>
                    <th>Ward</th>
                    <th>Bed</th>
                    <th>Doctor</th>
                    <th>Admission date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <strong>{row.patient_name || '—'}</strong>
                        <div className="ipd-page__subtitle">
                          {row.admission_no || row.patient_uid || '—'}
                        </div>
                      </td>
                      <td>
                        <IpdStatusBadge status={row.status} />
                      </td>
                      <td>{row.ward_name || '—'}</td>
                      <td>{row.bed_number || '—'}</td>
                      <td>{row.doctor_name || '—'}</td>
                      <td>{formatIpdDateTime(row.admitted_at)}</td>
                      <td>
                        <div className="ipd-table__actions">
                          <IpdPermissionButton
                            allowed={canViewPatient}
                            type="button"
                            className="btn btn--secondary btn--sm"
                            onClick={() =>
                              navigate(pathFor(ROUTES.IPD_PATIENT_DETAIL, row.id))
                            }
                          >
                            View
                          </IpdPermissionButton>
                          <IpdPermissionButton
                            allowed={canTransferBed && row.status === 'admitted'}
                            type="button"
                            className="btn btn--secondary btn--sm"
                            onClick={() =>
                              navigate(
                                `${ROUTES.IPD_BED_TRANSFER}?admissionId=${row.id}`
                              )
                            }
                          >
                            Transfer Bed
                          </IpdPermissionButton>
                          <IpdPermissionButton
                            allowed={canViewBilling}
                            type="button"
                            className="btn btn--secondary btn--sm"
                            onClick={() =>
                              navigate(pathFor(ROUTES.IPD_BILL_PREVIEW, row.id))
                            }
                          >
                            Billing
                          </IpdPermissionButton>
                          <IpdPermissionButton
                            allowed={canDischarge && row.status === 'admitted'}
                            type="button"
                            className="btn btn--secondary btn--sm"
                            onClick={() =>
                              navigate(pathFor(ROUTES.IPD_DISCHARGE_ADMISSION, row.id))
                            }
                          >
                            Discharge
                          </IpdPermissionButton>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="ipd-card__body" style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <span className="ipd-page__subtitle">
                {total} result{total === 1 ? '' : 's'}
                {isFetching ? ' · Updating…' : ''}
              </span>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem' }}>
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
          </>
        )}
      </div>
    </div>
  );
}
