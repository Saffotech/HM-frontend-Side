import { getTodayRangeIso } from '@/shared/utils/opdDates';

/** Prefer single `date` (YYYY-MM-DD) over datetime range — matches backend appointment_date alias. */
export function normalizeAppointmentListParams(params = {}) {
  const next = { ...params };
  const fromDay = typeof next.date_from === 'string' ? next.date_from.slice(0, 10) : null;
  const toDay = typeof next.date_to === 'string' ? next.date_to.slice(0, 10) : null;

  if (!next.date && fromDay && toDay && fromDay === toDay) {
    next.date = fromDay;
    delete next.date_from;
    delete next.date_to;
  }

  return next;
}

/** Bare-minimum paging — used when date/list_filter/sort trigger server errors. */
export function minimalAppointmentListParams(params = {}) {
  return {
    page: params.page ?? 1,
    limit: params.limit ?? 50,
  };
}

/** Minimal params when the full filter set triggers a server error. */
export function simplifyAppointmentListParams(params = {}) {
  const normalized = normalizeAppointmentListParams(params);
  const {
    date_from: _df,
    date_to: _dt,
    list_filter: _lf,
    sort: _sort,
    order: _order,
    status: _status,
    ...rest
  } = normalized;

  return {
    page: rest.page ?? 1,
    limit: rest.limit ?? 50,
    date: rest.date ?? getTodayRangeIso().dateKey,
    search: rest.search,
    patient_id: rest.patient_id,
    doctor_id: rest.doctor_id,
    department_id: rest.department_id,
  };
}
