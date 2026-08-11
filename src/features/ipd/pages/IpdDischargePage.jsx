/**
 * Discharge entry — pick an admitted patient, then run the wizard.
 * Default list = admitted (ready to discharge). Option to view discharged history.
 */

import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { EmptyState, QueryFeedback } from '@/shared/components/common';
import { ROUTES } from '@/shared/constants';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';
import DischargeWizard from '@/features/ipd/components/DischargeWizard';
import IpdPageHeader from '@/features/ipd/components/IpdPageHeader';
import IpdPermissionButton from '@/features/ipd/components/IpdPermissionButton';
import IpdStatusBadge from '@/features/ipd/components/IpdStatusBadge';
import { useIpdPermissionSet } from '@/features/ipd/hooks/useIpdPermission';
import { useIpdPatientsQuery } from '@/features/ipd/hooks/useIpdQuery';
import { IPD_ADMISSION_STATUS } from '@/features/ipd/utils/constants';
import { formatIpdDateTime } from '@/features/ipd/utils/ipdFormat';

export default function IpdDischargePage() {
  const { admissionId } = useParams();
  const navigate = useNavigate();
  const { canDischarge, canViewPatient } = useIpdPermissionSet();
  const [search, setSearch] = useState('');
  const [listStatus, setListStatus] = useState(IPD_ADMISSION_STATUS.ADMITTED);
  const debouncedSearch = useDebouncedValue(search, 300);

  const showingDischarged = listStatus === IPD_ADMISSION_STATUS.DISCHARGED;

  const { data, isLoading, isError, error, refetch } = useIpdPatientsQuery({
    status: listStatus,
    search: debouncedSearch,
    limit: 50,
  });

  const rows = data?.items ?? [];

  if (admissionId) {
    return (
      <div className="ipd-page">
        <IpdPageHeader
          title="Discharge"
          actions={
            <Link to={ROUTES.IPD_DISCHARGE} className="btn btn--secondary btn--sm">
              Back to list
            </Link>
          }
        />
        <DischargeWizard admissionId={admissionId} />
      </div>
    );
  }

  return (
    <div className="ipd-page">
      <IpdPageHeader
        title="Discharge"
        subtitle={
          showingDischarged
            ? 'Previously discharged IPD stays'
            : 'Select an admitted patient to review charges and close the stay'
        }
      />

      <div className="ipd-card">
        <div className="ipd-card__head">
          <h2 className="ipd-card__title">
            {showingDischarged ? 'Discharged patients' : 'Ready to discharge'}
          </h2>
          {!isLoading ? (
            <span className="ipd-page__subtitle">
              {rows.length}{' '}
              {showingDischarged ? 'discharged' : 'admitted'} patient
              {rows.length === 1 ? '' : 's'}
            </span>
          ) : null}
        </div>

        <div className="ipd-card__body">
          <div className="ipd-toolbar">
            <div className="ipd-toolbar__field">
              <label className="ipd-toolbar__label" htmlFor="ipd-discharge-search">
                Search
              </label>
              <input
                id="ipd-discharge-search"
                className="ipd-input"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Patient, admission, Patient ID…"
              />
            </div>
            <div className="ipd-toolbar__field ipd-toolbar__field--sm">
              <label className="ipd-toolbar__label" htmlFor="ipd-discharge-status">
                Show
              </label>
              <select
                id="ipd-discharge-status"
                className="ipd-select"
                value={listStatus}
                onChange={(e) => setListStatus(e.target.value)}
              >
                <option value={IPD_ADMISSION_STATUS.ADMITTED}>
                  Ready to discharge
                </option>
                <option value={IPD_ADMISSION_STATUS.DISCHARGED}>
                  Discharged patients
                </option>
              </select>
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
          </div>
        ) : (
          <div className="ipd-table-wrap">
            <table className="ipd-table">
              <thead>
                <tr>
                  <th>Admission</th>
                  <th>Patient</th>
                  <th>Ward / Bed</th>
                  <th>Doctor</th>
                  <th>Status</th>
                  <th>{showingDischarged ? 'Discharged' : 'Admitted'}</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={7}>
                      <EmptyState
                        title={
                          showingDischarged
                            ? 'No discharged patients yet'
                            : 'No patients waiting for discharge'
                        }
                        description={
                          showingDischarged
                            ? 'Completed discharges will appear here.'
                            : 'Admit a patient first, then return here to close the stay.'
                        }
                      />
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => {
                    const admitted =
                      row.status === IPD_ADMISSION_STATUS.ADMITTED;
                    return (
                      <tr key={row.id}>
                        <td>
                          <Link
                            to={ROUTES.IPD_PATIENT_DETAIL.replace(
                              ':admissionId',
                              String(row.id),
                            )}
                          >
                            {row.admission_no || `#${row.id}`}
                          </Link>
                        </td>
                        <td>
                          <strong>{row.patient_name || '—'}</strong>
                          {row.patient_uid ? (
                            <div className="ipd-page__subtitle">
                              {row.patient_uid}
                            </div>
                          ) : null}
                        </td>
                        <td>
                          {row.ward_name || '—'} / {row.bed_number || '—'}
                        </td>
                        <td>{row.doctor_name || '—'}</td>
                        <td>
                          <IpdStatusBadge status={row.status} />
                        </td>
                        <td>
                          {formatIpdDateTime(
                            showingDischarged
                              ? row.discharged_at || row.admitted_at
                              : row.admitted_at,
                          )}
                        </td>
                        <td>
                          {admitted ? (
                            <IpdPermissionButton
                              allowed={canDischarge}
                              type="button"
                              className="btn btn--sm ipd-action-btn ipd-action-btn--release"
                              onClick={() =>
                                navigate(
                                  ROUTES.IPD_DISCHARGE_ADMISSION.replace(
                                    ':admissionId',
                                    String(row.id),
                                  ),
                                )
                              }
                            >
                              Discharge
                            </IpdPermissionButton>
                          ) : (
                            <IpdPermissionButton
                              allowed={canViewPatient}
                              type="button"
                              className="btn btn--sm ipd-action-btn ipd-action-btn--view"
                              onClick={() =>
                                navigate(
                                  ROUTES.IPD_PATIENT_DETAIL.replace(
                                    ':admissionId',
                                    String(row.id),
                                  ),
                                )
                              }
                            >
                              View
                            </IpdPermissionButton>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
