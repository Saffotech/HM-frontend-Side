import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, User } from 'lucide-react';
import NurseLayout from '@/features/nurse/components/NurseLayout';
import NurseVitalsFormFields, { buildVitalsPayload, vitalsToForm } from '@/features/nurse/components/NurseVitalsFormFields';
import { useNursePermission } from '@/features/nurse/hooks/useNursePermission';
import { QueryFeedback } from '@/shared/components/common';
import { formatPatientIdDisplay } from '@/shared/api/mappers/nurseMapper';
import { useNurseVitalQuery, useUpdateVitalsMutation } from '@/shared/hooks/queries/useNurseQuery';
import { toast } from '@/shared/utils/toast';

export default function NurseEditVitalsPage() {
  const { vitalId } = useParams();
  const navigate = useNavigate();
  const canUpdateVitals = useNursePermission('nurse_vitals:update');
  const { data: vital, isLoading, isError, error, refetch } = useNurseVitalQuery(vitalId);
  const updateMut = useUpdateVitalsMutation(vitalId);
  const [form, setForm] = useState(null);

  useEffect(() => {
    if (vital) {
      setForm(vitalsToForm(vital));
    }
  }, [vital]);

  const onSubmit = (e) => {
    e.preventDefault();
    updateMut.mutate(buildVitalsPayload(form), {
      onSuccess: (updated) => {
        toast.success('Vitals updated');
        // Update creates a new recording — open that so Recorded At shows the latest time
        const nextId = updated?.id ?? vitalId;
        navigate(`/nurse/vitals/${nextId}`);
      },
      onError: () => toast.error('Failed to update vitals'),
    });
  };

  const recordedAt = vital?.recorded_at ? new Date(vital.recorded_at).toLocaleString() : '—';

  return (
    <NurseLayout>
      <div className="nurse-page nurse-max-w-wide">
        <QueryFeedback isLoading={isLoading} isError={isError} error={error} onRetry={refetch}>
          {!vital ? (
            <div className="nurse-alert nurse-alert--error">Vital record not found.</div>
          ) : !canUpdateVitals ? (
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
                <div className="nurse-vital-detail__info-item">
                  <Calendar size={18} aria-hidden />
                  <div>
                    <span className="nurse-vital-detail__info-label">Last Recorded</span>
                    <span className="nurse-vital-detail__info-value">{recordedAt}</span>
                  </div>
                </div>
                <div className="nurse-vital-detail__info-item">
                  <User size={18} aria-hidden />
                  <div>
                    <span className="nurse-vital-detail__info-label">Recorded By</span>
                    <span className="nurse-vital-detail__info-value">{vital.recorded_by || '—'}</span>
                  </div>
                </div>
              </div>

              <section className="nurse-vital-detail__section">
                <h2 className="nurse-vital-detail__section-title">Update Vital Signs</h2>
                <form className="nurse-card nurse-card--padded nurse-form nurse-vital-edit-form" onSubmit={onSubmit}>
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
