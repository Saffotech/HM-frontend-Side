import { getPatients } from '@/features/doctor/api/patients';
import { getPatientHistoryPage } from '@/features/doctor/api/patientHistoryPage';
import {
  mapPatientVisitList,
  mapVisitHistoryList,
} from '@/shared/api/mappers/doctorPatientMapper';
import { fetchPrescriptionsByPatient } from '@/shared/api/services/doctorPrescriptions';

const HISTORY_PAGE_SIZE = 100;
const MAX_HISTORY_PAGES = 20;

export async function listPatientVisits(token, params = {}) {
  const { patients, totalPatients, page, limit } = await getPatients(token, params);
  return {
    visits: mapPatientVisitList(patients),
    totalPatients,
    page,
    limit,
  };
}

async function fetchAllPatientHistoryItems(patientUhid, token, params = {}) {
  const pageSize = params.page_size ?? HISTORY_PAGE_SIZE;
  let page = 1;
  let allItems = [];
  let total = null;

  while (page <= MAX_HISTORY_PAGES) {
    const batch = await getPatientHistoryPage(patientUhid, token, {
      encounter_type: 'all',
      page_size: pageSize,
      page,
      ...params,
    });

    if (page === 1) {
      total = batch.total ?? batch.items.length;
    }

    allItems = allItems.concat(batch.items ?? []);

    if ((batch.items?.length ?? 0) < pageSize) break;
    if (total != null && allItems.length >= total) break;
    page += 1;
  }

  return allItems;
}

export async function fetchPatientHistory(patientUhid, token, params = {}) {
  const history = await fetchAllPatientHistoryItems(patientUhid, token, params);
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
