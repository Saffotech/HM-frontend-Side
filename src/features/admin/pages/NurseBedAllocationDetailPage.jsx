import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  BedDouble,
  CalendarDays,
  Mail,
  Pencil,
  UserRound,
  Users,
} from 'lucide-react';
import AdminLayout from '@/features/admin/components/AdminLayout';
import AdminBackBar from '@/features/admin/components/AdminBackBar';
import AdminAllocationStatusBadge from '@/features/admin/components/AdminAllocationStatusBadge';
import { useAdminBedAllocationPermissions } from '@/features/admin/hooks/useAdminBedAllocationPermissions';
import {
  useAdminBedAllocationDetailQuery,
  useAdminBedAllocationsQuery,
} from '@/shared/hooks/queries/useAdminQuery';
import { Button, QueryFeedback } from '@/shared/components/common';
import { ROUTES } from '@/shared/constants';
import {
  formatAllocationDateTime,
  groupAllocationListItems,
} from '@/shared/api/mappers/adminBedAllocationMapper';
import '@/features/admin/styles/nurseBedAllocation.css';

export default function NurseBedAllocationDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { canView, canUpdate } = useAdminBedAllocationPermissions();

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useAdminBedAllocationDetailQuery(id, { enabled: canView && Boolean(id) });
  const primary = data?.data;

  const siblingFilters = useMemo(() => {
    if (!primary?.nurseId) return null;
    return {
      nurse_id: Number(primary.nurseId),
      is_active: primary.isActive,
      page: 1,
      page_size: 100,
    };
  }, [primary?.nurseId, primary?.isActive]);

  const {
    data: siblingsData,
    isLoading: siblingsLoading,
    isError: siblingsError,
    error: siblingsErr,
    refetch: refetchSiblings,
  } = useAdminBedAllocationsQuery(siblingFilters ?? {}, {
    enabled: canView && Boolean(siblingFilters),
  });

  const siblingRows = useMemo(() => {
    if (!primary) return [];
    const siblings = siblingsData?.items ?? [];
    const sameNurse = siblings.filter(
      (row) =>
        Number(row.nurseId) === Number(primary.nurseId) &&
        Boolean(row.isActive) === Boolean(primary.isActive),
    );
    const pool = sameNurse.length ? sameNurse : [primary];
    return pool
      .slice()
      .sort((a, b) => {
        const wardCmp = String(a.wardName ?? '').localeCompare(String(b.wardName ?? ''));
        if (wardCmp !== 0) return wardCmp;
        return String(a.bedNumber ?? '').localeCompare(String(b.bedNumber ?? ''), undefined, {
          numeric: true,
        });
      });
  }, [primary, siblingsData?.items]);

  const group = useMemo(() => {
    if (!primary) return null;
    const grouped = groupAllocationListItems(siblingRows.length ? siblingRows : [primary]);
    return grouped[0] ?? {
      ...primary,
      idLabel: String(primary.id),
      allocationIds: [primary.id],
      allocatedBedsLabel: primary.allocatedBedsLabel,
      totalBeds: 1,
    };
  }, [primary, siblingRows]);

  const loading = isLoading || (Boolean(primary) && siblingsLoading);
  const pageError = isError ? error : siblingsError ? siblingsErr : null;
  const retry = () => {
    refetch();
    refetchSiblings();
  };

  if (!canView) {
    return (
      <AdminLayout pageTitle="Allocation Details">
        <div className="admin-card nba-denied">
          <h2>Access denied</h2>
          <p className="nba-muted">You do not have permission to view bed allocations.</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout pageTitle="Allocation Details">
      <div className="admin-page nba-page nba-detail-page">
        <AdminBackBar
          onBack={() => navigate(ROUTES.ADMIN_BED_ALLOCATION)}
          label="Back to allocations"
        />

        <QueryFeedback
          isLoading={loading}
          isError={Boolean(pageError)}
          error={pageError}
          onRetry={retry}
        >
          {!group ? (
            <div className="admin-card nba-denied">
              <h2>Allocation not found</h2>
            </div>
          ) : (
            <>
              <section className="nba-detail-hero">
                <div className="nba-detail-hero__main">
                  <div className="nba-detail-hero__topline">
                    <span className="nba-detail-hero__id">
                      Allocation #{group.idLabel ?? group.id}
                    </span>
                    <AdminAllocationStatusBadge isActive={group.isActive} />
                  </div>
                  <h1 className="nba-detail-hero__title">{group.nurseName}</h1>
                  <p className="nba-detail-hero__subtitle">
                    Bed responsibility for this period — patients are not owned by the nurse.
                  </p>
                  <div className="nba-detail-hero__meta">
                    <span className="nba-detail-pill">
                      <CalendarDays size={14} aria-hidden />
                      {group.shiftDate || '—'}
                    </span>
                    <span className="nba-detail-pill">
                      <Mail size={14} aria-hidden />
                      {group.nurseEmail || 'No email'}
                    </span>
                  </div>
                </div>

                <div className="nba-detail-hero__side">
                  <div className="nba-detail-stat">
                    <span className="nba-detail-stat__label">Total beds</span>
                    <strong className="nba-detail-stat__value">{group.totalBeds}</strong>
                    <span className="nba-detail-stat__hint">{group.allocatedBedsLabel}</span>
                  </div>
                  {canUpdate ? (
                    <Button
                      className="nba-detail-hero__edit"
                      onClick={() =>
                        navigate(
                          ROUTES.ADMIN_BED_ALLOCATION_EDIT.replace(':id', String(group.id)),
                        )
                      }
                    >
                      <Pencil size={16} aria-hidden />
                      Edit allocation
                    </Button>
                  ) : null}
                </div>
              </section>

              <div className="nba-detail-layout">
                <section className="nba-detail-panel">
                  <header className="nba-detail-panel__header">
                    <BedDouble size={18} aria-hidden />
                    <div>
                      <h2>Allocated beds</h2>
                      <p>{siblingRows.length} bed{siblingRows.length === 1 ? '' : 's'} on this assignment</p>
                    </div>
                  </header>
                  <div className="nba-detail-beds">
                    {siblingRows.map((bed) => (
                      <article key={bed.id} className="nba-detail-bed-card">
                        <div className="nba-detail-bed-card__top">
                          <strong>{bed.bedNumber || '—'}</strong>
                          <span className="nba-detail-bed-card__id">#{bed.id}</span>
                        </div>
                        <p className="nba-detail-bed-card__ward">{bed.wardName || '—'}</p>
                      </article>
                    ))}
                  </div>
                </section>

                <section className="nba-detail-panel">
                  <header className="nba-detail-panel__header">
                    <UserRound size={18} aria-hidden />
                    <div>
                      <h2>Assignment details</h2>
                      <p>Who is responsible and when it was set</p>
                    </div>
                  </header>
                  <dl className="nba-detail-facts">
                    <div className="nba-detail-fact">
                      <dt>Nurse</dt>
                      <dd>{group.nurseName}</dd>
                    </div>
                    <div className="nba-detail-fact">
                      <dt>Email</dt>
                      <dd>{group.nurseEmail || '—'}</dd>
                    </div>
                    <div className="nba-detail-fact">
                      <dt>Date</dt>
                      <dd>{group.shiftDate || '—'}</dd>
                    </div>
                    <div className="nba-detail-fact">
                      <dt>Status</dt>
                      <dd>
                        <AdminAllocationStatusBadge isActive={group.isActive} />
                      </dd>
                    </div>
                    <div className="nba-detail-fact">
                      <dt>
                        <Users size={13} aria-hidden /> Assigned by
                      </dt>
                      <dd>{group.assignedByName || '—'}</dd>
                    </div>
                    <div className="nba-detail-fact">
                      <dt>Created</dt>
                      <dd>{formatAllocationDateTime(group.createdAt)}</dd>
                    </div>
                    <div className="nba-detail-fact">
                      <dt>Updated</dt>
                      <dd>{formatAllocationDateTime(group.updatedAt)}</dd>
                    </div>
                  </dl>
                  {group.notes ? (
                    <div className="nba-detail-notes">
                      <h3>Notes</h3>
                      <p>{group.notes}</p>
                    </div>
                  ) : null}
                </section>
              </div>
            </>
          )}
        </QueryFeedback>
      </div>
    </AdminLayout>
  );
}
