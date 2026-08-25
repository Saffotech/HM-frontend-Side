import { useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import NurseLayout from '@/features/nurse/components/NurseLayout';
import NursePageHeader from '@/features/nurse/components/NursePageHeader';
import NurseDataTable from '@/features/nurse/components/NurseDataTable';
import NurseQueueStatusBadge from '@/features/nurse/components/NurseQueueStatusBadge';
import { QueryFeedback } from '@/shared/components/common';
import { useNursePatientMedHistoryQuery } from '@/shared/hooks/queries/useNurseQuery';
import { ROUTES } from '@/shared/constants';

export default function NursePatientMedHistoryPage() {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { data, isLoading, isError, error, refetch } = useNursePatientMedHistoryQuery(patientId);

  const goBack = () => {
    const backTo = location.state?.backTo;
    const administerBackTo = location.state?.backToAdministerFrom;
    const overviewTab = location.state?.overviewTab;

    if (backTo) {
      navigate(backTo, {
        state: {
          ...(administerBackTo ? { backTo: administerBackTo } : {}),
          ...(overviewTab ? { overviewTab } : {}),
        },
      });
      return;
    }

    if (patientId && overviewTab) {
      navigate(ROUTES.NURSE_PATIENT.replace(':patientId', String(patientId)), {
        state: { overviewTab },
      });
      return;
    }

    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate(ROUTES.NURSE_MEDICATIONS);
  };

  const columns = useMemo(() => [
    { header: 'Medicine', accessor: 'medicine_name' },
    { header: 'Dose', accessor: 'dose' },
    { header: 'Status', render: (row) => <NurseQueueStatusBadge status={row.status} /> },
    {
      header: 'Administered At',
      render: (row) => (row.administered_at ? new Date(row.administered_at).toLocaleString() : '-'),
    },
    { header: 'By', accessor: 'administered_by_name' },
    { header: 'Remarks', accessor: 'remarks' },
  ], []);

  return (
    <NurseLayout>
      <div className="nurse-page">
        <NursePageHeader
          title="Medication History"
          actions={(
            <button type="button" className="nurse-btn nurse-btn--secondary" onClick={goBack}>
              Back
            </button>
          )}
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
