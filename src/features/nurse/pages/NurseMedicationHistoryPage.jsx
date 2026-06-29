import { useState, useMemo, useEffect } from 'react';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';
import NurseLayout from '@/features/nurse/components/NurseLayout';
import NursePageHeader from '@/features/nurse/components/NursePageHeader';
import NurseDataTable from '@/features/nurse/components/NurseDataTable';
import NursePagination from '@/features/nurse/components/NursePagination';
import NurseQueueStatusBadge from '@/features/nurse/components/NurseQueueStatusBadge';
import { useNursePagedListGuard } from '@/features/nurse/hooks/useNursePagedListGuard';
import { QueryFeedback } from '@/shared/components/common';
import { formatPatientIdDisplay } from '@/shared/api/mappers/nurseMapper';
import { useNurseMedicationHistoryQuery } from '@/shared/hooks/queries/useNurseQuery';

export default function NurseMedicationHistoryPage() {
  const [page, setPage] = useState(1);
  const [searchName, setSearchName] = useState('');
  const [searchUid, setSearchUid] = useState('');
  const [searchBed, setSearchBed] = useState('');
  const [status, setStatus] = useState('');
  const debouncedName = useDebouncedValue(searchName, 400);
  const debouncedUid = useDebouncedValue(searchUid, 400);
  const debouncedBed = useDebouncedValue(searchBed, 400);

  const { data, isLoading, isError, error, refetch } = useNurseMedicationHistoryQuery({
    patient_name: debouncedName,
    patient_uid: debouncedUid,
    bed_number: debouncedBed,
    status,
    page,
    page_size: 20,
  });

  useEffect(() => {
    setPage(1);
  }, [debouncedName, debouncedUid, debouncedBed, status]);

  useNursePagedListGuard({
    isLoading,
    page,
    items: data?.items,
    onPageChange: setPage,
  });

  const columns = useMemo(() => [
    { header: 'Patient Name', accessor: 'patient_name' },
    { header: 'Patient ID', render: (row) => formatPatientIdDisplay(row) },
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
        <NursePageHeader title="Global Medication History" />
        <div className="nurse-card nurse-card--padded nurse-filters">
          <div className="nurse-field">
            <label htmlFor="med-history-name">Patient Name</label>
            <input
              id="med-history-name"
              type="text"
              className="nurse-input"
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              placeholder="Search by name…"
            />
          </div>
          <div className="nurse-field">
            <label htmlFor="med-history-uid">Patient ID</label>
            <input
              id="med-history-uid"
              type="text"
              className="nurse-input"
              value={searchUid}
              onChange={(e) => setSearchUid(e.target.value)}
              placeholder="Search by patient ID (e.g. P-1014)…"
            />
          </div>
          <div className="nurse-field">
            <label htmlFor="med-history-bed">Bed Number</label>
            <input
              id="med-history-bed"
              type="text"
              className="nurse-input"
              value={searchBed}
              onChange={(e) => setSearchBed(e.target.value)}
              placeholder="Search by bed…"
            />
          </div>
          <div className="nurse-field">
            <label htmlFor="med-history-status">Status</label>
            <select
              id="med-history-status"
              className="nurse-select"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="">All</option>
              <option value="given">Given</option>
              <option value="refused">Refused</option>
              <option value="missed">Missed</option>
              <option value="delayed">Delayed</option>
            </select>
          </div>
        </div>
        <QueryFeedback isLoading={isLoading} isError={isError} error={error} onRetry={refetch}>
        <NurseDataTable columns={columns} data={data?.items || []} isLoading={false} emptyMessage="No medication history found." />
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
