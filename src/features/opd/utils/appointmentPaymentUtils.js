/**
 * Appointment payment helpers for OPD.
 * Appointments list uses payment fields from GET /opd/appointments.
 */

export const APPT_PAY_LATER_NOTE = '[pay-later]';
const REGISTRATION_BOOKING_MARKERS = [
  'booked during registration',
  'new patient registration',
  'opd revisit',
];

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

/** Hide cancelled rows. Backend is the source of truth for duplicates (OPD-1). */
export function prepareOpdDashboardAppointments(appointments = []) {
  return appointments.filter((appt) => {
    const status = appt.displayStatus ?? appt.status;
    return status !== 'Cancelled';
  });
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

export function getAppointmentDisplayStatus(appt, payment) {
  if (!appt) return '';
  if (appt.status === 'Cancelled' || appt.status === 'Completed') return appt.status;
  if (appt.status === 'Waiting' || appt.status === 'In Progress') {
    if (payment?.isPaid) return 'Scheduled';
    return 'Pending';
  }
  if (
    appt.status === 'Scheduled'
    && payment
    && !payment.isPaid
  ) {
    return 'Pending';
  }
  return appt.status;
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
    // All = every visible row for the date (scheduled/pending/completed/cancelled).
    return true;
  }
  if (filterStatus === 'Pending') return isAppointmentPending(appt, payment);
  if (filterStatus === 'Scheduled') return isPaidActiveAppointment(appt, payment);
  return appt.status === filterStatus;
}

export function showsAppointmentPaymentActions(filterStatus) {
  return filterStatus !== 'Completed' && filterStatus !== 'Cancelled';
}

export function isDeletableAppointment(appt) {
  if (!appt) return false;
  return appt.status === 'Completed' || appt.status === 'Cancelled';
}

export function countAppointmentsByStatusFilter(appointments, filterStatus) {
  return appointments.filter((appt) =>
    matchesAppointmentStatusFilter(appt, filterStatus, appt.payment),
  ).length;
}
