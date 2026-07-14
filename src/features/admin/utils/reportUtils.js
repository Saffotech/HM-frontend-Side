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

export function formatCurrency(amount) {
  const value = Number(amount);
  if (!Number.isFinite(value)) return '—';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
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
 * Visit paid_amount can exceed billed totals; PaymentTransaction sums are the reliable collected amount.
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

  return {
    ...data,
    total_revenue: billed,
    collected_revenue: Math.round(collected * 100) / 100,
  };
}

