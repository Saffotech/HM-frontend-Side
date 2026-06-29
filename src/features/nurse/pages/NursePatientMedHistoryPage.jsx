import { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import NurseLayout from '@/features/nurse/components/NurseLayout';
import NursePageHeader from '@/features/nurse/components/NursePageHeader';
import NurseDataTable from '@/features/nurse/components/NurseDataTable';
import NurseQueueStatusBadge from '@/features/nurse/components/NurseQueueStatusBadge';
import { QueryFeedback } from '@/shared/components/common';
import { formatPatientIdDisplay } from '@/shared/api/mappers/nurseMapper';
import { useNursePatientMedHistoryQuery, useNurseQueueQuery } from '@/shared/hooks/queries/useNurseQuery';

export default function NursePatientMedHistoryPage() {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const { data, isLoading, isError, error, refetch } = useNursePatientMedHistoryQuery(patientId);
  const { data: queueData } = useNurseQueueQuery({ page: 1, page_size: 100 });

  const patientDisplayId = useMemo(() => {
    const fromHistory = formatPatientIdDisplay(data?.items?.[0]);
    if (fromHistory !== '—') return fromHistory;
    const queuePatient = queueData?.items?.find((q) => String(q.patient_id) === String(patientId));
    const fromQueue = formatPatientIdDisplay(queuePatient);
    return fromQueue !== '—' ? fromQueue : 'Patient';
  }, [data?.items, queueData?.items, patientId]);

  const columns = useMemo(() => [
    { header: 'Medicine', accessor: 'medicine_name' },
    { header: 'Dose', accessor: 'dose' },
    { header: 'Status', render: (row) => <NurseQueueStatusBadge status={row.status} /> },
    { header: 'Administered At', render: (row) => (row.administered_at ? new Date(row.administered_at).toLocaleString() : '-') },
    { header: 'By', accessor: 'administered_by_name' },
    { header: 'Remarks', accessor: 'remarks' },
  ], []);

  return (
    <NurseLayout>
      <div className="nurse-page">
        <NursePageHeader
          title={`Medication History — ${patientDisplayId}`}
          actions={<button type="button" className="nurse-btn nurse-btn--secondary" onClick={() => navigate(-1)}>Back</button>}
        />
        <QueryFeedback isLoading={isLoading} isError={isError} error={error} onRetry={refetch}>
          <NurseDataTable
            columns={columns}
            data={data?.items || []}
            isLoading={false}
            emptyMessage="No medication history for this patient."
          />
        </QueryFeedback>
      </div>
    </NurseLayout>
  );
}
