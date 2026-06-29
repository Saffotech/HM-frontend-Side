/**
 * Nurse business data — live backend HTTP only.
 */

import * as nurseApi from '@/features/nurse/api/nurse';
import { getOccupiedBedMapByPatientDbId } from '@/shared/api/services/beds';
import {
  mapQueueResponse,
  mapQueueFiltersToApi,
  enrichQueueItemsWithBeds,
  mapVitalsNotesSearchToApi,
  mapMedicationPatientsSearchToApi,
  mapMedicationHistoryFiltersToApi,
  mapVitalItem,
  mapNoteItem,
  wrapPagedArray,
  mapMedicationPatientsResponse,
  mapPatientMedicationsResponse,
  mapMedicationHistoryRow,
  mapHandoverListResponse,
  mapHandoverDetail,
  mapHandoverListItem,
  mapAlertListResponse,
  mapAlertDetail,
  mapAlertItem,
  toApiVitalBody,
  toApiNoteBody,
  toApiMedicationAdminBody,
  toApiMedicationAdminUpdateBody,
  applyQueuePatientUidLookup,
  attachPatientUid,
  resolvePatientUid,
  mapMedicationPatientRow,
} from '@/shared/api/mappers/nurseMapper';

/** Backend GET /nurse/queue/today enforces page_size <= 100. */
export const NURSE_QUEUE_MAX_PAGE_SIZE = 100;

async function fetchTodayQueueItems(token) {
  const raw = await nurseApi.getTodayQueue({ page: 1, page_size: NURSE_QUEUE_MAX_PAGE_SIZE }, token);
  const mapped = mapQueueResponse(raw);
  const enriched = await enrichQueueResponse(mapped, token);
  return enriched.items ?? [];
}

async function fetchPatientUidSources(token) {
  const [queueItems, rawMeds] = await Promise.all([
    fetchTodayQueueItems(token),
    nurseApi.getMedicationPatients({ page: 1, page_size: NURSE_QUEUE_MAX_PAGE_SIZE }, token),
  ]);
  const medRows = Array.isArray(rawMeds) ? rawMeds : rawMeds?.items ?? rawMeds?.data ?? [];
  const medItems = medRows.map(mapMedicationPatientRow).filter(Boolean);
  return [...queueItems, ...medItems];
}

async function enrichRowsWithQueueUid(items, token) {
  const rows = (items ?? []).map((item) => attachPatientUid(item));
  const uidSources = await fetchPatientUidSources(token);
  return applyQueuePatientUidLookup(rows, uidSources);
}

async function enrichRowsWithOccupiedBeds(items, token) {
  if (!items?.length) return items;
  const needsBed = items.some((item) => !item.bed_number || item.bed_number === '—');
  if (!needsBed) return items;
  const bedMap = await getOccupiedBedMapByPatientDbId(token);
  return enrichQueueItemsWithBeds(items, bedMap);
}

async function enrichNursePatientRows(items, token) {
  const withMeta = await enrichRowsWithQueueUid(items, token);
  return enrichRowsWithOccupiedBeds(withMeta, token);
}

async function enrichHandoverDetail(handover, token) {
  if (!handover?.patients?.length) return handover;
  const uidSources = await fetchPatientUidSources(token);
  return {
    ...handover,
    patients: applyQueuePatientUidLookup(handover.patients, uidSources),
  };
}

function clampQueuePageSize(pageSize) {
  const n = Number(pageSize);
  if (!Number.isFinite(n) || n < 1) return 20;
  return Math.min(n, NURSE_QUEUE_MAX_PAGE_SIZE);
}

async function enrichQueueResponse(mapped, token) {
  if (!mapped?.items?.length) return mapped;
  const needsBed = mapped.items.some(
    (item) => !item.bed_number || item.bed_number === '—',
  );
  if (!needsBed) return mapped;
  const bedMap = await getOccupiedBedMapByPatientDbId(token);
  return {
    ...mapped,
    items: enrichQueueItemsWithBeds(mapped.items, bedMap),
  };
}

export async function getQueue(params = {}, token) {
  const safeParams = {
    ...params,
    ...(params.page_size != null ? { page_size: clampQueuePageSize(params.page_size) } : {}),
  };
  const raw = await nurseApi.getTodayQueue(mapQueueFiltersToApi(safeParams), token);
  const mapped = mapQueueResponse(raw);
  return enrichQueueResponse(mapped, token);
}

export async function createVitals(data, token) {
  const raw = await nurseApi.createVital(toApiVitalBody(data), token);
  const [mapped] = await enrichNursePatientRows([mapVitalItem(raw)], token);
  return mapped;
}

export async function updateVitals(vitalId, data, token) {
  const raw = await nurseApi.updateVital(vitalId, toApiVitalBody(data), token);
  const [mapped] = await enrichNursePatientRows([mapVitalItem(raw)], token);
  return mapped;
}

export async function getVital(vitalId, token) {
  const raw = await nurseApi.getVitalById(vitalId, token);
  const [mapped] = await enrichNursePatientRows([mapVitalItem(raw)], token);
  return mapped;
}

export async function listVitals(params = {}, token) {
  const { search, page = 1, page_size = 20, ...rest } = params;
  if (search?.trim()) {
    const raw = await nurseApi.searchVitals({
      ...mapVitalsNotesSearchToApi(search),
      page,
      page_size,
      ...rest,
    }, token);
    const wrapped = wrapPagedArray(raw, { page, page_size }, mapVitalItem);
    return {
      ...wrapped,
      items: await enrichNursePatientRows(wrapped.items, token),
    };
  }
  const raw = await nurseApi.listVitals({ page, page_size, ...rest }, token);
  const wrapped = wrapPagedArray(raw, { page, page_size }, mapVitalItem);
  return {
    ...wrapped,
    items: await enrichNursePatientRows(wrapped.items, token),
  };
}

export async function searchVitals(params = {}, token) {
  const { page = 1, page_size = 20, ...rest } = params;
  const raw = await nurseApi.searchVitals({ page, page_size, ...rest }, token);
  const wrapped = wrapPagedArray(raw, { page, page_size }, mapVitalItem);
  return {
    ...wrapped,
    items: await enrichNursePatientRows(wrapped.items, token),
  };
}

export async function createNote(data, token) {
  const raw = await nurseApi.createNote(toApiNoteBody(data), token);
  const [mapped] = await enrichNursePatientRows([mapNoteItem(raw)], token);
  return mapped;
}

export async function updateNote(noteId, data, token) {
  const raw = await nurseApi.updateNote(noteId, toApiNoteBody(data), token);
  const [mapped] = await enrichNursePatientRows([mapNoteItem(raw)], token);
  return mapped;
}

export async function getNote(noteId, token) {
  const raw = await nurseApi.getNoteById(noteId, token);
  const [mapped] = await enrichNursePatientRows([mapNoteItem(raw)], token);
  return mapped;
}

export async function listNotes(params = {}, token) {
  const { search, page = 1, page_size = 20, ...rest } = params;
  if (search?.trim()) {
    const raw = await nurseApi.searchNotes({
      ...mapVitalsNotesSearchToApi(search),
      page,
      page_size,
      ...rest,
    }, token);
    const wrapped = wrapPagedArray(raw, { page, page_size }, mapNoteItem);
    return {
      ...wrapped,
      items: await enrichNursePatientRows(wrapped.items, token),
    };
  }
  const raw = await nurseApi.listNotes({ page, page_size, ...rest }, token);
  const wrapped = wrapPagedArray(raw, { page, page_size }, mapNoteItem);
  return {
    ...wrapped,
    items: await enrichNursePatientRows(wrapped.items, token),
  };
}

export async function searchNotes(params = {}, token) {
  const { page = 1, page_size = 20, ...rest } = params;
  const raw = await nurseApi.searchNotes({ page, page_size, ...rest }, token);
  const wrapped = wrapPagedArray(raw, { page, page_size }, mapNoteItem);
  return {
    ...wrapped,
    items: await enrichNursePatientRows(wrapped.items, token),
  };
}

export async function getMedicationPatients(params = {}, token) {
  const { page = 1, page_size = 100, search, ...rest } = params;
  const mapped = search?.trim() ? mapMedicationPatientsSearchToApi(search) : {};
  const searchFilters = {
    ...('patient_id' in mapped ? { patient_id: mapped.patient_id } : {}),
    ...('patient_uid' in mapped ? { patient_uid: mapped.patient_uid } : {}),
    ...('patient_name' in mapped ? { patient_name: mapped.patient_name } : {}),
  };
  const raw = await nurseApi.getMedicationPatients({
    page,
    page_size,
    ...searchFilters,
    ...rest,
  }, token);
  return mapMedicationPatientsResponse(raw, { page, page_size });
}

export async function getMedicationHistory(params = {}, token) {
  const { page = 1, page_size = 20, ...rest } = params;
  const apiParams = mapMedicationHistoryFiltersToApi(rest);
  const raw = await nurseApi.getMedicationHistory({ page, page_size, ...apiParams }, token);
  return wrapPagedArray(raw, { page, page_size }, mapMedicationHistoryRow);
}

export async function getPatientMedications(patientId, token) {
  const id = Number(patientId);
  const [rawMeds, historyPaged] = await Promise.all([
    nurseApi.getPatientMedications(patientId, token),
    getMedicationHistory(
      { patient_id: Number.isFinite(id) && id >= 1 ? id : patientId, page: 1, page_size: 100 },
      token,
    ),
  ]);
  const historyRows = historyPaged?.items ?? [];
  let mapped = mapPatientMedicationsResponse(rawMeds, historyRows);
  if (!resolvePatientUid(mapped) && Number.isFinite(id) && id >= 1) {
    const medList = await getMedicationPatients({ patient_id: id, page: 1, page_size: 1 }, token);
    const uid = medList?.items?.[0]?.patientUid;
    if (uid) mapped = attachPatientUid({ ...mapped, patient_uid: uid });
  }
  const [enriched] = await enrichRowsWithQueueUid([mapped], token);
  return enriched ?? mapped;
}

export async function administerMedication(data, token) {
  return nurseApi.administerMedication(toApiMedicationAdminBody(data), token);
}

export async function updateAdministration(id, data, token) {
  return nurseApi.updateMedicationAdministration(id, toApiMedicationAdminUpdateBody(data), token);
}

export async function getPatientMedicationHistory(patientId, token) {
  const raw = await nurseApi.getPatientMedicationHistory(patientId, token);
  const rows = Array.isArray(raw) ? raw : raw?.items ?? [];
  return wrapPagedArray(rows, { page: 1, page_size: rows.length || 20 }, mapMedicationHistoryRow);
}

export async function createHandover(data, token) {
  const raw = await nurseApi.createHandover(data, token);
  return mapHandoverDetail(raw) ?? mapHandoverListItem(raw);
}

export async function updateHandover(id, data, token) {
  const raw = await nurseApi.updateHandover(id, data, token);
  return mapHandoverDetail(raw) ?? mapHandoverListItem(raw);
}

export async function bulkAddPatients(handoverId, patients, token) {
  return nurseApi.bulkAddHandoverPatients(handoverId, { patients }, token);
}

export async function updatePatientRow(summaryId, data, token) {
  return nurseApi.updateHandoverPatient(summaryId, data, token);
}

export async function deletePatientRow(summaryId, token) {
  return nurseApi.deleteHandoverPatient(summaryId, token);
}

export async function submitHandover(id, token) {
  const raw = await nurseApi.submitHandover(id, token);
  return mapHandoverDetail(raw) ?? mapHandoverListItem(raw);
}

export async function listHandovers(params = {}, token) {
  const raw = await nurseApi.listHandovers(params, token);
  return mapHandoverListResponse(raw);
}

export async function getHandover(id, token) {
  const raw = await nurseApi.getHandoverById(id, token);
  const mapped = mapHandoverDetail(raw);
  return enrichHandoverDetail(mapped, token);
}

export async function getAlerts(params = {}, token) {
  const raw = await nurseApi.getAlerts(params, token);
  return mapAlertListResponse(raw);
}

export async function getAlertSummary(token) {
  return nurseApi.getAlertSummary(token);
}

export async function createAlert(data, token) {
  const raw = await nurseApi.createAlert(data, token);
  return mapAlertDetail(raw) ?? mapAlertItem(raw);
}

export async function getAlert(id, token) {
  const raw = await nurseApi.getAlertById(id, token);
  return mapAlertDetail(raw);
}

export async function assignAlert(alertId, data, token) {
  const raw = await nurseApi.assignAlert(alertId, data, token);
  return mapAlertDetail(raw);
}

export async function resolveAlert(alertId, data, token) {
  const raw = await nurseApi.resolveAlert(alertId, data, token);
  return mapAlertDetail(raw);
}

export async function escalateAlert(alertId, data, token) {
  const raw = await nurseApi.escalateAlert(alertId, data, token);
  return mapAlertDetail(raw);
}
