/* eslint-disable import/no-unresolved -- Node's test runner resolves node: imports. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import {
  isNumericLeadId,
  leadRegisterBody,
  mapRegistration,
  tenantRegisterBody,
} from "./hospitalRegistration.js";
import { interpretPlatformError, PlatformApiError } from "./platformErrors.js";
import {
  applyConfirmedTenantActivation,
  confirmedActivations,
  reconcileConfirmedActivations,
  resetConfirmedActivations,
  withConfirmedActivation,
} from "../../panels/superAdmin/tenantActivation.js";
import { executePlatformRequest } from "./platformHttp.js";
import { sessionFromLogin } from "./platformLoginPolicy.js";
import { createPlatformAuthStore, portalSessionIsAuthenticated } from "./platformSession.js";

const form = {
  name: " City General ",
  code: " CITYGEN ",
  type: "General",
  email: " contact@citygen.com ",
  phone: " 9123456780 ",
  address: " FC Road ",
  city: " Pune ",
  state: " Maharashtra ",
  postalCode: " 411004 ",
  adminName: " Neha Patil ",
  adminEmail: " neha@citygen.com ",
  adminPhone: " 9123400000 ",
  adminPassword: "Neha@1234",
  adminPasswordConfirm: "Neha@1234",
  plan: "Professional",
  billingCycle: "Monthly",
  trialPeriod: "None",
  tenantStatus: "Active",
  amount: 8999,
  userLimit: 25,
  storageLimitGb: 100,
};

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

describe("hospital registration payloads", () => {
  it("maps the platform admin form onto POST /tenants and omits confirm, price, and limits", () => {
    const body = tenantRegisterBody(form);
    assert.deepEqual(body, {
      name: "City General",
      code: "CITYGEN",
      hospital_type: "General",
      email: "contact@citygen.com",
      phone: "9123456780",
      address: "FC Road",
      city: "Pune",
      state: "Maharashtra",
      pincode: "411004",
      admin_full_name: "Neha Patil",
      admin_email: "neha@citygen.com",
      admin_phone: "9123400000",
      admin_password: "Neha@1234",
      plan: "Professional",
      billing_cycle: "Monthly",
      trial_period: "None",
      tenant_status: "Active",
    });
    assert.equal(Object.hasOwn(body, "adminPasswordConfirm"), false);
    assert.equal(Object.hasOwn(body, "admin_password_confirm"), false);
    assert.equal(Object.hasOwn(body, "amount"), false);
    assert.equal(Object.hasOwn(body, "userLimit"), false);
  });

  it("sends only the fields the accountant registration schema accepts", () => {
    const body = leadRegisterBody(form);
    assert.deepEqual(Object.keys(body).sort(), [
      "address",
      "admin_password",
      "billing_cycle",
      "code",
      "pincode",
      "plan",
      "tenant_status",
      "trial_period",
    ]);
    assert.equal(body.admin_password, "Neha@1234");
    assert.equal(Object.hasOwn(body, "name"), false);
    assert.equal(Object.hasOwn(body, "email"), false);
    assert.equal(Object.hasOwn(body, "admin_full_name"), false);
    assert.equal(Object.hasOwn(body, "adminPasswordConfirm"), false);
  });

  it("keeps selected calling codes in existing phone fields for international registrations", () => {
    const body = tenantRegisterBody({ ...form, phoneCode: "+1", adminPhoneCode: "+44", phone: "4155550132", adminPhone: "2071234567" });
    assert.equal(body.phone, "+1 4155550132");
    assert.equal(body.admin_phone, "+44 2071234567");
    assert.equal("phone_code" in body, false);
  });

  it("keeps the numeric lead id and does not invent a demo request id", () => {
    const lead = mapRegistration({
      id: 8,
      hospital_name: "City General",
      hospital_type: "General",
      city: "Pune",
      state: "Maharashtra",
      hospital_email: "contact@citygen.com",
      contact_person: "Neha Patil",
      contact_phone: "9123456780",
      contact_email: "neha@citygen.com",
      plan: "Professional",
      billing_cycle: "Monthly",
      source: "Phone enquiry",
      agreed_at: "2026-10-14T16:10:00+05:30",
      agreed_by_name: "Asha Rao",
      handover_note: null,
      status: "Registered",
      hospital_id: 12,
      hospital_code: "CITYGEN",
      registered_at: "2026-10-15T16:05:00+05:30",
      registered_by_name: "Accounts User",
    });
    assert.equal(lead.id, 8);
    assert.equal(typeof lead.id, "number");
    assert.equal(lead.hospitalId, 12);
    assert.equal(lead.hospitalCode, "CITYGEN");
    assert.equal(lead.agreedBy, "Asha Rao");
    assert.equal(lead.registeredBy, "Accounts User");
    assert.equal(isNumericLeadId(8), true);
    assert.equal(isNumericLeadId("12"), true);
    assert.equal(isNumericLeadId("ONB-2403"), false);
  });
});

describe("platform login policy", () => {
  const loginBody = {
    access_token: "access-1",
    refresh_token: "refresh-1",
    user_id: 3,
    tenant_id: null,
    first_name: "Saffo",
    role: "platform_admin",
    permissions: ["hospitals:create", "leads:manage"],
  };

  it("accepts Platform Admin when the role is platform_admin and hospitals:create is present", () => {
    const session = sessionFromLogin("platform", "saffo.admin@saffocare.example", loginBody);
    assert.equal(session.accessToken, "access-1");
    assert.equal(session.refreshToken, "refresh-1");
    assert.equal(session.profile.userId, 3);
    assert.equal(session.profile.role, "platform_admin");
  });

  it("accepts Accountant with registrations:create or invoices:manage", () => {
    const session = sessionFromLogin("accountant", "accounts@saffocare.example", {
      ...loginBody,
      user_id: 4,
      tenant_id: null,
      first_name: "Priya",
      role: "accountant",
      permissions: ["registrations:create", "invoices:manage"],
    });
    assert.equal(session.profile.role, "accountant");
    assert.equal(session.profile.userId, 4);
    assert.throws(
      () => sessionFromLogin("accountant", "accounts@saffocare.example", {
        ...loginBody,
        user_id: 4,
        role: "accountant",
        permissions: ["hospitals:create"],
      }),
      (error) => error.status === 403,
    );
  });

  it("accepts CRM when the role is crm and leads:manage is present, without hospitals:create", () => {
    const session = sessionFromLogin("crm", "crm@saffocare.example", {
      access_token: "crm-access",
      refresh_token: "crm-refresh",
      user_id: 5,
      tenant_id: null,
      first_name: "Meera",
      role: "crm",
      permissions: ["leads:manage"],
    });
    assert.equal(session.accessToken, "crm-access");
    assert.equal(session.profile.role, "crm");
    assert.equal(session.profile.userId, 5);
  });

  it("rejects CRM without leads:manage and rejects the wrong portal role", () => {
    assert.throws(
      () => sessionFromLogin("crm", "crm@saffocare.example", {
        access_token: "access-1",
        user_id: 5,
        tenant_id: null,
        role: "crm",
        permissions: [],
      }),
      (error) => error.status === 403,
    );
    assert.throws(
      () => sessionFromLogin("crm", "accounts@saffocare.example", {
        access_token: "access-1",
        user_id: 4,
        tenant_id: null,
        role: "accountant",
        permissions: ["hospitals:create"],
      }),
      (error) => error.status === 403,
    );
    assert.throws(
      () => sessionFromLogin("accountant", "saffo.admin@saffocare.example", {
        access_token: "access-1",
        user_id: 3,
        tenant_id: null,
        role: "platform_admin",
        permissions: ["hospitals:create"],
      }),
      (error) => error.status === 403,
    );
    assert.throws(
      () => sessionFromLogin("platform", "user@example.com", { role: "platform_admin" }),
      (error) => error instanceof PlatformApiError && error.status === 401,
    );
  });

  it("keeps CRM on the organization portal when the user record has a hospital id", () => {
    const session = sessionFromLogin("crm", "crm@saffocare.example", {
      access_token: "crm-access",
      user_id: 5,
      tenant_id: 12,
      role: "crm",
      permissions: ["leads:manage"],
    });
    assert.equal(session.profile.role, "crm");
    assert.equal(session.profile.tenantId, null);
  });
});

describe("platform session guards", () => {
  it("rejects a userId-only demo session and accepts a matching token session", () => {
    const auth = createPlatformAuthStore(memoryStorage());
    const localSession = { userId: 5, name: "Meera", role: "crm" };
    assert.equal(portalSessionIsAuthenticated("crm", localSession, auth), false);

    auth.saveSession({
      accessToken: "crm-access",
      refreshToken: "crm-refresh",
      user: { userId: 5, name: "Meera", role: "crm", tenantId: null },
    });
    assert.equal(portalSessionIsAuthenticated("crm", localSession, auth), true);
    assert.equal(portalSessionIsAuthenticated("platform", { userId: 3, role: "platform_admin" }, auth), false);
    assert.equal(portalSessionIsAuthenticated("accountant", { userId: 5, role: "accountant" }, auth), false);
  });

  it("does not treat a leftover portal profile as signed in after another portal logs in", () => {
    const auth = createPlatformAuthStore(memoryStorage());
    auth.saveSession({
      accessToken: "crm-access",
      refreshToken: "crm-refresh",
      user: { userId: 5, role: "crm" },
    });
    assert.equal(
      portalSessionIsAuthenticated("platform", { userId: 3, role: "platform_admin" }, auth),
      false,
    );
  });

  it("fails closed for restored platform tokens without a verified null tenant", () => {
    const auth = createPlatformAuthStore(memoryStorage());
    auth.saveSession({
      accessToken: "crm-access",
      refreshToken: "crm-refresh",
      user: { userId: 5, role: "crm" },
    });
    assert.equal(portalSessionIsAuthenticated("crm", { userId: 5, role: "crm" }, auth), false);
  });
});

describe("platform API client", () => {
  const origin = "http://platform.test";

  it("sends the platform bearer token and does not call the server without one", async () => {
    const storage = memoryStorage();
    const auth = createPlatformAuthStore(storage);
    const { calls, fetchImpl } = mockFetch([]);
    await assert.rejects(
      () => executePlatformRequest("/tenants", { method: "POST", body: "{}" }, { origin, auth, fetchImpl }),
      (error) => error.status === 401 && error.code === "missing_token",
    );
    assert.equal(calls.length, 0);
    assert.equal(storage.store.has("access_token"), false);
    assert.equal(storage.store.has("saffocare.platform.v1"), false);

    auth.saveSession({ accessToken: "platform-access", refreshToken: "platform-refresh", user: { userId: 3 } });
    const ok = mockFetch([{ status: 201, body: { tenant_id: 12, name: "City General" } }]);
    const created = await executePlatformRequest("/tenants", { method: "POST", body: "{}" }, { origin, auth, fetchImpl: ok.fetchImpl });
    assert.equal(created.tenant_id, 12);
    assert.equal(ok.calls[0].options.headers.Authorization, "Bearer platform-access");
    assert.equal(ok.calls[0].url, "http://platform.test/tenants");
    assert.equal(storage.store.has("access_token"), false);
  });

  it("refreshes once with the platform refresh token and retries", async () => {
    const auth = createPlatformAuthStore(memoryStorage());
    auth.saveSession({ accessToken: "expired", refreshToken: "refresh-1", user: { userId: 3 } });
    const { calls, fetchImpl } = mockFetch([
      { status: 401, body: { detail: "Could not validate credentials" } },
      { status: 200, body: { access_token: "fresh", refresh_token: "refresh-2", token_type: "bearer" } },
      { status: 200, body: [{ id: 8, hospital_name: "City General", status: "Agreed" }] },
    ]);
    const rows = await executePlatformRequest("/platform/registrations?status=agreed", {}, { origin, auth, fetchImpl });
    assert.equal(rows[0].id, 8);
    assert.equal(calls[1].url, "http://platform.test/auth/refresh");
    assert.equal(calls[1].options.headers.Authorization, undefined);
    assert.match(calls[1].options.body, /refresh-1/);
    assert.equal(calls[2].options.headers.Authorization, "Bearer fresh");
    assert.equal(auth.getAccessToken(), "fresh");
  });

  it("clears only the platform session on an expired token and keeps a 403 signed in", async () => {
    const storage = memoryStorage();
    storage.setItem("access_token", "hospital-token");
    const auth = createPlatformAuthStore(storage);
    auth.saveSession({ accessToken: "expired", refreshToken: "refresh-1", user: { userId: 4 } });
    const denied = mockFetch([
      { status: 403, body: { detail: "Permission denied: hospitals:create required" } },
    ]);
    await assert.rejects(
      () => executePlatformRequest("/tenants", { method: "POST", body: "{}" }, { origin, auth, fetchImpl: denied.fetchImpl }),
      (error) => error.status === 403 && error.message === "Permission denied: hospitals:create required",
    );
    assert.equal(auth.getAccessToken(), "expired");
    assert.equal(storage.getItem("access_token"), "hospital-token");

    const expired = mockFetch([
      { status: 401, body: { detail: "Could not validate credentials" } },
      { status: 401, body: { detail: "Invalid or expired refresh token" } },
    ]);
    await assert.rejects(
      () => executePlatformRequest("/platform/registrations/8", {}, { origin, auth, fetchImpl: expired.fetchImpl }),
      (error) => error.status === 401,
    );
    assert.equal(auth.getAccessToken(), null);
    assert.equal(storage.getItem("access_token"), "hospital-token");
    assert.equal(storage.store.has("saffocare.platform.v1"), false);
  });

  it("keeps a newer platform session when an older request is rejected", async () => {
    const auth = createPlatformAuthStore(memoryStorage());
    auth.saveSession({ accessToken: "expired", refreshToken: "refresh-1", user: { userId: 4 } });
    const fetchImpl = async (url) => {
      auth.saveSession({ accessToken: "replacement", refreshToken: "refresh-2", user: { userId: 9, role: "crm" } });
      if (String(url).endsWith("/auth/refresh")) {
        return { status: 401, ok: false, json: async () => ({ detail: "Invalid or expired refresh token" }) };
      }
      return { status: 401, ok: false, json: async () => ({ detail: "Could not validate credentials" }) };
    };
    await assert.rejects(
      () => executePlatformRequest("/platform/leads", {}, { origin, auth, fetchImpl }),
      (error) => error.status === 401 && error.code === "session_replaced",
    );
    assert.equal(auth.getAccessToken(), "replacement");
  });

  it("maps 409 and 422 responses and does not write a local hospital", async () => {
    const storage = memoryStorage();
    const auth = createPlatformAuthStore(storage);
    auth.saveSession({ accessToken: "platform-access", refreshToken: "refresh-1", user: { userId: 3 } });
    const conflict = mockFetch([{ status: 409, body: { detail: "Tenant code already registered" } }]);
    const error = await executePlatformRequest("/tenants", { method: "POST", body: "{}" }, {
      origin,
      auth,
      fetchImpl: conflict.fetchImpl,
    }).catch((caught) => caught);
    assert.equal(error.status, 409);
    assert.equal(error.message, "Tenant code already registered");
    const shown = interpretPlatformError(error, { code: "code", email: "email", admin_email: "adminEmail" });
    assert.equal(shown.fieldErrors.code, "Tenant code already registered");
    assert.equal(auth.getAccessToken(), "platform-access");

    const invalid = mockFetch([{
      status: 422,
      body: { detail: [{ loc: ["body", "plan"], msg: "Value error, Choose a subscription plan." }] },
    }]);
    const fieldError = await executePlatformRequest("/tenants", { method: "POST", body: "{}" }, {
      origin,
      auth,
      fetchImpl: invalid.fetchImpl,
    }).catch((caught) => caught);
    const fields = interpretPlatformError(fieldError, { plan: "plan" });
    assert.equal(fields.toast, "Check the highlighted fields.");
    assert.equal(fields.fieldErrors.plan, "Choose a subscription plan.");

    const leadError = mockFetch([{
      status: 422,
      body: { detail: "Contact email is required on the lead before it can be registered." },
    }]);
    const stringError = await executePlatformRequest("/platform/registrations/8/register", { method: "POST", body: "{}" }, {
      origin,
      auth,
      fetchImpl: leadError.fetchImpl,
    }).catch((caught) => caught);
    assert.equal(stringError.message, "Contact email is required on the lead before it can be registered.");

    const offline = mockFetch([{ networkError: true }]);
    const networkError = await executePlatformRequest("/tenants", { method: "POST", body: "{}" }, {
      origin,
      auth,
      fetchImpl: offline.fetchImpl,
    }).catch((caught) => caught);
    assert.equal(networkError.status, 0);
    assert.match(networkError.message, /Nothing was saved in this browser/);
    assert.equal([...storage.store.keys()].some((key) => key.includes("hospitals") || key.includes("TNT")), false);
  });
});

describe("registration screens stay off the dummy hospital writer", () => {
  it("does not call addHospital, and does not keep a demo hospital store", () => {
    const platformForm = readSrc("../../panels/superAdmin/pages/tenants/RegisterHospital.jsx");
    const accountantForm = readSrc("../../panels/accountant/pages/RegisterHospital.jsx");
    const queue = readSrc("../../panels/accountant/pages/Registrations.jsx");
    const context = readSrc("../context/PlatformContext.jsx");
    const client = readSrc("./platformClient.js");

    assert.match(platformForm, /registerTenant/);
    assert.match(platformForm, /tenant_id/);
    assert.doesNotMatch(platformForm, /addHospital/);
    assert.doesNotMatch(platformForm, /onboarding/);
    assert.match(accountantForm, /registerFromLead/);
    assert.match(accountantForm, /isNumericLeadId/);
    assert.doesNotMatch(accountantForm, /addHospital/);
    assert.doesNotMatch(accountantForm, /findPossibleDuplicates/);
    assert.match(queue, /status=agreed|listRegistrations\("agreed"\)/);
    assert.doesNotMatch(queue, /onboarding/);
    assert.doesNotMatch(queue, /addHospital/);
    assert.doesNotMatch(context, /hospitalsSeed/);
    assert.doesNotMatch(context, /onboardingSeed/);
    assert.doesNotMatch(context, /addHospital/);
    assert.doesNotMatch(client, /shared\/api\/client/);
    assert.doesNotMatch(client, /endHospitalSession/);

    const directory = readSrc("../../panels/superAdmin/pages/tenants/Hospitals.jsx");
    const detail = readSrc("../../panels/superAdmin/pages/tenants/TenantDetails.jsx");
    const api = readSrc("./registrationApi.js");
    assert.match(api, /\/tenants\/\$\{encodeURIComponent\(tenantId\)\}\/active/);
    assert.match(api, /method:\s*"PATCH"/);
    assert.match(api, /is_active:\s*Boolean\(isActive\)/);
    assert.match(detail, /setTenantActive/);
    assert.match(detail, /applyConfirmedTenantActivation/);
    assert.match(directory, /is_active/);
    assert.doesNotMatch(api, /shared\/api\/client/);

    const analytics = readSrc("../../panels/superAdmin/pages/analytics/PlatformAnalytics.jsx");
    const hospitalsHook = readSrc("../../panels/superAdmin/useRegisteredHospitals.js");
    assert.match(analytics, /Try again/);
    assert.match(analytics, /role="alert"/);
    assert.match(analytics, /usePlatformRevenue/);
    assert.match(analytics, /useCrmAnalytics/);
    assert.match(hospitalsHook, /reloadRegisteredHospitals/);
    assert.match(hospitalsHook, /withConfirmedActivation/);
  });
});

describe("hospital directory activation", () => {
  it("shows the confirmed is_active and ignores a failed payload", () => {
    resetConfirmedActivations();
    const hospitals = [{ tenant_id: 4, name: "City", is_active: true }];
    assert.equal(applyConfirmedTenantActivation({ name: "City" }), false);
    assert.equal(applyConfirmedTenantActivation({ tenant_id: 4, is_active: false }), true);
    assert.equal(withConfirmedActivation(hospitals, confirmedActivations())[0].is_active, false);
    assert.equal(reconcileConfirmedActivations([{ tenant_id: 4, is_active: true }]), false);
    assert.equal(withConfirmedActivation(hospitals, confirmedActivations())[0].is_active, false);
    assert.equal(reconcileConfirmedActivations([{ tenant_id: 4, is_active: false }]), true);
    assert.equal(withConfirmedActivation([{ tenant_id: 4, is_active: true }], confirmedActivations())[0].is_active, true);
    resetConfirmedActivations();
  });
});

describe("CRM and portal login screens use the platform backend session", () => {
  it("signs every portal in through POST /auth/login and guards shells on the platform token", () => {
    const login = readSrc("../portal/PortalLogin.jsx");
    const policy = readSrc("./platformLoginPolicy.js");
    const auth = readSrc("./platformAuth.js");
    const platformLayout = readSrc("../../panels/superAdmin/layout/AppLayout.jsx");
    const crmLayout = readSrc("../../panels/crm/CrmLayout.jsx");
    const portalLayout = readSrc("../portal/PortalLayout.jsx");

    assert.match(login, /signInPlatformPortal/);
    assert.match(login, /portalSessionIsAuthenticated/);
    assert.doesNotMatch(login, /signInPortal\(/);
    assert.doesNotMatch(login, /findPortalUser/);
    assert.doesNotMatch(login, /password \{account/);
    assert.match(auth, /platformApi\("\/auth\/login"/);
    assert.match(auth, /platformApi\("\/auth\/me"/);
    assert.match(policy, /crm: "crm"/);
    assert.match(policy, /leads:manage/);
    assert.match(platformLayout, /portalSessionIsAuthenticated\("platform"/);
    assert.match(crmLayout, /portalSessionIsAuthenticated\("crm"/);
    assert.match(portalLayout, /portalSessionIsAuthenticated\(portal/);
    assert.doesNotMatch(auth, /shared\/api\/client/);
  });
});
