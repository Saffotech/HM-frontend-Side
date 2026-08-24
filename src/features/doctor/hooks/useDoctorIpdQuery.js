import { useMemo } from 'react';
import { useQuery, useQueries } from '@tanstack/react-query';
import { getDoctorIpdAdmissions } from '@/features/doctor/api/ipd';
import { apiToUiAppointment } from '@/shared/api/mappers/appointmentMapper';
import { doctorPatientsApi } from '@/shared/api/services';
import { queryKeys } from '@/shared/api/queryKeys';
import { useQueryToken } from '@/shared/hooks/useQueryToken';
import { DOCTOR_IPD_LIVE_QUERY_OPTIONS } from '@/features/doctor/utils/doctorDashboardCache';

/** Cap day-by-day nurse visit lookups (API is single-day only). */
const MAX_VISIT_LOOKUP_DAYS = 45;

export function useDoctorIpdAdmissionsQuery(filters = {}, options = {}) {
  const { enabled = true } = options;
  const token = useQueryToken();

  return useQuery({
    queryKey: queryKeys.doctor.ipd.admissions(filters),
    queryFn: async () => {
      const raw = await getDoctorIpdAdmissions(token, filters);
      return {
        items: (raw?.items ?? []).map(apiToUiAppointment).filter(Boolean),
        total: raw?.total ?? 0,
        page: raw?.page ?? 1,
        page_size: raw?.page_size ?? filters.page_size ?? 20,
      };
    },
    enabled: Boolean(token) && enabled,
    ...DOCTOR_IPD_LIVE_QUERY_OPTIONS,
  });
}

function toIsoDate(value) {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function todayIsoDate() {
  return toIsoDate(new Date());
}

/**
 * Each calendar day from admission → discharge/today.
 * GET /doctor/patient-visits only accepts one visit_date (defaults to today).
 */
function nurseVisitDatesForRow(row) {
  const admitted = toIsoDate(row.admittedAt ?? row.scheduledAt);
  const today = todayIsoDate();
  const discharged = toIsoDate(row.dischargedAt);
  let end = today;
  if (discharged && today && discharged < today) end = discharged;
  if (!admitted && !end) return today ? [today] : [];
  if (!admitted) return end ? [end] : [];
  if (!end) return [admitted];

  const start = new Date(`${admitted}T12:00:00`);
  const stop = new Date(`${end}T12:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(stop.getTime())) {
    return [admitted];
  }

  const dates = [];
  const cursor = start <= stop ? new Date(start) : new Date(stop);
  const last = start <= stop ? stop : start;
  while (cursor <= last && dates.length < MAX_VISIT_LOOKUP_DAYS) {
    dates.push(toIsoDate(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  // If stay is longer than the cap, always include the most recent day too.
  if (dates.length >= MAX_VISIT_LOOKUP_DAYS && end && !dates.includes(end)) {
    dates[dates.length - 1] = end;
  }
  return dates.filter(Boolean);
}

async function fetchNurseVisitCountForDates(token, { patientId, patientUid, dates }) {
  if (!dates.length) return 0;

  const uniqueDates = [...new Set(dates)];
  const counts = await Promise.all(
    uniqueDates.map(async (visit_date) => {
      const params = { visit_date };
      if (patientId != null && !Number.isNaN(Number(patientId))) {
        params.patient_id = Number(patientId);
      }
      if (patientUid) params.patient_uid = patientUid;
      try {
        const data = await doctorPatientsApi.fetchDoctorPatientVisits(token, params);
        return Number(data?.visit_count) || 0;
      } catch {
        return 0;
      }
    }),
  );

  return counts.reduce((sum, n) => sum + n, 0);
}

/**
 * Map of admissionId / patientDbId / patientUid → nurse "No of visits".
 * Source: GET /doctor/patient-visits (nurse doctor-visit records).
 */
export function useIpdPatientVisitCounts(rows = []) {
  const token = useQueryToken();

  const targets = useMemo(
    () =>
      rows
        .map((row) => ({
          admissionId: row.admissionId ?? null,
          patientId: row.patientDbId ?? null,
          patientUid: row.patientUid ?? null,
          dates: nurseVisitDatesForRow(row),
        }))
        .filter(
          (row) =>
            row.admissionId != null || row.patientId != null || Boolean(row.patientUid),
        ),
    [rows],
  );

  const results = useQueries({
    queries: targets.map((target) => ({
      queryKey: [
        'doctor',
        'ipd',
        'nurse-visit-count',
        target.admissionId,
        target.patientId,
        target.patientUid,
        target.dates,
      ],
      queryFn: () =>
        fetchNurseVisitCountForDates(token, {
          patientId: target.patientId,
          patientUid: target.patientUid,
          dates: target.dates,
        }),
      enabled:
        Boolean(token) &&
        (target.patientId != null || Boolean(target.patientUid)),
      staleTime: 30 * 1000,
    })),
  });

  return useMemo(() => {
    const map = new Map();
    targets.forEach((target, index) => {
      const pending = Boolean(results[index]?.isPending);
      const nurseCount = results[index]?.isSuccess
        ? Number(results[index].data) || 0
        : 0;
      const value = pending ? null : nurseCount;

      if (target.admissionId != null) map.set(target.admissionId, value);
      if (target.patientId != null) map.set(target.patientId, value);
      if (target.patientUid) map.set(target.patientUid, value);
    });
    return map;
  }, [targets, results]);
}
