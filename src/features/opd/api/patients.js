/** Mirrors backend patient routes — OPD department */



import { apiClient } from '@/shared/api/client';

import { buildQueryString } from '@/shared/utils/buildQueryString';



export async function getPatients(token, params = {}) {

  const query = buildQueryString({

    search: params.search,

    page: params.page,

    limit: params.limit,

  });

  return apiClient(`/opd/patients${query}`, { token });

}



export async function searchPatientByPhone(phone, token) {

  return apiClient(`/opd/patient/search?phone=${encodeURIComponent(phone)}`, { token });

}



export async function getPatientById(id, token) {

  return apiClient(`/opd/patient/${id}`, { token });

}



export async function getPatientProfile(patientId, token) {

  return apiClient(`/opd/patient/${patientId}/profile`, { token });

}



export async function createPatient(data, token, queryString = '') {

  const suffix = queryString ? `?${queryString}` : '';

  const response = await apiClient(`/opd/patient/register${suffix}`, {

    method: 'POST',

    body: JSON.stringify(data),

    token,

  });



  return {

    patientId: response.patient_uid ?? response.patient_id,

    patientDbId: response.patient_id,

    billNumber: response.bill_number,

    tokenNumber: response.token_number,

    visitId: response.visit_id,

    appointmentId: response.appointment_id ?? null,

    appointmentUid: response.appointment_uid ?? null,

    scheduledAt: response.scheduled_at ?? null,

    raw: response,

  };

}



export async function updatePatient(id, data, token) {

  return apiClient(`/opd/patient/${id}`, {

    method: 'PUT',

    body: JSON.stringify(data),

    token,

  });

}



export async function deletePatient(id, token) {

  return apiClient(`/opd/patient/${id}`, {

    method: 'DELETE',

    token,

  });

}

