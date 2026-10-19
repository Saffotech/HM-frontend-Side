export function toYmd(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function defaultReportDateRange() {
  const today = new Date();
  const from = new Date(today.getFullYear(), today.getMonth(), 1);
  return {
    from_date: toYmd(from),
    to_date: toYmd(today),
  };
}

export function formatReportDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Normalize payment metrics from GET /admin/reports/overview.
 * Collected uses PaymentTransaction totals when present.
 * Outstanding is unpaid money from the backend (per-visit, never negative).
 */
export function normalizeReportsOverviewPayments(data) {
  if (!data) return data;

  const billed = Number(data.total_revenue) || 0;
  const paidOnVisits = Number(data.collected_revenue) || 0;
  const modes = data.revenue_by_payment_mode ?? [];
  const collectedFromTxns = modes.reduce(
    (sum, row) => sum + (Number(row.total_amount) || 0),
    0,
  );

  const hasTxnBreakdown = modes.length > 0;
  const collected = hasTxnBreakdown
    ? collectedFromTxns
    : Math.min(paidOnVisits, billed || paidOnVisits);

  const backendOutstanding = Number(data.outstanding_revenue);
  const outstanding = Number.isFinite(backendOutstanding)
    ? Math.max(0, backendOutstanding)
    : 0;

  return {
    ...data,
    total_revenue: billed,
    collected_revenue: Math.round(collected * 100) / 100,
    outstanding_revenue: Math.round(outstanding * 100) / 100,
  };
}

export function emptyReportsOverview(extras = {}) {
  return {
    from_date: extras.from_date ?? null,
    to_date: extras.to_date ?? null,
    total_patients: Number(extras.total_patients) || 0,
    new_patients_in_period: 0,
    total_visits: 0,
    completed_visits: 0,
    pending_payments: 0,
    total_revenue: 0,
    collected_revenue: 0,
    outstanding_revenue: 0,
    visits_by_department: [],
    revenue_by_payment_mode: [],
    source: extras.source,
  };
}

function reportedReportSource(data) {
  return String(data?.source || data?.scope || '').toLowerCase();
}

function rowReportSource(row) {
  return String(row?.source || '').toLowerCase();
}

/**
 * Legacy reports APIs have no `source` and are OPD-only.
 * IPD (and All, once the API echoes `source`) is trusted only when the payload
 * is explicitly scoped — so OPD numbers are never painted as IPD.
 */
export function isReportsPayloadForSource(data, source) {
  if (!data) return false;
  const requested = String(source || 'opd').toLowerCase();
  const reported = reportedReportSource(data);
  if (reported) return reported === requested;

  if (requested === 'opd') return true;
  if (requested === 'all') return true;

  const rows = data.visits;
  if (Array.isArray(rows) && rows.some((row) => rowReportSource(row) === 'ipd')) {
    return requested === 'ipd';
  }
  return false;
}

function withActiveBreakdowns(overview) {
  if (!overview) return overview;
  return {
    ...overview,
    visits_by_department: (overview.visits_by_department ?? []).filter(
      (row) => Number(row.visit_count) > 0,
    ),
    revenue_by_payment_mode: (overview.revenue_by_payment_mode ?? []).filter(
      (row) => Number(row.total_amount) > 0 || Number(row.transaction_count) > 0,
    ),
  };
}

/**
 * Scope overview KPIs/charts to the selected source.
 * If IPD is selected but the API still returns unscoped OPD data, show empty.
 * When the backend adds `source: "ipd" | "all" | "opd"`, this passes through.
 */
export function scopeReportsOverview(data, source) {
  const requested = String(source || 'opd').toLowerCase();
  if (!data) return emptyReportsOverview({ source: requested });

  if (isReportsPayloadForSource(data, requested)) {
    return withActiveBreakdowns(normalizeReportsOverviewPayments(data));
  }

  return withActiveBreakdowns(
    emptyReportsOverview({
      source: requested,
      from_date: data.from_date,
      to_date: data.to_date,
      total_patients: data.total_patients,
    }),
  );
}

/**
 * Scope the visit/admission ledger to the selected source.
 * Unscoped (legacy) rows are treated as OPD. IPD with no IPD-tagged rows is empty.
 */
export function scopeReportsVisits(data, source) {
  const requested = String(source || 'opd').toLowerCase();
  const visits = data?.visits ?? [];
  const total = data?.total ?? visits.length;

  if (requested === 'ipd') {
    if (!isReportsPayloadForSource(data, 'ipd')) {
      return { visits: [], total: 0 };
    }
    const scoped = visits.filter((row) => rowReportSource(row) === 'ipd');
    const usedAllRows = scoped.length === visits.length;
    return { visits: scoped, total: usedAllRows ? total : scoped.length };
  }

  if (requested === 'opd') {
    const hasExplicitSource = visits.some((row) => rowReportSource(row));
    if (!hasExplicitSource) return { visits, total };
    const scoped = visits.filter((row) => rowReportSource(row) !== 'ipd');
    const usedAllRows = scoped.length === visits.length;
    return { visits: scoped, total: usedAllRows ? total : scoped.length };
  }

  return { visits, total };
}

