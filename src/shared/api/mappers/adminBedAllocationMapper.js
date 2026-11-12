/**
 * Admin bed allocation API ↔ UI adapters.
 * Backend is source of truth; map contracts here only.
 */

/** Inclusive ISO dates from `from` through `to` (YYYY-MM-DD). */
export function eachIsoDate(from, to) {
  if (!from || !to || to < from) return [];
  const [fy, fm, fd] = from.split('-').map(Number);
  const [ty, tm, td] = to.split('-').map(Number);
  if (![fy, fm, fd, ty, tm, td].every(Number.isFinite)) return [];
  const cursor = new Date(Date.UTC(fy, fm - 1, fd));
  const end = new Date(Date.UTC(ty, tm - 1, td));
  const dates = [];
  while (cursor <= end && dates.length < 400) {
    const y = cursor.getUTCFullYear();
    const m = String(cursor.getUTCMonth() + 1).padStart(2, '0');
    const d = String(cursor.getUTCDate()).padStart(2, '0');
    dates.push(`${y}-${m}-${d}`);
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}

export function normalizeShiftName(name) {
  return String(name ?? '').trim().toLowerCase();
}

/** True when [from, until] overlaps [otherFrom, otherUntil]. A blank end is open-ended. */
export function allocationRangesOverlap(from, until, otherFrom, otherUntil) {
  const startA = String(from ?? '').slice(0, 10);
  const startB = String(otherFrom ?? '').slice(0, 10);
  if (!startA || !startB) return false;
  const endA = until ? String(until).slice(0, 10) : '9999-12-31';
  const endB = otherUntil ? String(otherUntil).slice(0, 10) : '9999-12-31';
  return startA <= endB && startB <= endA;
}

const ROSTER_ASSIGNABLE = new Set(['scheduled', 'completed']);

/** Roster shifts for one nurse on one date. Scheduled and completed both count. */
export function rosterShiftsForNurseOnDate(rosterItems, nurseId, date) {
  const wantedId = Number(nurseId);
  const day = String(date ?? '').slice(0, 10);
  if (!Number.isFinite(wantedId) || !day) return [];
  const byName = new Map();
  for (const row of rosterItems ?? []) {
    if (Number(row.nurse_id) !== wantedId) continue;
    if (String(row.roster_date ?? '').slice(0, 10) !== day) continue;
    if (!ROSTER_ASSIGNABLE.has(String(row.status ?? '').toLowerCase())) continue;
    const name = String(row.shift_name ?? '').trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if (!byName.has(key)) {
      byName.set(key, {
        name,
        start: row.start_time ?? null,
        end: row.end_time ?? null,
        color: row.shift_color || '#0f766e',
      });
    }
  }
  return Array.from(byName.values());
}

/**
 * Beds already taken for this shift on an overlapping date range.
 * A Morning allocation does not block an Evening selection.
 */
export function bedIdsTakenForShift(items, { shiftName, from, until } = {}) {
  const wanted = normalizeShiftName(shiftName);
  if (!wanted || !from) return [];
  const ids = new Set();
  for (const row of items ?? []) {
    if (row?.isActive === false) continue;
    const rowShift = row?.shiftName ?? row?.shift_name;
    if (normalizeShiftName(rowShift) !== wanted) continue;
    const rowFrom = row.shiftDate ?? row.shift_date;
    const rowUntil = row.assignedUntil ?? row.assigned_until ?? null;
    if (!allocationRangesOverlap(rowFrom, rowUntil, from, until || from)) continue;
    const bedId = Number(row.bedId ?? row.bed_id);
    if (Number.isFinite(bedId)) ids.add(bedId);
  }
  return Array.from(ids);
}

/** Nurse ids rostered on every date in the range. Scheduled and completed both count. */
export function confirmedNurseIdsForRange(rosterItems, from, to) {
  const needed = eachIsoDate(from, to);
  const allowed = new Set();
  if (!needed.length) return allowed;
  const byNurse = new Map();
  for (const row of rosterItems ?? []) {
    if (!ROSTER_ASSIGNABLE.has(String(row.status ?? '').toLowerCase())) continue;
    const id = Number(row.nurse_id);
    const day = String(row.roster_date ?? '').slice(0, 10);
    if (!Number.isFinite(id) || !day) continue;
    if (!byNurse.has(id)) byNurse.set(id, new Set());
    byNurse.get(id).add(day);
  }
  for (const [id, days] of byNurse) {
    if (needed.every((day) => days.has(day))) allowed.add(id);
  }
  return allowed;
}

export function mapAllocationItem(row) {
  if (!row) return null;
  return {
    id: row.id,
    nurseId: row.nurse_id,
    nurseName: row.nurse_name || `Nurse #${row.nurse_id}`,
    nurseEmail: row.nurse_email || '',
    bedId: row.bed_id,
    bedNumber: row.bed_number || '—',
    wardName: row.ward_name || '—',
    shiftDate: row.shift_date,
    assignedUntil: row.assigned_until ?? row.assignedUntil ?? null,
    shiftName: row.shift_name,
    shiftStart: row.shift_start,
    shiftEnd: row.shift_end,
    departmentId: row.department_id ?? null,
    departmentName: row.department_name || '—',
    assignedBy: row.assigned_by ?? null,
    assignedByName: row.assigned_by_name || '—',
    notes: row.notes || '',
    isActive: Boolean(row.is_active),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    // List display helpers
    allocatedBedsLabel: row.bed_number
      ? `${row.bed_number}${row.ward_name ? ` (${row.ward_name})` : ''}`
      : '—',
    totalBeds: 1,
    allocationIds: row.id != null ? [row.id] : [],
    isGroup: false,
  };
}

/** Parse "G-101" → { prefix: "G-", num: 101 } when possible. */
function parseBedToken(bedNumber) {
  const raw = String(bedNumber ?? '').trim();
  const match = raw.match(/^(.*?)(\d+)$/);
  if (!match) return { prefix: raw, num: null, raw };
  return { prefix: match[1], num: Number(match[2]), raw };
}

/**
 * Format beds for a group:
 * same ward + consecutive numbers → "G-101 – G-103 (General)"
 * otherwise → "G-101, G-102, G-104 (General)"
 */
export function formatGroupedBedsLabel(items) {
  if (!items?.length) return '—';

  const byWard = new Map();
  for (const item of items) {
    const ward = item.wardName || '—';
    if (!byWard.has(ward)) byWard.set(ward, []);
    byWard.get(ward).push(item);
  }

  const parts = [];
  for (const [ward, wardItems] of byWard) {
    const parsed = wardItems
      .map((i) => ({ ...parseBedToken(i.bedNumber), item: i }))
      .sort((a, b) => {
        if (a.prefix !== b.prefix) return String(a.prefix).localeCompare(String(b.prefix));
        if (a.num != null && b.num != null) return a.num - b.num;
        return String(a.raw).localeCompare(String(b.raw), undefined, { numeric: true });
      });

    let bedText;
    const first = parsed[0];
    const last = parsed[parsed.length - 1];
    const samePrefix = parsed.every((p) => p.prefix === first.prefix);
    const allNumeric = parsed.every((p) => p.num != null);
    let consecutive = false;
    if (samePrefix && allNumeric && parsed.length > 1) {
      consecutive = true;
      for (let i = 1; i < parsed.length; i += 1) {
        if (parsed[i].num !== parsed[i - 1].num + 1) {
          consecutive = false;
          break;
        }
      }
    }

    if (consecutive) {
      bedText = `${first.raw} – ${last.raw}`;
    } else {
      bedText = parsed.map((p) => p.raw).join(', ');
    }

    parts.push(ward && ward !== '—' ? `${bedText} (${ward})` : bedText);
  }

  return parts.join('; ');
}

function groupKey(item) {
  // One list row per nurse, shift, and active/inactive.
  // Morning and Evening for the same nurse stay separate.
  const shift = normalizeShiftName(item.shiftName);
  return [item.nurseId ?? '', item.isActive ? '1' : '0', shift].join('|');
}

/** Collapse one-row-per-bed into one row per nurse and shift. */
export function groupAllocationListItems(items) {
  if (!items?.length) return [];

  const groups = new Map();
  for (const item of items) {
    const key = groupKey(item);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  }

  return Array.from(groups.values()).map((group) => {
    const sorted = group.slice().sort((a, b) => {
      const wardCmp = String(a.wardName ?? '').localeCompare(String(b.wardName ?? ''));
      if (wardCmp !== 0) return wardCmp;
      return String(a.bedNumber ?? '').localeCompare(String(b.bedNumber ?? ''), undefined, {
        numeric: true,
      });
    });
    const primary = sorted[0];
    const ids = sorted.map((r) => r.id).filter((id) => id != null);
    const idLabel =
      ids.length <= 1
        ? String(ids[0] ?? primary.id)
        : ids.every((id, i) => i === 0 || id === ids[i - 1] + 1)
          ? `${ids[0]}–${ids[ids.length - 1]}`
          : ids.join(', ');

    let assignedUntil = null;
    for (const r of sorted) {
      if (!r.assignedUntil) continue;
      if (!assignedUntil || String(r.assignedUntil) > String(assignedUntil)) {
        assignedUntil = r.assignedUntil;
      }
    }

    return {
      ...primary,
      id: primary.id,
      idLabel,
      assignedUntil,
      allocationIds: ids,
      isGroup: ids.length > 1,
      allocatedBedsLabel: formatGroupedBedsLabel(sorted),
      totalBeds: sorted.length,
      bedIds: sorted.map((r) => r.bedId).filter(Boolean),
      beds: sorted.map((r) => ({
        id: r.id,
        bedId: r.bedId,
        bedNumber: r.bedNumber,
        wardName: r.wardName,
        assignedUntil: r.assignedUntil,
        isActive: r.isActive,
      })),
    };
  });
}

export function mapAllocationListResponse(raw) {
  if (!raw) {
    return { items: [], total: 0, page: 1, page_size: 20, success: true };
  }
  const items = (raw.items ?? []).map(mapAllocationItem).filter(Boolean);
  return {
    success: raw.success !== false,
    items,
    total: raw.total ?? items.length,
    page: raw.page ?? 1,
    page_size: raw.page_size ?? 20,
  };
}

export function mapAllocationDetailResponse(raw) {
  const data = raw?.data ?? raw;
  return {
    success: raw?.success !== false,
    data: mapAllocationItem(data),
  };
}

export function toCreateAllocationBody(form) {
  const body = {
    nurse_id: Number(form.nurseId),
    bed_id: Number(form.bedId),
    shift_date: form.shiftDate,
    assigned_until: form.assignedUntil || null,
    department_id: form.departmentId ? Number(form.departmentId) : null,
    notes: form.notes?.trim() || null,
  };
  if (form.shiftName) body.shift_name = form.shiftName;
  if (form.shiftStart) body.shift_start = form.shiftStart;
  if (form.shiftEnd) body.shift_end = form.shiftEnd;
  return body;
}

export function toBulkCreateAllocationBody(form) {
  const body = {
    nurse_id: Number(form.nurseId),
    bed_ids: (form.bedIds ?? []).map(Number),
    shift_date: form.shiftDate,
    assigned_until: form.assignedUntil || null,
    department_id: form.departmentId ? Number(form.departmentId) : null,
    notes: form.notes?.trim() || null,
  };
  if (form.shiftName) body.shift_name = form.shiftName;
  if (form.shiftStart) body.shift_start = form.shiftStart;
  if (form.shiftEnd) body.shift_end = form.shiftEnd;
  return body;
}

export function toUpdateAllocationBody(form) {
  const body = {};
  if (form.nurseId != null && form.nurseId !== '') body.nurse_id = Number(form.nurseId);
  if (form.bedId != null && form.bedId !== '') body.bed_id = Number(form.bedId);
  if (form.shiftDate) body.shift_date = form.shiftDate;
  if (form.assignedUntil !== undefined) {
    body.assigned_until = form.assignedUntil || null;
  }
  if (form.shiftName) body.shift_name = form.shiftName;
  if (form.shiftStart !== undefined) body.shift_start = form.shiftStart || null;
  if (form.shiftEnd !== undefined) body.shift_end = form.shiftEnd || null;
  if (form.departmentId !== undefined) {
    body.department_id = form.departmentId ? Number(form.departmentId) : null;
  }
  if (form.notes !== undefined) body.notes = form.notes?.trim() || null;
  if (typeof form.isActive === 'boolean') body.is_active = form.isActive;
  return body;
}

export function todayIsoDate() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function formatAllocationDateTime(value) {
  if (!value) return '—';
  try {
    const dt = new Date(value);
    if (Number.isNaN(dt.getTime())) return String(value);
    return dt.toLocaleString();
  } catch {
    return String(value);
  }
}

/** Format YYYY-MM-DD (or ISO datetime) for list display. */
export function formatAllocationDate(value) {
  if (!value) return '—';
  const raw = String(value).slice(0, 10);
  const d = new Date(`${raw}T12:00:00`);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatAssignedUntil(assignedUntil) {
  if (assignedUntil) return formatAllocationDate(assignedUntil);
  return '—';
}

export function formatShiftWithTime(shiftName, shiftStart, shiftEnd) {
  const name = shiftName || '—';
  const start = shiftStart ? String(shiftStart).slice(0, 5) : '';
  const end = shiftEnd ? String(shiftEnd).slice(0, 5) : '';
  if (start && end) return `${name} (${start}–${end})`;
  return name;
}
