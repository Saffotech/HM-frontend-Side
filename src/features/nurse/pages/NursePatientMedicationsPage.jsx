import { useMemo, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Pill, Eye, Clock, UserRound, ClipboardList, AlertCircle } from 'lucide-react';
import NurseLayout from '@/features/nurse/components/NurseLayout';
import NurseDataTable from '@/features/nurse/components/NurseDataTable';
import NurseQueueStatusBadge from '@/features/nurse/components/NurseQueueStatusBadge';
import NurseConfirmDialog from '@/features/nurse/components/NurseConfirmDialog';
import { useNursePermissionSet } from '@/features/nurse/hooks/useNursePermission';
import { QueryFeedback, Modal, Button } from '@/shared/components/common';
import {
  useNursePatientMedicationsQuery,
  useAdministerMedicationMutation,
  useUpdateAdministrationMutation,
} from '@/shared/hooks/queries/useNurseQuery';
import { ROUTES } from '@/shared/constants';
import { formatPatientIdDisplay } from '@/shared/api/mappers/nurseMapper';
import NursePermissionButton from '@/features/nurse/components/NursePermissionButton';
import { toast } from '@/shared/utils/toast';
import './NursePatientMedicationsPage.css';

const ACTIONABLE_STATUSES = new Set(['missed', 'delayed']);

function MedicationStatusCell({ prescription }) {
  if (prescription.statusKnown && prescription.status) {
    return <NurseQueueStatusBadge status={prescription.status} />;
  }
  return <span className="nurse-patient-meds__status-unknown">Not recorded</span>;
}

function formatLastGiven(prescription) {
  if (!prescription?.last_administered_at) {
    return prescription?.administration?.id ? '—' : 'Not yet';
  }
  const d = new Date(prescription.last_administered_at);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString();
}

function formatLastGivenBy(prescription) {
  if (prescription?.last_administered_by) return prescription.last_administered_by;
  return prescription?.administration?.id ? '—' : 'Not yet';
}

function hasAdministrationRecord(prescription) {
  return Boolean(
    prescription?.administration?.id || prescription?.last_administered_at,
  );
}

function LastAdministrationDetails({ prescription }) {
  return (
    <div className="nurse-patient-meds__last-admin-modal-body">
      <div className="nurse-patient-meds__last-admin-row nurse-patient-meds__last-admin-row--time">
        <span className="nurse-patient-meds__last-admin-icon" aria-hidden>
          <Clock size={14} />
        </span>
        <div className="nurse-patient-meds__last-admin-content">
          <span className="nurse-patient-meds__last-admin-label">Last Given</span>
          <span className="nurse-patient-meds__last-admin-value">
            {formatLastGiven(prescription)}
          </span>
        </div>
      </div>
      <div className="nurse-patient-meds__last-admin-row nurse-patient-meds__last-admin-row--by">
        <span className="nurse-patient-meds__last-admin-icon" aria-hidden>
          <UserRound size={14} />
        </span>
        <div className="nurse-patient-meds__last-admin-content">
          <span className="nurse-patient-meds__last-admin-label">By</span>
          <span className="nurse-patient-meds__last-admin-value">
            {formatLastGivenBy(prescription)}
          </span>
        </div>
      </div>
      <div className="nurse-patient-meds__last-admin-row nurse-patient-meds__last-admin-row--notes">
        <span className="nurse-patient-meds__last-admin-icon" aria-hidden>
          <ClipboardList size={14} />
        </span>
        <div className="nurse-patient-meds__last-admin-content">
          <span className="nurse-patient-meds__last-admin-label">Notes</span>
          <span className="nurse-patient-meds__last-admin-value nurse-patient-meds__last-admin-value--notes">
            {prescription.administration?.remarks?.trim() || '—'}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function NursePatientMedicationsPage() {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const { canCreateMedication, canUpdateMedication } = useNursePermissionSet();
  const { data: patientData, isLoading, isError, error, refetch } =
    useNursePatientMedicationsQuery(patientId);
  const adminMut = useAdministerMedicationMutation(patientId);
  const updateAdminMut = useUpdateAdministrationMutation(patientId);
  const [selected, setSelected] = useState(null);
  const [viewingLastAdmin, setViewingLastAdmin] = useState(null);
  const [adminMode, setAdminMode] = useState('create'); // 'create' | 'update'
  const [adminData, setAdminData] = useState({
    status: 'given',
    remarks: '',
    scheduled_time: '',
  });

  const prescriptions = patientData?.prescriptions ?? [];

  const unrecordedCount = useMemo(
    () => prescriptions.filter((p) => !p.administration?.id).length,
    [prescriptions],
  );

  const actionableCount = useMemo(
    () =>
      prescriptions.filter(
        (p) =>
          !p.administration?.id ||
          ACTIONABLE_STATUSES.has((p.status || '').toLowerCase()),
      ).length,
    [prescriptions],
  );

  const openAdmin = useCallback((rx, mode) => {
    setSelected(rx);
    setAdminMode(mode);
    setAdminData({
      status: mode === 'update' ? (rx.status || 'given') : 'given',
      remarks: mode === 'update' ? (rx.administration?.remarks || '') : '',
      scheduled_time: '',
    });
  }, []);

  const openLastAdmin = useCallback((rx, event) => {
    event?.stopPropagation?.();
    setViewingLastAdmin(rx);
  }, []);

  const handleConfirm = () => {
    if (!adminData.status) {
      toast.error('Status is required');
      return;
    }

    const payload = {
      status: adminData.status,
      remarks: adminData.remarks || null,
      scheduled_time: adminData.scheduled_time
        ? new Date(adminData.scheduled_time).toISOString()
        : null,
    };

    if (adminMode === 'update') {
      const administrationId = selected?.administration?.id;
      if (!canUpdateMedication) {
        toast.error('You do not have permission to update medication logs.');
        return;
      }
      if (!administrationId) {
        toast.error('No administration record to update.');
        return;
      }
      updateAdminMut.mutate(
        { administrationId, data: payload },
        {
          onSuccess: () => {
            toast.success('Medication log updated');
            setSelected(null);
          },
          onError: (err) => toast.error(err?.message || 'Failed to update medication log'),
        },
      );
      return;
    }

    if (!canCreateMedication) {
      toast.error('You do not have permission to create medication logs.');
      return;
    }
    adminMut.mutate(
      {
        prescription_item_id: selected.id,
        ...payload,
      },
      {
        onSuccess: () => {
          toast.success(`Dose recorded as ${adminData.status}`);
          setSelected(null);
        },
        onError: (err) => toast.error(err?.message || 'Failed to record administration'),
      },
    );
  };

  const columns = useMemo(() => [
    {
      header: 'Medicine',
      render: (p) => (
        <div className="nurse-patient-meds__medicine">
          <span className="nurse-patient-meds__medicine-name">{p.medicine_name}</span>
          <MedicationStatusCell prescription={p} />
        </div>
      ),
    },
    { header: 'Dose', render: (p) => p.dose || '—' },
    { header: 'Frequency', render: (p) => p.frequency || '—' },
    { header: 'Route', render: (p) => p.route || '—' },
    {
      header: 'Last Administration',
      render: (p) => {
        if (!hasAdministrationRecord(p)) {
          return (
            <span className="nurse-patient-meds__last-admin-empty">
              Not yet
            </span>
          );
        }
        return (
          <button
            type="button"
            className="nurse-btn nurse-btn--sm nurse-btn--secondary nurse-patient-meds__view-btn"
            onClick={(event) => openLastAdmin(p, event)}
          >
            <Eye size={14} aria-hidden />
            View
          </button>
        );
      },
    },
    {
      header: 'Action',
      render: (p) => {
        const hasRecord = Boolean(p.administration?.id);
        if (!hasRecord) {
          return (
            <NursePermissionButton
              allowed={canCreateMedication}
              className="nurse-btn nurse-btn--sm nurse-btn--primary nurse-patient-meds__action-btn"
              onClick={() => openAdmin(p, 'create')}
            >
              Administer
            </NursePermissionButton>
          );
        }
        return (
          <NursePermissionButton
            allowed={canCreateMedication}
            className="nurse-btn nurse-btn--sm nurse-btn--primary nurse-patient-meds__action-btn"
            onClick={() => openAdmin(p, 'create')}
          >
            Record dose
          </NursePermissionButton>
        );
      },
    },
  ], [openAdmin, openLastAdmin, canCreateMedication]);

  return (
    <NurseLayout>
      <QueryFeedback isLoading={isLoading} isError={isError} error={error} onRetry={refetch}>
        <div className="nurse-page nurse-patient-meds-page">
          {patientData ? (
            <>
              <div className="nurse-vital-detail__top">
                <div className="nurse-vital-detail__identity">
                  <div className="nurse-vital-detail__avatar" aria-hidden>
                    <Pill size={22} />
                  </div>
                  <div>
                    <h1 className="nurse-vital-detail__name">{patientData.patient_name || '—'}</h1>
                    <p className="nurse-vital-detail__meta-line">
                      <span>
                        ID: <strong>{formatPatientIdDisplay(patientData)}</strong>
                      </span>
                      <span className="nurse-vital-detail__dot" aria-hidden>·</span>
                      <span>
                        Ward: <strong>{patientData.ward_name || '—'}</strong>
                      </span>
                      <span className="nurse-vital-detail__dot" aria-hidden>·</span>
                      <span>
                        Bed: <strong>{patientData.bed_number || '—'}</strong>
                      </span>
                    </p>
                  </div>
                </div>
                <div className="nurse-vital-detail__actions nurse-patient-meds-page__actions">
                  <div className="nurse-patient-meds-page__summary" aria-label="Medication summary">
                    <div className="nurse-patient-meds-page__stat nurse-patient-meds-page__stat--total">
                      <span className="nurse-patient-meds-page__stat-icon" aria-hidden>
                        <ClipboardList size={15} />
                      </span>
                      <span className="nurse-patient-meds-page__stat-text">
                        <span className="nurse-patient-meds-page__stat-value">
                          {prescriptions.length}
                        </span>
                        <span className="nurse-patient-meds-page__stat-label">
                          {prescriptions.length === 1 ? 'Medicine' : 'Medicines'}
                        </span>
                      </span>
                    </div>
                    {unrecordedCount > 0 ? (
                      <div className="nurse-patient-meds-page__stat nurse-patient-meds-page__stat--pending">
                        <span className="nurse-patient-meds-page__stat-icon" aria-hidden>
                          <AlertCircle size={15} />
                        </span>
                        <span className="nurse-patient-meds-page__stat-text">
                          <span className="nurse-patient-meds-page__stat-value">
                            {unrecordedCount}
                          </span>
                          <span className="nurse-patient-meds-page__stat-label">Not recorded</span>
                        </span>
                      </div>
                    ) : null}
                    {actionableCount > unrecordedCount ? (
                      <div className="nurse-patient-meds-page__stat nurse-patient-meds-page__stat--followup">
                        <span className="nurse-patient-meds-page__stat-icon" aria-hidden>
                          <AlertCircle size={15} />
                        </span>
                        <span className="nurse-patient-meds-page__stat-text">
                          <span className="nurse-patient-meds-page__stat-value">
                            {actionableCount - unrecordedCount}
                          </span>
                          <span className="nurse-patient-meds-page__stat-label">Need follow-up</span>
                        </span>
                      </div>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    className="nurse-btn nurse-btn--secondary"
                    onClick={() => navigate(ROUTES.NURSE_MEDICATIONS)}
                  >
                    <ArrowLeft size={16} aria-hidden />
                    Back
                  </button>
                </div>
              </div>

              <div
                className={`nurse-notes-registry__table nurse-patient-meds-page__table${
                  isLoading ? ' nurse-notes-registry__table--fetching' : ''
                }`}
              >
                <NurseDataTable
                  columns={columns}
                  data={prescriptions}
                  isLoading={false}
                  emptyMessage="No active prescriptions."
                />
              </div>
            </>
          ) : null}

          <Modal
            isOpen={Boolean(viewingLastAdmin)}
            onClose={() => setViewingLastAdmin(null)}
            title="Last Administration"
            panelClassName="nurse-patient-meds__last-admin-modal"
            footer={
              <Button variant="outline" onClick={() => setViewingLastAdmin(null)}>
                Close
              </Button>
            }
          >
            {viewingLastAdmin ? (
              <>
                <p className="nurse-patient-meds__last-admin-modal-med">
                  {viewingLastAdmin.medicine_name || 'Medicine'}
                </p>
                <LastAdministrationDetails prescription={viewingLastAdmin} />
              </>
            ) : null}
          </Modal>

          <NurseConfirmDialog
            open={!!selected}
            className="nurse-confirm--med-admin"
            title={selected?.medicine_name}
            subtitle={adminMode === 'update' ? 'Update medication log' : 'Record administration'}
            description={
              <div className="nurse-patient-meds-admin-form">
                <div className="nurse-patient-meds-admin-form__row">
                  <div className="nurse-field">
                    <label htmlFor="med-admin-status">Status</label>
                    <select
                      id="med-admin-status"
                      className="nurse-select"
                      value={adminData.status}
                      onChange={(e) =>
                        setAdminData((prev) => ({ ...prev, status: e.target.value }))
                      }
                    >
                      <option value="given">Given</option>
                      <option value="refused">Refused</option>
                      <option value="missed">Missed</option>
                      <option value="delayed">Delayed</option>
                    </select>
                  </div>
                  <div className="nurse-field">
                    <label htmlFor="med-admin-time">Scheduled time</label>
                    <input
                      id="med-admin-time"
                      type="datetime-local"
                      className="nurse-input"
                      value={adminData.scheduled_time}
                      onChange={(e) =>
                        setAdminData((prev) => ({ ...prev, scheduled_time: e.target.value }))
                      }
                    />
                  </div>
                </div>
                <div className="nurse-field">
                  <label htmlFor="med-admin-remarks">Remarks</label>
                  <textarea
                    id="med-admin-remarks"
                    rows={2}
                    className="nurse-textarea nurse-patient-meds-admin-form__remarks"
                    value={adminData.remarks}
                    onChange={(e) =>
                      setAdminData((prev) => ({ ...prev, remarks: e.target.value }))
                    }
                    placeholder="Optional notes…"
                  />
                </div>
              </div>
            }
            confirmLabel={
              adminMut.isPending || updateAdminMut.isPending ? 'Saving…' : 'Save record'
            }
            onConfirm={handleConfirm}
            onCancel={() => setSelected(null)}
          />
        </div>
      </QueryFeedback>
    </NurseLayout>
  );
}
