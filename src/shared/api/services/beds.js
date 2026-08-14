/**
 * Shared bed list helpers for admin inventory / nurse allocation UIs.
 * Live occupy / transfer / release is IPD-owned (`features/ipd/api/beds.js`).
 */

import { getBeds, apiBedToUi } from '@/features/opd/beds/api/beds';
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

export async function listBeds(token, params = {}) {
  const r = await getBeds(token, params);
  let beds = (r.beds ?? []).map(apiBedToUi);
  beds = await enrichBedsWithPatientDepartment(beds, token);
  return {
    beds,
    stats: r.stats ?? null,
  };
}

export async function listBedsByWard(wardName, token) {
  return listBeds(token, { ward: wardName });
}



