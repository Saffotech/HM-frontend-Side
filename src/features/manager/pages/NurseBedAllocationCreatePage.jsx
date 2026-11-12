import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save } from 'lucide-react';
import ManagerLayout from '@/features/manager/components/ManagerLayout';
import ManagerBackBar from '@/features/manager/components/ManagerBackBar';
import ManagerBedMultiSelect from '@/features/manager/components/ManagerBedMultiSelect';
import { useAdminBedAllocationPermissions } from '@/features/manager/hooks/useManagerBedAllocationPermissions';
import {
  useAdminBedAllocationsQuery,
  useAdminRolesQuery,
  useAdminStaffListQuery,
  useBulkCreateBedAllocationsMutation,
  useWorkforceRosterQuery,
} from '@/shared/hooks/queries/useAdminQuery';
import { useBedsQuery } from '@/shared/hooks/queries/useBedsQuery';
import { Button, DateInput, Select } from '@/shared/components/common';
import { ROUTES } from '@/shared/constants';
import {
  bedIdsTakenForShift,
  confirmedNurseIdsForRange,
  formatShiftWithTime,
  rosterShiftsForNurseOnDate,
  todayIsoDate,
} from '@/shared/api/mappers/adminBedAllocationMapper';
import { toast } from '@/shared/utils/toast';
import '@/features/manager/styles/nurseBedAllocation.css';

export default function NurseBedAllocationCreatePage() {
  const navigate = useNavigate();
  const { canCreate, canAssign, canView } = useAdminBedAllocationPermissions();
  const canSave = canAssign || canCreate;

  const [shiftDate, setShiftDate] = useState(todayIsoDate());
  const [assignedUntil, setAssignedUntil] = useState(todayIsoDate());
  const [nurseId, setNurseId] = useState('');
  const [shiftName, setShiftName] = useState('');
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

  const { data: rosterData, isLoading: rosterLoading } = useWorkforceRosterQuery(
    { date_from: shiftDate, date_to: assignedUntil, page: 1, page_size: 200 },
    { enabled: canView && Boolean(shiftDate) && Boolean(assignedUntil) && assignedUntil >= shiftDate },
  );
  const confirmedNurses = useMemo(() => {
    const allowed = confirmedNurseIdsForRange(rosterData?.items, shiftDate, assignedUntil);
    return nurses.filter((nurse) => allowed.has(Number(nurse.id)));
  }, [nurses, rosterData?.items, shiftDate, assignedUntil]);

  useEffect(() => {
    if (!nurseId || rosterLoading) return;
    if (confirmedNurses.some((nurse) => String(nurse.id) === String(nurseId))) return;
    setNurseId('');
  }, [confirmedNurses, nurseId, rosterLoading]);

  const rosterShifts = useMemo(
    () => rosterShiftsForNurseOnDate(rosterData?.items, nurseId, shiftDate),
    [rosterData?.items, nurseId, shiftDate],
  );
  const selectedShift = rosterShifts.length === 1
    ? rosterShifts[0]
    : rosterShifts.find((shift) => shift.name === shiftName) || null;

  useEffect(() => {
    if (rosterLoading) return;
    if (rosterShifts.length === 1) {
      setShiftName(rosterShifts[0].name);
      return;
    }
    if (rosterShifts.some((shift) => shift.name === shiftName)) return;
    setShiftName('');
  }, [rosterLoading, rosterShifts, shiftName]);

  const { data: bedsData, isLoading: bedsLoading } = useBedsQuery({ search: bedSearch });
  const beds = bedsData?.beds ?? [];

  const { data: activeAllocations } = useAdminBedAllocationsQuery(
    { is_active: true, page: 1, page_size: 100 },
    { enabled: canView },
  );
  const assignedBedIds = useMemo(
    () =>
      bedIdsTakenForShift(activeAllocations?.items, {
        shiftName: selectedShift?.name,
        from: shiftDate,
        until: assignedUntil || shiftDate,
      }),
    [activeAllocations?.items, selectedShift?.name, shiftDate, assignedUntil],
  );

  useEffect(() => {
    if (!assignedBedIds.length) return;
    const taken = new Set(assignedBedIds);
    setBedIds((current) => {
      const next = current.filter((id) => !taken.has(Number(id)));
      return next.length === current.length ? current : next;
    });
  }, [assignedBedIds]);

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
    if (!nurseId) {
      toast.error('Select a nurse');
      return;
    }
    if (rosterShifts.length > 1 && !selectedShift) {
      toast.error('Select a shift');
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
        ...(rosterShifts.length > 1 && selectedShift ? { shiftName: selectedShift.name } : {}),
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
          if (created) navigate(ROUTES.MANAGER_BED_ALLOCATION);
        },
        onError: (err) => toast.error(err?.message || 'Failed to create allocation'),
      },
    );
  };

  if (!canView || !canSave) {
    return (
      <ManagerLayout pageTitle="New Bed Allocation">
        <div className="admin-card nba-denied">
          <h2>Access denied</h2>
          <p className="nba-muted">You do not have permission to create bed allocations.</p>
          <Button variant="outline" onClick={() => navigate(ROUTES.MANAGER_BED_ALLOCATION)}>
            Back to list
          </Button>
        </div>
      </ManagerLayout>
    );
  }

  return (
    <ManagerLayout pageTitle="New Bed Allocation">
      <div className="admin-page nba-page nba-page--compact">
        <ManagerBackBar
          onBack={() => navigate(ROUTES.MANAGER_BED_ALLOCATION)}
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
              <span>Nurse *</span>
              <Select
                value={nurseId}
                onChange={setNurseId}
                options={[
                  {
                    value: '',
                    label: rosterLoading ? 'Loading nurses…' : 'Select nurse…',
                  },
                  ...confirmedNurses.map((n) => ({
                    value: String(n.id),
                    label:
                      `${n.first_name || ''} ${n.last_name || ''}`.trim() ||
                      n.email ||
                      `Nurse #${n.id}`,
                  })),
                ]}
              />
              {!rosterLoading && !confirmedNurses.length ? (
                <p className="nba-muted">
                  No nurse is rostered for these dates. Add the shift on the roster first.
                </p>
              ) : null}
            </label>
            {nurseId && rosterShifts.length === 1 ? (
              <div className="nba-field">
                <span>Shift</span>
                <div className="nba-shift-value">
                  <span
                    className="nba-shift-pill"
                    style={{ '--shift-color': rosterShifts[0].color || '#0f766e' }}
                  >
                    <span className="nba-shift-pill__name">{rosterShifts[0].name}</span>
                    {rosterShifts[0].start && rosterShifts[0].end ? (
                      <span className="nba-shift-pill__time">
                        {String(rosterShifts[0].start).slice(0, 5)}–{String(rosterShifts[0].end).slice(0, 5)}
                      </span>
                    ) : null}
                  </span>
                </div>
              </div>
            ) : null}
            {nurseId && rosterShifts.length > 1 ? (
              <label className="nba-field">
                <span>Shift *</span>
                <Select
                  value={shiftName}
                  onChange={setShiftName}
                  options={[
                    { value: '', label: 'Select shift…' },
                    ...rosterShifts.map((shift) => ({
                      value: shift.name,
                      label: formatShiftWithTime(shift.name, shift.start, shift.end),
                    })),
                  ]}
                />
              </label>
            ) : null}
          </div>

          <div className="nba-field nba-field--full">
            <span>Beds *</span>
            <ManagerBedMultiSelect
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
              onClick={() => navigate(ROUTES.MANAGER_BED_ALLOCATION)}
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
    </ManagerLayout>
  );
}
