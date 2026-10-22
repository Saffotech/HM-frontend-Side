/* eslint-disable import/no-unresolved -- Node's test runner resolves node: imports. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import { executePlatformRequest } from "./platformHttp.js";
import { createPlatformAuthStore } from "./platformSession.js";
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
    assert.match(performanceHook, /parseLeadList/);
    assert.match(performanceHook, /leadStatus/);
    assert.match(performanceHook, /retryLeads/);
    assert.doesNotMatch(performanceHook, /body\?\.items/);
    assert.match(performancePage, /Try again/);
    assert.match(performancePage, /leadStatus === "ready"/);
  });
});
