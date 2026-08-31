/**
 * Nurse business data — live backend HTTP only.
 */

import * as nurseApi from '@/features/nurse/api/nurse';
import * as doctorVisitsApi from '@/features/nurse/api/doctorVisits';
import { getPrescriptionsByPatient } from '@/features/doctor/api/prescriptions';
import {
  mapQueueResponse,
  mapBedPatientsResponse,
  mapBedAllocationSummary,
  mapQueueFiltersToApi,
  enrichQueueItemsWithBeds,
  filterNursePatientRegistryItems,
  paginateClientItems,
  mapMedicationHistoryFiltersToApi,
  mapVitalItem,
  mapNoteItem,
  assembleVitalHistoryFromItems,
  withAssembledVitalHistory,
  wrapPagedArray,
  mapPatientMedicationsResponse,
  mapMedicationHistoryRow,
  mapMedicationPatientRow,
  dedupeMedicationPatientsByPatientId,
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
  mapDoctorVisitItem,
  mapDoctorVisitListResponse,
  mapDoctorListResponse,
  mapDepartmentListResponse,
  toApiDoctorVisitCreateBody,
  toApiDoctorVisitUpdateBody,
  mapLabReportDetail,
  mapLabReportListResponse,
} from '@/shared/api/mappers/nurseMapper';

/** Backend GET /nurse/queue/today enforces page_size <= 100. */
export const NURSE_QUEUE_MAX_PAGE_SIZE = 100;

/** Cap nurse registry client-search fetches (100 rows per page). */
const NURSE_REGISTRY_SEARCH_MAX_PAGES = 10;

function withAllocatedOnly(params = {}) {
  return params.allocated_only === true ? { allocated_only: true } : {};
}

/** Occupied bed/ward by patient_id from nurse-accessible beds API (not admin /opd/beds). */
function bedMapFromNurseBedPatients(bedItems = []) {
  const map = new Map();
  for (const row of bedItems) {
    const pid = Number(row?.patient_id);
    if (!Number.isSafeInteger(pid) || pid < 1 || map.has(pid)) continue;
    const bedNumber = row.bed_number ?? '';
    if (!bedNumber || bedNumber === '—') continue;
    map.set(pid, {
      bed_number: bedNumber,
      ward_name: row.ward_name ?? '',
    });
  }
  return map;
}

async function fetchTodayQueueItems(token) {
  const raw = await nurseApi.getTodayQueue({ page: 1, page_size: NURSE_QUEUE_MAX_PAGE_SIZE }, token);
  const mapped = mapQueueResponse(raw);
  const enriched = await enrichQueueResponse(mapped, token);
  return enriched.items ?? [];
}

async function fetchBedPatientItems(token) {
  const raw = await nurseApi.getBedPatients({ page: 1, page_size: NURSE_QUEUE_MAX_PAGE_SIZE }, token);
  return mapBedPatientsResponse(raw).items ?? [];
}

async function fetchPatientUidSources(token) {
  const [bedItems, rawMeds] = await Promise.all([
    fetchBedPatientItems(token),
    nurseApi.getMedicationPatients({ page: 1, page_size: NURSE_QUEUE_MAX_PAGE_SIZE }, token),
  ]);
  const medRows = Array.isArray(rawMeds) ? rawMeds : rawMeds?.items ?? rawMeds?.data ?? [];
  const medItems = medRows.map(mapMedicationPatientRow).filter(Boolean);
  return { bedItems, uidSources: [...bedItems, ...medItems] };
}

async function enrichRowsWithQueueUid(items, token) {
  const rows = (items ?? []).map((item) => attachPatientUid(item));
  const { uidSources } = await fetchPatientUidSources(token);
  return applyQueuePatientUidLookup(rows, uidSources);
}

function enrichRowsWithOccupiedBeds(items, bedItems) {
  if (!items?.length) return items;
  const needsBed = items.some((item) => !item.bed_number || item.bed_number === '—');
  if (!needsBed) return items;
  return enrichQueueItemsWithBeds(items, bedMapFromNurseBedPatients(bedItems));
}

async function enrichNursePatientRows(items, token) {
  const rows = (items ?? []).map((item) => attachPatientUid(item));
  const { bedItems, uidSources } = await fetchPatientUidSources(token);
  const withMeta = applyQueuePatientUidLookup(rows, uidSources);
  return enrichRowsWithOccupiedBeds(withMeta, bedItems);
}

async function enrichHandoverDetail(handover, token) {
  if (!handover?.patients?.length) return handover;
  const { uidSources } = await fetchPatientUidSources(token);
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
  const bedItems = await fetchBedPatientItems(token);
  return {
    ...mapped,
    items: enrichQueueItemsWithBeds(mapped.items, bedMapFromNurseBedPatients(bedItems)),
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

/** Occupied-bed patients for nurse dashboard (GET /nurse/beds/patients). */
export async function getBedPatients(params = {}, token) {
  const page = params.page ?? 1;
  const pageSize = Math.min(Math.max(params.page_size ?? 20, 1), 100);
  const allocatedOnly = params.allocated_only === true;
  const raw = await nurseApi.getBedPatients({
    search: params.search,
    ward_name: params.ward_name,
    bed_number: params.bed_number,
    department_id: params.department_id,
    patient_id: params.patient_id,
    patient_uid: params.patient_uid,
    page,
    page_size: pageSize,
    // Optional — omit when false so defaults match pre-Phase-4 behaviour
    ...(allocatedOnly ? { allocated_only: true } : {}),
    ...(params.assignment_date ? { assignment_date: params.assignment_date } : {}),
    ...(params.shift_name ? { shift_name: params.shift_name } : {}),
  }, token);
  return mapBedPatientsResponse(raw);
}

/** Additive Phase 4 — nurse shift bed assignment summary. */
export async function getBedAllocationSummary(params = {}, token) {
  const raw = await nurseApi.getBedAllocationSummary({
    ...(params.assignment_date ? { assignment_date: params.assignment_date } : {}),
    ...(params.shift_name ? { shift_name: params.shift_name } : {}),
  }, token);
  return mapBedAllocationSummary(raw);
}

// —— Nurse self-service: roster + allocated beds span ——
export async function getMyDuty(token) {
  return nurseApi.getMyDuty(token);
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
  const patientId = mapped?.patient_id;
  // Always merge patient recordings so Recorded At can list past entries.
  if (patientId) {
    try {
      const siblings = await searchVitals(
        { patient_id: patientId, page: 1, page_size: NURSE_QUEUE_MAX_PAGE_SIZE },
        token,
      );
      return withAssembledVitalHistory(mapped, siblings?.items ?? []) || mapped;
    } catch {
      return mapped;
    }
  }
  return mapped;
}

async function fetchAllRegistryItems(params, token, { listFn, mapItem }) {
  const scopeParams = withAllocatedOnly(params);
  const { search: _search, page: _page, page_size: _pageSize, ...rest } = params;
  const mapped = [];

  for (let page = 1; page <= NURSE_REGISTRY_SEARCH_MAX_PAGES; page += 1) {
    const raw = await listFn({
      page,
      page_size: NURSE_QUEUE_MAX_PAGE_SIZE,
      ...rest,
      ...scopeParams,
    }, token);
    const wrapped = wrapPagedArray(raw, { page, page_size: NURSE_QUEUE_MAX_PAGE_SIZE }, mapItem);
    mapped.push(...(wrapped.items ?? []));
    if (!wrapped.hasNextPage) break;
  }

  return enrichNursePatientRows(mapped, token);
}

async function fetchAllVitalsRegistryItems(params, token) {
  return fetchAllRegistryItems(params, token, {
    listFn: nurseApi.listVitals,
    mapItem: mapVitalItem,
  });
}

async function fetchAllNotesRegistryItems(params, token) {
  return fetchAllRegistryItems(params, token, {
    listFn: nurseApi.listNotes,
    mapItem: mapNoteItem,
  });
}

async function fetchAllMedicationPatientsRegistryItems(params, token) {
  return fetchAllRegistryItems(params, token, {
    listFn: nurseApi.getMedicationPatients,
    mapItem: mapMedicationPatientRow,
  });
}

function listVitalsWithClientSearch(params, token) {
  const { search, page = 1, page_size = 20 } = params;
  const term = String(search ?? '').trim();
  return fetchAllVitalsRegistryItems(params, token).then((enriched) => {
    const filtered = filterNursePatientRegistryItems(enriched, term);
    return paginateClientItems(filtered, { page, page_size });
  });
}

function listNotesWithClientSearch(params, token) {
  const { search, page = 1, page_size = 20 } = params;
  const term = String(search ?? '').trim();
  return fetchAllNotesRegistryItems(params, token).then((enriched) => {
    const filtered = filterNursePatientRegistryItems(enriched, term);
    return paginateClientItems(filtered, { page, page_size });
  });
}

function listMedicationPatientsWithClientSearch(params, token) {
  const { search, page = 1, page_size = 20 } = params;
  const term = String(search ?? '').trim();
  return fetchAllMedicationPatientsRegistryItems(params, token).then((enriched) => {
    const deduped = dedupeMedicationPatientsByPatientId(enriched).filter(
      (row) => (Number(row?.medicine_count) || 0) > 0,
    );
    const filtered = term
      ? filterNursePatientRegistryItems(deduped, term)
      : deduped;
    return paginateClientItems(filtered, { page, page_size });
  });
}

export async function getMedicationPatients(params = {}, token) {
  // Always load + dedupe client-side so the registry is one row per patient
  // (backend returns one row per prescription).
  return listMedicationPatientsWithClientSearch(params, token);
}

/** Flatten prescription items from GET /prescriptions/patient/{id} (all Rxs). */
async function collectMedicationItemsFromDoctorPrescriptions(patientId, token) {
  if (patientId == null || patientId === '') return [];
  try {
    const rxs = await getPrescriptionsByPatient(patientId, token);
    const list = Array.isArray(rxs) ? rxs : [];
    const items = [];
    for (const rx of list) {
      for (const item of rx?.items ?? []) {
        const itemId = item.id ?? item.prescription_item_id;
        if (itemId == null) continue;
        items.push({
          prescription_item_id: itemId,
          prescription_id: rx.id ?? rx.prescription_id ?? null,
          medicine_name: item.medicine_name ?? item.name ?? '',
          dosage: item.dosage ?? '',
          frequency: item.frequency ?? '',
          duration: item.duration,
          instructions: item.instructions ?? null,
          route: item.route ?? '',
          form: item.form ?? null,
          timing: item.timing ?? null,
          quantity: item.quantity ?? null,
          appointment_id: rx.appointment_id ?? rx.appointmentId ?? null,
          admission_id: rx.admission_id ?? rx.admissionId ?? null,
          doctor_id: rx.doctor_id ?? rx.doctorId ?? null,
          doctor_name: rx.doctor_name ?? rx.doctorName ?? null,
          source:
            rx.admission_id != null || rx.admissionId != null
              ? 'IPD'
              : rx.appointment_id != null || rx.appointmentId != null
                ? 'OPD'
                : undefined,
        });
      }
    }
    return items;
  } catch {
    return [];
  }
}

function mergeMedicationItemsById(...lists) {
  const byId = new Map();
  for (const list of lists) {
    for (const item of list ?? []) {
      const key = String(item?.prescription_item_id ?? item?.id ?? '');
      if (!key || key === 'undefined' || key === 'null') continue;
      if (!byId.has(key)) byId.set(key, item);
    }
  }
  return [...byId.values()];
}

function extractNurseMedicationItems(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  const list = raw.medications ?? raw.prescriptions ?? raw.items ?? [];
  return Array.isArray(list) ? list : [];
}

export async function getPatientMedications(patientId, token) {
  const id = Number(patientId);
  const historyPatientKey = Number.isFinite(id) && id >= 1 ? id : patientId;

  let rawMeds = null;
  try {
    rawMeds = await nurseApi.getPatientMedications(patientId, token);
  } catch (err) {
    // 404 Prescription not found — still try other sources so the page is not empty.
    if (err?.status !== 404) throw err;
    rawMeds = null;
  }

  let historyRows = [];
  try {
    const historyPaged = await getMedicationHistory(
      { patient_id: historyPatientKey, page: 1, page_size: 100 },
      token,
    );
    historyRows = historyPaged?.items ?? [];
  } catch {
    historyRows = [];
  }

  if (!historyRows.length) {
    try {
      const patientHistory = await getPatientMedicationHistory(patientId, token);
      historyRows = patientHistory?.items ?? [];
    } catch {
      historyRows = [];
    }
  }

  // Nurse detail API is latest-Rx only. Merge every Rx's items when available
  // (doctor prescriptions list) so list count "2" still opens with both medicines.
  const nurseItems = extractNurseMedicationItems(rawMeds);
  const doctorItems = await collectMedicationItemsFromDoctorPrescriptions(
    historyPatientKey,
    token,
  );
  const mergedItems = mergeMedicationItemsById(nurseItems, doctorItems);

  // Expected count from registry (sum across prescriptions) for empty-state messaging.
  let expectedMedicineCount = mergedItems.length;
  try {
    const rawList = await nurseApi.getMedicationPatients(
      {
        patient_id: Number.isFinite(id) && id >= 1 ? id : undefined,
        page: 1,
        page_size: NURSE_QUEUE_MAX_PAGE_SIZE,
      },
      token,
    );
    const rows = Array.isArray(rawList)
      ? rawList
      : rawList?.items ?? rawList?.data ?? [];
    const forPatient = rows
      .map(mapMedicationPatientRow)
      .filter((row) => row && String(row.patient_id) === String(historyPatientKey));
    const sum = forPatient.reduce(
      (acc, row) => acc + (Number(row.medicine_count) || 0),
      0,
    );
    if (sum > expectedMedicineCount) expectedMedicineCount = sum;
  } catch {
    // ignore registry enrichment failures
  }

  let mapped = mapPatientMedicationsResponse(
    {
      ...(rawMeds && typeof rawMeds === 'object' && !Array.isArray(rawMeds)
        ? rawMeds
        : { patient_id: historyPatientKey }),
      medications: mergedItems,
    },
    historyRows,
  );
  mapped = {
    ...mapped,
    expectedMedicineCount,
  };

  try {
    if (!resolvePatientUid(mapped) && Number.isFinite(id) && id >= 1) {
      const medList = await getMedicationPatients({ patient_id: id, page: 1, page_size: 1 }, token);
      const uid = medList?.items?.[0]?.patientUid;
      if (uid) mapped = attachPatientUid({ ...mapped, patient_uid: uid });
    }
    const [enriched] = await enrichRowsWithQueueUid([mapped], token);
    return enriched ?? mapped;
  } catch {
    return mapped;
  }
}

export async function listVitals(params = {}, token) {
  const { search, page = 1, page_size = 20, ...rest } = params;
  const scopeParams = withAllocatedOnly(params);
  const term = String(search ?? '').trim();

  if (term) {
    return listVitalsWithClientSearch(params, token);
  }

  const raw = await nurseApi.listVitals({ page, page_size, ...rest, ...scopeParams }, token);
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
  const items = await enrichNursePatientRows(wrapped.items, token);
  const withHistory = rest.patient_id != null && rest.patient_id !== ''
    ? assembleVitalHistoryFromItems(items)
    : items;
  return {
    ...wrapped,
    items: withHistory,
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
  const scopeParams = withAllocatedOnly(params);
  const term = String(search ?? '').trim();

  if (term) {
    return listNotesWithClientSearch(params, token);
  }

  const raw = await nurseApi.listNotes({ page, page_size, ...rest, ...scopeParams }, token);
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

export async function getMedicationHistory(params = {}, token) {
  const { page = 1, page_size = 20, ...rest } = params;
  const apiParams = mapMedicationHistoryFiltersToApi(rest);
  const raw = await nurseApi.getMedicationHistory({ page, page_size, ...apiParams }, token);
  return wrapPagedArray(raw, { page, page_size }, mapMedicationHistoryRow);
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
  const {
    _scopeMode,
    allocated_only: allocatedOnlyFlag,
    ...rest
  } = params;
  const allocatedOnly = allocatedOnlyFlag === true || _scopeMode === 'allocated';
  const apiParams = { ...rest };
  // Never leave a stale allocated_only on "All" — omit the flag entirely.
  if (allocatedOnly) {
    apiParams.allocated_only = true;
  }
  const raw = await nurseApi.getAlerts(apiParams, token);
  return mapAlertListResponse(raw);
}

export async function getAlertSummary(params = {}, token) {
  // Back-compat: getAlertSummary(token)
  if (typeof params === 'string' || params == null) {
    return nurseApi.getAlertSummary({}, params);
  }
  const allocatedOnly = params.allocated_only === true || params._scopeMode === 'allocated';
  return nurseApi.getAlertSummary(
    allocatedOnly ? { allocated_only: true } : {},
    token,
  );
}

export async function createAlert(data, token) {
  const raw = await nurseApi.createAlert(data, token);
  return mapAlertDetail(raw) ?? mapAlertItem(raw);
}

export async function getAlert(id, token) {
  const raw = await nurseApi.getAlertById(id, token);
  return mapAlertDetail(raw);
}

export async function resolveAlert(alertId, data, token) {
  return nurseApi.resolveAlert(alertId, data, token);
}

// —— Nurse Doctor Visits ——

/** Backend GET /nurse/doctor-visits (allocated_only drives both API param + cache key). */
export async function listDoctorVisits(params = {}, token) {
  const { _scopeMode, allocated_only: allocatedOnlyFlag, ...rest } = params;
  const allocatedOnly = allocatedOnlyFlag === true || _scopeMode === 'allocated';
  const apiParams = { ...rest };
  if (allocatedOnly) apiParams.allocated_only = true;
  const raw = await doctorVisitsApi.listDoctorVisits(apiParams, token);
  return mapDoctorVisitListResponse(raw);
}

/** Backend GET /nurse/doctor-visits/doctors — active doctors for the picker. */
export async function listActiveDoctors(params = {}, token) {
  const raw = await doctorVisitsApi.listActiveDoctors(params, token);
  return mapDoctorListResponse(raw);
}

/** Backend GET /nurse/other-visits/departments — active departments for the picker. */
export async function listDepartments(params = {}, token) {
  const raw = await doctorVisitsApi.listDepartments(params, token);
  return mapDepartmentListResponse(raw);
}

/** Backend POST /nurse/doctor-visits. */
export async function createDoctorVisit(data, token) {
  const raw = await doctorVisitsApi.createDoctorVisit(toApiDoctorVisitCreateBody(data), token);
  return mapDoctorVisitItem(raw);
}

/** Backend PUT /nurse/doctor-visits/{id}. */
export async function updateDoctorVisit(visitId, data, token) {
  const raw = await doctorVisitsApi.updateDoctorVisit(visitId, toApiDoctorVisitUpdateBody(data), token);
  return mapDoctorVisitItem(raw);
}

/** Backend PUT /nurse/doctor-visits/{id}/void. */
export async function voidDoctorVisit(visitId, data, token) {
  const raw = await doctorVisitsApi.voidDoctorVisit(visitId, data, token);
  return mapDoctorVisitItem(raw);
}

/** Backend GET /nurse/lab-reports — occupied-bed scoped, read-only. */
export async function listLabReports(params = {}, token) {
  const { page = 1, page_size = 20, _scopeMode, ...rest } = params;
  const scopeParams = withAllocatedOnly(params);
  const raw = await nurseApi.getNurseLabReports(
    { page, page_size, ...rest, ...scopeParams },
    token,
  );
  return mapLabReportListResponse(raw);
}

/** Backend GET /nurse/lab-reports/{report_id} — pass same scopeFilters as list. */
export async function getLabReport(reportId, params = {}, token) {
  const { _scopeMode, ...rest } = params;
  const scopeParams = withAllocatedOnly(params);
  const raw = await nurseApi.getNurseLabReportById(
    reportId,
    { ...rest, ...scopeParams },
    token,
  );
  return mapLabReportDetail(raw);
}

/** Backend GET /nurse/lab-reports/{report_id}/file — blob download with scope. */
export async function fetchLabReportFileBlob(reportId, params = {}, token) {
  const { _scopeMode, ...rest } = params;
  const scopeParams = withAllocatedOnly(params);
  return nurseApi.fetchNurseLabReportFileBlob(
    reportId,
    { ...rest, ...scopeParams },
    token,
  );
}
