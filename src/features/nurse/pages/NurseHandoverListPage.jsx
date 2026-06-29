import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, Plus } from 'lucide-react';
import NurseLayout from '@/features/nurse/components/NurseLayout';
import NursePageHeader from '@/features/nurse/components/NursePageHeader';
import NurseDataTable from '@/features/nurse/components/NurseDataTable';
import NursePagination from '@/features/nurse/components/NursePagination';
import NurseQueueStatusBadge from '@/features/nurse/components/NurseQueueStatusBadge';
import { useNursePermissionSet } from '@/features/nurse/hooks/useNursePermission';
import { QueryFeedback } from '@/shared/components/common';
import { useNurseHandoversQuery } from '@/shared/hooks/queries/useNurseQuery';
import { ROUTES } from '@/shared/constants';

export default function NurseHandoverListPage() {
  const navigate = useNavigate();
  const { canCreateHandovers, canViewHandovers } = useNursePermissionSet();
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, error, refetch } = useNurseHandoversQuery({ page, page_size: 20 });

  const columns = [
    { header: 'Handover ID', accessor: 'handover_uid' },
    { header: 'Ward', accessor: 'ward_name' },
    {
      header: 'Shift Date',
      render: (row) => (row.shift_date ? new Date(row.shift_date).toLocaleDateString() : '—'),
    },
    {
      header: 'Status',
      render: (row) => <NurseQueueStatusBadge status={row.status} />,
    },
    { header: 'Patients', accessor: 'patient_count' },
    {
      header: 'Actions',
      render: (row) => (
        canViewHandovers ? (
          <button
            type="button"
            className="nurse-btn nurse-btn--secondary nurse-btn--sm"
            onClick={() => navigate(`/nurse/handover/${row.id}`)}
          >
            View
          </button>
        ) : '—'
      ),
    },
  ];

  return (
    <NurseLayout>
      <div className="nurse-page">
        <NursePageHeader
          title="Shift Handover"
          actions={
            canCreateHandovers ? (
              <button
                type="button"
                className="nurse-btn nurse-btn--primary"
                onClick={() => navigate(ROUTES.NURSE_HANDOVER_NEW)}
              >
                <Plus size={16} />
                New Handover
              </button>
            ) : null
          }
        />
        <div className="nurse-card nurse-card--padded">
          <div className="nurse-handover-list__icon" aria-hidden>
            <ClipboardList size={22} />
          </div>
          <QueryFeedback isLoading={isLoading} isError={isError} error={error} onRetry={refetch}>
          <NurseDataTable
            columns={columns}
            data={data?.items || []}
            isLoading={false}
            emptyMessage="No handovers yet. Create one to start a shift summary."
          />
          <NursePagination
            page={page}
            pageSize={20}
            total={data?.total}
            itemCount={data?.items?.length ?? 0}
            onChange={setPage}
          />
          </QueryFeedback>
        </div>
      </div>
    </NurseLayout>
  );
}
