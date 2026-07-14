/**
 * Unified queue status for receptionist Today's Queue.
 * Completed appointment → Completed
 * Paid (not completed) → Scheduled
 * Unpaid / pending payment → Pending
 */
export function deriveQueueDisplayStatus(appointmentStatus, paymentStatus) {
  const appt = String(appointmentStatus || '').toLowerCase();
  const payment = String(paymentStatus || '').toLowerCase();

  if (appt === 'completed') return 'completed';
  if (payment === 'paid') return 'scheduled';
  return 'pending';
}

/**
 * Map unified status filter → backend query params (server-side only).
 */
export function buildTodayQueueFilterParams(statusFilter) {
  if (statusFilter === 'scheduled') {
    return { status: 'scheduled', payment_status: 'paid' };
  }
  if (statusFilter === 'completed') {
    return { status: 'completed' };
  }
  if (statusFilter === 'pending') {
    return { payment_status: 'unpaid' };
  }
  return {};
}

/**
 * Map From/To date inputs → backend queue-history params.
 * One date only → single-day filter; both → inclusive range.
 */
export function buildQueueHistoryDateParams(dateFrom, dateTo) {
  const from = (dateFrom || '').trim();
  const to = (dateTo || '').trim();

  if (from && to) {
    const start = from <= to ? from : to;
    const end = from <= to ? to : from;
    return { date_from: start, date_to: end };
  }
  if (from) return { date: from };
  if (to) return { date: to };
  return {};
}
