/**
 * Nurse API ↔ UI shape adapters.
 * Backend is source of truth; map contracts here only.
 */

const UI_TO_API_QUEUE_STATUS = {
  in_consultation: 'in_progress',
};

const API_TO_UI_QUEUE_STATUS = {
  in_progress: 'in_consultation',
  waiting: 'waiting',
  vitals_completed: 'vitals_completed',
  completed: 'completed',
  cancelled: 'cancelled',
};

export function mapQueueStatusToApi(status) {
  if (!status) return status;
  return UI_TO_API_QUEUE_STATUS[status] ?? status;
}

export function mapQueueStatusToUi(status) {
  if (!status) return status;
  const raw = typeof status === 'string' ? status : status?.value ?? String(status);
  return API_TO_UI_QUEUE_STATUS[raw] ?? raw;
}

/** Hospital Patient ID (UHID) for display — never use internal patient_id in UI. */
export function resolvePatientUid(row) {
  if (!row) return '';
  return String(row.patientUid ?? row.patient_uid ?? row.patient_uhid ?? '').trim();
}

/** Attach normalized patientUid while preserving internal patient_id for API/routing. */
export function attachPatientUid(row) {
  if (!row) return null;
  const patientUid = resolvePatientUid(row);
  return {
    ...row,
    patientUid,
    patient_uid: patientUid || row.patient_uid || '',
  };
}

/** UI label "Patient ID" → UHID string (e.g. P-1014). */
export function formatPatientIdDisplay(row) {
  const uid = resolvePatientUid(row);
  return uid || '—';
}

/** Combobox label — never exposes internal numeric patient_id. */
export function formatPatientPickerLabel(row) {
  const uid = formatPatientIdDisplay(row);
  const name = String(row?.patient_name ?? '').trim() || 'Unknown Patient';
  return uid !== '—' ? `${uid} - ${name}` : name;
}

/**
 * Merge queue + medication (or any nurse patient lists) into one directory keyed by patient_id.
 * Later sources fill missing UHID on earlier rows.
 */
export function mergeNursePatientDirectory(...sourceLists) {
  const byId = new Map();
  for (const list of sourceLists) {
    for (const raw of list ?? []) {
      const row = attachPatientUid(raw);
      if (row?.patient_id == null) continue;
      const id = Number(row.patient_id);
      if (!Number.isSafeInteger(id) || id < 1) continue;
      const existing = byId.get(id);
      const uid = resolvePatientUid(row);
      const merged = {
        patient_id: id,
        patient_name: row.patient_name || existing?.patient_name || '',
        patientUid: uid || existing?.patientUid || '',
        bed_id: row.bed_id ?? existing?.bed_id ?? null,
        bed_number: row.bed_number || existing?.bed_number || '',
      };
      byId.set(id, attachPatientUid(merged));
    }
  }
  return [...byId.values()].sort((a, b) =>
    (a.patient_name || '').localeCompare(b.patient_name || ''),
  );
}

export function mapQueueFiltersToApi(filters = {}) {
  const { status, ...rest } = filters;
  return {
    ...rest,
    status: mapQueueStatusToApi(status),
  };
}

/**
 * Map a single registry search box to vitals/notes search API params.
 * Backend supports patient_id, patient_uid, name, phone — not bed_number.
 */
export function mapVitalsNotesSearchToApi(search) {
  const term = String(search ?? '').trim();
  if (!term) return {};

  if (/^\d+$/.test(term)) {
    const patientId = Number(term);
    if (Number.isSafeInteger(patientId) && patientId >= 1) {
      return { patient_id: patientId };
    }
  }

  const phoneDigits = term.replace(/\D/g, '');
  if (phoneDigits.length >= 7 && /^[\d\s+\-().]+$/.test(term)) {
    return { phone: term };
  }

  if (!/\s/.test(term) && /[A-Za-z]/.test(term) && /\d/.test(term)) {
    return { patient_uid: term };
  }

  return { name: term };
}

/** Client-side nurse registry filter — name, hospital patient ID (UHID), internal id, or bed. */
export function filterNursePatientRegistryItems(items, search) {
  const q = String(search ?? '').trim().toLowerCase();
  if (!q) return items ?? [];

  return (items ?? []).filter((row) => {
    const name = String(row.patient_name ?? '').toLowerCase();
    const uid = String(resolvePatientUid(row) ?? '').toLowerCase();
    const bed = String(row.bed_number ?? '').trim().toLowerCase();
    const patientId = String(row.patient_id ?? '');

    if (name.includes(q)) return true;
    if (uid && uid.includes(q)) return true;
    if (bed && bed !== '—' && bed.includes(q)) return true;
    if (/^\d+$/.test(q) && patientId === q) return true;
    return false;
  });
}

/** @deprecated Use filterNursePatientRegistryItems */
export const filterNurseVitalsRegistryItems = filterNursePatientRegistryItems;

export function paginateClientItems(items, { page = 1, page_size = 20 } = {}) {
  const p = Number(page) || 1;
  const ps = Number(page_size) || 20;
  const list = items ?? [];
  const start = (p - 1) * ps;
  return {
    items: list.slice(start, start + ps),
    page: p,
    page_size: ps,
    total: list.length,
    hasNextPage: start + ps < list.length,
  };
}

/** Map search text to GET /nurse/medications/patients query params. */
export function mapMedicationPatientsSearchToApi(search) {
  const mapped = mapVitalsNotesSearchToApi(search);
  if (mapped.patient_id) return { patient_id: mapped.patient_id };
  if (mapped.patient_uid) return { patient_uid: mapped.patient_uid };
  if (mapped.name) return { patient_name: mapped.name };
  return {};
}

/** Map search text to GET /nurse/medications/history query params (explicit fields). */
export function mapMedicationHistoryFiltersToApi({
  patient_name,
  patient_uid,
  patient_id,
  bed_number,
  status,
  from_date,
  to_date,
} = {}) {
  const filters = {};
  const name = String(patient_name ?? '').trim();
  const uid = String(patient_uid ?? '').trim();
  const bed = String(bed_number ?? '').trim();
  const idRaw = String(patient_id ?? '').trim();

  if (name) filters.patient_name = name;
  if (uid) filters.patient_uid = uid;
  if (bed) filters.bed_number = bed;
  if (status) filters.status = status;
  if (from_date) filters.from_date = from_date;
  if (to_date) filters.to_date = to_date;

  if (idRaw && /^\d+$/.test(idRaw)) {
    const patientId = Number(idRaw);
    if (Number.isSafeInteger(patientId) && patientId >= 1) {
      filters.patient_id = patientId;
    }
  }

  return filters;
}

export function mapQueueItem(row) {
  if (!row) return null;
  const appointmentId = row.appointment_id ?? row.id;
  return attachPatientUid({
    ...row,
    queue_id: row.id,
    id: appointmentId,
    appointment_id: appointmentId,
    phone: row.patient_phone ?? row.phone ?? '',
    bed_number: row.bed_number ?? '',
    ward_name: row.ward_name ?? '',
    status: mapQueueStatusToUi(row.status),
    priority: typeof row.priority === 'string' ? row.priority : row.priority?.value ?? row.priority,
  });
}

/** Fill missing queue bed/ward from occupied-bed map keyed by internal patient_id. */
export function enrichQueueItemsWithBeds(items, bedByPatientId) {
  if (!items?.length || !bedByPatientId?.size) return items ?? [];
  return items.map((item) => {
    const hasBed = item.bed_number && item.bed_number !== '—';
    if (hasBed) return item;
    const bed = bedByPatientId.get(Number(item.patient_id));
    if (!bed) return { ...item, bed_number: item.bed_number || '—' };
    return {
      ...item,
      bed_number: bed.bed_number || item.bed_number || '—',
      ward_name: bed.ward_name || item.ward_name || '',
    };
  });
}

export function mapQueueResponse(raw) {
  if (!raw) return { items: [], total: 0, page: 1, page_size: 20 };
  const items = (raw.items ?? []).map(mapQueueItem).filter(Boolean);
  return {
    items,
    total: raw.total ?? items.length,
    page: raw.page ?? 1,
    page_size: raw.page_size ?? 20,
  };
}

/** Occupied-bed patient row from GET /nurse/beds/patients */
export function mapBedPatientItem(row) {
  if (!row) return null;
  return attachPatientUid({
    ...row,
    phone: row.patient_phone ?? row.phone ?? '',
    bed_number: row.bed_number ?? '',
    ward_name: row.ward_name ?? '',
    doctor_id: row.doctor_id ?? null,
    doctor_name: row.doctor_name ?? '',
    department: row.department_name ?? row.department ?? '',
    pending_medications: row.pending_medication_count ?? 0,
    has_vitals: Boolean(row.last_vitals),
    last_vitals: row.last_vitals ?? null,
  });
}

export function mapBedPatientsResponse(raw) {
  if (!raw) return { items: [], total: 0, page: 1, page_size: 20 };
  const items = (raw.items ?? []).map(mapBedPatientItem).filter(Boolean);
  return {
    items,
    total: raw.total ?? items.length,
    page: raw.page ?? 1,
    page_size: raw.page_size ?? 20,
  };
}

/** Phase 4 — GET /nurse/beds/allocation-summary (additive fields only). */
export function mapBedAllocationSummary(raw) {
  if (!raw) {
    return {
      has_allocations: false,
      assignment_date: null,
      shift_name: null,
      shift_start: null,
      shift_end: null,
      assigned_bed_count: 0,
      occupied_count: 0,
      vacant_count: 0,
      allocated_bed_ids: [],
    };
  }
  const allocatedBedIds = (raw.allocated_bed_ids ?? []).map(Number).filter(Number.isFinite);
  return {
    has_allocations: Boolean(raw.has_allocations),
    assignment_date: raw.assignment_date ?? null,
    shift_name: raw.shift_name ?? null,
    shift_start: raw.shift_start ?? null,
    shift_end: raw.shift_end ?? null,
    assigned_bed_count: Number(raw.assigned_bed_count) || 0,
    occupied_count: Number(raw.occupied_count) || 0,
    vacant_count: Number(raw.vacant_count) || 0,
    allocated_bed_ids: allocatedBedIds,
  };
}

/** Vitals/notes still need appointment_id when available; otherwise patient_id (Phase 1). */
export function buildNurseVitalsUrl(row) {
  if (!row) return null;
  if (row.appointment_id) return `/nurse/vitals/new?appointmentId=${row.appointment_id}`;
  if (row.patient_id) return `/nurse/vitals/new?patientId=${row.patient_id}`;
  return null;
}

export function buildNurseNotesUrl(row) {
  if (!row) return null;
  if (row.appointment_id) return `/nurse/notes/new?appointmentId=${row.appointment_id}`;
  if (row.patient_id) return `/nurse/notes/new?patientId=${row.patient_id}`;
  return null;
}

function wrapPagedArrayTotal(items, page, pageSize) {
  const p = Number(page) || 1;
  const ps = Number(pageSize) || 20;
  const hasNextPage = items.length >= ps;
  const total = hasNextPage ? null : (p - 1) * ps + items.length;
  return { total, hasNextPage };
}

/**
 * Wrap backend array responses that omit total metadata (vitals, notes, med history).
 * Never inflates total — uses hasNextPage when a full page may have more rows.
 */
export function wrapPagedArray(rows, { page = 1, page_size = 20 } = {}, mapItem = (r) => r) {
  const items = (rows ?? []).map(mapItem).filter(Boolean);
  const p = Number(page) || 1;
  const ps = Number(page_size) || 20;
  const { total, hasNextPage } = wrapPagedArrayTotal(items, p, ps);
  return {
    items,
    page: p,
    page_size: ps,
    total,
    hasNextPage,
  };
}

/** Toolbar count for array-backed lists (exact on last page; minimum+ when more pages exist). */
export function getPagedListCount({ page = 1, page_size = 20, items, total, hasNextPage }) {
  if (total != null && Number.isFinite(total)) {
    return { count: total, approximate: false };
  }
  const p = Number(page) || 1;
  const ps = Number(page_size) || 20;
  const count = (p - 1) * ps + (items ?? []).length;
  return { count, approximate: Boolean(hasNextPage) };
}

export function buildVitalHistoryEntry(vital) {
  return {
    history_id: vital.history_id ?? vital.id,
    recorded_at: vital.recorded_at,
    recorded_by: vital.recorded_by_name ?? vital.recorded_by ?? null,
    status: vital.status ?? 'recorded',
    temperature: vital.temperature,
    blood_pressure: vital.blood_pressure,
    heart_rate: vital.heart_rate,
    respiratory_rate: vital.respiratory_rate,
    oxygen_saturation: vital.oxygen_saturation,
    blood_sugar: vital.blood_sugar,
    weight: vital.weight,
    pain_level: vital.pain_level,
    observation_notes: vital.observation_notes,
  };
}

/**
 * When list/search returns one row per recording without a full nested `history`,
 * assemble Recorded At options from the flat item list (same patient).
 */
export function assembleVitalHistoryFromItems(items = []) {
  if (!items.length) return items;
  const maxNested = Math.max(0, ...items.map((item) => item.history?.length ?? 0));
  if (maxNested >= items.length) return items;

  const history = [...items]
    .map(buildVitalHistoryEntry)
    .sort((a, b) => new Date(b.recorded_at) - new Date(a.recorded_at));

  return items.map((item) => ({ ...item, history }));
}

/**
 * Prefer nested history when richer; otherwise build from flat patient recordings.
 */
export function withAssembledVitalHistory(latest, items = []) {
  if (!latest) return null;
  const list = items.length ? items : [latest];
  const assembledList = assembleVitalHistoryFromItems(list);
  const assembled = assembledList[0];
  if (!assembled) return latest;
  if ((latest.history?.length ?? 0) >= (assembled.history?.length ?? 0)) {
    return latest;
  }
  return { ...latest, history: assembled.history };
}

export function mapVitalItem(row) {
  if (!row) return null;
  const history = Array.isArray(row.history) && row.history.length
    ? [...row.history]
        .map(buildVitalHistoryEntry)
        .sort((a, b) => new Date(b.recorded_at) - new Date(a.recorded_at))
    : [buildVitalHistoryEntry(row)];
  return attachPatientUid({
    ...row,
    patient_name: row.patient_name ?? '',
    bed_number: row.bed_number || '',
    recorded_by: row.recorded_by_name ?? null,
    history,
  });
}

export function mapNoteItem(row) {
  if (!row) return null;
  const createdBy = row.created_by_name ?? row.nurse_name ?? null;
  const history = Array.isArray(row.history) && row.history.length
    ? [...row.history]
        .map((entry) => ({
          history_id: entry.history_id ?? entry.id,
          created_at: entry.created_at,
          created_by: entry.created_by ?? entry.created_by_name ?? entry.nurse_name ?? createdBy,
          status: entry.status ?? 'active',
          symptoms: entry.symptoms,
          treatment_response: entry.treatment_response,
          additional_notes: entry.additional_notes,
        }))
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    : [{
      history_id: row.id,
      created_at: row.created_at,
      created_by: createdBy,
      status: row.status ?? 'active',
      symptoms: row.symptoms,
      treatment_response: row.treatment_response,
      additional_notes: row.additional_notes,
    }];
  return attachPatientUid({
    ...row,
    patient_name: row.patient_name ?? '',
    bed_number: row.bed_number || '',
    created_by: createdBy,
    history,
  });
}

export function mapMedicationPatientRow(row) {
  if (!row) return null;
  return attachPatientUid({
    ...row,
    ward_name: row.ward_name ?? row.ward ?? '',
    medicine_count: Number(row.medicine_count) || 0,
  });
}

/**
 * API returns one row per prescription (any doctor); collapse to one row per patient.
 * medicine_count is the total prescribed items across all of that patient's prescriptions.
 */
export function dedupeMedicationPatientsByPatientId(rows = []) {
  const byPatient = new Map();
  for (const row of rows) {
    if (!row) continue;
    const key = String(row.patient_id ?? '').trim();
    if (!key || key === 'undefined' || key === 'null') continue;
    const count = Number(row.medicine_count) || 0;
    const existing = byPatient.get(key);
    if (!existing) {
      byPatient.set(key, { ...row, medicine_count: count });
      continue;
    }
    byPatient.set(key, {
      ...existing,
      medicine_count: (Number(existing.medicine_count) || 0) + count,
      bed_number: existing.bed_number || row.bed_number,
      ward_name: existing.ward_name || row.ward_name,
      doctor_name: existing.doctor_name || row.doctor_name,
      patient_name: existing.patient_name || row.patient_name,
      patient_uid: existing.patient_uid || row.patient_uid,
      patientUid: existing.patientUid || row.patientUid,
    });
  }
  return [...byPatient.values()];
}

export function mapMedicationPatientsResponse(raw, { page = 1, page_size = 20 } = {}) {
  const rows = Array.isArray(raw) ? raw : raw?.data ?? raw?.items ?? [];
  const mapped = rows.map(mapMedicationPatientRow).filter(Boolean);
  const deduped = dedupeMedicationPatientsByPatientId(mapped);
  return paginateClientItems(deduped, { page, page_size });
}

function parseAdministeredAtMs(value) {
  if (!value) return 0;
  const ms = new Date(value).getTime();
  return Number.isFinite(ms) ? ms : 0;
}

/** Map a history/administration row to the UI administration object (no fabrication). */
export function mapAdministrationFromHistory(row) {
  if (!row) return null;
  const id = row.id ?? row.administration_id;
  if (id == null) return null;
  const statusRaw = row.status;
  const status =
    statusRaw != null && statusRaw !== ''
      ? String(typeof statusRaw === 'string' ? statusRaw : statusRaw?.value ?? statusRaw).toLowerCase()
      : null;
  return {
    id,
    prescription_item_id: row.prescription_item_id,
    status,
    remarks: row.remarks ?? null,
    scheduled_time: row.scheduled_time ?? null,
    administered_at: row.administered_at ?? null,
    administered_by_name:
      row.administered_by_name ??
      (row.administered_by != null ? String(row.administered_by) : null),
  };
}

/**
 * Latest active administration per prescription_item_id from history rows.
 * Rows without prescription_item_id are skipped (cannot be matched reliably).
 */
export function buildLatestAdministrationByPrescriptionItemId(historyRows = []) {
  const byItem = new Map();
  for (const raw of historyRows) {
    const mapped = mapMedicationHistoryRow(raw);
    if (!mapped?.prescription_item_id) continue;
    const key = String(mapped.prescription_item_id);
    const existing = byItem.get(key);
    const nextAt = parseAdministeredAtMs(mapped.administered_at);
    const existingAt = existing ? parseAdministeredAtMs(existing.administered_at) : -1;
    if (!existing || nextAt >= existingAt) {
      byItem.set(key, mapped);
    }
  }
  return byItem;
}

export function mapMedicationToPrescription(item, latestHistoryRow = null, patientMeta = {}) {
  if (!item) return null;
  const itemId = item.prescription_item_id ?? item.id;
  const administration = latestHistoryRow ? mapAdministrationFromHistory(latestHistoryRow) : null;
  const statusFromItem =
    item.status != null && item.status !== ''
      ? String(item.status).toLowerCase()
      : null;
  const status = administration?.status ?? statusFromItem ?? null;
  const doctorName =
    item.doctor_name
    || item.prescribed_by_name
    || item.prescribed_by
    || patientMeta.doctor_name
    || '';
  const doctorId = item.doctor_id ?? patientMeta.doctor_id ?? null;
  const departmentName =
    item.department_name
    || item.department
    || patientMeta.department_name
    || patientMeta.department
    || '';

  return {
    id: itemId,
    prescription_item_id: itemId,
    medicine_name: item.medicine_name ?? '',
    dose: item.dosage ?? item.dose ?? '',
    frequency: item.frequency ?? '',
    route: item.route ?? item.instructions ?? '',
    duration: item.duration,
    instructions: item.instructions ?? null,
    doctor_id: doctorId,
    doctor_name: doctorName,
    department_name: departmentName,
    status,
    statusKnown: status != null,
    administration,
    last_administered_at: administration?.administered_at ?? null,
    last_administered_by: administration?.administered_by_name ?? null,
  };
}

export function mapPatientMedicationsResponse(raw, historyRows = []) {
  if (!raw) return { prescriptions: [], medications: [] };
  const meds = raw.medications ?? raw.prescriptions ?? [];
  const latestByItem = buildLatestAdministrationByPrescriptionItemId(historyRows);
  const patientMeta = {
    doctor_id: raw.doctor_id ?? null,
    doctor_name: raw.doctor_name || raw.attending_doctor_name || '',
    department_name: raw.department_name || raw.department || '',
  };
  const seen = new Set();
  const prescriptions = meds
    .map((m) => {
      const itemKey = m?.prescription_item_id ?? m?.id;
      const key = itemKey != null ? String(itemKey) : '';
      if (key) {
        if (seen.has(key)) return null;
        seen.add(key);
      }
      const latest = key ? latestByItem.get(key) : null;
      return mapMedicationToPrescription(m, latest, patientMeta);
    })
    .filter(Boolean);
  const uidFromHistory = historyRows
    .map((r) => r?.patient_uid ?? r?.patient_uhid)
    .find(Boolean);
  return attachPatientUid({
    ...raw,
    ward_name: raw.ward_name ?? raw.ward ?? '',
    doctor_name: patientMeta.doctor_name,
    department_name: patientMeta.department_name,
    patient_uid: raw.patient_uid ?? raw.patient_uhid ?? uidFromHistory ?? '',
    prescriptions,
    medications: meds,
  });
}

export function mapMedicationHistoryRow(row) {
  if (!row) return null;
  return attachPatientUid({
    ...row,
    id: row.id ?? row.administration_id,
    prescription_item_id: row.prescription_item_id,
    medicine_name: row.medicine_name ?? row.medicine ?? '',
    dose: row.dosage ?? row.dose ?? '',
    duration: row.duration ?? null,
    patient_name: row.patient_name ?? '',
    administered_by_name:
      row.administered_by_name ??
      row.nurse_name ??
      null,
  });
}

export function mapHandoverListItem(row) {
  if (!row) return null;
  return {
    ...row,
    id: row.id ?? row.handover_id,
    outgoing_nurse_name: row.outgoing_nurse_name ?? row.outgoing_nurse ?? '',
    patient_count: row.patient_count ?? 0,
  };
}

export function mapHandoverDetail(raw) {
  if (!raw) return null;
  const patients = (raw.patients ?? []).map((p) =>
    attachPatientUid({
      ...p,
      bed: p.bed_number ?? p.bed ?? '—',
      bed_number: p.bed_number ?? p.bed ?? '—',
    }),
  );
  return {
    ...raw,
    id: raw.id ?? raw.handover_id,
    outgoing_nurse_name: raw.outgoing_nurse_name ?? raw.outgoing_nurse ?? '',
    patients,
    patient_count: raw.patient_count ?? patients.length,
  };
}

export function mapHandoverListResponse(raw) {
  if (!raw) return { items: [], total: 0, page: 1, page_size: 20 };
  const items = (raw.data ?? raw.items ?? []).map(mapHandoverListItem).filter(Boolean);
  return {
    items,
    total: raw.total_records ?? raw.total ?? items.length,
    page: raw.page ?? 1,
    page_size: raw.page_size ?? raw.limit ?? 20,
  };
}

export function mapAlertItem(row) {
  if (!row) return null;
  return attachPatientUid({
    ...row,
    patient_name: row.patient_name ?? '',
  });
}

export function mapAlertListResponse(raw) {
  if (!raw) return { items: [], total: 0, page: 1, limit: 20 };
  const items = (raw.data ?? raw.items ?? []).map(mapAlertItem).filter(Boolean);
  return {
    items,
    total: raw.total ?? items.length,
    page: raw.page ?? 1,
    limit: raw.limit ?? 20,
  };
}

export function mapAlertDetail(raw) {
  if (!raw) return null;
  return attachPatientUid({
    ...raw,
    patient_name: raw.patient_name ?? '',
    timeline: raw.timeline ?? [],
  });
}

/** Fill missing UHID / name / bed on rows using queue or med-patient lists (frontend-only). */
export function applyQueuePatientUidLookup(items = [], uidSources = []) {
  if (!items.length) return items;
  const byPatientId = new Map();
  for (const source of uidSources) {
    if (source?.patient_id == null) continue;
    const id = Number(source.patient_id);
    if (!Number.isSafeInteger(id) || id < 1) continue;
    const existing = byPatientId.get(id) ?? {};
    byPatientId.set(id, {
      patient_uid: resolvePatientUid(source) || existing.patient_uid || '',
      patient_name: String(source.patient_name ?? '').trim() || existing.patient_name || '',
      bed_number: source.bed_number || existing.bed_number || '',
    });
  }
  return items.map((item) => {
    if (item?.patient_id == null) return attachPatientUid(item);
    const meta = byPatientId.get(Number(item.patient_id));
    const merged = meta
      ? {
          ...item,
          patient_uid: resolvePatientUid(item) || meta.patient_uid || '',
          patient_name: item.patient_name || meta.patient_name || '',
          bed_number:
            item.bed_number && item.bed_number !== '—'
              ? item.bed_number
              : meta.bed_number || item.bed_number,
        }
      : item;
    return attachPatientUid(merged);
  });
}

/** Strip UI-only fields before vitals POST/PUT. Backend VitalCreate/VitalUpdate have no additional_vitals field. */
export function toApiVitalBody(body = {}) {
  const {
    additional_vitals: _a,
    customVitals: _c,
    appointmentId,
    patientId,
    patient_name: _p,
    bed_number: _b,
    history: _h,
    ...rest
  } = body;
  const payload = { ...rest };
  if (body.appointment_id != null) {
    payload.appointment_id = Number(body.appointment_id);
  } else if (appointmentId != null) {
    payload.appointment_id = Number(appointmentId);
  }
  if (body.patient_id != null) {
    payload.patient_id = Number(body.patient_id);
  } else if (patientId != null) {
    payload.patient_id = Number(patientId);
  }
  return payload;
}

export function toApiNoteBody(body = {}) {
  const { patient_name: _p, bed_number: _b, history: _h, ...rest } = body;
  const payload = { ...rest };
  if (payload.appointment_id != null) {
    payload.appointment_id = Number(payload.appointment_id);
  }
  if (payload.patient_id != null) {
    payload.patient_id = Number(payload.patient_id);
  }
  return payload;
}

export function toApiMedicationAdminBody(body = {}) {
  const payload = {
    prescription_item_id: Number(body.prescription_item_id),
    status: body.status,
    remarks: body.remarks ?? null,
  };
  if (body.scheduled_time) {
    payload.scheduled_time = body.scheduled_time;
  }
  return payload;
}

export function toApiMedicationAdminUpdateBody(body = {}) {
  const payload = {
    status: body.status,
    remarks: body.remarks ?? null,
  };
  if (body.scheduled_time) {
    payload.scheduled_time = body.scheduled_time;
  }
  return payload;
}

/** Map a single nurse-logged doctor visit row to the UI shape. */
export function mapDoctorVisitItem(row) {
  if (!row) return null;
  return attachPatientUid({
    ...row,
    id: row.id ?? row.visit_id,
    patient_name: row.patient_name ?? '',
    doctor_name: row.doctor_name ?? '',
    recorded_by_name: row.recorded_by_name ?? '',
    updated_by_name: row.updated_by_name ?? '',
    notes: row.notes ?? null,
    is_voided: Boolean(row.is_voided),
  });
}

/** Map GET /nurse/doctor-visits list response. */
export function mapDoctorVisitListResponse(raw) {
  if (!raw) return { items: [], total: 0, page: 1, page_size: 20 };
  const items = (raw.items ?? []).map(mapDoctorVisitItem).filter(Boolean);
  return {
    items,
    total: raw.total ?? items.length,
    page: raw.page ?? 1,
    page_size: raw.page_size ?? 20,
  };
}

/** Map a single active-doctor option row. */
export function mapDoctorOption(row) {
  if (!row) return null;
  return {
    id: Number(row.id),
    name: row.name ?? '',
    specialization: row.specialization ?? null,
  };
}

/** Map GET /nurse/doctor-visits/doctors list response. */
export function mapDoctorListResponse(raw) {
  if (!raw) return { doctors: [], total: 0, page: 1, page_size: 50 };
  const doctors = (raw.doctors ?? []).map(mapDoctorOption).filter(Boolean);
  return {
    doctors,
    total: raw.total ?? doctors.length,
    page: raw.page ?? 1,
    page_size: raw.page_size ?? 50,
  };
}

/** Map GET /nurse/other-visits/departments list response. */
export function mapDepartmentListResponse(raw) {
  if (!raw) return { departments: [], total: 0, page: 1, page_size: 50 };
  const departments = (raw.departments ?? []).map((row) => ({
    id: Number(row.id),
    name: row.name ?? '',
    code: row.code ?? null,
  })).filter((d) => d.name);
  return {
    departments,
    total: raw.total ?? departments.length,
    page: raw.page ?? 1,
    page_size: raw.page_size ?? 50,
  };
}

/** Strip UI-only fields before doctor-visit POST. */
/** Strip UI-only fields before doctor-visit POST. */
export function toApiDoctorVisitCreateBody(body = {}) {
  const payload = {};
  if (body.patient_id != null) payload.patient_id = Number(body.patient_id);
  if (body.appointment_id != null) payload.appointment_id = Number(body.appointment_id);
  if (body.doctor_id != null) payload.doctor_id = Number(body.doctor_id);
  if (body.visited_at != null) payload.visited_at = body.visited_at;
  if (body.notes != null) payload.notes = body.notes;
  return payload;
}

/** Strip UI-only fields before doctor-visit PUT. */
/** Strip UI-only fields before doctor-visit PUT. */
export function toApiDoctorVisitUpdateBody(body = {}) {
  const payload = {};
  if (body.doctor_id != null) payload.doctor_id = Number(body.doctor_id);
  if (body.visited_at != null) payload.visited_at = body.visited_at;
  if (body.notes != null) payload.notes = body.notes;
  return payload;
}

/** Map GET /nurse/lab-reports list item (report_id from list; id on detail). */
export function mapLabReportItem(row) {
  if (!row) return null;
  const reportId = row.report_id ?? row.id;
  return attachPatientUid({
    ...row,
    id: reportId,
    report_id: reportId,
    patient_name: row.patient_name ?? '',
    ward_name: row.ward_name ?? null,
    bed_number: row.bed_number ?? null,
    doctor_name: row.doctor_name ?? null,
    department_name: row.department_name ?? row.department ?? null,
    department: row.department_name ?? row.department ?? null,
    test_name: row.test_name ?? '',
    source: row.source ?? 'NONE',
    report_file: row.report_file ?? null,
    has_file: Boolean(row.report_file),
    uploaded_at: row.uploaded_at ?? row.created_at ?? null,
    status: row.status ?? 'completed',
  });
}

/** Map GET /nurse/lab-reports/{id} detail (id + nested order + parameters). */
export function mapLabReportDetail(row) {
  if (!row) return null;
  const order = row.order ?? {};
  const reportId = row.report_id ?? row.id;
  const parameters = Array.isArray(row.parameters) ? row.parameters : [];
  return attachPatientUid({
    ...row,
    id: reportId,
    report_id: reportId,
    patient_id: order.patient_id ?? row.patient_id,
    patient_name: order.patient_name ?? row.patient_name ?? '',
    patient_uid: order.patient_uid ?? row.patient_uid,
    ward_name: order.ward_name ?? row.ward_name ?? null,
    bed_number: order.bed_number ?? row.bed_number ?? null,
    doctor_name: order.doctor_name ?? row.doctor_name ?? null,
    doctor_id: order.doctor_id ?? row.doctor_id ?? null,
    department_id: order.department_id ?? row.department_id ?? null,
    department_name: order.department_name ?? row.department_name ?? order.department ?? row.department ?? null,
    department: order.department_name ?? row.department_name ?? order.department ?? row.department ?? null,
    test_name: order.test_name ?? row.test_name ?? '',
    category: order.category ?? null,
    priority: order.priority ?? null,
    order_status: order.status ?? null,
    parameters,
    report_file: row.report_file ?? null,
    has_file: Boolean(row.report_file),
    uploaded_at: row.created_at ?? row.uploaded_at ?? null,
    uploaded_by_name: row.uploaded_by_name ?? null,
    sample_collected_at: row.sample_collected_at ?? null,
    test_performed_at: row.test_performed_at ?? null,
    remarks: row.remarks ?? null,
    file_name: row.file_name ?? null,
    file_type: row.file_type ?? null,
    file_size: row.file_size ?? null,
    file_size_display: row.file_size_display ?? null,
    source: row.source ?? 'NONE',
    status: order.status ?? row.status ?? 'completed',
  });
}

/** Map GET /nurse/lab-reports paginated list response. */
export function mapLabReportListResponse(raw) {
  if (!raw) return { items: [], total: 0, page: 1, page_size: 20, hasNextPage: false };
  const items = (raw.items ?? []).map(mapLabReportItem).filter(Boolean);
  const page = raw.page ?? 1;
  const pageSize = raw.page_size ?? 20;
  const total = raw.total ?? items.length;
  return {
    items,
    total,
    page,
    page_size: pageSize,
    hasNextPage: page * pageSize < total,
  };
}
