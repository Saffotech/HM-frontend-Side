import { useState, useMemo, useCallback } from 'react';

import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';

import { useNavigate } from 'react-router-dom';

import { ListOrdered, RefreshCw, Search } from 'lucide-react';

import NurseLayout from '@/features/nurse/components/NurseLayout';

import NurseDataTable from '@/features/nurse/components/NurseDataTable';

import NursePagination from '@/features/nurse/components/NursePagination';

import NursePriorityBadge from '@/features/nurse/components/NursePriorityBadge';

import NurseQueueStatusBadge from '@/features/nurse/components/NurseQueueStatusBadge';

import { useNursePermissionSet } from '@/features/nurse/hooks/useNursePermission';

import { QueryFeedback } from '@/shared/components/common';

import { formatPatientIdDisplay } from '@/shared/api/mappers/nurseMapper';

import { useNurseQueueQuery } from '@/shared/hooks/queries/useNurseQuery';



export default function NurseQueuePage() {

  const navigate = useNavigate();

  const { canViewPatients, canCreateVitals, canCreateNotes } = useNursePermissionSet();

  const [search, setSearch] = useState('');

  const [page, setPage] = useState(1);

  const debouncedSearch = useDebouncedValue(search, 400);



  const { data, isLoading, isError, error, refetch, isFetching } = useNurseQueueQuery({

    search: debouncedSearch,

    page,

    page_size: 20,

  });



  const total = data?.total || 0;

  const emergencyCount = useMemo(

    () => (data?.items || []).filter((row) => row.priority === 'emergency').length,

    [data?.items]

  );



  const handleRowClick = useCallback(

    (row) => {

      if (canViewPatients) {

        navigate(`/nurse/patients/${row.patient_id}`);

      }

    },

    [navigate, canViewPatients],

  );



  const columns = useMemo(() => [

    {

      header: 'Patient ID',

      render: (row) => <span className="nurse-queue__id">{formatPatientIdDisplay(row)}</span>,

    },

    {

      header: 'Patient Name',

      render: (row) => <span className="nurse-queue__name">{row.patient_name}</span>,

    },

    {

      header: 'Bed Number',

      render: (row) => <span className="nurse-queue__bed">{row.bed_number || '—'}</span>,

    },

    {

      header: 'Phone',

      render: (row) => <span className="nurse-queue__phone">{row.phone || '—'}</span>,

    },

    {

      header: 'Priority',

      render: (row) => <NursePriorityBadge priority={row.priority} />,

    },

    {

      header: 'Status',

      render: (row) => <NurseQueueStatusBadge status={row.status} />,

    },

    {

      header: 'Actions',

      render: (row) => (

        <div className="nurse-table__actions nurse-queue-page__actions">

          {canCreateVitals && (

            <button

              type="button"

              className="nurse-dashboard-page__action-btn nurse-dashboard-page__action-btn--vitals"

              onClick={(e) => {

                e.stopPropagation();

                navigate(`/nurse/vitals/new?appointmentId=${row.id}`);

              }}

            >

              Vitals

            </button>

          )}

          {canCreateNotes && (

            <button

              type="button"

              className="nurse-dashboard-page__action-btn nurse-dashboard-page__action-btn--note"

              onClick={(e) => {

                e.stopPropagation();

                navigate(`/nurse/notes/new?appointmentId=${row.id}`);

              }}

            >

              Note

            </button>

          )}

        </div>

      ),

    },

  ], [navigate, canCreateVitals, canCreateNotes]);



  const hasActiveFilters = Boolean(search);



  const clearFilters = () => {

    setSearch('');

    setPage(1);

  };



  return (

    <NurseLayout>

      <div className="nurse-page nurse-queue-page">

        <div className="nurse-queue-page__header nurse-card">

          <div className="nurse-queue-page__header-left">

            <div className="nurse-queue-page__icon" aria-hidden>

              <ListOrdered size={20} />

            </div>

            <div>

              <h1 className="nurse-queue-page__title">Today&apos;s Queue</h1>

              <p className="nurse-queue-page__subtitle">

                {isLoading ? 'Loading queue…' : (

                  <>

                    <strong>{total}</strong>

                    {' '}

                    {total === 1 ? 'patient' : 'patients'}

                    {emergencyCount > 0 && (

                      <span className="nurse-queue-page__emergency-tag">

                        · {emergencyCount} emergency

                      </span>

                    )}

                  </>

                )}

              </p>

            </div>

          </div>

          <button

            type="button"

            className="nurse-btn nurse-btn--secondary nurse-queue-page__refresh"

            onClick={() => refetch()}

            disabled={isFetching}

          >

            <RefreshCw size={15} className={isFetching ? 'nurse-queue-page__spin' : ''} />

            Refresh

          </button>

        </div>



        <div className="nurse-card nurse-queue-page__toolbar">

          <label htmlFor="nurse-queue-search" className="nurse-queue-page__search-label">

            Search patients

          </label>

          <div className="nurse-queue-page__toolbar-row">

            <div className="nurse-queue-page__search-wrap">

              <Search size={16} className="nurse-queue-page__search-icon" aria-hidden />

              <input

                id="nurse-queue-search"

                type="search"

                className="nurse-input nurse-queue-page__search"

                value={search}

                onChange={(e) => { setSearch(e.target.value); setPage(1); }}

                placeholder="Name, phone, patient ID, or token…"

                aria-label="Search patients in queue"

              />

            </div>

            {hasActiveFilters && (

              <button type="button" className="nurse-queue-page__clear" onClick={clearFilters}>

                Clear

              </button>

            )}

          </div>

        </div>



        <QueryFeedback

          isLoading={isLoading}

          isError={isError}

          error={error}

          onRetry={refetch}

        >

          <div className="nurse-queue-page__table">

            <NurseDataTable

              columns={columns}

              data={data?.items || []}

              isLoading={false}

              emptyMessage="No patients match the filters."

              onRowClick={canViewPatients ? handleRowClick : undefined}

            />

          </div>



          <NursePagination

            page={page}

            pageSize={20}

            total={data?.total}

            itemCount={data?.items?.length ?? 0}

            onChange={setPage}

          />

        </QueryFeedback>

      </div>

    </NurseLayout>

  );

}

