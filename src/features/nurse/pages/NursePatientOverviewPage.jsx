import { useEffect, useMemo, useState, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Activity,
  ArrowLeft,
  FileText,
  FlaskConical,
  History,
  Pill,
  User,
} from 'lucide-react';
import NurseLayout from '@/features/nurse/components/NurseLayout';
import NurseQueueStatusBadge from '@/features/nurse/components/NurseQueueStatusBadge';
import NurseNotesSnapshotView from '@/features/nurse/components/NurseNotesSnapshotView';
import NurseVitalsSnapshotView from '@/features/nurse/components/NurseVitalsSnapshotView';
import NursePermissionButton from '@/features/nurse/components/NursePermissionButton';
import { useNursePermissionSet } from '@/features/nurse/hooks/useNursePermission';
import { useNursePatientScope } from '@/features/nurse/context/NursePatientScopeContext';
import { QueryFeedback } from '@/shared/components/common';
import {
  formatPatientIdDisplay,
  withAssembledVitalHistory,
} from '@/shared/api/mappers/nurseMapper';
import {
  useNurseVitalsSearchQuery,
  useNurseNotesSearchQuery,
  useNursePatientMedicationsQuery,
  useNursePatientMedHistoryQuery,
  useNurseBedPatientsQuery,
  useNurseLabReportsQuery,
} from '@/shared/hooks/queries/useNurseQuery';
import { ROUTES } from '@/shared/constants';

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function NursePatientOverviewPage() {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const {
    canViewVitals,
    canUpdateVitals,
    canViewNotes,
    canUpdateNotes,
    canViewLabReports,
    canViewMedication,
    canCreateMedication,
  } = useNursePermissionSet();
  const { scopeFilters, scopeReady } = useNursePatientScope();
  const [activeTab, setActiveTab] = useState(
    () => location.state?.overviewTab || 'vitals',
  );

  useEffect(() => {
    if (location.state?.overviewTab) {
      setActiveTab(location.state.overviewTab);
    }
  }, [location.state?.overviewTab, location.key]);

  const openLabReport = useCallback((row, event) => {
    event?.stopPropagation?.();
    const id = row.report_id ?? row.id;
    if (id == null) return;
    navigate(
      ROUTES.NURSE_LAB_REPORT_DETAIL.replace(':reportId', String(id)),
      {
        state: {
          backTo: ROUTES.NURSE_PATIENT.replace(':patientId', String(patientId)),
          overviewTab: 'labs',
        },
      },
    );
  }, [navigate, patientId]);

  const {
    data: vitals,
    isLoading: isVitalsLoading,
    isError: isVitalsError,
    error: vitalsError,
    refetch: refetchVitals,
  } = useNurseVitalsSearchQuery(
    { patient_id: patientId, page: 1, page_size: 100 },
    { enabled: Boolean(patientId) && canViewVitals },
  );
  const {
    data: notes,
    isLoading: isNotesLoading,
    isError: isNotesError,
    error: notesError,
    refetch: refetchNotes,
  } = useNurseNotesSearchQuery(
    { patient_id: patientId },
    { enabled: Boolean(patientId) && canViewNotes },
  );
  const {
    data: labReports,
    isLoading: isLabReportsLoading,
    isError: isLabReportsError,
    error: labReportsError,
    refetch: refetchLabReports,
  } = useNurseLabReportsQuery(
    { patient_id: patientId, page: 1, page_size: 20, ...scopeFilters },
    { enabled: Boolean(patientId) && scopeReady && canViewLabReports },
  );
  const {
    data: meds,
    isLoading: isMedsLoading,
    isError: isMedsError,
    error: medsError,
    refetch: refetchMeds,
  } = useNursePatientMedicationsQuery(patientId, {
    enabled: Boolean(patientId) && canViewMedication,
  });
  const {
    data: medHistory,
    isLoading: isHistoryLoading,
    isError: isHistoryError,
    error: historyError,
    refetch: refetchHistory,
  } = useNursePatientMedHistoryQuery(patientId, {
    enabled: Boolean(patientId) && canViewMedication,
  });

  const {
    data: bedData,
  } = useNurseBedPatientsQuery({ page: 1, page_size: 100 });

  const patient = useMemo(() => {
    const fromMeds = meds?.patient_id ? meds : null;
    const fromVital = vitals?.items?.[0];
    const fromNote = notes?.items?.[0];
    const bedPatient = bedData?.items?.find(
      (q) => String(q.patient_id) === String(patientId),
    );
    return {
      patient_id: patientId,
      patientUid:
        fromMeds?.patientUid
        || fromVital?.patientUid
        || fromNote?.patientUid
        || bedPatient?.patientUid
        || '',
      patient_name: fromMeds?.patient_name || fromVital?.patient_name || fromNote?.patient_name || bedPatient?.patient_name || 'Unknown Patient',
      bed_number: fromMeds?.bed_number || fromVital?.bed_number || fromNote?.bed_number || bedPatient?.bed_number || '—',
      ward_name: fromMeds?.ward_name || bedPatient?.ward_name || '—',
    };
  }, [patientId, meds, vitals, notes, bedData?.items]);

  const labReportItems = labReports?.items ?? [];

  const tabs = [
    canViewVitals ? { id: 'vitals', label: 'Vitals', icon: Activity, count: 0 } : null,
    canViewNotes ? { id: 'notes', label: 'Nursing Notes', icon: FileText, count: 0 } : null,
    canViewLabReports ? { id: 'labs', label: 'Lab Reports', icon: FlaskConical, count: labReportItems.length } : null,
    canViewMedication ? { id: 'meds', label: 'Medications', icon: Pill, count: meds?.prescriptions?.length || 0 } : null,
    canViewMedication ? { id: 'history', label: 'Medications History', icon: History, count: medHistory?.items?.length || 0 } : null,
  ].filter(Boolean);

  const vitalsItems = useMemo(() => {
    const items = vitals?.items || [];
    return [...items].sort((a, b) => new Date(b.recorded_at) - new Date(a.recorded_at));
  }, [vitals?.items]);
  const notesItems = useMemo(() => {
    const items = notes?.items || [];
    return [...items].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }, [notes?.items]);
  const prescriptions = meds?.prescriptions || [];
  const historyItems = useMemo(() => {
    const items = medHistory?.items || [];
    return [...items].sort(
      (a, b) => new Date(b.administered_at) - new Date(a.administered_at)
    );
  }, [medHistory?.items]);

  // Newest recording + assembled history powers Recorded At dropdown
  const latestVital = vitalsItems[0] || null;
  const vitalForSnapshot = useMemo(
    () => withAssembledVitalHistory(latestVital, vitalsItems),
    [latestVital, vitalsItems],
  );
  const latestNote = notesItems[0] || null;
  const vitalsTabCount = Math.max(
    vitalForSnapshot?.history?.length ?? 0,
    vitalsItems.length,
  );
  const notesTabCount = Math.max(
    latestNote?.history?.length ?? 0,
    notesItems.length,
  );

  const tabsWithCounts = tabs.map((tab) => {
    if (tab.id === 'vitals') return { ...tab, count: vitalsTabCount };
    if (tab.id === 'notes') return { ...tab, count: notesTabCount };
    return tab;
  });

  const goToAdminister = useCallback(() => {
    if (!canCreateMedication) return;
    navigate(`/nurse/medications/patient/${patientId}`, {
      state: {
        backTo: ROUTES.NURSE_PATIENT.replace(':patientId', String(patientId)),
        overviewTab: 'meds',
      },
    });
  }, [canCreateMedication, navigate, patientId]);

  const vitalsAction = useMemo(() => {
    if (!latestVital) return null;
    return {
      label: 'Update',
      disabled: !canUpdateVitals,
      onClick: () => {
        if (!canUpdateVitals) return;
        navigate(`/nurse/vitals/${latestVital.id}/edit`);
      },
    };
  }, [latestVital, canUpdateVitals, navigate]);

  const notesAction = useMemo(() => {
    if (!latestNote) return null;
    return {
      label: 'Update',
      disabled: !canUpdateNotes,
      onClick: () => {
        if (!canUpdateNotes) return;
        navigate(`/nurse/notes/${latestNote.id}/edit`);
      },
    };
  }, [latestNote, canUpdateNotes, navigate]);

  useEffect(() => {
    if (!tabsWithCounts.some((tab) => tab.id === activeTab) && tabsWithCounts[0]) {
      setActiveTab(tabsWithCounts[0].id);
    }
  }, [activeTab, tabsWithCounts]);

  return (
    <NurseLayout>
      <div className="nurse-page nurse-patient-overview">
        <div className="nurse-vital-detail__top">
          <div className="nurse-vital-detail__identity">
            <div className="nurse-patient-overview__avatar" aria-hidden>
              <User size={28} />
            </div>
            <div>
              <h1 className="nurse-vital-detail__name">{patient.patient_name}</h1>
              <p className="nurse-vital-detail__meta-line">
                <span>Patient ID: <strong>{formatPatientIdDisplay(patient)}</strong></span>
                <span className="nurse-vital-detail__dot" aria-hidden>·</span>
                <span>Bed: <strong>{patient.bed_number}</strong></span>
                <span className="nurse-vital-detail__dot" aria-hidden>·</span>
                <span>Ward: <strong>{patient.ward_name}</strong></span>
              </p>
            </div>
          </div>
          <div className="nurse-vital-detail__actions">
            <button
              type="button"
              className="nurse-btn nurse-btn--secondary"
              onClick={() => navigate(location.state?.backTo || ROUTES.NURSE_QUEUE)}
            >
              <ArrowLeft size={16} />
              Back
            </button>
          </div>
        </div>

        <div className="nurse-patient-overview__shell nurse-card">
          <div className="nurse-patient-overview__tab-bar">
            <div className="nurse-patient-overview__tabs">
              {tabsWithCounts.map(({ id, label, icon: Icon, count }) => (
                <button
                  key={id}
                  type="button"
                  className={`nurse-patient-overview__tab${activeTab === id ? ' nurse-patient-overview__tab--active' : ''}`}
                  onClick={() => setActiveTab(id)}
                >
                  <Icon size={16} />
                  <span>{label}</span>
                  <span className="nurse-patient-overview__tab-count">{count}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="nurse-patient-overview__panel">
            {activeTab === 'vitals' && (
              <QueryFeedback
                isLoading={isVitalsLoading}
                isError={isVitalsError}
                error={vitalsError}
                onRetry={refetchVitals}
              >
                {vitalsItems.length === 0 ? (
                  <div className="nurse-patient-overview__empty">No vitals recorded for this patient.</div>
                ) : (
                  <NurseVitalsSnapshotView vital={vitalForSnapshot} action={vitalsAction} />
                )}
              </QueryFeedback>
            )}

            {activeTab === 'notes' && (
              <QueryFeedback
                isLoading={isNotesLoading}
                isError={isNotesError}
                error={notesError}
                onRetry={refetchNotes}
              >
                {notesItems.length === 0 ? (
                  <div className="nurse-patient-overview__empty">No nursing notes for this patient.</div>
                ) : (
                  <NurseNotesSnapshotView note={latestNote} action={notesAction} />
                )}
              </QueryFeedback>
            )}

            {activeTab === 'labs' && (
              <QueryFeedback
                isLoading={isLabReportsLoading}
                isError={isLabReportsError}
                error={labReportsError}
                onRetry={refetchLabReports}
              >
                {labReportItems.length === 0 ? (
                  <div className="nurse-patient-overview__empty">
                    No lab reports for this patient on an occupied bed.
                  </div>
                ) : (
                  <div className="nurse-patient-overview__table-wrap">
                    <table className="nurse-patient-overview__table">
                      <thead>
                        <tr>
                          <th>Test</th>
                          <th>Reported at</th>
                          <th>Status</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {labReportItems.map((row) => (
                          <tr
                            key={row.report_id ?? row.id}
                            className="nurse-row--clickable"
                            onClick={(event) => openLabReport(row, event)}
                          >
                            <td>{row.test_name || '—'}</td>
                            <td>
                              {row.uploaded_at
                                ? new Date(row.uploaded_at).toLocaleString()
                                : '—'}
                            </td>
                            <td>{row.status || '—'}</td>
                            <td>
                              <div
                                className="nurse-table__actions"
                                onClick={(event) => event.stopPropagation()}
                              >
                                <button
                                  type="button"
                                  className="nurse-btn nurse-btn--secondary nurse-btn--sm"
                                  onClick={(event) => openLabReport(row, event)}
                                >
                                  View
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </QueryFeedback>
            )}

            {activeTab === 'meds' && (
              <QueryFeedback
                isLoading={isMedsLoading}
                isError={isMedsError}
                error={medsError}
                onRetry={refetchMeds}
              >
                {prescriptions.length === 0 ? (
                  <div className="nurse-patient-overview__empty">No active medications for this patient.</div>
                ) : (
                  <div className="nurse-patient-overview__table-wrap">
                    <table className="nurse-patient-overview__table nurse-patient-overview__med-table">
                      <thead>
                        <tr>
                          <th>Medicine</th>
                          <th>Dosage</th>
                          <th>Duration</th>
                          <th>Frequency</th>
                          <th>Instruction</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {prescriptions.map((rx) => (
                          <tr key={rx.id}>
                            <td className="nurse-patient-overview__med-name">{rx.medicine_name}</td>
                            <td>{rx.dose || '—'}</td>
                            <td>{rx.duration || '—'}</td>
                            <td>{rx.frequency || '—'}</td>
                            <td>{rx.route || rx.instructions || '—'}</td>
                            <td>
                              <NursePermissionButton
                                allowed={canCreateMedication}
                                className="nurse-btn nurse-btn--secondary nurse-patient-overview__action-btn"
                                onClick={goToAdminister}
                              >
                                Administer
                              </NursePermissionButton>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </QueryFeedback>
            )}

            {activeTab === 'history' && (
              <QueryFeedback
                isLoading={isHistoryLoading}
                isError={isHistoryError}
                error={historyError}
                onRetry={refetchHistory}
              >
                {historyItems.length === 0 ? (
                  <div className="nurse-patient-overview__empty">No medication history for this patient.</div>
                ) : (
                  <div className="nurse-patient-overview__table-wrap">
                    <table className="nurse-patient-overview__table nurse-patient-overview__history-table">
                      <thead>
                        <tr>
                          <th>Medicine</th>
                          <th>Dosage</th>
                          <th>Administered At</th>
                          <th>By</th>
                          <th>Status</th>
                          <th>Remarks</th>
                        </tr>
                      </thead>
                      <tbody>
                        {historyItems.map((row) => (
                          <tr key={row.id}>
                            <td className="nurse-patient-overview__med-name">
                              {row.medicine_name || row.medicine}
                            </td>
                            <td>{row.dose || '—'}</td>
                            <td className="nurse-patient-overview__history-date">
                              {formatDate(row.administered_at)}
                            </td>
                            <td>{row.administered_by_name || row.administered_by || '—'}</td>
                            <td><NurseQueueStatusBadge status={row.status} /></td>
                            <td className="nurse-patient-overview__med-remarks-cell">
                              {row.remarks || '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </QueryFeedback>
            )}
          </div>
        </div>
      </div>
    </NurseLayout>
  );
}
