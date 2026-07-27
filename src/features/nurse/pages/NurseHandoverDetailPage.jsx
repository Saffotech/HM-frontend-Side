import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import NurseLayout from '@/features/nurse/components/NurseLayout';
import NursePageHeader from '@/features/nurse/components/NursePageHeader';
import NurseDataTable from '@/features/nurse/components/NurseDataTable';
import NursePatientPicker from '@/features/nurse/components/NursePatientPicker';
import NurseQueueStatusBadge from '@/features/nurse/components/NurseQueueStatusBadge';
import { useNursePermissionSet } from '@/features/nurse/hooks/useNursePermission';
import { QueryFeedback } from '@/shared/components/common';
import { formatPatientIdDisplay } from '@/shared/api/mappers/nurseMapper';
import {
  useNurseHandoverQuery,
  useNurseBedAllocationSummaryQuery,
  useNurseBedPatientsQuery,
  useBulkAddHandoverPatientsMutation,
  useDeleteHandoverPatientMutation,
  useSubmitHandoverMutation,
} from '@/shared/hooks/queries/useNurseQuery';
import { NURSE_QUEUE_MAX_PAGE_SIZE } from '@/shared/api/services/nurse';
import { toast } from '@/shared/utils/toast';

const PATIENT_FIELDS = [
  { key: 'patient_summary', label: 'Patient Summary' },
  { key: 'pending_tasks', label: 'Pending Tasks' },
  { key: 'critical_alerts', label: 'Critical Alerts' },
  { key: 'medication_pending', label: 'Medication Pending' },
  { key: 'doctor_instructions', label: 'Doctor Instructions' },
];

function formatShiftLabel(shiftName) {
  if (!shiftName) return 'Current Shift';
  const name = String(shiftName).trim();
  if (!name) return 'Current Shift';
  return name.toLowerCase().includes('shift') ? name : `${name} Shift`;
}

export default function NurseHandoverDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { canUpdateHandovers, canSubmitHandovers } = useNursePermissionSet();
  const { data: handover, isLoading, isError, error, refetch } = useNurseHandoverQuery(id);
  const bulkMut = useBulkAddHandoverPatientsMutation(id);
  const deleteMut = useDeleteHandoverPatientMutation(id);
  const submitMut = useSubmitHandoverMutation(id);

  const {
    data: allocationSummary,
    isLoading: summaryLoading,
  } = useNurseBedAllocationSummaryQuery();

  const hasAllocations = Boolean(allocationSummary?.has_allocations);

  const {
    data: allocatedOccupied,
    isLoading: allocatedLoading,
    isFetched: allocatedFetched,
  } = useNurseBedPatientsQuery(
    {
      page: 1,
      page_size: NURSE_QUEUE_MAX_PAGE_SIZE,
      allocated_only: true,
    },
    { enabled: hasAllocations },
  );

  const [selectedPatientId, setSelectedPatientId] = useState(null);
  const [patientForm, setPatientForm] = useState({
    patient_summary: '',
    pending_tasks: '',
    critical_alerts: '',
    medication_pending: '',
    doctor_instructions: '',
  });

  const autoPrefillDone = useRef(false);

  const handoverPatientIds = useMemo(
    () => (handover?.patients ?? []).map((p) => p.patient_id),
    [handover?.patients],
  );

  const handoverPatientIdSet = useMemo(
    () => new Set(handoverPatientIds.map(Number)),
    [handoverPatientIds],
  );

  const allocatedOccupiedPatients = allocatedOccupied?.items ?? [];

  const allocatedPatientIdSet = useMemo(
    () => new Set(allocatedOccupiedPatients.map((p) => Number(p.patient_id))),
    [allocatedOccupiedPatients],
  );

  const allocationCoverage = useMemo(() => {
    if (!hasAllocations) {
      return { included: 0, excluded: 0, excludedPatients: [] };
    }
    const excludedPatients = allocatedOccupiedPatients.filter(
      (p) => !handoverPatientIdSet.has(Number(p.patient_id)),
    );
    const included = allocatedOccupiedPatients.length - excludedPatients.length;
    return {
      included: Math.max(included, 0),
      excluded: excludedPatients.length,
      excludedPatients,
    };
  }, [hasAllocations, allocatedOccupiedPatients, handoverPatientIdSet]);

  const isDraft = handover?.status === 'pending';
  const prefillStorageKey = id ? `nurse-handover-prefill:${id}` : null;

  // Auto-add allocated occupied patients once for empty draft handovers.
  useEffect(() => {
    if (!handover || !isDraft || !canUpdateHandovers || !prefillStorageKey) return;
    if (autoPrefillDone.current) return;
    if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem(prefillStorageKey)) {
      autoPrefillDone.current = true;
      return;
    }
    if (summaryLoading) return;

    if (!hasAllocations) {
      autoPrefillDone.current = true;
      try {
        sessionStorage.setItem(prefillStorageKey, 'skip');
      } catch {
        /* ignore */
      }
      return;
    }

    if ((handover.patients?.length ?? 0) > 0) {
      autoPrefillDone.current = true;
      try {
        sessionStorage.setItem(prefillStorageKey, 'done');
      } catch {
        /* ignore */
      }
      return;
    }

    if (!allocatedFetched || allocatedLoading) return;

    const toAdd = (allocatedOccupied?.items ?? [])
      .map((p) => Number(p.patient_id))
      .filter((pid) => Number.isSafeInteger(pid) && pid >= 1)
      .map((patient_id) => ({ patient_id }));

    autoPrefillDone.current = true;
    try {
      sessionStorage.setItem(prefillStorageKey, 'pending');
    } catch {
      /* ignore */
    }

    if (toAdd.length === 0) {
      try {
        sessionStorage.setItem(prefillStorageKey, 'done');
      } catch {
        /* ignore */
      }
      return;
    }

    bulkMut.mutate(toAdd, {
      onSuccess: () => {
        try {
          sessionStorage.setItem(prefillStorageKey, 'done');
        } catch {
          /* ignore */
        }
        toast.success(
          toAdd.length === 1
            ? 'Allocated patient added to handover'
            : `${toAdd.length} allocated patients added to handover`,
        );
      },
      onError: (err) => {
        autoPrefillDone.current = false;
        try {
          sessionStorage.removeItem(prefillStorageKey);
        } catch {
          /* ignore */
        }
        toast.error(err?.message || 'Failed to pre-add allocated patients');
      },
    });
  }, [
    handover,
    isDraft,
    canUpdateHandovers,
    prefillStorageKey,
    summaryLoading,
    hasAllocations,
    allocatedFetched,
    allocatedLoading,
    allocatedOccupied?.items,
    bulkMut,
  ]);

  const addPatient = (e) => {
    e.preventDefault();
    const patientId = Number(selectedPatientId);
    if (!patientId) {
      toast.error('Please select a patient');
      return;
    }
    bulkMut.mutate(
      [
        {
          patient_id: patientId,
          patient_summary: patientForm.patient_summary || null,
          pending_tasks: patientForm.pending_tasks || null,
          critical_alerts: patientForm.critical_alerts || null,
          medication_pending: patientForm.medication_pending || null,
          doctor_instructions: patientForm.doctor_instructions || null,
        },
      ],
      {
        onSuccess: () => {
          toast.success('Patient added');
          setSelectedPatientId(null);
          setPatientForm({
            patient_summary: '',
            pending_tasks: '',
            critical_alerts: '',
            medication_pending: '',
            doctor_instructions: '',
          });
        },
        onError: (err) => toast.error(err?.message || 'Failed to add patient'),
      }
    );
  };

  const handleSubmit = () => {
    if (allocationCoverage.excluded > 0) {
      toast.warning(
        `${allocationCoverage.excluded} allocated occupied patient${
          allocationCoverage.excluded === 1 ? ' was' : 's were'
        } not added.`,
      );
    }
    submitMut.mutate(undefined, {
      onSuccess: () => toast.success('Handover submitted'),
      onError: (err) => toast.error(err?.message || 'Failed to submit handover'),
    });
  };

  const patientColumns = [
    {
      header: 'Patient ID',
      render: (row) => formatPatientIdDisplay(row),
    },
    {
      header: 'Patient',
      render: (row) => {
        const isAllocated = allocatedPatientIdSet.has(Number(row.patient_id));
        return (
          <span className="nurse-handover-patient-cell">
            <span>{row.patient_name}</span>
            {isAllocated && (
              <span className="nurse-badge nurse-badge--allocated">Allocated</span>
            )}
          </span>
        );
      },
    },
    { header: 'Bed', accessor: 'bed_number' },
    { header: 'Summary', accessor: 'patient_summary' },
    {
      header: 'Actions',
      render: (row) =>
        isDraft && canUpdateHandovers ? (
          <button
            type="button"
            className="nurse-btn nurse-btn--ghost nurse-btn--sm"
            onClick={() =>
              deleteMut.mutate(row.id, {
                onSuccess: () => toast.success('Patient removed'),
                onError: (err) => toast.error(err?.message || 'Failed to remove'),
              })
            }
          >
            Remove
          </button>
        ) : null,
    },
  ];

  return (
    <NurseLayout>
      <div className="nurse-page nurse-max-w-wide nurse-handover-detail">
        <QueryFeedback isLoading={isLoading} isError={isError} error={error} onRetry={refetch}>
          {!handover ? (
            <div className="nurse-alert nurse-alert--error">Handover not found.</div>
          ) : (
            <>
        <NursePageHeader
          title={`Handover ${handover.handover_uid || handover.id}`}
          actions={
            <button type="button" className="nurse-btn nurse-btn--secondary" onClick={() => navigate(-1)}>
              Back
            </button>
          }
        />

        <div className="nurse-card nurse-card--padded nurse-detail-grid">
          <div>
            <span className="nurse-detail-label">Ward</span>
            <p>{handover.ward_name}</p>
          </div>
          <div>
            <span className="nurse-detail-label">Shift Date</span>
            <p>{handover.shift_date ? new Date(handover.shift_date).toLocaleDateString() : '—'}</p>
          </div>
          <div>
            <span className="nurse-detail-label">Status</span>
            <p>
              <NurseQueueStatusBadge status={handover.status} />
            </p>
          </div>
          <div>
            <span className="nurse-detail-label">Outgoing Nurse</span>
            <p>{handover.outgoing_nurse_name || handover.outgoing_nurse || '—'}</p>
          </div>
          {handover.general_notes && (
            <div className="nurse-detail-grid__full">
              <span className="nurse-detail-label">General Notes</span>
              <p>{handover.general_notes}</p>
            </div>
          )}
        </div>

        {hasAllocations && (
          <section className="nurse-section nurse-handover-assignment" aria-live="polite">
            <div className="nurse-handover-assignment__header">
              <h2 className="nurse-section-title">Assignment Summary</h2>
              <span className="nurse-badge nurse-badge--current-shift">
                {formatShiftLabel(allocationSummary.shift_name)}
              </span>
            </div>
            <div className="nurse-handover-assignment__stats">
              <span>
                Assigned Beds
                {' '}
                <strong>{allocationSummary.assigned_bed_count}</strong>
              </span>
              <span>
                Occupied Beds
                {' '}
                <strong>{allocationSummary.occupied_count}</strong>
              </span>
              <span>
                Patients Included
                {' '}
                <strong>{allocationCoverage.included}</strong>
              </span>
              <span>
                Patients Excluded
                {' '}
                <strong>{allocationCoverage.excluded}</strong>
              </span>
            </div>
            {isDraft && allocationCoverage.excluded > 0 && (
              <p className="nurse-handover-assignment__warning">
                {allocationCoverage.excluded === 1
                  ? '1 allocated occupied patient was not added.'
                  : `${allocationCoverage.excluded} allocated occupied patients were not added.`}
                {' '}
                You can still submit this handover.
              </p>
            )}
          </section>
        )}

        <section className="nurse-section">
          <h2 className="nurse-section-title">Patients ({handover.patients?.length ?? 0})</h2>
          <NurseDataTable
            columns={patientColumns}
            data={handover.patients || []}
            emptyMessage="No patients added to this handover."
          />
        </section>

        {isDraft && canUpdateHandovers && (
          <>
            <section className="nurse-section">
              <h2 className="nurse-section-title">Add Patient</h2>
              <form className="nurse-card nurse-card--padded nurse-form" onSubmit={addPatient}>
                <NursePatientPicker
                  id="handover-patient-picker"
                  value={selectedPatientId}
                  onChange={setSelectedPatientId}
                  excludePatientIds={handoverPatientIds}
                  required
                  allocationAware
                  placeholder="Search by patient ID (e.g. P-1014) or name…"
                  hint="Patients already on this handover are hidden from the list"
                />
                {PATIENT_FIELDS.map(({ key, label }) => (
                  <div key={key} className="nurse-field">
                    <label htmlFor={key}>{label}</label>
                    <textarea
                      id={key}
                      className="nurse-textarea"
                      rows={2}
                      value={patientForm[key]}
                      onChange={(e) => setPatientForm((p) => ({ ...p, [key]: e.target.value }))}
                    />
                  </div>
                ))}
                <button type="submit" className="nurse-btn nurse-btn--primary" disabled={bulkMut.isPending}>
                  {bulkMut.isPending ? 'Adding…' : 'Add Patient'}
                </button>
              </form>
            </section>

            <div className="nurse-form-actions">
              <button
                type="button"
                className="nurse-btn nurse-btn--primary"
                disabled={submitMut.isPending || !(handover.patients?.length > 0) || !canSubmitHandovers}
                onClick={handleSubmit}
              >
                {submitMut.isPending ? 'Submitting…' : 'Submit Handover'}
              </button>
            </div>
          </>
        )}
          </>
          )}
        </QueryFeedback>
      </div>
    </NurseLayout>
  );
}
