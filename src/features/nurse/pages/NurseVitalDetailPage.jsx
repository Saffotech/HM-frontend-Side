import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Pencil, User } from 'lucide-react';
import NurseLayout from '@/features/nurse/components/NurseLayout';
import NurseVitalsSnapshotView from '@/features/nurse/components/NurseVitalsSnapshotView';
import { useNursePermission } from '@/features/nurse/hooks/useNursePermission';
import { QueryFeedback } from '@/shared/components/common';
import { formatPatientIdDisplay } from '@/shared/api/mappers/nurseMapper';
import { useNurseVitalQuery } from '@/shared/hooks/queries/useNurseQuery';

export default function NurseVitalDetailPage() {
  const { vitalId } = useParams();
  const navigate = useNavigate();
  const canUpdateVitals = useNursePermission('nurse_vitals:update');
  const { data: vital, isLoading, isError, error, refetch } = useNurseVitalQuery(vitalId);

  return (
    <NurseLayout>
      <div className="nurse-page nurse-max-w-wide">
        <QueryFeedback isLoading={isLoading} isError={isError} error={error} onRetry={refetch}>
          {!vital ? (
            <div className="nurse-alert nurse-alert--error">Vital record not found.</div>
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
                  {canUpdateVitals && (
                    <button
                      type="button"
                      className="nurse-btn nurse-btn--primary"
                      onClick={() => navigate(`/nurse/vitals/${vital.id}/edit`)}
                    >
                      <Pencil size={16} />
                      Update
                    </button>
                  )}
                </div>
              </div>
              <NurseVitalsSnapshotView vital={vital} />
            </div>
          )}
        </QueryFeedback>
      </div>
    </NurseLayout>
  );
}
