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
 * Backend supports patient_id, name, phone, uhid — not bed_number.
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
    return { uhid: term };
  }

  return { name: term };
}

/** Map search text to GET /nurse/medications/patients query params. */
export function mapMedicationPatientsSearchToApi(search) {
  const mapped = mapVitalsNotesSearchToApi(search);
  if (mapped.patient_id) return { patient_id: mapped.patient_id };
  if (mapped.uhid) return { patient_uid: mapped.uhid };
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

function buildVitalHistoryEntry(vital) {
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
  });
}

export function mapMedicationPatientsResponse(raw, { page = 1, page_size = 20 } = {}) {
  const rows = Array.isArray(raw) ? raw : raw?.data ?? raw?.items ?? [];
  return wrapPagedArray(rows, { page, page_size }, mapMedicationPatientRow);
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

export function mapMedicationToPrescription(item, latestHistoryRow = null) {
  if (!item) return null;
  const itemId = item.prescription_item_id ?? item.id;
  const administration = latestHistoryRow ? mapAdministrationFromHistory(latestHistoryRow) : null;
  const statusFromItem =
    item.status != null && item.status !== ''
      ? String(item.status).toLowerCase()
      : null;
  const status = administration?.status ?? statusFromItem ?? null;

  return {
    id: itemId,
    prescription_item_id: itemId,
    medicine_name: item.medicine_name ?? '',
    dose: item.dosage ?? item.dose ?? '',
    frequency: item.frequency ?? '',
    route: item.route ?? item.instructions ?? '',
    duration: item.duration,
    instructions: item.instructions ?? null,
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
  const prescriptions = meds
    .map((m) => {
      const itemKey = m?.prescription_item_id ?? m?.id;
      const latest = itemKey != null ? latestByItem.get(String(itemKey)) : null;
      return mapMedicationToPrescription(m, latest);
    })
    .filter(Boolean);
  const uidFromHistory = historyRows
    .map((r) => r?.patient_uid ?? r?.patient_uhid)
    .find(Boolean);
  return attachPatientUid({
    ...raw,
    ward_name: raw.ward_name ?? raw.ward ?? '',
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
