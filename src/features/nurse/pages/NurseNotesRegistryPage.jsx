import { useState, useCallback, useMemo, useEffect } from 'react';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';
import { useNavigate } from 'react-router-dom';
import { FileText } from 'lucide-react';
import NurseLayout from '@/features/nurse/components/NurseLayout';
import NurseDataTable from '@/features/nurse/components/NurseDataTable';
import NursePagination from '@/features/nurse/components/NursePagination';
import NurseQueueStatusBadge from '@/features/nurse/components/NurseQueueStatusBadge';
import { useNursePermissionSet } from '@/features/nurse/hooks/useNursePermission';
import { useNursePagedListGuard } from '@/features/nurse/hooks/useNursePagedListGuard';
import { getPagedListCount, formatPatientIdDisplay } from '@/shared/api/mappers/nurseMapper';
import { QueryFeedback } from '@/shared/components/common';
import { useNurseNotesListQuery } from '@/shared/hooks/queries/useNurseQuery';

export default function NurseNotesRegistryPage() {
  const navigate = useNavigate();
  const { canUpdateNotes } = useNursePermissionSet();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 400);

  const { data, isLoading, isError, error, refetch } = useNurseNotesListQuery({ search: debouncedSearch, page, page_size: 20 });

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  useNursePagedListGuard({
    isLoading,
    page,
    items: data?.items,
    onPageChange: setPage,
  });

  const listCount = useMemo(
    () => getPagedListCount({
      page,
      page_size: 20,
      items: data?.items,
      total: data?.total,
      hasNextPage: data?.hasNextPage,
    }),
    [data, page],
  );

  const viewNote = useCallback((row) => navigate(`/nurse/notes/${row.id}`), [navigate]);
  const updateNote = useCallback((row) => navigate(`/nurse/notes/${row.id}/edit`), [navigate]);

  const columns = useMemo(() => [
    {
      header: 'Patient ID',
      render: (row) => <span className="nurse-notes-registry__id">{formatPatientIdDisplay(row)}</span>,
    },
    {
      header: 'Patient Name',
      render: (row) => (
        <span className="nurse-notes-registry__name">{row.patient_name || '—'}</span>
      ),
    },
    {
      header: 'Bed Number',
      render: (row) => <span className="nurse-notes-registry__bed">{row.bed_number || '—'}</span>,
    },
    {
      header: 'Symptoms',
      render: (row) => (
        <span className="nurse-notes-registry__symptoms" title={row.symptoms || undefined}>
          {row.symptoms || '—'}
        </span>
      ),
    },
    {
      header: 'Status',
      render: (row) => <NurseQueueStatusBadge status={row.status} />,
    },
    {
      header: 'Created At',
      render: (row) => (
        <span className="nurse-notes-registry__time">
          {row.created_at ? new Date(row.created_at).toLocaleString() : '—'}
        </span>
      ),
    },
    {
      header: 'Actions',
      render: (row) => (
        <div className="nurse-table__actions">
          {canUpdateNotes ? (
            <button
              type="button"
              className="nurse-btn nurse-btn--primary nurse-btn--sm"
              onClick={(e) => {
                e.stopPropagation();
                updateNote(row);
              }}
            >
              Update
            </button>
          ) : null}
        </div>
      ),
    },
  ], [updateNote, canUpdateNotes]);

  return (
    <NurseLayout>
      <div className="nurse-page nurse-notes-registry">
        <div className="nurse-notes-registry__toolbar nurse-card">
          <div className="nurse-notes-registry__toolbar-left">
            <div className="nurse-notes-registry__icon" aria-hidden>
              <FileText size={22} />
            </div>
            <div>
              <p className="nurse-notes-registry__count">
                {isLoading ? '…' : (
                  <>
                    {listCount.approximate ? `${listCount.count}+` : listCount.count}
                  </>
                )}
                {' '}
                {listCount.count === 1 && !listCount.approximate ? 'note' : 'notes'}
              </p>
              <p className="nurse-notes-registry__hint">Click a row to view full nursing note</p>
            </div>
          </div>
          <div className="nurse-notes-registry__search-wrap">
            <input
              type="text"
              className="nurse-input nurse-notes-registry__search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, patient ID, or phone…"
            />
          </div>
        </div>

        <QueryFeedback isLoading={isLoading} isError={isError} error={error} onRetry={refetch}>
        <div className="nurse-notes-registry__table">
          <NurseDataTable
            columns={columns}
            data={data?.items || []}
            isLoading={false}
            emptyMessage="No notes recorded yet."
            onRowClick={viewNote}
          />
        </div>

        <NursePagination
          page={page}
          pageSize={20}
          total={data?.total}
          hasNextPage={data?.hasNextPage}
          itemCount={data?.items?.length ?? 0}
          onChange={setPage}
        />
        </QueryFeedback>
      </div>
    </NurseLayout>
  );
}
