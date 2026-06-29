import { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Activity, Plus } from 'lucide-react';
import NurseLayout from '@/features/nurse/components/NurseLayout';
import NursePageHeader from '@/features/nurse/components/NursePageHeader';
import { QueryFeedback } from '@/shared/components/common';
import { formatPatientIdDisplay } from '@/shared/api/mappers/nurseMapper';
import {
  useNurseVitalsSearchQuery,
  useNursePatientQueueAppointmentId,
  useNurseQueueQuery,
} from '@/shared/hooks/queries/useNurseQuery';
import { ROUTES } from '@/shared/constants';
import { toast } from '@/shared/utils/toast';

export default function NursePatientVitalsTimelinePage() {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const { data, isLoading, isError, error, refetch } = useNurseVitalsSearchQuery({ patient_id: patientId });
  const { data: queueData } = useNurseQueueQuery({ page: 1, page_size: 100 });
  const { appointmentId, isLoading: isAppointmentLoading } = useNursePatientQueueAppointmentId(patientId);

  const patientDisplayId = useMemo(() => {
    const fromVital = formatPatientIdDisplay(data?.items?.[0]);
    if (fromVital !== '—') return fromVital;
    const queuePatient = queueData?.items?.find((q) => String(q.patient_id) === String(patientId));
    const fromQueue = formatPatientIdDisplay(queuePatient);
    return fromQueue !== '—' ? fromQueue : 'Patient';
  }, [data?.items, queueData?.items, patientId]);

  const handleRecordVitals = () => {
    if (!appointmentId) {
      toast.error('This patient is not in today\'s queue. Record vitals from the queue or dashboard.');
      return;
    }
    navigate(`${ROUTES.NURSE_VITALS_NEW}?appointmentId=${appointmentId}`);
  };

  const recordDisabled = isAppointmentLoading || !appointmentId;

  return (
    <NurseLayout>
      <div className="nurse-page nurse-max-w-wide">
        <NursePageHeader
          title={`Vitals Timeline — ${patientDisplayId}`}
          actions={
            <button
              type="button"
              className="nurse-btn nurse-btn--primary"
              onClick={handleRecordVitals}
              disabled={recordDisabled}
              title={recordDisabled && !isAppointmentLoading ? 'Patient must be in today\'s queue' : undefined}
            >
              <Plus size={16} /> Record Vitals
            </button>
          }
        />
        <QueryFeedback isLoading={isLoading} isError={isError} error={error} onRetry={refetch}>
          {!data?.items?.length ? (
            <div className="nurse-card nurse-card--padded" style={{ textAlign: 'center', color: '#64748b' }}>
              No vitals history for this patient.
            </div>
          ) : (
            <div className="nurse-timeline">
              {data.items.map((vital) => (
                <div key={vital.id} className="nurse-timeline__item">
                  <span className="nurse-timeline__dot"><Activity size={12} /></span>
                  <div className="nurse-card nurse-card--padded">
                    <div style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '0.5rem' }}>
                      {new Date(vital.recorded_at).toLocaleString()}
                    </div>
                    <div className="nurse-detail-grid">
                      <div><dt>Temp</dt><dd>{vital.temperature || '-'} °F</dd></div>
                      <div><dt>BP</dt><dd>{vital.blood_pressure || '-'}</dd></div>
                      <div><dt>HR</dt><dd>{vital.heart_rate || '-'} bpm</dd></div>
                      <div><dt>SpO₂</dt><dd>{vital.oxygen_saturation || '-'} %</dd></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </QueryFeedback>
      </div>
    </NurseLayout>
  );
}
