import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  AlertTriangle,
  UserRound,
  MapPin,
  Clock,
  CheckCircle2,
  History,
} from 'lucide-react';
import NurseLayout from '@/features/nurse/components/NurseLayout';
import NurseQueueStatusBadge from '@/features/nurse/components/NurseQueueStatusBadge';
import NurseSeverityBadge from '@/features/nurse/components/NurseSeverityBadge';
import { useNursePermissionSet } from '@/features/nurse/hooks/useNursePermission';
import NursePermissionButton from '@/features/nurse/components/NursePermissionButton';
import { QueryFeedback } from '@/shared/components/common';
import {
  useNurseAlertQuery,
  useResolveAlertMutation,
} from '@/shared/hooks/queries/useNurseQuery';
import { toast } from '@/shared/utils/toast';
import { formatPatientIdDisplay } from '@/shared/api/mappers/nurseMapper';
import { ROUTES } from '@/shared/constants';

const TIMELINE_LABELS = {
  created: 'Alert created',
  assigned: 'Assigned to nurse',
  escalated: 'Escalated to doctor',
  resolved: 'Resolved',
};

function formatAlertType(value) {
  if (!value) return '—';
  const raw = typeof value === 'string' ? value : value?.value ?? String(value);
  return raw.replace(/_/g, ' ');
}

function formatDateTime(value) {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString();
}

export default function NurseAlertDetailPage() {
  const { alertId } = useParams();
  const navigate = useNavigate();
  const { canViewAlerts, canUpdateAlerts } = useNursePermissionSet();
  const { data: alert, isLoading, isError, error, refetch } = useNurseAlertQuery(alertId, {
    enabled: canViewAlerts,
  });
  const resolveMut = useResolveAlertMutation(alertId);

  const [resolutionNotes, setResolutionNotes] = useState('');

  const status = String(alert?.status ?? '').toLowerCase();
  const isActive = status === 'active';
  const severityKey = String(alert?.severity ?? '').toLowerCase();

  const handleResolve = () => {
    if (!canUpdateAlerts) {
      toast.error('You do not have permission');
      return;
    }
    resolveMut.mutate(
      { resolution_notes: resolutionNotes.trim() || null },
      {
        onSuccess: () => {
          toast.success('Alert resolved');
          setResolutionNotes('');
        },
        onError: (err) => toast.error(err?.message || 'Resolve failed'),
      },
    );
  };

  return (
    <NurseLayout>
      <div className="nurse-page nurse-alert-detail">
        {!canViewAlerts ? (
          <div className="nurse-alert nurse-alert--error">
            You do not have permission to view emergency alerts.
          </div>
        ) : (
        <QueryFeedback isLoading={isLoading} isError={isError} error={error} onRetry={refetch}>
          {!alert ? (
            <div className="nurse-alert nurse-alert--error">Alert not found.</div>
          ) : (
            <>
              <div className="nurse-alert-detail__toolbar">
                <button
                  type="button"
                  className="nurse-alert-detail__back"
                  onClick={() => navigate(ROUTES.NURSE_ALERTS)}
                >
                  <ArrowLeft size={16} aria-hidden />
                  Back to alerts
                </button>
              </div>

              <header
                className={`nurse-card nurse-alert-detail__hero nurse-alert-detail__hero--${severityKey || 'medium'}`}
              >
                <div className="nurse-alert-detail__hero-main">
                  <div className="nurse-alert-detail__hero-icon" aria-hidden>
                    <AlertTriangle size={22} />
                  </div>
                  <div className="nurse-alert-detail__hero-text">
                    <h1 className="nurse-alert-detail__title">
                      {alert.title || alert.alert_uid || `Alert #${alert.id}`}
                    </h1>
                    <div className="nurse-alert-detail__badges">
                      <NurseSeverityBadge severity={alert.severity} />
                      <NurseQueueStatusBadge status={alert.status} />
                    </div>
                  </div>
                </div>
                <div className="nurse-alert-detail__hero-meta">
                  <Clock size={14} aria-hidden />
                  <span>Triggered {formatDateTime(alert.triggered_at)}</span>
                </div>
              </header>

              <div className="nurse-alert-detail__layout">
                <div className="nurse-alert-detail__main">
                  <section className="nurse-card nurse-alert-detail__info">
                    <h2 className="nurse-alert-detail__section-title">Patient &amp; location</h2>
                    <dl className="nurse-alert-detail__grid">
                      <div className="nurse-alert-detail__field">
                        <dt>
                          <UserRound size={14} aria-hidden />
                          Patient
                        </dt>
                        <dd>{alert.patient_name || '—'}</dd>
                      </div>
                      <div className="nurse-alert-detail__field">
                        <dt>Patient ID</dt>
                        <dd>{formatPatientIdDisplay(alert)}</dd>
                      </div>
                      <div className="nurse-alert-detail__field">
                        <dt>Type</dt>
                        <dd className="nurse-alert-detail__type">{formatAlertType(alert.alert_type)}</dd>
                      </div>
                      <div className="nurse-alert-detail__field">
                        <dt>
                          <MapPin size={14} aria-hidden />
                          Ward / Bed
                        </dt>
                        <dd>
                          {alert.ward_name || '—'} / {alert.bed_number || '—'}
                        </dd>
                      </div>
                    </dl>
                    {alert.description && (
                      <div className="nurse-alert-detail__description">
                        <h3>Description</h3>
                        <p>{alert.description}</p>
                      </div>
                    )}
                  </section>

                  {!isActive && (
                    <section className="nurse-card nurse-alert-detail__resolved">
                      <h2 className="nurse-alert-detail__section-title">Resolution</h2>
                      <dl className="nurse-alert-detail__grid">
                        <div className="nurse-alert-detail__field">
                          <dt>Resolved by</dt>
                          <dd>{alert.resolved_by_name || '—'}</dd>
                        </div>
                        <div className="nurse-alert-detail__field">
                          <dt>Resolved at</dt>
                          <dd>{formatDateTime(alert.resolved_at)}</dd>
                        </div>
                      </dl>
                      {alert.resolution_notes && (
                        <div className="nurse-alert-detail__description">
                          <h3>Resolution notes</h3>
                          <p>{alert.resolution_notes}</p>
                        </div>
                      )}
                    </section>
                  )}

                  {alert.timeline?.length > 0 && (
                    <section className="nurse-card nurse-alert-detail__timeline">
                      <h2 className="nurse-alert-detail__section-title">
                        <History size={16} aria-hidden />
                        Timeline
                      </h2>
                      <ol className="nurse-alert-detail__timeline-list">
                        {alert.timeline.map((entry, idx) => (
                          <li key={`${entry.event}-${idx}`} className="nurse-alert-detail__timeline-item">
                            <span className="nurse-alert-detail__timeline-dot" aria-hidden />
                            <div className="nurse-alert-detail__timeline-content">
                              <strong>{TIMELINE_LABELS[entry.event] || entry.event}</strong>
                              <span>{formatDateTime(entry.timestamp)}</span>
                            </div>
                          </li>
                        ))}
                      </ol>
                    </section>
                  )}
                </div>

                {isActive && (
                  <aside className="nurse-alert-detail__actions">
                    <section className="nurse-card nurse-alert-detail__action-card">
                      <div className="nurse-alert-detail__action-head">
                        <CheckCircle2 size={18} aria-hidden />
                        <div>
                          <h2>Resolve</h2>
                          <p>Mark this alert as handled.</p>
                        </div>
                      </div>
                      <div className="nurse-field">
                        <label htmlFor="resolution_notes">Resolution notes</label>
                        <textarea
                          id="resolution_notes"
                          className="nurse-textarea"
                          rows={3}
                          placeholder="What action was taken…"
                          value={resolutionNotes}
                          onChange={(e) => setResolutionNotes(e.target.value)}
                          disabled={!canUpdateAlerts || resolveMut.isPending}
                        />
                      </div>
                      <NursePermissionButton
                        allowed={canUpdateAlerts}
                        className="nurse-btn nurse-btn--primary nurse-alert-detail__action-btn"
                        onClick={handleResolve}
                      >
                        {resolveMut.isPending ? 'Resolving…' : 'Resolve Alert'}
                      </NursePermissionButton>
                    </section>
                  </aside>
                )}
              </div>
            </>
          )}
        </QueryFeedback>
        )}
      </div>
    </NurseLayout>
  );
}
