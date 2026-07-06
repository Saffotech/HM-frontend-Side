import { getOpdDashboard, getTodayBillingVisits } from '@/features/opd/api/dashboard';
import { getPatients } from '@/features/opd/api/patients';
import { getBeds } from '@/features/opd/beds/api/beds';
import { getAppointments } from '@/features/opd/api/appointments';
import { getBills } from '@/features/opd/billing/api/billing';
import { mapOpdVisitList } from '@/shared/api/mappers/visitMapper';
import { getTodayRangeIso } from '@/shared/utils/opdDates';
import { simplifyAppointmentListParams } from '@/shared/api/utils/opdAppointmentParams';

function mapWardBedStats(raw = []) {
  return raw.map((ward) => {
    const occupied = ward.occupied ?? 0;
    const available = ward.available ?? 0;
    const total = occupied + available;
    return {
      ward: ward.ward,
      occupied,
      available,
      total,
      percent: total ? Math.round((occupied / total) * 100) : 0,
    };
  });
}

function wardBedStatsFromBeds(beds = []) {
  const byWard = new Map();
  for (const bed of beds) {
    const ward = bed.ward_name ?? bed.ward ?? 'General';
    const status = String(bed.status ?? '').toLowerCase();
    const row = byWard.get(ward) ?? { ward, occupied: 0, available: 0 };
    if (status === 'occupied') row.occupied += 1;
    else row.available += 1;
    byWard.set(ward, row);
  }
  return mapWardBedStats([...byWard.values()]);
}

export function apiToUiDashboard(raw) {
  if (!raw) return null;
  const wardStats = raw.ward_bed_stats ?? raw.wardBedStats ?? [];
  return {
    visitsToday: raw.visits_today ?? raw.visitsToday ?? 0,
    patientsTotal: raw.patients_total ?? raw.patientsTotal ?? 0,
    pendingBills: raw.pending_bills ?? raw.pendingBills ?? 0,
    appointmentsToday: raw.appointments_today ?? raw.appointmentsToday ?? 0,
    bedsFree: raw.beds_free ?? raw.bedsFree ?? 0,
    bedsTotal: raw.beds_total ?? raw.bedsTotal ?? 0,
    wardBedStats: mapWardBedStats(wardStats),
    recentVisits: mapOpdVisitList({ visits: raw.recent_visits ?? raw.recentVisits ?? [] }),
  };
}

async function fetchOpdDashboardFallback(token) {
  const { dateKey } = getTodayRangeIso();
  const [patientsRaw, bedsRaw, visitsRaw, billsRaw, appointmentsRaw] = await Promise.all([
    getPatients(token, { page: 1, limit: 1 }).catch(() => null),
    getBeds(token).catch(() => null),
    getTodayBillingVisits(token).catch(() => null),
    getBills(token, { status: 'pending', page: 1, limit: 1 }).catch(() => null),
    getAppointments(token, simplifyAppointmentListParams({ date: dateKey, page: 1, limit: 50 })).catch(
      () => null
    ),
  ]);

  const beds = bedsRaw?.beds ?? [];
  const bedStats = bedsRaw?.stats ?? {};
  const visits = visitsRaw?.visits ?? [];
  const appointments = appointmentsRaw?.appointments ?? [];
  const scheduledToday = appointments.filter(
    (a) => String(a.status ?? '').toLowerCase() === 'scheduled'
  ).length;

  return apiToUiDashboard({
    visits_today: visitsRaw?.total ?? visits.length,
    patients_total: patientsRaw?.total ?? 0,
    pending_bills: billsRaw?.total ?? billsRaw?.summary?.outstanding_count ?? 0,
    appointments_today: scheduledToday || (appointmentsRaw?.total ?? 0),
    beds_free: bedStats.available ?? beds.filter((b) => String(b.status).toLowerCase() === 'available').length,
    beds_total: bedStats.total ?? beds.length,
    ward_bed_stats: wardBedStatsFromBeds(beds),
    recent_visits: visits.slice(0, 5),
  });
}

const EMPTY_DASHBOARD = {
  visits_today: 0,
  patients_total: 0,
  pending_bills: 0,
  appointments_today: 0,
  beds_free: 0,
  beds_total: 0,
  ward_bed_stats: [],
  recent_visits: [],
};

export async function fetchOpdDashboard(token) {
  try {
    const raw = await getOpdDashboard(token);
    return apiToUiDashboard(raw);
  } catch (err) {
    if (err?.status === 401 || err?.status === 403) throw err;
    try {
      return await fetchOpdDashboardFallback(token);
    } catch {
      return apiToUiDashboard(EMPTY_DASHBOARD);
    }
  }
}
