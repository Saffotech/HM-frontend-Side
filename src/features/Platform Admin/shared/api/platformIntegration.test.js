/* eslint-disable import/no-unresolved -- Node's test runner resolves node: imports. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import { mapCrmProfile, mapCrmRevenue } from "./crmAccountModel.js";
import { mapCrmAnalytics, mapPlatformPlans, mapPlatformRevenue, revenueSnapshot } from "./platformCatalogModel.js";
import { executePlatformRequest } from "./platformHttp.js";
import {
  platformPasswordBody,
  platformPasswordIssue,
  platformPhotoIssue,
  profileUpdateBody,
} from "./platformProfileModel.js";
import { createPlatformAuthStore } from "./platformSession.js";
import { mapStaffDirectory } from "./platformStaff.js";
import { tenantEditDraft, tenantUpdateBody, validateTenantUpdate } from "./tenantUpdate.js";

function readSrc(relativePath) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

const hospital = {
  tenant_id: 4,
  name: "City Care",
  address: "12 Lake Road",
  phone: "9876543210",
  plan: "Professional",
  billing_cycle: "Monthly",
  subscription_renews_on: "2027-04-01",
  subscription_amount: 5000,
};

describe("platform staff directory", () => {
  it("keeps CRM and accountant rows and drops passwords and other roles", () => {
    const mapped = mapStaffDirectory([
      { user_id: 1, first_name: "Meera", last_name: "Iyer", email: "meera@example.com", role: "crm", tenant_id: null, is_active: true, password: "Secret123" },
      { user_id: 2, first_name: "Asha", last_name: null, email: "asha@example.com", role: "accountant", tenant_id: null, is_active: false },
      { user_id: 3, first_name: "Platform", email: "root@example.com", role: "platform_admin", is_active: true },
      { user_id: 4, first_name: "Doctor", email: "doc@example.com", role: "doctor", is_active: true },
    ]);
    assert.equal(mapped.ok, true);
    assert.deepEqual(mapped.rows.map((row) => row.role), ["crm", "accountant"]);
    assert.equal(JSON.stringify(mapped.rows).includes("Secret123"), false);
    assert.equal(JSON.stringify(mapped.rows).includes("password"), false);
    assert.equal(mapStaffDirectory({ items: [] }).ok, false);
  });
});

describe("hospital edit payload", () => {
  it("sends only changed fields and lets a plan change omit the amount", () => {
    const draft = tenantEditDraft(hospital);
    assert.deepEqual(tenantUpdateBody(hospital, draft), {});
    assert.deepEqual(tenantUpdateBody(hospital, { ...draft, phone: "9000000000" }), { phone: "9000000000" });
    const planChange = tenantUpdateBody(hospital, { ...draft, plan: "Enterprise", billingCycle: "Annual" });
    assert.deepEqual(planChange, { plan: "Enterprise", billing_cycle: "Annual" });
    assert.equal("subscription_amount" in planChange, false);
    assert.equal("admin_email" in planChange, false);
    const priced = tenantUpdateBody(hospital, { ...draft, plan: "Enterprise", amount: "8000" });
    assert.deepEqual(priced, { plan: "Enterprise", subscription_amount: 8000 });
  });

  it("rejects an invalid renewal date or amount before the request", () => {
    const now = new Date("2026-10-23T00:00:00Z");
    assert.equal(validateTenantUpdate({ subscription_renews_on: "1999-01-01" }, now).subscription_renews_on.includes("2000"), true);
    assert.equal(validateTenantUpdate({ subscription_renews_on: "2032-01-01" }, now).subscription_renews_on.includes("2031"), true);
    assert.equal(validateTenantUpdate({ subscription_renews_on: "2027-04-01" }, now).subscription_renews_on, undefined);
    assert.ok(validateTenantUpdate({ subscription_amount: 0 }).subscription_amount);
    assert.ok(validateTenantUpdate({ subscription_amount: 12.5 }).subscription_amount);
    assert.equal(validateTenantUpdate({ subscription_amount: 10000000 }).subscription_amount, undefined);
    assert.ok(validateTenantUpdate({ name: "  " }).name);
    assert.ok(validateTenantUpdate({ plan: "Custom" }).plan);
  });
});

describe("plan, revenue, and CRM catalog responses", () => {
  it("maps plan rows and leaves annual price as the server value", () => {
    const mapped = mapPlatformPlans([
      { name: "Starter", monthly_price: 1000, annual_price: 10000, billing_cycles: ["Monthly", "Annual"], is_active: true },
      { name: "Legacy", monthly_price: 1, annual_price: 10, billing_cycles: ["Weekly"], is_active: false },
    ]);
    assert.equal(mapped.ok, true);
    assert.equal(mapped.plans[0].annualPrice, 10000);
    assert.deepEqual(mapped.plans[1].billingCycles, []);
    assert.equal(mapped.plans[1].isActive, false);
  });

  it("counts failed invoices without adding them into the money buckets", () => {
    const mapped = mapPlatformRevenue({
      collected_amount: 100,
      collected_count: 1,
      pending_amount: 40,
      pending_count: 2,
      overdue_amount: 10,
      overdue_count: 1,
      outstanding_amount: 50,
      failed_count: 3,
      invoice_count: 7,
    });
    assert.equal(mapped.revenue.failedCount, 3);
    assert.deepEqual(revenueSnapshot(mapped.revenue).map((row) => row.revenue), [100, 40, 10]);
    assert.equal(mapPlatformRevenue([]).ok, false);
  });

  it("fills a missing lead status with zero", () => {
    const mapped = mapCrmAnalytics({ statuses: { New: 2, total: 2 } });
    assert.equal(mapped.statuses.New, 2);
    assert.equal(mapped.statuses.Contacted, 0);
    assert.equal(mapped.statuses.Agreed, 0);
    assert.equal(mapped.statuses["Not Interested"], 0);
    assert.equal(mapped.statuses.total, 2);
  });
});

describe("platform admin profile payload", () => {
  it("patches only changed contact fields and never email, role, or permissions", () => {
    const current = { phone: "9999999999", job_title: "Owner" };
    const draft = {
      phone: "9999999999",
      phoneCode: "+91",
      address: "",
      city: "",
      state: "",
      postalCode: "",
      jobTitle: "Director",
      email: "root@example.com",
      role: "platform_admin",
      permissions: ["hospitals:create"],
    };
    assert.deepEqual(profileUpdateBody(current, draft), { phone_code: "+91", job_title: "Director" });
    assert.deepEqual(platformPasswordBody("Oldpass1", "Secret123"), {
      current_password: "Oldpass1",
      new_password: "Secret123",
    });
    assert.equal(platformPasswordIssue("Secret123", "Secret123").new_password.includes("different"), true);
    assert.ok(platformPasswordIssue("Secret123", "short").new_password);
    assert.equal(platformPhotoIssue({ name: "face.gif", type: "image/gif", size: 100 }).includes("JPG"), true);
    assert.equal(platformPhotoIssue({ name: "face.png", type: "image/png", size: 5 * 1024 * 1024 + 1 }).includes("5 MB"), true);
    assert.equal(platformPhotoIssue({ name: "face.jpg", type: "image/jpeg", size: 1024 }), "");
  });
});

describe("CRM account", () => {
  it("maps this user's paid invoices and keeps a zero month", () => {
    const mapped = mapCrmRevenue({
      collected_amount: 2500,
      collected_count: 2,
      hospitals: [{ tenant_id: 8, hospital_name: "City Care", plan: "Starter", paid_amount: 2500, paid_count: 2 }],
      months: [
        { year: 2026, month: 5, amount: 0 },
        { year: 2026, month: 10, amount: 2500 },
      ],
    });
    assert.equal(mapped.ok, true);
    assert.equal(mapped.revenue.collectedAmount, 2500);
    assert.equal(mapped.revenue.hospitals[0].hospitalName, "City Care");
    assert.equal(mapped.revenue.months[0].amount, 0);
    assert.equal(mapped.revenue.months[1].label, "Oct 2026");
    assert.equal(mapCrmRevenue({ hospitals: [] }).ok, false);
  });

  it("shows email from the profile and does not treat it as an editable field", () => {
    const profile = mapCrmProfile({
      user_id: 4,
      first_name: "Meera",
      last_name: "Iyer",
      email: "meera@example.com",
      role: "crm",
      phone: "9999999999",
      job_title: "Executive",
      profile_image_url: "/crm.png",
      is_active: true,
      created_at: "2026-01-02",
    });
    assert.equal(profile.email, "meera@example.com");
    assert.equal(profile.jobTitle, "Executive");
    assert.equal(profile.isActive, true);
  });

  it("keeps the session when the current password is wrong", async () => {
    const auth = createPlatformAuthStore();
    auth.saveTokens("token-1", "refresh-1");
    const fetchImpl = async () => ({
      status: 401,
      ok: false,
      json: async () => ({ detail: "Current password is incorrect" }),
    });
    await assert.rejects(
      () => executePlatformRequest("/crm/account/password", {
        method: "POST",
        invalidPasswordKeepsSession: true,
        body: "{}",
      }, { origin: "http://platform.test", auth, fetchImpl }),
      (error) => error.code === "invalid_password" && error.status === 401,
    );
    assert.equal(auth.getAccessToken(), "token-1");
  });

  it("wires CRM revenue and profile without replacing lead calls", () => {
    const revenue = readSrc("./crmAccount.js");
    const dashboard = readSrc("../../panels/crm/pages/Dashboard.jsx");
    const performance = readSrc("../../panels/crm/pages/Performance.jsx");
    const profile = readSrc("../../panels/crm/pages/CrmAccountProfile.jsx");
    const leads = readSrc("./leadApi.js");
    assert.match(revenue, /platformApi\("\/crm\/revenue"/);
    assert.match(revenue, /platformApi\("\/crm\/account\/profile"/);
    assert.match(revenue, /platformApi\("\/crm\/account\/password"/);
    assert.match(revenue, /formData.append\("file", file\)/);
    assert.match(dashboard, /useCrmRevenue/);
    assert.match(performance, /useCrmRevenue/);
    assert.match(profile, /getCrmProfile/);
    assert.match(profile, /changeCrmPassword/);
    assert.doesNotMatch(profile, /\/admin\/profile|\/platform\/admin\/profile/);
    assert.match(leads, /platformApi\("\/crm\/leads"/);
  });
});

describe("platform admin screens use the platform routes", () => {
  it("does not send the hospital admin profile path for this login", () => {
    const profilePage = readSrc("../../panels/superAdmin/pages/account/MyProfile.jsx");
    const profileApi = readSrc("./platformAdminProfile.js");
    const staffPage = readSrc("../../panels/superAdmin/pages/account/PlatformStaff.jsx");
    const detail = readSrc("../../panels/superAdmin/pages/tenants/TenantDetails.jsx");
    const plans = readSrc("./platformPlans.js");
    const revenue = readSrc("./platformRevenue.js");
    const analytics = readSrc("./platformCrmAnalytics.js");
    const leads = readSrc("../../panels/superAdmin/pages/tenants/crmPerformance/useCrmPerformance.js");

    assert.match(profilePage, /getPlatformAdminProfile/);
    assert.match(profilePage, /changePlatformAdminPassword/);
    assert.doesNotMatch(profilePage, /\/admin\/profile/);
    assert.match(profileApi, /\/platform\/admin\/profile/);
    assert.match(profileApi, /\/platform\/admin\/password/);
    assert.match(profileApi, /\/platform\/admin\/profile\/photo/);
    assert.match(profileApi, /formData.append\("file", file\)/);
    assert.match(staffPage, /listPlatformStaff/);
    assert.match(staffPage, /createPlatformStaff/);
    assert.match(detail, /updateTenant/);
    assert.match(detail, /setTenantActive/);
    assert.match(plans, /\/platform\/plans/);
    assert.match(revenue, /\/platform\/revenue/);
    assert.match(analytics, /\/platform\/crm\/analytics/);
    assert.match(leads, /listLeads/);
    assert.doesNotMatch(leads, /getCrmAnalytics/);
  });

  it("leaves the multipart content type unset so the browser can set the boundary", async () => {
    const auth = createPlatformAuthStore();
    auth.saveTokens("token-1", "refresh-1");
    const form = new FormData();
    form.append("file", new Blob(["png"], { type: "image/png" }), "face.png");
    const calls = [];
    const fetchImpl = async (url, options) => {
      calls.push({ url, options });
      return { status: 200, ok: true, json: async () => ({ profile_image_url: "/photo.png" }) };
    };
    await executePlatformRequest("/platform/admin/profile/photo", { method: "POST", body: form }, {
      origin: "http://platform.test",
      auth,
      fetchImpl,
    });
    assert.equal(calls[0].options.headers["Content-Type"], undefined);
    assert.equal(calls[0].options.headers.Authorization, "Bearer token-1");
    assert.equal(calls[0].options.body, form);
  });
});
