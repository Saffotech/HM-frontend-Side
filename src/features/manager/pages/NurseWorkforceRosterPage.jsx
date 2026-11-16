import { useMemo, useState } from 'react';
import { CalendarDays, Plus, UserRound } from 'lucide-react';
import ManagerLayout from '@/features/manager/components/ManagerLayout';
import ManagerEmptyState from '@/features/manager/components/ManagerEmptyState';
import NurseWorkforceNav from '@/features/manager/components/NurseWorkforceNav';
import { useAdminWorkforcePermissions } from '@/features/manager/hooks/useManagerWorkforcePermissions';
import {
  useAdminRolesQuery,
  useAdminStaffListQuery,
  useBulkCreateWorkforceRosterMutation,
  useDeleteWorkforceRosterMutation,
  useWorkforceRosterQuery,
  useWorkforceShiftsQuery,
} from '@/shared/hooks/queries/useAdminQuery';
import { Button, QueryFeedback, Select } from '@/shared/components/common';
import { toast } from '@/shared/utils/toast';
import '@/features/manager/styles/nurseWorkforce.css';

function todayIso() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function addDaysIso(iso, days) {
  const d = new Date(`${String(iso).slice(0, 10)}T12:00:00`);
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function dayDiffIso(a, b) {
  const da = new Date(`${String(a).slice(0, 10)}T12:00:00`);
  const db = new Date(`${String(b).slice(0, 10)}T12:00:00`);
  return Math.round((db.getTime() - da.getTime()) / 86400000);
}

function eachDateInclusive(from, to) {
  const start = String(from).slice(0, 10);
  const end = String(to).slice(0, 10);
  if (!start || !end || end < start) return [];
  const out = [];
  let cur = start;
  while (cur <= end) {
    out.push(cur);
    cur = addDaysIso(cur, 1);
  }
  return out;
}

function formatDateLabel(iso) {
  if (!iso) return '—';
  const d = new Date(`${String(iso).slice(0, 10)}T12:00:00`);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatShiftClock(value) {
  if (value == null || value === '') return '';
  const m = String(value).match(/^(\d{1,2}):(\d{2})/);
  if (m) return `${m[1].padStart(2, '0')}:${m[2]}`;
  return String(value);
}

function shiftLabel(s) {
  if (!s) return '—';
  const start = formatShiftClock(s.start_time);
  const end = formatShiftClock(s.end_time);
  if (start && end) return `${s.name} (${start}–${end})`;
  return s.name;
}

/** Collapse consecutive same nurse+shift rows into From–To spans. */
function groupRosterSpans(items) {
  const active = (items ?? []).filter(
    (r) => String(r.status ?? '').toLowerCase() !== 'cancelled',
  );
  const sorted = active.slice().sort((a, b) => {
    const nurseCmp = String(a.nurse_name ?? '').localeCompare(String(b.nurse_name ?? ''));
    if (nurseCmp !== 0) return nurseCmp;
    const shiftCmp = Number(a.shift_id) - Number(b.shift_id);
    if (shiftCmp !== 0) return shiftCmp;
    return String(a.roster_date).localeCompare(String(b.roster_date));
  });

  const spans = [];
  for (const row of sorted) {
    const last = spans[spans.length - 1];
    const date = String(row.roster_date).slice(0, 10);
    const sameNurse = last && Number(last.nurseId) === Number(row.nurse_id);
    const sameShift = last && Number(last.shiftId) === Number(row.shift_id);
    const consecutive = last && dayDiffIso(last.to, date) === 1;
    if (sameNurse && sameShift && consecutive) {
      last.to = date;
      last.ids.push(row.id);
      last.count += 1;
      if (String(row.status ?? '').toLowerCase() !== 'confirmed') {
        last.status = row.status || 'scheduled';
      }
    } else {
      spans.push({
        key: `${row.nurse_id}-${row.shift_id}-${date}`,
        nurseId: row.nurse_id,
        nurseName: row.nurse_name || '—',
        shiftId: row.shift_id,
        shiftName: row.shift_name || '—',
        shiftColor: row.shift_color || '#3B82F6',
        startTime: row.start_time,
        endTime: row.end_time,
        status: row.status || 'scheduled',
        from: date,
        to: date,
        ids: [row.id],
        count: 1,
      });
    }
  }
  return spans;
}

export default function NurseWorkforceRosterPage() {
  const { canManageRoster } = useAdminWorkforcePermissions();
  const today = todayIso();
  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo] = useState(today);
  const [statusFilter, setStatusFilter] = useState('all');
  const [form, setForm] = useState({
    nurse_id: '',
    shift_id: '',
    date_from: today,
    date_to: today,
  });
  const [cancellingKey, setCancellingKey] = useState(null);

  const filters = useMemo(
    () => ({ date_from: dateFrom, date_to: dateTo, page: 1, page_size: 200 }),
    [dateFrom, dateTo],
  );

  const { data, isLoading, isError, error, refetch } = useWorkforceRosterQuery(filters, {
    enabled: canManageRoster,
  });
  const { data: shiftsData } = useWorkforceShiftsQuery(
    { is_active: true },
    { enabled: canManageRoster },
  );
  const { data: roles = [] } = useAdminRolesQuery({ enabled: canManageRoster });
  const nurseRoleId = useMemo(() => roles.find((r) => r.name === 'nurse')?.id, [roles]);
  const { data: staffData } = useAdminStaffListQuery(
    { role_id: nurseRoleId, is_active: true, page: 1, limit: 100 },
    { enabled: canManageRoster && Boolean(nurseRoleId) },
  );

  const bulkMut = useBulkCreateWorkforceRosterMutation();
  const deleteMut = useDeleteWorkforceRosterMutation();

  const nurses = staffData?.staff ?? staffData?.items ?? [];
  const shifts = shiftsData?.items ?? [];
  const items = useMemo(() => data?.items ?? [], [data?.items]);
  const filteredItems = useMemo(
    () => statusFilter === 'all'
      ? items
      : items.filter((row) => String(row.status ?? '').toLowerCase() === statusFilter),
    [items, statusFilter],
  );
  const spans = useMemo(() => groupRosterSpans(filteredItems), [filteredItems]);

  const onCreate = (e) => {
    e.preventDefault();
    if (!form.nurse_id) {
      toast.error('Select a nurse');
      return;
    }
    if (!form.shift_id) {
      toast.error('Select a shift');
      return;
    }
    if (!form.date_from || !form.date_to) {
      toast.error('Select from and to dates');
      return;
    }
    if (form.date_to < form.date_from) {
      toast.error('To date must be on or after From date');
      return;
    }

    const dates = eachDateInclusive(form.date_from, form.date_to);
    if (!dates.length) {
      toast.error('Invalid date range');
      return;
    }

    bulkMut.mutate(
      {
        nurse_ids: [Number(form.nurse_id)],
        shift_id: Number(form.shift_id),
        dates,
      },
      {
        onSuccess: (res) => {
          const created = res?.created ?? 0;
          const skipped = res?.skipped ?? 0;
          if (created) {
            toast.success(
              created === 1
                ? 'Added to roster'
                : `Added ${created} day(s) to roster`,
            );
          }
          if (skipped && !created) toast.error('Already rostered for these dates');
          else if (skipped) toast.error(`${skipped} day(s) skipped (already assigned)`);
          if (created) {
            setForm((p) => ({
              ...p,
              nurse_id: '',
              shift_id: '',
            }));
          }
        },
        onError: (err) => toast.error(err?.message || 'Failed to add roster'),
      },
    );
  };

  const cancelSpan = async (span) => {
    setCancellingKey(span.key);
    const results = await Promise.allSettled(
      span.ids.map((id) => deleteMut.mutateAsync(id)),
    );
    setCancellingKey(null);
    const ok = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.length - ok;
    if (ok) toast.success(ok === 1 ? 'Roster cancelled' : `${ok} days cancelled`);
    if (failed) toast.error(`${failed} failed to cancel`);
  };

  if (!canManageRoster) {
    return (
      <ManagerLayout pageTitle="Roster">
        <ManagerEmptyState title="Access denied" description="roster:manage required." />
      </ManagerLayout>
    );
  }

  const periodLabel =
    dateFrom === dateTo
      ? formatDateLabel(dateFrom)
      : `${formatDateLabel(dateFrom)} – ${formatDateLabel(dateTo)}`;

  return (
    <ManagerLayout pageTitle="Roster">
      <div className="admin-page nwf-page nwf-roster-page">
        <NurseWorkforceNav />

        <div className="nwf-roster-layout">
          <aside className="nwf-roster-assign">
            <div className="nwf-roster-assign__head">
              <span className="nwf-roster-assign__icon" aria-hidden>
                <Plus size={18} />
              </span>
              <div>
                <h2 className="nwf-roster-assign__title">Assign shift</h2>
                <p className="nwf-roster-assign__sub">
                  Pick nurse, shift, and date range
                </p>
              </div>
            </div>

            <form className="nwf-roster-assign__form" onSubmit={onCreate}>
              <label className="nwf-field">
                <span>Nurse *</span>
                <Select
                  value={form.nurse_id}
                  onChange={(v) => setForm((p) => ({ ...p, nurse_id: v }))}
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

              <label className="nwf-field">
                <span>Shift *</span>
                <Select
                  value={form.shift_id}
                  onChange={(v) => setForm((p) => ({ ...p, shift_id: v }))}
                  options={[
                    { value: '', label: 'Select shift…' },
                    ...shifts.map((s) => ({
                      value: String(s.id),
                      label: shiftLabel(s),
                    })),
                  ]}
                />
              </label>

              <div className="nwf-roster-assign__dates">
                <label className="nwf-field">
                  <span>From *</span>
                  <input
                    type="date"
                    value={form.date_from}
                    onChange={(e) => {
                      const next = e.target.value;
                      setForm((p) => ({
                        ...p,
                        date_from: next,
                        date_to: p.date_to && p.date_to < next ? next : p.date_to,
                      }));
                    }}
                    required
                  />
                </label>
                <label className="nwf-field">
                  <span>To *</span>
                  <input
                    type="date"
                    value={form.date_to}
                    min={form.date_from || undefined}
                    onChange={(e) => setForm((p) => ({ ...p, date_to: e.target.value }))}
                    required
                  />
                </label>
              </div>

              <Button type="submit" className="nwf-roster-assign__submit" disabled={bulkMut.isPending}>
                <Plus size={16} aria-hidden />
                {bulkMut.isPending ? 'Saving…' : 'Add to roster'}
              </Button>
            </form>
          </aside>

          <section className="nwf-roster-main">
            <div className="nwf-roster-toolbar">
              <div className="nwf-roster-toolbar__left">
                <div>
                  <h2 className="nwf-roster-main__title">Roster schedule</h2>
                  <p className="nwf-roster-main__meta">
                    <CalendarDays size={14} aria-hidden />
                    {periodLabel}
                    <span className="nwf-roster-dot">·</span>
                    {spans.length} assignment{spans.length === 1 ? '' : 's'}
                  </p>
                </div>
                <label className="nwf-field nwf-field--inline nwf-roster-status-filter">
                  <span>Status</span>
                  <Select
                    value={statusFilter}
                    onChange={setStatusFilter}
                    options={[
                      { value: 'all', label: 'All statuses' },
                      { value: 'scheduled', label: 'Scheduled' },
                      { value: 'completed', label: 'Completed' },
                    ]}
                  />
                </label>
              </div>

              <div className="nwf-roster-toolbar__right">
                <div className="nwf-roster-range">
                  <label className="nwf-field nwf-field--inline">
                    <span>From</span>
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => {
                        const next = e.target.value;
                        setDateFrom(next);
                        if (dateTo < next) setDateTo(next);
                      }}
                    />
                  </label>
                  <label className="nwf-field nwf-field--inline">
                    <span>To</span>
                    <input
                      type="date"
                      value={dateTo}
                      min={dateFrom || undefined}
                      onChange={(e) => setDateTo(e.target.value)}
                    />
                  </label>
                </div>
              </div>

            </div>

            <QueryFeedback isLoading={isLoading} isError={isError} error={error} onRetry={refetch}>
                <div className="nwf-roster-list">
                  {!spans.length ? (
                    <div className="nwf-roster-empty">
                      <UserRound size={28} aria-hidden />
                      <h3>No roster in this range</h3>
                      <p>Assign a nurse to a shift using the form on the left.</p>
                    </div>
                  ) : (
                    <div className="admin-table-wrap nwf-roster-table-wrap">
                      <table className="admin-table nwf-roster-table admin-table--stack">
                        <thead>
                          <tr>
                            <th>Nurse</th>
                            <th>Shift</th>
                            <th>From</th>
                            <th>To</th>
                            <th>Days</th>
                            <th>Status</th>
                            <th className="nwf-th-actions">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {spans.map((span) => (
                            <tr key={span.key}>
                              <td data-label="Nurse">
                                <div className="nwf-roster-nurse">
                                  <span className="nwf-roster-avatar" aria-hidden>
                                    {(span.nurseName || '?').charAt(0).toUpperCase()}
                                  </span>
                                  <span>{span.nurseName}</span>
                                </div>
                              </td>
                              <td data-label="Shift">
                                <span
                                  className="nwf-shift-pill"
                                  style={{
                                    '--shift-color': span.shiftColor || '#3B82F6',
                                  }}
                                >
                                  {span.shiftName}
                                  {formatShiftClock(span.startTime) && formatShiftClock(span.endTime)
                                    ? ` · ${formatShiftClock(span.startTime)}–${formatShiftClock(span.endTime)}`
                                    : ''}
                                </span>
                              </td>
                              <td data-label="From"><span>{formatDateLabel(span.from)}</span></td>
                              <td data-label="To"><span>{formatDateLabel(span.to)}</span></td>
                              <td data-label="Days"><span>{span.count}</span></td>
                              <td data-label="Status">
                                <span className="nwf-badge nwf-badge--balanced">{span.status}</span>
                              </td>
                              <td className="nwf-td-actions" data-label="Action">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  disabled={cancellingKey === span.key || deleteMut.isPending}
                                  onClick={() => cancelSpan(span)}
                                >
                                  {cancellingKey === span.key && deleteMut.isPending
                                    ? 'Cancelling…'
                                    : 'Cancel'}
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
            </QueryFeedback>
          </section>
        </div>
      </div>
    </ManagerLayout>
  );
}
