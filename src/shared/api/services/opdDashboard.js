import { getOpdDashboard } from '@/features/opd/api/dashboard';
import { mapOpdVisitList } from '@/shared/api/mappers/visitMapper';

export function apiToUiDashboard(raw) {
  if (!raw) return null;
  return {
    visitsToday: raw.visits_today ?? raw.visitsToday ?? 0,
    patientsTotal: raw.patients_total ?? raw.patientsTotal ?? 0,
    pendingBills: raw.pending_bills ?? raw.pendingBills ?? 0,
    appointmentsToday: raw.appointments_today ?? raw.appointmentsToday ?? 0,
    bedsFree: raw.beds_free ?? raw.bedsFree ?? 0,
    bedsTotal: raw.beds_total ?? raw.bedsTotal ?? 0,
    recentVisits: mapOpdVisitList({ visits: raw.recent_visits ?? raw.recentVisits ?? [] }),
  };
}

export async function fetchOpdDashboard(token) {
  const raw = await getOpdDashboard(token);
  return apiToUiDashboard(raw);
}
