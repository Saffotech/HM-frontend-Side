import {
  getPrescriptionsByPatient,
  getPrescriptionById,
  createPrescription,
  updatePrescription,
  deletePrescription,
} from '@/features/doctor/api/prescriptions';
import {
  apiToUiPrescription,
  uiToApiPrescriptionBody,
  mapPrescriptionList,
} from '@/shared/api/mappers/clinicalMapper';

export async function fetchPrescriptionsByPatient(patientId, token) {
  const raw = await getPrescriptionsByPatient(patientId, token);
  return mapPrescriptionList(raw);
}

export async function fetchPrescriptionById(id, token) {
  const raw = await getPrescriptionById(id, token);
  return apiToUiPrescription(raw);
}

export async function addPrescription(payload, token) {
  const body = uiToApiPrescriptionBody(payload);
  const created = await createPrescription(body, token);
  return apiToUiPrescription(created);
}

/** PUT /prescriptions/{id} */
export async function replacePrescription(id, payload, token) {
  const body = uiToApiPrescriptionBody(payload);
  const updated = await updatePrescription(id, body, token);
  return apiToUiPrescription(updated);
}

export async function removePrescription(id, token) {
  return deletePrescription(id, token);
}
