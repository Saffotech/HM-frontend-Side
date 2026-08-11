/**
 * OPD Billing landing dashboard — single GET /opd/dashboard.
 */

import { getOpdDashboard } from '@/features/opd/api/dashboard';
import { apiToUiAppointment } from '@/shared/api/mappers/appointmentMapper';
import { formatPatientRegisteredDate } from '@/shared/api/mappers/patientMapper';
import { mapOpdVisitList } from '@/shared/api/mappers/visitMapper';

function mapRecentPatient(row) {
  if (!row) return null;
  const uid = row.patient_uid ?? row.patientUid ?? null;
  return {
    id: uid ?? String(row.id ?? ''),
    dbId: row.id ?? null,
    name: row.name ?? '',
    phone: row.phone ?? '',
    registeredDate: formatPatientRegisteredDate(row.created_at ?? row.createdAt),
  };
}

export function apiToUiDashboard(raw) {
  if (!raw) return null;
  return {
    visitsToday: raw.visits_today ?? raw.visitsToday ?? 0,
    patientsTotal: raw.patients_total ?? raw.patientsTotal ?? 0,
    pendingBills: raw.pending_bills ?? raw.pendingBills ?? 0,
    appointmentsToday: raw.appointments_today ?? raw.appointmentsToday ?? 0,
    todayCollected: Number(raw.today_collected ?? raw.todayCollected ?? 0),
    todayBillsCount: raw.today_bills_count ?? raw.todayBillsCount ?? 0,
    todayPendingPayments: raw.today_pending_payments ?? raw.todayPendingPayments ?? 0,
    recentPatients: (raw.recent_patients ?? raw.recentPatients ?? [])
      .map(mapRecentPatient)
      .filter(Boolean),
    todayAppointments: (raw.today_appointments ?? raw.todayAppointments ?? [])
      .map(apiToUiAppointment)
      .filter(Boolean),
    recentVisits: mapOpdVisitList({ visits: raw.recent_visits ?? raw.recentVisits ?? [] }),
  };
}

export async function fetchOpdDashboard(token) {
  const raw = await getOpdDashboard(token);
  return apiToUiDashboard(raw);
}
