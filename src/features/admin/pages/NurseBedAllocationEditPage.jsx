import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  BedDouble,
  CalendarDays,
  Pencil,
  Save,
  UserRound,
} from 'lucide-react';
import AdminLayout from '@/features/admin/components/AdminLayout';
import AdminBackBar from '@/features/admin/components/AdminBackBar';
import AdminAllocationStatusBadge from '@/features/admin/components/AdminAllocationStatusBadge';
import AdminBedMultiSelect from '@/features/admin/components/AdminBedMultiSelect';
import { useAdminBedAllocationPermissions } from '@/features/admin/hooks/useAdminBedAllocationPermissions';
import {
  useAdminBedAllocationDetailQuery,
  useAdminBedAllocationsQuery,
  useAdminRolesQuery,
  useAdminStaffListQuery,
  useBulkCreateBedAllocationsMutation,
  useDeactivateBedAllocationMutation,
  useUpdateBedAllocationMutation,
} from '@/shared/hooks/queries/useAdminQuery';
import { useBedsQuery } from '@/shared/hooks/queries/useBedsQuery';
import { Button, DateInput, QueryFeedback, Select } from '@/shared/components/common';
import { ROUTES } from '@/shared/constants';
import {
  formatGroupedBedsLabel,
  groupAllocationListItems,
} from '@/shared/api/mappers/adminBedAllocationMapper';
import { toast } from '@/shared/utils/toast';
import '@/features/admin/styles/nurseBedAllocation.css';

export default function NurseBedAllocationEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { canView, canUpdate } = useAdminBedAllocationPermissions();

  const { data, isLoading, isError, error, refetch } = useAdminBedAllocationDetailQuery(
    id,
    { enabled: canView && Boolean(id) },
  );
  const allocation = data?.data;

  const siblingFilters = useMemo(() => {
    if (!allocation?.nurseId) return null;
    return {
      nurse_id: Number(allocation.nurseId),
      is_active: allocation.isActive,
      page: 1,
      page_size: 100,
    };
  }, [
    allocation?.nurseId,
    allocation?.isActive,
  ]);

  const {
    data: siblingsData,
    isLoading: siblingsLoading,
    refetch: refetchSiblings,
  } = useAdminBedAllocationsQuery(siblingFilters ?? {}, {
    enabled: canView && Boolean(siblingFilters),
  });

  const siblingRows = useMemo(() => {
    if (!allocation) return [];
    const siblings = siblingsData?.items ?? [];
    const sameNurse = siblings.filter(
      (row) =>
        Number(row.nurseId) === Number(allocation.nurseId) &&
        Boolean(row.isActive) === Boolean(allocation.isActive),
    );
    return (sameNurse.length ? sameNurse : [allocation])
      .slice()
      .sort((a, b) =>
        String(a.bedNumber ?? '').localeCompare(String(b.bedNumber ?? ''), undefined, {
          numeric: true,
        }),
      );
  }, [allocation, siblingsData?.items]);

  const groupMeta = useMemo(() => {
    if (!siblingRows.length) return null;
    return groupAllocationListItems(siblingRows)[0] ?? null;
  }, [siblingRows]);

  const [shiftDate, setShiftDate] = useState('');
  const [nurseId, setNurseId] = useState('');
  const [bedIds, setBedIds] = useState([]);
  const [notes, setNotes] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [originalByBedId, setOriginalByBedId] = useState({});
  const [hydrated, setHydrated] = useState(false);
  const [bedSearch, setBedSearch] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!allocation || siblingsLoading || hydrated) return;
    // Wait until siblings query has resolved when filters exist
    if (siblingFilters && siblingsData == null) return;

    setShiftDate(allocation.shiftDate || '');
    setNurseId(allocation.nurseId != null ? String(allocation.nurseId) : '');
    setNotes(allocation.notes || '');
    setIsActive(Boolean(allocation.isActive));

    const map = {};
    const ids = [];
    for (const row of siblingRows) {
      const bedId = Number(row.bedId);
      if (!Number.isFinite(bedId)) continue;
      map[bedId] = row.id;
      ids.push(bedId);
    }
    setOriginalByBedId(map);
    setBedIds(ids);
    setHydrated(true);
  }, [
    allocation,
    siblingRows,
    siblingsLoading,
    siblingsData,
    siblingFilters,
    hydrated,
  ]);

  const { data: roles = [] } = useAdminRolesQuery({ enabled: canUpdate });
  const nurseRoleId = useMemo(
    () => roles.find((r) => r.name === 'nurse')?.id,
    [roles],
  );
  const { data: staffData } = useAdminStaffListQuery(
    { role_id: nurseRoleId, is_active: true, page: 1, limit: 100 },
    { enabled: Boolean(nurseRoleId) },
  );
  const nurses = useMemo(() => {
    const items = staffData?.staff ?? staffData?.items ?? [];
    return Array.isArray(items) ? items : [];
  }, [staffData]);

  const { data: bedsData, isLoading: bedsLoading } = useBedsQuery({ search: bedSearch });
  const beds = bedsData?.beds ?? [];

  const { data: activeAllocations } = useAdminBedAllocationsQuery(
    { is_active: true, page: 1, page_size: 100 },
    { enabled: canView },
  );
  const assignedBedIds = useMemo(
    () =>
      (activeAllocations?.items ?? [])
        .map((row) => Number(row.bedId))
        .filter(Number.isFinite),
    [activeAllocations?.items],
  );
  const allowAssignedIds = useMemo(() => {
    const ids = new Set([
      ...Object.keys(originalByBedId).map(Number),
      ...bedIds.map(Number),
    ]);
    return Array.from(ids).filter(Number.isFinite);
  }, [originalByBedId, bedIds]);

  const selectedNurseLabel = useMemo(() => {
    const nurse = nurses.find((n) => String(n.id) === String(nurseId));
    if (!nurse) return allocation?.nurseName || 'Select a nurse';
    return (
      `${nurse.first_name || ''} ${nurse.last_name || ''}`.trim() ||
      nurse.email ||
      `Nurse #${nurse.id}`
    );
  }, [nurses, nurseId, allocation?.nurseName]);

  const selectedBedsLabel = useMemo(() => {
    if (!bedIds.length) return 'No beds selected';
    const selected = beds
      .filter((b) => bedIds.includes(Number(b.dbId ?? b.id)))
      .map((b) => ({
        bedNumber: b.bedNo ?? b.bed_number,
        wardName: b.ward ?? b.ward_name,
      }));
    if (selected.length) return formatGroupedBedsLabel(selected);
    return groupMeta?.allocatedBedsLabel || `${bedIds.length} bed(s)`;
  }, [bedIds, beds, groupMeta?.allocatedBedsLabel]);

  const updateMut = useUpdateBedAllocationMutation();
  const deactivateMut = useDeactivateBedAllocationMutation();
  const bulkMut = useBulkCreateBedAllocationsMutation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canUpdate) {
      toast.error('You do not have permission to update allocations');
      return;
    }
    if (!shiftDate || !nurseId) {
      toast.error('Date and nurse are required');
      return;
    }
    if (!bedIds.length) {
      toast.error('Select at least one bed');
      return;
    }

    setSaving(true);
    const selected = new Set(bedIds.map(Number));
    const originalBedIds = Object.keys(originalByBedId).map(Number);
    const toRemove = originalBedIds.filter((bedId) => !selected.has(bedId));
    const toKeep = originalBedIds.filter((bedId) => selected.has(bedId));
    const toAdd = [...selected].filter((bedId) => !originalByBedId[bedId]);

    try {
      for (const bedId of toKeep) {
        const allocationId = originalByBedId[bedId];
        await updateMut.mutateAsync({
          id: allocationId,
          form: {
            nurseId,
            bedId,
            shiftDate,
            notes,
            isActive,
          },
        });
      }

      for (const bedId of toRemove) {
        const allocationId = originalByBedId[bedId];
        await deactivateMut.mutateAsync(allocationId);
      }

      if (toAdd.length) {
        const res = await bulkMut.mutateAsync({
          nurseId,
          bedIds: toAdd,
          shiftDate,
          notes,
        });
        const skipped = res?.skipped ?? 0;
        if (skipped) {
          const first = res?.errors?.[0];
          toast.error(
            first
              ? `${skipped} bed(s) skipped: ${first}`
              : `${skipped} bed(s) skipped`,
          );
        }
      }

      toast.success(
        bedIds.length === 1
          ? 'Allocation updated'
          : `Updated assignment with ${bedIds.length} beds`,
      );
      navigate(ROUTES.ADMIN_BED_ALLOCATION);
    } catch (err) {
      toast.error(err?.message || 'Failed to update allocation');
    } finally {
      setSaving(false);
    }
  };

  const pageLoading = isLoading || siblingsLoading || !hydrated;

  if (!canView || !canUpdate) {
    return (
      <AdminLayout pageTitle="Edit Bed Allocation">
        <div className="admin-card nba-denied">
          <h2>Access denied</h2>
          <p className="nba-muted">You do not have permission to edit bed allocations.</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout pageTitle="Edit Bed Allocation">
      <div className="admin-page nba-page nba-detail-page nba-edit-page">
        <AdminBackBar
          onBack={() => navigate(ROUTES.ADMIN_BED_ALLOCATION)}
          label="Back to allocations"
        />

        <QueryFeedback
          isLoading={pageLoading}
          isError={isError}
          error={error}
          onRetry={() => {
            refetch();
            refetchSiblings();
          }}
        >
          {!allocation ? (
            <div className="admin-card nba-denied">
              <h2>Allocation not found</h2>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <section className="nba-detail-hero">
                <div className="nba-detail-hero__main">
                  <div className="nba-detail-hero__topline">
                    <span className="nba-detail-hero__id">
                      <Pencil size={12} aria-hidden />
                      Edit allocation #{groupMeta?.idLabel ?? id}
                    </span>
                    <AdminAllocationStatusBadge isActive={isActive} />
                  </div>
                  <h1 className="nba-detail-hero__title">{selectedNurseLabel}</h1>
                  <p className="nba-detail-hero__subtitle">
                    Update nurse, beds, date, notes, or active status for this assignment.
                  </p>
                  <div className="nba-detail-hero__meta">
                    <span className="nba-detail-pill">
                      <CalendarDays size={14} aria-hidden />
                      {shiftDate || '—'}
                    </span>
                    <span className="nba-detail-pill">
                      <BedDouble size={14} aria-hidden />
                      {selectedBedsLabel}
                    </span>
                  </div>
                </div>

                <div className="nba-detail-hero__side">
                  <div className="nba-detail-stat">
                    <span className="nba-detail-stat__label">Total beds</span>
                    <strong className="nba-detail-stat__value">{bedIds.length}</strong>
                    <span className="nba-detail-stat__hint">
                      {isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              </section>

              <div className="nba-detail-layout">
                <section className="nba-detail-panel">
                  <header className="nba-detail-panel__header">
                    <CalendarDays size={18} aria-hidden />
                    <div>
                      <h2>Schedule</h2>
                      <p>Assigned from date for this allocation</p>
                    </div>
                  </header>
                  <div className="nba-edit-grid">
                    <div className="nba-field">
                      <DateInput
                        label="Assigned from"
                        required
                        value={shiftDate}
                        onChange={(e) => setShiftDate(e.target.value)}
                      />
                    </div>
                    <label className="nba-field">
                      <span>Status</span>
                      <Select
                        value={isActive ? 'true' : 'false'}
                        onChange={(v) => setIsActive(v === 'true')}
                        options={[
                          { value: 'true', label: 'Active' },
                          { value: 'false', label: 'Inactive' },
                        ]}
                      />
                    </label>
                    <label className="nba-field">
                      <span>Nurse *</span>
                      <Select
                        value={nurseId}
                        onChange={setNurseId}
                        options={[
                          { value: '', label: 'Select nurse…' },
                          ...nurses.map((n) => ({
                            value: String(n.id),
                            label:
                              `${n.first_name || ''} ${n.last_name || ''}`.trim() ||
                              n.email ||
                              `Nurse #${n.id}`,
                          })),
                        ]}
                      />
                    </label>
                  </div>
                </section>

                <section className="nba-detail-panel">
                  <header className="nba-detail-panel__header">
                    <UserRound size={18} aria-hidden />
                    <div>
                      <h2>Notes</h2>
                      <p>Optional remarks for this assignment</p>
                    </div>
                  </header>
                  <label className="nba-field nba-field--full">
                    <span className="nba-sr-only">Notes</span>
                    <textarea
                      className="nba-textarea nba-textarea--lg"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Add notes about this allocation…"
                    />
                  </label>
                </section>
              </div>

              <section className="nba-detail-panel">
                <header className="nba-detail-panel__header">
                  <BedDouble size={18} aria-hidden />
                  <div>
                    <h2>Allocated beds *</h2>
                    <p>
                      {bedIds.length} selected — add or remove beds for this nurse shift
                    </p>
                  </div>
                </header>
                <AdminBedMultiSelect
                  beds={beds}
                  selectedIds={bedIds}
                  onChange={setBedIds}
                  isLoading={bedsLoading}
                  disabled={saving}
                  searchValue={bedSearch}
                  onSearchChange={setBedSearch}
                  searchPlaceholder="Search by bed number or ward…"
                  assignedBedIds={assignedBedIds}
                  allowAssignedIds={allowAssignedIds}
                />
              </section>

              <div className="nba-edit-actions">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate(ROUTES.ADMIN_BED_ALLOCATION)}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  <Save size={16} aria-hidden />
                  {saving ? 'Saving…' : 'Save changes'}
                </Button>
              </div>
            </form>
          )}
        </QueryFeedback>
      </div>
    </AdminLayout>
  );
}
