import { platformApi } from "./platformClient.js";

const casePath = (caseId) => `/platform/legal/cases/${encodeURIComponent(caseId)}`;

export function listLegalCases() {
  return platformApi("/platform/legal/cases");
}

export function getLegalCase(caseId) {
  return platformApi(casePath(caseId));
}

export function updateLegalChecklist(caseId, body) {
  return platformApi(`${casePath(caseId)}/checklist`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export function updateLegalFinance(caseId, body) {
  return platformApi(`${casePath(caseId)}/finance`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export function requestLegalEscalation(caseId) {
  return platformApi(`${casePath(caseId)}/escalation/request`, { method: "POST" });
}

export function decideLegalEscalation(caseId, status) {
  return platformApi(`${casePath(caseId)}/escalation`, {
    method: "POST",
    body: JSON.stringify({ status }),
  });
}

export function uploadLegalDocument(caseId, category, file) {
  const body = new FormData();
  body.append("category", category);
  body.append("file", file);
  return platformApi(`${casePath(caseId)}/documents`, { method: "POST", body });
}

export function downloadLegalDocument(caseId, documentId) {
  return platformApi(`${casePath(caseId)}/documents/${encodeURIComponent(documentId)}`, {
    responseType: "blob",
  });
}

export function verifyLegalDocument(caseId, documentId) {
  return platformApi(`${casePath(caseId)}/documents/${encodeURIComponent(documentId)}/verify`, {
    method: "POST",
  });
}

export function requestLegalDocumentChanges(caseId, documentId) {
  return platformApi(`${casePath(caseId)}/documents/${encodeURIComponent(documentId)}/request-changes`, {
    method: "POST",
  });
}

export function decideLegalCase(caseId, body) {
  return platformApi(`${casePath(caseId)}/decision`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function resubmitLegalCase(caseId) {
  return platformApi(`${casePath(caseId)}/resubmit`, { method: "POST" });
}
