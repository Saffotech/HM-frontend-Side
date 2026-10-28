/* eslint-disable import/no-unresolved -- Node's test runner resolves node: imports. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import { parseCrmPerformance } from "./platformCrmPerformanceModel.js";
import { executePlatformRequest } from "./platformHttp.js";
import { createPlatformAuthStore } from "./platformSession.js";
import {
  isAutoCreatedHospitalEmailActivity,
  rememberAutoCreatedHospitalEmailActivity,
} from "../../panels/crm/utils/autoCreatedEmailActivity.js";
import {
  countLeadList,
  leadAgreeBody,
  leadCloseBody,
  leadContactBody,
  leadCreateBody,
  leadFollowUpBody,
  leadUpdateBody,
  mapLead,
  requireNumericLeadId,
} from "./leadPayloads.js";

function readSrc(relativePath) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

function memoryStorage() {
  const store = new Map();
  return {
    store,
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: (key) => store.delete(key),
  };
}

function mockFetch(routes) {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url, options });
    const route = routes.shift();
    if (!route) throw new Error(`Unexpected fetch ${url}`);
    if (route.networkError) throw new Error("offline");
    return {
      status: route.status,
      ok: route.status >= 200 && route.status < 300,
      json: async () => route.body ?? {},
    };
  };
  return { calls, fetchImpl };
}

const form = {
  hospitalName: " City General ",
  type: "General",
  source: "Phone enquiry",
  priority: "High",
  contactPerson: " Neha Patil ",
  designation: " Admin ",
  phone: " 9123456780 ",
  email: " neha@citygen.com ",
  city: " Pune ",
  state: " Maharashtra ",
  plan: "Professional",
  billingCycle: "Monthly",
  message: " Call back ",
};

describe("CRM lead request bodies", () => {
  it("maps create onto LeadCreate and omits UI-only fields", () => {
    const body = leadCreateBody(form, { shared: true, allowDuplicate: true });
    assert.deepEqual(Object.keys(body).sort(), [
      "allow_duplicate",
      "billing_cycle",
      "city",
      "contact_email",
      "contact_person",
      "contact_phone",
      "designation",
      "hospital_name",
      "hospital_type",
      "message",
      "plan",
      "priority",
      "shared",
      "source",
      "state",
    ]);
    assert.equal(body.hospital_name, "City General");
    assert.equal(body.shared, true);
    assert.equal(body.allow_duplicate, true);
    assert.equal(Object.hasOwn(body, "id"), false);
    assert.equal(Object.hasOwn(body, "hospitalId"), false);
  });

  it("sends only changed LeadUpdate fields", () => {
    const body = leadUpdateBody(
      { priority: "Medium", city: "Pune", plan: "Starter" },
      { priority: "High", city: "Pune", plan: "Professional" },
    );
    assert.deepEqual(body, { priority: "High", plan: "Professional" });
  });

  it("keeps international lead phone data in the existing contact_phone API field", () => {
    const created = leadCreateBody({ ...form, phone: "4155550132", phoneCode: "+1" });
    assert.equal(created.contact_phone, "+1 4155550132");
    const updated = leadUpdateBody(
      { contactPhone: "9876543210" },
      { contactPhone: "4155550132", phoneCode: "+1" },
    );
    assert.deepEqual(updated, { contact_phone: "+1 4155550132" });
    assert.equal("phone_code" in updated, false);
  });

  it("maps contact, follow-up, agree, and close bodies", () => {
    assert.deepEqual(leadContactBody({
      method: "Phone call",
      outcome: "interested",
      note: " Called ",
      followUpDate: "2026-10-20",
      nextAction: " Send proposal ",
      reason: "Not interested",
    }), {
      method: "Phone call",
      outcome: "interested",
      note: "Called",
      follow_up_date: "2026-10-20",
      next_action: "Send proposal",
      reason: null,
    });
    assert.deepEqual(leadFollowUpBody({ followUpDate: "2026-10-21", nextAction: "Visit", note: "" }), {
      follow_up_date: "2026-10-21",
      next_action: "Visit",
      note: null,
    });
    assert.deepEqual(leadAgreeBody({ plan: "Starter", billingCycle: "Annual", hospitalEmail: " billing@citygen.com ", note: " Ready " }), {
      plan: "Starter",
      billing_cycle: "Annual",
      note: "Ready",
    });
    assert.deepEqual(leadCloseBody({ reason: "Budget constraints", note: "" }), {
      reason: "Budget constraints",
      note: null,
    });
  });
});

describe("initial hospital email activity", () => {
  it("saves Hospital email and hides only its automatic post-create activity", () => {
    const storage = memoryStorage();
    const input = { ...form, hospitalEmail: " billing@citygen.com " };
    const createBody = leadCreateBody(input);
    assert.equal(Object.hasOwn(createBody, "hospital_email"), false);

    const created = mapLead({
      id: 700,
      hospital_name: "City General",
      created_at: "2026-10-27T09:03:01Z",
      activities: [{ id: 901, method: "Lead created", note: "Source: Phone enquiry." }],
    }, { userId: 4, name: "Meera Iyer" });
    const emailUpdateBody = leadUpdateBody(created, { hospitalEmail: input.hospitalEmail });
    assert.deepEqual(emailUpdateBody, { hospital_email: "billing@citygen.com" });

    const updated = mapLead({
      id: 700,
      hospital_name: "City General",
      hospital_email: "billing@citygen.com",
      created_at: "2026-10-27T09:03:01Z",
      activities: [
        { id: 902, method: "Details updated", note: "Updated hospital email." },
        { id: 901, method: "Lead created", note: "Source: Phone enquiry." },
      ],
    }, { userId: 4, name: "Meera Iyer" });
    assert.equal(updated.hospitalEmail, "billing@citygen.com");
    assert.equal(rememberAutoCreatedHospitalEmailActivity(700, created, updated, 4, storage), true);

    const laterEdits = [
      { id: 903, method: "Details updated", note: "Updated city." },
      { id: 904, method: "Details updated", note: "Updated hospital email." },
    ];
    const visibleMethods = [...updated.activity, ...laterEdits]
      .filter((entry) => !isAutoCreatedHospitalEmailActivity(700, entry.id, 4, storage))
      .map((entry) => entry.method);
    assert.deepEqual(visibleMethods, ["Lead created", "Details updated", "Details updated"]);
    assert.equal(isAutoCreatedHospitalEmailActivity(700, 901, 4, storage), false);
    assert.equal(isAutoCreatedHospitalEmailActivity(700, 903, 4, storage), false);
    assert.equal(isAutoCreatedHospitalEmailActivity(700, 904, 4, storage), false);
    assert.equal(isAutoCreatedHospitalEmailActivity(700, 902, 4, storage), true);
  });

  it("does not hide unrelated or later Details updated events", () => {
    const storage = memoryStorage();
    const created = { activity: [{ id: 1, method: "Lead created" }] };
    const updated = { activity: [
      { id: 2, method: "Details updated", note: "Updated hospital email." },
      { id: 3, method: "Details updated", note: "Updated city." },
    ] };
    assert.equal(rememberAutoCreatedHospitalEmailActivity(77, created, updated, 4, storage), false);
    assert.equal(isAutoCreatedHospitalEmailActivity(77, 3, 4, storage), false);
  });
});

describe("CRM lead ids and mapping", () => {
  it("keeps the numeric backend id and does not invent ONB or TNT ids", () => {
    const mapped = mapLead({
      id: 8,
      hospital_name: "City General",
      hospital_type: "General",
      city: "Pune",
      status: "Agreed",
      assigned_to: 5,
      hospital_id: 12,
      activities: [],
    }, { userId: 5, name: "Meera" });
    assert.equal(mapped.id, 8);
    assert.equal(typeof mapped.id, "number");
    assert.equal(mapped.hospitalId, 12);
    assert.equal(mapped.assignedTo, "Meera");
    assert.doesNotMatch(String(mapped.id), /ONB-/);
    assert.doesNotMatch(String(mapped.hospitalId), /TNT-/);
  });

  it("uses assignee_name and actor_name when the performance report sends them", () => {
    const mapped = mapLead({
      id: 8,
      assigned_to: 5,
      assignee_name: "Meera Iyer",
      activities: [{
        id: 1,
        at: "2026-10-02T01:00:00",
        actor_id: 5,
        actor_name: "Meera Iyer",
        method: "Lead created",
        note: "",
      }],
    }, { userId: 1, name: "Platform Admin" });
    assert.equal(mapped.assignedTo, "Meera Iyer");
    assert.equal(mapped.activity[0].by, "Meera Iyer");

    const crmLead = mapLead({
      id: 9,
      assigned_to: 9,
      activities: [{ id: 2, actor_id: 9, actor_name: "Asha Rao", method: "Phone call", note: "" }],
    }, { userId: 5, name: "Meera" });
    assert.equal(crmLead.assignedTo, "");
    assert.equal(crmLead.activity[0].by, "Asha Rao");
  });

  it("counts a LeadSummary list and does not turn a bad payload into zero", () => {
    const session = { userId: 5, name: "Meera" };
    const leads = [
      { id: 8, hospital_name: "City General", status: "New", assigned_to: null, activities: [] },
      { id: 9, hospital_name: "Hill Clinic", status: "Contacted", assigned_to: 5, activities: [] },
    ];
    assert.deepEqual(countLeadList(leads, session), { ok: true, count: 2, error: "" });
    assert.deepEqual(countLeadList([], session), { ok: true, count: 0, error: "" });
    assert.equal(countLeadList({ items: leads }, session).ok, false);
    assert.equal(countLeadList({ items: leads }, session).count, null);
    assert.equal(countLeadList([{ hospital_name: "Missing id" }], session).ok, false);
  });
});

describe("CRM API client", () => {
  const origin = "http://platform.test";

  it("attaches the platform bearer token and never writes a dummy lead on 409", async () => {
    const storage = memoryStorage();
    storage.setItem("access_token", "hospital-token");
    const auth = createPlatformAuthStore(storage);
    auth.saveSession({
      accessToken: "crm-access",
      refreshToken: "crm-refresh",
      user: { userId: 5, role: "crm" },
    });
    const conflict = mockFetch([{
      status: 409,
      body: { detail: { message: "This hospital matches an existing lead or a hospital that is already registered.", matches: [] } },
    }]);
    const error = await executePlatformRequest("/crm/leads", {
      method: "POST",
      body: JSON.stringify(leadCreateBody(form)),
    }, { origin, auth, fetchImpl: conflict.fetchImpl }).catch((caught) => caught);
    assert.equal(error.status, 409);
    assert.equal(conflict.calls[0].options.headers.Authorization, "Bearer crm-access");
    assert.equal(storage.getItem("access_token"), "hospital-token");
    assert.equal([...storage.store.keys()].some((key) => key.includes("ONB") || key.includes("TNT")), false);
  });

  it("rejects ONB-* ids before calling the server", async () => {
    await assert.rejects(() => requireNumericLeadId("ONB-2403"), (error) => error.status === 404);
    await assert.rejects(() => requireNumericLeadId("TNT-1001"), (error) => error.status === 404);
    assert.equal(requireNumericLeadId(8), null);
  });
});

describe("CRM screens use the lead API instead of seed data", () => {
  it("loads and mutates leads through /crm/leads and does not call addHospital", () => {
    const client = readSrc("./leadApi.js");
    const workspace = readSrc("../../panels/crm/workspace/CrmWorkspace.jsx");
    const details = readSrc("../../panels/crm/pages/LeadDetails.jsx");
    const leads = readSrc("../../panels/crm/pages/Leads.jsx");
    const dashboard = readSrc("../../panels/crm/pages/Dashboard.jsx");
    const followUps = readSrc("../../panels/crm/pages/FollowUps.jsx");
    const conversions = readSrc("../../panels/crm/pages/Conversions.jsx");
    const performance = readSrc("../../panels/crm/pages/Performance.jsx");
    const addForm = readSrc("../../panels/crm/components/AddLeadForm.jsx");

    assert.match(client, /platformApi\("\/crm\/leads"/);
    assert.doesNotMatch(client, /shared\/api\/client/);
    assert.match(workspace, /listLeads/);
    assert.match(workspace, /createLead/);
    assert.match(workspace, /rememberAutoCreatedHospitalEmailActivity\(created\.id, created, saved, crmSession\?\.userId\)/);
    assert.match(details, /isAutoCreatedHospitalEmailActivity\(lead\.id, entry\.id, userId\)/);
    assert.match(workspace, /claimLead/);
    assert.match(workspace, /agreeLead/);
    assert.doesNotMatch(workspace, /onboardingSeed/);
    assert.doesNotMatch(workspace, /addHospital/);
    assert.doesNotMatch(workspace, /nextNumberedId\("ONB"/);
    assert.match(details, /getLead/);
    assert.match(details, /isNumericLeadId/);
    assert.doesNotMatch(leads, /onboardingSeed/);
    assert.doesNotMatch(dashboard, /onboardingSeed/);
    assert.doesNotMatch(followUps, /onboardingSeed/);
    assert.doesNotMatch(conversions, /onboardingSeed/);
    assert.doesNotMatch(performance, /onboardingSeed/);
    assert.doesNotMatch(addForm, /findPossibleDuplicates/);
    assert.doesNotMatch(addForm, /tenantsData/);

    const context = readSrc("../context/PlatformContext.jsx");
    assert.doesNotMatch(context, /hospitalsSeed/);
    assert.doesNotMatch(context, /onboardingSeed/);
    assert.doesNotMatch(context, /invoicesSeed/);

    const adminDashboard = readSrc("../../panels/superAdmin/pages/dashboard/Dashboard.jsx");
    const performanceHook = readSrc("../../panels/superAdmin/pages/tenants/crmPerformance/useCrmPerformance.js");
    const performancePage = readSrc("../../panels/superAdmin/pages/tenants/crmPerformance/CrmPerformance.jsx");
    assert.doesNotMatch(adminDashboard, /listLeads|countLeadList/);
    assert.match(performanceHook, /getCrmPerformance/);
    assert.match(performanceHook, /listTenants/);
    assert.match(performanceHook, /crmUsers/);
    assert.doesNotMatch(performanceHook, /listLeads|parseLeadList|getCrmAnalytics|invoices:\s*\[\]|crmUsers:\s*\[\]/);
    assert.match(performanceHook, /leadStatus/);
    assert.match(performanceHook, /retryLeads/);
    assert.doesNotMatch(performanceHook, /body\?\.items/);
    assert.match(performancePage, /Try again/);
    assert.match(performancePage, /leadStatus === "ready"/);
  });
});

describe("platform CRM performance mapping", () => {
  it("maps owners, activities, employees, and paid invoices onto the performance input", () => {
    const parsed = parseCrmPerformance({
      employees: [
        { id: 5, name: "Meera Iyer" },
        { id: 6, name: "Asha Rao" },
        { id: 7, name: " " },
      ],
      leads: [{
        id: 8,
        hospital_name: "City Care",
        hospital_type: "General",
        city: "Pune",
        status: "Registered",
        source: "Call",
        plan: "Starter",
        assigned_to: 5,
        assignee_name: "Meera Iyer",
        hospital_id: 12,
        created_at: "2026-10-02T00:00:00",
        registered_at: "2026-10-03T00:00:00",
        activities: [{
          id: 1,
          at: "2026-10-02T01:00:00",
          actor_id: 5,
          actor_name: "Meera Iyer",
          method: "Lead created",
          note: "",
        }],
      }],
      paid_invoices: [
        { tenant_id: 12, amount: 4999, payment_amount: 4999, invoice_date: "2026-10-01", status: "Paid" },
        { tenant_id: 12, amount: 100, payment_amount: 100, invoice_date: "2026-02-01", status: "Pending" },
      ],
    }, { userId: 1, name: "Platform Admin" });

    assert.equal(parsed.ok, true);
    assert.equal(parsed.onboarding[0].assignedTo, "Meera Iyer");
    assert.equal(parsed.onboarding[0].activity[0].by, "Meera Iyer");
    assert.deepEqual(parsed.crmUsers.map((user) => user.name), ["Meera Iyer", "Asha Rao"]);
    assert.equal(parsed.crmUsers[0].portal, "crm");
    assert.equal(parsed.crmUsers[0].role, "CRM");
    assert.equal(parsed.invoices.length, 1);
    assert.equal(parsed.invoices[0].tenantId, 12);
    assert.equal(parsed.invoices[0].status, "Paid");
    assert.equal(parsed.invoices[0].amount, 4999);
    assert.equal(parsed.invoices[0].paymentAmount, 4999);
    assert.equal(parsed.invoices[0].invoiceDate, "2026-10-01");
    assert.equal(parsed.onboarding[0].hospitalId, parsed.invoices[0].tenantId);
  });

  it("rejects a performance payload that is not the three lists", () => {
    const parsed = parseCrmPerformance({ leads: [] }, { userId: 1, name: "Platform Admin" });
    assert.equal(parsed.ok, false);
    assert.deepEqual(parsed.onboarding, []);
    assert.deepEqual(parsed.invoices, []);
  });
});
