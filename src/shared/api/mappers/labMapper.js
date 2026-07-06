/**
 * Lab technician order/report ↔ UI mapping.
 */

const IST_OFFSET = '+05:30';

function formatDateTime(raw) {
  if (!raw) return '—';
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return String(raw);
  return d.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDateOnly(raw) {
  if (!raw) return '';
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return String(raw).slice(0, 10);
  return d.toISOString().slice(0, 10);
}

function normalizePriority(priority) {
  if (!priority) return 'normal';
  return String(priority).toLowerCase() === 'urgent' ? 'urgent' : 'normal';
}

function priorityToApi(priority) {
  if (!priority || priority === 'all') return undefined;
  return priority === 'urgent' ? 'Urgent' : 'Normal';
}

export function apiToUiLabOrder(row) {
  if (!row) return null;
  return {
    id: row.id,
    appointmentId: row.appointment_id ?? row.appointmentId,
    patientId: row.patient_uhid ?? row.patient_uid ?? row.patientUid ?? String(row.patient_id ?? ''),
    patientDbId: row.patient_id ?? row.patientDbId,
    patientName: row.patient_name ?? row.patientName ?? '—',
    doctorId: row.doctor_id ?? row.doctorId,
    doctorName: row.doctor_name ?? row.doctorName ?? '—',
    testName: row.test_name ?? row.testName ?? '—',
    category: row.category ?? '—',
    priority: normalizePriority(row.priority),
    priorityLabel: row.priority ?? 'Normal',
    clinicalNotes: row.clinical_notes ?? row.clinicalNotes ?? '',
    status: row.status ?? 'ordered',
    requestedDate: formatDateOnly(row.created_at ?? row.createdAt),
    requestedAt: formatDateTime(row.created_at ?? row.createdAt),
    createdAt: row.created_at ?? row.createdAt,
    reportUploaded: row.report_uploaded ?? row.reportUploaded ?? false,
    report: row.report ?? null,
  };
}

export function apiToUiLabOrderDetail(row) {
  const base = apiToUiLabOrder(row);
  if (!base) return null;

  const report = row.report;
  const parameters = report?.parameters ?? row.parameters ?? [];

  return {
    ...base,
    sampleCollectedAt: toDatetimeLocalValue(report?.sample_collected_at ?? row.sample_collected_at),
    testPerformedAt: toDatetimeLocalValue(report?.test_performed_at ?? row.test_performed_at),
    remarks: report?.remarks ?? row.remarks ?? '',
    reportFileName: report?.file_name ?? row.file_name ?? null,
    parameters: parameters.map((p, i) => ({
      id: p.id ?? `p-${i}`,
      parameter_name: p.parameter_name ?? '',
      value: p.value ?? '',
      unit: p.unit ?? '',
      normal_range: p.normal_range ?? '',
      flag: p.flag ?? 'normal',
    })),
  };
}

export function apiToUiLabDashboard(raw) {
  const stats = raw ?? {};
  return {
    totalToday: stats.total_today ?? stats.totalToday ?? 0,
    pending: stats.pending ?? 0,
    sampleCollected: stats.sample_collected ?? stats.sampleCollected ?? 0,
    processing: stats.processing ?? 0,
    completedToday: stats.completed_today ?? stats.completedToday ?? 0,
    urgentPending: stats.urgent_pending ?? stats.urgentPending ?? 0,
  };
}

export function apiToUiLabReport(row) {
  if (!row) return null;
  const reportId = row.report_id ?? row.id;
  return {
    reportId: reportId != null ? `RPT-${reportId}` : '—',
    reportDbId: reportId,
    orderId: row.order_id ?? row.lab_test_order_id ?? row.orderId,
    patientId: row.patient_uhid ?? row.patient_uid ?? String(row.patient_id ?? ''),
    patientName: row.patient_name ?? row.patientName ?? '—',
    testName: row.test_name ?? row.testName ?? '—',
    doctorName: row.doctor_name ?? row.doctorName ?? row.uploaded_by_name ?? '—',
    uploadedByName: row.uploaded_by_name ?? row.uploadedByName ?? '—',
    uploadedDate: formatDateTime(row.uploaded_at ?? row.created_at ?? row.uploadedAt),
    uploadedAt: row.uploaded_at ?? row.created_at,
    status: row.status ?? 'completed',
    source: row.source ?? null,
    hasFile: Boolean(row.report_file ?? row.file_name),
  };
}

export function apiToUiLabReportDetail(row) {
  if (!row) return null;
  const order = row.order ?? {};
  return {
    reportId: row.id != null ? `RPT-${row.id}` : '—',
    reportDbId: row.id,
    orderId: row.lab_test_order_id ?? order.id,
    patientId: order.patient_uhid ?? order.patient_uid ?? '',
    patientName: order.patient_name ?? '—',
    testName: order.test_name ?? '—',
    doctorName: order.doctor_name ?? '—',
    category: order.category ?? '—',
    priority: normalizePriority(order.priority),
    uploadedByName: row.uploaded_by_name ?? '—',
    uploadedDate: formatDateTime(row.created_at),
    sampleCollectedAt: formatDateTime(row.sample_collected_at),
    testPerformedAt: formatDateTime(row.test_performed_at),
    remarks: row.remarks ?? '',
    fileName: row.file_name ?? null,
    fileType: row.file_type ?? null,
    source: row.source ?? null,
    parameters: (row.parameters ?? []).map((p) => ({
      parameter_name: p.parameter_name,
      value: p.value,
      unit: p.unit,
      normal_range: p.normal_range,
      flag: p.flag,
    })),
  };
}

export function mapLabOrderList(raw) {
  const items = (raw?.items ?? raw?.orders ?? []).map(apiToUiLabOrder).filter(Boolean);
  return {
    data: items,
    total: raw?.total ?? items.length,
    page: raw?.page ?? 1,
    pageSize: raw?.page_size ?? raw?.pageSize ?? items.length,
  };
}

export function mapLabReportList(raw) {
  const items = (raw?.items ?? raw?.reports ?? []).map(apiToUiLabReport).filter(Boolean);
  return {
    data: items,
    total: raw?.total ?? items.length,
    page: raw?.page ?? 1,
    pageSize: raw?.page_size ?? raw?.pageSize ?? items.length,
  };
}

export function buildLabOrdersQueryParams(filters = {}) {
  const params = {
    page: filters.page ?? 1,
    page_size: filters.pageSize ?? filters.page_size ?? 50,
  };

  const status = viewToApiStatus(filters.view ?? filters.status);
  if (status) params.status = status;

  const priority = priorityToApi(filters.priority);
  if (priority) params.priority = priority;

  if (filters.category && filters.category !== 'all') {
    params.category = filters.category;
  }

  if (filters.search?.trim()) {
    params.search = filters.search.trim();
  }

  if (filters.date) {
    params.from_date = filters.date;
    params.to_date = filters.date;
  } else {
    if (filters.fromDate) params.from_date = filters.fromDate;
    if (filters.toDate) params.to_date = filters.toDate;
  }

  return params;
}

export function buildLabReportsQueryParams(filters = {}) {
  const params = {
    page: filters.page ?? 1,
    page_size: filters.pageSize ?? filters.page_size ?? 50,
  };

  if (filters.search?.trim()) {
    params.search = filters.search.trim();
  }

  if (filters.date) {
    params.from_date = filters.date;
    params.to_date = filters.date;
  }

  if (filters.testName?.trim()) {
    params.test_name = filters.testName.trim();
  }

  return params;
}

export function viewToApiStatus(view) {
  switch (view) {
    case 'ordered':
    case 'pending':
      return 'ordered';
    case 'sample_collected':
      return 'sample_collected';
    case 'processing':
    case 'in_progress':
      return 'processing';
    case 'completed':
      return 'completed';
    case 'cancelled':
      return 'cancelled';
    case 'all':
    case 'open':
    default:
      return undefined;
  }
}

export function uiToApiLabReportBody(form) {
  const parameters = (form.parameters ?? [])
    .filter((p) => p.parameter_name?.trim())
    .map((p) => ({
      parameter_name: p.parameter_name.trim(),
      value: p.value?.trim() || undefined,
      unit: p.unit?.trim() || undefined,
      normal_range: p.normal_range?.trim() || undefined,
      flag: p.flag && p.flag !== 'critical' ? p.flag : p.flag === 'critical' ? 'high' : undefined,
    }));

  return {
    sample_collected_at: datetimeLocalToApi(form.sampleCollectedAt),
    test_performed_at: datetimeLocalToApi(form.testPerformedAt),
    remarks: form.remarks?.trim() || undefined,
    parameters,
  };
}

export function datetimeLocalToApi(value) {
  if (!value) return undefined;
  if (value.includes('+') || value.endsWith('Z')) return value;
  return `${value}:00${IST_OFFSET}`;
}

export function toDatetimeLocalValue(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
