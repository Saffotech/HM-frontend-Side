import { getBeds, getBedsByWard, assignBed, releaseBed, apiBedToUi } from '@/features/opd/beds/api/beds';
import { apiClient } from '@/shared/api/client';
import { getPatient, getPatientProfileById } from '@/shared/api/services/patients';

/** Registration department lives on OPD visits — fill bed rows when bed.department_id was not set. */
async function enrichBedsWithPatientDepartment(beds, token) {
  const needsDept = beds.filter((b) => b.patientId && !b.department);
  if (!needsDept.length) return beds;

  const uids = [...new Set(needsDept.map((b) => b.patientId))];
  const pairs = await Promise.all(
    uids.map(async (uid) => {
      try {
        const patient = await getPatient(uid, token);
        if (!patient?.dbId) return [uid, null];
        const profile = await getPatientProfileById(patient.dbId, token);
        return [uid, profile?.visits?.[0]?.department ?? null];
      } catch {
        return [uid, null];
      }
    })
  );
  const deptByPatient = new Map(pairs.filter(([, dept]) => dept));

  return beds.map((b) => ({
    ...b,
    department: b.department || deptByPatient.get(b.patientId) || b.department,
  }));
}

export async function listBeds(token) {
  const r = await getBeds(token);
  let beds = (r.beds ?? []).map(apiBedToUi);
  beds = await enrichBedsWithPatientDepartment(beds, token);
  return {
    beds,
    stats: r.stats ?? null,
  };
}

export async function listBedsByWard(wardName, token) {
  const raw = await getBedsByWard(wardName, token);
  let beds = (raw.beds ?? []).map(apiBedToUi);
  beds = await enrichBedsWithPatientDepartment(beds, token);
  return {
    wardName: raw.ward_name ?? wardName,
    beds,
    stats: raw.stats ?? null,
    occupancyPercent: raw.occupancy_percent ?? 0,
  };
}

export async function assignBedToPatient(payload, token) {
  return assignBed(payload, token);
}

export async function releaseBedById(bedId, token) {
  return releaseBed(bedId, token);
}

/** Occupied beds keyed by internal patient DB id — for nurse queue enrichment. */
export async function getOccupiedBedMapByPatientDbId(token) {
  const response = await apiClient('/opd/beds', { token });
  const beds = response.beds ?? [];
  const map = new Map();
  for (const bed of beds) {
    if (bed.status !== 'occupied' || bed.patient_id == null) continue;
    const pid = Number(bed.patient_id);
    if (!Number.isFinite(pid) || map.has(pid)) continue;
    map.set(pid, {
      bed_number: bed.bed_number ?? '',
      ward_name: bed.ward_name ?? '',
    });
  }
  return map;
}
