// Calendar dates are handled as local "YYYY-MM-DD" strings so IST users never see a UTC day shift.

export const PERIOD_PRESETS = [
  ["today", "Today"],
  ["week", "This Week"],
  ["month", "This Month"],
  ["lastMonth", "Last Month"],
  ["quarter", "This Quarter"],
  ["custom", "Custom Range"],
];

export function toDay(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function fromDay(day) {
  const [year, month, date] = day.split("-").map(Number);
  return new Date(year, month - 1, date);
}

export function localDay(value) {
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value).slice(0, 10) : toDay(date);
}

export function shiftDays(day, days) {
  const date = fromDay(day);
  date.setDate(date.getDate() + days);
  return toDay(date);
}

function monthStart(year, month) {
  return toDay(new Date(year, month, 1));
}

function monthEnd(year, month) {
  return toDay(new Date(year, month + 1, 0));
}

export function daysBetween(start, end) {
  return Math.round((fromDay(end) - fromDay(start)) / 86400000);
}

function minDay(a, b) {
  return a < b ? a : b;
}

function formatDay(day, withYear) {
  return fromDay(day).toLocaleDateString("en-IN", { day: "numeric", month: "short", ...(withYear ? { year: "numeric" } : {}) });
}

export function formatRange({ start, end }) {
  if (start === end) return formatDay(start, true);
  return `${formatDay(start, start.slice(0, 4) !== end.slice(0, 4))} – ${formatDay(end, true)}`;
}

/**
 * Resolves a preset into the selected range and the previous equivalent range used for comparisons.
 * Ranges are inclusive.
 */
export function resolvePeriod(preset, custom, today) {
  const now = fromDay(today);
  const year = now.getFullYear();
  const month = now.getMonth();

  if (preset === "today") {
    const yesterday = shiftDays(today, -1);
    return build(today, today, yesterday, yesterday, "vs yesterday");
  }
  if (preset === "week") {
    const start = shiftDays(today, -((now.getDay() + 6) % 7));
    return build(start, today, shiftDays(start, -7), shiftDays(today, -7), "vs same days last week");
  }
  if (preset === "month") {
    const start = monthStart(year, month);
    const prevStart = monthStart(year, month - 1);
    const prevEnd = minDay(shiftDays(prevStart, now.getDate() - 1), monthEnd(year, month - 1));
    return build(start, today, prevStart, prevEnd, "vs same days last month");
  }
  if (preset === "lastMonth") {
    return build(monthStart(year, month - 1), monthEnd(year, month - 1), monthStart(year, month - 2), monthEnd(year, month - 2), "vs the month before");
  }
  if (preset === "quarter") {
    const quarterMonth = Math.floor(month / 3) * 3;
    const start = monthStart(year, quarterMonth);
    const prevStart = monthStart(year, quarterMonth - 3);
    const prevEnd = minDay(shiftDays(prevStart, daysBetween(start, today)), shiftDays(start, -1));
    return build(start, today, prevStart, prevEnd, "vs same point last quarter");
  }

  let start = custom?.start || today;
  let end = custom?.end || today;
  if (start > end) [start, end] = [end, start];
  const length = daysBetween(start, end) + 1;
  return build(start, end, shiftDays(start, -length), shiftDays(start, -1), `vs previous ${length} day${length === 1 ? "" : "s"}`);
}

function build(start, end, prevStart, prevEnd, compareLabel) {
  return { start, end, previous: { start: prevStart, end: prevEnd }, compareLabel };
}

export function inRange(day, range) {
  return Boolean(day) && day >= range.start && day <= range.end;
}

/** The last `count` calendar months ending with the month of `endDay`. */
export function trailingMonths(endDay, count = 6) {
  const end = fromDay(endDay);
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(end.getFullYear(), end.getMonth() - (count - 1 - index), 1);
    return {
      key: toDay(date).slice(0, 7),
      label: date.toLocaleDateString("en-IN", { month: "short", year: "2-digit" }),
      start: monthStart(date.getFullYear(), date.getMonth()),
      end: monthEnd(date.getFullYear(), date.getMonth()),
    };
  });
}
