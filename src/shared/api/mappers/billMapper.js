/**
 * Bill UI ↔ API field mapping (live HTTP only).
 */

import { formatOpdDisplayDate } from "@/shared/utils/opdDates";
import { billCollectedAmount } from "@/shared/utils/billHelpers";
import { validatePaymentTransactionRef } from "@/shared/utils/validators";

const STATUS_TO_UI = { pending: "Unpaid", partial: "Partial", paid: "Paid", cancelled: "Cancelled" };
const STATUS_TO_API = { Unpaid: "pending", Partial: "partial", Paid: "paid" };

function mapApiItems(items) {
  return (items ?? []).map((item) => ({
    name: item.description ?? item.name,
    qty: item.qty,
    unitPrice: item.unit_price ?? item.unitPrice,
    amount: item.amount,
  }));
}

function mapUiItems(items) {
  return (items ?? []).map((item) => ({
    description: item.name,
    qty: item.qty,
    unit_price: item.unitPrice,
  }));
}

/** GET /opd/visit/:id/invoice → UI bill */
export function mapInvoiceToUiBill(raw, visitId) {
  if (!raw) return null;
  const summary = raw.summary ?? {};
  const mapped = apiToUiBill({
    bill_number: raw.bill_number,
    visit_id: visitId,
    patient_uid: raw.patient?.patient_id,
    patient_name: raw.patient?.name,
    visit_date: raw.visit_date,
    bill_items: raw.bill_items,
    grand_total: summary.grand_total,
    paid_amount: summary.amount_paid,
    balance_due: summary.balance_due,
    payment_status: summary.payment_status,
    payment_mode: summary.payment_mode,
    payments: (raw.payment_history ?? []).map((p) => ({
      date: p.date,
      amount: p.amount,
      mode: p.mode,
      ref: p.ref,
    })),
    service: raw.service,
  });
  return {
    ...mapped,
    subtotal: Number(summary.subtotal ?? 0),
    gstAmount: Number(summary.gst_amount ?? 0),
    gstLabel: summary.gst_label ?? "GST",
  };
}

export function apiToUiBill(apiBill) {
  if (!apiBill) return null;
  const paymentStatus = apiBill.payment_status ?? apiBill.status;
  return {
    id: apiBill.bill_number ?? apiBill.id,
    visitId: apiBill.visit_id ?? apiBill.visitId,
    patientUid: apiBill.patient_uid ?? apiBill.patientUid,
    patientId: apiBill.patient_uid ?? apiBill.patient_id ?? apiBill.patientId,
    patientName: apiBill.patient_name ?? apiBill.patientName,
    date: formatOpdDisplayDate(
      apiBill.visit_date ?? apiBill.bill_date ?? apiBill.date,
    ),
    dateIso: apiBill.visit_date ?? apiBill.bill_date ?? apiBill.date,
    items: mapApiItems(apiBill.bill_items ?? apiBill.items),
    total: apiBill.grand_total ?? apiBill.total_amount ?? apiBill.total ?? 0,
    paid: billCollectedAmount(
      apiBill.grand_total ?? apiBill.total_amount ?? apiBill.total ?? 0,
      apiBill.balance_due ?? apiBill.balance ?? 0,
      apiBill.paid_amount ?? apiBill.paid ?? 0,
    ),
    balance: apiBill.balance_due ?? apiBill.balance ?? 0,
    status:
      STATUS_TO_UI[String(paymentStatus ?? "").toLowerCase()] ??
      paymentStatus ??
      apiBill.status,
    paymentMode: apiBill.payment_method ?? apiBill.paymentMode,
    payments: apiBill.payments ?? [],
  };
}

/** Collect-payment payload UI → API (POST /opd/visit/:visitId/pay) */
export function uiToApiPayment(payment) {
  if (!payment) return null;

  const payment_mode = (
    payment.payment_mode ??
    payment.mode ??
    ""
  ).toLowerCase();
  const transaction_reference = (
    payment.transaction_reference ??
    payment.ref ??
    ""
  ).trim();
  const paid_amount = payment.paid_amount ?? payment.amount;

  if (
    (payment_mode === "card" || payment_mode === "upi") &&
    !transaction_reference
  ) {
    throw new Error(
      "Transaction reference is required for Card and UPI payments",
    );
  }

  const body = {
    paid_amount,
    payment_mode,
  };

  if (transaction_reference) body.transaction_reference = transaction_reference;

  return body;
}

export function uiToApiBill(uiBill) {
  if (!uiBill) return null;
  const body = {
    patient_id: uiBill.patientId,
    patient_name: uiBill.patientName,
    bill_date: uiBill.date,
    items: mapUiItems(uiBill.items),
    total_amount: uiBill.total ?? uiBill.totalAmount,
    paid: uiBill.paid,
    balance: uiBill.balance,
    status: STATUS_TO_API[uiBill.status] ?? uiBill.status?.toLowerCase(),
    payment_method: uiBill.paymentMode ?? uiBill.paymentMethod,
    payments: uiBill.payments,
  };
  if (uiBill.id) body.id = uiBill.id;
  return body;
}

/** PUT /opd/bills/:visitId body */
export function uiToApiBillUpdate(uiBill) {
  if (!uiBill) return null;
  const body = {};
  if (uiBill.deptId != null) body.department_id = Number(uiBill.deptId);
  if (uiBill.doctorId != null) body.doctor_id = Number(uiBill.doctorId);
  if (uiBill.registrationFee != null) {
    body.registration_fee = Number(uiBill.registrationFee);
  }
  if (uiBill.consultationFee != null) {
    body.consultation_fee = Number(uiBill.consultationFee);
  }
  if (uiBill.gstPercent != null) body.gst_percent = Number(uiBill.gstPercent);
  if (uiBill.items != null) {
    body.extra_items = (uiBill.items ?? [])
      .filter((item) => item?.name)
      .map((item) => ({
        description: item.name,
        qty: Number(item.qty) || 1,
        unit_price: Number(item.unitPrice) || 0,
      }));
  }
  return body;
}

/** POST /opd/bill/generate body */
export function uiToApiGenerateBill(uiBill) {
  if (!uiBill) return null;
  const patientDbId = uiBill.patientDbId ?? uiBill.patient_db_id;
  if (!patientDbId) {
    throw new Error("Patient record id is required to generate a bill");
  }

  const payLater = Boolean(
    uiBill.payLater ?? (uiBill.status === "Unpaid" && !uiBill.paid),
  );
  const payment_mode = String(uiBill.paymentMode ?? "cash").toLowerCase();
  const amount_received =
    uiBill.paid != null && Number(uiBill.paid) > 0 ? Number(uiBill.paid) : null;
  const transaction_reference = (
    uiBill.paymentRef ??
    uiBill.transaction_reference ??
    ""
  ).trim();

  const refError = validatePaymentTransactionRef(
    payment_mode,
    transaction_reference,
    {
      paidAmount: amount_received ?? 0,
      payLater,
    },
  );
  if (refError) throw new Error(refError);

  const body = {
    patient_id: Number(patientDbId),
    department_id: Number(uiBill.deptId),
    doctor_id: Number(uiBill.doctorId),
    registration_fee: Number(uiBill.registrationFee ?? 0),
    consultation_fee: Number(uiBill.consultationFee ?? 0),
    gst_percent: Number(uiBill.gstPercent ?? 5),
    extra_items: (uiBill.items ?? [])
      .filter((item) => item?.name)
      .map((item) => ({
        description: item.name,
        qty: Number(item.qty) || 1,
        unit_price: Number(item.unitPrice) || 0,
      })),
    pay_later: payLater,
    payment_mode,
    amount_received,
  };

  if (transaction_reference) body.transaction_reference = transaction_reference;

  return body;
}
