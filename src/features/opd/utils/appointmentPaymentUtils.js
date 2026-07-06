/**
 * Appointment payment helpers for OPD.
 * Appointments list uses payment fields from GET /opd/appointments.
 * Bill matching fallback remains for pages that still load bills separately.
 */

export const APPT_PAY_LATER_NOTE = '[pay-later]';
const REGISTRATION_BOOKING_MARKERS = ['booked during registration', 'new patient registration'];

/** Remove internal OPD booking markers before showing notes in clinical UI. */
export function stripInternalAppointmentMarkers(text) {
  if (text == null || text === '') return '';
  let out = String(text);
  out = out.split(APPT_PAY_LATER_NOTE).join('');
  for (const marker of REGISTRATION_BOOKING_MARKERS) {
    out = out.replace(new RegExp(marker, 'gi'), '');
  }
  return out.replace(/\s{2,}/g, ' ').trim();
}

function normalizeDateKey(dateStr) {
  if (!dateStr) return '';
  const parsed = new Date(dateStr);
  if (!Number.isNaN(parsed.getTime())) return parsed.toDateString();
  return String(dateStr).trim().toLowerCase();
}

function patientKeys(apptOrBill) {
  const keys = new Set();
  const uid = apptOrBill.patientUid ?? apptOrBill.patientId;
  const dbId = apptOrBill.patientDbId ?? apptOrBill.patient_id;
  if (uid != null && uid !== '') keys.add(String(uid));
  if (dbId != null && dbId !== '') keys.add(String(dbId));
  return keys;
}

function patientsMatch(appt, bill) {
  const aKeys = patientKeys(appt);
  const bKeys = patientKeys(bill);
  for (const key of aKeys) {
    if (bKeys.has(key)) return true;
  }
  return false;
}

function billsForAppointment(appt, bills = []) {
  const apptDate = normalizeDateKey(appt.date);
  return bills.filter((bill) => {
    if (!patientsMatch(appt, bill)) return false;
    if (!apptDate) return true;
    return normalizeDateKey(bill.date) === apptDate;
  });
}

export function isAppointmentMarkedPayLater(appt) {
  if (!appt) return false;
  const text = `${appt.notes ?? ''} ${appt.reason ?? ''}`.toLowerCase();
  return text.includes(APPT_PAY_LATER_NOTE);
}

export function isAppointmentFromRegistration(appt) {
  if (!appt || isAppointmentMarkedPayLater(appt)) return false;
  const text = `${appt.notes ?? ''} ${appt.reason ?? ''}`.toLowerCase();
  return REGISTRATION_BOOKING_MARKERS.some((marker) => text.includes(marker));
}

/** Build payment state from API fields on GET /opd/appointments rows. */
export function buildPaymentFromApiFields(appt) {
  if (!appt) return { isPaid: false, bill: null, label: 'Unpaid', apiStatus: 'no_bill' };

  const apiStatus = String(appt.paymentStatus ?? appt.payment_status ?? 'no_bill').toLowerCase();
  // Backend bill_id is the OPD visit id; bill_number is the human-readable bill id.
  const visitId = appt.visitId ?? appt.visit_id ?? appt.billId ?? appt.bill_id ?? null;
  const billNumber = appt.billNumber ?? appt.bill_number ?? null;
  const total = Number(appt.totalAmount ?? appt.total_amount ?? 0);
  const paid = Number(appt.paidAmount ?? appt.paid_amount ?? 0);
  const balance = Number(
    appt.balanceAmount ?? appt.balance_amount ?? Math.max(total - paid, 0),
  );

  const bill =
    visitId || billNumber
      ? {
          id: billNumber ?? String(visitId),
          visitId,
          billNumber,
          total,
          paid,
          balance,
          patientName: appt.patientName,
          patientId: appt.patientUid ?? appt.patientId,
          status:
            apiStatus === 'paid'
              ? 'Paid'
              : apiStatus === 'partial'
                ? 'Partial'
                : 'Unpaid',
        }
      : null;

  const isPaid =
    apiStatus === 'paid' ||
    (total > 0 && balance <= 0.01) ||
    (apiStatus === 'partial' && balance <= 0.01);

  return {
    isPaid,
    bill,
    label: isPaid ? 'Paid' : apiStatus === 'partial' ? 'Partial' : 'Unpaid',
    apiStatus,
  };
}

export function enrichAppointmentsWithApiPayment(appointments) {
  return appointments.map((appt) => {
    const payment = buildPaymentFromApiFields(appt);
    return {
      ...appt,
      payment,
      displayStatus: getAppointmentDisplayStatus(appt, payment),
    };
  });
}

/** @returns {{ isPaid: boolean, bill: object|null, label: 'Paid'|'Unpaid' }} */
export function resolveAppointmentPayment(appt, bills = []) {
  if (!appt) return { isPaid: false, bill: null, label: 'Unpaid' };

  if (appt.status === 'Cancelled') {
    return { isPaid: false, bill: null, label: 'Unpaid' };
  }

  if (isAppointmentFromRegistration(appt)) {
    const patientBills = bills.filter((b) => patientsMatch(appt, b));
    const paidBill = patientBills.find(
      (b) => b.status === 'Paid' || (b.balance ?? 0) <= 0.01,
    );
    if (paidBill) {
      return { isPaid: true, bill: paidBill, label: 'Paid' };
    }
    return { isPaid: true, bill: null, label: 'Paid' };
  }

  const related = billsForAppointment(appt, bills);
  const paidBill = related.find((b) => b.status === 'Paid' || (b.balance ?? 0) <= 0.01);
  if (paidBill) {
    return { isPaid: true, bill: paidBill, label: 'Paid' };
  }

  const unpaidBill = related.find(
    (b) => b.status === 'Unpaid' || b.status === 'Partial' || (b.balance ?? 0) > 0,
  );
  if (unpaidBill) {
    return { isPaid: false, bill: unpaidBill, label: 'Unpaid' };
  }

  if (isAppointmentMarkedPayLater(appt)) {
    const patientBills = bills.filter((b) => patientsMatch(appt, b));
    const openBill = patientBills.find(
      (b) => b.status === 'Unpaid' || b.status === 'Partial' || (b.balance ?? 0) > 0.01,
    );
    if (openBill) {
      return { isPaid: false, bill: openBill, label: 'Unpaid' };
    }
    return { isPaid: true, bill: null, label: 'Paid' };
  }

  if (appt.status === 'Scheduled') {
    return { isPaid: true, bill: null, label: 'Paid' };
  }

  return { isPaid: true, bill: null, label: 'Paid' };
}

export function getAppointmentDisplayStatus(appt, payment) {
  if (!appt) return '';
  if (appt.status === 'Cancelled' || appt.status === 'Completed') return appt.status;
  if (
    appt.status === 'Scheduled'
    && payment
    && !payment.isPaid
  ) {
    return 'Pending';
  }
  return appt.status;
}

export function isOpdAppointmentsListStatus(status) {
  return status === 'Scheduled' || status === 'Completed' || status === 'Cancelled';
}

/** OPD appointments page — Waiting / In Progress are doctor-queue states, not shown here. */
export function isVisibleOnOpdAppointmentsPage(appt) {
  if (!appt) return false;
  return isOpdAppointmentsListStatus(appt.status);
}

export function isAppointmentPending(appt, payment) {
  return getAppointmentDisplayStatus(appt, payment) === 'Pending';
}

export function isPaidActiveAppointment(appt, payment) {
  if (!appt || !payment?.isPaid) return false;
  return appt.status === 'Scheduled';
}

export function matchesAppointmentStatusFilter(appt, filterStatus, payment) {
  if (!appt) return false;
  if (!filterStatus || filterStatus === 'All') {
    return appt.status === 'Scheduled';
  }
  if (filterStatus === 'Pending') return isAppointmentPending(appt, payment);
  if (filterStatus === 'Scheduled') return isPaidActiveAppointment(appt, payment);
  return appt.status === filterStatus;
}

export function showsAppointmentPaymentActions(filterStatus) {
  return filterStatus !== 'Completed' && filterStatus !== 'Cancelled';
}

export function countAppointmentsByStatusFilter(appointments, filterStatus) {
  return appointments.filter((appt) =>
    matchesAppointmentStatusFilter(appt, filterStatus, appt.payment),
  ).length;
}

export function enrichAppointmentsWithPayment(appointments, bills) {
  return appointments.map((appt) => {
    const payment = resolveAppointmentPayment(appt, bills);
    return {
      ...appt,
      payment,
      displayStatus: getAppointmentDisplayStatus(appt, payment),
    };
  });
}
