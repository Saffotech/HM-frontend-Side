/** Lab order status values — keep in sync with features/lab/utils/labOrderStatus.js */
const LAB_ORDER_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
};

/** Doctor Lab Tests filter keys (Image 1 pills) */
export const DOCTOR_LAB_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'ordered', label: 'Ordered' },
  { id: 'completed', label: 'Completed' },
  { id: 'cancelled', label: 'Cancelled' },
];

const RADIOLOGY_TESTS = /x-ray|mri|ct|ecg|scan|radiology|ultrasound/i;

export function inferTestCategory(testName = '', category = '') {
  if (category === 'Radiology' || category === 'Lab') return category;
  if (RADIOLOGY_TESTS.test(testName)) return 'Radiology';
  return 'Lab';
}

export function formatLabDateTime(isoOrDate) {
  if (!isoOrDate) return '—';
  const d = new Date(isoOrDate);
  if (Number.isNaN(d.getTime())) return String(isoOrDate);
  return d.toLocaleString('en-US', {
    month: 'numeric',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
}

/** Lab uploaded a report — doctor can open View Report */
export function isReportAvailable(order, report) {
  return (
    order?.status === LAB_ORDER_STATUS.COMPLETED ||
    Boolean(report) ||
    Boolean(order?.reportFileName)
  );
}

/**
 * Doctor-facing workflow status (distinct from lab portal pending/in_progress/completed).
 */
export function getDoctorDisplayStatus(order, doctorMeta = {}) {
  if (doctorMeta.reviewedAt || doctorMeta.clinicalNote?.trim()) {
    return 'Reviewed';
  }
  if (order.status === LAB_ORDER_STATUS.COMPLETED) {
    return 'Completed';
  }
  if (order.status === LAB_ORDER_STATUS.IN_PROGRESS) {
    if (order.sampleCollectedAt && !order.testPerformedAt) {
      return 'Sample Collected';
    }
    return 'Processing';
  }
  return 'Pending';
}

export function getDoctorFilterKey(displayStatus) {
  switch (displayStatus) {
    case 'Pending':
    case 'Ordered':
      return 'ordered';
    case 'Sample Collected':
      return 'sample_collected';
    case 'Processing':
      return 'processing';
    case 'Completed':
      return 'completed';
    case 'Cancelled':
      return 'cancelled';
    case 'Reviewed':
      return 'reviewed';
    default:
      return 'all';
  }
}

export function countDoctorLabFilters(tests) {
  const counts = {
    all: tests.length,
    ordered: 0,
    sample_collected: 0,
    processing: 0,
    completed: 0,
    cancelled: 0,
  };
  tests.forEach((t) => {
    const key = getDoctorFilterKey(t.doctorStatus);
    if (key !== 'all') counts[key] += 1;
  });
  return counts;
}

export function filterDoctorLabTests(tests, filterId) {
  if (filterId === 'all') return tests;
  return tests.filter((t) => getDoctorFilterKey(t.doctorStatus) === filterId);
}

export function formatResultValues(parameters = []) {
  if (!parameters.length) return '';
  return parameters
    .filter((p) => p.parameter_name || p.value)
    .map((p) => {
      const unit = p.unit ? ` ${p.unit}` : '';
      return `${p.parameter_name}: ${p.value}${unit}`;
    })
    .join(', ');
}

export function formatNormalRange(parameters = [], fallback = '') {
  if (fallback) return fallback;
  const parts = parameters
    .filter((p) => p.normal_range)
    .map((p) => `${p.parameter_name} ${p.normal_range}`);
  return parts.join(', ');
}

export function buildDoctorLabTest(order, report, doctorMeta = {}) {
  const category = inferTestCategory(order.testName, order.category);
  const doctorStatus = getDoctorDisplayStatus(order, doctorMeta);
  const orderedAt = order.orderedAt || order.requestedDate;
  const reportAvailable = isReportAvailable(order, report);

  return {
    id: order.id,
    patientName: order.patientName,
    patientId: order.patientId,
    testName: order.testName,
    category,
    doctorName: order.doctorName,
    orderedAt,
    orderedDisplay: formatLabDateTime(orderedAt),
    reportDate: order.testPerformedAt || report?.uploadedDate,
    reportDateDisplay: formatLabDateTime(order.testPerformedAt || report?.uploadedDate),
    doctorStatus,
    reportAvailable,
    labTechnician: order.labTechnician || '—',
    findings: order.findings ?? order.remarks ?? report?.remarks ?? '',
    conclusion: order.conclusion ?? '',
    parameters: order.parameters ?? report?.parameters ?? [],
    normalRange: order.normalRange ?? formatNormalRange(order.parameters ?? report?.parameters ?? []),
    resultSummary: order.resultSummary ?? formatResultValues(order.parameters ?? report?.parameters ?? []),
    clinicalNote: doctorMeta.clinicalNote ?? '',
    reviewedAt: doctorMeta.reviewedAt ?? null,
    report,
    order,
  };
}
