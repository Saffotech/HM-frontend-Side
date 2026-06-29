/** Nurse API — mirrors HM-Backend /nurse/* routes. */

import { apiClient } from '@/shared/api/client';

function appendQuery(path, params = {}) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value != null && value !== '') {
      search.set(key, String(value));
    }
  }
  const qs = search.toString();
  return qs ? `${path}?${qs}` : path;
}

// —— Queue ——

export function getTodayQueue(params, token) {
  return apiClient(appendQuery('/nurse/queue/today', params), { token });
}

// —— Vitals ——

export function createVital(body, token) {
  return apiClient('/nurse/vitals', {
    method: 'POST',
    body: JSON.stringify(body),
    token,
  });
}

export function updateVital(vitalId, body, token) {
  return apiClient(`/nurse/vitals/${vitalId}`, {
    method: 'PUT',
    body: JSON.stringify(body),
    token,
  });
}

export function listVitals(params, token) {
  return apiClient(appendQuery('/nurse/vitals', params), { token });
}

export function searchVitals(params, token) {
  return apiClient(appendQuery('/nurse/vitals/search', params), { token });
}

export function getVitalById(vitalId, token) {
  return apiClient(`/nurse/vitals/${vitalId}`, { token });
}

// —— Notes ——

export function createNote(body, token) {
  return apiClient('/nurse/notes', {
    method: 'POST',
    body: JSON.stringify(body),
    token,
  });
}

export function updateNote(noteId, body, token) {
  return apiClient(`/nurse/notes/${noteId}`, {
    method: 'PUT',
    body: JSON.stringify(body),
    token,
  });
}

export function listNotes(params, token) {
  return apiClient(appendQuery('/nurse/notes', params), { token });
}

export function searchNotes(params, token) {
  return apiClient(appendQuery('/nurse/notes/search', params), { token });
}

export function getNoteById(noteId, token) {
  return apiClient(`/nurse/notes/${noteId}`, { token });
}

// —— Medications ——

export function getMedicationPatients(params, token) {
  return apiClient(appendQuery('/nurse/medications/patients', params), { token });
}

export function getPatientMedications(patientId, token) {
  return apiClient(`/nurse/medications/patient/${patientId}`, { token });
}

export function administerMedication(body, token) {
  return apiClient('/nurse/medications/administer', {
    method: 'POST',
    body: JSON.stringify(body),
    token,
  });
}

export function updateMedicationAdministration(administrationId, body, token) {
  return apiClient(`/nurse/medications/administer/${administrationId}`, {
    method: 'PUT',
    body: JSON.stringify(body),
    token,
  });
}

export function getMedicationHistory(params, token) {
  return apiClient(appendQuery('/nurse/medications/history', params), { token });
}

export function getPatientMedicationHistory(patientId, token) {
  return apiClient(`/nurse/medications/history/${patientId}`, { token });
}

// —— Handover ——

export function createHandover(body, token) {
  return apiClient('/nurse/handover', {
    method: 'POST',
    body: JSON.stringify(body),
    token,
  });
}

export function updateHandover(handoverId, body, token) {
  return apiClient(`/nurse/handover/${handoverId}`, {
    method: 'PUT',
    body: JSON.stringify(body),
    token,
  });
}

export function bulkAddHandoverPatients(handoverId, body, token) {
  return apiClient(`/nurse/handover/${handoverId}/patients/bulk`, {
    method: 'POST',
    body: JSON.stringify(body),
    token,
  });
}

export function updateHandoverPatient(patientSummaryId, body, token) {
  return apiClient(`/nurse/handover/patients/${patientSummaryId}`, {
    method: 'PUT',
    body: JSON.stringify(body),
    token,
  });
}

export function deleteHandoverPatient(patientSummaryId, token) {
  return apiClient(`/nurse/handover/patients/${patientSummaryId}`, {
    method: 'DELETE',
    token,
  });
}

export function submitHandover(handoverId, token) {
  return apiClient(`/nurse/handover/${handoverId}/submit`, {
    method: 'PUT',
    token,
  });
}

export function listHandovers(params, token) {
  return apiClient(appendQuery('/nurse/handover', params), { token });
}

export function getHandoverById(handoverId, token) {
  return apiClient(`/nurse/handover/${handoverId}`, { token });
}

// —— Emergency alerts ——

export function getAlerts(params, token) {
  return apiClient(appendQuery('/nurse/alerts', params), { token });
}

export function getAlertSummary(token) {
  return apiClient('/nurse/alerts/summary', { token });
}

export function createAlert(body, token) {
  return apiClient('/nurse/alerts', {
    method: 'POST',
    body: JSON.stringify(body),
    token,
  });
}

export function getAlertById(alertId, token) {
  return apiClient(`/nurse/alerts/${alertId}`, { token });
}

export function assignAlert(alertId, body, token) {
  return apiClient(`/nurse/alerts/${alertId}/assign`, {
    method: 'PUT',
    body: JSON.stringify(body),
    token,
  });
}

export function resolveAlert(alertId, body, token) {
  return apiClient(`/nurse/alerts/${alertId}/resolve`, {
    method: 'PUT',
    body: JSON.stringify(body),
    token,
  });
}

export function escalateAlert(alertId, body, token) {
  return apiClient(`/nurse/alerts/${alertId}/escalate`, {
    method: 'PUT',
    body: JSON.stringify(body),
    token,
  });
}
