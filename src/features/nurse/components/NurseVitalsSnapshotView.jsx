import { useState, useEffect, useMemo } from 'react';
import { Activity, Calendar, Stethoscope, User } from 'lucide-react';
import NurseHistoryFilter from '@/features/nurse/components/NurseHistoryFilter';
import {
  NurseClinicalFieldShell,
  NurseClinicalReadonlyValue,
} from '@/features/nurse/components/NurseClinicalFieldCard';
import {
  VITAL_FIELDS,
  decodeCustomVitals,
  formatVitalDisplay,
} from '@/features/nurse/components/NurseVitalsFormFields';
function formatRecordedAt(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString();
}

function normalizeHistory(vital) {
  if (!vital) return [];
  if (vital.history?.length) {
    return [...vital.history].sort((a, b) => new Date(b.recorded_at) - new Date(a.recorded_at));
  }
  return [{
    history_id: `${vital.id}-current`,
    recorded_at: vital.recorded_at,
    recorded_by: vital.recorded_by_name ?? vital.recorded_by ?? null,
    status: vital.status,
    temperature: vital.temperature,
    blood_pressure: vital.blood_pressure,
    heart_rate: vital.heart_rate,
    respiratory_rate: vital.respiratory_rate,
    oxygen_saturation: vital.oxygen_saturation,
    blood_sugar: vital.blood_sugar,
    weight: vital.weight,
    pain_level: vital.pain_level,
    observation_notes: vital.observation_notes,
  }];
}

export default function NurseVitalsSnapshotView({ vital }) {
  const historyItems = useMemo(() => normalizeHistory(vital), [vital]);
  const latestHistoryId = historyItems[0]?.history_id ?? '';
  const [selectedHistoryId, setSelectedHistoryId] = useState(latestHistoryId);

  useEffect(() => {
    setSelectedHistoryId(latestHistoryId);
  }, [vital?.id, latestHistoryId]);

  const activeHistoryId = useMemo(() => {
    if (!historyItems.length) return '';
    if (selectedHistoryId && historyItems.some((e) => e.history_id === selectedHistoryId)) {
      return selectedHistoryId;
    }
    return historyItems[0].history_id;
  }, [historyItems, selectedHistoryId]);

  const snapshot = useMemo(
    () => historyItems.find((entry) => entry.history_id === activeHistoryId) || historyItems[0],
    [historyItems, activeHistoryId],
  );

  const customVitals = useMemo(
    () => decodeCustomVitals(snapshot?.observation_notes),
    [snapshot?.observation_notes],
  );

  if (!vital || !snapshot) return null;

  return (
    <div className="nurse-vitals-snapshot">
      <div className="nurse-vital-detail__info-bar nurse-card nurse-card--padded">
        <div className="nurse-vital-detail__info-item nurse-vital-detail__info-item--filter">
          <Calendar size={18} aria-hidden />
          <NurseHistoryFilter
            label="Recorded At"
            items={historyItems}
            value={activeHistoryId}
            onChange={setSelectedHistoryId}
            getItemId={(item) => item.history_id}
            getItemDate={(item) => item.recorded_at}
            formatDate={formatRecordedAt}
          />
        </div>
        <div className="nurse-vital-detail__info-item">
          <User size={18} aria-hidden />
          <div>
            <span className="nurse-vital-detail__info-label">Recorded By</span>
            <span className="nurse-vital-detail__info-value">{snapshot.recorded_by || '—'}</span>
          </div>
        </div>
        <div className="nurse-vital-detail__info-item">
          <Stethoscope size={18} aria-hidden />
          <div>
            <span className="nurse-vital-detail__info-label">Status</span>
            <span className="nurse-vital-detail__status">{snapshot.status || 'recorded'}</span>
          </div>
        </div>
      </div>

      <section className="nurse-vital-detail__section">
        <h2 className="nurse-vital-detail__section-title">Vital Signs</h2>
        <div className="nurse-clinical-panel nurse-clinical-panel--compact nurse-card nurse-card--padded">
          <div className="nurse-clinical-fields nurse-clinical-fields--grid nurse-clinical-fields--vitals">
            {VITAL_FIELDS.map(({ key, label, icon: Icon, accent }) => (
              <NurseClinicalFieldShell
                key={key}
                accent={accent}
                icon={Icon}
                label={label}
              >
                <NurseClinicalReadonlyValue>
                  {formatVitalDisplay(key, snapshot[key])}
                </NurseClinicalReadonlyValue>
              </NurseClinicalFieldShell>
            ))}
          </div>
        </div>
      </section>

      {customVitals.length > 0 ? (
        <section className="nurse-vital-detail__section">
          <h2 className="nurse-vital-detail__section-title">Other Vitals</h2>
          <div className="nurse-clinical-panel nurse-clinical-panel--compact nurse-card nurse-card--padded">
            <div className="nurse-clinical-fields nurse-clinical-fields--grid nurse-clinical-fields--vitals">
              {customVitals.map((row) => (
                <NurseClinicalFieldShell
                  key={`${row.label}-${row.value}`}
                  accent="slate"
                  icon={Activity}
                  label={row.label}
                >
                  <NurseClinicalReadonlyValue>
                    {row.value}
                    {row.unit ? ` ${row.unit}` : ''}
                  </NurseClinicalReadonlyValue>
                </NurseClinicalFieldShell>
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
