import { formatBillDate, getBillStatus } from '@/shared/utils/billHelpers';

export function getTodayDateString() {
  return formatBillDate();
}

function appointmentScheduledTime(appt) {
  if (!appt) return null;
  if (appt.scheduledAt) {
    const d = new Date(appt.scheduledAt);
    if (!Number.isNaN(d.getTime())) return d;
  }
  const dateStr = appt.date;
  const timeStr = appt.time;
  if (!dateStr) return null;
  if (timeStr) {
    const combined = `${dateStr} ${timeStr}`;
    const d = new Date(combined);
    if (!Number.isNaN(d.getTime())) return d;
  }
  const d = new Date(dateStr);
  return Number.isNaN(d.getTime()) ? null : d;
}

function isNonCancelled(appt) {
  const status = String(appt?.status ?? '').toLowerCase();
  return status !== 'cancelled';
}

/**
 * Pick the best appointment to prefill department/doctor on Generate Bill.
 * 1) Closest upcoming Scheduled/Waiting on or after today
 * 2) Latest any non-cancelled appointment
 */
export function pickAppointmentForBillPrefill(appointments = []) {
  const list = (appointments ?? []).filter(isNonCancelled);
  if (!list.length) return null;

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const upcoming = list
    .filter((appt) => {
      const status = String(appt.status ?? '');
      if (status !== 'Scheduled' && status !== 'Waiting') return false;
      const at = appointmentScheduledTime(appt);
      return at && at >= todayStart;
    })
    .sort((a, b) => appointmentScheduledTime(a) - appointmentScheduledTime(b));

  if (upcoming.length) return upcoming[0];

  const latest = [...list]
    .filter((appt) => appointmentScheduledTime(appt))
    .sort((a, b) => appointmentScheduledTime(b) - appointmentScheduledTime(a));

  return latest[0] ?? null;
}

export function resolveServiceFromAppointment(appointment, patient, refs = {}) {
  const doctorId = appointment?.doctorId || patient?.doctorId;
  const deptId = appointment?.deptId || patient?.deptId;
  const { doctors = [], departments = [] } = refs;
  const doctor = doctors.find((d) => String(d.id) === String(doctorId));
  const dept = departments.find((d) => String(d.id) === String(deptId));
  return {
    appointmentId: appointment?.id,
    doctorId,
    deptId,
    doctorName:
      appointment?.doctorName || (doctor ? `Dr. ${doctor.name}` : undefined),
    deptName: appointment?.deptName || dept?.name,
    doctor,
  };
}

export function createOpdBillRecord({
  billId,
  patient,
  items,
  grandTotal,
  amountReceived,
  paymentMode,
  notes,
  appointment,
  visitType,
  paymentRef,
}) {
  const paid = Math.min(Math.max(0, Number(amountReceived) || 0), grandTotal);
  const { status, balance } = getBillStatus(paid, grandTotal);
  const date = getTodayDateString();
  const service = resolveServiceFromAppointment(appointment, patient);

  const payments =
    paid > 0
      ? [
          {
            date,
            amount: paid,
            mode: paymentMode,
            ref: paymentRef || undefined,
          },
        ]
      : [];

  return {
    id: billId,
    patientId: patient.id,
    patientDbId: patient.dbId,
    patientName: patient.name,
    date,
    items: items.map(({ name, qty, unitPrice }) => ({ name, qty, unitPrice })),
    total: grandTotal,
    paid,
    balance,
    status,
    paymentMode: paid > 0 ? paymentMode : undefined,
    payments,
    notes: notes?.trim() || undefined,
    appointmentId: service.appointmentId,
    doctorId: service.doctorId,
    deptId: service.deptId,
    doctorName: service.doctorName,
    deptName: service.deptName,
    visitType,
  };
}
