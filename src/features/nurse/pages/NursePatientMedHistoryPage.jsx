import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { ArrowLeft, History, Pill } from 'lucide-react';
import NurseLayout from '@/features/nurse/components/NurseLayout';
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

function formatAdministeredAt(iso) {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return {
    date: date.toLocaleDateString(undefined, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }),
    time: date.toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
    }),
  };
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
        render: (row) => {
          const when = formatAdministeredAt(row.administered_at);
          if (!when) return '—';
          return (
            <span className="nurse-med-history__when">
              <span className="nurse-med-history__when-date">{when.date}</span>
              <span className="nurse-med-history__when-time">{when.time}</span>
            </span>
          );
        },
      },
      {
        header: 'By',
        render: (row) => {
          const name = String(row.administered_by_name || row.administered_by || '').trim();
          if (!name) return '—';
          return <span className="nurse-med-history__by">{name}</span>;
        },
      },
      {
        header: 'Remarks',
        render: (row) => {
          const remarks = String(row.remarks ?? '').trim();
          if (!remarks) return <span className="nurse-med-history__empty">—</span>;
          return <span className="nurse-med-history__remarks">{remarks}</span>;
        },
      },
    );
    return cols;
  }, [isMedicineScoped]);

  const emptyMessage = isMedicineScoped && displayMedicineName
    ? `No administration history for ${displayMedicineName}.`
    : isMedicineScoped
      ? 'No administration history for this medicine.'
      : 'No medication history for this patient.';

  return (
    <NurseLayout>
      <div className="nurse-page nurse-patient-med-history-page">
        <header className="nurse-med-history__header">
          <div className="nurse-med-history__identity">
            <div className="nurse-med-history__icon" aria-hidden>
              {displayMedicineName ? <Pill size={22} /> : <History size={22} />}
            </div>
            <div>
              <p className="nurse-med-history__eyebrow">Medication history</p>
              <h1 className="nurse-med-history__title">
                {displayMedicineName || 'All medicines'}
              </h1>
            </div>
          </div>
          <div className="nurse-med-history__actions">
            <div className="nurse-med-history__stat" aria-label="Record count">
              <History size={15} aria-hidden />
              <span>
                <strong>{isLoading ? '—' : items.length}</strong>
                {items.length === 1 ? ' Record' : ' Records'}
              </span>
            </div>
            <button type="button" className="nurse-btn nurse-btn--secondary nurse-med-history__back" onClick={goBack}>
              <ArrowLeft size={16} aria-hidden />
              Back
            </button>
          </div>
        </header>
        <QueryFeedback isLoading={isLoading} isError={isError} error={error} onRetry={refetch}>
          <section className="nurse-med-history__panel">
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
          </section>
        </QueryFeedback>
      </div>
    </NurseLayout>
  );
}
