import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { BedDouble, UserPlus, Building2, CheckCircle2, UserRound } from 'lucide-react';
import { useBedsQuery, useReleaseBedMutation } from '@/shared/hooks/queries/useBedsQuery';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';
import {
  Button,
  Input,
  StatusBadge,
  QueryFeedback,
  EmptyState,
  ConfirmDialog,
} from '@/shared/components/common';
import { toast } from '@/shared/utils/toast';
import AssignBedModal from '@/features/opd/beds/components/AssignBedModal';
import { WARDS } from '@/shared/constants';
import './BedOverviewPage.css';

const STATUS_FILTERS = [
  { id: 'All', label: 'All Status' },
  { id: 'Available', label: 'Available' },
  { id: 'Occupied', label: 'Occupied' },
];

function applyStatusFilter(list, statusFilter) {
  if (statusFilter === 'Available') return list.filter((b) => b.status === 'Available');
  if (statusFilter === 'Occupied') return list.filter((b) => b.status === 'Occupied');
  return list;
}

export default function BedOverviewPage() {
  const navigate = useNavigate();
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignDefaultBed, setAssignDefaultBed] = useState(null);
  const [wardFilter, setWardFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebouncedValue(searchTerm.trim(), 300);

  const { data: allBedData } = useBedsQuery();
  const { data: bedData, isLoading, isError, error } = useBedsQuery({
    ward: wardFilter,
    status: statusFilter,
    search: debouncedSearch || undefined,
  });
  const beds = bedData?.beds ?? [];
  const allBeds = allBedData?.beds ?? [];

  const openAssignModal = (bed = null) => {
    setAssignDefaultBed(bed ? { ward: bed.ward, bedNo: bed.bedNo } : null);
    setAssignOpen(true);
  };

  const closeAssignModal = () => {
    setAssignOpen(false);
    setAssignDefaultBed(null);
  };

  const releaseBed = useReleaseBedMutation();
  const [releaseTarget, setReleaseTarget] = useState(null);

  const occupied = allBeds.filter((b) => b.status === 'Occupied').length;
  const available = allBeds.length - occupied;

  const wardCounts = useMemo(() => {
    const scoped = applyStatusFilter(allBeds, statusFilter);
    const counts = { All: scoped.length };
    WARDS.forEach((w) => {
      counts[w] = scoped.filter((b) => b.ward === w).length;
    });
    return counts;
  }, [allBeds, statusFilter]);

  const statusCounts = useMemo(() => {
    const byWard = wardFilter === 'All' ? allBeds : allBeds.filter((b) => b.ward === wardFilter);
    return {
      All: byWard.length,
      Available: byWard.filter((b) => b.status === 'Available').length,
      Occupied: byWard.filter((b) => b.status === 'Occupied').length,
    };
  }, [allBeds, wardFilter]);

  const handleReleaseConfirm = () => {
    if (!releaseTarget?.dbId) return;
    releaseBed.mutate(releaseTarget.dbId, {
      onSuccess: () => {
        toast.success(`Bed ${releaseTarget.bedNo} released`);
        setReleaseTarget(null);
      },
    });
  };

  return (
    <QueryFeedback isLoading={isLoading} isError={isError} error={error}>
      <div className="page-stack beds-page">
        <h1 className="beds-page__sr-title">Bed Management</h1>

        <div className="bed-stats">
          <button
            type="button"
            className="bed-stat-card bed-stat-card--assign"
            onClick={() => openAssignModal()}
            aria-label="Assign bed to a patient"
          >
            <span className="bed-stat-card__icon" aria-hidden>
              <UserPlus size={20} strokeWidth={2.25} />
            </span>
            <div className="bed-stat-card__body">
              <p className="bed-stat-card__label">Assign Bed</p>
              <p className="bed-stat-card__value bed-stat-card__value--assign" aria-hidden>
                +
              </p>
            </div>
          </button>
          <div className="bed-stat-card bed-stat-card--total">
            <span className="bed-stat-card__icon" aria-hidden>
              <Building2 size={20} />
            </span>
            <div className="bed-stat-card__body">
              <p className="bed-stat-card__label">Total Beds</p>
              <p className="bed-stat-card__value">{allBeds.length}</p>
            </div>
          </div>
          <div className="bed-stat-card bed-stat-card--free">
            <span className="bed-stat-card__icon" aria-hidden>
              <CheckCircle2 size={20} />
            </span>
            <div className="bed-stat-card__body">
              <p className="bed-stat-card__label">Available</p>
              <p className="bed-stat-card__value">{available}</p>
            </div>
          </div>
          <div className="bed-stat-card bed-stat-card--occ">
            <span className="bed-stat-card__icon" aria-hidden>
              <UserRound size={20} />
            </span>
            <div className="bed-stat-card__body">
              <p className="bed-stat-card__label">Occupied</p>
              <p className="bed-stat-card__value">{occupied}</p>
            </div>
          </div>
        </div>

        <div className="bed-filters">
          <div className="bed-filters__row bed-filters__row--search" role="search" aria-label="Search by patient">
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search patient name or ID..."
              className="bed-search__field"
            />
          </div>

          <span className="bed-filters__divider" aria-hidden />

          <div className="bed-filters__row" role="group" aria-label="Filter by ward">
            <button
              type="button"
              className={`bed-filter-tab ${wardFilter === 'All' ? 'bed-filter-tab--active' : ''}`}
              onClick={() => setWardFilter('All')}
            >
              All Wards
              <span className="bed-filter-tab__count">{wardCounts.All}</span>
            </button>
            {WARDS.map((w) => (
              <button
                key={w}
                type="button"
                className={`bed-filter-tab ${wardFilter === w ? 'bed-filter-tab--active' : ''}`}
                onClick={() => setWardFilter(w)}
              >
                {w}
                <span className="bed-filter-tab__count">{wardCounts[w]}</span>
              </button>
            ))}
          </div>

          <span className="bed-filters__divider" aria-hidden />

          <div className="bed-filters__row" role="group" aria-label="Filter by status">
            {STATUS_FILTERS.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                className={`bed-filter-tab bed-filter-tab--status ${
                  statusFilter === id ? 'bed-filter-tab--active' : ''
                } ${id === 'Available' ? 'bed-filter-tab--free' : ''} ${
                  id === 'Occupied' ? 'bed-filter-tab--occ' : ''
                }`}
                onClick={() => setStatusFilter(id)}
              >
                {label}
                <span className="bed-filter-tab__count">{statusCounts[id]}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="card beds-page__table-card">
          <div className="beds-table-card__head">
            <h2 className="beds-table-card__title">Bed directory</h2>
            <span className="beds-table-card__meta">
              {beds.length} {beds.length === 1 ? 'bed' : 'beds'}
              {wardFilter !== 'All' ? ` · ${wardFilter}` : ''}
              {statusFilter !== 'All' ? ` · ${statusFilter}` : ''}
            </span>
          </div>

          {beds.length === 0 ? (
            <EmptyState
              icon={BedDouble}
              title="No beds available"
              description="No bed records found"
            />
          ) : beds.length === 0 ? (
            <EmptyState
              icon={BedDouble}
              title="No beds match filters"
              description="Try another ward or status filter"
            />
          ) : (
            <div className="bed-table-wrap table-wrap">
              <table className="data-table beds-table">
                <thead>
                  <tr>
                    <th>Bed No</th>
                    <th>Ward</th>
                    <th>Status</th>
                    <th>Patient</th>
                    <th>Admitted</th>
                    <th className="beds-table__actions-head">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {beds.map((bed) => (
                    <tr
                      key={bed.bedNo}
                      className={bed.status === 'Available' ? 'beds-table__row--free' : 'beds-table__row--occ'}
                      style={bed.status === 'Occupied' && bed.patientId ? { cursor: 'pointer' } : undefined}
                      onClick={() => {
                        if (bed.status === 'Occupied' && bed.patientId) {
                          navigate(`/patients/${bed.patientId}/profile`);
                        }
                      }}
                    >
                      <td>
                        <span className="bed-no-badge">
                          <BedDouble size={14} aria-hidden />
                          {bed.bedNo}
                        </span>
                      </td>
                      <td>
                        <span className="ward-pill">{bed.ward}</span>
                      </td>
                      <td>
                        <StatusBadge status={bed.status} />
                      </td>
                      <td>
                        {bed.patientName ? (
                          <>
                            <strong className="beds-table__patient">{bed.patientName}</strong>
                            {bed.patientId && (
                              <div className="text-muted">{bed.patientId}</div>
                            )}
                          </>
                        ) : (
                          <span className="beds-table__empty">—</span>
                        )}
                      </td>
                      <td>{bed.admittedDate || '—'}</td>
                      <td className="actions-cell beds-table__actions">
                        {bed.status === 'Available' ? (
                          <Button size="sm" onClick={() => openAssignModal(bed)}>
                            Assign
                          </Button>
                        ) : (
                          <div className="beds-table__occ-actions" onClick={(e) => e.stopPropagation()}>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setReleaseTarget(bed)}
                              disabled={releaseBed.isPending}
                            >
                              Release
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <AssignBedModal
          open={assignOpen}
          onClose={closeAssignModal}
          defaultBed={assignDefaultBed}
        />

        <ConfirmDialog
          isOpen={Boolean(releaseTarget)}
          message={
            releaseTarget
              ? `Release bed ${releaseTarget.bedNo} in ${releaseTarget.ward}${
                  releaseTarget.patientName ? ` (${releaseTarget.patientName})` : ''
                }?`
              : ''
          }
          onConfirm={handleReleaseConfirm}
          onCancel={() => setReleaseTarget(null)}
        />
      </div>
    </QueryFeedback>
  );
}
