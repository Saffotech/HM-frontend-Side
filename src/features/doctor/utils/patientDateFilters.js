const WEEKDAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

const MONTHS = [
  { value: 'all', label: 'All months' },
  { value: '0', label: 'January' },
  { value: '1', label: 'February' },
  { value: '2', label: 'March' },
  { value: '3', label: 'April' },
  { value: '4', label: 'May' },
  { value: '5', label: 'June' },
  { value: '6', label: 'July' },
  { value: '7', label: 'August' },
  { value: '8', label: 'September' },
  { value: '9', label: 'October' },
  { value: '10', label: 'November' },
  { value: '11', label: 'December' },
];

export const DAY_FILTER_OPTIONS = [
  { value: 'all', label: 'All days' },
  { value: 'today', label: 'Today' },
  ...WEEKDAYS.map((d) => ({ value: d, label: d })),
];

export const MONTH_FILTER_OPTIONS = MONTHS;

export const YEAR_FILTER_OPTIONS = [
  { value: 'all', label: 'All years' },
  { value: 'current', label: 'Current year' },
  { value: 'previous', label: 'Previous year' },
  { value: 'custom', label: 'Custom year' },
];

const CURRENT_YEAR = new Date().getFullYear();
const CUSTOM_YEAR_SPAN = 20;

/** Numeric years for the Custom year picker (e.g. 2026, 2025, …). */
export function buildCustomYearOptions(endYear = CURRENT_YEAR, span = CUSTOM_YEAR_SPAN) {
  const startYear = Math.max(1990, endYear - span + 1);
  const options = [];
  for (let y = endYear; y >= startYear; y -= 1) {
    options.push({ value: String(y), label: String(y) });
  }
  return options;
}

export const CUSTOM_YEAR_OPTIONS = buildCustomYearOptions();

export const DEFAULT_DATE_FILTERS = {
  day: 'all',
  month: 'all',
  year: 'all',
  customYear: String(CURRENT_YEAR),
};

function resolveFilterYear(dateFilters, now = new Date()) {
  if (dateFilters.year === 'current') return now.getFullYear();
  if (dateFilters.year === 'previous') return now.getFullYear() - 1;
  if (dateFilters.year === 'custom') {
    const custom = Number(String(dateFilters.customYear ?? '').trim());
    if (!Number.isFinite(custom) || custom < 1900 || custom > 2100) return null;
    return custom;
  }
  return null;
}

function toIsoDateLocal(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Map EMR filter UI state → GET /patients query params (backend month is 1–12). */
export function buildDoctorPatientsQueryParams({
  search = '',
  dateFilters = DEFAULT_DATE_FILTERS,
  page = 1,
  limit = 100,
} = {}) {
  const params = { page, limit, page_size: limit };
  const q = search.trim();
  if (q) params.search = q;

  const now = new Date();
  const year = resolveFilterYear(dateFilters, now);
  const monthSelected = dateFilters.month && dateFilters.month !== 'all';

  // Backend only applies month when year is also provided.
  if (monthSelected && year != null) {
    params.month = Number(dateFilters.month) + 1;
    params.year = year;
  } else if (year != null) {
    params.year = year;
  }

  if (dateFilters.day === 'today') {
    params.filter_date = toIsoDateLocal(now);
  }

  return params;
}

function parseVisitDate(dateStr) {
  if (!dateStr) return null;
  const raw = String(dateStr).trim();
  const isoDay = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoDay) {
    const d = new Date(Number(isoDay[1]), Number(isoDay[2]) - 1, Number(isoDay[3]));
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function matchesPatientDateFilters(patient, filters) {
  const d = parseVisitDate(
    patient.scheduledAt ?? patient.visitAt ?? patient.registeredDate
  );
  const hasActiveFilter =
    (filters.day && filters.day !== 'all')
    || (filters.month && filters.month !== 'all')
    || (filters.year && filters.year !== 'all');
  if (!d) return !hasActiveFilter;

  if (filters.day && filters.day !== 'all') {
    if (filters.day === 'today') {
      const now = new Date();
      if (
        d.getFullYear() !== now.getFullYear()
        || d.getMonth() !== now.getMonth()
        || d.getDate() !== now.getDate()
      ) {
        return false;
      }
    } else if (WEEKDAYS[d.getDay()] !== filters.day) {
      return false;
    }
  }

  if (filters.month && filters.month !== 'all') {
    if (d.getMonth() !== Number(filters.month)) return false;
  }

  const resolvedYear = resolveFilterYear(filters);
  if (resolvedYear != null && d.getFullYear() !== resolvedYear) return false;

  return true;
}
