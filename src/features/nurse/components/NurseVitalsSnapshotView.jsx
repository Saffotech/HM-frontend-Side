import { useState, useEffect, useMemo, useRef } from 'react';
import {
  Activity,
  Calendar,
  Droplets,
  Heart,
  Scale,
  Stethoscope,
  Thermometer,
  User,
  Wind,
} from 'lucide-react';
import NurseHistoryFilter from '@/features/nurse/components/NurseHistoryFilter';
import { decodeCustomVitals } from '@/features/nurse/components/NurseVitalsFormFields';

const CORE_VITALS = [
  { key: 'temperature', label: 'Temperature', unit: '°F', icon: Thermometer, accent: 'rose' },
  { key: 'blood_pressure', label: 'Blood Pressure', unit: '', icon: Activity, accent: 'blue' },
  { key: 'heart_rate', label: 'Heart Rate', unit: 'BPM', icon: Heart, accent: 'red' },
  { key: 'respiratory_rate', label: 'Respiratory Rate', unit: '/min', icon: Wind, accent: 'teal' },
  { key: 'oxygen_saturation', label: 'SpO₂', unit: '%', icon: Droplets, accent: 'sky' },
  { key: 'blood_sugar', label: 'Blood Sugar', unit: 'mg/dL', icon: Droplets, accent: 'amber' },
  { key: 'weight', label: 'Weight', unit: 'kg', icon: Scale, accent: 'slate' },
  { key: 'pain_level', label: 'Pain Level', unit: '', icon: Stethoscope, accent: 'purple' },
];

function formatVitalValue(key, value) {
  if (value === null || value === undefined || value === '') return '—';
  if (key === 'pain_level') return `${value}/10`;
  return String(value);
}

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
  const [selectedHistoryId, setSelectedHistoryId] = useState('');
  const historyLenRef = useRef(0);

  useEffect(() => {
    historyLenRef.current = 0;
    if (historyItems.length) {
      setSelectedHistoryId(historyItems[0].history_id);
    }
  }, [vital?.id]);

  useEffect(() => {
    if (!historyItems.length) return;
    const len = historyItems.length;
    if (len > historyLenRef.current && historyLenRef.current > 0) {
      setSelectedHistoryId(historyItems[0].history_id);
    } else {
      setSelectedHistoryId((prev) => {
        const stillExists = historyItems.some((entry) => entry.history_id === prev);
        return stillExists ? prev : historyItems[0].history_id;
      });
    }
    historyLenRef.current = len;
  }, [historyItems, vital?.id]);

  const activeHistoryId = useMemo(() => {
    if (!historyItems.length) return '';
    if (selectedHistoryId && historyItems.some((e) => e.history_id === selectedHistoryId)) {
      return selectedHistoryId;
    }
    return historyItems[0].history_id;
  }, [historyItems, selectedHistoryId]);

  const snapshot = useMemo(
    () => historyItems.find((entry) => entry.history_id === activeHistoryId) || historyItems[0],
    [historyItems, activeHistoryId]
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
        <div className="nurse-vital-metrics">
          {CORE_VITALS.map(({ key, label, unit, icon: Icon, accent }) => (
            <div key={key} className={`nurse-vital-metric nurse-vital-metric--${accent}`}>
              <div className="nurse-vital-metric__icon">
                <Icon size={20} />
              </div>
              <div className="nurse-vital-metric__body">
                <span className="nurse-vital-metric__label">{label}</span>
                <span className="nurse-vital-metric__value">
                  {formatVitalValue(key, snapshot[key])}
                  {unit && snapshot[key] != null && snapshot[key] !== '' && (
                    <span className="nurse-vital-metric__unit"> {unit}</span>
                  )}
                </span>
                {key === 'pain_level' && snapshot.pain_level != null && (
                  <div className="nurse-vital-metric__bar" aria-hidden>
                    <div
                      className="nurse-vital-metric__bar-fill"
                      style={{ width: `${Math.min(100, (Number(snapshot.pain_level) / 10) * 100)}%` }}
                    />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {customVitals.length > 0 && (
        <section className="nurse-vital-detail__section">
          <h2 className="nurse-vital-detail__section-title">Other Vitals</h2>
          <div className="nurse-vital-metrics">
            {customVitals.map((row) => (
              <div key={`${row.label}-${row.value}`} className="nurse-vital-metric nurse-vital-metric--slate">
                <div className="nurse-vital-metric__icon">
                  <Activity size={20} />
                </div>
                <div className="nurse-vital-metric__body">
                  <span className="nurse-vital-metric__label">{row.label}</span>
                  <span className="nurse-vital-metric__value">
                    {row.value}
                    {row.unit ? (
                      <span className="nurse-vital-metric__unit"> {row.unit}</span>
                    ) : null}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
