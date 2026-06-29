/**
 * OPD visit / queue row ↔ UI (live HTTP).
 */

import { formatOpdDisplayDate, formatOpdDisplayTime } from '@/shared/utils/opdDates';

const PAYMENT_STATUS_UI = {
  pending: 'Unpaid',
  partial: 'Partial',
  paid: 'Paid',
};

const VISIT_STATUS_UI = {
  registered: 'Registered',
};

export function apiToUiOpdVisit(row) {
  if (!row) return null;
  const visitDateRaw = row.visit_date ?? row.visitDate;
  return {
    visitId: row.visit_id ?? row.visitId,
    tokenNumber: row.token_number ?? row.tokenNumber,
    billNumber: row.bill_number ?? row.billNumber,
    patientUid: row.patient_id ?? row.patient_uid ?? row.patientUid,
    patientName: row.patient_name ?? row.patientName,
    doctorName: row.doctor_name ?? row.doctorName,
    department: row.department ?? row.department_name ?? row.deptName,
    visitDate: formatOpdDisplayDate(visitDateRaw),
    visitTime: formatOpdDisplayTime(visitDateRaw),
    visitDateIso: visitDateRaw,
    status:
      VISIT_STATUS_UI[String(row.status ?? '').toLowerCase()] ??
      row.status,
    paymentStatus:
      PAYMENT_STATUS_UI[String(row.payment_status ?? '').toLowerCase()] ??
      row.payment_status ??
      row.paymentStatus,
    grandTotal: Number(row.grand_total ?? row.grandTotal ?? 0),
    paidAmount: Number(row.paid_amount ?? row.paidAmount ?? 0),
    balanceDue: Number(row.balance_due ?? row.balanceDue ?? 0),
    paymentMode: row.payment_mode ?? row.paymentMode,
  };
}

export function mapOpdVisitList(raw) {
  const rows = raw?.visits ?? (Array.isArray(raw) ? raw : []);
  return rows.map(apiToUiOpdVisit).filter(Boolean);
}
