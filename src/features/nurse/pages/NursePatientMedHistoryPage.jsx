import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import NurseLayout from '@/features/nurse/components/NurseLayout';
import NursePageHeader from '@/features/nurse/components/NursePageHeader';
import NurseDataTable from '@/features/nurse/components/NurseDataTable';
import NursePagination from '@/features/nurse/components/NursePagination';
import NurseQueueStatusBadge from '@/features/nurse/components/NurseQueueStatusBadge';
import { QueryFeedback } from '@/shared/components/common';
import { useNursePatientMedHistoryQuery } from '@/shared/hooks/queries/useNurseQuery';
import { ROUTES } from '@/shared/constants';

const PAGE_SIZE = 10;

export default function NursePatientMedHistoryPage() {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, error, refetch } = useNursePatientMedHistoryQuery(patientId);

  useEffect(() => {
    setPage(1);
  }, [patientId]);

  const items = data?.items || [];
  const pageCount = Math.max(1, Math.ceil(items.length / PAGE_SIZE) || 1);
  const safePage = Math.min(page, pageCount);
  const pagedItems = useMemo(
    () => items.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [items, safePage],
  );

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
            data={pagedItems}
            isLoading={false}
            emptyMessage="No medication history for this patient."
          />
          <NursePagination
            page={safePage}
            pageSize={PAGE_SIZE}
            total={items.length}
            hasNextPage={safePage < pageCount}
            itemCount={pagedItems.length}
            onChange={setPage}
          />
        </QueryFeedback>
      </div>
    </NurseLayout>
  );
}
