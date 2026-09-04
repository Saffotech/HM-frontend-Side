import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BedDouble,
  CalendarDays,
  UserCheck,
  Users,
} from 'lucide-react';
import AdminLayout from '@/features/admin/components/AdminLayout';
import AdminStatCard from '@/features/admin/components/AdminStatCard';
import AdminEmptyState from '@/features/admin/components/AdminEmptyState';
import NurseWorkforceNav from '@/features/admin/components/NurseWorkforceNav';
import { useAdminWorkforcePermissions } from '@/features/admin/hooks/useAdminWorkforcePermissions';
import {
  useAdminBedAllocationsQuery,
  useAdminRolesQuery,
  useAdminStaffListQuery,
  useWorkforceDashboardQuery,
  useWorkforceRosterQuery,
} from '@/shared/hooks/queries/useAdminQuery';
import { useBedsQuery } from '@/shared/hooks/queries/useBedsQuery';
import { Button, QueryFeedback } from '@/shared/components/common';
import { ROUTES } from '@/shared/constants';
import {
  formatAllocationDate,
  formatAssignedUntil,
  todayIsoDate,
} from '@/shared/api/mappers/adminBedAllocationMapper';
import '@/features/admin/styles/nurseWorkforce.css';

const FILTERS = {
  ON_DUTY: 'on_duty',
  OFF_DUTY: 'off_duty',
  BEDS_ASSIGNED: 'beds_assigned',
  BEDS_UNASSIGNED: 'beds_unassigned',
  CURRENT_SHIFT: 'current_shift',
};

function formatDashboardDate(iso) {
  if (!iso) return '';
  const d = new Date(`${String(iso).slice(0, 10)}T12:00:00`);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
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

/** Contiguous roster span that includes `aroundIso` (same nurse+shift days). */
function consecutiveRangeAround(datesIso, aroundIso) {
  const around = String(aroundIso).slice(0, 10);
  const dates = Array.from(
    new Set((datesIso ?? []).map((d) => String(d).slice(0, 10)).filter(Boolean)),
  ).sort();
  if (!dates.length) return { from: around, to: around };
  if (!dates.includes(around)) return { from: around, to: around };

  let i = dates.indexOf(around);
  let start = i;
  while (start > 0 && dayDiffIso(dates[start - 1], dates[start]) === 1) {
    start -= 1;
  }
  let end = i;
  while (end < dates.length - 1 && dayDiffIso(dates[end], dates[end + 1]) === 1) {
    end += 1;
  }
  return { from: dates[start], to: dates[end] };
}

/** Format "HH:MM:SS" / "HH:MM" / Date-like time to "HH:MM". */
function formatShiftClock(value) {
  if (value == null || value === '') return '';
  if (typeof value === 'string') {
    const m = value.match(/^(\d{1,2}):(\d{2})/);
    if (m) return `${m[1].padStart(2, '0')}:${m[2]}`;
    return value;
  }
  if (typeof value === 'object' && typeof value.hour === 'number') {
    const h = String(value.hour).padStart(2, '0');
    const min = String(value.minute ?? 0).padStart(2, '0');
    return `${h}:${min}`;
  }
  return String(value);
}

function formatShiftTimeRange(start, end) {
  const from = formatShiftClock(start);
  const to = formatShiftClock(end);
  if (from && to) return `${from} – ${to}`;
  return from || to || '';
}

function formatShiftLabel(name, start, end) {
  const label = name || '—';
  const range = formatShiftTimeRange(start, end);
  return range ? `${label} (${range})` : label;
}

function displayName(person) {
  if (!person) return '—';
  if (person.nurse_name) return person.nurse_name;
  if (person.full_name) return person.full_name;
  const first = person.first_name ?? '';
  const last = person.last_name ?? '';
  const name = `${first} ${last}`.trim();
  return name || person.email || '—';
}

export default function NurseWorkforceDashboardPage() {
  const { canView } = useAdminWorkforcePermissions();
  const [activeFilter, setActiveFilter] = useState(FILTERS.ON_DUTY);
  const localDay = todayIsoDate();

  const { data, isLoading, isError, error, refetch } = useWorkforceDashboardQuery(
    {},
    { enabled: canView },
  );

  // Prefer backend IST "today" so roster KPIs use the same day.
  const day = data?.date ? String(data.date).slice(0, 10) : localDay;
  const dayLabel = formatDashboardDate(day);

  const needRoster =
    canView &&
    (activeFilter === FILTERS.ON_DUTY ||
      activeFilter === FILTERS.OFF_DUTY ||
      activeFilter === FILTERS.CURRENT_SHIFT);

  const needStaff = canView && activeFilter === FILTERS.OFF_DUTY;
  const needBedPanels =
    canView &&
    (activeFilter === FILTERS.BEDS_UNASSIGNED || activeFilter === FILTERS.BEDS_ASSIGNED);

  // Wider window so we can show consecutive roster From–To for today's on-duty nurses.
  const rosterDateFrom = useMemo(() => addDaysIso(day, -30), [day]);
  const rosterDateTo = useMemo(() => addDaysIso(day, 60), [day]);

  const { data: rosterData, isLoading: rosterLoading } = useWorkforceRosterQuery(
    { date_from: rosterDateFrom, date_to: rosterDateTo, page: 1, page_size: 200 },
    { enabled: needRoster },
  );
  const { data: roles = [] } = useAdminRolesQuery({ enabled: needStaff });
  const nurseRoleId = useMemo(() => roles.find((r) => r.name === 'nurse')?.id, [roles]);
  const { data: staffData, isLoading: staffLoading } = useAdminStaffListQuery(
    { role_id: nurseRoleId, is_active: true, page: 1, limit: 100 },
    { enabled: needStaff && Boolean(nurseRoleId) },
  );
  const { data: bedsData, isLoading: bedsLoading } = useBedsQuery({
    enabled: needBedPanels,
  });

  // Persistent assignments: all currently active beds (not limited to today's date).
  const { data: allocationsData, isLoading: allocationsLoading } = useAdminBedAllocationsQuery(
    { is_active: true, page: 1, page_size: 100 },
    { enabled: needBedPanels },
  );

  const rosterWindowItems = rosterData?.items ?? [];

  // Nurses "on duty" = rostered for the dashboard day.
  const rosterItems = useMemo(
    () =>
      rosterWindowItems.filter(
        (row) => String(row.roster_date ?? '').slice(0, 10) === day,
      ),
    [rosterWindowItems, day],
  );

  const rosterRangeByNurseShift = useMemo(() => {
    const byKey = new Map();
    for (const row of rosterWindowItems) {
      const status = String(row.status ?? '').toLowerCase();
      if (status === 'cancelled') continue;
      const nurseId = Number(row.nurse_id);
      const shiftId = Number(row.shift_id);
      if (!Number.isFinite(nurseId) || !Number.isFinite(shiftId)) continue;
      const key = `${nurseId}|${shiftId}`;
      if (!byKey.has(key)) byKey.set(key, []);
      byKey.get(key).push(row.roster_date);
    }

    const ranges = new Map();
    for (const [key, dates] of byKey.entries()) {
      ranges.set(key, consecutiveRangeAround(dates, day));
    }
    return ranges;
  }, [rosterWindowItems, day]);

  const getRosterPeriod = (row) => {
    const nurseId = Number(row.nurse_id);
    const shiftId = Number(row.shift_id);
    const key = `${nurseId}|${shiftId}`;
    const range = rosterRangeByNurseShift.get(key);
    if (range) return range;
    const fallback = String(row.roster_date ?? day).slice(0, 10);
    return { from: fallback, to: fallback };
  };

  const allocatedBedIdSet = useMemo(() => {
    const items = allocationsData?.items ?? [];
    return new Set(items.map((row) => Number(row.bedId)).filter(Number.isFinite));
  }, [allocationsData?.items]);

  const allBeds = bedsData?.beds ?? [];

  const unassignedBeds = useMemo(() => {
    return allBeds
      .filter((bed) => !allocatedBedIdSet.has(Number(bed.dbId)))
      .slice()
      .sort((a, b) => {
        const wardCmp = String(a.ward ?? '').localeCompare(String(b.ward ?? ''));
        if (wardCmp !== 0) return wardCmp;
        return String(a.bedNo ?? '').localeCompare(String(b.bedNo ?? ''), undefined, {
          numeric: true,
        });
      });
  }, [allBeds, allocatedBedIdSet]);

  const assignedBeds = useMemo(() => {
    const items = allocationsData?.items ?? [];
    return items
      .slice()
      .sort((a, b) => {
        const wardCmp = String(a.wardName ?? '').localeCompare(String(b.wardName ?? ''));
        if (wardCmp !== 0) return wardCmp;
        return String(a.bedNumber ?? '').localeCompare(String(b.bedNumber ?? ''), undefined, {
          numeric: true,
        });
      });
  }, [allocationsData?.items]);

  const onDutyIds = useMemo(
    () => new Set(rosterItems.map((r) => Number(r.nurse_id)).filter(Number.isFinite)),
    [rosterItems],
  );

  const offDutyNurses = useMemo(() => {
    const staff = staffData?.staff ?? staffData?.items ?? [];
    return staff.filter((n) => !onDutyIds.has(Number(n.id ?? n.user_id)));
  }, [staffData, onDutyIds]);

  const currentShiftRoster = useMemo(() => {
    const shift = String(data?.current_shift ?? '').trim().toLowerCase();
    if (!shift) return rosterItems;
    return rosterItems.filter((row) => {
      const name = String(row.shift_name ?? row.shift ?? '').trim().toLowerCase();
      return name === shift || name.includes(shift) || shift.includes(name);
    });
  }, [rosterItems, data?.current_shift]);

  const panelCopy = useMemo(
    () => ({
      [FILTERS.ON_DUTY]: {
        title: 'On duty nurses',
        empty: `No nurses are rostered on duty for ${dayLabel || 'today'}.`,
      },
      [FILTERS.OFF_DUTY]: {
        title: 'Off duty nurses',
        empty: `All active nurses are on duty for ${dayLabel || 'today'}.`,
      },
      [FILTERS.BEDS_ASSIGNED]: {
        title: 'Beds assigned',
        empty: 'No beds are currently assigned to nurses.',
      },
      [FILTERS.BEDS_UNASSIGNED]: {
        title: 'Beds unassigned',
        empty: 'All beds currently have a nurse assignment.',
      },
      [FILTERS.CURRENT_SHIFT]: {
        title: 'Current shift roster',
        empty: 'No nurses rostered for the current shift.',
      },
    }),
    [dayLabel],
  );

  const selectFilter = (id) => {
    setActiveFilter((prev) => (prev === id ? FILTERS.ON_DUTY : id));
  };

  const activePanel = panelCopy[activeFilter] ?? panelCopy[FILTERS.ON_DUTY];
  const panelLoading =
    (needRoster && rosterLoading) ||
    (needStaff && staffLoading) ||
    (needBedPanels && (bedsLoading || allocationsLoading));

  const kpis = [
    {
      id: FILTERS.ON_DUTY,
      title: 'On Duty',
      value: data?.nurses_on_duty ?? '—',
      subtitle: dayLabel || undefined,
      icon: <UserCheck size={18} />,
      tone: 'success',
    },
    {
      id: FILTERS.OFF_DUTY,
      title: 'Off Duty',
      value: data?.nurses_off_duty ?? '—',
      subtitle: dayLabel || undefined,
      icon: <Users size={18} />,
      tone: 'neutral',
    },
    {
      id: FILTERS.BEDS_ASSIGNED,
      title: 'Beds Assigned',
      value: data?.beds_assigned ?? '—',
      subtitle: 'Currently active',
      icon: <BedDouble size={18} />,
      tone: 'info',
    },
    {
      id: FILTERS.BEDS_UNASSIGNED,
      title: 'Beds Unassigned',
      value: data?.beds_unassigned ?? '—',
      subtitle: 'No nurse assigned',
      icon: <BedDouble size={18} />,
      tone: 'neutral',
    },
    {
      id: FILTERS.CURRENT_SHIFT,
      title: 'Current Shift',
      value: data?.current_shift ?? '—',
      subtitle:
        formatShiftTimeRange(data?.current_shift_start, data?.current_shift_end) || undefined,
      icon: <CalendarDays size={18} />,
      tone: 'info',
    },
  ];

  const renderEmptyRow = (colSpan, message) => (
    <tr className="nwf-table__empty-row">
      <td colSpan={colSpan} className="nwf-empty-cell">
        {message}
      </td>
    </tr>
  );

  const renderPanelBody = () => {
    if (activeFilter === FILTERS.ON_DUTY) {
      return (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Nurse</th>
              <th>Shift</th>
              <th>From</th>
              <th>To</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {!rosterItems.length
              ? renderEmptyRow(5, activePanel.empty)
              : rosterItems.map((row) => {
                const period = getRosterPeriod(row);
                return (
                  <tr key={row.id ?? `${row.nurse_id}-${row.shift_id}`}>
                    <td>{displayName(row)}</td>
                    <td>{formatShiftLabel(row.shift_name, row.start_time, row.end_time)}</td>
                    <td>{formatDashboardDate(period.from) || '—'}</td>
                    <td>{formatDashboardDate(period.to) || '—'}</td>
                    <td>
                      <span className="nwf-badge nwf-badge--balanced">{row.status ?? 'scheduled'}</span>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      );
    }

    if (activeFilter === FILTERS.OFF_DUTY) {
      return (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Nurse</th>
              <th>Email</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {!offDutyNurses.length
              ? renderEmptyRow(3, activePanel.empty)
              : offDutyNurses.map((row) => (
                <tr key={row.id ?? row.user_id}>
                  <td>{displayName(row)}</td>
                  <td>{row.email ?? '—'}</td>
                  <td>
                    <span className="nwf-badge nwf-badge--balanced">
                      {row.is_active === false ? 'Inactive' : 'Active'}
                    </span>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      );
    }

    if (activeFilter === FILTERS.BEDS_ASSIGNED) {
      return (
        <>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Ward</th>
                <th>Bed Number</th>
                <th>Nurse</th>
                <th>Assigned From</th>
                <th>Assigned Till</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {!assignedBeds.length
                ? renderEmptyRow(6, activePanel.empty)
                : assignedBeds.map((row) => (
                  <tr key={row.id ?? `${row.bedId}-${row.nurseId}`}>
                    <td>{row.wardName || '—'}</td>
                    <td>{row.bedNumber || '—'}</td>
                    <td>{row.nurseName || '—'}</td>
                    <td>{formatAllocationDate(row.shiftDate)}</td>
                    <td>{formatAssignedUntil(row.assignedUntil, row.isActive)}</td>
                    <td>
                      <span className="nwf-badge nwf-badge--balanced">
                        {row.isActive ? 'Assigned' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
          {!assignedBeds.length ? (
            <p className="nwf-panel__hint">
              Beds stay assigned until an admin changes them.{' '}
              <Link to={ROUTES.ADMIN_BED_ALLOCATION_NEW}>Create an allocation</Link>
              {' '}or open{' '}
              <Link to={ROUTES.ADMIN_BED_ALLOCATION}>Nurse Bed Allocation</Link>.
            </p>
          ) : null}
        </>
      );
    }

    if (activeFilter === FILTERS.BEDS_UNASSIGNED) {
      return (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Ward</th>
              <th>Bed Number</th>
              <th>Status</th>
              <th>Patient</th>
            </tr>
          </thead>
          <tbody>
            {!unassignedBeds.length
              ? renderEmptyRow(4, activePanel.empty)
              : unassignedBeds.map((bed) => (
                <tr key={bed.dbId ?? `${bed.ward}-${bed.bedNo}`}>
                  <td>{bed.ward || '—'}</td>
                  <td>{bed.bedNo || '—'}</td>
                  <td>{bed.status || '—'}</td>
                  <td>{bed.patientName || '—'}</td>
                </tr>
              ))}
          </tbody>
        </table>
      );
    }

    if (activeFilter === FILTERS.CURRENT_SHIFT) {
      return (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Nurse</th>
              <th>Shift</th>
              <th>From</th>
              <th>To</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {!currentShiftRoster.length
              ? renderEmptyRow(5, activePanel.empty)
              : currentShiftRoster.map((row) => {
                const period = getRosterPeriod(row);
                return (
                  <tr key={row.id ?? `${row.nurse_id}-${row.shift_id}`}>
                    <td>{displayName(row)}</td>
                    <td>
                      {formatShiftLabel(
                        row.shift_name ?? data?.current_shift,
                        row.start_time ?? data?.current_shift_start,
                        row.end_time ?? data?.current_shift_end,
                      )}
                    </td>
                    <td>{formatDashboardDate(period.from) || '—'}</td>
                    <td>{formatDashboardDate(period.to) || '—'}</td>
                    <td>
                      <span className="nwf-badge nwf-badge--balanced">{row.status ?? 'scheduled'}</span>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      );
    }

    return null;
  };

  if (!canView) {
    return (
      <AdminLayout pageTitle="Nurse Workforce">
        <AdminEmptyState
          title="Access denied"
          description="You need workforce:view permission."
        />
      </AdminLayout>
    );
  }

  return (
    <AdminLayout pageTitle="Nurse Workforce">
      <div className="admin-page nwf-page">
        <NurseWorkforceNav />

        <QueryFeedback isLoading={isLoading} isError={isError} error={error} onRetry={refetch}>
          <div className="nwf-stats nwf-stats--five" role="tablist" aria-label="Workforce filters">
            {kpis.map((kpi) => (
              <AdminStatCard
                key={kpi.id}
                title={kpi.title}
                value={kpi.value}
                subtitle={kpi.subtitle}
                icon={kpi.icon}
                tone={kpi.tone}
                isLoading={isLoading}
                isActive={activeFilter === kpi.id}
                onClick={() => selectFilter(kpi.id)}
              />
            ))}
          </div>

          <section className="nwf-panel">
            <div className="nwf-panel__header">
              <h2 className="admin-card__title">{activePanel.title}</h2>
              {activeFilter !== FILTERS.ON_DUTY ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveFilter(FILTERS.ON_DUTY)}
                >
                  Reset filter
                </Button>
              ) : null}
            </div>
            <div className="admin-table-wrap">
              {panelLoading ? (
                <p className="nwf-empty-cell">Loading…</p>
              ) : (
                renderPanelBody()
              )}
            </div>
          </section>
        </QueryFeedback>
      </div>
    </AdminLayout>
  );
}
