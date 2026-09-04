import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save } from 'lucide-react';
import AdminLayout from '@/features/admin/components/AdminLayout';
import AdminBackBar from '@/features/admin/components/AdminBackBar';
import AdminBedMultiSelect from '@/features/admin/components/AdminBedMultiSelect';
import { useAdminBedAllocationPermissions } from '@/features/admin/hooks/useAdminBedAllocationPermissions';
import {
  useAdminBedAllocationsQuery,
  useAdminRolesQuery,
  useAdminStaffListQuery,
  useBulkCreateBedAllocationsMutation,
} from '@/shared/hooks/queries/useAdminQuery';
import { useBedsQuery } from '@/shared/hooks/queries/useBedsQuery';
import { Button, DateInput, Select } from '@/shared/components/common';
import { ROUTES } from '@/shared/constants';
import {
  SHIFT_OPTIONS,
  todayIsoDate,
} from '@/shared/api/mappers/adminBedAllocationMapper';
import { toast } from '@/shared/utils/toast';
import '@/features/admin/styles/nurseBedAllocation.css';

export default function NurseBedAllocationCreatePage() {
  const navigate = useNavigate();
  const { canCreate, canAssign, canView } = useAdminBedAllocationPermissions();
  const canSave = canAssign || canCreate;

  const [shiftDate, setShiftDate] = useState(todayIsoDate());
  const [assignedUntil, setAssignedUntil] = useState(todayIsoDate());
  const [shiftName, setShiftName] = useState('Morning');
  const [nurseId, setNurseId] = useState('');
  const [bedIds, setBedIds] = useState([]);
  const [bedSearch, setBedSearch] = useState('');

  const { data: roles = [] } = useAdminRolesQuery({ enabled: canView });
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

  const bulkMut = useBulkCreateBedAllocationsMutation();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!canSave) {
      toast.error('You do not have permission to create allocations');
      return;
    }
    if (!shiftDate) {
      toast.error('Select assigned from date');
      return;
    }
    if (!assignedUntil) {
      toast.error('Select assigned till date');
      return;
    }
    if (assignedUntil < shiftDate) {
      toast.error('Assigned till must be on or after assigned from');
      return;
    }
    if (!shiftName) {
      toast.error('Select a shift');
      return;
    }
    if (!nurseId) {
      toast.error('Select a nurse');
      return;
    }
    if (!bedIds.length) {
      toast.error('Select at least one bed');
      return;
    }

    bulkMut.mutate(
      {
        nurseId,
        bedIds,
        shiftDate,
        assignedUntil,
        shiftName,
      },
      {
        onSuccess: (res) => {
          const created = res?.created ?? 0;
          const skipped = res?.skipped ?? 0;
          if (created) toast.success(`Assigned ${created} bed(s)`);
          if (skipped) {
            const first = res?.errors?.[0];
            toast.error(
              first
                ? `${skipped} skipped: ${first}`
                : `${skipped} bed(s) skipped (duplicates or errors)`,
            );
          }
          if (created) navigate(ROUTES.ADMIN_BED_ALLOCATION);
        },
        onError: (err) => toast.error(err?.message || 'Failed to create allocation'),
      },
    );
  };

  if (!canView || !canSave) {
    return (
      <AdminLayout pageTitle="New Bed Allocation">
        <div className="admin-card nba-denied">
          <h2>Access denied</h2>
          <p className="nba-muted">You do not have permission to create bed allocations.</p>
          <Button variant="outline" onClick={() => navigate(ROUTES.ADMIN_BED_ALLOCATION)}>
            Back to list
          </Button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout pageTitle="New Bed Allocation">
      <div className="admin-page nba-page nba-page--compact">
        <AdminBackBar
          onBack={() => navigate(ROUTES.ADMIN_BED_ALLOCATION)}
          label="Back to allocations"
        />

        <form className="admin-card nba-form-card nba-form-card--compact" onSubmit={handleSubmit}>
          <div className="nba-form-grid nba-form-grid--create">
            <div className="nba-field">
              <DateInput
                label="Assigned from"
                required
                value={shiftDate}
                onChange={(e) => {
                  const next = e.target.value;
                  setShiftDate(next);
                  if (assignedUntil && next && assignedUntil < next) {
                    setAssignedUntil(next);
                  }
                }}
              />
            </div>
            <div className="nba-field">
              <DateInput
                label="Assigned till"
                required
                value={assignedUntil}
                min={shiftDate || undefined}
                onChange={(e) => setAssignedUntil(e.target.value)}
              />
            </div>
            <label className="nba-field">
              <span>Shift *</span>
              <Select
                value={shiftName}
                onChange={setShiftName}
                options={SHIFT_OPTIONS}
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

          <div className="nba-field nba-field--full">
            <span>Beds *</span>
            <AdminBedMultiSelect
              beds={beds}
              selectedIds={bedIds}
              onChange={setBedIds}
              isLoading={bedsLoading}
              searchValue={bedSearch}
              onSearchChange={setBedSearch}
              searchPlaceholder="Filter beds by number or ward…"
              assignedBedIds={assignedBedIds}
            />
          </div>

          <div className="nba-form-actions">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(ROUTES.ADMIN_BED_ALLOCATION)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={bulkMut.isPending}>
              <Save size={16} aria-hidden />
              {bulkMut.isPending ? 'Saving…' : 'Save assignment'}
            </Button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
}
