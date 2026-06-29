import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import NurseLayout from '@/features/nurse/components/NurseLayout';
import NursePageHeader from '@/features/nurse/components/NursePageHeader';
import NurseQueueStatusBadge from '@/features/nurse/components/NurseQueueStatusBadge';
import { useNursePermissionSet } from '@/features/nurse/hooks/useNursePermission';
import { QueryFeedback } from '@/shared/components/common';
import {
  useNurseAlertQuery,
  useAssignAlertMutation,
  useResolveAlertMutation,
  useEscalateAlertMutation,
} from '@/shared/hooks/queries/useNurseQuery';
import { useAuth } from '@/shared/hooks/useAuth';
import { toast } from '@/shared/utils/toast';
import { formatPatientIdDisplay } from '@/shared/api/mappers/nurseMapper';

export default function NurseAlertDetailPage() {
  const { alertId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { canUpdateAlerts, canEscalateAlerts } = useNursePermissionSet();
  const { data: alert, isLoading, isError, error, refetch } = useNurseAlertQuery(alertId);
  const assignMut = useAssignAlertMutation(alertId);
  const resolveMut = useResolveAlertMutation(alertId);
  const escalateMut = useEscalateAlertMutation(alertId);

  const [resolutionNotes, setResolutionNotes] = useState('');
  const [escalationNotes, setEscalationNotes] = useState('');
  const [doctorId, setDoctorId] = useState('');

  const isActive = alert?.status === 'active';

  return (
    <NurseLayout>
      <div className="nurse-page nurse-max-w-wide">
        <QueryFeedback isLoading={isLoading} isError={isError} error={error} onRetry={refetch}>
          {!alert ? (
            <div className="nurse-alert nurse-alert--error">Alert not found.</div>
          ) : (
            <>
        <NursePageHeader
          title={alert.title || alert.alert_uid || `Alert #${alert.id}`}
          actions={
            <button type="button" className="nurse-btn nurse-btn--secondary" onClick={() => navigate(-1)}>
              Back
            </button>
          }
        />

        <div className="nurse-card nurse-card--padded nurse-detail-grid">
          <div>
            <span className="nurse-detail-label">Patient</span>
            <p>{alert.patient_name || '—'}</p>
          </div>
          <div>
            <span className="nurse-detail-label">Patient ID</span>
            <p>{formatPatientIdDisplay(alert)}</p>
          </div>
          <div>
            <span className="nurse-detail-label">Type</span>
            <p>{alert.alert_type}</p>
          </div>
          <div>
            <span className="nurse-detail-label">Severity</span>
            <p>{alert.severity}</p>
          </div>
          <div>
            <span className="nurse-detail-label">Status</span>
            <p>
              <NurseQueueStatusBadge status={alert.status} />
            </p>
          </div>
          <div>
            <span className="nurse-detail-label">Ward / Bed</span>
            <p>
              {alert.ward_name || '—'} / {alert.bed_number || '—'}
            </p>
          </div>
          <div>
            <span className="nurse-detail-label">Assigned Nurse</span>
            <p>{alert.assigned_nurse_name || 'Unassigned'}</p>
          </div>
          {alert.description && (
            <div className="nurse-detail-grid__full">
              <span className="nurse-detail-label">Description</span>
              <p>{alert.description}</p>
            </div>
          )}
        </div>

        {isActive && (
          <div className="nurse-alert-actions">
            {canUpdateAlerts && (
              <>
                <section className="nurse-card nurse-card--padded nurse-form">
                  <h2 className="nurse-section-title">Assign to Me</h2>
                  <button
                    type="button"
                    className="nurse-btn nurse-btn--secondary"
                    disabled={assignMut.isPending}
                    onClick={() =>
                      assignMut.mutate(
                        { assigned_nurse_id: user?.id ?? null },
                        {
                          onSuccess: () => toast.success('Alert assigned'),
                          onError: (err) => toast.error(err?.message || 'Assign failed'),
                        }
                      )
                    }
                  >
                    {assignMut.isPending ? 'Assigning…' : 'Assign to Me'}
                  </button>
                </section>

                <section className="nurse-card nurse-card--padded nurse-form">
                  <h2 className="nurse-section-title">Resolve</h2>
                  <div className="nurse-field">
                    <label htmlFor="resolution_notes">Resolution Notes</label>
                    <textarea
                      id="resolution_notes"
                      className="nurse-textarea"
                      rows={3}
                      value={resolutionNotes}
                      onChange={(e) => setResolutionNotes(e.target.value)}
                    />
                  </div>
                  <button
                    type="button"
                    className="nurse-btn nurse-btn--primary"
                    disabled={resolveMut.isPending}
                    onClick={() =>
                      resolveMut.mutate(
                        { resolution_notes: resolutionNotes || null },
                        {
                          onSuccess: () => toast.success('Alert resolved'),
                          onError: (err) => toast.error(err?.message || 'Resolve failed'),
                        }
                      )
                    }
                  >
                    {resolveMut.isPending ? 'Resolving…' : 'Resolve Alert'}
                  </button>
                </section>
              </>
            )}

            {canEscalateAlerts && (
              <section className="nurse-card nurse-card--padded nurse-form">
                <h2 className="nurse-section-title">Escalate to Doctor</h2>
                <div className="nurse-field">
                  <label htmlFor="doctor_id">Doctor ID (optional)</label>
                  <input
                    id="doctor_id"
                    type="number"
                    className="nurse-input"
                    value={doctorId}
                    onChange={(e) => setDoctorId(e.target.value)}
                  />
                </div>
                <div className="nurse-field">
                  <label htmlFor="escalation_notes">Escalation Notes</label>
                  <textarea
                    id="escalation_notes"
                    className="nurse-textarea"
                    rows={3}
                    value={escalationNotes}
                    onChange={(e) => setEscalationNotes(e.target.value)}
                  />
                </div>
                <button
                  type="button"
                  className="nurse-btn nurse-btn--secondary"
                  disabled={escalateMut.isPending}
                  onClick={() =>
                    escalateMut.mutate(
                      {
                        doctor_id: doctorId ? Number(doctorId) : null,
                        escalation_notes: escalationNotes || null,
                      },
                      {
                        onSuccess: () => toast.success('Alert escalated'),
                        onError: (err) => toast.error(err?.message || 'Escalate failed'),
                      }
                    )
                  }
                >
                  {escalateMut.isPending ? 'Escalating…' : 'Escalate'}
                </button>
              </section>
            )}
          </div>
        )}

        {alert.timeline?.length > 0 && (
          <section className="nurse-section">
            <h2 className="nurse-section-title">Timeline</h2>
            <ul className="nurse-timeline-list">
              {alert.timeline.map((entry, idx) => (
                <li key={`${entry.event}-${idx}`} className="nurse-timeline-list__item">
                  <strong>{entry.event}</strong>
                  <span>{entry.timestamp ? new Date(entry.timestamp).toLocaleString() : ''}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
            </>
          )}
        </QueryFeedback>
      </div>
    </NurseLayout>
  );
}
