import { useMemo } from 'react';
import {
  BedDouble,
  CalendarDays,
  Clock3,
  Moon,
  Sun,
  Sunset,
  UserRound,
} from 'lucide-react';

import NurseLayout from '@/features/nurse/components/NurseLayout';
import { QueryFeedback } from '@/shared/components/common';
import { useNurseMyDutyQuery } from '@/shared/hooks/queries/useNurseQuery';
import '@/features/nurse/styles/nurse-my-duty.css';

function todayIso() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function isTodayIso(value) {
  return Boolean(value) && String(value).slice(0, 10) === todayIso();
}

function formatDateShort(value) {
  if (!value) return '—';
  if (isTodayIso(value)) return 'Today';
  const d = new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

function formatDate(value) {
  if (!value) return '—';
  if (isTodayIso(value)) return 'Today';
  const d = new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatTime(value) {
  if (!value) return '—';
  const s = String(value);
  if (s.includes(':')) return s.slice(0, 5);
  return s;
}

function formatShiftTime(shiftStart, shiftEnd) {
  const start = formatTime(shiftStart);
  const end = formatTime(shiftEnd);
  if (start === '—' && end === '—') return '—';
  return `${start}–${end}`;
}

function formatDateRange(from, to) {
  if (!from && !to) return '—';
  if (from && to && from === to) return formatDateShort(from);
  if (from && to) return `${formatDateShort(from)} – ${formatDateShort(to)}`;
  return formatDateShort(from || to);
}

function formatAssignedUntil(value) {
  if (!value) return { label: 'Ongoing', ongoing: true };
  return { label: formatDateShort(value), ongoing: false };
}

function toMidnight(iso) {
  return new Date(`${String(iso).slice(0, 10)}T00:00:00`).getTime();
}

function dayCountInclusive(from, to) {
  if (!from || !to) return 1;
  const diff = Math.round((toMidnight(to) - toMidnight(from)) / 86400000);
  return Math.max(diff + 1, 1);
}

function shiftTone(shiftName) {
  const name = String(shiftName || '').toLowerCase();
  if (name.includes('morning')) return 'morning';
  if (name.includes('evening') || name.includes('afternoon')) return 'evening';
  if (name.includes('night')) return 'night';
  return 'default';
}

function ShiftIcon({ tone, size = 16 }) {
  if (tone === 'evening') return <Sunset size={size} aria-hidden />;
  if (tone === 'night') return <Moon size={size} aria-hidden />;
  return <Sun size={size} aria-hidden />;
}

function groupConsecutiveRosterDays(items = []) {
  const today = todayIso();
  // Upcoming = today + future only (never show past dates).
  const upcoming = (items ?? []).filter((row) => {
    const d = String(row?.roster_date ?? '').slice(0, 10);
    return d && d >= today;
  });

  const sorted = [...upcoming].sort((a, b) => {
    const da = toMidnight(a.roster_date);
    const db = toMidnight(b.roster_date);
    if (da !== db) return da - db;
    return String(a.shift_name ?? '').localeCompare(String(b.shift_name ?? ''));
  });

  const groups = [];
  for (const row of sorted) {
    const prev = groups[groups.length - 1];
    const sameShift = prev && String(prev.shift_name ?? '') === String(row.shift_name ?? '');
    const consecutive =
      prev &&
      row.roster_date &&
      prev.to_date &&
      (toMidnight(row.roster_date) - toMidnight(prev.to_date)) / 86400000 === 1;

    if (prev && sameShift && consecutive) {
      prev.to_date = row.roster_date;
      continue;
    }

    groups.push({
      id: `roster-group-${groups.length}`,
      from_date: row.roster_date,
      to_date: row.roster_date,
      shift_name: row.shift_name ?? null,
      shift_start: row.shift_start ?? row.start_time ?? null,
      shift_end: row.shift_end ?? row.end_time ?? null,
    });
  }

  return groups;
}

export default function NurseMyDutyPage() {
  const { data, isLoading, isError, error, refetch } = useNurseMyDutyQuery();

  const currentShift = data?.current_shift ?? {};
  const rosterPeriod = data?.roster_period ?? {};
  const myBeds = data?.my_beds ?? [];

  const rosterGroups = useMemo(
    () => groupConsecutiveRosterDays(data?.roster_items ?? []),
    [data?.roster_items],
  );

  const shiftName = currentShift?.shift_name || '—';
  const tone = shiftTone(shiftName);
  const shiftTime = formatShiftTime(currentShift.shift_start, currentShift.shift_end);
  const hasRosterPeriod = Boolean(rosterPeriod?.from_date || rosterPeriod?.to_date);
  const rosterLabel = hasRosterPeriod
    ? formatDateRange(rosterPeriod?.from_date, rosterPeriod?.to_date)
    : 'Not rostered today';

  return (
    <NurseLayout>
      <div className="nurse-page nurse-my-duty">
        <QueryFeedback isLoading={isLoading} isError={isError} error={error} onRetry={refetch}>
          <section
            className={`nurse-my-duty__hero nurse-my-duty__hero--${tone}`}
            aria-label="Current shift"
          >
            <div className="nurse-my-duty__hero-main">
              <div className="nurse-my-duty__hero-topline">
                <p className="nurse-my-duty__hero-label">
                  <ShiftIcon tone={tone} size={14} />
                  Current shift
                </p>
              </div>
              <h2 className="nurse-my-duty__shift-name">{shiftName}</h2>
              <p className="nurse-my-duty__shift-time">
                <Clock3 size={18} aria-hidden />
                {shiftTime}
              </p>
            </div>

            <div className="nurse-my-duty__hero-stats">
              <div className="nurse-my-duty__stat">
                <span className="nurse-my-duty__stat-label">Roster period</span>
                <span className="nurse-my-duty__stat-value">{rosterLabel}</span>
              </div>
              <div className="nurse-my-duty__stat">
                <span className="nurse-my-duty__stat-label">Beds allocated</span>
                <span className="nurse-my-duty__stat-value nurse-my-duty__stat-value--lg">
                  {myBeds.length}
                </span>
              </div>
            </div>
          </section>

          <section className="nurse-my-duty__section" aria-labelledby="my-duty-beds-heading">
            <div className="nurse-my-duty__section-head">
              <h3 id="my-duty-beds-heading" className="nurse-my-duty__section-title">
                <BedDouble size={18} aria-hidden />
                My Beds
                <span className="nurse-my-duty__count">{myBeds.length}</span>
              </h3>
            </div>

            {myBeds.length === 0 ? (
              <div className="nurse-my-duty__empty">
                <BedDouble size={28} aria-hidden />
                <p className="nurse-my-duty__empty-title">No beds assigned</p>
                <p className="nurse-my-duty__empty-text">
                  No active bed allocations for your current shift. Check with ward admin if you expected an assignment.
                </p>
              </div>
            ) : (
              <div className="nurse-my-duty__beds">
                {myBeds.map((bed) => {
                  const until = formatAssignedUntil(bed.assigned_until);
                  const occupied = Boolean(bed.is_occupied || bed.patient_name);
                  return (
                    <article
                      key={bed.id ?? `${bed.ward_name}-${bed.bed_number}`}
                      className={`nurse-my-duty__bed${
                        occupied ? ' nurse-my-duty__bed--occupied' : ' nurse-my-duty__bed--vacant'
                      }`}
                    >
                      <div className="nurse-my-duty__bed-top">
                        <div className="nurse-my-duty__bed-id">
                          <span className="nurse-my-duty__bed-icon">
                            <BedDouble size={18} aria-hidden />
                          </span>
                          <div>
                            <p className="nurse-my-duty__bed-number">{bed.bed_number || '—'}</p>
                            <p className="nurse-my-duty__bed-ward">{bed.ward_name || 'Ward —'}</p>
                          </div>
                        </div>
                        <span
                          className={`nurse-my-duty__status ${
                            occupied ? 'nurse-my-duty__status--occupied' : 'nurse-my-duty__status--vacant'
                          }`}
                        >
                          {occupied ? 'Occupied' : 'Vacant'}
                        </span>
                      </div>

                      <div
                        className={`nurse-my-duty__bed-patient${
                          occupied ? '' : ' nurse-my-duty__bed-patient--empty'
                        }`}
                      >
                        <UserRound size={14} aria-hidden />
                        {occupied ? bed.patient_name : 'No patient on this bed'}
                      </div>

                      <div className="nurse-my-duty__bed-dates">
                        <div className="nurse-my-duty__date-block">
                          <span className="nurse-my-duty__date-label">Assigned from</span>
                          <span className="nurse-my-duty__date-value">
                            {formatDateShort(bed.assigned_from ?? bed.shift_date)}
                          </span>
                        </div>
                        <div className="nurse-my-duty__date-block">
                          <span className="nurse-my-duty__date-label">Assigned till</span>
                          <span
                            className={`nurse-my-duty__date-value${
                              until.ongoing ? ' nurse-my-duty__date-value--ongoing' : ''
                            }`}
                          >
                            {until.label}
                          </span>
                        </div>
                      </div>

                      <div className="nurse-my-duty__bed-shift">
                        <Clock3 size={13} aria-hidden />
                        {bed.shift_name || shiftName}
                        {formatShiftTime(bed.shift_start, bed.shift_end) !== '—'
                          ? ` · ${formatShiftTime(bed.shift_start, bed.shift_end)}`
                          : ''}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          <section className="nurse-my-duty__section" aria-labelledby="my-duty-roster-heading">
            <div className="nurse-my-duty__section-head">
              <h3 id="my-duty-roster-heading" className="nurse-my-duty__section-title">
                <CalendarDays size={18} aria-hidden />
                Upcoming Roster
                <span className="nurse-my-duty__count">{rosterGroups.length}</span>
              </h3>
            </div>

            {rosterGroups.length === 0 ? (
              <div className="nurse-my-duty__empty">
                <CalendarDays size={28} aria-hidden />
                <p className="nurse-my-duty__empty-title">No roster entries</p>
                <p className="nurse-my-duty__empty-text">
                  No upcoming roster days found in the next two weeks.
                </p>
              </div>
            ) : (
              <div className="nurse-my-duty__roster">
                {rosterGroups.map((g) => {
                  const gTone = shiftTone(g.shift_name);
                  const days = dayCountInclusive(g.from_date, g.to_date);
                  return (
                    <div key={g.id} className="nurse-my-duty__roster-row">
                      <span
                        className={`nurse-my-duty__roster-accent nurse-my-duty__roster-accent--${gTone}`}
                        aria-hidden
                      />
                      <div className="nurse-my-duty__roster-body">
                        <p className="nurse-my-duty__roster-dates">
                          {formatDateRange(g.from_date, g.to_date)}
                        </p>
                        <p className="nurse-my-duty__roster-days">
                          {days} day{days === 1 ? '' : 's'}
                          {g.from_date ? ` · from ${formatDate(g.from_date)}` : ''}
                        </p>
                      </div>
                      <div className="nurse-my-duty__roster-side">
                        <span className={`nurse-my-duty__shift-badge nurse-my-duty__shift-badge--${gTone}`}>
                          {g.shift_name || 'Shift'}
                        </span>
                        <span className="nurse-my-duty__roster-time">
                          {formatShiftTime(g.shift_start, g.shift_end)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </QueryFeedback>
      </div>
    </NurseLayout>
  );
}
