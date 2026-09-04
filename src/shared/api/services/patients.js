import {
  getPatients,
  getPatientById,
  getPatientProfile,
  searchPatientByPhone,
  createPatient,
  updatePatient,
  deletePatient,
} from '@/features/opd/api/patients';
import { createOpdVisit } from '@/features/opd/api/visits';
import { asList } from '@/shared/api/dataSource';
import {
  apiToUiPatient,
  uiToApiPatient,
  uiToApiPatientRegister,
  uiToApiPatientRegisterQuery,
  uiToApiOpdVisit,
  uiToApiOpdVisitQuery,
} from '@/shared/api/mappers/patientMapper';
import { mapOpdVisitList } from '@/shared/api/mappers/visitMapper';
import { formatAadhaarDisplay } from '@/shared/utils/validators';
import { fetchAllPages, totalPagesFrom } from '@/shared/utils/fetchAllPages';

async function enrichPatientAadhaar(patient, token) {
  if (!patient || patient.aadhaar || !patient.phone) return patient;
  try {
    const raw = await searchPatientByPhone(patient.phone, token);
    if (raw?.found && raw.aadhaar) {
      return { ...patient, aadhaar: formatAadhaarDisplay(raw.aadhaar) };
    }
  } catch {
    /* phone search optional fallback */
  }
  return patient;
}

function unwrapPatientPage(raw) {
  if (Array.isArray(raw)) {
    return { list: raw, total: raw.length, page: 1, limit: raw.length || 1 };
  }
  const nested =
    raw?.data && !Array.isArray(raw.data) && (Array.isArray(raw.data.patients) || raw.data.total != null)
      ? raw.data
      : raw;
  const list = Array.isArray(nested?.patients)
    ? nested.patients
    : Array.isArray(nested?.data)
      ? nested.data
      : asList(raw);
  const total = nested?.total ?? raw?.total ?? list.length;
  const page = nested?.page ?? raw?.page ?? 1;
  const requestedLimit = nested?.limit ?? raw?.limit;
  const limit = requestedLimit || list.length || 1;
  return { list, total, page, limit };
}

function mapPatientPage(raw) {
  const { list, total, page, limit } = unwrapPatientPage(raw);
  const patients = list.map(apiToUiPatient).filter(Boolean);
  return {
    patients,
    total,
    page,
    limit,
    totalPages: totalPagesFrom(total, limit),
  };
}

async function fetchPatientsPage(token, params) {
  const mapped = mapPatientPage(await getPatients(token, params));
  return {
    items: mapped.patients,
    total: mapped.total,
    page: mapped.page,
    limit: mapped.limit,
    totalPages: mapped.totalPages,
  };
}

export async function listPatientsPage(token, params = {}) {
  const raw = await getPatients(token, params);
  return mapPatientPage(raw);
}

/** Fetch all patient pages (for pickers / revisit logic). */
export async function listPatientsAll(token, params = {}) {
  return fetchAllPages(
    (page, limit) => fetchPatientsPage(token, { ...params, page, limit }),
    { pageSize: params.limit ?? 100 }
  );
}

export async function searchPatientByPhoneApi(phone, token) {
  const raw = await searchPatientByPhone(phone, token);
  if (!raw?.found) return { found: false, message: raw?.message };
  return {
    found: true,
    patient: apiToUiPatient({
      id: raw.patient_id,
      patient_uid: raw.patient_uid,
      first_name: raw.name?.split(' ')[0],
      last_name: raw.name?.split(' ').slice(1).join(' '),
      phone: raw.phone,
      blood_group: raw.blood_group,
      gender: raw.gender,
      aadhaar_number: raw.aadhaar,
    }),
    dbId: raw.patient_id,
  };
}

async function resolvePatientDbId(idOrUid, token) {
  const idStr = String(idOrUid ?? '');
  if (/^\d+$/.test(idStr)) return Number(idStr);
  const page = await listPatientsPage(token, { search: idStr, limit: 100, page: 1 });
  const found = page.patients.find((p) => p.id === idStr || String(p.dbId) === idStr);
  if (found?.dbId) return found.dbId;
  const all = await listPatientsAll(token);
  const match = all.find((p) => p.id === idStr);
  return match?.dbId ?? null;
}

export async function getPatient(id, token) {
  const dbId = await resolvePatientDbId(id, token);
  if (!dbId) {
    const err = new Error('Patient not found');
    err.status = 404;
    throw err;
  }
  const patient = apiToUiPatient(await getPatientById(dbId, token));
  return enrichPatientAadhaar(patient, token);
}

export async function getPatientProfileById(patientDbId, token) {
  const raw = await getPatientProfile(patientDbId, token);
  const patient = await enrichPatientAadhaar(apiToUiPatient(raw.patient), token);
  return {
    patient,
    summary: {
      totalVisits: raw.summary?.total_visits ?? 0,
      totalBilled: raw.summary?.total_billed ?? 0,
      totalPaid: raw.summary?.total_paid ?? 0,
      outstanding: raw.summary?.outstanding ?? 0,
    },
    visits: mapOpdVisitList({ visits: raw.visits ?? [] }),
  };
}

export async function addPatient(patient, token) {
  const body = uiToApiPatientRegister(patient);
  const query = uiToApiPatientRegisterQuery(patient);
  return createPatient(body, token, query);
}

export async function addOpdVisit(patient, token) {
  const body = uiToApiOpdVisit(patient);
  const query = uiToApiOpdVisitQuery(patient);
  return createOpdVisit(body, token, query);
}

export async function patchPatient(id, data, token) {
  const dbId = (await resolvePatientDbId(id, token)) ?? id;
  return updatePatient(dbId, uiToApiPatient(data), token).then(apiToUiPatient);
}

export async function removePatient(id, token) {
  const dbId = (await resolvePatientDbId(id, token)) ?? id;
  return deletePatient(dbId, token);
}
