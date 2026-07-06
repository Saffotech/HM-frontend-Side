import {
  enrichAppointmentsWithApiPayment,
  getAppointmentDisplayStatus,
  buildPaymentFromApiFields,
} from '@/features/opd/utils/appointmentPaymentUtils';

/**
 * Merge OPD payment fields onto doctor appointment rows, then drop unpaid
 * pending visits — doctors only see paid scheduled patients.
 */
export function enrichDoctorAppointmentsWithOpdPayment(doctorAppts, opdAppts) {
  const opdEnriched = enrichAppointmentsWithApiPayment(opdAppts ?? []);
  const opdByDbId = new Map(
    opdEnriched.filter((a) => a.dbId != null).map((a) => [a.dbId, a])
  );

  return (doctorAppts ?? [])
    .map((appt) => {
      const opdMatch = appt.dbId != null ? opdByDbId.get(appt.dbId) : null;
      const merged = opdMatch
        ? {
            ...appt,
            paymentStatus: opdMatch.paymentStatus ?? appt.paymentStatus,
            visitId: opdMatch.visitId ?? appt.visitId,
            billId: opdMatch.billId ?? appt.billId,
            billNumber: opdMatch.billNumber ?? appt.billNumber,
            totalAmount: opdMatch.totalAmount ?? appt.totalAmount,
            paidAmount: opdMatch.paidAmount ?? appt.paidAmount,
            balanceAmount: opdMatch.balanceAmount ?? appt.balanceAmount,
            notes: appt.notes ?? opdMatch.notes,
          }
        : appt;

      const payment = opdMatch?.payment ?? buildPaymentFromApiFields(merged);
      const displayStatus = getAppointmentDisplayStatus(merged, payment);

      return { ...merged, payment, displayStatus };
    })
    .filter((appt) => appt.displayStatus !== 'Pending');
}
