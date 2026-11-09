/** Maps the Legal and Finance case contract. Amounts are whole rupees. */

export const DOCUMENT_CATEGORIES = [
  "Hospital Registration",
  "Entity Registration",
  "Authorized Representative",
  "Tax / GST Details",
  "Hospital License",
  "Service Agreement",
];

export const DOCUMENT_EXTENSIONS = [".pdf", ".jpg", ".jpeg", ".png", ".webp"];
export const MAX_DOCUMENT_BYTES = 5 * 1024 * 1024;
export const DISCOUNT_ESCALATION_LIMIT = 10;
export const FREQUENCIES = ["Annual", "Half-yearly", "Quarterly", "Monthly"];
export const CONDITION_OWNERS = ["Accounts Team", "Sales Owner"];
export const DECIDED_STATUSES = ["Approved", "Rejected", "Conditionally Approved"];

export const EMPTY_FINANCE = {
  mod: "",
  std: 0,
  yrs: 1,
  impl: 0,
  trn: 0,
  tax: 0,
  freq: "Annual",
  adv: 0,
  cr: 0,
  gst: "",
  po: "No",
  mail: "",
};

function textOrNull(value) {
  const text = String(value ?? "").trim();
  return text || null;
}

export function wholeRupees(value) {
  if (typeof value === "string" && value.trim() === "") return null;
  const number = Number(value);
  if (!Number.isFinite(number) || !Number.isInteger(number)) return null;
  return number;
}

export function caseIsDecided(status) {
  return DECIDED_STATUSES.includes(status);
}

export function documentFileError(file) {
  if (!file) return "Choose a file.";
  const name = String(file.name || "").toLowerCase();
  if (!DOCUMENT_EXTENSIONS.some((extension) => name.endsWith(extension))) {
    return "Upload a PDF, JPG, PNG, or WEBP file.";
  }
  if (!file.size) return "The file is empty.";
  if (file.size > MAX_DOCUMENT_BYTES) return "The file must be 5 MB or smaller.";
  return "";
}

export function financeFormFromCase(caseRow) {
  const saved = caseRow?.fin;
  return {
    ...(saved || EMPTY_FINANCE),
    disc: Number(caseRow?.disc) || 0,
  };
}

export function financePayload(form) {
  const discount = wholeRupees(form?.disc);
  const standardPrice = wholeRupees(form?.std);
  const years = wholeRupees(form?.yrs);
  const implementationFee = wholeRupees(form?.impl);
  const trainingFee = wholeRupees(form?.trn);
  const taxPercent = wholeRupees(form?.tax);
  const advancePercent = wholeRupees(form?.adv);
  const creditDays = wholeRupees(form?.cr);
  if (
    discount == null
    || standardPrice == null
    || years == null
    || implementationFee == null
    || trainingFee == null
    || taxPercent == null
    || advancePercent == null
    || creditDays == null
  ) {
    return null;
  }
  if (discount < 0 || discount > 100 || advancePercent < 0 || advancePercent > 100 || taxPercent < 0 || taxPercent > 100) {
    return null;
  }
  if (years < 1 || years > 10 || creditDays < 0 || creditDays > 365) return null;
  if ([standardPrice, implementationFee, trainingFee].some((amount) => amount < 0 || amount > 10_000_000)) return null;
  if (!FREQUENCIES.includes(form?.freq)) return null;
  return {
    discount,
    standard_price: standardPrice,
    years,
    implementation_fee: implementationFee,
    training_fee: trainingFee,
    tax_percent: taxPercent,
    advance_percent: advancePercent,
    credit_days: creditDays,
    frequency: form.freq,
    modules: textOrNull(form.mod),
    gstin: textOrNull(form.gst),
    po_required: form.po === "Yes" ? "Yes" : "No",
    invoice_email: textOrNull(form.mail),
  };
}

export function decisionPayload(kind, reason, condition) {
  const text = String(reason ?? "").trim();
  if (!text) return null;
  const body = { status: kind, reason: text };
  if (kind !== "Conditionally Approved") return body;
  const conditionText = String(condition?.c ?? "").trim();
  const owner = condition?.o;
  if (!conditionText || !CONDITION_OWNERS.includes(owner)) return null;
  body.condition = conditionText;
  body.condition_owner = owner;
  return body;
}

export function checklistPayload(item) {
  const id = Number(item?.id);
  if (!Number.isInteger(id)) return null;
  return {
    items: [
      {
        id,
        status: item.s,
        note: textOrNull(item.n),
      },
    ],
  };
}

function personLabel(userId) {
  return userId == null ? "—" : String(userId);
}

export function mapLegalCase(row) {
  if (!row || row.id == null) return null;
  const finance = row.finance || null;
  const decision = row.decision || null;
  return {
    id: row.id,
    lead: row.lead_id,
    h: row.hospital_name || "",
    city: row.city || "",
    plan: row.plan || "",
    disc: Number(row.discount) || 0,
    st: row.status || "",
    esc: row.escalation || "Not needed",
    pay: Boolean(row.advance_received),
    readyToRegister: Boolean(row.ready_to_register),
    fr: Boolean(finance?.reviewed),
    fin: finance
      ? {
        mod: finance.modules || "",
        std: finance.standard_price ?? 0,
        yrs: finance.years ?? 1,
        impl: finance.implementation_fee ?? 0,
        trn: finance.training_fee ?? 0,
        tax: finance.tax_percent ?? 0,
        freq: finance.frequency || "Annual",
        adv: finance.advance_percent ?? 0,
        cr: finance.credit_days ?? 0,
        gst: finance.gstin || "",
        po: finance.po_required === "Yes" ? "Yes" : "No",
        mail: finance.invoice_email || "",
      }
      : null,
    docs: Array.isArray(row.documents)
      ? row.documents.map((doc) => ({
        id: doc.id,
        n: doc.file_name || "Document",
        t: doc.category || "",
        by: personLabel(doc.uploaded_by),
        d: doc.reviewed_at || "—",
        s: doc.status || "Pending Review",
      }))
      : [],
    cl: Array.isArray(row.checklist)
      ? row.checklist.map((item) => ({
        id: item.id,
        t: item.label || "",
        s: item.status || "Pending",
        n: item.note || "",
      }))
      : [],
    dec: decision ? { k: decision.status, r: decision.reason || "" } : (row.decision_reason ? { k: row.status, r: row.decision_reason } : null),
    cond: decision?.condition
      ? { c: decision.condition, o: decision.condition_owner || "" }
      : null,
  };
}

export function mapLegalCases(body) {
  if (!Array.isArray(body)) return { ok: false, cases: [] };
  return {
    ok: true,
    cases: body.map(mapLegalCase).filter(Boolean),
  };
}
