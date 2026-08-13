import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, User } from 'lucide-react';
import NurseLayout from '@/features/nurse/components/NurseLayout';
import NurseHistoryFilter from '@/features/nurse/components/NurseHistoryFilter';
import NurseVitalsFormFields, { buildVitalsPayload, vitalsToForm } from '@/features/nurse/components/NurseVitalsFormFields';
import { useNursePermission } from '@/features/nurse/hooks/useNursePermission';
import { useAuth } from '@/shared/hooks/useAuth';
import { QueryFeedback } from '@/shared/components/common';
import {
  formatPatientIdDisplay,
  withAssembledVitalHistory,
} from '@/shared/api/mappers/nurseMapper';
import {
  useNurseVitalQuery,
  useNurseVitalsSearchQuery,
  useUpdateVitalsMutation,
} from '@/shared/hooks/queries/useNurseQuery';
import { toast } from '@/shared/utils/toast';

function formatRecordedAt(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString();
}

function historyIdOf(entry) {
  if (!entry) return '';
  return String(entry.history_id ?? entry.id ?? '');
}

export default function NurseEditVitalsPage() {
  const { vitalId } = useParams();
  const navigate = useNavigate();
  const { refreshPermissions } = useAuth();
  const canUpdateVitals = useNursePermission('nurse_vitals:update');
  const [permReady, setPermReady] = useState(false);
  const { data: vital, isLoading, isError, error, refetch } = useNurseVitalQuery(vitalId);
  const { data: patientVitals } = useNurseVitalsSearchQuery(
    { patient_id: vital?.patient_id, page: 1, page_size: 100 },
    { enabled: Boolean(vital?.patient_id) },
  );

  const vitalWithHistory = useMemo(
    () => withAssembledVitalHistory(vital, patientVitals?.items ?? []) || vital,
    [vital, patientVitals?.items],
  );

  const historyItems = useMemo(() => {
    const list = vitalWithHistory?.history;
    if (Array.isArray(list) && list.length) {
      return [...list].sort((a, b) => new Date(b.recorded_at) - new Date(a.recorded_at));
    }
    if (!vitalWithHistory) return [];
    return [{
      history_id: vitalWithHistory.id,
      recorded_at: vitalWithHistory.recorded_at,
      recorded_by: vitalWithHistory.recorded_by_name ?? vitalWithHistory.recorded_by ?? null,
      status: vitalWithHistory.status,
      temperature: vitalWithHistory.temperature,
      blood_pressure: vitalWithHistory.blood_pressure,
      heart_rate: vitalWithHistory.heart_rate,
      respiratory_rate: vitalWithHistory.respiratory_rate,
      oxygen_saturation: vitalWithHistory.oxygen_saturation,
      blood_sugar: vitalWithHistory.blood_sugar,
      weight: vitalWithHistory.weight,
      pain_level: vitalWithHistory.pain_level,
      observation_notes: vitalWithHistory.observation_notes,
    }];
  }, [vitalWithHistory]);

  const [selectedHistoryId, setSelectedHistoryId] = useState('');
  const [form, setForm] = useState(null);

  const activeHistoryId = useMemo(() => {
    if (!historyItems.length) return '';
    if (selectedHistoryId && historyItems.some((e) => historyIdOf(e) === String(selectedHistoryId))) {
      return String(selectedHistoryId);
    }
    const matchRoute = historyItems.find((e) => historyIdOf(e) === String(vitalId));
    return historyIdOf(matchRoute || historyItems[0]);
  }, [historyItems, selectedHistoryId, vitalId]);

  const activeSnapshot = useMemo(
    () => historyItems.find((e) => historyIdOf(e) === activeHistoryId) || historyItems[0],
    [historyItems, activeHistoryId],
  );

  const updateTargetId = activeHistoryId || vitalId;
  const updateMut = useUpdateVitalsMutation(updateTargetId);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await refreshPermissions?.();
      } finally {
        if (!cancelled) setPermReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshPermissions]);

  useEffect(() => {
    if (!historyItems.length) return;
    setSelectedHistoryId((prev) => {
      if (prev && historyItems.some((e) => historyIdOf(e) === String(prev))) {
        return String(prev);
      }
      const preferred =
        historyItems.find((e) => historyIdOf(e) === String(vitalId)) || historyItems[0];
      return historyIdOf(preferred);
    });
  }, [vital?.id, vitalId, historyItems]);

  useEffect(() => {
    if (activeSnapshot) {
      setForm(vitalsToForm(activeSnapshot));
    }
  }, [activeSnapshot]);

  const onHistoryChange = useCallback((id) => {
    setSelectedHistoryId(String(id));
  }, []);

  const onSubmit = (e) => {
    e.preventDefault();
    if (!canUpdateVitals) {
      toast.error('You do not have permission to update vitals.');
      return;
    }
    updateMut.mutate(buildVitalsPayload(form), {
      onSuccess: (updated) => {
        toast.success('Vitals updated');
        const nextId = updated?.id ?? updateTargetId;
        navigate(`/nurse/vitals/${nextId}`);
      },
      onError: (err) => toast.error(err?.message || 'Failed to update vitals'),
    });
  };

  const blockByPermission = permReady && !canUpdateVitals;

  return (
    <NurseLayout>
      <div className="nurse-page">
        <QueryFeedback
          isLoading={isLoading || !permReady}
          isError={isError}
          error={error}
          onRetry={refetch}
        >
          {!vital ? (
            <div className="nurse-alert nurse-alert--error">Vital record not found.</div>
          ) : blockByPermission ? (
            <div className="nurse-alert nurse-alert--error">You do not have permission to update vitals.</div>
          ) : !form ? (
            <div className="nurse-card nurse-card--padded nurse-vital-detail__loading">Preparing form…</div>
          ) : (
            <div className="nurse-vital-detail">
              <div className="nurse-vital-detail__top">
                <div className="nurse-vital-detail__identity">
                  <div className="nurse-vital-detail__avatar" aria-hidden>
                    <User size={28} />
                  </div>
                  <div>
                    <h1 className="nurse-vital-detail__name">{vital.patient_name || 'Unknown Patient'}</h1>
                    <p className="nurse-vital-detail__meta-line">
                      <span>Patient ID: <strong>{formatPatientIdDisplay(vital)}</strong></span>
                      <span className="nurse-vital-detail__dot" aria-hidden>·</span>
                      <span>Bed: <strong>{vital.bed_number || '—'}</strong></span>
                    </p>
                  </div>
                </div>
                <div className="nurse-vital-detail__actions">
                  <button type="button" className="nurse-btn nurse-btn--secondary" onClick={() => navigate(-1)}>
                    <ArrowLeft size={16} />
                    Back
                  </button>
                </div>
              </div>

              <div className="nurse-vital-detail__info-bar nurse-card nurse-card--padded">
                <div className="nurse-vital-detail__info-item nurse-vital-detail__info-item--filter">
                  <Calendar size={18} aria-hidden />
                  <NurseHistoryFilter
                    label="Recorded At"
                    items={historyItems}
                    value={activeHistoryId}
                    onChange={onHistoryChange}
                    getItemId={(item) => historyIdOf(item)}
                    getItemDate={(item) => item.recorded_at}
                    formatDate={formatRecordedAt}
                  />
                </div>
                <div className="nurse-vital-detail__info-item">
                  <User size={18} aria-hidden />
                  <div>
                    <span className="nurse-vital-detail__info-label">Recorded By</span>
                    <span className="nurse-vital-detail__info-value">
                      {activeSnapshot?.recorded_by || vital.recorded_by || '—'}
                    </span>
                  </div>
                </div>
              </div>

              <section className="nurse-vital-detail__section">
                <h2 className="nurse-vital-detail__section-title">Update Vital Signs</h2>
                <form className="nurse-clinical-panel nurse-clinical-panel--compact nurse-card nurse-card--padded" onSubmit={onSubmit}>
                  <NurseVitalsFormFields form={form} setForm={setForm} />
                  <div className="nurse-form-actions">
                    <button type="button" className="nurse-btn nurse-btn--secondary" onClick={() => navigate(-1)}>
                      Cancel
                    </button>
                    <button type="submit" className="nurse-btn nurse-btn--primary" disabled={updateMut.isPending}>
                      {updateMut.isPending ? 'Updating…' : 'Update Vitals'}
                    </button>
                  </div>
                </form>
              </section>
            </div>
          )}
        </QueryFeedback>
      </div>
    </NurseLayout>
  );
}
