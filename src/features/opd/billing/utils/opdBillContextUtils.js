/**
 * Frontend-only helpers for Generate Bill context / duplicate warnings.
 * Uses existing profile visits + appointment payment fields only.
 *
 * TODO (backend not available — do not invent):
 * - Dedicated "active visit without bill" entity (OpdVisit IS the bill today)
 * - Server-side duplicate bill prevention by service/consultation line items
 * - Patient list filtered to today's appointments / waiting queue only
 * - Audit log when receptionist overrides duplicate warning
 */

import { formatBillDate } from '@/shared/utils/billHelpers';

function parseDayKey(value) {
  if (value == null || value === '') return '';
  const d = new Date(value);
  if (!Number.isNaN(d.getTime())) {
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  }
  return String(value).trim().toLowerCase();
}

export function isSameDisplayDay(value, reference = new Date()) {
  if (value == null || value === '') return false;
  const refKey = parseDayKey(reference);
  const valueKey = parseDayKey(value);
  if (valueKey && refKey && valueKey === refKey) return true;
  // Display dates from formatBillDate / formatOpdDisplayDate (e.g. "28 Jul 2026")
  return formatBillDate(value) === formatBillDate(reference);
}

export function patientAgeYears(patient) {
  if (patient?.age != null && patient.age !== '' && !Number.isNaN(Number(patient.age))) {
    return Number(patient.age);
  }
  const dob = patient?.dob ?? patient?.date_of_birth;
  if (!dob) return null;
  const born = new Date(dob);
  if (Number.isNaN(born.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - born.getFullYear();
  const m = today.getMonth() - born.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < born.getDate())) age -= 1;
  return age >= 0 ? age : null;
}

/** Profile visit → bill-like row for warnings / preview. */
export function visitToBillSummary(visit) {
  if (!visit) return null;
  return {
    id: visit.billNumber ?? (visit.visitId != null ? String(visit.visitId) : null),
    billNumber: visit.billNumber ?? null,
    visitId: visit.visitId ?? null,
    date: visit.visitDate ?? null,
    dateIso: visit.visitDateIso ?? null,
    doctorName: visit.doctorName ?? null,
    deptName: visit.department ?? null,
    total: Number(visit.grandTotal ?? 0),
    paid: Number(visit.paidAmount ?? 0),
    balance: Number(visit.balanceDue ?? 0),
    status: visit.paymentStatus ?? visit.status ?? null,
  };
}

export function filterPatientTodayVisits(visits = [], patientUid) {
  return (visits ?? [])
    .filter((v) => {
      if (!isSameDisplayDay(v.visitDateIso ?? v.visitDate)) return false;
      if (!patientUid) return true;
      const keys = [v.patientUid, v.patientId].filter(Boolean).map(String);
      return keys.length === 0 || keys.includes(String(patientUid));
    })
    .map(visitToBillSummary)
    .filter(Boolean);
}

export function filterPatientTodayBills(bills = [], patientUid) {
  return (bills ?? []).filter((b) => {
    if (!patientUid) return isSameDisplayDay(b.dateIso ?? b.date);
    const keys = [b.patientId, b.patientUid].filter(Boolean).map(String);
    return keys.includes(String(patientUid)) && isSameDisplayDay(b.dateIso ?? b.date);
  });
}

/**
 * Prefer today's bills list when present; otherwise profile visits for today.
 * Enrich bill-list rows with doctor/dept from matching profile visits when available.
 */
export function resolveTodayBills({ todayBills = [], profileVisits = [], patientUid }) {
  const fromProfile = filterPatientTodayVisits(profileVisits, patientUid);
  const fromBills = filterPatientTodayBills(todayBills, patientUid);
  if (!fromBills.length) return fromProfile;

  const byKey = new Map();
  for (const v of fromProfile) {
    const keys = [v.billNumber, v.id, v.visitId != null ? String(v.visitId) : null].filter(Boolean);
    for (const k of keys) byKey.set(String(k), v);
  }

  return fromBills.map((bill) => {
    const match =
      byKey.get(String(bill.billNumber ?? '')) ||
      byKey.get(String(bill.id ?? '')) ||
      byKey.get(String(bill.visitId ?? ''));
    if (!match) return bill;
    return {
      ...bill,
      doctorName: bill.doctorName ?? match.doctorName,
      deptName: bill.deptName ?? match.deptName,
      billNumber: bill.billNumber ?? match.billNumber,
    };
  });
}

export function appointmentAlreadyBilled(appointment) {
  if (!appointment) return false;
  if (appointment.visitId != null || appointment.billId != null) return true;
  if (appointment.billNumber) return true;
  const status = String(appointment.paymentStatus ?? '').toLowerCase();
  return Boolean(status && status !== 'no_bill' && status !== 'none');
}

function namesMatch(a, b) {
  if (!a || !b) return false;
  const norm = (s) =>
    String(s)
      .toLowerCase()
      .replace(/^dr\.?\s*/i, '')
      .replace(/\s+/g, ' ')
      .trim();
  return norm(a) === norm(b);
}

/**
 * Likely duplicate: same patient day + same doctor and/or department when known.
 * Never blocks — UI warning only.
 */
export function findLikelyDuplicateBills({
  todayBills = [],
  appointment = null,
  doctorId = null,
  doctorName = null,
  deptId = null,
  deptName = null,
} = {}) {
  if (!todayBills.length) return [];

  const apptBillKeys = new Set(
    [
      appointment?.billNumber,
      appointment?.visitId != null ? String(appointment.visitId) : null,
      appointment?.billId != null ? String(appointment.billId) : null,
    ].filter(Boolean).map(String),
  );

  return todayBills.filter((bill) => {
    const billKeys = [bill.billNumber, bill.id, bill.visitId != null ? String(bill.visitId) : null]
      .filter(Boolean)
      .map(String);
    if (billKeys.some((k) => apptBillKeys.has(k))) return true;

    const isOpen = bill.status !== 'Paid';
    if (!isOpen && !appointmentAlreadyBilled(appointment)) return false;

    if (doctorName && bill.doctorName && namesMatch(doctorName, bill.doctorName)) {
      return isOpen || appointmentAlreadyBilled(appointment);
    }
    if (deptName && bill.deptName && namesMatch(deptName, bill.deptName)) {
      return isOpen;
    }
    // Bills list rows often lack doctor/dept — soft-match open same-day bills only.
    if (!bill.doctorName && !bill.deptName && isOpen) return true;

    void doctorId;
    void deptId;
    return false;
  });
}

export function buildBillingContextSummary({
  outstanding = 0,
  todayBills = [],
  recentVisits = [],
  appointment = null,
} = {}) {
  const unpaidToday = todayBills.filter((b) => b.status === 'Unpaid');
  const partialToday = todayBills.filter((b) => b.status === 'Partial');
  const openToday = todayBills.filter((b) => b.status !== 'Paid');
  const primaryOpen = openToday[0] ?? todayBills[0] ?? null;
  const recentBills = (recentVisits ?? [])
    .map(visitToBillSummary)
    .filter(Boolean)
    .slice(0, 5);

  return {
    outstanding: Number(outstanding) || 0,
    todayCount: todayBills.length,
    unpaidTodayCount: unpaidToday.length,
    partialTodayCount: partialToday.length,
    openTodayCount: openToday.length,
    todayBills,
    openToday,
    primaryOpen,
    recentBills,
    appointmentHasBill: appointmentAlreadyBilled(appointment),
    appointmentBillNumber: appointment?.billNumber ?? null,
    appointmentBillStatus: appointment?.paymentStatus ?? null,
  };
}
