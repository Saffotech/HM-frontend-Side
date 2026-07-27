import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, Pencil, Plus, RotateCcw, UserX } from 'lucide-react';
import AdminLayout from '@/features/admin/components/AdminLayout';
import AdminEmptyState from '@/features/admin/components/AdminEmptyState';
import AdminAllocationStatusBadge from '@/features/admin/components/AdminAllocationStatusBadge';
import { useAdminBedAllocationPermissions } from '@/features/admin/hooks/useAdminBedAllocationPermissions';
import {
  useAdminBedAllocationsQuery,
  useAdminRolesQuery,
  useAdminStaffListQuery,
  useDeactivateBedAllocationMutation,
} from '@/shared/hooks/queries/useAdminQuery';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';
import {
  Button,
  ConfirmDialog,
  Modal,
  QueryFeedback,
  SearchBar,
  Select,
  TablePagination,
} from '@/shared/components/common';
import { ROUTES } from '@/shared/constants';
import {
  SHIFT_OPTIONS,
  formatAllocationDate,
  formatAllocationDateTime,
  formatAssignedUntil,
  formatShiftWithTime,
  groupAllocationListItems,
} from '@/shared/api/mappers/adminBedAllocationMapper';
import { toast } from '@/shared/utils/toast';
import '@/features/admin/styles/nurseBedAllocation.css';

const PAGE_SIZE = 100;

export default function NurseBedAllocationListPage() {
  const navigate = useNavigate();
  const { canView, canCreate, canAssign, canUpdate } = useAdminBedAllocationPermissions();
  const canMakeNew = canCreate || canAssign;

  const [search, setSearch] = useState('');
  const [shiftDate, setShiftDate] = useState('');
  const [shiftName, setShiftName] = useState('');
  const [nurseId, setNurseId] = useState('');
  const [statusFilter, setStatusFilter] = useState('true');
  const [page, setPage] = useState(1);
  const [deactivateIds, setDeactivateIds] = useState(null);
  const [bedsPreview, setBedsPreview] = useState(null);

  const debouncedSearch = useDebouncedValue(search.trim(), 300);

  const { data: roles = [] } = useAdminRolesQuery({ enabled: canView });
  const nurseRoleId = useMemo(
    () => roles.find((r) => r.name === 'nurse')?.id,
    [roles],
  );

  const { data: staffData } = useAdminStaffListQuery(
    { role_id: nurseRoleId, is_active: true, page: 1, limit: 100 },
    { enabled: canView && Boolean(nurseRoleId) },
  );
  const nurses = useMemo(() => {
    const items = staffData?.staff ?? staffData?.items ?? [];
    return Array.isArray(items) ? items : [];
  }, [staffData]);

  const filters = useMemo(
    () => ({
      search: debouncedSearch || undefined,
      shift_date: shiftDate || undefined,
      shift_name: shiftName || undefined,
      nurse_id: nurseId ? Number(nurseId) : undefined,
      is_active: statusFilter === 'all' ? undefined : statusFilter === 'true',
      page,
      page_size: PAGE_SIZE,
    }),
    [debouncedSearch, shiftDate, shiftName, nurseId, statusFilter, page],
  );

  const { data, isLoading, isError, error, refetch } = useAdminBedAllocationsQuery(
    filters,
    { enabled: canView },
  );

  const deactivateMut = useDeactivateBedAllocationMutation();

  const items = useMemo(
    () => groupAllocationListItems(data?.items ?? []),
    [data?.items],
  );
  const total = items.length;

  const hasFilters = Boolean(
    search.trim() ||
      shiftDate ||
      shiftName ||
      nurseId ||
      statusFilter !== 'true',
  );

  const resetFilters = () => {
    setSearch('');
    setShiftDate('');
    setShiftName('');
    setNurseId('');
    setStatusFilter('true');
    setPage(1);
  };

  const confirmDeactivate = async () => {
    if (!deactivateIds?.length) return;
    const ids = [...deactivateIds];
    let ok = 0;
    let failed = 0;
    for (const id of ids) {
      try {
        await deactivateMut.mutateAsync(id);
        ok += 1;
      } catch {
        failed += 1;
      }
    }
    setDeactivateIds(null);
    if (ok) toast.success(ok === 1 ? 'Allocation deactivated' : `${ok} allocations deactivated`);
    if (failed) toast.error(`${failed} failed to deactivate`);
    refetch();
  };

  if (!canView) {
    return (
      <AdminLayout pageTitle="Nurse Bed Allocation">
        <div className="admin-card nba-denied">
          <h2>Access denied</h2>
          <p className="nba-muted">You do not have permission to view bed allocations.</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout pageTitle="Nurse Bed Allocation">
      <div className="admin-page nba-page">
        <div className="nba-header-actions nba-list-actions">
          <div className="nba-list-heading">
            <h1 className="nba-list-heading__title">Bed allocations</h1>
            <p className="nba-list-heading__subtitle">
              Beds stay assigned until admin changes them. Filter by date if needed (default: all).
            </p>
          </div>
          <div className="nba-list-actions__buttons">
            {canMakeNew ? (
              <Button onClick={() => navigate(ROUTES.ADMIN_BED_ALLOCATION_NEW)}>
                <Plus size={16} aria-hidden />
                New allocation
              </Button>
            ) : null}
          </div>
        </div>

        <div className="admin-card admin-card--flat admin-datatable nba-list-card">
          <div className="admin-datatable__toolbar nba-toolbar">
            <SearchBar
              value={search}
              onChange={(v) => {
                setSearch(v);
                setPage(1);
              }}
              placeholder="Search nurse, bed, ward, allocation ID…"
            />
            <input
              type="date"
              className="nba-input"
              value={shiftDate}
              onChange={(e) => {
                setShiftDate(e.target.value);
                setPage(1);
              }}
              aria-label="Filter by date"
            />
            <Select
              value={shiftName}
              onChange={(v) => {
                setShiftName(v);
                setPage(1);
              }}
              options={[{ value: '', label: 'All shifts' }, ...SHIFT_OPTIONS]}
            />
            <Select
              value={nurseId}
              onChange={(v) => {
                setNurseId(v);
                setPage(1);
              }}
              options={[
                { value: '', label: 'All nurses' },
                ...nurses.map((n) => ({
                  value: String(n.id),
                  label:
                    `${n.first_name || ''} ${n.last_name || ''}`.trim() ||
                    n.email ||
                    `Nurse #${n.id}`,
                })),
              ]}
            />
            <Select
              value={statusFilter}
              onChange={(v) => {
                setStatusFilter(v);
                setPage(1);
              }}
              options={[
                { value: 'true', label: 'Active only' },
                { value: 'false', label: 'Inactive only' },
                { value: 'all', label: 'All statuses' },
              ]}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="nba-toolbar__reset"
              onClick={resetFilters}
              disabled={!hasFilters}
            >
              <RotateCcw size={14} aria-hidden />
              Reset
            </Button>
          </div>

          <QueryFeedback
            isLoading={isLoading}
            isError={isError}
            error={error}
            onRetry={refetch}
          >
            {!isLoading && items.length === 0 ? (
              <AdminEmptyState
                title="No allocations found"
                description={
                  hasFilters
                    ? 'Try adjusting filters or create a new assignment.'
                    : 'Assign beds to a nurse. They stay assigned until you change them.'
                }
              />
            ) : (
              <>
                <div className="admin-datatable__summary">
                  Showing <strong>{items.length}</strong> of <strong>{total}</strong>
                  {hasFilters ? ' (filtered)' : ''}
                </div>
                <div className="nba-table-wrap">
                  <table className="nba-table">
                    <thead>
                      <tr>
                        <th>Nurse</th>
                        <th>Shift</th>
                        <th>Assigned From</th>
                        <th>Assigned Until</th>
                        <th>Allocated Beds</th>
                        <th>Total Beds</th>
                        <th>Status</th>
                        <th>Assigned By</th>
                        <th>Created</th>
                        <th className="nba-th-actions">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((row) => (
                        <tr key={`${row.nurseId}-${row.isActive ? 'a' : 'i'}-${row.id}`}>
                          <td>{row.nurseName}</td>
                          <td>
                            {formatShiftWithTime(row.shiftName, row.shiftStart, row.shiftEnd)}
                          </td>
                          <td>{formatAllocationDate(row.shiftDate)}</td>
                          <td>{formatAssignedUntil(row.assignedUntil, row.isActive)}</td>
                          <td>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                setBedsPreview({
                                  nurseName: row.nurseName,
                                  beds: row.beds?.length
                                    ? row.beds
                                    : [
                                        {
                                          id: row.id,
                                          bedId: row.bedId,
                                          bedNumber: row.bedNumber,
                                          wardName: row.wardName,
                                        },
                                      ],
                                })
                              }
                            >
                              <Eye size={14} aria-hidden />
                              View beds
                            </Button>
                          </td>
                          <td>{row.totalBeds}</td>
                          <td>
                            <AdminAllocationStatusBadge isActive={row.isActive} />
                          </td>
                          <td>{row.assignedByName}</td>
                          <td>{formatAllocationDateTime(row.createdAt)}</td>
                          <td className="nba-td-actions">
                            <div className="nba-table__actions">
                              <Button
                                type="button"
                                size="sm"
                                variant="primary"
                                onClick={() =>
                                  navigate(
                                    ROUTES.ADMIN_BED_ALLOCATION_DETAIL.replace(
                                      ':id',
                                      String(row.id),
                                    ),
                                  )
                                }
                              >
                                <Eye size={14} aria-hidden />
                                View
                              </Button>
                              {canUpdate && (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="warning"
                                  onClick={() =>
                                    navigate(
                                      ROUTES.ADMIN_BED_ALLOCATION_EDIT.replace(
                                        ':id',
                                        String(row.id),
                                      ),
                                    )
                                  }
                                >
                                  <Pencil size={14} aria-hidden />
                                  Edit
                                </Button>
                              )}
                              {canUpdate && row.isActive && (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="danger"
                                  onClick={() =>
                                    setDeactivateIds(row.allocationIds?.length
                                      ? row.allocationIds
                                      : [row.id])
                                  }
                                >
                                  <UserX size={14} aria-hidden />
                                  Deactivate
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <TablePagination
                  page={page}
                  pageSize={PAGE_SIZE}
                  totalPages={Math.max(1, Math.ceil(total / PAGE_SIZE))}
                  totalItems={total}
                  onPageChange={setPage}
                  itemLabel="allocations"
                />
              </>
            )}
          </QueryFeedback>
        </div>
      </div>

      <Modal
        isOpen={bedsPreview != null}
        onClose={() => setBedsPreview(null)}
        title={
          bedsPreview?.nurseName
            ? `Allocated beds — ${bedsPreview.nurseName}`
            : 'Allocated beds'
        }
        size="md"
        footer={
          <Button type="button" variant="outline" onClick={() => setBedsPreview(null)}>
            Close
          </Button>
        }
      >
        {bedsPreview?.beds?.length ? (
          <div className="nba-beds-preview">
            <p className="nba-muted nba-beds-preview__count">
              {bedsPreview.beds.length} bed{bedsPreview.beds.length === 1 ? '' : 's'}
            </p>
            <div className="nba-table-wrap">
              <table className="nba-table nba-table--compact">
                <thead>
                  <tr>
                    <th>Ward</th>
                    <th>Bed</th>
                  </tr>
                </thead>
                <tbody>
                  {bedsPreview.beds.map((bed) => (
                    <tr key={bed.id ?? `${bed.wardName}-${bed.bedNumber}`}>
                      <td>{bed.wardName || '—'}</td>
                      <td>{bed.bedNumber || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <p className="nba-muted">No beds in this allocation.</p>
        )}
      </Modal>

      <ConfirmDialog
        isOpen={deactivateIds != null}
        title="Deactivate allocation?"
        message={
          deactivateIds?.length > 1
            ? `This will deactivate ${deactivateIds.length} bed assignments for this nurse shift. You can create new assignments later.`
            : 'This bed will no longer be assigned to the nurse for this shift. You can create a new assignment later.'
        }
        confirmLabel="Deactivate"
        onConfirm={confirmDeactivate}
        onCancel={() => setDeactivateIds(null)}
      />
    </AdminLayout>
  );
}
