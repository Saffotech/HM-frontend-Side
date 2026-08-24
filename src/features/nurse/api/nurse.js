/** Nurse API — mirrors HM-Backend /nurse/* routes. */

import { apiClient } from '@/shared/api/client';
import { API_BASE_URL, API_PREFIX } from '@/shared/constants';

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

// —— Queue (OPD doctor queue — legacy) ——

export function getTodayQueue(params, token) {
  return apiClient(appendQuery('/nurse/queue/today', params), { token });
}

// —— Bed-assigned patients (nurse dashboard) ——

export function getBedPatients(params, token) {
  return apiClient(appendQuery('/nurse/beds/patients', params), { token });
}

/** Additive Phase 4 — assignment summary for logged-in nurse. */
export function getBedAllocationSummary(params, token) {
  return apiClient(appendQuery('/nurse/beds/allocation-summary', params), { token });
}

// —— Nurse self-service: roster + allocated beds span ——
export function getMyDuty(token) {
  return apiClient('/nurse/my-duty', { token });
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

export function getAlertSummary(params, token) {
  // Back-compat: getAlertSummary(token) still works.
  if (typeof params === 'string' || params == null) {
    return apiClient('/nurse/alerts/summary', { token: params });
  }
  return apiClient(appendQuery('/nurse/alerts/summary', params), { token });
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

export function resolveAlert(alertId, body, token) {
  return apiClient(`/nurse/alerts/${alertId}/resolve`, {
    method: 'PUT',
    body: JSON.stringify(body),
    token,
  });
}

// —— Lab Reports (read-only nurse scope — NOT /lab/reports) ——

export function getNurseLabReports(params, token) {
  return apiClient(appendQuery('/nurse/lab-reports', params), { token });
}

export function getNurseLabReportById(reportId, params, token) {
  return apiClient(appendQuery(`/nurse/lab-reports/${reportId}`, params), { token });
}

/** Raw file download — do not use apiClient JSON helper. */
export async function fetchNurseLabReportFileBlob(reportId, params = {}, token) {
  const headers = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const path = appendQuery(`/nurse/lab-reports/${reportId}/file`, params);
  const response = await fetch(`${API_BASE_URL}${API_PREFIX}${path}`, { headers });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const detail = typeof body.detail === 'string' ? body.detail : 'Could not download file';
    const err = new Error(detail);
    err.status = response.status;
    throw err;
  }

  const blob = await response.blob();
  const disposition = response.headers.get('content-disposition') ?? '';
  const match = disposition.match(/filename="?([^"]+)"?/i);
  const fileName = match?.[1] ?? `lab-report-${reportId}`;

  return { blob, fileName, contentType: response.headers.get('content-type') };
}
