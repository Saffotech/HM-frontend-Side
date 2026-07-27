import { useState } from 'react';
import AdminLayout from '@/features/admin/components/AdminLayout';
import AdminEmptyState from '@/features/admin/components/AdminEmptyState';
import NurseWorkforceNav from '@/features/admin/components/NurseWorkforceNav';
import { useAdminWorkforcePermissions } from '@/features/admin/hooks/useAdminWorkforcePermissions';
import {
  useCreateWorkforceShiftMutation,
  useDeleteWorkforceShiftMutation,
  useWorkforceShiftsQuery,
} from '@/shared/hooks/queries/useAdminQuery';
import { Button, QueryFeedback } from '@/shared/components/common';
import { toast } from '@/shared/utils/toast';
import '@/features/admin/styles/nurseWorkforce.css';

const EMPTY = {
  name: '',
  code: '',
  start_time: '06:00',
  end_time: '14:00',
  grace_minutes: 15,
  color: '#3B82F6',
  weekly_mask: '1111111',
  notes: '',
};

export default function NurseWorkforceShiftsPage() {
  const { canView, canCreate, canDelete } = useAdminWorkforcePermissions();
  const { data, isLoading, isError, error, refetch } = useWorkforceShiftsQuery(
    { is_active: true },
    { enabled: canView },
  );
  const createMut = useCreateWorkforceShiftMutation();
  const deleteMut = useDeleteWorkforceShiftMutation();
  const [form, setForm] = useState(EMPTY);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const onCreate = (e) => {
    e.preventDefault();
    createMut.mutate(
      {
        ...form,
        start_time: form.start_time.length === 5 ? `${form.start_time}:00` : form.start_time,
        end_time: form.end_time.length === 5 ? `${form.end_time}:00` : form.end_time,
        grace_minutes: Number(form.grace_minutes) || 15,
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
      <AdminLayout pageTitle="Shifts">
        <AdminEmptyState title="Access denied" description="workforce:view required." />
      </AdminLayout>
    );
  }

  return (
    <AdminLayout pageTitle="Shifts">
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
              <label className="nwf-field">Grace (min)<input type="number" min={0} value={form.grace_minutes} onChange={(e) => set('grace_minutes', e.target.value)} /></label>
              <label className="nwf-field">Color<input type="color" value={form.color} onChange={(e) => set('color', e.target.value)} /></label>
            </div>
            <Button type="submit" disabled={createMut.isPending}>
              {createMut.isPending ? 'Saving…' : 'Save shift'}
            </Button>
          </form>
        )}

        <QueryFeedback isLoading={isLoading} isError={isError} error={error} onRetry={refetch}>
          <div className="admin-table-wrap nwf-panel">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Code</th>
                  <th>Start</th>
                  <th>End</th>
                  <th>Grace</th>
                  <th>Color</th>
                  <th>Template</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {(data?.items ?? []).map((s) => (
                  <tr key={s.id}>
                    <td>{s.name}</td>
                    <td>{s.code || '—'}</td>
                    <td>{String(s.start_time).slice(0, 5)}</td>
                    <td>{String(s.end_time).slice(0, 5)}</td>
                    <td>{s.grace_minutes}</td>
                    <td>
                      <span style={{ display: 'inline-block', width: 16, height: 16, borderRadius: 4, background: s.color }} />
                    </td>
                    <td>{s.is_template ? 'Yes' : 'No'}</td>
                    <td>
                      {canDelete && (
                        <Button
                          variant="ghost"
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
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </QueryFeedback>
      </div>
    </AdminLayout>
  );
}
