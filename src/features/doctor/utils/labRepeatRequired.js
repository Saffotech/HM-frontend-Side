/**
 * Detect same-day lab re-orders so the UI can require "Repeat test".
 */

function localDateKey(value = new Date()) {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function normalizeLabTestName(name) {
  return String(name ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
}

const IN_FLIGHT_LAB_STATUSES = new Set(['ordered', 'sample_collected']);

function labOrderStatus(order) {
  return String(order?.apiStatus ?? order?.status ?? order?.doctorStatus ?? '')
    .toLowerCase();
}

function isCancelledLab(order) {
  return labOrderStatus(order) === 'cancelled';
}

function isInFlightLab(order) {
  const status = labOrderStatus(order);
  if (IN_FLIGHT_LAB_STATUSES.has(status)) return true;
  // Doctor list maps in-lab progress to UI "Ordered" without raw apiStatus.
  return status === 'ordered';
}

function isOrderedOnLocalDay(order, dayKey) {
  const key = localDateKey(order?.orderedAt ?? order?.created_at ?? order?.date);
  return Boolean(key && dayKey && key === dayKey);
}

function matchesLabIdentity(order, { labTestId, testName }) {
  const orderLabTestId = order?.labTestId ?? order?.lab_test_id ?? null;
  if (labTestId != null && orderLabTestId != null) {
    return Number(labTestId) === Number(orderLabTestId);
  }
  const orderName = normalizeLabTestName(order?.testName ?? order?.test_name);
  const nextName = normalizeLabTestName(testName);
  return Boolean(orderName && nextName && orderName === nextName);
}

function matchesVisitParent(order, { appointmentDbId, admissionId }) {
  if (admissionId != null) {
    const orderAdmission = order?.admissionId ?? order?.admission_id;
    if (orderAdmission == null) return false;
    return Number(orderAdmission) === Number(admissionId);
  }
  if (appointmentDbId != null) {
    const orderAppt = order?.appointmentId ?? order?.appointment_id;
    if (orderAppt == null) return false;
    return Number(orderAppt) === Number(appointmentDbId);
  }
  return true;
}

/**
 * True when the same visit already has this test in progress (ordered / sample collected).
 * Mirrors backend duplicate blocking for in-flight orders.
 */
export function hasInFlightLabOrder(existingOrders = [], row = {}, visit = {}) {
  const labTestId = row.labTestId ?? row.lab_test_id ?? null;
  const testName = row.testName ?? row.test_name ?? '';
  if (labTestId == null && !normalizeLabTestName(testName)) return false;

  return (existingOrders ?? []).some((order) => {
    if (!order || isCancelledLab(order)) return false;
    if (!isInFlightLab(order)) return false;
    if (!matchesVisitParent(order, visit)) return false;
    return matchesLabIdentity(order, { labTestId, testName });
  });
}

/**
 * True when an existing order for the same visit/test was placed today.
 */
export function hasSameDayLabOrder(existingOrders = [], row = {}, visit = {}) {
  const dayKey = localDateKey(new Date());
  if (!dayKey) return false;
  const labTestId = row.labTestId ?? row.lab_test_id ?? null;
  const testName = row.testName ?? row.test_name ?? '';
  if (labTestId == null && !normalizeLabTestName(testName)) return false;

  return (existingOrders ?? []).some((order) => {
    if (!order || isCancelledLab(order)) return false;
    if (!isOrderedOnLocalDay(order, dayKey)) return false;
    if (!matchesVisitParent(order, visit)) return false;
    return matchesLabIdentity(order, { labTestId, testName });
  });
}

/**
 * True when an earlier filled row in this form already requests the same test.
 * (Same-day by definition — both are being ordered now.)
 */
export function hasEarlierFormLabDuplicate(labOrders = [], index) {
  const row = labOrders[index];
  if (!row) return false;
  const labTestId = row.labTestId ?? null;
  const testName = row.testName ?? '';
  if (labTestId == null && !normalizeLabTestName(testName)) return false;

  for (let j = 0; j < index; j += 1) {
    const earlier = labOrders[j];
    if (!earlier?.deptCode) continue;
    if (labTestId == null && !normalizeLabTestName(earlier.testName) && earlier.labTestId == null) {
      continue;
    }
    if (matchesLabIdentity(earlier, { labTestId, testName })) return true;
  }
  return false;
}

/** True when the doctor must explicitly check Repeat — same test ordered again today only. */
export function isLabRepeatRequired(row, index, { existingOrders = [], labOrders = [], visit = {} } = {}) {
  if (!row?.deptCode) return false;
  if (row.labTestId == null && !normalizeLabTestName(row.testName)) return false;
  if (hasEarlierFormLabDuplicate(labOrders, index)) return true;
  return hasSameDayLabOrder(existingOrders, row, visit);
}

/**
 * API is_repeat flag: checked box, or in-flight duplicate from a prior day
 * (same-day duplicates require the checkbox — not auto-sent).
 */
export function resolveLabIsRepeat(row, index, context = {}) {
  if (Boolean(row?.isRepeat)) return true;
  if (isLabRepeatRequired(row, index, context)) return false;
  const { existingOrders = [], visit = {} } = context;
  return hasInFlightLabOrder(existingOrders, row, visit);
}

const LAB_DUPLICATE_MESSAGE = /already been ordered|use repeat test/i;

export function isLabDuplicateOrderError(error) {
  return LAB_DUPLICATE_MESSAGE.test(String(error?.message ?? ''));
}
