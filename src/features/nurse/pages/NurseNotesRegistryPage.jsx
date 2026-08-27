import { useState, useCallback, useMemo, useEffect } from 'react';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';
import { useNavigate } from 'react-router-dom';
import { FileText, X } from 'lucide-react';
import NurseLayout from '@/features/nurse/components/NurseLayout';
import NurseDataTable from '@/features/nurse/components/NurseDataTable';
import NursePagination from '@/features/nurse/components/NursePagination';
import { useNursePermissionSet } from '@/features/nurse/hooks/useNursePermission';
import { useNursePagedListGuard } from '@/features/nurse/hooks/useNursePagedListGuard';
import {
  buildNurseNotesUrl,
  filterNursePatientRegistryItems,
  formatPatientIdDisplay,
} from '@/shared/api/mappers/nurseMapper';
import { QueryFeedback } from '@/shared/components/common';
import {
  useNurseBedPatientsQuery,
  useNurseNotesListQuery,
} from '@/shared/hooks/queries/useNurseQuery';
import { useNursePatientScope } from '@/features/nurse/context/NursePatientScopeContext';
import NursePermissionButton from '@/features/nurse/components/NursePermissionButton';
import NursePatientAllocationTags from '@/features/nurse/components/NursePatientAllocationTags';
import { useAuth } from '@/shared/hooks/useAuth';
import { toast } from '@/shared/utils/toast';
import './NurseMedicationPatientsPage.css';

const PAGE_SIZE = 10;
const FETCH_PAGE_SIZE = 100;
const WARD_OPTIONS = ['ICU', 'Private', 'General'];

function NotesStatusBadge({ done }) {
  if (done) {
    return <span className="nurse-badge nurse-badge--notes">Done</span>;
  }
  return <span className="nurse-badge nurse-badge--not-done">Not done</span>;
}

function resolveNoteId(noteRow) {
  return noteRow?.id ?? noteRow?.note_id ?? null;
}

function resolveCreatedAt(noteRow) {
  return noteRow?.created_at ?? noteRow?.recorded_at ?? null;
}

export default function NurseNotesRegistryPage() {
  const navigate = useNavigate();
  const { refreshPermissions } = useAuth();
  const { canUpdateNotes, canViewNotes, canCreateNotes } = useNursePermissionSet();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [ward, setWard] = useState('');
  const debouncedSearch = useDebouncedValue(search, 400);
  const { scopeFilters, scopeReady, allocatedOnly, allocationSummary } = useNursePatientScope();

  useEffect(() => {
    refreshPermissions?.();
  }, [refreshPermissions]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, ward, allocatedOnly]);

  const bedFilters = useMemo(
    () => ({
      search: debouncedSearch || undefined,
      page: 1,
      page_size: FETCH_PAGE_SIZE,
      ...scopeFilters,
    }),
    [debouncedSearch, scopeFilters],
  );

  const notesFilters = useMemo(
    () => ({
      page: 1,
      page_size: FETCH_PAGE_SIZE,
      ...scopeFilters,
    }),
    [scopeFilters],
  );

  const bedQuery = useNurseBedPatientsQuery(bedFilters, {
    enabled: scopeReady && canViewNotes,
  });
  const notesQuery = useNurseNotesListQuery(notesFilters, {
    enabled: scopeReady && canViewNotes,
  });

  const notesByPatientId = useMemo(() => {
    const map = new Map();
    for (const row of notesQuery.data?.items ?? []) {
      const id = Number(row?.patient_id);
      if (!Number.isSafeInteger(id) || id < 1) continue;
      const existing = map.get(id);
      if (!existing) {
        map.set(id, row);
        continue;
      }
      const existingAt = existing.created_at ? new Date(existing.created_at).getTime() : 0;
      const nextAt = row.created_at ? new Date(row.created_at).getTime() : 0;
      if (nextAt >= existingAt) map.set(id, row);
    }
    return map;
  }, [notesQuery.data?.items]);

  const allRows = useMemo(() => {
    const bedItems = bedQuery.data?.items ?? [];
    const merged = bedItems.map((bedRow) => {
      const patientId = Number(bedRow.patient_id);
      const noteRow = Number.isSafeInteger(patientId) ? notesByPatientId.get(patientId) : null;
      const hasNotes = Boolean(noteRow);
      const noteId = resolveNoteId(noteRow);
      const createdAt = resolveCreatedAt(noteRow);
      return {
        ...bedRow,
        id: noteId,
        note_id: noteId,
        has_notes: hasNotes,
        notes_status: hasNotes ? 'done' : 'not_done',
        created_at: createdAt,
        patient_name: bedRow.patient_name || noteRow?.patient_name || '',
        ward_name: bedRow.ward_name || noteRow?.ward_name || '',
        bed_number: bedRow.bed_number || noteRow?.bed_number || '',
      };
    });

    const term = String(debouncedSearch ?? '').trim();
    const searched = term ? filterNursePatientRegistryItems(merged, term) : merged;

    if (!ward) return searched;
    const wardKey = ward.toLowerCase();
    return searched.filter(
      (row) => String(row.ward_name || '').trim().toLowerCase() === wardKey,
    );
  }, [bedQuery.data?.items, notesByPatientId, debouncedSearch, ward]);

  const pageCount = Math.max(1, Math.ceil(allRows.length / PAGE_SIZE) || 1);
  const safePage = Math.min(page, pageCount);
  const rows = useMemo(
    () => allRows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [allRows, safePage],
  );

  const isLoading = bedQuery.isLoading || notesQuery.isLoading;
  const isFetching = bedQuery.isFetching || notesQuery.isFetching;
  const isError = bedQuery.isError || notesQuery.isError;
  const error = bedQuery.error ?? notesQuery.error;
  const dataReady = Boolean(bedQuery.data);

  const refetchBeds = bedQuery.refetch;
  const refetchNotes = notesQuery.refetch;
  const refetch = useCallback(() => {
    refetchBeds();
    refetchNotes();
  }, [refetchBeds, refetchNotes]);

  useNursePagedListGuard({
    isLoading,
    page: safePage,
    items: rows,
    onPageChange: setPage,
  });

  const hasFilters = Boolean(search.trim() || ward);
  const doneCount = useMemo(
    () => allRows.filter((row) => row.has_notes).length,
    [allRows],
  );

  const viewNote = useCallback((row) => {
    if (row.has_notes && row.id != null) {
      navigate(`/nurse/notes/${row.id}`);
      return;
    }
    const url = buildNurseNotesUrl(row);
    if (url) {
      navigate(url);
      return;
    }
    toast.error('Unable to open notes for this patient.');
  }, [navigate]);

  const updateNote = useCallback((row) => {
    if (row.id == null) {
      toast.error('No note found to update.');
      return;
    }
    navigate(`/nurse/notes/${row.id}/edit`);
  }, [navigate]);

  const createNote = useCallback((row) => {
    const url = buildNurseNotesUrl(row);
    if (!url) {
      toast.error('Unable to create a note for this patient.');
      return;
    }
    navigate(url);
  }, [navigate]);

  const columns = useMemo(() => [
    {
      header: 'Patient ID',
      render: (row) => <span className="nurse-notes-registry__id">{formatPatientIdDisplay(row)}</span>,
    },
    {
      header: 'Patient Name',
      render: (row) => (
        <span className="nurse-patient-name-with-tags">
          <span className="nurse-notes-registry__name">{row.patient_name || '—'}</span>
          <NursePatientAllocationTags patientId={row.patient_id} />
        </span>
      ),
    },
    {
      header: 'Ward',
      render: (row) => <span>{row.ward_name || '—'}</span>,
    },
    {
      header: 'Bed Number',
      render: (row) => <span className="nurse-notes-registry__bed">{row.bed_number || '—'}</span>,
    },
    {
      header: 'Status',
      render: (row) => <NotesStatusBadge done={Boolean(row.has_notes)} />,
    },
    {
      header: 'Recorded At',
      render: (row) => (
        <span className="nurse-notes-registry__time">
          {row.created_at ? new Date(row.created_at).toLocaleString() : '—'}
        </span>
      ),
    },
    {
      header: 'Actions',
      render: (row) => (
        <div className="nurse-table__actions" onClick={(e) => e.stopPropagation()}>
          {row.has_notes ? (
            <NursePermissionButton
              allowed={canUpdateNotes}
              className="nurse-btn nurse-btn--primary nurse-btn--sm"
              onClick={() => updateNote(row)}
            >
              Update
            </NursePermissionButton>
          ) : (
            <NursePermissionButton
              allowed={canCreateNotes}
              className="nurse-btn nurse-btn--primary nurse-btn--sm"
              onClick={() => createNote(row)}
            >
              Record
            </NursePermissionButton>
          )}
        </div>
      ),
    },
  ], [updateNote, createNote, canUpdateNotes, canCreateNotes]);

  const emptyMessage = allocatedOnly && !(allocationSummary?.has_allocations)
    ? 'No beds assigned for this shift.'
    : hasFilters
      ? 'No patients match your filters.'
      : allocatedOnly
        ? 'No occupied patients on your assigned beds.'
        : 'No admitted patients with an assigned bed.';

  return (
    <NurseLayout>
      <div className="nurse-page nurse-notes-registry">
        {!canViewNotes ? (
          <div className="nurse-alert nurse-alert--error">You do not have permission to view notes.</div>
        ) : (
          <>
            <div className="nurse-notes-registry__toolbar nurse-card">
              <div className="nurse-notes-registry__toolbar-left">
                <div className="nurse-notes-registry__icon" aria-hidden>
                  <FileText size={22} />
                </div>
                <div>
                  <p className="nurse-notes-registry__count">
                    {isLoading && !dataReady ? '…' : (
                      <>
                        {allRows.length}
                      </>
                    )}
                    {' '}
                    {allRows.length === 1 ? 'patient' : 'patients'}
                    {!isLoading && dataReady && allRows.length > 0 ? (
                      <>
                        {' · '}
                        <span>{doneCount} done</span>
                        {' · '}
                        <span>{allRows.length - doneCount} not done</span>
                      </>
                    ) : null}
                  </p>
                  <p className="nurse-notes-registry__hint">
                    All admitted patients. Status shows whether a nursing note is recorded.
                  </p>
                </div>
              </div>

              <div className="nurse-med-patients__toolbar-filters">
                <div
                  className={`nurse-notes-registry__search-wrap nurse-med-patients__search-wrap${
                    search ? ' nurse-med-patients__search-wrap--has-clear' : ''
                  }`}
                >
                  <input
                    type="text"
                    className="nurse-input nurse-notes-registry__search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by name, patient ID, or bed number…"
                    aria-label="Search nursing notes"
                  />
                  {search ? (
                    <button
                      type="button"
                      className="nurse-med-patients__search-clear"
                      onClick={() => setSearch('')}
                      aria-label="Clear search"
                    >
                      <X size={14} aria-hidden />
                    </button>
                  ) : null}
                </div>

                <select
                  className="nurse-select nurse-notes-registry__ward-select"
                  value={ward}
                  onChange={(e) => setWard(e.target.value)}
                  aria-label="Filter by ward"
                >
                  <option value="">All wards</option>
                  {WARD_OPTIONS.map((w) => (
                    <option key={w} value={w}>{w}</option>
                  ))}
                </select>

                {hasFilters ? (
                  <button
                    type="button"
                    className="nurse-btn nurse-btn--secondary nurse-btn--sm"
                    onClick={() => {
                      setSearch('');
                      setWard('');
                    }}
                  >
                    Clear
                  </button>
                ) : null}
              </div>
            </div>

            <QueryFeedback
              isLoading={(!scopeReady || isLoading) && !dataReady}
              isError={isError}
              error={error}
              onRetry={refetch}
            >
              <div
                className={`nurse-notes-registry__table${
                  isFetching ? ' nurse-notes-registry__table--fetching' : ''
                }`}
              >
                <NurseDataTable
                  columns={columns}
                  data={rows}
                  isLoading={false}
                  emptyMessage={emptyMessage}
                  onRowClick={viewNote}
                />
              </div>

              <NursePagination
                page={safePage}
                pageSize={PAGE_SIZE}
                total={allRows.length}
                hasNextPage={safePage < pageCount}
                itemCount={rows.length}
                onChange={setPage}
              />
            </QueryFeedback>
          </>
        )}
      </div>
    </NurseLayout>
  );
}
