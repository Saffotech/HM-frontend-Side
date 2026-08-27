import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import NurseLayout from '@/features/nurse/components/NurseLayout';
import NursePageHeader from '@/features/nurse/components/NursePageHeader';
import NurseDataTable from '@/features/nurse/components/NurseDataTable';
import NursePagination from '@/features/nurse/components/NursePagination';
import NurseQueueStatusBadge from '@/features/nurse/components/NurseQueueStatusBadge';
import { QueryFeedback } from '@/shared/components/common';
import { useNursePatientMedHistoryQuery } from '@/shared/hooks/queries/useNurseQuery';
import { ROUTES } from '@/shared/constants';
import './NursePatientMedHistoryPage.css';

const PAGE_SIZE = 10;

function normalizeMedicineName(value) {
  return String(value || '').trim().toLowerCase();
}

function filterHistoryForMedicine(items, { itemId, medicineName }) {
  if (!items?.length) return [];
  const idKey = itemId != null && itemId !== '' ? String(itemId) : '';
  const nameKey = normalizeMedicineName(medicineName);

  if (idKey) {
    const byItem = items.filter(
      (row) => String(row.prescription_item_id ?? '') === idKey,
    );
    if (byItem.length) return byItem;
  }

  if (nameKey) {
    return items.filter(
      (row) => normalizeMedicineName(row.medicine_name || row.medicine) === nameKey,
    );
  }

  return items;
}

export default function NursePatientMedHistoryPage() {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, error, refetch } = useNursePatientMedHistoryQuery(patientId);

  const prescriptionItemId =
    searchParams.get('itemId')
    || location.state?.prescriptionItemId
    || null;
  const medicineName =
    searchParams.get('medicine')
    || location.state?.medicineName
    || '';
  const isMedicineScoped = Boolean(prescriptionItemId || medicineName);

  useEffect(() => {
    setPage(1);
  }, [patientId, prescriptionItemId, medicineName]);

  const items = useMemo(
    () => filterHistoryForMedicine(data?.items || [], {
      itemId: prescriptionItemId,
      medicineName,
    }),
    [data?.items, prescriptionItemId, medicineName],
  );

  const displayMedicineName = useMemo(() => {
    if (medicineName) return medicineName;
    return items[0]?.medicine_name || items[0]?.medicine || '';
  }, [medicineName, items]);

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

  const columns = useMemo(() => {
    const cols = [];
    if (!isMedicineScoped) {
      cols.push({ header: 'Medicine', accessor: 'medicine_name' });
    }
    cols.push(
      { header: 'Status', render: (row) => <NurseQueueStatusBadge status={row.status} /> },
      {
        header: 'Administered At',
        render: (row) => (row.administered_at ? new Date(row.administered_at).toLocaleString() : '-'),
      },
      { header: 'By', accessor: 'administered_by_name' },
      { header: 'Remarks', accessor: 'remarks' },
    );
    return cols;
  }, [isMedicineScoped]);

  const title = isMedicineScoped && displayMedicineName
    ? `${displayMedicineName} · History`
    : 'Medication History';

  const emptyMessage = isMedicineScoped && displayMedicineName
    ? `No administration history for ${displayMedicineName}.`
    : isMedicineScoped
      ? 'No administration history for this medicine.'
      : 'No medication history for this patient.';

  return (
    <NurseLayout>
      <div className="nurse-page nurse-patient-med-history-page">
        <NursePageHeader
          title={title}
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
            emptyMessage={emptyMessage}
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
