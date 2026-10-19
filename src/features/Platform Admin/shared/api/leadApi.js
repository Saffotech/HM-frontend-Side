import { platformApi } from "./platformClient.js";
import {
  leadAgreeBody,
  leadCloseBody,
  leadContactBody,
  leadCreateBody,
  leadFollowUpBody,
  leadUpdateBody,
  requireNumericLeadId,
} from "./leadPayloads.js";

export {
  LEAD_CREATE_FIELD_MAP,
  leadAgreeBody,
  leadCloseBody,
  leadContactBody,
  leadCreateBody,
  leadFollowUpBody,
  leadUpdateBody,
  mapLead,
  mapLeadList,
  rejectNonNumericLeadId,
} from "./leadPayloads.js";

function leadRequest(leadId, suffix = "", options) {
  const rejected = requireNumericLeadId(leadId);
  if (rejected) return rejected;
  return platformApi(`/crm/leads/${leadId}${suffix}`, options);
}

export function listLeads() {
  return platformApi("/crm/leads");
}

export function getLead(leadId) {
  return leadRequest(leadId);
}

export function createLead(values, options) {
  return platformApi("/crm/leads", {
    method: "POST",
    body: JSON.stringify(leadCreateBody(values, options)),
  });
}

export function updateLead(leadId, current, values) {
  return leadRequest(leadId, "", {
    method: "PATCH",
    body: JSON.stringify(leadUpdateBody(current, values)),
  });
}

export function claimLead(leadId) {
  return leadRequest(leadId, "/claim", { method: "POST" });
}

export function logLeadContact(leadId, values) {
  return leadRequest(leadId, "/contacts", {
    method: "POST",
    body: JSON.stringify(leadContactBody(values)),
  });
}

export function scheduleLeadFollowUp(leadId, values) {
  return leadRequest(leadId, "/follow-up", {
    method: "POST",
    body: JSON.stringify(leadFollowUpBody(values)),
  });
}

export function addLeadNote(leadId, note) {
  return leadRequest(leadId, "/notes", {
    method: "POST",
    body: JSON.stringify({ note: String(note || "").trim() }),
  });
}

export function agreeLead(leadId, values) {
  return leadRequest(leadId, "/agree", {
    method: "POST",
    body: JSON.stringify(leadAgreeBody(values)),
  });
}

export function closeLead(leadId, values) {
  return leadRequest(leadId, "/close", {
    method: "POST",
    body: JSON.stringify(leadCloseBody(values)),
  });
}

export function reopenLead(leadId) {
  return leadRequest(leadId, "/reopen", { method: "POST" });
}
