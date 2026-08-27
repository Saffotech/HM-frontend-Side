import { useMemo, useState, useCallback, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Pill, Eye, Clock, UserRound, ClipboardList, AlertCircle } from 'lucide-react';
import NurseLayout from '@/features/nurse/components/NurseLayout';
import NurseDataTable from '@/features/nurse/components/NurseDataTable';
import NursePagination from '@/features/nurse/components/NursePagination';
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

const PAGE_SIZE = 10;
const ACTIONABLE_STATUSES = new Set(['missed', 'delayed']);

/** Local datetime string for `<input type="datetime-local" />` (YYYY-MM-DDTHH:mm). */
function toDateTimeLocalValue(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return toDateTimeLocalValue(new Date());
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatGivenAt(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleString();
}

function formatLastGiven(prescription) {
  const formatted = formatGivenAt(prescription?.last_administered_at);
  if (formatted) return formatted;
  return prescription?.administration?.id ? '—' : 'Not yet';
}

function formatFirstGiven(prescription) {
  const formatted = formatGivenAt(prescription?.first_administered_at);
  if (formatted) return formatted;
  // Single dose: first given is the same as last given
  const last = formatGivenAt(prescription?.last_administered_at);
  if (last) return last;
  return prescription?.administration?.id ? '—' : 'Not yet';
}

function formatLastGivenBy(prescription) {
  if (prescription?.last_administered_by) return prescription.last_administered_by;
  return prescription?.administration?.id ? '—' : 'Not yet';
}

function hasAdministrationRecord(prescription) {
  return Boolean(
    prescription?.administration?.id
    || prescription?.last_administered_at
    || prescription?.first_administered_at,
  );
}

function LastAdministrationDetails({ prescription }) {
  return (
    <div className="nurse-patient-meds__last-admin-modal-body">
      <div className="nurse-patient-meds__last-admin-row nurse-patient-meds__last-admin-row--first">
        <span className="nurse-patient-meds__last-admin-icon" aria-hidden>
          <Clock size={14} />
        </span>
        <div className="nurse-patient-meds__last-admin-content">
          <span className="nurse-patient-meds__last-admin-label">First Given</span>
          <span className="nurse-patient-meds__last-admin-value">
            {formatFirstGiven(prescription)}
          </span>
        </div>
      </div>
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
  const location = useLocation();
  const { canCreateMedication, canUpdateMedication, canViewMedication } = useNursePermissionSet();

  const handleBack = useCallback(() => {
    const backTo = location.state?.backTo;
    const overviewTab = location.state?.overviewTab;
    const patientOverviewPath = patientId
      ? ROUTES.NURSE_PATIENT.replace(':patientId', String(patientId))
      : null;

    // Prefer explicit return target (patient history / list / etc.)
    if (backTo) {
      navigate(backTo, {
        state: overviewTab ? { overviewTab } : undefined,
      });
      return;
    }

    // Opened from patient history medications — always return to that patient page
    if (patientOverviewPath && overviewTab) {
      navigate(patientOverviewPath, { state: { overviewTab } });
      return;
    }

    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate(ROUTES.NURSE_MEDICATIONS);
  }, [location.state, navigate, patientId]);

  const openHistory = useCallback((rx) => {
    if (!patientId) return;
    const administerPath = ROUTES.NURSE_MEDICATIONS_PATIENT.replace(
      ':patientId',
      String(patientId),
    );
    const patientOverviewPath = ROUTES.NURSE_PATIENT.replace(
      ':patientId',
      String(patientId),
    );
    const returnToPatient =
      location.state?.backTo?.includes('/nurse/patients/')
        ? location.state.backTo
        : location.state?.overviewTab
          ? patientOverviewPath
          : location.state?.backTo;

    const itemId = rx?.prescription_item_id ?? rx?.id;
    const medicineName = String(rx?.medicine_name || '').trim();
    const query = new URLSearchParams();
    if (itemId != null && itemId !== '') query.set('itemId', String(itemId));
    if (medicineName) query.set('medicine', medicineName);
    const querySuffix = query.toString() ? `?${query.toString()}` : '';

    navigate(
      `${ROUTES.NURSE_MEDICATIONS_PATIENT_HISTORY.replace(':patientId', String(patientId))}${querySuffix}`,
      {
        state: {
          backTo: administerPath,
          overviewTab: location.state?.overviewTab,
          backToAdministerFrom: returnToPatient || location.state?.backTo,
          prescriptionItemId: itemId != null ? String(itemId) : null,
          medicineName: medicineName || null,
        },
      },
    );
  }, [navigate, patientId, location.state]);
  const { data: patientData, isLoading, isError, error, refetch } =
    useNursePatientMedicationsQuery(patientId);
  const adminMut = useAdministerMedicationMutation(patientId);
  const updateAdminMut = useUpdateAdministrationMutation(patientId);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const [viewingLastAdmin, setViewingLastAdmin] = useState(null);
  const [adminMode, setAdminMode] = useState('create'); // 'create' | 'update'
  const [adminData, setAdminData] = useState({
    status: 'given',
    remarks: '',
    scheduled_time: toDateTimeLocalValue(),
  });

  const prescriptions = patientData?.prescriptions ?? [];
  const expectedMedicineCount = Math.max(
    Number(patientData?.expectedMedicineCount) || 0,
    Number(location.state?.medicineCount) || 0,
    prescriptions.length,
  );

  useEffect(() => {
    setPage(1);
  }, [patientId]);

  const pageCount = Math.max(1, Math.ceil(prescriptions.length / PAGE_SIZE) || 1);
  const safePage = Math.min(page, pageCount);
  const pagedPrescriptions = useMemo(
    () => prescriptions.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [prescriptions, safePage],
  );

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
    const existingScheduled = rx?.administration?.scheduled_time;
    const scheduledFromRecord =
      mode === 'update' && existingScheduled
        ? toDateTimeLocalValue(existingScheduled)
        : toDateTimeLocalValue();
    setAdminData({
      status: mode === 'update' ? (rx.status || 'given') : 'given',
      remarks: mode === 'update' ? (rx.administration?.remarks || '') : '',
      scheduled_time: scheduledFromRecord,
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
        <span className="nurse-patient-meds__medicine-name">{p.medicine_name}</span>
      ),
    },
    { header: 'Strength', render: (p) => p.strength || p.dosage || '—' },
    { header: 'Form', render: (p) => p.form || '—' },
    { header: 'Duration', render: (p) => p.duration || '—' },
    { header: 'Frequency', render: (p) => p.frequency || '—' },
    { header: 'Route', render: (p) => p.route || '—' },
    { header: 'Timing', render: (p) => p.timing || '—' },
    {
      header: 'Instruction',
      render: (p) => (String(p.instructions ?? '').trim() || '—'),
    },
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
        return (
          <div className="nurse-patient-meds__action-cell">
            <NursePermissionButton
              allowed={canCreateMedication}
              className="nurse-btn nurse-btn--sm nurse-btn--primary nurse-patient-meds__action-btn"
              onClick={() => openAdmin(p, 'create')}
            >
              {hasRecord ? 'Record dose' : 'Administer'}
            </NursePermissionButton>
            {hasRecord ? (
              <NursePermissionButton
                allowed={canViewMedication}
                className="nurse-btn nurse-btn--sm nurse-btn--secondary nurse-patient-meds__action-btn"
                onClick={() => openHistory(p)}
              >
                History
              </NursePermissionButton>
            ) : null}
          </div>
        );
      },
    },
  ], [openAdmin, openLastAdmin, openHistory, canCreateMedication, canViewMedication]);

  return (
    <NurseLayout>
      <QueryFeedback isLoading={isLoading} isError={isError} error={error} onRetry={refetch}>
        <div className="nurse-page nurse-patient-meds-page">
          {patientData ? (
            <>
              <div className="nurse-vital-detail__top nurse-patient-meds-page__header">
                <div className="nurse-vital-detail__identity">
                  <div className="nurse-vital-detail__avatar nurse-patient-meds-page__avatar" aria-hidden>
                    <Pill size={22} />
                  </div>
                  <div>
                    <h1 className="nurse-vital-detail__name">{patientData.patient_name || '—'}</h1>
                    <p className="nurse-vital-detail__meta-line nurse-patient-meds-page__meta">
                      <span className="nurse-patient-meds-page__meta-chip">
                        ID: <strong>{formatPatientIdDisplay(patientData)}</strong>
                      </span>
                      <span className="nurse-patient-meds-page__meta-chip">
                        Ward: <strong>{patientData.ward_name || '—'}</strong>
                      </span>
                      <span className="nurse-patient-meds-page__meta-chip">
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
                    className="nurse-btn nurse-btn--secondary nurse-patient-meds-page__back"
                    onClick={handleBack}
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
                  data={pagedPrescriptions}
                  isLoading={false}
                  emptyMessage={
                    expectedMedicineCount > 0
                      ? `List shows ${expectedMedicineCount} medicine(s), but the latest prescription has no items. Ask the doctor to save the prescription again from Doctor → Consultation / Prescribe.`
                      : 'No active prescriptions.'
                  }
                />
                <NursePagination
                  page={safePage}
                  pageSize={PAGE_SIZE}
                  total={prescriptions.length}
                  hasNextPage={safePage < pageCount}
                  itemCount={pagedPrescriptions.length}
                  onChange={setPage}
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
