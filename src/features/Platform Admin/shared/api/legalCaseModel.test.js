import assert from "node:assert/strict";
import test from "node:test";
import { sessionFromLogin } from "./platformLoginPolicy.js";
import { PLATFORM_STAFF_ROLES, platformStaffBody, validatePlatformStaff } from "./platformStaff.js";
import {
  billingSource,
  catalogTerm,
  checklistPayload,
  decisionPayload,
  documentFileError,
  financeFormFromCase,
  financePayload,
  manualTerm,
  mapLegalCase,
  NOT_SET,
  MAX_DOCUMENT_BYTES,
} from "./legalCaseModel.js";

test("legal finance staff uses the backend role and legal:review", () => {
  assert.deepEqual(
    PLATFORM_STAFF_ROLES.map((role) => role.value),
    ["crm", "accountant", "legal_finance"],
  );
  const staff = validatePlatformStaff({
    firstName: "Asha",
    lastName: "Nair",
    email: "asha@example.com",
    password: "password1",
    role: "legal_finance",
  });
  assert.deepEqual(staff, {});
  assert.equal(platformStaffBody({
    firstName: "Asha",
    lastName: "",
    email: "Asha@Example.com",
    password: "password1",
    role: "legal_finance",
  }).role, "legal_finance");

  const session = sessionFromLogin("legalFinance", "asha@example.com", {
    access_token: "token",
    refresh_token: "refresh",
    user_id: 9,
    first_name: "Asha",
    role: "legal_finance",
    permissions: ["legal:review"],
  });
  assert.equal(session.profile.role, "legal_finance");
  assert.equal(session.profile.tenantId, null);
});

test("finance terms stay in whole rupees and do not invent a price", () => {
  const blank = financeFormFromCase({ disc: 0, fin: null });
  assert.equal(blank.std, 0);
  assert.equal(blank.gst, "");
  assert.equal(blank.po, "No");
  const saved = financeFormFromCase({
    disc: 18,
    fin: { std: 120000, yrs: 2, impl: 0, trn: 0, tax: 18, freq: "Quarterly", adv: 40, cr: 15, gst: "27ABCDE1234F1Z5", po: "Yes", mail: "bill@hospital.test", mod: "OPD" },
  });
  assert.equal(saved.std, 120000);
  assert.equal(saved.disc, 18);
  assert.equal(financePayload(saved).standard_price, 120000);
  assert.equal(financePayload(saved).discount, 18);
  assert.equal("plan" in financePayload(saved), false);
  assert.equal("plan" in financePayload({ ...saved, plan: " Enterprise " }), false);
  assert.equal(financePayload({ ...saved, std: 12.5 }), null);
});

test("checklist and decision payloads use backend ids and required fields", () => {
  assert.deepEqual(checklistPayload({ id: 41, s: "Verified", n: "Matches the lead." }), {
    items: [{ id: 41, status: "Verified", note: "Matches the lead." }],
  });
  assert.equal(checklistPayload({ s: "Verified" }), null);
  assert.equal(decisionPayload("Approved", "   ", null), null);
  assert.deepEqual(decisionPayload("Conditionally Approved", "Licence is due.", { c: "Upload the licence.", o: "Sales Owner" }), {
    status: "Conditionally Approved",
    reason: "Licence is due.",
    condition: "Upload the licence.",
    condition_owner: "Sales Owner",
  });
  assert.equal(decisionPayload("Conditionally Approved", "Licence is due.", { c: "Upload the licence.", o: "Rohan (Sales)" }), null);
});

test("case mapping keeps server status and does not mark the advance paid", () => {
  const mapped = mapLegalCase({
    id: 7,
    lead_id: 15,
    hospital_name: "City Hospital",
    city: "Pune",
    plan: "Professional",
    status: "Approved",
    discount: 18,
    escalation: "Approved",
    documents: [{
      id: 3,
      category: "Hospital License",
      file_name: "C:/uploads/licence.pdf",
      status: "Verified",
      uploaded_by: 4,
      uploaded_by_name: "Krishna Singh",
      uploaded_at: "2026-11-12T11:20:00+05:30",
    }],
    checklist: [{ id: 9, label: "Hospital address checked", status: "Pending", note: null }],
    finance: { standard_price: 0, discount: 18, years: 1, implementation_fee: 0, training_fee: 0, tax_percent: 0, advance_percent: 0, credit_days: 0, frequency: "Annual", modules: null, gstin: null, po_required: "No", invoice_email: null, reviewed: true },
    decision: { status: "Approved", reason: "Papers are complete.", condition: null, condition_owner: null },
    advance_received: false,
    ready_to_register: false,
  });
  assert.equal(mapped.lead, 15);
  assert.equal(mapped.pay, false);
  assert.equal(mapped.readyToRegister, false);
  assert.equal(mapped.esc, "Approved");
  assert.equal(mapped.docs[0].id, 3);
  assert.equal(mapped.docs[0].n, "licence.pdf");
  assert.equal(mapped.docs[0].t, "Hospital License");
  assert.equal(mapped.docs[0].by, "Krishna Singh");
  assert.equal(mapped.docs[0].d, "2026-11-12T11:20:00+05:30");
  assert.equal(mapped.cl[0].id, 9);
  const unnamed = mapLegalCase({
    id: 8,
    lead_id: 16,
    hospital_name: "City Hospital",
    status: "In Review",
    documents: [{ id: 4, category: "Entity Registration", file_name: "entity.pdf", status: "Pending Review", uploaded_by: 30 }],
    checklist: [],
    advance_received: false,
    ready_to_register: false,
  });
  assert.equal(unnamed.docs[0].by, "—");
  assert.equal(mapped.fin.std, 0);

  const edited = mapLegalCase({
    id: 9,
    lead_id: 20,
    hospital_name: "City Care",
    plan: "Professional",
    status: "In Review",
    discount: 4,
    finance: {
      standard_price: 180000,
      discount: 4,
      years: 2,
      implementation_fee: 5000,
      training_fee: 2000,
      tax_percent: 18,
      advance_percent: 25,
      credit_days: 15,
      frequency: "Quarterly",
      modules: "OPD, IPD",
      gstin: "27ABCDE1234F1Z5",
      po_required: "Yes",
      invoice_email: "accounts@city.test",
      reviewed: true,
    },
    advance_received: false,
    ready_to_register: false,
  });
  assert.equal(edited.plan, "Professional");
  assert.equal(edited.disc, 4);
  assert.equal(edited.fin.std, 180000);
  assert.equal(edited.fin.freq, "Quarterly");
  assert.equal(edited.fin.mod, "OPD, IPD");
  assert.equal(edited.fin.mail, "accounts@city.test");
  const payload = financePayload({ ...edited.fin, disc: edited.disc, plan: edited.plan });
  assert.equal(payload.standard_price, 180000);
  assert.equal(payload.frequency, "Quarterly");
  assert.equal("plan" in payload, false);
  assert.equal(payload.implementation_fee, 5000);
});

test("crm agreement fields stay on the case and monthly billing is not rewritten to annual", () => {
  const mapped = mapLegalCase({
    id: 11,
    lead_id: 44,
    hospital_name: "City Care Hospital",
    hospital_type: "General",
    city: "Pune",
    state: "Maharashtra",
    hospital_email: "desk@city.test",
    contact_person: "Asha Rao",
    designation: "Director",
    contact_phone: "9000000000",
    contact_email: "asha@city.test",
    lead_source: "Website",
    priority: "High",
    requirement: "Need OPD and IPD.",
    assigned_employee_name: "Meera Shah",
    agreed_at: "2026-11-24T10:00:00+05:30",
    agreed_by_name: "Meera Shah",
    handover_note: "Bill the admin office.",
    plan: "Professional",
    billing_cycle: "Monthly",
    commercial_change_note: "",
    status: "New from CRM",
    discount: 0,
    finance: {
      standard_price: 8999,
      discount: 0,
      years: 1,
      implementation_fee: 0,
      training_fee: 0,
      tax_percent: 0,
      advance_percent: 0,
      credit_days: 0,
      frequency: "Monthly",
      modules: null,
      gstin: null,
      po_required: "No",
      invoice_email: null,
      reviewed: false,
    },
    advance_received: false,
    ready_to_register: false,
  });
  assert.equal(mapped.crm.hospitalEmail, "desk@city.test");
  assert.equal(mapped.crm.contactPerson, "Asha Rao");
  assert.equal(mapped.crm.assignedEmployee, "Meera Shah");
  assert.equal(mapped.crm.handoverNote, "Bill the admin office.");
  assert.equal(mapped.crm.message, "Need OPD and IPD.");
  assert.equal(mapped.crm.billingCycle, "Monthly");
  assert.equal(mapped.fin.freq, "Monthly");
  assert.equal(mapped.fr, false);
  const form = financeFormFromCase(mapped);
  assert.equal(form.freq, "Monthly");
  const reviewed = financeFormFromCase({ ...mapped, fr: true, fin: { ...mapped.fin, freq: "Annual" } });
  assert.equal(reviewed.freq, "Monthly");
  assert.equal(form.std, 8999);
  assert.equal(form.mail, "");
  assert.equal(manualTerm(mapped, "₹0"), NOT_SET);
  assert.equal(catalogTerm(mapped, "₹8,999 / mo"), "₹8,999 / mo");
  assert.equal(billingSource(mapped), "From CRM");
  assert.equal(manualTerm({ ...mapped, fr: true }, "₹4,000"), "₹4,000");
  assert.equal(
    billingSource({ ...mapped, commercialChange: "Finance review required." }),
    "CRM agreement changed · finance review required",
  );
});

test("document checks follow the upload contract", () => {
  assert.match(documentFileError({ name: "scan.gif", size: 10 }), /PDF, JPG, PNG, or WEBP/);
  assert.match(documentFileError({ name: "scan.pdf", size: MAX_DOCUMENT_BYTES + 1 }), /5 MB/);
  assert.equal(documentFileError({ name: "scan.pdf", size: 20 }), "");
});
