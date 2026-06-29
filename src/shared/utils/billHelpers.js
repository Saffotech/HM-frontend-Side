import { TAX_RATE } from '@/shared/constants';
import { formatOpdDisplayDate } from '@/shared/utils/opdDates';

export function calcBillTotals(items) {
  const subtotal = items.reduce((acc, i) => acc + i.qty * i.unitPrice, 0);
  const tax = Math.round(subtotal * TAX_RATE * 100) / 100;
  const grandTotal = subtotal + tax;
  return { subtotal, tax, grandTotal };
}

/** Line amount for a bill item (explicit amount or qty × unit price). */
export function billLineAmount(item) {
  if (!item) return 0;
  const explicit = Number(item.amount);
  if (Number.isFinite(explicit)) return explicit;
  return Number(item.qty ?? 0) * Number(item.unitPrice ?? 0);
}

/** Bill rows with zero amount are omitted from print/display tables. */
export function billItemsWithNonZeroAmount(items) {
  return (items ?? []).filter((item) => billLineAmount(item) > 0);
}

export function getBillStatus(paid, total) {
  const balance = Math.round((total - paid) * 100) / 100;
  if (balance <= 0) return { status: 'Paid', balance: 0 };
  if (paid > 0) return { status: 'Partial', balance };
  return { status: 'Unpaid', balance };
}

/** Collected amount toward a bill (uses balance when paid_amount is overstated). */
export function billCollectedAmount(total, balance, paidAmount) {
  const grandTotal = Number(total) || 0;
  const balanceDue = Math.max(0, Number(balance) || 0);
  const paid = Number(paidAmount) || 0;

  if (grandTotal <= 0) return 0;
  if (balanceDue <= 0.01) return grandTotal;

  const settled = Math.max(0, grandTotal - balanceDue);
  return Math.min(paid, settled);
}

export function formatBillDate(date = new Date()) {
  return formatOpdDisplayDate(date);
}

export function hasOpenBillToday(bills, patientId, dateStr = formatBillDate()) {
  return bills.some(
    (b) => b.patientId === patientId && b.date === dateStr && b.status !== 'Paid'
  );
}

export function generateBillId(billsCount) {
  return `BILL-${String(billsCount + 1).padStart(3, '0')}`;
}

export function generatePatientId(patientsCount) {
  return `P-${1000 + patientsCount + 1}`;
}

export function generateAppointmentId(appointmentsCount) {
  return `APT-${String(appointmentsCount + 1).padStart(3, '0')}`;
}
