import {
  getPatients,
  getPatientHistory,
} from '@/features/doctor/api/patients';
import {
  mapPatientVisitList,
  mapVisitHistoryList,
} from '@/shared/api/mappers/doctorPatientMapper';
import { fetchPrescriptionsByPatient } from '@/shared/api/services/doctorPrescriptions';

export async function listPatientVisits(token, params = {}) {
  const { patients, totalPatients, page, limit } = await getPatients(token, params);
  return {
    visits: mapPatientVisitList(patients),
    totalPatients,
    page,
    limit,
  };
}

export async function fetchPatientHistory(patientUhid, token) {
  const history = await getPatientHistory(patientUhid, token);
  const visitRows = mapPatientVisitList(history);
  return {
    patientUid: patientUhid,
    patientId: visitRows[0]?.patientId ?? null,
    phone: visitRows[0]?.phone ?? null,
    visits: mapVisitHistoryList(history),
  };
}

export async function fetchPatientPrescriptions(patientId, token) {
  return fetchPrescriptionsByPatient(patientId, token);
}
