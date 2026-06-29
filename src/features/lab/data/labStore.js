/**
 * Lab data layer (mock + localStorage).
 * Tracks order status changes when technician uploads a report.
 * Replace with API calls when backend is ready.
 */

import { LAB_ORDER_STATUS } from '@/features/lab/utils/labOrderStatus';
import { buildDoctorLabTest } from '@/shared/utils/doctorLabView';

let mockLabDataModule = null;

export async function ensureMockLabDataLoaded() {
  if (!mockLabDataModule) {
    mockLabDataModule = await import('./mockLabData.js');
  }
  return mockLabDataModule;
}

export function getLabReferenceToday() {
  return mockLabDataModule?.LAB_REFERENCE_TODAY ?? new Date().toISOString().slice(0, 10);
}

const KEYS = {
  orders: 'saffocare.lab.orders',
  reports: 'saffocare.lab.reports',
  doctorOrders: 'saffocare.lab.doctorOrders',
  doctorNotes: 'saffocare.lab.doctorNotes',
};

function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function save(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

function nextReportId(reports) {
  const nums = reports
    .map((r) => parseInt(r.reportId.replace(/\D/g, ''), 10))
    .filter((n) => !Number.isNaN(n));
  const next = (nums.length ? Math.max(...nums) : 0) + 1;
  return `RPT-${String(next).padStart(3, '0')}`;
}

function allBaseOrders() {
  const doctorCreated = load(KEYS.doctorOrders, []);
  const doctorDemoOrders = mockLabDataModule?.doctorDemoOrders ?? [];
  const seedOrders = mockLabDataModule?.mockOrders ?? [];
  return [...doctorDemoOrders, ...doctorCreated, ...seedOrders];
}

/** All orders with persisted status updates */
export function getLabOrders() {
  const overrides = load(KEYS.orders, {});
  return allBaseOrders().map((o) => ({
    ...o,
    ...(overrides[o.id] ?? {}),
  }));
}

const SEED_DOCTOR_NOTES = {
  'DOC-L02': {
    clinicalNote: 'Discussed dietary modification and follow-up in 3 months.',
    reviewedAt: '2026-05-20T10:30:00',
  },
  'DOC-L04': {
    clinicalNote: 'Repeat TFT in 6 weeks; monitor symptoms.',
    reviewedAt: '2026-05-17T16:00:00',
  },
  'DOC-L05': {
    clinicalNote: 'Radiograph reviewed — no acute findings.',
    reviewedAt: '2026-05-16T11:00:00',
  },
};

function getDoctorNotesMap() {
  return load(KEYS.doctorNotes, SEED_DOCTOR_NOTES);
}

function getDoctorFacingOrderIds() {
  const doctorCreated = load(KEYS.doctorOrders, []);
  const doctorDemoOrders = mockLabDataModule?.doctorDemoOrders ?? [];
  return new Set([
    ...doctorDemoOrders.map((o) => o.id),
    ...doctorCreated.map((o) => o.id),
  ]);
}

/** Doctor module — tests derived from lab orders + reports (doctor-ordered work only) */
export function getDoctorLabTests() {
  const doctorIds = getDoctorFacingOrderIds();
  const orders = getLabOrders().filter((o) => doctorIds.has(o.id));
  const reports = getLabReports();
  const notes = getDoctorNotesMap();

  return orders.map((order) => {
    const report = reports.find((r) => r.orderId === order.id) ?? null;
    const doctorMeta = notes[order.id] ?? {};
    return buildDoctorLabTest(order, report, doctorMeta);
  });
}

export function getDoctorLabTestById(orderId) {
  return getDoctorLabTests().find((t) => t.id === orderId) ?? null;
}

export function getPreviousReportsForPatient(patientId, currentOrderId) {
  return getDoctorLabTests()
    .filter((t) => t.patientId === patientId && t.id !== currentOrderId && t.reportAvailable)
    .map((t) => ({
      id: t.id,
      testName: t.testName,
      date: t.reportDateDisplay,
      doctorStatus: t.doctorStatus,
    }));
}

/** Create order when doctor orders from consultation */
export function createLabOrderFromDoctor({ patientId, patientName, testName, doctorName, category }) {
  const doctorCreated = load(KEYS.doctorOrders, []);
  const id = `DOC-${Date.now().toString(36).slice(-6).toUpperCase()}`;
  const now = new Date();
  const order = {
    id,
    patientName,
    patientId,
    doctorName: doctorName || 'Doctor',
    testName,
    category: category || 'Lab',
    priority: 'normal',
    requestedDate: now.toISOString().slice(0, 10),
    orderedAt: now.toISOString(),
    status: LAB_ORDER_STATUS.PENDING,
  };
  save(KEYS.doctorOrders, [order, ...doctorCreated]);
  return order;
}

export function saveDoctorClinicalNote(orderId, clinicalNote) {
  const notes = getDoctorNotesMap();
  notes[orderId] = {
    clinicalNote: clinicalNote.trim(),
    reviewedAt: clinicalNote.trim() ? new Date().toISOString() : null,
  };
  save(KEYS.doctorNotes, notes);
  return getDoctorLabTestById(orderId);
}

/** Completed reports (seed + newly uploaded) */
export function getLabReports() {
  const seedReports = mockLabDataModule?.mockReports ?? [];
  return load(KEYS.reports, seedReports);
}

/**
 * Submit upload form — updates order status and optionally adds completed report.
 * @returns {{ order: object, report: object|null }}
 */
export function submitLabReport(orderId, payload) {
  const {
    status,
    sampleCollectedAt,
    testPerformedAt,
    remarks,
    findings,
    conclusion,
    labTechnician,
    parameters,
    fileName,
  } = payload;

  const orders = getLabOrders();
  const order = orders.find((o) => o.id === orderId);
  if (!order) throw new Error('Order not found');

  const overrides = load(KEYS.orders, {});
  const newStatus =
    status === LAB_ORDER_STATUS.COMPLETED
      ? LAB_ORDER_STATUS.COMPLETED
      : LAB_ORDER_STATUS.IN_PROGRESS;

  overrides[orderId] = {
    ...overrides[orderId],
    status: newStatus,
    sampleCollectedAt,
    testPerformedAt,
    remarks: remarks || '',
    findings: findings ?? remarks ?? '',
    conclusion: conclusion ?? '',
    labTechnician: labTechnician ?? overrides[orderId]?.labTechnician,
    parameters: parameters ?? [],
    reportFileName: fileName ?? null,
    updatedAt: new Date().toISOString(),
  };
  save(KEYS.orders, overrides);

  let report = null;
  if (newStatus === LAB_ORDER_STATUS.COMPLETED) {
    const reports = getLabReports();
    report = {
      reportId: nextReportId(reports),
      orderId: order.id,
      patientName: order.patientName,
      patientId: order.patientId,
      testName: order.testName,
      doctorName: order.doctorName,
      uploadedDate: new Date().toISOString().slice(0, 16).replace('T', ' '),
      status: 'completed',
      remarks: remarks || '',
      parameters: parameters ?? [],
      reportFileName: fileName ?? null,
    };
    save(KEYS.reports, [report, ...reports]);
  }

  return {
    order: { ...order, ...overrides[orderId] },
    report,
  };
}

/** Dev helper — reset to seed data */
export function resetLabStore() {
  localStorage.removeItem(KEYS.orders);
  localStorage.removeItem(KEYS.reports);
  localStorage.removeItem(KEYS.doctorOrders);
  localStorage.removeItem(KEYS.doctorNotes);
}
