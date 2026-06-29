import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ArrowLeft } from 'lucide-react';
import NurseLayout from '@/features/nurse/components/NurseLayout';
import NursePatientPicker from '@/features/nurse/components/NursePatientPicker';
import { useNursePermission } from '@/features/nurse/hooks/useNursePermission';
import { useCreateAlertMutation } from '@/shared/hooks/queries/useNurseQuery';
import { ROUTES } from '@/shared/constants';
import { toast } from '@/shared/utils/toast';

const ALERT_TYPES = [
  { value: 'manual', label: 'Manual emergency' },
  { value: 'low_bp', label: 'Low blood pressure' },
  { value: 'high_bp', label: 'High blood pressure' },
  { value: 'high_fever', label: 'High fever' },
  { value: 'cardiac', label: 'Cardiac / heart rate' },
  { value: 'low_spo2', label: 'Low SpO₂' },
  { value: 'overdue_medication', label: 'Overdue medication' },
  { value: 'other', label: 'Other' },
];

const SEVERITIES = [
  { value: 'medium', label: 'Medium', hint: 'Monitor closely' },
  { value: 'high', label: 'High', hint: 'Needs prompt action' },
  { value: 'critical', label: 'Critical', hint: 'Immediate response' },
];

export default function NurseCreateAlertPage() {
  const navigate = useNavigate();
  const createMut = useCreateAlertMutation();
  const canCreateAlert = useNursePermission('emergency_alerts:create');
  const [selectedPatientId, setSelectedPatientId] = useState(null);
  const [form, setForm] = useState({
    alert_type: 'manual',
    severity: 'high',
    title: '',
    description: '',
  });

  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const selectedSeverity = useMemo(
    () => SEVERITIES.find((s) => s.value === form.severity) ?? SEVERITIES[1],
    [form.severity]
  );

  const onSubmit = (e) => {
    e.preventDefault();
    const patientId = Number(selectedPatientId);
    if (!patientId) {
      toast.error('Please select a patient');
      return;
    }
    createMut.mutate(
      {
        patient_id: patientId,
        alert_type: form.alert_type,
        severity: form.severity,
        title: form.title?.trim() || null,
        description: form.description?.trim() || null,
      },
      {
        onSuccess: (data) => {
          toast.success('Emergency alert raised');
          if (data?.id) navigate(`/nurse/alerts/${data.id}`);
          else navigate(ROUTES.NURSE_ALERTS);
        },
        onError: (err) => toast.error(err?.message || 'Failed to create alert'),
      }
    );
  };

  return (
    <NurseLayout>
      <div className="nurse-page nurse-alerts-create">
        <div className="nurse-alerts-create__banner">
          <button
            type="button"
            className="nurse-alerts-create__back"
            onClick={() => navigate(ROUTES.NURSE_ALERTS)}
          >
            <ArrowLeft size={16} aria-hidden />
            Back to alerts
          </button>
          <div className="nurse-alerts-create__banner-inner">
            <div className="nurse-alerts-create__banner-icon" aria-hidden>
              <AlertTriangle size={26} />
            </div>
            <div>
              <h1 className="nurse-alerts-create__title">Raise Emergency Alert</h1>
              <p className="nurse-alerts-create__subtitle">
                Notify the nursing team about an urgent patient situation. Ward and bed are
                filled automatically when the patient has an active admission.
              </p>
            </div>
          </div>
        </div>

        {!canCreateAlert ? (
          <div className="nurse-alert nurse-alert--error">
            You do not have permission to raise alerts.
          </div>
        ) : (
          <form className="nurse-card nurse-alerts-create__form" onSubmit={onSubmit}>
            <div className="nurse-alerts-create__form-top">
            <section className="nurse-alerts-create__section">
              <h2 className="nurse-alerts-create__section-title">Patient</h2>
              <NursePatientPicker
                id="alert-patient-picker"
                value={selectedPatientId}
                onChange={setSelectedPatientId}
                required
                placeholder="Search by patient ID (e.g. P-1014) or name…"
                hint="Select from today's queue or patients with active medications"
              />
            </section>

            <section className="nurse-alerts-create__section">
              <h2 className="nurse-alerts-create__section-title">Classification</h2>
              <div className="nurse-alerts-create__class-grid">
                <div className="nurse-field">
                  <label htmlFor="alert_type">Alert type</label>
                  <select
                    id="alert_type"
                    className="nurse-select"
                    value={form.alert_type}
                    onChange={(e) => set('alert_type', e.target.value)}
                  >
                    {ALERT_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="nurse-field">
                  <span className="nurse-alerts-create__severity-label" id="severity-label">
                    Severity
                  </span>
                  <div
                    className="nurse-alerts-create__severity"
                    role="radiogroup"
                    aria-labelledby="severity-label"
                  >
                    {SEVERITIES.map((s) => (
                      <button
                        key={s.value}
                        type="button"
                        role="radio"
                        aria-checked={form.severity === s.value}
                        className={`nurse-alerts-create__severity-btn nurse-alerts-create__severity-btn--${s.value} ${
                          form.severity === s.value ? 'nurse-alerts-create__severity-btn--active' : ''
                        }`}
                        onClick={() => set('severity', s.value)}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                  <p className="nurse-alerts-create__severity-hint">{selectedSeverity.hint}</p>
                </div>
              </div>
            </section>
            </div>

            <section className="nurse-alerts-create__section">
              <h2 className="nurse-alerts-create__section-title">Details</h2>
              <div className="nurse-alerts-create__details-grid">
                <div className="nurse-field">
                  <label htmlFor="title">Short title</label>
                  <input
                    id="title"
                    className="nurse-input"
                    value={form.title}
                    onChange={(e) => set('title', e.target.value)}
                    placeholder="e.g. Patient collapsed in ward"
                    maxLength={255}
                  />
                </div>
                <div className="nurse-field nurse-alerts-create__description-field">
                  <label htmlFor="description">Description</label>
                  <textarea
                    id="description"
                    className="nurse-textarea"
                    rows={5}
                    value={form.description}
                    onChange={(e) => set('description', e.target.value)}
                    placeholder="What happened, current symptoms, and any immediate actions taken…"
                  />
                </div>
              </div>
            </section>

            <div className="nurse-alerts-create__actions">
              <p className="nurse-alerts-create__actions-note">
                Alert will be logged as <strong>active</strong> and visible on the Emergency Alerts
                board.
              </p>
              <div className="nurse-alerts-create__actions-btns">
                <button
                  type="button"
                  className="nurse-btn nurse-btn--secondary"
                  onClick={() => navigate(ROUTES.NURSE_ALERTS)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`nurse-btn ${
                    form.severity === 'critical'
                      ? 'nurse-btn--danger'
                      : 'nurse-btn--primary'
                  }`}
                  disabled={createMut.isPending}
                >
                  {createMut.isPending ? 'Raising alert…' : 'Raise alert'}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </NurseLayout>
  );
}
