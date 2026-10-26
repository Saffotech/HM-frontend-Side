import { isNumericLeadId } from "./hospitalRegistration.js";

export function rejectNonNumericLeadId() {
  return Promise.reject(Object.assign(new Error("This lead link is not a CRM lead."), { status: 404 }));
}

export function requireNumericLeadId(leadId) {
  if (!isNumericLeadId(leadId)) return rejectNonNumericLeadId();
  return null;
}

function emptyToNull(value) {
  const text = String(value ?? "").trim();
  return text || null;
}

/** POST /crm/leads — LeadCreate. Extra keys are rejected by the backend. */
export function leadCreateBody(values, { shared = false, allowDuplicate = false } = {}) {
  return {
    hospital_name: String(values.hospitalName || "").trim(),
    hospital_type: values.type || "General",
    source: String(values.source || "").trim(),
    priority: values.priority || "Medium",
    contact_person: String(values.contactPerson || "").trim(),
    designation: emptyToNull(values.designation),
    contact_phone: String(values.phone || "").trim(),
    contact_email: emptyToNull(values.email),
    city: String(values.city || "").trim(),
    state: emptyToNull(values.state),
    plan: emptyToNull(values.plan),
    billing_cycle: emptyToNull(values.billingCycle),
    message: emptyToNull(values.message),
    shared: Boolean(shared),
    allow_duplicate: Boolean(allowDuplicate),
  };
}

const UPDATE_FIELDS = {
  priority: "priority",
  source: "source",
  type: "hospital_type",
  contactPerson: "contact_person",
  designation: "designation",
  contactPhone: "contact_phone",
  contactEmail: "contact_email",
  hospitalEmail: "hospital_email",
  city: "city",
  state: "state",
  plan: "plan",
  billingCycle: "billing_cycle",
};

/** PATCH /crm/leads/{id} — only fields that changed, matching LeadUpdate. */
export function leadUpdateBody(current, values) {
  const body = {};
  Object.entries(UPDATE_FIELDS).forEach(([formKey, apiKey]) => {
    if (!Object.prototype.hasOwnProperty.call(values, formKey)) return;
    const next = String(values[formKey] ?? "").trim();
    const previous = String(current?.[formKey] ?? "").trim();
    if (next === previous) return;
    body[apiKey] = next || null;
  });
  return body;
}

/** POST /crm/leads/{id}/contacts — LeadContact. */
export function leadContactBody(values) {
  const keepsGoing = values.outcome === "interested" || values.outcome === "callback";
  const closing = values.outcome === "not-interested";
  return {
    method: values.method,
    outcome: values.outcome,
    note: String(values.note || "").trim(),
    follow_up_date: keepsGoing ? values.followUpDate : null,
    next_action: keepsGoing ? emptyToNull(values.nextAction) : null,
    reason: closing ? values.reason : null,
  };
}

/** POST /crm/leads/{id}/follow-up — LeadFollowUp. */
export function leadFollowUpBody(values) {
  return {
    follow_up_date: values.followUpDate,
    next_action: emptyToNull(values.nextAction),
    note: emptyToNull(values.note),
  };
}

/** POST /crm/leads/{id}/agree — LeadAgree. */
export function leadAgreeBody(values) {
  return {
    plan: values.plan,
    billing_cycle: values.billingCycle,
    note: emptyToNull(values.note),
  };
}

/** POST /crm/leads/{id}/close — LeadClose. */
export function leadCloseBody(values) {
  return {
    reason: values.reason,
    note: emptyToNull(values.note),
  };
}

export const LEAD_CREATE_FIELD_MAP = {
  hospital_name: "hospitalName",
  hospital_type: "type",
  contact_person: "contactPerson",
  contact_phone: "phone",
  contact_email: "email",
  billing_cycle: "billingCycle",
};

function displayName(value) {
  return String(value ?? "").trim();
}

/**
 * Map a LeadSummary onto the CRM screen shape.
 * assignee_name is the owner when the performance report sends it.
 * CRM lead responses omit that name, so ownership stays the signed-in user
 * only for leads assigned to them. The id stays the numeric backend id.
 */
export function mapLead(lead, session) {
  const userId = session?.userId;
  const me = session?.name || "";
  const mine = lead?.assigned_to != null && Number(lead.assigned_to) === Number(userId);
  const assigneeName = displayName(lead?.assignee_name);
  const activity = (Array.isArray(lead?.activities) ? lead.activities : []).map((entry) => ({
    id: entry.id,
    at: entry.at,
    by: displayName(entry?.actor_name) || (Number(entry?.actor_id) === Number(userId) ? me : ""),
    method: entry.method,
    note: entry.note || "",
    followUpDate: entry.follow_up_date || "",
    nextAction: entry.next_action || "",
  }));
  return {
    id: lead.id,
    hospitalName: lead.hospital_name || "",
    type: lead.hospital_type || "",
    city: lead.city || "",
    state: lead.state || "",
    contactPerson: lead.contact_person || "",
    designation: lead.designation || "",
    contactPhone: lead.contact_phone || "",
    contactEmail: lead.contact_email || "",
    hospitalEmail: lead.hospital_email || "",
    plan: lead.plan || "",
    billingCycle: lead.billing_cycle || "",
    source: lead.source || "",
    submittedAt: lead.created_at || "",
    status: lead.status || "",
    priority: lead.priority || "Medium",
    message: lead.message || "",
    assignedTo: assigneeName || (mine ? me : ""),
    claimedAt: lead.claimed_at || "",
    followUpDate: lead.follow_up_date || "",
    nextAction: lead.next_action || "",
    activity,
    agreedAt: lead.agreed_at || "",
    agreedBy: lead.agreed_by_name || "",
    handoverNote: lead.handover_note || "",
    hospitalId: lead.hospital_id ?? null,
    registeredAt: lead.registered_at || "",
    registeredBy: lead.registered_by_name || "",
    closeReason: lead.close_reason || "",
    closeNote: lead.close_note || "",
    closedBy: lead.closed_by_name || "",
    closedAt: lead.closed_at || "",
    contactsVisible: Boolean(lead.contacts_visible),
  };
}

export function mapLeadList(rows, session) {
  return (Array.isArray(rows) ? rows : []).map((row) => mapLead(row, session));
}

/** GET /crm/leads is a LeadSummary array, not a paged object. */
export function parseLeadList(body, session) {
  if (!Array.isArray(body)) {
    return { ok: false, rows: [], error: "CRM leads response was not a list." };
  }
  const invalid = body.some((row) => !row || typeof row !== "object" || typeof row.id !== "number");
  if (invalid) {
    return { ok: false, rows: [], error: "CRM leads response did not match the lead list." };
  }
  return { ok: true, rows: mapLeadList(body, session), error: "" };
}

export function countLeadList(body, session) {
  const parsed = parseLeadList(body, session);
  if (!parsed.ok) return { ok: false, count: null, error: parsed.error };
  return { ok: true, count: parsed.rows.length, error: "" };
}
