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
  ...WEEKDAYS.map((d) => ({ value: d, label: d })),
];

export const MONTH_FILTER_OPTIONS = MONTHS;

export const YEAR_FILTER_OPTIONS = [
  { value: 'all', label: 'All years' },
  { value: 'current', label: 'Current year' },
  { value: 'previous', label: 'Previous year' },
  { value: 'custom', label: 'Custom year' },
];

export const DEFAULT_DATE_FILTERS = {
  day: 'all',
  month: 'all',
  year: 'all',
  customYear: String(new Date().getFullYear()),
};

/** Map EMR filter UI state → GET /patients query params (backend month is 1–12). */
export function buildDoctorPatientsQueryParams({ search = '', dateFilters = DEFAULT_DATE_FILTERS, page = 1, limit = 100 } = {}) {
  const params = { page, limit };
  const q = search.trim();
  if (q) params.search = q;

  if (dateFilters.month && dateFilters.month !== 'all') {
    params.month = Number(dateFilters.month) + 1;
  }

  const now = new Date();
  if (dateFilters.year === 'current') {
    params.year = now.getFullYear();
  } else if (dateFilters.year === 'previous') {
    params.year = now.getFullYear() - 1;
  } else if (dateFilters.year === 'custom') {
    const custom = Number(dateFilters.customYear);
    if (!Number.isNaN(custom)) params.year = custom;
  }

  return params;
}

function parseRegisteredDate(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function matchesPatientDateFilters(patient, filters) {
  const d = parseRegisteredDate(
    patient.scheduledAt ?? patient.visitAt ?? patient.registeredDate
  );
  if (!d) return true;

  if (filters.day && filters.day !== 'all') {
    if (WEEKDAYS[d.getDay()] !== filters.day) return false;
  }

  if (filters.month && filters.month !== 'all') {
    if (d.getMonth() !== Number(filters.month)) return false;
  }

  const y = d.getFullYear();
  const now = new Date();
  if (filters.year === 'current' && y !== now.getFullYear()) return false;
  if (filters.year === 'previous' && y !== now.getFullYear() - 1) return false;
  if (filters.year === 'custom') {
    const custom = Number(filters.customYear);
    if (!Number.isNaN(custom) && y !== custom) return false;
  }

  return true;
}
