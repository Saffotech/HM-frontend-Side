import { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Pill, Eye, Clock, UserRound, ClipboardList, AlertCircle } from 'lucide-react';
import NurseLayout from '@/features/nurse/components/NurseLayout';
import NurseDataTable from '@/features/nurse/components/NurseDataTable';
import NurseQueueStatusBadge from '@/features/nurse/components/NurseQueueStatusBadge';
import NurseConfirmDialog from '@/features/nurse/components/NurseConfirmDialog';
import { useNursePermissionSet } from '@/features/nurse/hooks/useNursePermission';
import { QueryFeedback } from '@/shared/components/common';
import {
  useNursePatientMedicationsQuery,
  useAdministerMedicationMutation,
} from '@/shared/hooks/queries/useNurseQuery';
import { ROUTES } from '@/shared/constants';
import { formatPatientIdDisplay } from '@/shared/api/mappers/nurseMapper';
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

function LastAdministrationCell({ prescription }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

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

  if (!hasAdministrationRecord(prescription)) {
    return (
      <span className="nurse-patient-meds__last-admin-empty">
        Not yet
      </span>
    );
  }

  return (
    <div className="nurse-patient-meds__last-admin" ref={rootRef}>
      <button
        type="button"
        className={`nurse-btn nurse-btn--sm nurse-patient-meds__view-btn${
          open ? ' nurse-patient-meds__view-btn--open' : ''
        }`}
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <Eye size={14} aria-hidden />
        View
      </button>
      {open && (
        <div
          className="nurse-patient-meds__last-admin-card"
          role="dialog"
          aria-label="Last administration details"
        >
          <div className="nurse-patient-meds__last-admin-card-header">
            <span className="nurse-patient-meds__last-admin-card-title">
              Last Administration
            </span>
          </div>
          <div className="nurse-patient-meds__last-admin-card-body">
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
          </div>
        </div>
      )}
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
  const [selected, setSelected] = useState(null);
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

  const openAdmin = useCallback((rx) => {
    setSelected(rx);
    const adm = rx.administration;
    setAdminData({
      id: adm?.id,
      status: adm?.status || rx.status || 'given',
      remarks: adm?.remarks || '',
      scheduled_time: adm?.scheduled_time
        ? new Date(adm.scheduled_time).toISOString().slice(0, 16)
        : '',
    });
  }, []);

  const handleConfirm = () => {
    if (!adminData.status) {
      toast.error('Status is required');
      return;
    }
    adminMut.mutate(
      {
        prescription_item_id: selected.id,
        status: adminData.status,
        remarks: adminData.remarks || null,
        scheduled_time: adminData.scheduled_time
          ? new Date(adminData.scheduled_time).toISOString()
          : null,
        ...(adminData.id ? { id: adminData.id } : {}),
      },
      {
        onSuccess: () => {
          toast.success(`Medication marked as ${adminData.status}`);
          setSelected(null);
        },
        onError: () => toast.error('Failed to record administration'),
      }
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
      render: (p) => <LastAdministrationCell prescription={p} />,
    },
    {
      header: 'Action',
      render: (p) => {
        const hasRecord = Boolean(p.administration?.id);
        const canManageMedication = hasRecord ? canUpdateMedication : canCreateMedication;
        if (!canManageMedication) return '—';
        return (
          <button
            type="button"
            className={`nurse-btn nurse-btn--sm nurse-patient-meds__action-btn${
              hasRecord ? ' nurse-btn--secondary' : ' nurse-btn--primary'
            }`}
            onClick={() => openAdmin(p)}
          >
            {hasRecord ? 'Update record' : 'Administer'}
          </button>
        );
      },
    },
  ], [openAdmin, canCreateMedication, canUpdateMedication]);

  return (
    <NurseLayout>
      <QueryFeedback isLoading={isLoading} isError={isError} error={error} onRetry={refetch}>
        <div className="nurse-patient-meds-page">
          <div className="nurse-patient-meds-page__toolbar">
            <button
              type="button"
              className="nurse-patient-meds-page__back"
              onClick={() => navigate(ROUTES.NURSE_MEDICATIONS)}
            >
              <ArrowLeft size={16} aria-hidden />
              Back to patients
            </button>
            {patientData && (
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
                {unrecordedCount > 0 && (
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
                )}
                {actionableCount > unrecordedCount && (
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
                )}
              </div>
            )}
          </div>

          {patientData && (
            <>
              <div className="nurse-card nurse-patient-meds-page__patient">
                <div className="nurse-patient-meds-page__patient-icon" aria-hidden>
                  <Pill size={18} />
                </div>
                <div className="nurse-patient-meds-page__patient-grid">
                  <div>
                    <span className="nurse-patient-meds-page__label">Name</span>
                    <span className="nurse-patient-meds-page__value nurse-patient-meds-page__value--name">
                      {patientData.patient_name}
                    </span>
                  </div>
                  <div>
                    <span className="nurse-patient-meds-page__label">Patient ID</span>
                    <span className="nurse-patient-meds-page__value">
                      {formatPatientIdDisplay(patientData)}
                    </span>
                  </div>
                  <div>
                    <span className="nurse-patient-meds-page__label">Bed</span>
                    <span className="nurse-patient-meds-page__bed">
                      {patientData.bed_number || '—'}
                    </span>
                  </div>
                  <div>
                    <span className="nurse-patient-meds-page__label">Ward</span>
                    <span className="nurse-patient-meds-page__value">
                      {patientData.ward_name || '—'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="nurse-patient-meds-page__table">
                <NurseDataTable
                  columns={columns}
                  data={prescriptions}
                  isLoading={isLoading}
                  emptyMessage="No active prescriptions."
                />
              </div>
            </>
          )}

          <NurseConfirmDialog
            open={!!selected}
            className="nurse-confirm--med-admin"
            title={selected?.medicine_name}
            subtitle="Record administration"
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
            confirmLabel={adminMut.isPending ? 'Saving…' : 'Save record'}
            onConfirm={handleConfirm}
            onCancel={() => setSelected(null)}
          />
        </div>
      </QueryFeedback>
    </NurseLayout>
  );
}
