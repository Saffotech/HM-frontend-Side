import { useState } from 'react';
import ManagerLayout from '@/features/manager/components/ManagerLayout';
import ManagerEmptyState from '@/features/manager/components/ManagerEmptyState';
import NurseWorkforceNav from '@/features/manager/components/NurseWorkforceNav';
import { useAdminWorkforcePermissions } from '@/features/manager/hooks/useManagerWorkforcePermissions';
import {
  useCreateWorkforceShiftMutation,
  useDeleteWorkforceShiftMutation,
  useUpdateWorkforceShiftMutation,
  useWorkforceShiftsQuery,
} from '@/shared/hooks/queries/useAdminQuery';
import { Button, QueryFeedback } from '@/shared/components/common';
import { toast } from '@/shared/utils/toast';
import '@/features/manager/styles/nurseWorkforce.css';

const EMPTY = {
  name: '',
  code: '',
  start_time: '06:00',
  end_time: '14:00',
  grace_minutes: 0,
  color: '#3B82F6',
  weekly_mask: '1111111',
  notes: '',
};

export default function NurseWorkforceShiftsPage() {
  const { canView, canCreate, canUpdate, canDelete } = useAdminWorkforcePermissions();
  const {
    data: activeData,
    isLoading: isActiveLoading,
    isError: isActiveError,
    error: activeError,
    refetch: refetchActive,
  } = useWorkforceShiftsQuery(
    { is_active: true },
    { enabled: canView },
  );
  const {
    data: inactiveData,
    isLoading: isInactiveLoading,
    isError: isInactiveError,
    error: inactiveError,
    refetch: refetchInactive,
  } = useWorkforceShiftsQuery(
    { is_active: false },
    { enabled: canView },
  );
  const shifts = [...(activeData?.items ?? []), ...(inactiveData?.items ?? [])]
    .sort((a, b) => String(a.start_time).localeCompare(String(b.start_time)));
  const isLoading = isActiveLoading || isInactiveLoading;
  const isError = isActiveError || isInactiveError;
  const error = activeError || inactiveError;
  const refetch = () => {
    refetchActive();
    refetchInactive();
  };
  const createMut = useCreateWorkforceShiftMutation();
  const deleteMut = useDeleteWorkforceShiftMutation();
  const updateMut = useUpdateWorkforceShiftMutation();
  const [form, setForm] = useState(EMPTY);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const onCreate = (e) => {
    e.preventDefault();
    const graceMinutes =
      form.grace_minutes === '' ? 0 : Number(form.grace_minutes);
    if (!Number.isInteger(graceMinutes) || graceMinutes < 0 || graceMinutes > 180) {
      toast.error('Grace period must be a whole number between 0 and 180 minutes');
      return;
    }
    const normalize = (value) => String(value || '').trim().toLowerCase();
    const name = normalize(form.name);
    const code = normalize(form.code);
    const existingShifts = shifts;
    if (existingShifts.some((shift) => normalize(shift.name) === name)) {
      toast.error('A shift with this name already exists');
      return;
    }
    if (code && existingShifts.some((shift) => normalize(shift.code) === code)) {
      toast.error('A shift with this code already exists');
      return;
    }
    createMut.mutate(
      {
        ...form,
        name: form.name.trim(),
        code: form.code.trim(),
        start_time: form.start_time.length === 5 ? `${form.start_time}:00` : form.start_time,
        end_time: form.end_time.length === 5 ? `${form.end_time}:00` : form.end_time,
        grace_minutes: graceMinutes,
      },
      {
        onSuccess: () => {
          toast.success('Shift created');
          setForm(EMPTY);
        },
        onError: (err) => toast.error(err?.message || 'Failed to create shift'),
      },
    );
  };

  if (!canView) {
    return (
      <ManagerLayout pageTitle="Shifts">
        <ManagerEmptyState title="Access denied" description="workforce:view required." />
      </ManagerLayout>
    );
  }

  return (
    <ManagerLayout pageTitle="Shifts">
      <div className="admin-page nwf-page">
        <NurseWorkforceNav />

        {canCreate && (
          <form className="nwf-panel" onSubmit={onCreate}>
            <h2 className="admin-card__title">Create shift</h2>
            <div className="nwf-form-row nwf-form-row--six">
              <label className="nwf-field">Name<input value={form.name} onChange={(e) => set('name', e.target.value)} required /></label>
              <label className="nwf-field">Code<input value={form.code} onChange={(e) => set('code', e.target.value)} /></label>
              <label className="nwf-field">Start<input type="time" value={form.start_time} onChange={(e) => set('start_time', e.target.value)} required /></label>
              <label className="nwf-field">End<input type="time" value={form.end_time} onChange={(e) => set('end_time', e.target.value)} required /></label>
              <label className="nwf-field">Grace (min)<input type="number" min={0} max={180} step={1} value={form.grace_minutes} onChange={(e) => set('grace_minutes', e.target.value)} /></label>
              <label className="nwf-field">Color<input type="color" value={form.color} onChange={(e) => set('color', e.target.value)} /></label>
            </div>
            <Button type="submit" disabled={createMut.isPending}>
              {createMut.isPending ? 'Saving…' : 'Save shift'}
            </Button>
          </form>
        )}

        <QueryFeedback isLoading={isLoading} isError={isError} error={error} onRetry={refetch}>
          <div className="admin-table-wrap nwf-panel">
            <table className="admin-table admin-table--stack">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Code</th>
                  <th>Start</th>
                  <th>End</th>
                  <th>Grace</th>
                  <th>Color</th>
                  <th>Template</th>
                  <th className="admin-table__actions">Action</th>
                </tr>
              </thead>
              <tbody>
                {shifts.map((s) => (
                  <tr
                    key={s.id}
                    className={s.is_active ? undefined : 'nwf-shift-row--inactive'}
                  >
                    <td data-label="Name"><span>{s.name}</span></td>
                    <td data-label="Code"><span>{s.code || '—'}</span></td>
                    <td data-label="Start"><span>{String(s.start_time).slice(0, 5)}</span></td>
                    <td data-label="End"><span>{String(s.end_time).slice(0, 5)}</span></td>
                    <td data-label="Grace"><span>{s.grace_minutes}</span></td>
                    <td data-label="Color">
                      <span style={{ display: 'inline-block', width: 16, height: 16, borderRadius: 4, background: s.color }} />
                    </td>
                    <td data-label="Template"><span>{s.is_template ? 'Yes' : 'No'}</span></td>
                    <td className="admin-table__actions" data-label="Action">
                      {s.is_active && canDelete ? (
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() =>
                            deleteMut.mutate(s.id, {
                              onSuccess: () => toast.success('Shift deactivated'),
                              onError: (err) => toast.error(err?.message || 'Failed'),
                            })
                          }
                        >
                          Deactivate
                        </Button>
                      ) : !s.is_active && canUpdate ? (
                        <Button
                          variant="primary"
                          size="sm"
                          disabled={updateMut.isPending}
                          onClick={() =>
                            updateMut.mutate(
                              { id: s.id, body: { is_active: true } },
                              {
                                onSuccess: () => toast.success('Shift activated'),
                                onError: (err) => toast.error(err?.message || 'Failed to activate shift'),
                              },
                            )
                          }
                        >
                          Activate
                        </Button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </QueryFeedback>
      </div>
    </ManagerLayout>
  );
}
